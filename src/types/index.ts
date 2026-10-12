export interface SubscribedChannel {
  ucId: string;
  title: string;
  handle: string;
  url: string;
  avatarUrl: string;
  discoveredAt: number;
  /**
   * The channel's short "About" text from YouTube's All subscriptions page, cleaned and capped at
   * MAX_DESCRIPTION_LENGTH. Undefined: never looked up. Empty string: looked up, the channel has none.
   */
  description?: string;
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
  channelExclusions: Record<string, string[]>;
  manualAssignments: Record<string, string[]>;
  settings: {
    aiProvider: 'gemini-nano' | 'gemini-api' | 'heuristic';
    /** @deprecated API key is stored separately in isolated storage and read only in background worker */
    apiKey?: string;
    geminiModel?: string;
    hideShortsFromFeed: boolean;
  };
  lastScrapedAt: number;
}

export const DEFAULT_GEMINI_CLOUD_MODEL = 'gemini-2.5-flash';
export const CURRENT_SCHEMA_VERSION = 2;
export const API_KEY_FIELD = 'geminiApiKey';

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
  version: CURRENT_SCHEMA_VERSION,
  categories: [],
  channels: {},
  activeCategoryId: null,
  handleToUcId: {},
  channelExclusions: {},
  manualAssignments: {},
  settings: {
    aiProvider: 'heuristic',
    geminiModel: DEFAULT_GEMINI_CLOUD_MODEL,
    hideShortsFromFeed: false,
  },
  lastScrapedAt: 0,
};

export interface SubDeckExportPayload {
  exportVersion: number;
  exportedAt: number;
  data: SubDeckStorageSchema;
}
