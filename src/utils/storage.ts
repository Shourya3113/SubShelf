import { SubDeckStorageSchema, DEFAULT_STORAGE, SubscribedChannel, CategoryDeck, CURRENT_SCHEMA_VERSION, API_KEY_FIELD } from '@/types';
import { Logger } from './logger';
import { isSystemChannelOrCurator } from './systemChannels';

export const SUBSHELF_SECURE_API_KEY = API_KEY_FIELD;
export { API_KEY_FIELD };

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

  static async getAll(): Promise<SubDeckStorageSchema> {
    if (!this.isContextValid()) {
      return structuredClone(DEFAULT_STORAGE);
    }
    try {
      const data = await chrome.storage.local.get(Object.keys(DEFAULT_STORAGE));
      if (!data || Object.keys(data).length === 0) {
        if (!this.isContextValid()) return structuredClone(DEFAULT_STORAGE);
        const defaults = structuredClone(DEFAULT_STORAGE);
        await chrome.storage.local.set(defaults);
        return defaults;
      }
      if (typeof data.version !== 'number') {
        data.version = CURRENT_SCHEMA_VERSION;
      }

      // Security: Migrate legacy apiKey out of settings into isolated dedicated storage
      if (data.settings && 'apiKey' in data.settings) {
        if (typeof data.settings.apiKey === 'string' && data.settings.apiKey.length > 0 && !this.isContentScript()) {
          const legacyKey = data.settings.apiKey;
          delete data.settings.apiKey;
          chrome.storage.local.set({
            [API_KEY_FIELD]: legacyKey,
            settings: data.settings,
          }).catch(() => {});
        } else {
          delete data.settings.apiKey;
        }
      }

      // Security: Strip internal dedicated keys and any apiKey from the returned state
      delete (data as any)[API_KEY_FIELD];
      delete (data as any)['subshelf_gemini_api_key'];
      if (data.settings) {
        delete data.settings.apiKey;
      }

      // Backward compatibility & fresh-install safety: guarantee all fields exist
      if (!Array.isArray(data.categories)) data.categories = [];
      if (!data.channels || typeof data.channels !== 'object') data.channels = {};
      if (!data.handleToUcId || typeof data.handleToUcId !== 'object') data.handleToUcId = {};
      if (!data.channelExclusions || typeof data.channelExclusions !== 'object') data.channelExclusions = {};
      if (!data.manualAssignments || typeof data.manualAssignments !== 'object') data.manualAssignments = {};
      if (!data.settings || typeof data.settings !== 'object') {
        data.settings = structuredClone(DEFAULT_STORAGE.settings);
      } else {
        data.settings = { ...DEFAULT_STORAGE.settings, ...data.settings };
      }
      if (typeof data.lastScrapedAt !== 'number') data.lastScrapedAt = 0;
      if (typeof data.activeCategoryId !== 'string' && data.activeCategoryId !== null) {
        data.activeCategoryId = null;
      }

      // Deduplicate and canonicalize channels in storage (merge handle aliases with real UC IDs)
      let storageDirty = false;
      const cleanHandleMap: Record<string, string> = { ...(data.handleToUcId || {}) };

      // Index all channels with canonical UC IDs (ignoring system curators)
      for (const ch of Object.values(data.channels as Record<string, SubscribedChannel>)) {
        if (ch && typeof ch === 'object' && !isSystemChannelOrCurator(ch) && ch.ucId?.startsWith('UC') && ch.handle) {
          const hClean = ch.handle.startsWith('@') ? ch.handle.toLowerCase() : '@' + ch.handle.toLowerCase();
          cleanHandleMap[hClean] = ch.ucId;
          cleanHandleMap[hClean.replace(/^@/, '')] = ch.ucId;
        }
      }

      // Reconcile and purge duplicate channel records AND purge system topic/feed curator records
      const aliasRemap: Record<string, string> = {};
      const canonicalChannels: Record<string, SubscribedChannel> = {};
      const purgedSystemIds = new Set<string>();

      for (const [key, ch] of Object.entries(data.channels as Record<string, SubscribedChannel>)) {
        if (!ch || typeof ch !== 'object') continue;

        // PURGE SYSTEM CURATORS (Gaming, Music, Sports, etc.)
        if (isSystemChannelOrCurator(ch) || isSystemChannelOrCurator({ ucId: key, title: ch.title, handle: ch.handle, url: ch.url })) {
          purgedSystemIds.add(key);
          if (ch.ucId) purgedSystemIds.add(ch.ucId);
          storageDirty = true;
          continue;
        }

        const hClean = ch.handle ? (ch.handle.startsWith('@') ? ch.handle.toLowerCase() : '@' + ch.handle.toLowerCase()) : '';
        const canonId = (ch.ucId?.startsWith('UC') ? ch.ucId : (cleanHandleMap[hClean] || cleanHandleMap[key.toLowerCase()] || ch.ucId))?.trim();

        if (canonId && canonId !== key && (canonId.startsWith('UC') || !key.startsWith('UC'))) {
          aliasRemap[key] = canonId;
          storageDirty = true;
          // Merge metadata
          if (canonicalChannels[canonId]) {
            canonicalChannels[canonId] = {
              ...ch,
              ...canonicalChannels[canonId],
              avatarUrl: canonicalChannels[canonId].avatarUrl || ch.avatarUrl,
            };
          } else {
            canonicalChannels[canonId] = {
              ...ch,
              ucId: canonId,
            };
          }
        } else {
          canonicalChannels[key] = ch;
        }
      }
      data.channels = canonicalChannels;

      // Clean handleToUcId map from any purged system channels
      for (const [h, targetId] of Object.entries(cleanHandleMap)) {
        if (purgedSystemIds.has(targetId) || isSystemChannelOrCurator({ handle: h, ucId: targetId })) {
          delete cleanHandleMap[h];
          storageDirty = true;
        }
      }
      data.handleToUcId = cleanHandleMap;

      // Sanitize categories: guarantee valid CategoryDeck items, remap alias channel IDs, remove system channels, and deduplicate
      data.categories = data.categories
        .filter((c: any) => c && typeof c === 'object' && c.id && c.id !== '__uncategorized__')
        .map((c: any) => {
          const rawIds = Array.isArray(c.channelIds) ? c.channelIds.filter((id: any) => typeof id === 'string') : [];
          const seenIdsInCat = new Set<string>();
          const dedupedIds: string[] = [];

          for (const rawId of rawIds) {
            const canonId = aliasRemap[rawId] || cleanHandleMap[rawId.toLowerCase()] || rawId;
            if (purgedSystemIds.has(canonId) || purgedSystemIds.has(rawId) || isSystemChannelOrCurator({ ucId: canonId })) {
              storageDirty = true;
              continue;
            }
            if (!seenIdsInCat.has(canonId)) {
              seenIdsInCat.add(canonId);
              dedupedIds.push(canonId);
            }
          }

          if (dedupedIds.length !== rawIds.length) {
            storageDirty = true;
          }

          return {
            id: String(c.id),
            name: String(c.name || 'Untitled'),
            icon: String(c.icon || '📁'),
            color: typeof c.color === 'string' ? c.color : '#3B82F6',
            channelIds: dedupedIds,
            isCollapsed: Boolean(c.isCollapsed),
            sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : 0,
            isSystem: Boolean(c.isSystem),
          };
        });

      // Purge manual assignments and exclusions for removed system topics
      if (data.manualAssignments) {
        for (const sysId of purgedSystemIds) {
          if (data.manualAssignments[sysId]) {
            delete data.manualAssignments[sysId];
            storageDirty = true;
          }
        }
      }
      if (data.channelExclusions) {
        for (const sysId of purgedSystemIds) {
          if (data.channelExclusions[sysId]) {
            delete data.channelExclusions[sysId];
            storageDirty = true;
          }
        }
      }

      // Automatically persist cleaned storage if duplicates or system channels were removed
      if (storageDirty && this.isContextValid()) {
        chrome.storage.local.set({
          channels: data.channels,
          categories: data.categories,
          handleToUcId: data.handleToUcId,
          manualAssignments: data.manualAssignments || {},
          channelExclusions: data.channelExclusions || {},
        }).catch(() => {});
      }

      return data as SubDeckStorageSchema;
    } catch (err: any) {
      if (err?.message?.includes('Extension context invalidated')) {
        return structuredClone(DEFAULT_STORAGE);
      }
      throw err;
    }
  }

  static async setAll(data: Partial<SubDeckStorageSchema>): Promise<void> {
    if (!this.isContextValid()) return;
    try {
      await chrome.storage.local.set(data);
    } catch (err: any) {
      if (err?.message?.includes('Extension context invalidated')) return;
      throw err;
    }
  }

  private static writeChain: Promise<unknown> = Promise.resolve();

  static update(
    keys: string[],
    fn: (cur: Record<string, any>) => Record<string, any> | void | Promise<Record<string, any> | void>
  ): Promise<void> {
    const run = this.writeChain.then(async () => {
      if (!this.isContextValid()) return;
      const cur = await chrome.storage.local.get(keys.length > 0 ? keys : null);
      const patch = await fn(cur);
      if (patch && typeof patch === 'object' && Object.keys(patch).length > 0) {
        await chrome.storage.local.set(patch);
      }
    });
    this.writeChain = run.catch(() => {});
    return run;
  }

  static isServiceWorker(): boolean {
    return typeof window === 'undefined' && typeof self !== 'undefined';
  }

  /**
   * Routes storage mutations through the background service worker queue when
   * invoked from content scripts or popup, eliminating cross-context race conditions.
   */
  static async requestMutation(action: string, payload?: unknown): Promise<any> {
    if (this.isServiceWorker()) {
      return this.executeMutation(action, payload);
    }

    if (this.isContextValid()) {
      try {
        const response = await new Promise<any>((resolve) => {
          chrome.runtime.sendMessage(
            { type: 'subshelf-storage-mutate', action, payload },
            (res) => {
              if (chrome.runtime?.lastError) {
                resolve(null);
              } else {
                resolve(res);
              }
            }
          );
        });
        if (response && response.success) {
          return response.result;
        }
        if (!response?.success) {
          Logger.warn('[SubShelf] SW mutation failed, writing locally', action, response?.error);
        }
      } catch (err) {
        Logger.warn('[SubShelf] SW mutation failed, writing locally', action, err);
      }
    }

    return this.executeMutation(action, payload);
  }

  /**
   * Executes atomic per-key mutations directly against chrome.storage.local.
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
        const channels: Record<string, any> = raw.channels || {};

        const targetIds = new Set<string>([ucId]);
        if (channels[ucId]?.handle) {
          targetIds.add(channels[ucId].handle);
          targetIds.add(channels[ucId].handle.replace(/^@/, ''));
          targetIds.add('@' + channels[ucId].handle.replace(/^@/, ''));
        }
        for (const [handle, targetUc] of Object.entries(handleToUcId)) {
          if (targetUc === ucId || handle === ucId) {
            targetIds.add(handle);
            targetIds.add(targetUc);
          }
        }

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
        const channels: Record<string, any> = raw.channels || {};

        const targetIds = new Set<string>([ucId]);
        if (channels[ucId]?.handle) {
          targetIds.add(channels[ucId].handle);
          targetIds.add(channels[ucId].handle.replace(/^@/, ''));
          targetIds.add('@' + channels[ucId].handle.replace(/^@/, ''));
        }
        for (const [handle, targetUc] of Object.entries(handleToUcId)) {
          if (targetUc === ucId || handle === ucId) {
            targetIds.add(handle);
            targetIds.add(targetUc);
          }
        }

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
        const channels: Record<string, any> = raw.channels || {};

        const targetIds = new Set<string>([ucId]);
        if (channels[ucId]?.handle) {
          targetIds.add(channels[ucId].handle);
          targetIds.add(channels[ucId].handle.replace(/^@/, ''));
          targetIds.add('@' + channels[ucId].handle.replace(/^@/, ''));
        }
        for (const [handle, targetUc] of Object.entries(handleToUcId)) {
          if (targetUc === ucId || handle === ucId) {
            targetIds.add(handle);
            targetIds.add(targetUc);
          }
        }

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

      case 'saveCategories': {
        const { categories } = payload;
        const cleanCategories = (categories || []).filter((c: CategoryDeck) => c.id !== '__uncategorized__');
        await chrome.storage.local.set({ categories: cleanCategories });
        return { categories: cleanCategories };
      }

      case 'clearOverrides': {
        await chrome.storage.local.set({ channelExclusions: {}, manualAssignments: {} });
        return {};
      }

      case 'addChannel': {
        const { channel } = payload;
        const raw = await chrome.storage.local.get(['channels', 'handleToUcId']);
        const channels = raw.channels || {};
        const handleToUcId = raw.handleToUcId || {};
        channels[channel.ucId] = channel;
        if (channel.handle) {
          handleToUcId[channel.handle] = channel.ucId;
        }
        await chrome.storage.local.set({ channels, handleToUcId });
        return { channels, handleToUcId };
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

      case 'syncSubscriptions': {
        const { channels, handleToUcId, categories, lastScrapedAt } = payload;
        const updates: any = {
          channels,
          handleToUcId,
          lastScrapedAt,
        };
        if (categories) {
          updates.categories = (categories as CategoryDeck[]).filter((c: CategoryDeck) => c.id !== '__uncategorized__');
        }
        await chrome.storage.local.set(updates);
        return updates;
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

  static async addChannel(channel: SubscribedChannel): Promise<void> {
    await this.requestMutation('addChannel', { channel });
  }

  static async removeChannel(ucId: string): Promise<void> {
    await this.requestMutation('removeChannel', { ucId });
  }

  static async syncSubscriptions(payload: {
    channels: Record<string, SubscribedChannel>;
    handleToUcId: Record<string, string>;
    categories?: CategoryDeck[];
    lastScrapedAt: number;
  }): Promise<void> {
    await this.requestMutation('syncSubscriptions', payload);
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

  static async saveCategories(categories: CategoryDeck[]): Promise<void> {
    await this.requestMutation('saveCategories', { categories });
  }

  static async clearOverrides(): Promise<void> {
    await this.requestMutation('clearOverrides');
  }

  static async getHandleToUcIdMap(): Promise<Record<string, string>> {
    if (!this.isContextValid()) return {};
    const data = await chrome.storage.local.get('handleToUcId');
    return (data.handleToUcId && typeof data.handleToUcId === 'object') ? data.handleToUcId : {};
  }

  static async setActiveCategoryId(id: string | null): Promise<void> {
    if (!this.isContextValid()) return;
    await chrome.storage.local.set({ activeCategoryId: id });
  }

  static async getSettings(): Promise<SubDeckStorageSchema['settings']> {
    if (!this.isContextValid()) return structuredClone(DEFAULT_STORAGE.settings);
    const data = await chrome.storage.local.get('settings');
    return data.settings ? { ...DEFAULT_STORAGE.settings, ...data.settings } : structuredClone(DEFAULT_STORAGE.settings);
  }

  static async updateSettings(partial: Partial<SubDeckStorageSchema['settings']>): Promise<void> {
    if (!this.isContextValid()) return;
    const data = await chrome.storage.local.get('settings');
    const current = data.settings || structuredClone(DEFAULT_STORAGE.settings);
    const sanitizedPartial = { ...partial };
    delete sanitizedPartial.apiKey;
    const settings = { ...current, ...sanitizedPartial };
    await chrome.storage.local.set({ settings });
  }

  /**
   * Securely retrieves the Gemini API key from isolated storage.
   * Direct access is strictly blocked from YouTube content scripts.
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
   * Securely saves or removes the Gemini API key in isolated storage.
   * Modification is strictly blocked from YouTube content scripts.
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

export const Storage = SubDeckStorage;
