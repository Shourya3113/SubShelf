import { describe, it, expect, afterEach, vi } from 'vitest';
import { describeMerge, describeMergeResult, describeReplace, ExportImport, ImportData, previewImport } from '@/utils/exportImport';
import { enqueueMutation, mergeFolders } from '@/utils/storage';
import { accountKey } from '@/utils/account';
import { CategoryDeck, SubscribedChannel } from '@/types';

const A = 'aaaaaaaaaaaaaaaa';
const id = (n: number) => 'UC' + String(n).padStart(22, '0');
const ch = (n: number): SubscribedChannel => ({ ucId: id(n), title: `C${n}`, handle: `@c${n}`, url: '', avatarUrl: '', discoveredAt: 0 });
const deck = (folderId: string, name: string, nums: number[]): CategoryDeck => ({
  id: folderId, name, icon: '📁', channelIds: nums.map(id), isCollapsed: true, sortOrder: 0,
});
const channels = (...nums: number[]) => Object.fromEntries(nums.map(n => [id(n), ch(n)]));

const file: ImportData = {
  categories: [deck('tech-coding', 'Tech', [1, 3]), deck('gaming-1234', 'Gaming', [4]), deck('cooking-9', 'Cooking', [5])],
  channels: channels(1, 3, 4, 5),
  handleToUcId: {},
  channelExclusions: {},
  manualAssignments: { [id(4)]: ['gaming-1234'] },
};
const current = {
  categories: [deck('tech-coding', 'Tech', [1, 2]), deck('gaming-5678', 'gaming ', [6]), deck('news-1', 'News', [7]), deck('art-1', 'Art', [])],
  channels: channels(1, 2, 6, 7),
};

function installFakeChrome(initial: Record<string, unknown>) {
  let store: Record<string, unknown> = Object.fromEntries(Object.entries(structuredClone(initial)).map(([k, v]) => [accountKey(A, k), v]));
  vi.stubGlobal('chrome', {
    runtime: { id: 'test-extension' },
    storage: {
      local: {
        get: async (keys: string | string[]) => structuredClone(Object.fromEntries([keys].flat().filter(k => k in store).map(k => [k, store[k]]))),
        set: async (items: Record<string, unknown>) => { store = { ...store, ...structuredClone(items) }; },
      },
    },
  });
  return (key: string) => store[accountKey(A, key)] as any;
}

describe('import preview', () => {
  it('matches folders by ID, then by name, so a shared setup does not double up', () => {
    const merged = mergeFolders(current.categories, file.categories);
    expect(merged.categories.map(c => c.id)).toEqual(['tech-coding', 'gaming-5678', 'news-1', 'art-1', 'cooking-9']);
    expect(merged.remap).toEqual({ 'gaming-1234': 'gaming-5678' });
    expect(merged.categories[1].channelIds).toEqual([id(6), id(4)]);
    expect([merged.added, merged.combined, merged.kept]).toEqual([1, 2, 2]);
  });

  it('counts what Merge and Replace would do', () => {
    expect(previewImport(file, current)).toEqual({
      addFolders: 1,
      combineFolders: 2,
      newChannels: 3,
      fileFolders: 3,
      dropFolders: ['News', 'Art'],
      unfiledChannels: 3, // 2, 6 and 7 are in folders now and in none of the file's
    });
  });

  it('says so in plain words', () => {
    const p = previewImport(file, current);
    expect(describeMerge(p)).toBe('Adds 1 folder, combines 2, 3 new channels. Everything you have now stays.');
    expect(describeReplace(p)).toBe(
      'Uses the 3 folders in this file. Removes 2 folders you only have on this device: News, Art. 3 channels will leave your folders. Your current folders are saved to a backup file first.'
    );
    expect(describeMergeResult({ added: 4, combined: 2, kept: 12 })).toBe('Added 4 folders, combined 2, kept 12.');
  });

  it('does not list every folder Replace would drop', () => {
    const many = Array.from({ length: 8 }, (_, i) => deck(`f${i}`, `F${i}`, []));
    const text = describeReplace(previewImport({ ...file, categories: [] }, { categories: many, channels: {} }));
    expect(text).toContain('Removes 8 folders you only have on this device: F0, F1, F2, F3, F4 and 3 more.');
  });

  it('has nothing to add for a file identical to what is there', () => {
    const same = previewImport({ ...file, categories: [], channels: {} }, current);
    expect(describeMerge(same)).toBe('Nothing new in this file.');
  });
});

describe('applying an import', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('Merge returns the same counts as the preview and keeps everything', async () => {
    const read = installFakeChrome(current);
    const result = await enqueueMutation('importMerge', file, A);
    expect(result).toEqual({ added: 1, combined: 2, kept: 2 });
    expect(read('categories').map((c: CategoryDeck) => c.id)).toEqual(['tech-coding', 'gaming-5678', 'news-1', 'art-1', 'cooking-9']);
    expect(read('categories')[0].channelIds).toEqual([id(1), id(2), id(3)]);
  });

  it('Merge points corrections at the folder they landed in', async () => {
    const read = installFakeChrome(current);
    await enqueueMutation('importMerge', file, A);
    expect(read('manualAssignments')[id(4)]).toEqual(['gaming-5678']);
  });

  it('Replace uses the file\'s folders and corrections but keeps the channels YouTube reported', async () => {
    const read = installFakeChrome({ ...current, activeCategoryId: 'news-1', manualAssignments: { [id(7)]: ['news-1'] } });
    expect(await enqueueMutation('importReplace', file, A)).toEqual({ folders: 3 });
    expect(read('categories').map((c: CategoryDeck) => c.id)).toEqual(['tech-coding', 'gaming-1234', 'cooking-9']);
    expect(read('manualAssignments')).toEqual({ [id(4)]: ['gaming-1234'] });
    expect(Object.keys(read('channels'))).toEqual(expect.arrayContaining([id(2), id(6), id(7)]));
    expect(read('activeCategoryId')).toBeNull();
  });

  it('Replace saves the current folders to a file before changing anything', async () => {
    const steps: string[] = [];
    const exportSpy = vi.spyOn(ExportImport, 'exportToFile').mockImplementation(async () => { steps.push('export'); });
    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-extension',
        sendMessage: (m: any, cb: (r: unknown) => void) => { steps.push(m.action); cb({ success: true, result: { folders: 3 } }); },
      },
    });
    vi.stubGlobal('window', { location: { protocol: 'chrome-extension:' } });
    await ExportImport.applyImport(file, 'replace');
    expect(steps).toEqual(['export', 'importReplace']);

    steps.length = 0;
    await ExportImport.applyImport(file, 'merge');
    expect(steps).toEqual(['importMerge']);
    exportSpy.mockRestore();
  });
});
