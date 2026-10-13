import { describe, it, expect } from 'vitest';
import {
  applyRatePromptEvent,
  normalizeRatePrompt,
  RATE_PROMPT_DELAY_MS,
  RATE_PROMPT_SNOOZE_MS,
  shouldShowRatePrompt,
  storeReviewUrl,
} from '@/utils/ratePrompt';

const URL = 'https://example.test/reviews';
const T0 = 1_700_000_000_000;

describe('rating prompt', () => {
  it('starts pending with no folders date, and ignores junk in storage', () => {
    expect(normalizeRatePrompt(undefined)).toEqual({ foldersSince: null, status: 'pending', snoozedUntil: null });
    expect(normalizeRatePrompt({ status: 'weird', foldersSince: 'x' })).toEqual({ foldersSince: null, status: 'pending', snoozedUntil: null });
  });

  it('records the folders date once', () => {
    const s = applyRatePromptEvent(normalizeRatePrompt(null), 'foldersSeen', T0)!;
    expect(s.foldersSince).toBe(T0);
    expect(applyRatePromptEvent(s, 'foldersSeen', T0 + 5)).toBeNull();
  });

  it('waits a week after folders first appear', () => {
    const s = applyRatePromptEvent(normalizeRatePrompt(null), 'foldersSeen', T0)!;
    expect(shouldShowRatePrompt(s, T0 + RATE_PROMPT_DELAY_MS - 1, URL)).toBe(false);
    expect(shouldShowRatePrompt(s, T0 + RATE_PROMPT_DELAY_MS, URL)).toBe(true);
    expect(shouldShowRatePrompt(normalizeRatePrompt(null), T0 + RATE_PROMPT_DELAY_MS * 10, URL)).toBe(false);
  });

  it('never shows where there is no store to review on', () => {
    const s = applyRatePromptEvent(normalizeRatePrompt(null), 'foldersSeen', T0)!;
    expect(shouldShowRatePrompt(s, T0 + RATE_PROMPT_DELAY_MS, null)).toBe(false);
  });

  it('snoozes on the first "Not now" and stops on the second', () => {
    const now = T0 + RATE_PROMPT_DELAY_MS;
    const seen = applyRatePromptEvent(normalizeRatePrompt(null), 'foldersSeen', T0)!;
    const snoozed = applyRatePromptEvent(seen, 'notNow', now)!;
    expect(snoozed.status).toBe('snoozed');
    expect(shouldShowRatePrompt(snoozed, now + RATE_PROMPT_SNOOZE_MS - 1, URL)).toBe(false);
    expect(shouldShowRatePrompt(snoozed, now + RATE_PROMPT_SNOOZE_MS, URL)).toBe(true);
    const done = applyRatePromptEvent(snoozed, 'notNow', now + RATE_PROMPT_SNOOZE_MS)!;
    expect(done.status).toBe('done');
    expect(shouldShowRatePrompt(done, now + RATE_PROMPT_SNOOZE_MS * 10, URL)).toBe(false);
  });

  it('stops for good once the user rates', () => {
    const seen = applyRatePromptEvent(normalizeRatePrompt(null), 'foldersSeen', T0)!;
    const rated = applyRatePromptEvent(seen, 'rated', T0 + RATE_PROMPT_DELAY_MS)!;
    expect(shouldShowRatePrompt(rated, T0 + RATE_PROMPT_DELAY_MS * 10, URL)).toBe(false);
    expect(applyRatePromptEvent(rated, 'notNow', T0)).toBeNull();
  });

  it('links to the Chrome Web Store on Chrome and asks nothing on Edge until it is listed there', () => {
    const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
    expect(storeReviewUrl(chrome)).toContain('chromewebstore.google.com/detail/elmeglemgjhfadeahmlbcgkjkfkfkfgd/reviews');
    expect(storeReviewUrl(chrome + ' Edg/141.0.0.0')).toBeNull();
  });
});
