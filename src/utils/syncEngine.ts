import { CategoryDeck, SubscribedChannel } from '@/types';
import { HeuristicCategorizer } from '@/ai/heuristic';
import { isSystemChannelOrCurator } from './systemChannels';
import { channelKey, isChannelId, mapHandle, normalizeHandle } from './channelIdentity';

/** Storage key holding per-channel "not seen in a complete sidebar scrape" bookkeeping. */
export const SYNC_MISSING_KEY = 'syncMissing';

/** A channel must be missing from this many separate complete scrapes before it is removed. */
export const REMOVAL_MIN_STRIKES = 3;
/** Minimum spacing between two strikes, so a burst of syncs cannot remove a channel in one go. */
export const REMOVAL_STRIKE_INTERVAL_MS = 30_000;
/** A scrape that would remove more than max(ABSOLUTE, FRACTION * stored) channels is treated as broken. */
export const REMOVAL_MAX_ABSOLUTE = 3;
export const REMOVAL_MAX_FRACTION = 0.1;

export interface MissingRecord {
  firstMissingAt: number;
  lastStrikeAt: number;
  strikes: number;
}

export interface SyncSnapshot {
  channels: Record<string, SubscribedChannel>;
  categories: CategoryDeck[];
  handleToUcId: Record<string, string>;
  missing: Record<string, MissingRecord>;
}

export interface SyncObservation {
  /** Channels seen on the page (sidebar scrape plus YouTube's guide payload). */
  discovered: SubscribedChannel[];
  /** True only when the sidebar scrape covered the user's whole subscription list. */
  sidebarComplete: boolean;
  now: number;
  /**
   * Optional learned placement for a newly subscribed channel, given the folder the keyword engine
   * picked (or null). Returns a folder ID to use instead, or null to keep the engine's choice.
   */
  placeNew?: (ch: SubscribedChannel, engineFolderId: string | null) => string | null;
}

export interface SyncResult {
  next: SyncSnapshot;
  /** Anything needs persisting (including removal bookkeeping). */
  changed: boolean;
  added: string[];
  removed: string[];
  /** Set when a complete scrape looked implausible and removal was skipped. */
  removalSkipped?: string;
}

/**
 * Reconciles what the content script observed against the stored state.
 * Pure: never touches chrome.* so it can run inside the service worker's write queue and in tests.
 */
export function computeSync(prev: SyncSnapshot, obs: SyncObservation): SyncResult {
  const channels: Record<string, SubscribedChannel> = { ...prev.channels };
  const categories: CategoryDeck[] = prev.categories.map(c => ({
    ...c,
    channelIds: Array.isArray(c?.channelIds) ? [...c.channelIds] : [],
  }));
  const handleToUcId: Record<string, string> = { ...prev.handleToUcId };
  const missing: Record<string, MissingRecord> = { ...prev.missing };
  const added: string[] = [];
  const removed: string[] = [];
  let changed = false;
  let removalSkipped: string | undefined;

  const learnHandle = (handle: string, ucId: string) => {
    if (mapHandle(handleToUcId, handle, ucId)) changed = true;
  };

  // 1. Learn handle -> UC ID mappings from everything observed
  for (const ch of obs.discovered) {
    learnHandle(ch.handle, ch.ucId);
  }

  // 2. Canonicalize and deduplicate the observation
  const discovered: SubscribedChannel[] = [];
  const seenKeys = new Set<string>();
  for (const ch of obs.discovered) {
    if (isSystemChannelOrCurator(ch)) continue;
    const handle = normalizeHandle(ch.handle);
    const canonicalId = (isChannelId(ch.ucId) ? ch.ucId : (handleToUcId[handle] || ch.ucId))?.trim();
    const dedupeKey = channelKey({ ucId: canonicalId, handle, title: ch.title });
    if (!dedupeKey || seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);
    discovered.push({ ...ch, ucId: canonicalId || ch.ucId, handle: handle || ch.handle });
  }

  // 3. Purge stored system curators (Gaming, Music, ...)
  const purged = new Set<string>();
  for (const [key, ch] of Object.entries(channels)) {
    if (isSystemChannelOrCurator(ch) || isSystemChannelOrCurator({ ucId: key, title: ch?.title, handle: ch?.handle, url: ch?.url })) {
      delete channels[key];
      purged.add(key);
      if (ch?.ucId) purged.add(ch.ucId);
      changed = true;
    }
  }

  // 4. Add new channels, migrate legacy handle-keyed records, refresh avatars
  const newChannels: SubscribedChannel[] = [];
  for (const ch of discovered) {
    const handle = ch.handle ? ch.handle.toLowerCase() : '';
    const id = ch.ucId;

    if (handle && channels[handle] && isChannelId(id) && handle !== id) {
      channels[id] = { ...channels[handle], ...ch, ucId: id };
      delete channels[handle];
      changed = true;
      for (const cat of categories) {
        cat.channelIds = cat.channelIds.map(cid => (cid.toLowerCase() === handle ? id : cid));
      }
    }

    const existing = channels[id];
    if (!existing) {
      channels[id] = ch;
      if (handle) learnHandle(handle, id);
      newChannels.push(ch);
      added.push(id);
      changed = true;
    } else {
      if (ch.avatarUrl && ch.avatarUrl !== existing.avatarUrl) {
        channels[id] = { ...existing, avatarUrl: ch.avatarUrl };
        changed = true;
      }
      if (handle && !handleToUcId[handle]) learnHandle(handle, id);
    }
  }

  // 5. Auto-categorize newcomers into existing folders
  if (newChannels.length > 0 && categories.length > 0) {
    const engineFolder = new Map<string, string>();
    for (const deck of HeuristicCategorizer.categorize(newChannels)) {
      for (const id of deck.channelIds) engineFolder.set(id, deck.id);
    }
    for (const ch of newChannels) {
      const engineId = engineFolder.get(ch.ucId) ?? null;
      // The user's own corrections win over the keyword engine when they clearly apply
      const learnedId = obs.placeNew?.(ch, engineId) ?? null;
      const target = categories.find(c => c.id === (learnedId ?? engineId));
      if (target && !target.channelIds.includes(ch.ucId)) target.channelIds.push(ch.ucId);
    }
  }

  // 6. Drop purged ids and duplicate ids from folders
  for (const cat of categories) {
    const cleaned = Array.from(new Set(cat.channelIds.filter(id => !purged.has(id))));
    if (cleaned.length !== cat.channelIds.length) {
      cat.channelIds = cleaned;
      changed = true;
    }
  }

  // 7. Unsubscribe reconciliation — conservative by design, since a bad scrape must never wipe folders
  const seenIds = new Set(discovered.map(c => c.ucId));
  const seenHandles = new Set(discovered.map(c => (c.handle || '').toLowerCase()).filter(Boolean));
  const isSeen = (id: string, ch: SubscribedChannel) =>
    seenIds.has(id) || (Boolean(ch.handle) && seenHandles.has(ch.handle.toLowerCase()));

  for (const id of Object.keys(missing)) {
    const ch = channels[id];
    if (!ch || isSeen(id, ch)) {
      delete missing[id];
      changed = true;
    }
  }

  if (obs.sidebarComplete) {
    const total = Object.keys(channels).length;
    const candidates = Object.entries(channels).filter(([id, ch]) => !isSeen(id, ch));
    const limit = Math.max(REMOVAL_MAX_ABSOLUTE, Math.ceil(total * REMOVAL_MAX_FRACTION));

    if (candidates.length > limit) {
      removalSkipped = `scrape would remove ${candidates.length}/${total} channels (limit ${limit})`;
    } else {
      for (const [id, ch] of candidates) {
        const rec = missing[id];
        if (!rec) {
          missing[id] = { firstMissingAt: obs.now, lastStrikeAt: obs.now, strikes: 1 };
          changed = true;
        } else if (obs.now - rec.lastStrikeAt >= REMOVAL_STRIKE_INTERVAL_MS) {
          missing[id] = { ...rec, lastStrikeAt: obs.now, strikes: rec.strikes + 1 };
          changed = true;
        }

        if (missing[id].strikes >= REMOVAL_MIN_STRIKES) {
          delete channels[id];
          delete missing[id];
          if (ch.handle) {
            const h = normalizeHandle(ch.handle);
            if (handleToUcId[h] === id) delete handleToUcId[h];
            if (handleToUcId[h.slice(1)] === id) delete handleToUcId[h.slice(1)];
          }
          for (const cat of categories) {
            cat.channelIds = cat.channelIds.filter(cid => cid !== id);
          }
          removed.push(id);
          changed = true;
        }
      }
    }
  }

  // 8. Legacy __uncategorized__ deck never belongs in storage
  const cleanCategories = categories.filter(c => c.id !== '__uncategorized__');
  if (cleanCategories.length !== categories.length) changed = true;

  return {
    next: { channels, categories: cleanCategories, handleToUcId, missing },
    changed,
    added,
    removed,
    removalSkipped,
  };
}
