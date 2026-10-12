import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  NANO_OPTS,
  NanoRunner,
  describeNanoStatus,
  downloadNanoModel,
  downloadProgressPercent,
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

  it('converts fractional and byte-based progress to a clamped percentage', () => {
    expect(downloadProgressPercent(0.5)).toBe(50);
    expect(downloadProgressPercent(0.5, 1)).toBe(50);
    expect(downloadProgressPercent(250, 1000)).toBe(25);
    expect(downloadProgressPercent(2)).toBe(100);
    expect(downloadProgressPercent(undefined)).toBe(0);
    expect(downloadProgressPercent(Number.NaN)).toBe(0);
  });

  it('offers a download only when Chrome can actually download the model', () => {
    expect(describeNanoStatus('downloadable').action).toBe('Download on-device AI model');
    expect(describeNanoStatus('downloading').action).not.toBeNull();
    for (const s of ['available', 'unavailable', 'no-api'] as const) {
      expect(describeNanoStatus(s).action).toBeNull();
    }
    expect(describeNanoStatus('unavailable').text).toContain('Offline keywords');
    expect(describeNanoStatus('no-api').text).toContain('Offline keywords');
  });
});

describe('downloadNanoModel', () => {
  it('creates a session with the shared options, reports progress, and discards the session', async () => {
    const destroy = vi.fn();
    const LM = {
      create: vi.fn(async (opts: any) => {
        const monitor = new EventTarget();
        opts.monitor(monitor);
        for (const loaded of [0, 0.42, 1]) {
          monitor.dispatchEvent(Object.assign(new Event('downloadprogress'), { loaded, total: 1 }));
        }
        return { destroy };
      }),
    };
    const seen: number[] = [];
    await downloadNanoModel(LM, p => seen.push(p));

    expect(LM.create).toHaveBeenCalledTimes(1);
    expect(LM.create.mock.calls[0][0]).toMatchObject(NANO_OPTS);
    expect(seen).toEqual([0, 42, 100]);
    expect(destroy).toHaveBeenCalled();
  });

  it('fails clearly when the API is missing', async () => {
    await expect(downloadNanoModel(null, () => {})).rejects.toThrow(/not available/);
  });
});

describe('Auto-AI with Gemini Nano', () => {
  afterEach(() => vi.unstubAllGlobals());
  const channels = [ch(UC1, '@fireship', 'Fireship')];

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
