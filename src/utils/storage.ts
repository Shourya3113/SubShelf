import { SubDeckStorageSchema, DEFAULT_STORAGE, SubscribedChannel, CategoryDeck, CURRENT_SCHEMA_VERSION, API_KEY_FIELD } from '@/types';
import { Logger } from './logger';
import { isSystemChannelOrCurator } from './systemChannels';
import { computeSync, MissingRecord, SYNC_MISSING_KEY } from './syncEngine';
import { sanitizeAvatarMap } from './avatarUrl';
import { applyOverrides } from '@/ai/overrides';
import { channelAliases, isChannelId, mapHandle, resolveChannelId } from './channelIdentity';
import { CHANNEL_DETAILS_CHECKED_KEY, cleanDescription, sanitizeDescriptionMap } from './channelDetails';

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

export function enqueueMutation(action: string, payload?: unknown): Promise<any> {
  return enqueueStorageTask(() => SubDeckStorage.executeMutation(action, payload));
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

export class SubDeckStorage {
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
  static async getAll(): Promise<SubDeckStorageSchema> {
    if (!this.isContextValid()) {
      return structuredClone(DEFAULT_STORAGE);
    }
    try {
      const raw = await chrome.storage.local.get(Object.keys(DEFAULT_STORAGE));
      if (!raw || Object.keys(raw).length === 0) {
        return structuredClone(DEFAULT_STORAGE);
      }
      return normalizeState(raw).data;
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
      return enqueueMutation(action, payload);
    }
    if (!this.isContextValid()) return null;

    let lastError = 'no response';
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await new Promise<{ success?: boolean; result?: any; error?: string; transport?: boolean }>((resolve) => {
        try {
          chrome.runtime.sendMessage({ type: 'subshelf-storage-mutate', action, payload }, (r) => {
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
  static async executeMutation(action: string, payload?: any): Promise<any> {
    if (!this.isContextValid()) return null;

    switch (action) {
      case 'setChannelCategory': {
        const { ucId, newCatId } = payload;
        const raw = await chrome.storage.local.get(['categories', 'manualAssignments', 'channelExclusions', 'handleToUcId', 'channels']);
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
          if (!newCatId || newCatId === '__uncategorized__' || newCatId === 'none') {
            delete manualAssignments[id];
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

        await chrome.storage.local.set({ categories, manualAssignments, channelExclusions });
        return { categories, manualAssignments, channelExclusions };
      }

      case 'addChannelToCategory': {
        const { ucId, categoryId } = payload;
        const raw = await chrome.storage.local.get(['categories', 'manualAssignments', 'channelExclusions', 'handleToUcId', 'channels']);
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
            if (!manualAssignments[id]) manualAssignments[id] = [];
            if (!manualAssignments[id].includes(categoryId)) manualAssignments[id].push(categoryId);
          });

          await chrome.storage.local.set({ categories, manualAssignments, channelExclusions });
        }
        return { categories, manualAssignments, channelExclusions };
      }

      case 'removeChannelFromCategory': {
        const { ucId, categoryId } = payload;
        const raw = await chrome.storage.local.get(['categories', 'manualAssignments', 'channelExclusions', 'handleToUcId', 'channels']);
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
          await chrome.storage.local.set({ categories, manualAssignments, channelExclusions });
        }
        return { categories, manualAssignments, channelExclusions };
      }

      case 'deleteCategory': {
        const { categoryId } = payload;
        const raw = await chrome.storage.local.get(['categories', 'manualAssignments', 'activeCategoryId']);
        const categories: CategoryDeck[] = Array.isArray(raw.categories)
          ? raw.categories.filter((c: CategoryDeck) => c.id !== categoryId && c.id !== '__uncategorized__')
          : [];
        const manualAssignments: Record<string, string[]> = raw.manualAssignments || {};
        for (const [id, cats] of Object.entries(manualAssignments)) {
          manualAssignments[id] = cats.filter(c => c !== categoryId);
          if (manualAssignments[id].length === 0) delete manualAssignments[id];
        }
        const activeCategoryId = raw.activeCategoryId === categoryId ? null : raw.activeCategoryId;
        await chrome.storage.local.set({ categories, manualAssignments, activeCategoryId });
        return { categories, manualAssignments, activeCategoryId };
      }

      case 'createCategory': {
        const { category } = payload;
        const raw = await chrome.storage.local.get('categories');
        const categories: CategoryDeck[] = Array.isArray(raw.categories) ? raw.categories : [];
        if (!categories.find(c => c.id === category.id)) {
          categories.push(category);
          await chrome.storage.local.set({ categories });
        }
        return { categories };
      }


      case 'updateCategory': {
        const { categoryId, patch } = payload || {};
        const raw = await chrome.storage.local.get('categories');
        const categories: CategoryDeck[] = Array.isArray(raw.categories) ? raw.categories : [];
        const target = categories.find(c => c.id === categoryId);
        if (!target || !patch || typeof patch !== 'object') return { categories };
        if (typeof patch.name === 'string' && patch.name.trim()) target.name = patch.name.trim().slice(0, 100);
        if (typeof patch.icon === 'string' && patch.icon.trim()) target.icon = patch.icon.trim().slice(0, 10);
        if (typeof patch.isCollapsed === 'boolean') target.isCollapsed = patch.isCollapsed;
        if (typeof patch.sortOrder === 'number' && Number.isFinite(patch.sortOrder)) target.sortOrder = patch.sortOrder;
        await chrome.storage.local.set({ categories });
        return { categories };
      }

      case 'applyGeneratedDecks': {
        const decks: CategoryDeck[] = Array.isArray(payload?.decks) ? payload.decks : [];
        const raw = await chrome.storage.local.get(['categories', 'manualAssignments', 'channelExclusions', 'channels']);
        const categories = applyOverrides(
          decks,
          Array.isArray(raw.categories) ? raw.categories : [],
          raw.manualAssignments || {},
          raw.channelExclusions || {},
          Object.values((raw.channels || {}) as Record<string, SubscribedChannel>)
        ).filter(c => c.id !== '__uncategorized__');
        await chrome.storage.local.set({ categories });
        return { categories };
      }

      case 'clearOverrides': {
        await chrome.storage.local.set({ channelExclusions: {}, manualAssignments: {} });
        return {};
      }

      case 'removeChannel': {
        const { ucId } = payload;
        const raw = await chrome.storage.local.get(['channels', 'handleToUcId', 'channelExclusions', 'manualAssignments', 'categories']);
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

          await chrome.storage.local.set({
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
        const raw = await chrome.storage.local.get(['channels', 'categories', 'handleToUcId', SYNC_MISSING_KEY]);
        const now = Date.now();
        const result = computeSync(
          {
            channels: raw.channels && typeof raw.channels === 'object' ? raw.channels : {},
            categories: (Array.isArray(raw.categories) ? raw.categories : []).filter((c: any) => c && typeof c === 'object' && c.id),
            handleToUcId: raw.handleToUcId && typeof raw.handleToUcId === 'object' ? raw.handleToUcId : {},
            missing: (raw[SYNC_MISSING_KEY] && typeof raw[SYNC_MISSING_KEY] === 'object' ? raw[SYNC_MISSING_KEY] : {}) as Record<string, MissingRecord>,
          },
          { discovered, sidebarComplete: payload?.sidebarComplete === true, now }
        );
        if (result.removalSkipped) {
          Logger.warn('[SubShelf] Skipped unsubscribe reconciliation:', result.removalSkipped);
        }
        if (result.changed) {
          await chrome.storage.local.set({
            channels: result.next.channels,
            categories: result.next.categories,
            handleToUcId: result.next.handleToUcId,
            [SYNC_MISSING_KEY]: result.next.missing,
            lastScrapedAt: now,
          });
        }
        return { changed: result.changed, added: result.added, removed: result.removed };
      }

      case 'mergeAvatars': {
        const avatars = sanitizeAvatarMap(payload?.avatars);
        if (avatars.size === 0) return { changed: false };
        const raw = await chrome.storage.local.get(['channels', 'handleToUcId']);
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
        if (changed) await chrome.storage.local.set({ channels });
        return { changed };
      }

      case 'mergeChannelDetails': {
        const descriptions = sanitizeDescriptionMap(payload?.descriptions);
        const raw = await chrome.storage.local.get(['channels', 'handleToUcId']);
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
        await chrome.storage.local.set({
          ...(updated > 0 ? { channels } : {}),
          [CHANNEL_DETAILS_CHECKED_KEY]: Date.now(),
        });
        return { changed: updated > 0, updated };
      }

      case 'importMerge': {
        const inc = payload || {};
        const incCategories: CategoryDeck[] = Array.isArray(inc.categories) ? inc.categories : [];
        const raw = await chrome.storage.local.get(['categories', 'channels', 'handleToUcId', 'channelExclusions', 'manualAssignments']);

        const mergeLists = (a: Record<string, string[]> = {}, b: Record<string, string[]> = {}) => {
          const out: Record<string, string[]> = { ...a };
          for (const [k, v] of Object.entries(b)) {
            if (!Array.isArray(v)) continue;
            out[k] = [...new Set([...(out[k] ?? []), ...v])].slice(0, 100);
          }
          return out;
        };

        const categories: CategoryDeck[] = (Array.isArray(raw.categories) ? raw.categories : []).map((d: CategoryDeck) => {
          const match = incCategories.find(x => x.id === d.id);
          return match
            ? { ...d, channelIds: [...new Set([...d.channelIds, ...match.channelIds])].slice(0, MAX_CHANNELS_PER_CATEGORY) }
            : d;
        });
        const have = new Set(categories.map(d => d.id));
        for (const d of incCategories) {
          if (!have.has(d.id)) categories.push(d);
        }

        // Normalize the merged result so imported handle-keyed duplicates or system channels never
        // reach storage (the same guarantee sync and the startup cleanup give)
        const { data: next } = normalizeState({
          categories,
          channels: { ...(raw.channels ?? {}), ...(inc.channels ?? {}) },
          handleToUcId: { ...(raw.handleToUcId ?? {}), ...(inc.handleToUcId ?? {}) },
          channelExclusions: mergeLists(raw.channelExclusions, inc.channelExclusions),
          manualAssignments: mergeLists(raw.manualAssignments, inc.manualAssignments),
        });
        await chrome.storage.local.set({
          categories: next.categories,
          channels: next.channels,
          handleToUcId: next.handleToUcId,
          channelExclusions: next.channelExclusions,
          manualAssignments: next.manualAssignments,
        });
        return { categories: next.categories.length, channels: Object.keys(next.channels).length };
      }

      case 'updateSettings': {
        const partial = { ...(payload || {}) };
        delete partial.apiKey;
        const raw = await chrome.storage.local.get('settings');
        const settings = { ...DEFAULT_STORAGE.settings, ...(raw.settings || {}), ...partial };
        delete settings.apiKey;
        await chrome.storage.local.set({ settings });
        return { settings };
      }

      case 'normalize': {
        const raw = await chrome.storage.local.get(Object.keys(DEFAULT_STORAGE));
        if (!raw || Object.keys(raw).length === 0) return { dirty: false };
        const { data, dirty } = normalizeState(raw);
        if (dirty) {
          await chrome.storage.local.set({
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

  static async getChannels(): Promise<Record<string, SubscribedChannel>> {
    if (!this.isContextValid()) return structuredClone(DEFAULT_STORAGE.channels);
    const data = await chrome.storage.local.get('channels');
    return (data.channels && typeof data.channels === 'object') ? data.channels : {};
  }

  static async removeChannel(ucId: string): Promise<void> {
    await this.requestMutation('removeChannel', { ucId });
  }

  /** Reports what the page shows; the service worker reconciles it against fresh storage. */
  static async syncObservation(discovered: SubscribedChannel[], sidebarComplete: boolean): Promise<{ changed: boolean; added: string[]; removed: string[] } | null> {
    return this.requestMutation('syncObservation', { discovered, sidebarComplete });
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
    const data = await chrome.storage.local.get(CHANNEL_DETAILS_CHECKED_KEY);
    const at = data[CHANNEL_DETAILS_CHECKED_KEY];
    return typeof at === 'number' && Number.isFinite(at) ? at : 0;
  }

  static async getCategories(): Promise<CategoryDeck[]> {
    if (!this.isContextValid()) return [];
    const data = await chrome.storage.local.get('categories');
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
    const data = await chrome.storage.local.get('handleToUcId');
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

