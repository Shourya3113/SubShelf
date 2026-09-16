import { SubDeckStorageSchema, DEFAULT_STORAGE, SubscribedChannel, CategoryDeck } from '@/types';

export class SubDeckStorage {
  static async getAll(): Promise<SubDeckStorageSchema> {
    const data = await chrome.storage.local.get(null);
    if (!data.version) {
      const defaults = structuredClone(DEFAULT_STORAGE);
      await chrome.storage.local.set(defaults);
      return defaults;
    }
    // Backward compatibility: ensure exclusion and manual assignment maps exist
    if (!data.channelExclusions) data.channelExclusions = {};
    if (!data.manualAssignments) data.manualAssignments = {};
    // Seamlessly purge any legacy __uncategorized__ deck from categories
    if (Array.isArray(data.categories)) {
      data.categories = data.categories.filter((c: CategoryDeck) => c.id !== '__uncategorized__');
    }
    return data as SubDeckStorageSchema;
  }

  static async setAll(data: Partial<SubDeckStorageSchema>): Promise<void> {
    await chrome.storage.local.set(data);
  }

  static async getChannels(): Promise<Record<string, SubscribedChannel>> {
    const data = await this.getAll();
    return data.channels;
  }

  static async addChannel(channel: SubscribedChannel): Promise<void> {
    const data = await this.getAll();
    data.channels[channel.ucId] = channel;
    data.handleToUcId[channel.handle] = channel.ucId;
    await this.setAll({ channels: data.channels, handleToUcId: data.handleToUcId });
  }

  static async removeChannel(ucId: string): Promise<void> {
    const data = await this.getAll();
    const channel = data.channels[ucId];
    if (channel) {
      delete data.handleToUcId[channel.handle];
      delete data.channels[ucId];
      if (data.channelExclusions[ucId]) delete data.channelExclusions[ucId];
      if (data.manualAssignments[ucId]) delete data.manualAssignments[ucId];

      // Clean up channel from all category decks
      data.categories.forEach(cat => {
        cat.channelIds = cat.channelIds.filter(id => id !== ucId);
      });

      await this.setAll({
        channels: data.channels,
        handleToUcId: data.handleToUcId,
        channelExclusions: data.channelExclusions,
        manualAssignments: data.manualAssignments,
        categories: data.categories,
      });
    }
  }

  static async getCategories(): Promise<CategoryDeck[]> {
    const data = await this.getAll();
    return data.categories;
  }

  static async addChannelToCategory(ucId: string, categoryId: string): Promise<void> {
    const data = await this.getAll();
    const category = data.categories.find(c => c.id === categoryId);
    if (!category) return;

    if (!category.channelIds.includes(ucId)) {
      category.channelIds.push(ucId);
    }

    // 1. If category was in exclusions, remove it because user explicitly added it back
    if (data.channelExclusions[ucId]) {
      data.channelExclusions[ucId] = data.channelExclusions[ucId].filter(id => id !== categoryId);
      if (data.channelExclusions[ucId].length === 0) {
        delete data.channelExclusions[ucId];
      }
    }

    // 2. Record manual assignment so Auto-AI will never move it away
    if (!data.manualAssignments[ucId]) {
      data.manualAssignments[ucId] = [];
    }
    if (!data.manualAssignments[ucId].includes(categoryId)) {
      data.manualAssignments[ucId].push(categoryId);
    }

    await this.setAll({
      categories: data.categories,
      channelExclusions: data.channelExclusions,
      manualAssignments: data.manualAssignments,
    });
  }

  static async removeChannelFromCategory(ucId: string, categoryId: string): Promise<void> {
    const data = await this.getAll();
    const category = data.categories.find(c => c.id === categoryId);
    if (category) {
      category.channelIds = category.channelIds.filter(id => id !== ucId);
    }

    // 1. Record exclusion so Auto-AI will NEVER re-add this channel to this category
    if (!data.channelExclusions[ucId]) {
      data.channelExclusions[ucId] = [];
    }
    if (!data.channelExclusions[ucId].includes(categoryId)) {
      data.channelExclusions[ucId].push(categoryId);
    }

    // 2. Remove from manual assignments if it was there
    if (data.manualAssignments[ucId]) {
      data.manualAssignments[ucId] = data.manualAssignments[ucId].filter(id => id !== categoryId);
      if (data.manualAssignments[ucId].length === 0) {
        delete data.manualAssignments[ucId];
      }
    }

    await this.setAll({
      categories: data.categories,
      channelExclusions: data.channelExclusions,
      manualAssignments: data.manualAssignments,
    });
  }

  static async setChannelCategory(ucId: string, newCatId: string): Promise<void> {
    const data = await this.getAll();

    // Track previous categories this channel was in
    const prevCategoryIds: string[] = [];
    data.categories.forEach(cat => {
      if (cat.channelIds.includes(ucId)) {
        prevCategoryIds.push(cat.id);
        cat.channelIds = cat.channelIds.filter(id => id !== ucId);
      }
    });

    if (!data.channelExclusions[ucId]) {
      data.channelExclusions[ucId] = [];
    }

    // Exclude the previous categories that the user moved it away from
    prevCategoryIds.forEach(prevId => {
      if (prevId !== newCatId && prevId !== '__uncategorized__' && !data.channelExclusions[ucId].includes(prevId)) {
        data.channelExclusions[ucId].push(prevId);
      }
    });

    // Remove newCatId from exclusions since user explicitly chose it
    if (newCatId) {
      data.channelExclusions[ucId] = data.channelExclusions[ucId].filter(id => id !== newCatId);
      if (data.channelExclusions[ucId].length === 0) {
        delete data.channelExclusions[ucId];
      }
    }

    if (!newCatId || newCatId === '__uncategorized__' || newCatId === 'none') {
      // User unassigned this channel
      delete data.manualAssignments[ucId];
    } else {
      const target = data.categories.find(c => c.id === newCatId);
      if (target) {
        if (!target.channelIds.includes(ucId)) {
          target.channelIds.push(ucId);
        }
        data.manualAssignments[ucId] = [newCatId];
      } else {
        // Target doesn't exist — keep unassigned
        delete data.manualAssignments[ucId];
      }
    }

    await this.setAll({
      categories: data.categories,
      channelExclusions: data.channelExclusions,
      manualAssignments: data.manualAssignments,
    });
  }

  static async clearOverrides(): Promise<void> {
    await this.setAll({
      channelExclusions: {},
      manualAssignments: {},
    });
  }

  static async getHandleToUcIdMap(): Promise<Record<string, string>> {
    const data = await this.getAll();
    return data.handleToUcId;
  }

  static async setActiveCategoryId(id: string | null): Promise<void> {
    await this.setAll({ activeCategoryId: id });
  }

  static async getSettings(): Promise<SubDeckStorageSchema['settings']> {
    const data = await this.getAll();
    return data.settings;
  }

  static async updateSettings(partial: Partial<SubDeckStorageSchema['settings']>): Promise<void> {
    const data = await this.getAll();
    data.settings = { ...data.settings, ...partial };
    await this.setAll({ settings: data.settings });
  }
}
