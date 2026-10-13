/**
 * The one-time "Enjoying SubShelf?" request. It tracks no usage: the only inputs are when the user
 * first had folders and how they answered. It is shown once the folders are a week old, "Not now"
 * snoozes it for a month, and a second "Not now" (or rating) ends it for good.
 */
export const RATE_PROMPT_KEY = 'ratePrompt';
export const RATE_PROMPT_DELAY_MS = 7 * 24 * 60 * 60 * 1000;
export const RATE_PROMPT_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

const CHROME_REVIEWS_URL = 'https://chromewebstore.google.com/detail/elmeglemgjhfadeahmlbcgkjkfkfkfgd/reviews';
// Set once SubShelf is listed on Microsoft Edge Add-ons; until then Edge users are not asked
const EDGE_REVIEWS_URL: string | null = null;

export type RatePromptStatus = 'pending' | 'snoozed' | 'done';
export type RatePromptEvent = 'foldersSeen' | 'rated' | 'notNow';

export interface RatePromptState {
  /** When the user was first seen with folders; null until then. */
  foldersSince: number | null;
  status: RatePromptStatus;
  snoozedUntil: number | null;
}

export function normalizeRatePrompt(raw: unknown): RatePromptState {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const status: RatePromptStatus = r.status === 'snoozed' || r.status === 'done' ? r.status : 'pending';
  return {
    foldersSince: typeof r.foldersSince === 'number' ? r.foldersSince : null,
    status,
    snoozedUntil: typeof r.snoozedUntil === 'number' ? r.snoozedUntil : null,
  };
}

/** Returns the next state, or null when the event changes nothing (so nothing is written). */
export function applyRatePromptEvent(state: RatePromptState, event: RatePromptEvent, now: number): RatePromptState | null {
  switch (event) {
    case 'foldersSeen':
      return state.foldersSince === null ? { ...state, foldersSince: now } : null;
    case 'rated':
      return state.status === 'done' ? null : { ...state, status: 'done', snoozedUntil: null };
    case 'notNow':
      if (state.status === 'done') return null;
      return state.status === 'snoozed'
        ? { ...state, status: 'done', snoozedUntil: null }
        : { ...state, status: 'snoozed', snoozedUntil: now + RATE_PROMPT_SNOOZE_MS };
  }
}

export function shouldShowRatePrompt(state: RatePromptState, now: number, reviewUrl: string | null): boolean {
  if (!reviewUrl || state.status === 'done' || state.foldersSince === null) return false;
  if (now - state.foldersSince < RATE_PROMPT_DELAY_MS) return false;
  return state.status === 'pending' || (state.snoozedUntil !== null && now >= state.snoozedUntil);
}

/** Reviews page of the store this browser installs from, or null where SubShelf isn't listed. */
export function storeReviewUrl(userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): string | null {
  return /\bEdg\//.test(userAgent) ? EDGE_REVIEWS_URL : CHROME_REVIEWS_URL;
}
