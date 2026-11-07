import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SubDeckStorage, enqueueMutation } from '@/utils/storage';
import { accountKey, ACCOUNTS_KEY, hashAccountId, isAccountHash, LAST_ACCOUNT_KEY } from '@/utils/account';
import { CategoryDeck, SubscribedChannel } from '@/types';

const A = 'aaaaaaaaaaaaaaaa';
const B = 'bbbbbbbbbbbbbbbb';
const id = (n: number) => 'UC' + String(n).padStart(22, '0');

const ch = (n: number): SubscribedChannel => ({
  ucId: id(n), title: `Channel ${n}`, handle: `@chan${n}`, url: '', avatarUrl: '', discoveredAt: 0,
});
const deck = (name: string, channelIds: string[]): CategoryDeck => ({
  id: name, name, icon: '📁', channelIds, isCollapsed: true, sortOrder: 0,
});

function installFakeChrome(initial: Record<string, unknown>) {
  let store: Record<string, unknown> = structuredClone(initial);
  vi.stubGlobal('chrome', {
    runtime: { id: 'test-extension' },
    storage: {
      local: {
        get: async (keys: string | string[] | null) => {
          if (keys === null) return structuredClone(store);
          return structuredClone(Object.fromEntries([keys].flat().filter(k => k in store).map(k => [k, store[k]])));
        },
        set: async (items: Record<string, unknown>) => { store = { ...store, ...structuredClone(items) }; },
        remove: async (keys: string | string[]) => { for (const k of [keys].flat()) delete store[k]; },
      },
    },
  });
  return () => store as Record<string, any>;
}

const folders = (read: () => Record<string, any>, account: string): CategoryDeck[] => read()[accountKey(account, 'categories')];
const inFolder = (read: () => Record<string, any>, account: string, name: string): string[] =>
  folders(read, account).find(c => c.id === name)!.channelIds;

/** What 1.3.2 left behind: one shared set of folders, here holding both accounts' channels. */
const legacy = () => ({
  version: 2,
  settings: { aiProvider: 'heuristic', hideShortsFromFeed: true },
  channels: { [id(1)]: ch(1), [id(2)]: ch(2), [id(3)]: ch(3) },
  categories: [deck('tech', [id(1), id(3)]), deck('music', [id(2), id(3)])],
  handleToUcId: {},
  manualAssignments: { [id(1)]: ['tech'] },
  channelExclusions: {},
});

describe('per-account folders', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    SubDeckStorage.setAccount(null);
  });

  it('never stores the raw account ID', async () => {
    const hash = await hashAccountId('112539000000000000091||');
    expect(isAccountHash(hash)).toBe(true);
    expect(hash).not.toContain('112539');
    expect(await hashAccountId('117103000000000000016||')).not.toBe(hash);
  });

  it('keeps two accounts apart', async () => {
    const read = installFakeChrome({});
    await enqueueMutation('claimAccount', undefined, A);
    await enqueueMutation('claimAccount', undefined, B);
    await enqueueMutation('createCategory', { category: deck('only-a', []) }, A);
    await enqueueMutation('syncObservation', { discovered: [ch(1)], sidebarComplete: false }, A);
    await enqueueMutation('syncObservation', { discovered: [ch(2)], sidebarComplete: false }, B);

    expect(Object.keys(read()[accountKey(A, 'channels')])).toEqual([id(1)]);
    expect(Object.keys(read()[accountKey(B, 'channels')])).toEqual([id(2)]);
    expect(read()[accountKey(B, 'categories')] ?? []).toEqual([]);
    expect((await SubDeckStorage.getAll(B)).categories).toEqual([]);
    expect((await SubDeckStorage.getAll(A)).categories.map(c => c.id)).toEqual(['only-a']);
  });

  it('writes nothing without a valid account', async () => {
    const read = installFakeChrome({ channels: { [id(1)]: ch(1) } });
    const before = JSON.stringify(read());
    await expect(enqueueMutation('createCategory', { category: deck('x', []) })).rejects.toThrow('No YouTube account');
    await expect(enqueueMutation('syncObservation', { discovered: [ch(2)] }, 'not-a-hash')).rejects.toThrow('No YouTube account');
    expect(JSON.stringify(read())).toBe(before);
  });

  it('reads nothing of any account until the account is known, but settings still work', async () => {
    installFakeChrome(legacy());
    const view = await SubDeckStorage.getAll();
    expect(view.categories).toEqual([]);
    expect(view.channels).toEqual({});
    expect(view.settings.hideShortsFromFeed).toBe(true);
  });

  it('shares settings between accounts', async () => {
    installFakeChrome(legacy());
    await enqueueMutation('updateSettings', { hideShortsFromFeed: false });
    expect((await SubDeckStorage.getAll(A)).settings.hideShortsFromFeed).toBe(false);
    expect((await SubDeckStorage.getAll(B)).settings.hideShortsFromFeed).toBe(false);
  });

  it('keeps interleaved writes from two tabs in their own accounts', async () => {
    const read = installFakeChrome({});
    await Promise.all([
      enqueueMutation('claimAccount', undefined, A),
      enqueueMutation('claimAccount', undefined, B),
      enqueueMutation('createCategory', { category: deck('a1', []) }, A),
      enqueueMutation('createCategory', { category: deck('b1', []) }, B),
      enqueueMutation('createCategory', { category: deck('a2', []) }, A),
    ]);
    expect(folders(read, A).map(c => c.id)).toEqual(['a1', 'a2']);
    expect(folders(read, B).map(c => c.id)).toEqual(['b1']);
  });

  it('remembers the last account used, for the popup', async () => {
    const read = installFakeChrome({});
    await enqueueMutation('claimAccount', undefined, A);
    await enqueueMutation('claimAccount', undefined, B);
    await enqueueMutation('claimAccount', undefined, A);
    expect(read()[LAST_ACCOUNT_KEY]).toBe(A);
    expect(await SubDeckStorage.getKnownAccounts()).toEqual({ last: A, count: 2 });
  });

  describe('upgrade from 1.3.2', () => {
    let read: () => Record<string, any>;
    beforeEach(() => {
      read = installFakeChrome(legacy());
    });

    it('gives the first account everything, so one-account users see no change', async () => {
      expect(await enqueueMutation('claimAccount', undefined, A)).toEqual({ isNew: true });
      expect(inFolder(read, A, 'tech')).toEqual([id(1), id(3)]);
      expect(Object.keys(read()[accountKey(A, 'channels')])).toHaveLength(3);
      expect(read()[accountKey(A, 'manualAssignments')]).toEqual({ [id(1)]: ['tech'] });
    });

    it('never changes the old data', async () => {
      await enqueueMutation('claimAccount', undefined, A);
      await enqueueMutation('claimAccount', undefined, B);
      await enqueueMutation('deleteCategory', { categoryId: 'tech' }, A);
      await enqueueMutation('normalize', undefined, A);
      const { categories, channels, manualAssignments } = legacy();
      expect(read().categories).toEqual(categories);
      expect(read().channels).toEqual(channels);
      expect(read().manualAssignments).toEqual(manualAssignments);
    });

    it('does not copy again for an account it already knows', async () => {
      await enqueueMutation('claimAccount', undefined, A);
      await enqueueMutation('deleteCategory', { categoryId: 'tech' }, A);
      expect(await enqueueMutation('claimAccount', undefined, A)).toEqual({ isNew: false });
      expect(folders(read, A).map(c => c.id)).toEqual(['music']);
    });

    it('starts a later account from the same folders, without the channels', async () => {
      await enqueueMutation('claimAccount', undefined, A);
      await enqueueMutation('claimAccount', undefined, B);
      expect(folders(read, B).map(c => c.id)).toEqual(['tech', 'music']);
      expect(folders(read, B).every(c => c.channelIds.length === 0)).toBe(true);
      expect(read()[accountKey(B, 'channels')]).toBeUndefined();
      expect(read()[accountKey(B, 'manualAssignments')]).toEqual({ [id(1)]: ['tech'] });
    });

    // The account opened first after the update is chance: its sorting must survive in either order
    it.each([[A, B], [B, A]])('puts the second account\'s channels back in their folders (%s first)', async (first, second) => {
      await enqueueMutation('claimAccount', undefined, first);
      await enqueueMutation('claimAccount', undefined, second);
      await enqueueMutation('syncObservation', { discovered: [ch(2), ch(3)], sidebarComplete: false }, second);

      expect(inFolder(read, second, 'music')).toEqual([id(2), id(3)]);
      expect(inFolder(read, second, 'tech')).toEqual([id(3)]); // a channel in two folders stays in both
      expect(Object.keys(read()[accountKey(second, 'channels')]).sort()).toEqual([id(2), id(3)]);
    });

    it('clears another account\'s channels from the first account with its first full list', async () => {
      await enqueueMutation('claimAccount', undefined, A);
      const seen = { discovered: [ch(2)], sidebarComplete: false };

      // Not a full list: nothing can be concluded, and the shared data stays
      await enqueueMutation('syncObservation', seen, A);
      expect(Object.keys(read()[accountKey(A, 'channels')])).toHaveLength(3);

      const res = await enqueueMutation('syncObservation', { ...seen, fullList: true }, A);
      expect(res.removed.sort()).toEqual([id(1), id(3)]); // 2 of 3, past the usual limit
      expect(Object.keys(read()[accountKey(A, 'channels')])).toEqual([id(2)]);
      expect(inFolder(read, A, 'music')).toEqual([id(2)]);
    });

    it('does that only once', async () => {
      await enqueueMutation('claimAccount', undefined, A);
      await enqueueMutation('syncObservation', { discovered: [ch(1), ch(2), ch(3)], sidebarComplete: false, fullList: true }, A);
      const res = await enqueueMutation('syncObservation', { discovered: [ch(2)], sidebarComplete: false, fullList: true }, A);
      expect(res.removed).toEqual([]); // back to the usual limits, so a bad page can't wipe folders
      expect(Object.keys(read()[accountKey(A, 'channels')])).toHaveLength(3);
    });

    it('reads the first account\'s full list right away', async () => {
      read = installFakeChrome({ ...legacy(), allSubscriptionsCheckedAt: Date.now() });
      await enqueueMutation('claimAccount', undefined, A);
      SubDeckStorage.setAccount(A);
      expect(await SubDeckStorage.getAllSubscriptionsCheckedAt()).toBe(0);
    });

    it('leaves an account that started empty on the usual limits', async () => {
      await enqueueMutation('claimAccount', undefined, A);
      await enqueueMutation('claimAccount', undefined, B);
      await enqueueMutation('syncObservation', { discovered: [ch(1), ch(2), ch(3)], sidebarComplete: false }, B);
      const res = await enqueueMutation('syncObservation', { discovered: [ch(2)], sidebarComplete: false, fullList: true }, B);
      expect(res.removed).toEqual([]);
    });

    it('brings a channel back to its folder if that first list was wrong about it', async () => {
      await enqueueMutation('claimAccount', undefined, A);
      await enqueueMutation('syncObservation', { discovered: [ch(2)], sidebarComplete: false, fullList: true }, A);
      await enqueueMutation('syncObservation', { discovered: [ch(1), ch(2)], sidebarComplete: false }, A);
      expect(inFolder(read, A, 'tech')).toEqual([id(1)]);
    });

    it('sorts a channel the old data never had as usual', async () => {
      await enqueueMutation('claimAccount', undefined, A);
      await enqueueMutation('claimAccount', undefined, B);
      await enqueueMutation('syncObservation', { discovered: [ch(9)], sidebarComplete: false }, B);
      expect(read()[accountKey(B, 'channels')][id(9)]).toBeDefined();
    });

    it('skips an old folder the account has since deleted', async () => {
      await enqueueMutation('claimAccount', undefined, A);
      await enqueueMutation('claimAccount', undefined, B);
      await enqueueMutation('deleteCategory', { categoryId: 'tech' }, B);
      await enqueueMutation('syncObservation', { discovered: [ch(3)], sidebarComplete: false }, B);
      expect(folders(read, B).map(c => c.id)).toEqual(['music']);
      expect(inFolder(read, B, 'music')).toEqual([id(3)]);
    });
  });

  it('starts a fresh install with nothing to copy', async () => {
    const read = installFakeChrome({ version: 3, settings: {} });
    await enqueueMutation('claimAccount', undefined, A);
    expect(Object.keys(read()[ACCOUNTS_KEY])).toEqual([A]);
    expect((await SubDeckStorage.getAll(A)).categories).toEqual([]);
  });
});
