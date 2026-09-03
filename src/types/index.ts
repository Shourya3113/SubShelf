export interface SubscribedChannel {
  ucId: string;
  title: string;
  handle: string;
  url: string;
  avatarUrl: string;
  categoryIds: string[];
  discoveredAt: number;
}

export interface CategoryDeck {
  id: string;
  name: string;
  icon: string;
  color?: string;
  channelIds: string[];
  isCollapsed: boolean;
  sortOrder: number;
  isSystem?: boolean;
}

export interface SubDeckStorageSchema {
  version: number;
  categories: CategoryDeck[];
  channels: Record<string, SubscribedChannel>;
  activeCategoryId: string | null;
  handleToUcId: Record<string, string>;
  settings: {
    aiProvider: 'gemini-nano' | 'gemini-api' | 'openai' | 'heuristic';
    apiKey?: string;
    autoSyncOnSubscribe: boolean;
    hideShortsFromFeed: boolean;
    themeMode: 'auto' | 'dark' | 'light';
    telemetryOptIn: boolean;
  };
  lastScrapedAt: number;
}

export const UNCATEGORIZED_DECK: CategoryDeck = {
  id: '__uncategorized__',
  name: 'Uncategorized',
  icon: '📂',
  color: '#6B7280',
  channelIds: [],
  isCollapsed: true,
  sortOrder: 999,
  isSystem: true,
};

export const DEFAULT_STORAGE: SubDeckStorageSchema = {
  version: 1,
  categories: [UNCATEGORIZED_DECK],
  channels: {},
  activeCategoryId: null,
  handleToUcId: {},
  settings: {
    aiProvider: 'gemini-nano',
    autoSyncOnSubscribe: true,
    hideShortsFromFeed: false,
    themeMode: 'auto',
    telemetryOptIn: false,
  },
  lastScrapedAt: 0,
};

export interface SubDeckExportPayload {
  exportVersion: number;
  exportedAt: number;
  data: SubDeckStorageSchema;
}
