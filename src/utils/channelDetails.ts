import { SubscribedChannel } from '@/types';

/** Longest channel description kept in storage. */
export const MAX_DESCRIPTION_LENGTH = 500;

/** Storage key holding when the All subscriptions page was last read for channel details. */
export const CHANNEL_DETAILS_CHECKED_KEY = 'channelDetailsCheckedAt';

/** Background re-check for channels still without a description (e.g. not on the page). */
export const DETAILS_RECHECK_MS = 24 * 60 * 60 * 1000;
/** Re-check spacing when the user runs Auto-AI, so repeated clicks don't refetch the page. */
export const DETAILS_RECHECK_ON_DEMAND_MS = 5 * 60 * 1000;

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Collapses whitespace and control characters, trims and caps the length. Non-strings give undefined. */
export function cleanDescription(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  let s = raw.replace(/[\u0000-\u001F\u007F\s]+/g, ' ').trim();
  if (s.length > MAX_DESCRIPTION_LENGTH) {
    s = s.slice(0, MAX_DESCRIPTION_LENGTH);
    // Don't leave half of a surrogate pair (emoji) at the cut
    if (/[\uD800-\uDBFF]$/.test(s)) s = s.slice(0, -1);
    s = s.trimEnd();
  }
  return s;
}

/** Validates an untrusted { channel key: description } map, as sent by a content script. */
export function sanitizeDescriptionMap(input: unknown, maxEntries = 10_000): Map<string, string> {
  const out = new Map<string, string>();
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (out.size >= maxEntries) break;
    if (!k || k.length > 100 || FORBIDDEN_KEYS.has(k)) continue;
    const desc = cleanDescription(v);
    if (desc !== undefined) out.set(k, desc);
  }
  return out;
}

/**
 * Whether the All subscriptions page should be read for descriptions: some channel was never
 * looked up, and the last lookup is at least `minIntervalMs` old.
 */
export function needsDetailsLookup(
  channels: Pick<SubscribedChannel, 'description'>[],
  lastCheckedAt: number,
  now: number,
  minIntervalMs: number
): boolean {
  if (!channels.some(c => c.description === undefined)) return false;
  // A timestamp from the future (clock changed) counts as stale
  return !(lastCheckedAt > 0) || now < lastCheckedAt || now - lastCheckedAt >= minIntervalMs;
}
