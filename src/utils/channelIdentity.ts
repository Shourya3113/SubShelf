import { SubscribedChannel } from '@/types';

/**
 * The single definition of how SubShelf identifies a channel. Every layer (page scraping, sync,
 * storage, feed filter, UI) uses these helpers instead of re-deriving keys and handle formats.
 *
 * Canonical forms:
 * - Channel ID: YouTube's `UC…` ID when known.
 * - Handle:     "@name", lowercase, URL-decoded (e.g. "@mkbhd").
 */

export const isChannelId = (id: string | null | undefined): id is string =>
  typeof id === 'string' && id.startsWith('UC');

/** Accepts "name", "@Name", "/@name" or a URL-encoded handle; returns "@name" or "". */
export function normalizeHandle(raw: string | null | undefined): string {
  if (!raw) return '';
  let h = raw.trim().replace(/^\/+/, '').replace(/^@+/, '');
  if (!h) return '';
  try {
    h = decodeURIComponent(h);
  } catch {
    // Keep the raw form if it isn't valid percent-encoding
  }
  return '@' + h.toLowerCase();
}

/** Handle without the "@" (the form YouTube uses in some payloads and avatar maps). */
export const bareHandle = (raw: string | null | undefined): string => normalizeHandle(raw).slice(1);

/** Key that identifies one channel, whatever form its record is in. */
export function channelKey(ch: Pick<SubscribedChannel, 'ucId' | 'handle' | 'title'>): string {
  if (isChannelId(ch.ucId)) return ch.ucId;
  return normalizeHandle(ch.handle) || (ch.title || '').toLowerCase().trim();
}

/** Resolves a UC ID, "@handle" or bare handle to the channel's UC ID when the handle map knows it. */
export function resolveChannelId(idOrHandle: string, handleToUcId: Record<string, string>): string {
  if (isChannelId(idOrHandle)) return idOrHandle;
  const h = normalizeHandle(idOrHandle);
  return handleToUcId[h] || handleToUcId[h.slice(1)] || idOrHandle;
}

/** Records handle -> UC ID under both "@name" and "name"; returns true if the map changed. */
export function mapHandle(handleToUcId: Record<string, string>, handle: string | null | undefined, ucId: string): boolean {
  const h = normalizeHandle(handle);
  if (!h || !isChannelId(ucId)) return false;
  let changed = false;
  for (const key of [h, h.slice(1)]) {
    if (handleToUcId[key] !== ucId) {
      handleToUcId[key] = ucId;
      changed = true;
    }
  }
  return changed;
}

/** Every identifier a channel may be stored under in folders (UC ID, handle forms, mapped aliases). */
export function channelAliases(
  ucId: string,
  channels: Record<string, SubscribedChannel>,
  handleToUcId: Record<string, string>
): Set<string> {
  const ids = new Set<string>([ucId]);
  const h = normalizeHandle(channels[ucId]?.handle);
  if (h) {
    ids.add(h);
    ids.add(h.slice(1));
  }
  for (const [handle, target] of Object.entries(handleToUcId)) {
    if (target === ucId || handle === ucId) {
      ids.add(handle);
      ids.add(target);
    }
  }
  return ids;
}
