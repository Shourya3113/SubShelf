import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  NanoRunner,
  describeNanoStatus,
  getNanoStatus,
  normalizeNanoAvailability,
} from '@/ai/nano';
import { AICategorizer } from '@/ai/categorizer';
import { SUBDECK_TAXONOMY } from '@/ai/heuristic';
import { SubscribedChannel } from '@/types';

const UC1 = 'UC0000000000000000000001';
const ch = (ucId: string, handle: string, title = handle): SubscribedChannel => ({
  ucId, title, handle, url: `https://www.youtube.com/${handle}`, avatarUrl: '', discoveredAt: 0,
});
const TARGET = SUBDECK_TAXONOMY[0].id;
const modelReply = JSON.stringify({ [TARGET]: ['c0'] });

/** Fake LanguageModel global; `create` resolves a session that answers every prompt with `reply`. */
function fakeLM(availability: string, reply = modelReply) {
  return {
    availability: vi.fn(async () => availability),
    create: vi.fn(async () => ({ prompt: vi.fn(async () => reply), destroy: vi.fn() })),
  };
}

describe('Gemini Nano status helpers', () => {
  it('normalizes current and legacy availability strings', () => {
    expect(normalizeNanoAvailability('available')).toBe('available');
    expect(normalizeNanoAvailability('readily')).toBe('available');
    expect(normalizeNanoAvailability('downloadable')).toBe('downloadable');
    expect(normalizeNanoAvailability('after-download')).toBe('downloadable');
    expect(normalizeNanoAvailability('downloading')).toBe('downloading');
    expect(normalizeNanoAvailability('no')).toBe('unavailable');
    expect(normalizeNanoAvailability(undefined)).toBe('unavailable');
  });

  it('reports no-api when the Prompt API is missing and unavailable when the probe throws', async () => {
    expect(await getNanoStatus(null)).toBe('no-api');
    expect(await getNanoStatus({ create() {}, availability: async () => { throw new Error('boom'); } })).toBe('unavailable');
    expect(await getNanoStatus({ create() {}, capabilities: async () => ({ available: 'after-download' }) })).toBe('downloadable');
  });

  it('never offers a download; without the model the option works like Offline', () => {
    expect(describeNanoStatus('available').badge).toBe('Ready');
    for (const s of ['downloadable', 'downloading'] as const) {
      expect(describeNanoStatus(s).text).toMatch(/never downloads/);
    }
    for (const s of ['downloadable', 'downloading', 'unavailable', 'no-api'] as const) {
      expect(describeNanoStatus(s).text).toMatch(/exactly like Offline/);
    }
  });
});

describe('Auto-AI with Gemini Nano', () => {
  afterEach(() => vi.unstubAllGlobals());
  // A name the offline engine can't place, so the hybrid mode hands it to Nano
  const channels = [ch(UC1, '@zxqvplorb', 'Zxqv Plorb')];
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      runtime: { id: 'test-extension' },
      storage: { local: { get: async () => ({ settings: { aiProvider: 'gemini-nano' } }) } },
      permissions: { contains: async () => true },
    });
  });

  it('never starts a download: a downloadable model falls back to the offline engine', async () => {
    const LM = fakeLM('downloadable');
    const fetchSpy = vi.fn();
    vi.stubGlobal('LanguageModel', LM);
    vi.stubGlobal('fetch', fetchSpy);
    const fallback = vi.fn(async () => null);

    const result = await AICategorizer.categorizeAll(channels, 'test-key', { nanoFallback: fallback });
    expect(LM.create).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.providerUsed).toBe('heuristic');
    expect(result.fallbackNotice).toMatch(/not downloaded yet/);
  });

  it('uses Nano in the current context once the model is available', async () => {
    const LM = fakeLM('available');
    vi.stubGlobal('LanguageModel', LM);

    const result = await AICategorizer.categorizeAll(channels);
    expect(result.providerUsed).toBe('gemini-nano');
    expect(result.fallbackNotice).toBeUndefined();
    expect(result.decks.find(d => d.id === TARGET)?.channelIds).toContain(UC1);
  });

  it('runs Nano through the fallback context when this one lacks the Prompt API', async () => {
    const runner: NanoRunner = { availability: async () => 'available', prompt: vi.fn(async () => modelReply) };
    const fallback = vi.fn(async () => runner);

    const result = await AICategorizer.categorizeAll(channels, undefined, { nanoFallback: fallback });
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(runner.prompt).toHaveBeenCalled();
    expect(result.providerUsed).toBe('gemini-nano');
  });

  it('retries in the fallback context when this context cannot create sessions', async () => {
    const LM = fakeLM('available');
    LM.create.mockRejectedValue(new Error('NotSupportedError'));
    vi.stubGlobal('LanguageModel', LM);
    const runner: NanoRunner = { availability: async () => 'available', prompt: async () => modelReply };

    const result = await AICategorizer.categorizeAll(channels, undefined, { nanoFallback: async () => runner });
    expect(result.providerUsed).toBe('gemini-nano');
  });

  it('falls back to the offline engine when no context can run Nano', async () => {
    const result = await AICategorizer.categorizeAll(channels, undefined, { nanoFallback: async () => null });
    expect(result.providerUsed).toBe('heuristic');
    expect(result.fallbackNotice).toMatch(/does not offer on-device AI/);
  });
});

describe('hybrid Auto-AI (offline first, Nano only for unclear channels)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends only the channels the offline engine could not place to Nano', async () => {
    vi.stubGlobal('chrome', {
      runtime: { id: 'test-extension' },
      storage: { local: { get: async () => ({ settings: { aiProvider: 'gemini-nano' } }) } },
      permissions: { contains: async () => true },
    });
    const prompts: string[] = [];
    const runner = {
      availability: async () => 'available' as const,
      prompt: vi.fn(async (text: string) => { prompts.push(text); return JSON.stringify({ [TARGET]: ['c0'] }); }),
    };
    const confident = ch('UC0000000000000000000002', '@fireship', 'Fireship');
    const unclear = ch(UC1, '@zxqvplorb', 'Zxqv Plorb');

    const result = await AICategorizer.categorizeAll([confident, unclear], undefined, { nanoFallback: async () => runner });
    expect(runner.prompt).toHaveBeenCalledTimes(1);
    expect(prompts[0]).toContain('Zxqv Plorb');
    expect(prompts[0]).not.toContain('Fireship"'); // the confident channel never reaches the model
    expect(result.aiReviewed).toBe(1);
    expect(result.decks.find(d => d.id === TARGET)?.channelIds).toEqual(expect.arrayContaining([UC1]));
    expect(result.decks.find(d => d.id === 'general-other')).toBeUndefined();
  });
});
