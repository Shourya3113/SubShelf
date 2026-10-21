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

export const DEFAULT_GEMINI_CLOUD_MODEL = 'gemini-3.5-flash-lite';

/**
 * Defaults that earlier versions saved into settings. Google stopped serving them to new API users, so
 * they count as "no model chosen" and follow the current default. A model the user typed is kept.
 */
const FORMER_DEFAULT_GEMINI_MODELS = ['gemini-2.5-flash'];

/** The Gemini Cloud model to use for a stored `settings.geminiModel`. */
export function resolveGeminiModel(stored?: string): string {
  const model = stored?.trim();
  return model && !FORMER_DEFAULT_GEMINI_MODELS.includes(model) ? model : DEFAULT_GEMINI_CLOUD_MODEL;
}

/**
 * Manual-assignment marker for "the user took this channel out of every folder": no folder has this
 * ID, so applyOverrides keeps the channel out of all folders on every Auto-sort until it is placed again.
 */
export const NO_FOLDER = '__none__';
export const CURRENT_SCHEMA_VERSION = 2;
export const API_KEY_FIELD = 'geminiApiKey';

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
