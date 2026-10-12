import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SubDeckStorage, enqueueMutation } from '@/utils/storage';
import { CategoryDeck, SubscribedChannel } from '@/types';

const UC1 = 'UC0000000000000000000001';
const UC2 = 'UC0000000000000000000002';
const MUSIC_TOPIC = 'UC-9-kyTW8ZkZNDHQJ6FgpwQ';

const ch = (ucId: string, handle: string, title = handle): SubscribedChannel => ({
  ucId, title, handle, url: `https://www.youtube.com/${handle}`, avatarUrl: '', discoveredAt: 0,
});
const deck = (id: string, channelIds: string[], extra: Partial<CategoryDeck> = {}): CategoryDeck => ({
  id, name: id, icon: '📁', channelIds, isCollapsed: true, sortOrder: 0, ...extra,
});

/** Minimal in-memory chrome.storage.local, enough for executeMutation. */
function installFakeChrome(initial: Record<string, unknown>) {
  let store: Record<string, unknown> = structuredClone(initial);
  const pick = (keys: string | string[] | null) => {
    if (keys === null) return structuredClone(store);
    const list = Array.isArray(keys) ? keys : [keys];
    return structuredClone(Object.fromEntries(list.filter(k => k in store).map(k => [k, store[k]])));
  };
  vi.stubGlobal('chrome', {
    runtime: { id: 'test-extension' },
    storage: {
      local: {
        get: async (keys: string | string[] | null) => pick(keys),
        set: async (items: Record<string, unknown>) => { store = { ...store, ...structuredClone(items) }; },
        remove: async (keys: string | string[]) => { for (const k of [keys].flat()) delete store[k]; },
      },
    },
  });
  return () => store;
}

describe('storage mutations', () => {
  let read: () => Record<string, any>;
  afterEach(() => vi.unstubAllGlobals());

  describe('importMerge', () => {
    beforeEach(() => {
      read = installFakeChrome({
        channels: { [UC1]: ch(UC1, '@one') },
        categories: [deck('mine', [UC1])],
        handleToUcId: { '@one': UC1, one: UC1 },
      });
    });

    it('normalizes imported data: handle-keyed duplicates merge, system channels are dropped', async () => {
      await enqueueMutation('importMerge', {
        categories: [deck('mine', ['@one', MUSIC_TOPIC]), deck('imported', [UC2])],
        channels: {
          '@one': ch('@one', '@one'),
          [UC2]: ch(UC2, '@two'),
          [MUSIC_TOPIC]: { ...ch(MUSIC_TOPIC, '@music', 'Music') },
        },
        handleToUcId: { '@two': UC2 },
      });
      const s = read();
      expect(Object.keys(s.channels).sort()).toEqual([UC1, UC2].sort());
      expect(s.categories.find((c: CategoryDeck) => c.id === 'mine').channelIds).toEqual([UC1]);
      expect(s.categories.find((c: CategoryDeck) => c.id === 'imported').channelIds).toEqual([UC2]);
    });
  });

  describe('folder membership', () => {
    beforeEach(() => {
      read = installFakeChrome({
        channels: { [UC1]: ch(UC1, '@one'), [UC2]: ch(UC2, '@two') },
        // A legacy handle alias of UC1 is still filed in "old"
        categories: [deck('old', ['@one', UC2]), deck('new', [])],
        handleToUcId: { '@one': UC1, one: UC1, '@two': UC2, two: UC2 },
        manualAssignments: {},
        channelExclusions: {},
      });
    });

    it('moving a channel removes every alias it was filed under and records the manual choice', async () => {
      await enqueueMutation('setChannelCategory', { ucId: UC1, newCatId: 'new' });
      const s = read();
      expect(s.categories.find((c: CategoryDeck) => c.id === 'old').channelIds).toEqual([UC2]);
      expect(s.categories.find((c: CategoryDeck) => c.id === 'new').channelIds).toEqual([UC1]);
      expect(s.manualAssignments[UC1]).toEqual(['new']);
    });

    it('deleting a folder leaves the channels themselves untouched', async () => {
      await enqueueMutation('deleteCategory', { categoryId: 'old' });
      const s = read();
      expect(s.categories.map((c: CategoryDeck) => c.id)).toEqual(['new']);
      expect(Object.keys(s.channels)).toHaveLength(2);
    });

    it('unknown mutations are rejected without writing (e.g. the removed "addChannel")', async () => {
      const before = JSON.stringify(read());
      expect(await enqueueMutation('addChannel', { channel: ch('UC9', '@x') })).toBeNull();
      expect(JSON.stringify(read())).toBe(before);
    });
  });

  it('getAll never writes', async () => {
    read = installFakeChrome({ channels: { '@one': ch('@one', '@one'), [UC1]: ch(UC1, '@one') }, categories: [deck('d', ['@one'])] });
    const before = JSON.stringify(read());
    const view = await SubDeckStorage.getAll();
    expect(Object.keys(view.channels)).toEqual([UC1]); // the view is clean...
    expect(JSON.stringify(read())).toBe(before);        // ...but storage is untouched
  });
});
