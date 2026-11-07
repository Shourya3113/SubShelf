import { SubDeckStorageSchema, DEFAULT_STORAGE, SubscribedChannel, CategoryDeck, CURRENT_SCHEMA_VERSION, API_KEY_FIELD, NO_FOLDER } from '@/types';
import { Logger } from './logger';
import { isSystemChannelOrCurator } from './systemChannels';
import { applyResubscribe, applyUnsubscribe, computeSync, MissingRecord, RemovedChannel, SYNC_MISSING_KEY, SYNC_REMOVED_KEY, SyncSnapshot } from './syncEngine';
import { sanitizeAvatarMap } from './avatarUrl';
import { accountStore, AccountStore, ACCOUNTS_KEY, isAccountHash, LAST_ACCOUNT_KEY } from './account';
import { applyOverrides } from '@/ai/overrides';
import { isConfident, LearnedModel, predictFolder, trainFromCorrections } from '@/ai/learning';
import { channelAliases, isChannelId, mapHandle, resolveChannelId } from './channelIdentity';
import { CHANNEL_DETAILS_CHECKED_KEY, cleanDescription, sanitizeDescriptionMap } from './channelDetails';
import { applyRatePromptEvent, normalizeRatePrompt, RATE_PROMPT_KEY, RatePromptEvent, RatePromptState } from './ratePrompt';

const MAX_CHANNELS_PER_CATEGORY = 5_000;

/**
 * Single FIFO queue for every storage read-modify-write. It lives in the service worker;
 * other contexts reach it through requestMutation(), so all writers are serialized.
 */
let storageQueue: Promise<unknown> = Promise.resolve();

export function enqueueStorageTask<T>(task: () => Promise<T>): Promise<T> {
  const run = storageQueue.then(task, task);
  storageQueue = run.catch(() => {});
  return run;
}

export function enqueueMutation(action: string, payload?: unknown, account?: string | null): Promise<any> {
  return enqueueStorageTask(() => SubDeckStorage.executeMutation(action, payload, account));
}

/**
 * Pure cleanup of a raw storage snapshot: fills missing fields, merges handle-keyed duplicates into
 * their UC ID record, drops system curators, and dedupes folder membership.
 * `dirty` reports whether the persisted copy would change. Never writes.
 */
export function normalizeState(raw: Record<string, any>): { data: SubDeckStorageSchema; dirty: boolean } {
  const data: Record<string, any> = { ...raw };
  if (typeof data.version !== 'number') data.version = CURRENT_SCHEMA_VERSION;

  // Credentials never leave this function
  delete data[API_KEY_FIELD];
  delete data['subshelf_gemini_api_key'];

  if (!Array.isArray(data.categories)) data.categories = [];
  if (!data.channels || typeof data.channels !== 'object') data.channels = {};
  if (!data.handleToUcId || typeof data.handleToUcId !== 'object') data.handleToUcId = {};
  if (!data.channelExclusions || typeof data.channelExclusions !== 'object') data.channelExclusions = {};
  if (!data.manualAssignments || typeof data.manualAssignments !== 'object') data.manualAssignments = {};
  const settings = data.settings && typeof data.settings === 'object' ? { ...data.settings } : {};
  delete settings.apiKey;
  data.settings = { ...DEFAULT_STORAGE.settings, ...settings };
  if (typeof data.lastScrapedAt !== 'number') data.lastScrapedAt = 0;
  if (typeof data.activeCategoryId !== 'string' && data.activeCategoryId !== null) data.activeCategoryId = null;

  let dirty = false;
  const cleanHandleMap: Record<string, string> = { ...data.handleToUcId };

  // Index all channels with canonical UC IDs (ignoring system curators)
  for (const ch of Object.values(data.channels as Record<string, SubscribedChannel>)) {
    if (ch && typeof ch === 'object' && !isSystemChannelOrCurator(ch)) mapHandle(cleanHandleMap, ch.handle, ch.ucId);
  }

  // Reconcile duplicate channel records and drop system topic/feed curator records
  const aliasRemap: Record<string, string> = {};
  const canonicalChannels: Record<string, SubscribedChannel> = {};
  const purgedSystemIds = new Set<string>();

  for (const [key, stored] of Object.entries(data.channels as Record<string, SubscribedChannel>)) {
    if (!stored || typeof stored !== 'object') continue;

    if (isSystemChannelOrCurator(stored) || isSystemChannelOrCurator({ ucId: key, title: stored.title, handle: stored.handle, url: stored.url })) {
      purgedSystemIds.add(key);
      if (stored.ucId) purgedSystemIds.add(stored.ucId);
      dirty = true;
      continue;
    }

    // Descriptions reach the AI prompt, so storage only ever holds clean, capped strings
    let ch = stored;
    if ('description' in stored) {
      const description = cleanDescription(stored.description);
      if (description !== stored.description) {
        ch = { ...stored, description };
        if (description === undefined) delete ch.description;
        dirty = true;
      }
    }

    const resolved = [ch.ucId, ch.handle, key].map(x => (x ? resolveChannelId(x, cleanHandleMap) : '')).find(isChannelId);
    const canonId = (resolved || ch.ucId)?.trim();

    if (canonId && canonId !== key && (isChannelId(canonId) || !isChannelId(key))) {
      aliasRemap[key] = canonId;
      dirty = true;
      const prev = canonicalChannels[canonId];
      canonicalChannels[canonId] = prev
        ? { ...ch, ...prev, avatarUrl: prev.avatarUrl || ch.avatarUrl, description: prev.description ?? ch.description }
        : { ...ch, ucId: canonId };
    } else {
      canonicalChannels[key] = ch;
    }
  }
  data.channels = canonicalChannels;

  for (const [h, targetId] of Object.entries(cleanHandleMap)) {
    if (purgedSystemIds.has(targetId) || isSystemChannelOrCurator({ handle: h, ucId: targetId })) {
      delete cleanHandleMap[h];
      dirty = true;
    }
  }
  data.handleToUcId = cleanHandleMap;

  // Guarantee valid CategoryDeck items, remap aliases, remove system channels, dedupe
  data.categories = data.categories
    .filter((c: any) => c && typeof c === 'object' && c.id && c.id !== '__uncategorized__')
    .map((c: any) => {
      const rawIds: string[] = Array.isArray(c.channelIds) ? c.channelIds.filter((id: any) => typeof id === 'string') : [];
      const seen = new Set<string>();
      const ids: string[] = [];
      for (const rawId of rawIds) {
        const canonId = aliasRemap[rawId] || resolveChannelId(rawId, cleanHandleMap);
        if (purgedSystemIds.has(canonId) || purgedSystemIds.has(rawId) || isSystemChannelOrCurator({ ucId: canonId })) continue;
        if (!seen.has(canonId)) {
          seen.add(canonId);
          ids.push(canonId);
        }
      }
      if (ids.length !== rawIds.length || ids.some((id, i) => id !== rawIds[i])) dirty = true;

      return {
        id: String(c.id),
        name: String(c.name || 'Untitled'),
        icon: String(c.icon || '📁'),
        color: typeof c.color === 'string' ? c.color : '#3B82F6',
        channelIds: ids,
        isCollapsed: Boolean(c.isCollapsed),
        sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : 0,
        isSystem: Boolean(c.isSystem),
      };
    });
  if (Array.isArray(raw.categories) && data.categories.length !== raw.categories.length) dirty = true;

  for (const sysId of purgedSystemIds) {
    if (data.manualAssignments[sysId]) {
      delete data.manualAssignments[sysId];
      dirty = true;
    }
    if (data.channelExclusions[sysId]) {
      delete data.channelExclusions[sysId];
      dirty = true;
    }
  }

  return { data: data as SubDeckStorageSchema, dirty };
}

/**
 * The folders 1.3.2's shared data had each channel in, so an account set up after the update gets
 * its channels back in place as they are found.
 */
function knownFoldersFrom(legacyCategories: unknown): (ucId: string) => string[] {
  const cats: CategoryDeck[] = Array.isArray(legacyCategories) ? legacyCategories : [];
  return (ucId) => cats.filter(c => Array.isArray(c?.channelIds) && c.channelIds.includes(ucId)).map(c => c.id);
}

/** The folder an imported one belongs to: itself, or one of the same name (custom folder IDs are unique per device). */
export function findMatchingFolder(folders: CategoryDeck[], incoming: Pick<CategoryDeck, 'id' | 'name'>): CategoryDeck | undefined {
  const name = incoming.name.trim().toLowerCase();
  return folders.find(f => f.id === incoming.id) ?? folders.find(f => f.name.trim().toLowerCase() === name);
}

/** Adds imported folders to existing ones. Pure, so the import preview and the import itself can't disagree. */
export function mergeFolders(existing: CategoryDeck[], incoming: CategoryDeck[]) {
  const categories = existing.map(c => ({ ...c, channelIds: Array.isArray(c.channelIds) ? [...c.channelIds] : [] }));
  const existingIds = new Set(existing.map(c => c.id));
  const combinedIds = new Set<string>();
  const remap: Record<string, string> = {};
  let added = 0;
  for (const inc of incoming) {
    const match = findMatchingFolder(categories, inc);
    if (!match) {
      categories.push({ ...inc, channelIds: [...inc.channelIds] });
      added++;
      continue;
    }
    match.channelIds = [...new Set([...match.channelIds, ...inc.channelIds])].slice(0, MAX_CHANNELS_PER_CATEGORY);
    if (match.id !== inc.id) remap[inc.id] = match.id;
    if (existingIds.has(match.id)) combinedIds.add(match.id);
  }
  return { categories, remap, added, combined: combinedIds.size, kept: existing.length - combinedIds.size };
}

/** Places newly subscribed channels by the user's corrections; trains lazily, only if one is needed. */
function learnedPlacer(raw: Record<string, any>): (ch: SubscribedChannel, engineFolderId: string | null) => string | null {
  let model: LearnedModel | null | undefined;
  const exclusions: Record<string, string[]> = raw.channelExclusions || {};
  return (ch, engineFolderId) => {
    if (model === undefined) {
      model = trainFromCorrections(raw.channels || {}, raw.manualAssignments || {}, Array.isArray(raw.categories) ? raw.categories : []);
    }
    if (!model) return null;
    const p = predictFolder(model, ch, exclusions[ch.ucId] ?? []);
    return isConfident(p, engineFolderId) ? p.folderId : null;
  };
}

/** When YouTube's All subscriptions list was last read in full (see SubscriptionSync.checkAllSubscriptions). */
export const ALL_SUBSCRIPTIONS_CHECKED_KEY = 'allSubscriptionsCheckedAt';

/** Everything stored per YouTube account. The same keys at the top level are 1.3.2's data (see claimAccount). */
const ACCOUNT_DATA_KEYS = [
  'categories', 'channels', 'activeCategoryId', 'handleToUcId', 'channelExclusions', 'manualAssignments', 'lastScrapedAt',
  SYNC_MISSING_KEY, SYNC_REMOVED_KEY, ALL_SUBSCRIPTIONS_CHECKED_KEY, CHANNEL_DETAILS_CHECKED_KEY,
];

/** Mutations of data shared by all accounts; every other one needs an account. */
const SHARED_MUTATIONS = new Set(['updateSettings', 'ratePromptEvent']);

const SYNC_SNAPSHOT_KEYS = ['channels', 'categories', 'handleToUcId', 'manualAssignments', 'channelExclusions', SYNC_MISSING_KEY, SYNC_REMOVED_KEY];

const asRecord = <T>(v: unknown): Record<string, T> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, T>) : {});

/** The part of storage that subscription sync reads and writes. */
function readSyncSnapshot(raw: Record<string, any>): SyncSnapshot {
  return {
    channels: asRecord<SubscribedChannel>(raw.channels),
    categories: (Array.isArray(raw.categories) ? raw.categories : []).filter((c: any) => c && typeof c === 'object' && c.id),
    handleToUcId: asRecord<string>(raw.handleToUcId),
    missing: asRecord<MissingRecord>(raw[SYNC_MISSING_KEY]),
    removed: asRecord<RemovedChannel>(raw[SYNC_REMOVED_KEY]),
  };
}

async function writeSyncSnapshot(store: AccountStore, next: SyncSnapshot, extra: Record<string, unknown> = {}): Promise<void> {
  await store.set({
    channels: next.channels,
    categories: next.categories,
    handleToUcId: next.handleToUcId,
    [SYNC_MISSING_KEY]: next.missing,
    [SYNC_REMOVED_KEY]: next.removed ?? {},
    ...extra,
  });
}

export class SubDeckStorage {
  /** The YouTube account this page works on: its tab's account, or the one the popup is showing. */
  private static account: string | null = null;

  static setAccount(account: string | null): void {
    this.account = isAccountHash(account) ? account : null;
  }

  static get currentAccount(): string | null {
    return this.account;
  }

  /** The account to show outside YouTube, and how many accounts SubShelf has seen. */
  static async getKnownAccounts(): Promise<{ last: string | null; count: number }> {
    const raw = await chrome.storage.local.get([ACCOUNTS_KEY, LAST_ACCOUNT_KEY]);
    return {
      last: isAccountHash(raw[LAST_ACCOUNT_KEY]) ? raw[LAST_ACCOUNT_KEY] : null,
      count: Object.keys(asRecord<number>(raw[ACCOUNTS_KEY])).length,
    };
  }

  /** This context's account data; empty until the account is known. */
  private static async own(keys: string | string[]): Promise<Record<string, any>> {
    return this.account ? accountStore(this.account).get(keys) : {};
  }

  static isContextValid(): boolean {
    try {
      return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
    } catch {
      return false;
    }
  }

  static isContentScript(): boolean {
    return typeof window !== 'undefined' && window.location?.protocol !== 'chrome-extension:';
  }

  static isServiceWorker(): boolean {
    return typeof window === 'undefined' && typeof self !== 'undefined';
  }

  /**
   * Returns a normalized view of storage. Read-only: cleanup is persisted separately by the
   * service worker's 'normalize' mutation so reads can never race with queued writes.
   */
  static async getAll(account: string | null = this.account): Promise<SubDeckStorageSchema> {
    if (!this.isContextValid()) {
      return structuredClone(DEFAULT_STORAGE);
    }
    try {
      const shared = await chrome.storage.local.get(['version', 'settings']);
      const own = account ? await accountStore(account).get(ACCOUNT_DATA_KEYS) : {};
      return normalizeState({ ...shared, ...own }).data;
    } catch (err: any) {
      if (err?.message?.includes('Extension context invalidated')) {
        return structuredClone(DEFAULT_STORAGE);
      }
      throw err;
    }
  }

  /**
   * Routes a storage mutation through the service worker's queue. Callers send intents
   * (what to change), never snapshots of state they read earlier.
   * Throws if the worker cannot be reached; there is deliberately no unserialized fallback.
   */
  static async requestMutation(action: string, payload?: unknown): Promise<any> {
    if (this.isServiceWorker()) {
      return enqueueMutation(action, payload, this.account);
    }
    if (!this.isContextValid()) return null;

    let lastError = 'no response';
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await new Promise<{ success?: boolean; result?: any; error?: string; transport?: boolean }>((resolve) => {
        try {
          chrome.runtime.sendMessage({ type: 'subshelf-storage-mutate', action, payload, account: this.account }, (r) => {
            const err = chrome.runtime?.lastError;
            resolve(err ? { transport: true, error: err.message } : (r ?? { transport: true, error: 'empty response' }));
          });
        } catch (e) {
          resolve({ transport: true, error: e instanceof Error ? e.message : String(e) });
        }
      });

      if (res.success) return res.result;
      lastError = res.error || lastError;
      if (!res.transport || !this.isContextValid()) break; // the mutation itself failed: retrying won't help
      await new Promise(r => setTimeout(r, 150 * 2 ** attempt)); // worker may still be starting
    }

    Logger.warn('[SubShelf] Storage mutation failed', action, lastError);
    throw new Error(`Storage update failed (${action}): ${lastError}`);
  }

  /**
   * Executes one mutation directly against chrome.storage.local.
   * Must only run inside the queue (via enqueueMutation) and must never call requestMutation.
   */
  static async executeMutation(action: string, payload?: any, account?: string | null): Promise<any> {
    if (!this.isContextValid()) return null;
    if (SHARED_MUTATIONS.has(action)) return this.executeSharedMutation(action, payload);

    // Throws without a valid account: nothing may be written for "no account"
    const store = accountStore(account as string);

    switch (action) {
      case 'setChannelCategory': {
        const { ucId, newCatId } = payload;
        const raw = await store.get(['categories', 'manualAssignments', 'channelExclusions', 'handleToUcId', 'channels']);
        const categories: CategoryDeck[] = Array.isArray(raw.categories) ? raw.categories : [];
        const manualAssignments: Record<string, string[]> = raw.manualAssignments || {};
        const channelExclusions: Record<string, string[]> = raw.channelExclusions || {};
        const handleToUcId: Record<string, string> = raw.handleToUcId || {};
        const channels: Record<string, SubscribedChannel> = raw.channels || {};

        const targetIds = channelAliases(ucId, channels, handleToUcId);

        const prevCategoryIds: string[] = [];
        categories.forEach(cat => {
          if (cat.channelIds.some(id => targetIds.has(id))) {
            prevCategoryIds.push(cat.id);
            cat.channelIds = cat.channelIds.filter(id => !targetIds.has(id));
          }
        });

        targetIds.forEach(id => {
          if (!channelExclusions[id]) {
            channelExclusions[id] = [];
          }
          prevCategoryIds.forEach(prevId => {
            if (prevId !== newCatId && prevId !== '__uncategorized__' && !channelExclusions[id].includes(prevId)) {
              channelExclusions[id].push(prevId);
            }
          });
          if (newCatId) {
            channelExclusions[id] = channelExclusions[id].filter(cId => cId !== newCatId);
            if (channelExclusions[id].length === 0) {
              delete channelExclusions[id];
            }
          }
          // "No folder" sticks: Auto-sort keeps the channel out of every folder until it is placed again
          if (!newCatId || newCatId === '__uncategorized__' || newCatId === 'none') {
            manualAssignments[id] = [NO_FOLDER];
          }
        });

        if (newCatId && newCatId !== '__uncategorized__' && newCatId !== 'none') {
          const target = categories.find(c => c.id === newCatId);
          if (target) {
            if (!target.channelIds.includes(ucId)) {
              target.channelIds.push(ucId);
            }
            manualAssignments[ucId] = [newCatId];
          } else {
            delete manualAssignments[ucId];
          }
        }

        await store.set({ categories, manualAssignments, channelExclusions });
        return { categories, manualAssignments, channelExclusions };
      }

      case 'addChannelToCategory': {
        const { ucId, categoryId } = payload;
        const raw = await store.get(['categories', 'manualAssignments', 'channelExclusions', 'handleToUcId', 'channels']);
        const categories: CategoryDeck[] = Array.isArray(raw.categories) ? raw.categories : [];
        const manualAssignments: Record<string, string[]> = raw.manualAssignments || {};
        const channelExclusions: Record<string, string[]> = raw.channelExclusions || {};
        const handleToUcId: Record<string, string> = raw.handleToUcId || {};
        const channels: Record<string, SubscribedChannel> = raw.channels || {};

        const targetIds = channelAliases(ucId, channels, handleToUcId);

        const category = categories.find(c => c.id === categoryId);
        if (category) {
          // Remove any legacy aliases first to avoid duplicate entries
          category.channelIds = category.channelIds.filter(id => !targetIds.has(id));
          category.channelIds.push(ucId);

          targetIds.forEach(id => {
            if (channelExclusions[id]) {
              channelExclusions[id] = channelExclusions[id].filter(cId => cId !== categoryId);
              if (channelExclusions[id].length === 0) delete channelExclusions[id];
            }
            manualAssignments[id] = (manualAssignments[id] ?? []).filter(cId => cId !== NO_FOLDER);
            if (!manualAssignments[id].includes(categoryId)) manualAssignments[id].push(categoryId);
          });

          await store.set({ categories, manualAssignments, channelExclusions });
        }
        return { categories, manualAssignments, channelExclusions };
      }

      case 'removeChannelFromCategory': {
        const { ucId, categoryId } = payload;
        const raw = await store.get(['categories', 'manualAssignments', 'channelExclusions', 'handleToUcId', 'channels']);
        const categories: CategoryDeck[] = Array.isArray(raw.categories) ? raw.categories : [];
        const manualAssignments: Record<string, string[]> = raw.manualAssignments || {};
        const channelExclusions: Record<string, string[]> = raw.channelExclusions || {};
        const handleToUcId: Record<string, string> = raw.handleToUcId || {};
        const channels: Record<string, SubscribedChannel> = raw.channels || {};

        const targetIds = channelAliases(ucId, channels, handleToUcId);

        const category = categories.find(c => c.id === categoryId);
        if (category) {
          category.channelIds = category.channelIds.filter(id => !targetIds.has(id));
          targetIds.forEach(id => {
            if (!channelExclusions[id]) channelExclusions[id] = [];
            if (!channelExclusions[id].includes(categoryId)) channelExclusions[id].push(categoryId);
            if (manualAssignments[id]) {
              manualAssignments[id] = manualAssignments[id].filter(cat => cat !== categoryId);
              if (manualAssignments[id].length === 0) delete manualAssignments[id];
            }
          });
          await store.set({ categories, manualAssignments, channelExclusions });
        }
        return { categories, manualAssignments, channelExclusions };
      }

      case 'deleteCategory': {
        const { categoryId } = payload;
        const raw = await store.get(['categories', 'manualAssignments', 'activeCategoryId']);
        const categories: CategoryDeck[] = Array.isArray(raw.categories)
          ? raw.categories.filter((c: CategoryDeck) => c.id !== categoryId && c.id !== '__uncategorized__')
          : [];
        const manualAssignments: Record<string, string[]> = raw.manualAssignments || {};
        for (const [id, cats] of Object.entries(manualAssignments)) {
          manualAssignments[id] = cats.filter(c => c !== categoryId);
          if (manualAssignments[id].length === 0) delete manualAssignments[id];
        }
        const activeCategoryId = raw.activeCategoryId === categoryId ? null : raw.activeCategoryId;
        await store.set({ categories, manualAssignments, activeCategoryId });
        return { categories, manualAssignments, activeCategoryId };
      }

      case 'createCategory': {
        const { category } = payload;
        const raw = await store.get('categories');
        const categories: CategoryDeck[] = Array.isArray(raw.categories) ? raw.categories : [];
        if (!categories.find(c => c.id === category.id)) {
          categories.push(category);
          await store.set({ categories });
        }
        return { categories };
      }


      case 'updateCategory': {
        const { categoryId, patch } = payload || {};
        const raw = await store.get('categories');
        const categories: CategoryDeck[] = Array.isArray(raw.categories) ? raw.categories : [];
        const target = categories.find(c => c.id === categoryId);
        if (!target || !patch || typeof patch !== 'object') return { categories };
        if (typeof patch.name === 'string' && patch.name.trim()) target.name = patch.name.trim().slice(0, 100);
        if (typeof patch.icon === 'string' && patch.icon.trim()) target.icon = patch.icon.trim().slice(0, 10);
        if (typeof patch.isCollapsed === 'boolean') target.isCollapsed = patch.isCollapsed;
        if (typeof patch.sortOrder === 'number' && Number.isFinite(patch.sortOrder)) target.sortOrder = patch.sortOrder;
        await store.set({ categories });
        return { categories };
      }

      case 'reorderCategories': {
        // Folders in `ids` come first, in that order; any others keep their relative order after them
        const ids: unknown[] = Array.isArray(payload?.ids) ? payload.ids : [];
        const raw = await store.get('categories');
        const categories: CategoryDeck[] = Array.isArray(raw.categories) ? raw.categories : [];
        const rank = new Map<string, number>();
        ids.forEach((id, i) => {
          if (typeof id === 'string' && !rank.has(id)) rank.set(id, i);
        });
        const ordered = [...categories].sort((a, b) =>
          (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );
        ordered.forEach((c, i) => { c.sortOrder = i; });
        await store.set({ categories });
        return { categories };
      }

      case 'applyGeneratedDecks': {
        const decks: CategoryDeck[] = Array.isArray(payload?.decks) ? payload.decks : [];
        const raw = await store.get(['categories', 'manualAssignments', 'channelExclusions', 'channels']);
        const categories = applyOverrides(
          decks,
          Array.isArray(raw.categories) ? raw.categories : [],
          raw.manualAssignments || {},
          raw.channelExclusions || {},
          Object.values((raw.channels || {}) as Record<string, SubscribedChannel>)
        ).filter(c => c.id !== '__uncategorized__');
        await store.set({ categories });
        return { categories };
      }

      case 'clearOverrides': {
        await store.set({ channelExclusions: {}, manualAssignments: {} });
        return {};
      }

      case 'removeChannel': {
        const { ucId } = payload;
        const raw = await store.get(['channels', 'handleToUcId', 'channelExclusions', 'manualAssignments', 'categories']);
        const channels = raw.channels || {};
        const handleToUcId = raw.handleToUcId || {};
        const channelExclusions = raw.channelExclusions || {};
        const manualAssignments = raw.manualAssignments || {};
        const categories: CategoryDeck[] = Array.isArray(raw.categories) ? raw.categories : [];

        const channel = channels[ucId];
        if (channel) {
          delete handleToUcId[channel.handle];
          delete channels[ucId];
          if (channelExclusions[ucId]) delete channelExclusions[ucId];
          if (manualAssignments[ucId]) delete manualAssignments[ucId];

          categories.forEach(cat => {
            cat.channelIds = cat.channelIds.filter(id => id !== ucId);
          });

          await store.set({
            channels,
            handleToUcId,
            channelExclusions,
            manualAssignments,
            categories,
          });
        }
        return { channels, handleToUcId, channelExclusions, manualAssignments, categories };
      }

      case 'syncObservation': {
        const discovered: SubscribedChannel[] = (Array.isArray(payload?.discovered) ? payload.discovered : [])
          .filter((c: any) => c && typeof c === 'object' && typeof c.ucId === 'string' && c.ucId && typeof c.title === 'string');
        const raw = await store.get(SYNC_SNAPSHOT_KEYS);
        const legacy = await chrome.storage.local.get('categories');
        const now = Date.now();
        const fullList = payload?.fullList === true;
        const result = computeSync(readSyncSnapshot(raw), {
          discovered,
          sidebarComplete: payload?.sidebarComplete === true,
          fullList,
          observedAt: typeof payload?.observedAt === 'number' ? payload.observedAt : undefined,
          now,
          placeNew: learnedPlacer(raw),
          knownFolders: knownFoldersFrom(legacy.categories),
        });
        if (result.removalSkipped) {
          Logger.warn('[SubShelf] Skipped unsubscribe reconciliation:', result.removalSkipped);
        }
        if (result.changed) await writeSyncSnapshot(store, result.next, { lastScrapedAt: now });
        if (fullList) await store.set({ [ALL_SUBSCRIPTIONS_CHECKED_KEY]: now });
        return { changed: result.changed, added: result.added, removed: result.removed, restored: result.restored };
      }

      case 'subscriptionChanged': {
        // YouTube confirmed a subscribe/unsubscribe click on the page (exact channel ID)
        const ucId = typeof payload?.ucId === 'string' ? payload.ucId : '';
        if (!isChannelId(ucId)) return { changed: false };
        const raw = await store.get(SYNC_SNAPSHOT_KEYS);
        const prev = readSyncSnapshot(raw);
        const next = payload?.subscribed === true
          ? applyResubscribe(prev, ucId, Date.now(), learnedPlacer(raw))
          : applyUnsubscribe(prev, ucId, Date.now());
        if (!next) return { changed: false };
        await writeSyncSnapshot(store, next);
        return { changed: true };
      }

      case 'mergeAvatars': {
        const avatars = sanitizeAvatarMap(payload?.avatars);
        if (avatars.size === 0) return { changed: false };
        const raw = await store.get(['channels', 'handleToUcId']);
        const channels: Record<string, SubscribedChannel> = raw.channels || {};
        const handleToUcId: Record<string, string> = raw.handleToUcId || {};
        let changed = false;
        for (const [key, url] of avatars) {
          const ucId = key.startsWith('UC') ? key : handleToUcId[key] || handleToUcId['@' + key];
          const ch = ucId ? channels[ucId] : undefined;
          if (ch && ch.avatarUrl !== url) {
            channels[ucId] = { ...ch, avatarUrl: url };
            changed = true;
          }
        }
        if (changed) await store.set({ channels });
        return { changed };
      }

      case 'mergeChannelDetails': {
        const descriptions = sanitizeDescriptionMap(payload?.descriptions);
        const raw = await store.get(['channels', 'handleToUcId']);
        const channels: Record<string, SubscribedChannel> = raw.channels || {};
        const handleToUcId: Record<string, string> = raw.handleToUcId || {};
        let updated = 0;
        for (const [key, description] of descriptions) {
          const ucId = resolveChannelId(key, handleToUcId);
          const ch = isChannelId(ucId) ? channels[ucId] : undefined;
          if (ch && ch.description !== description) {
            channels[ucId] = { ...ch, description };
            updated++;
          }
        }
        // The check time is recorded even when nothing changed, so channels the page doesn't
        // list aren't looked up again on every YouTube visit
        await store.set({
          ...(updated > 0 ? { channels } : {}),
          [CHANNEL_DETAILS_CHECKED_KEY]: Date.now(),
        });
        return { changed: updated > 0, updated };
      }

      case 'importMerge': {
        const inc = payload || {};
        const incCategories: CategoryDeck[] = Array.isArray(inc.categories) ? inc.categories : [];
        const raw = await store.get(['categories', 'channels', 'handleToUcId', 'channelExclusions', 'manualAssignments']);

        const mergeLists = (a: Record<string, string[]> = {}, b: Record<string, string[]> = {}) => {
          const out: Record<string, string[]> = { ...a };
          for (const [k, v] of Object.entries(b)) {
            if (!Array.isArray(v)) continue;
            out[k] = [...new Set([...(out[k] ?? []), ...v])].slice(0, 100);
          }
          return out;
        };

        const merged = mergeFolders(Array.isArray(raw.categories) ? raw.categories : [], incCategories);
        // Corrections name folders by ID, and a folder matched by name has a different one here
        const remapFolders = (lists: Record<string, string[]> = {}) => Object.fromEntries(
          Object.entries(lists).map(([k, v]) => [k, Array.isArray(v) ? v.map(id => merged.remap[id] ?? id) : v])
        );

        // Normalize the merged result so imported handle-keyed duplicates or system channels never
        // reach storage (the same guarantee sync and the startup cleanup give)
        const { data: next } = normalizeState({
          categories: merged.categories,
          channels: { ...(raw.channels ?? {}), ...(inc.channels ?? {}) },
          handleToUcId: { ...(raw.handleToUcId ?? {}), ...(inc.handleToUcId ?? {}) },
          channelExclusions: mergeLists(raw.channelExclusions, remapFolders(inc.channelExclusions)),
          manualAssignments: mergeLists(raw.manualAssignments, remapFolders(inc.manualAssignments)),
        });
        await store.set({
          categories: next.categories,
          channels: next.channels,
          handleToUcId: next.handleToUcId,
          channelExclusions: next.channelExclusions,
          manualAssignments: next.manualAssignments,
        });
        return { added: merged.added, combined: merged.combined, kept: merged.kept };
      }

      case 'importReplace': {
        const inc = payload || {};
        const raw = await store.get(['channels', 'handleToUcId', 'activeCategoryId']);
        // Folders and corrections come from the file; which channels exist is still YouTube's to say
        const { data: next } = normalizeState({
          categories: Array.isArray(inc.categories) ? inc.categories : [],
          channels: { ...(raw.channels ?? {}), ...(inc.channels ?? {}) },
          handleToUcId: { ...(raw.handleToUcId ?? {}), ...(inc.handleToUcId ?? {}) },
          channelExclusions: inc.channelExclusions ?? {},
          manualAssignments: inc.manualAssignments ?? {},
        });
        await store.set({
          categories: next.categories,
          channels: next.channels,
          handleToUcId: next.handleToUcId,
          channelExclusions: next.channelExclusions,
          manualAssignments: next.manualAssignments,
          activeCategoryId: next.categories.some(c => c.id === raw.activeCategoryId) ? raw.activeCategoryId : null,
        });
        return { folders: next.categories.length };
      }

      case 'claimAccount': {
        const shared = await chrome.storage.local.get([ACCOUNTS_KEY, LAST_ACCOUNT_KEY]);
        const accounts = asRecord<number>(shared[ACCOUNTS_KEY]);
        const isNew = !accounts[account as string];
        if (isNew) {
          // 1.3.2 kept one set of folders for every account and its keys stay as they are. Which
          // account opens first is chance, and that data may be a mix of accounts, so the first gets
          // it all (nothing changes for people with one account) and later ones start from its
          // folders; syncObservation then puts their channels back where it had them.
          const legacy = await chrome.storage.local.get(ACCOUNT_DATA_KEYS);
          const first = Object.keys(accounts).length === 0;
          await store.set(first ? legacy : {
            categories: (Array.isArray(legacy.categories) ? legacy.categories : []).map((c: CategoryDeck) => ({ ...c, channelIds: [] })),
            handleToUcId: legacy.handleToUcId ?? {},
            channelExclusions: legacy.channelExclusions ?? {},
            manualAssignments: legacy.manualAssignments ?? {},
          });
          accounts[account as string] = Date.now();
        }
        if (isNew || shared[LAST_ACCOUNT_KEY] !== account) {
          await chrome.storage.local.set({ [ACCOUNTS_KEY]: accounts, [LAST_ACCOUNT_KEY]: account });
        }
        return { isNew };
      }

      case 'normalize': {
        const raw = await store.get(ACCOUNT_DATA_KEYS);
        if (Object.keys(raw).length === 0) return { dirty: false };
        const { data, dirty } = normalizeState(raw);
        if (dirty) {
          await store.set({
            channels: data.channels,
            categories: data.categories,
            handleToUcId: data.handleToUcId,
            manualAssignments: data.manualAssignments,
            channelExclusions: data.channelExclusions,
          });
        }
        return { dirty };
      }

      default:
        return null;
    }
  }

  private static async executeSharedMutation(action: string, payload?: any): Promise<any> {
    switch (action) {
      case 'updateSettings': {
        const partial = { ...(payload || {}) };
        delete partial.apiKey;
        const raw = await chrome.storage.local.get('settings');
        const settings = { ...DEFAULT_STORAGE.settings, ...(raw.settings || {}), ...partial };
        delete settings.apiKey;
        await chrome.storage.local.set({ settings });
        return { settings };
      }

      case 'ratePromptEvent': {
        const raw = await chrome.storage.local.get(RATE_PROMPT_KEY);
        const next = applyRatePromptEvent(normalizeRatePrompt(raw[RATE_PROMPT_KEY]), payload?.event as RatePromptEvent, Date.now());
        if (next) await chrome.storage.local.set({ [RATE_PROMPT_KEY]: next });
        return { changed: Boolean(next) };
      }

      default:
        return null;
    }
  }

  static async getRatePrompt(): Promise<RatePromptState> {
    if (!this.isContextValid()) return normalizeRatePrompt(null);
    const raw = await chrome.storage.local.get(RATE_PROMPT_KEY);
    return normalizeRatePrompt(raw[RATE_PROMPT_KEY]);
  }

  static async ratePromptEvent(event: RatePromptEvent): Promise<void> {
    await this.requestMutation('ratePromptEvent', { event });
  }

  static async getChannels(account: string | null = this.account): Promise<Record<string, SubscribedChannel>> {
    if (!this.isContextValid()) return structuredClone(DEFAULT_STORAGE.channels);
    const data = account ? await accountStore(account).get('channels') : {};
    return (data.channels && typeof data.channels === 'object') ? data.channels : {};
  }

  static async removeChannel(ucId: string): Promise<void> {
    await this.requestMutation('removeChannel', { ucId });
  }

  /** Reports what the page shows; the service worker reconciles it against fresh storage. */
  static async syncObservation(
    discovered: SubscribedChannel[],
    sidebarComplete: boolean,
    options: { fullList?: boolean; observedAt?: number } = {}
  ): Promise<{ changed: boolean; added: string[]; removed: string[]; restored: string[] } | null> {
    return this.requestMutation('syncObservation', { discovered, sidebarComplete, fullList: options.fullList === true, observedAt: options.observedAt });
  }

  /** YouTube confirmed the user subscribed to / unsubscribed from a channel. Returns whether storage changed. */
  static async subscriptionChanged(ucId: string, subscribed: boolean): Promise<boolean> {
    const res = await this.requestMutation('subscriptionChanged', { ucId, subscribed });
    return Boolean(res?.changed);
  }

  static async getAllSubscriptionsCheckedAt(): Promise<number> {
    if (!this.isContextValid()) return 0;
    const raw = await this.own(ALL_SUBSCRIPTIONS_CHECKED_KEY);
    return typeof raw[ALL_SUBSCRIPTIONS_CHECKED_KEY] === 'number' ? raw[ALL_SUBSCRIPTIONS_CHECKED_KEY] : 0;
  }

  static async mergeAvatars(avatars: Record<string, string>): Promise<{ changed: boolean } | null> {
    return this.requestMutation('mergeAvatars', { avatars });
  }

  /** Stores channel descriptions read from YouTube's All subscriptions page, keyed by UC ID or handle. */
  static async mergeChannelDetails(descriptions: Record<string, string>): Promise<{ changed: boolean; updated: number } | null> {
    return this.requestMutation('mergeChannelDetails', { descriptions });
  }

  /** When channel details were last read from YouTube (0 if never). */
  static async getChannelDetailsCheckedAt(): Promise<number> {
    if (!this.isContextValid()) return 0;
    const data = await this.own(CHANNEL_DETAILS_CHECKED_KEY);
    const at = data[CHANNEL_DETAILS_CHECKED_KEY];
    return typeof at === 'number' && Number.isFinite(at) ? at : 0;
  }

  static async getCategories(): Promise<CategoryDeck[]> {
    if (!this.isContextValid()) return [];
    const data = await this.own('categories');
    const cats = Array.isArray(data.categories) ? data.categories : [];
    return cats
      .filter((c: any) => c && typeof c === 'object' && c.id && c.id !== '__uncategorized__')
      .map((c: any) => ({
        ...c,
        channelIds: Array.isArray(c.channelIds) ? c.channelIds : [],
      }));
  }

  static async addChannelToCategory(ucId: string, categoryId: string): Promise<void> {
    await this.requestMutation('addChannelToCategory', { ucId, categoryId });
  }

  static async removeChannelFromCategory(ucId: string, categoryId: string): Promise<void> {
    await this.requestMutation('removeChannelFromCategory', { ucId, categoryId });
  }

  static async setChannelCategory(ucId: string, newCatId: string): Promise<void> {
    await this.requestMutation('setChannelCategory', { ucId, newCatId });
  }

  static async deleteCategory(categoryId: string): Promise<void> {
    await this.requestMutation('deleteCategory', { categoryId });
  }

  static async createCategory(category: CategoryDeck): Promise<void> {
    await this.requestMutation('createCategory', { category });
  }

  /** Patches one folder in place (name, icon, collapsed state, order). */
  static async updateCategory(
    categoryId: string,
    patch: Partial<Pick<CategoryDeck, 'name' | 'icon' | 'isCollapsed' | 'sortOrder'>>
  ): Promise<void> {
    await this.requestMutation('updateCategory', { categoryId, patch });
  }

  /** Puts the folders in this order (sidebar drag or Move up/down). */
  static async reorderCategories(ids: string[]): Promise<void> {
    await this.requestMutation('reorderCategories', { ids });
  }

  /** Merges AI/heuristic output with the user's overrides against fresh storage inside the queue. */
  static async applyGeneratedDecks(decks: CategoryDeck[]): Promise<CategoryDeck[]> {
    const res = await this.requestMutation('applyGeneratedDecks', { decks });
    return res?.categories ?? [];
  }

  static async clearOverrides(): Promise<void> {
    await this.requestMutation('clearOverrides');
  }

  static async getHandleToUcIdMap(): Promise<Record<string, string>> {
    if (!this.isContextValid()) return {};
    const data = await this.own('handleToUcId');
    return (data.handleToUcId && typeof data.handleToUcId === 'object') ? data.handleToUcId : {};
  }

  static async getSettings(): Promise<SubDeckStorageSchema['settings']> {
    if (!this.isContextValid()) return structuredClone(DEFAULT_STORAGE.settings);
    const data = await chrome.storage.local.get('settings');
    return data.settings ? { ...DEFAULT_STORAGE.settings, ...data.settings } : structuredClone(DEFAULT_STORAGE.settings);
  }

  static async updateSettings(partial: Partial<SubDeckStorageSchema['settings']>): Promise<void> {
    await this.requestMutation('updateSettings', partial);
  }

  /**
   * Retrieves the Gemini API key. Only the service worker and extension pages call this.
   */
  static async getApiKey(): Promise<string | undefined> {
    if (!this.isContextValid() || this.isContentScript()) {
      return undefined;
    }
    try {
      const res = await chrome.storage.local.get([API_KEY_FIELD, 'subshelf_gemini_api_key']);
      return res[API_KEY_FIELD] || res['subshelf_gemini_api_key'] || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Saves or removes the Gemini API key. Only the service worker and extension pages call this.
   */
  static async setApiKey(apiKey: string): Promise<void> {
    if (!this.isContextValid() || this.isContentScript()) {
      return;
    }
    try {
      const trimmed = apiKey ? apiKey.trim() : '';
      if (!trimmed) {
        await chrome.storage.local.remove([API_KEY_FIELD, 'subshelf_gemini_api_key']);
      } else {
        await chrome.storage.local.set({ [API_KEY_FIELD]: trimmed });
        await chrome.storage.local.remove('subshelf_gemini_api_key');
      }
    } catch {
      // Ignore if context is invalidated
    }
  }
}

