import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SubDeckStorage, enqueueMutation } from '@/utils/storage';
import { CategoryDeck, NO_FOLDER, SubscribedChannel } from '@/types';

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

  describe('"No folder" (popup ✕)', () => {
    const generated = () => [deck('tech-coding', [UC1, UC2], { isSystem: true })];
    beforeEach(() => {
      read = installFakeChrome({
        channels: { [UC1]: ch(UC1, '@one'), [UC2]: ch(UC2, '@two') },
        categories: [deck('tech-coding', [UC1, UC2], { isSystem: true }), deck('mine', [])],
        handleToUcId: { '@one': UC1, one: UC1, '@two': UC2, two: UC2 },
        manualAssignments: {},
        channelExclusions: {},
      });
    });

    it('takes the channel out of every folder and Auto-sort keeps it out', async () => {
      await enqueueMutation('setChannelCategory', { ucId: UC1, newCatId: '' });
      expect(read().categories.every((c: CategoryDeck) => !c.channelIds.includes(UC1))).toBe(true);
      expect(read().manualAssignments[UC1]).toEqual([NO_FOLDER]);
      expect(read().channels[UC1]).toBeDefined(); // still listed (still subscribed)

      await enqueueMutation('applyGeneratedDecks', { decks: generated() });
      expect(read().categories.every((c: CategoryDeck) => !c.channelIds.includes(UC1))).toBe(true);
      expect(read().categories.find((c: CategoryDeck) => c.id === 'tech-coding').channelIds).toEqual([UC2]);
    });

    it('placing it in a folder again (picker, drag or dropdown) clears the marker', async () => {
      await enqueueMutation('setChannelCategory', { ucId: UC1, newCatId: '' });
      await enqueueMutation('addChannelToCategory', { ucId: UC1, categoryId: 'mine' });
      expect(read().manualAssignments[UC1]).toEqual(['mine']);
      await enqueueMutation('applyGeneratedDecks', { decks: generated() });
      expect(read().categories.find((c: CategoryDeck) => c.id === 'mine').channelIds).toContain(UC1);

      await enqueueMutation('setChannelCategory', { ucId: UC2, newCatId: '' });
      await enqueueMutation('setChannelCategory', { ucId: UC2, newCatId: 'mine' });
      expect(read().manualAssignments[UC2]).toEqual(['mine']);
    });

    it('"Forget my corrections" lets Auto-sort sort it again', async () => {
      await enqueueMutation('setChannelCategory', { ucId: UC1, newCatId: '' });
      await enqueueMutation('clearOverrides');
      await enqueueMutation('applyGeneratedDecks', { decks: generated() });
      expect(read().categories.find((c: CategoryDeck) => c.id === 'tech-coding').channelIds).toContain(UC1);
    });
  });

  describe('subscriptionChanged', () => {
    it('removes an unsubscribed channel at once and puts it back in its folder on resubscribe', async () => {
      read = installFakeChrome({
        channels: { [UC1]: ch(UC1, '@one'), [UC2]: ch(UC2, '@two') },
        categories: [deck('mine', [UC1, UC2])],
        handleToUcId: { '@one': UC1, one: UC1, '@two': UC2, two: UC2 },
      });
      expect(await enqueueMutation('subscriptionChanged', { ucId: UC1, subscribed: false })).toEqual({ changed: true });
      expect(read().channels[UC1]).toBeUndefined();
      expect(read().categories[0].channelIds).toEqual([UC2]);
      expect(read().removedChannels[UC1].folderIds).toEqual(['mine']);

      expect(await enqueueMutation('subscriptionChanged', { ucId: UC1, subscribed: true })).toEqual({ changed: true });
      expect(read().channels[UC1].handle).toBe('@one');
      expect(read().categories[0].channelIds).toEqual([UC2, UC1]);
      expect(read().removedChannels[UC1]).toBeUndefined();
    });

    it('ignores anything that is not a channel ID', async () => {
      read = installFakeChrome({ channels: { [UC1]: ch(UC1, '@one') }, categories: [] });
      expect(await enqueueMutation('subscriptionChanged', { ucId: '@one', subscribed: false })).toEqual({ changed: false });
      expect(read().channels[UC1]).toBeDefined();
    });
  });

  describe('ratePromptEvent', () => {
    it('stores only the folders date and the answer, and keeps them out of the folder data', async () => {
      read = installFakeChrome({ channels: {}, categories: [] });
      await enqueueMutation('ratePromptEvent', { event: 'foldersSeen' });
      const first = read().ratePrompt;
      expect(Object.keys(first).sort()).toEqual(['foldersSince', 'snoozedUntil', 'status']);
      expect(await enqueueMutation('ratePromptEvent', { event: 'foldersSeen' })).toEqual({ changed: false });
      expect(read().ratePrompt.foldersSince).toBe(first.foldersSince);

      await enqueueMutation('ratePromptEvent', { event: 'rated' });
      expect((await SubDeckStorage.getRatePrompt()).status).toBe('done');
      expect(Object.keys(await SubDeckStorage.getAll())).not.toContain('ratePrompt');
    });
  });

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

describe('new subscriptions follow the user\'s corrections', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('a new Apple channel joins the user\'s own Apple folder instead of Tech', async () => {
    const A = 'UC0000000000000000000011', B = 'UC0000000000000000000012', C = 'UC0000000000000000000013';
    const withDesc = (c: SubscribedChannel, description: string) => ({ ...c, description });
    const read = installFakeChrome({
      channels: {
        [A]: withDesc(ch(A, '@apple', 'Apple'), 'Apple product launches, keynotes and iPhone, Mac and iPad features.'),
        [B]: withDesc(ch(B, '@appleindia', 'Apple India'), 'Official Apple channel for India: iPhone, Mac and iPad.'),
        [UC2]: withDesc(ch(UC2, '@google', 'Google'), 'Search, Android, Pixel and AI from Google.'),
      },
      categories: [deck('tech-coding', [UC2], { isSystem: true }), deck('my-apple', [A, B], { isSystem: false })],
      handleToUcId: {},
      manualAssignments: { [A]: ['my-apple'], [B]: ['my-apple'] },
      channelExclusions: {},
    });
    const newcomer = withDesc(ch(C, '@appleexplained', 'Apple Explained'), 'Explaining the history of Apple, iPhone and Mac.');
    await enqueueMutation('syncObservation', { discovered: [newcomer], sidebarComplete: false });
    const s = read() as Record<string, any>;
    expect(s.categories.find((c: CategoryDeck) => c.id === 'my-apple').channelIds).toContain(C);
    expect(s.categories.find((c: CategoryDeck) => c.id === 'tech-coding').channelIds).not.toContain(C);
  });
});
