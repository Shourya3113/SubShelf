import { SubDeckStorageSchema, DEFAULT_STORAGE, SubscribedChannel, CategoryDeck } from '@/types';

export const SUBSHELF_SECURE_API_KEY = 'subshelf_gemini_api_key';

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
      const data = await chrome.storage.local.get(null);
      if (!data || !data.version) {
        if (!this.isContextValid()) return structuredClone(DEFAULT_STORAGE);
        const defaults = structuredClone(DEFAULT_STORAGE);
        await chrome.storage.local.set(defaults);
        return defaults;
      }

      // Security: Migrate legacy apiKey out of settings into isolated dedicated storage
      if (data.settings && 'apiKey' in data.settings) {
        if (typeof data.settings.apiKey === 'string' && data.settings.apiKey.length > 0 && !this.isContentScript()) {
          const legacyKey = data.settings.apiKey;
          delete data.settings.apiKey;
          chrome.storage.local.set({
            [SUBSHELF_SECURE_API_KEY]: legacyKey,
            settings: data.settings,
          }).catch(() => {});
        } else {
          delete data.settings.apiKey;
        }
      }

      // Security: Strip internal dedicated keys and any apiKey from the returned state
      delete (data as any)[SUBSHELF_SECURE_API_KEY];
      if (data.settings) {
        delete data.settings.apiKey;
      }

      // Backward compatibility: ensure exclusion and manual assignment maps exist
      if (!data.channelExclusions) data.channelExclusions = {};
      if (!data.manualAssignments) data.manualAssignments = {};
      // Seamlessly purge any legacy __uncategorized__ deck from categories
      if (Array.isArray(data.categories)) {
        data.categories = data.categories.filter((c: CategoryDeck) => c.id !== '__uncategorized__');
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
      } catch {
        // Fall back to direct execution below
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
        const raw = await chrome.storage.local.get(['categories', 'manualAssignments', 'channelExclusions']);
        const categories: CategoryDeck[] = Array.isArray(raw.categories) ? raw.categories : [];
        const manualAssignments: Record<string, string[]> = raw.manualAssignments || {};
        const channelExclusions: Record<string, string[]> = raw.channelExclusions || {};

        const prevCategoryIds: string[] = [];
        categories.forEach(cat => {
          if (cat.channelIds.includes(ucId)) {
            prevCategoryIds.push(cat.id);
            cat.channelIds = cat.channelIds.filter(id => id !== ucId);
          }
        });

        if (!channelExclusions[ucId]) {
          channelExclusions[ucId] = [];
        }

        prevCategoryIds.forEach(prevId => {
          if (prevId !== newCatId && prevId !== '__uncategorized__' && !channelExclusions[ucId].includes(prevId)) {
            channelExclusions[ucId].push(prevId);
          }
        });

        if (newCatId) {
          channelExclusions[ucId] = channelExclusions[ucId].filter(id => id !== newCatId);
          if (channelExclusions[ucId].length === 0) {
            delete channelExclusions[ucId];
          }
        }

        if (!newCatId || newCatId === '__uncategorized__' || newCatId === 'none') {
          delete manualAssignments[ucId];
        } else {
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
        const raw = await chrome.storage.local.get(['categories', 'manualAssignments', 'channelExclusions']);
        const categories: CategoryDeck[] = Array.isArray(raw.categories) ? raw.categories : [];
        const manualAssignments: Record<string, string[]> = raw.manualAssignments || {};
        const channelExclusions: Record<string, string[]> = raw.channelExclusions || {};

        const category = categories.find(c => c.id === categoryId);
        if (category) {
          if (!category.channelIds.includes(ucId)) {
            category.channelIds.push(ucId);
          }
          if (channelExclusions[ucId]) {
            channelExclusions[ucId] = channelExclusions[ucId].filter(id => id !== categoryId);
            if (channelExclusions[ucId].length === 0) delete channelExclusions[ucId];
          }
          if (!manualAssignments[ucId]) manualAssignments[ucId] = [];
          if (!manualAssignments[ucId].includes(categoryId)) manualAssignments[ucId].push(categoryId);

          await chrome.storage.local.set({ categories, manualAssignments, channelExclusions });
        }
        return { categories, manualAssignments, channelExclusions };
      }

      case 'removeChannelFromCategory': {
        const { ucId, categoryId } = payload;
        const raw = await chrome.storage.local.get(['categories', 'manualAssignments', 'channelExclusions']);
        const categories: CategoryDeck[] = Array.isArray(raw.categories) ? raw.categories : [];
        const manualAssignments: Record<string, string[]> = raw.manualAssignments || {};
        const channelExclusions: Record<string, string[]> = raw.channelExclusions || {};

        const category = categories.find(c => c.id === categoryId);
        if (category) {
          category.channelIds = category.channelIds.filter(id => id !== ucId);
          if (!channelExclusions[ucId]) channelExclusions[ucId] = [];
          if (!channelExclusions[ucId].includes(categoryId)) channelExclusions[ucId].push(categoryId);
          if (manualAssignments[ucId]) {
            manualAssignments[ucId] = manualAssignments[ucId].filter(id => id !== categoryId);
            if (manualAssignments[ucId].length === 0) delete manualAssignments[ucId];
          }
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
    return data.channels || {};
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
    return cats.filter((c: CategoryDeck) => c.id !== '__uncategorized__');
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
    return data.handleToUcId || {};
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
      const res = await chrome.storage.local.get(SUBSHELF_SECURE_API_KEY);
      return res[SUBSHELF_SECURE_API_KEY] || undefined;
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
        await chrome.storage.local.remove(SUBSHELF_SECURE_API_KEY);
      } else {
        await chrome.storage.local.set({ [SUBSHELF_SECURE_API_KEY]: trimmed });
      }
    } catch {
      // Ignore if context is invalidated
    }
  }
}
