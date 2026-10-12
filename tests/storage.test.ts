import { describe, it, expect } from 'vitest';
import { normalizeState } from '@/utils/storage';
import { applyOverrides } from '@/ai/overrides';
import { API_KEY_FIELD, CategoryDeck, SubscribedChannel } from '@/types';

const UC1 = 'UC0000000000000000000001';
const UC2 = 'UC0000000000000000000002';

const ch = (ucId: string, handle: string, title = handle): SubscribedChannel => ({
  ucId, title, handle, url: `https://www.youtube.com/${handle}`, avatarUrl: '', discoveredAt: 0,
});

const deck = (id: string, channelIds: string[], extra: Partial<CategoryDeck> = {}): CategoryDeck => ({
  id, name: id, icon: '📁', channelIds, isCollapsed: true, sortOrder: 0, ...extra,
});

describe('normalizeState', () => {
  it('is clean (not dirty) for already-normalized data', () => {
    const raw = {
      version: 2,
      channels: { [UC1]: ch(UC1, '@one') },
      categories: [deck('mine', [UC1], { color: '#3B82F6', isSystem: false })],
      handleToUcId: { '@one': UC1, one: UC1 },
      channelExclusions: {},
      manualAssignments: {},
      settings: {},
    };
    expect(normalizeState(raw).dirty).toBe(false);
  });

  it('merges a handle-keyed duplicate into the UC record and remaps folder ids', () => {
    const raw = {
      channels: { [UC1]: ch(UC1, '@one'), '@one': ch('@one', '@one') },
      categories: [deck('mine', ['@one', UC1])],
      handleToUcId: {},
    };
    const { data, dirty } = normalizeState(raw);
    expect(dirty).toBe(true);
    expect(Object.keys(data.channels)).toEqual([UC1]);
    expect(data.categories[0].channelIds).toEqual([UC1]);
  });

  it('never exposes the API key and fills defaults', () => {
    const { data } = normalizeState({ [API_KEY_FIELD]: 'secret', settings: { apiKey: 'legacy' } });
    expect((data as any)[API_KEY_FIELD]).toBeUndefined();
    expect(data.settings.apiKey).toBeUndefined();
    expect(data.settings.aiProvider).toBe('gemini-nano');
    expect(data.categories).toEqual([]);
  });

  it('does not mutate the caller-visible top-level snapshot', () => {
    const raw = { channels: { [UC1]: ch(UC1, '@one') }, categories: [] };
    normalizeState(raw);
    expect(Object.keys(raw)).toEqual(['channels', 'categories']);
  });
});

describe('applyOverrides', () => {
  const channels = [ch(UC1, '@one'), ch(UC2, '@two')];

  it('keeps user folders and replaces old system folders', () => {
    const generated = [deck('tech-coding', [UC1, UC2], { isSystem: true })];
    const existing = [deck('gaming', [UC1], { isSystem: true }), deck('my-folder', [UC2], { isSystem: false })];
    const result = applyOverrides(generated, existing, {}, {}, channels);
    expect(result.map(d => d.id).sort()).toEqual(['my-folder', 'tech-coding']);
  });

  it('honours manual assignments and exclusions', () => {
    const generated = [deck('tech-coding', [UC1, UC2], { isSystem: true })];
    const existing = [deck('my-folder', [], { isSystem: false })];
    const result = applyOverrides(generated, existing, { [UC1]: ['my-folder'] }, { [UC2]: ['tech-coding'] }, channels);
    expect(result.find(d => d.id === 'my-folder')!.channelIds).toEqual([UC1]);
    expect(result.find(d => d.id === 'tech-coding')).toBeUndefined(); // emptied system deck is dropped
  });
});
