import { describe, it, expect, vi, afterEach } from 'vitest';
import { categorizationJsonSchema, categorizationGeminiSchema } from '@/ai/responseSchema';
import { localNanoRunner } from '@/ai/nano';
import { AICategorizer } from '@/ai/categorizer';
import { SUBDECK_TAXONOMY } from '@/ai/heuristic';
import { SubscribedChannel } from '@/types';

const ch = (n: number, title: string, handle: string): SubscribedChannel => ({
  ucId: `UC${String(n).padStart(22, '0')}`, title, handle, url: '', avatarUrl: '', discoveredAt: 0,
});

describe('categorization response schemas', () => {
  it('only allow taxonomy keys and this batch\'s channel references', () => {
    const schema = categorizationJsonSchema(['tech-coding', 'gaming'], ['c0', 'c1']) as any;
    expect(schema.required).toEqual(['tech-coding', 'gaming']);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.gaming.items.enum).toEqual(['c0', 'c1']);

    const gemini = categorizationGeminiSchema(['tech-coding'], ['c0']) as any;
    expect(gemini.type).toBe('OBJECT');
    expect(gemini.properties['tech-coding']).toEqual({ type: 'ARRAY', items: { type: 'STRING', enum: ['c0'] } });
  });
});

describe('Gemini Nano structured output', () => {
  const fakeLM = (prompt: (text: string, opts?: any) => Promise<string>) => ({
    create: vi.fn(async () => ({ prompt: vi.fn(prompt), destroy: vi.fn() })),
  });

  it('passes the schema as responseConstraint', async () => {
    const calls: any[] = [];
    const LM = fakeLM(async (_t, opts) => { calls.push(opts); return '{}'; });
    await localNanoRunner(LM).prompt('hi', { type: 'object' });
    expect(calls[0]).toEqual({ responseConstraint: { type: 'object' } });
  });

  it('retries without the constraint on Chrome builds that do not support it', async () => {
    const calls: any[] = [];
    const LM = fakeLM(async (_t, opts) => {
      calls.push(opts);
      if (opts?.responseConstraint) throw Object.assign(new Error('responseConstraint is not supported'), { name: 'NotSupportedError' });
      return '{"ok":true}';
    });
    expect(await localNanoRunner(LM).prompt('hi', { type: 'object' })).toBe('{"ok":true}');
    expect(calls).toEqual([{ responseConstraint: { type: 'object' } }, undefined]);
  });

  it('does not swallow unrelated errors', async () => {
    const LM = fakeLM(async () => { throw new Error('session crashed'); });
    await expect(localNanoRunner(LM).prompt('hi', { type: 'object' })).rejects.toThrow('session crashed');
  });
});

describe('Gemini Cloud structured output', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends a responseSchema listing every taxonomy id and the batch references', async () => {
    vi.stubGlobal('chrome', {
      runtime: { id: 'test-extension' },
      storage: { local: { get: async () => ({ settings: { aiProvider: 'gemini-api' } }) } },
      permissions: { contains: async () => true },
    });
    let body: any;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: any) => {
      body = JSON.parse(init.body);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"tech-coding":["c0"],"music-audio":["c1"]}' }] } }] }));
    }));

    const result = await AICategorizer.categorizeAll([ch(1, 'Fireship', '@fireship'), ch(2, 'Clean Bandit', '@cleanbandit')], 'test-key');
    const schema = body.generationConfig.responseSchema;
    expect(Object.keys(schema.properties).sort()).toEqual(SUBDECK_TAXONOMY.map(t => t.id).sort());
    expect(schema.properties['tech-coding'].items.enum).toEqual(['c0', 'c1']);
    expect(result.providerUsed).toBe('gemini-api');
  });
});

describe('Gemini Cloud schema fallback', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('retries once without the schema when the API rejects it', async () => {
    vi.stubGlobal('chrome', {
      runtime: { id: 'test-extension' },
      storage: { local: { get: async () => ({ settings: { aiProvider: 'gemini-api' } }) } },
      permissions: { contains: async () => true },
    });
    const bodies: any[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: any) => {
      const body = JSON.parse(init.body);
      bodies.push(body);
      if (body.generationConfig.responseSchema) {
        return new Response('{"error":{"message":"responseSchema too complex"}}', { status: 400 });
      }
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"tech-coding":["c0"]}' }] } }] }));
    }));
    const result = await AICategorizer.categorizeAll([ch(1, 'Fireship', '@fireship')], 'test-key');
    expect(bodies).toHaveLength(2);
    expect(bodies[1].generationConfig.responseSchema).toBeUndefined();
    expect(result.providerUsed).toBe('gemini-api');
  });
});
