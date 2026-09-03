import { SubDeckStorageSchema, DEFAULT_STORAGE, SubscribedChannel, CategoryDeck } from '@/types';

export class SubDeckStorage {
  static async getAll(): Promise<SubDeckStorageSchema> {
    const data = await chrome.storage.local.get(null);
    if (!data.version) {
      await chrome.storage.local.set(DEFAULT_STORAGE);
      return DEFAULT_STORAGE;
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
      await this.setAll({ channels: data.channels, handleToUcId: data.handleToUcId });
    }
  }

  static async getCategories(): Promise<CategoryDeck[]> {
    const data = await this.getAll();
    return data.categories;
  }

  static async addChannelToCategory(ucId: string, categoryId: string): Promise<void> {
    const data = await this.getAll();
    const category = data.categories.find(c => c.id === categoryId);
    if (category && !category.channelIds.includes(ucId)) {
      category.channelIds.push(ucId);
      await this.setAll({ categories: data.categories });
    }
  }

  static async removeChannelFromCategory(ucId: string, categoryId: string): Promise<void> {
    const data = await this.getAll();
    const category = data.categories.find(c => c.id === categoryId);
    if (category) {
      category.channelIds = category.channelIds.filter(id => id !== ucId);
      await this.setAll({ categories: data.categories });
    }
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
