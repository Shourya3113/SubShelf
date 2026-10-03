import { ChannelExtractor } from './channelExtractor';
import { SubDeckStorage } from '@/utils/storage';
import { SidebarManager } from './sidebarManager';
import { Logger } from '@/utils/logger';
import { CategoryDeck, SubscribedChannel } from '@/types';
import { HeuristicCategorizer } from '@/ai/heuristic';
import { isSystemChannelOrCurator } from '@/utils/systemChannels';

export class SubscriptionSync {
  private static isSyncing = false;

  static async diffAndSync(additionalChannels: SubscribedChannel[] = []): Promise<void> {
    if (!SubDeckStorage.isContextValid()) return;
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const state = await SubDeckStorage.getAll();
      const currentChannels = { ...(state.channels || {}) };
      const categories: CategoryDeck[] = (state.categories || []).map(c => ({
        ...c,
        channelIds: Array.isArray(c?.channelIds) ? [...c.channelIds] : [],
      }));
      const handleToUcId = { ...(state.handleToUcId || {}) };

      // Scrape from sidebar passing known handleToUcId map so handles resolve to UC IDs immediately
      const scraped = ChannelExtractor.scrapeFromSidebar(handleToUcId);

      // Build unified handleToUcId map from both sources and storage
      for (const ch of [...additionalChannels, ...scraped]) {
        if (ch.ucId?.startsWith('UC') && ch.handle) {
          const h = ch.handle.toLowerCase();
          handleToUcId[h] = ch.ucId;
          handleToUcId['@' + h.replace(/^@/, '')] = ch.ucId;
        }
      }

      // Canonicalize and deduplicate incoming channels
      const allDiscovered: SubscribedChannel[] = [];
      const seenCanonicalKeys = new Set<string>();

      for (const ch of [...additionalChannels, ...scraped]) {
        // STRICT FILTER: Never process YouTube system topics or feed curators
        if (isSystemChannelOrCurator(ch)) continue;

        const cleanHandle = ch.handle ? (ch.handle.startsWith('@') ? ch.handle.toLowerCase() : '@' + ch.handle.toLowerCase()) : '';
        const canonicalId = (ch.ucId?.startsWith('UC') ? ch.ucId : (handleToUcId[cleanHandle] || ch.ucId))?.trim();
        const dedupeKey = canonicalId?.startsWith('UC') ? canonicalId : (cleanHandle || ch.title.toLowerCase().trim());

        if (seenCanonicalKeys.has(dedupeKey)) continue;
        seenCanonicalKeys.add(dedupeKey);

        allDiscovered.push({
          ...ch,
          ucId: canonicalId || ch.ucId,
          handle: cleanHandle || ch.handle,
        });
      }

      let hasChanges = false;

      // Purge any previously stored system curator channels from currentChannels
      const purgedSystemIds = new Set<string>();
      for (const [key, ch] of Object.entries(currentChannels)) {
        if (isSystemChannelOrCurator(ch) || isSystemChannelOrCurator({ ucId: key, title: ch.title, handle: ch.handle, url: ch.url })) {
          delete currentChannels[key];
          purgedSystemIds.add(key);
          if (ch.ucId) purgedSystemIds.add(ch.ucId);
          hasChanges = true;
        }
      }
      if (purgedSystemIds.size > 0) {
        categories.forEach(cat => {
          if (Array.isArray(cat.channelIds)) {
            const before = cat.channelIds.length;
            cat.channelIds = cat.channelIds.filter(id => !purgedSystemIds.has(id));
            if (cat.channelIds.length !== before) hasChanges = true;
          }
        });
      }

      if (allDiscovered.length === 0 && !hasChanges) return;

      const newChannels: SubscribedChannel[] = [];

      // 1. Reconcile new subscriptions & migrate any legacy handle-keyed entries
      for (const ch of allDiscovered) {
        const cleanHandle = ch.handle ? ch.handle.toLowerCase() : '';
        const canonUcId = ch.ucId;

        // Check if a legacy record exists under the handle key (e.g. key is "@apple")
        if (cleanHandle && currentChannels[cleanHandle] && canonUcId.startsWith('UC') && cleanHandle !== canonUcId) {
          currentChannels[canonUcId] = {
            ...currentChannels[cleanHandle],
            ...ch,
            ucId: canonUcId,
          };
          delete currentChannels[cleanHandle];
          hasChanges = true;
          // Remap category references from handle to UC ID
          categories.forEach(cat => {
            if (Array.isArray(cat.channelIds)) {
              cat.channelIds = cat.channelIds.map(id => id.toLowerCase() === cleanHandle ? canonUcId : id);
            }
          });
        }

        if (!currentChannels[canonUcId]) {
          currentChannels[canonUcId] = ch;
          if (cleanHandle) {
            handleToUcId[cleanHandle] = canonUcId;
            handleToUcId['@' + cleanHandle.replace(/^@/, '')] = canonUcId;
          }
          newChannels.push(ch);
          hasChanges = true;
          Logger.info(`[SubShelf] Discovered new subscription: ${ch.title} (${canonUcId})`);
        } else {
          // Update avatar URL or handle if improved
          if (ch.avatarUrl && ch.avatarUrl !== currentChannels[canonUcId].avatarUrl) {
            currentChannels[canonUcId].avatarUrl = ch.avatarUrl;
            hasChanges = true;
          }
          if (cleanHandle && !handleToUcId[cleanHandle]) {
            handleToUcId[cleanHandle] = canonUcId;
            handleToUcId['@' + cleanHandle.replace(/^@/, '')] = canonUcId;
            hasChanges = true;
          }
        }
      }

      // 2. Auto-categorize newly discovered channels if folders already exist
      if (newChannels.length > 0 && categories.length > 0) {
        const heuristicResults = HeuristicCategorizer.categorize(newChannels);
        for (const deck of heuristicResults) {
          const existingCat = categories.find(c => c.id === deck.id);
          if (existingCat) {
            if (!Array.isArray(existingCat.channelIds)) {
              existingCat.channelIds = [];
            }
            for (const id of deck.channelIds || []) {
              if (!existingCat.channelIds.includes(id)) {
                existingCat.channelIds.push(id);
              }
            }
          }
        }
      }

      // Deduplicate category channel IDs
      categories.forEach(cat => {
        if (Array.isArray(cat.channelIds)) {
          const deduped = Array.from(new Set(cat.channelIds));
          if (deduped.length !== cat.channelIds.length) {
            cat.channelIds = deduped;
            hasChanges = true;
          }
        }
      });

      // 3. Reconcile deleted/unsubscribed channels if sidebar is fully expanded
      if (ChannelExtractor.isSidebarFullyExpanded()) {
        const scrapedUcIds = new Set(allDiscovered.map(c => c.ucId));
        const scrapedHandles = new Set(allDiscovered.map(c => (c.handle || '').toLowerCase()));

        for (const [ucId, ch] of Object.entries(currentChannels)) {
          const handleLower = (ch.handle || '').toLowerCase();
          if (!scrapedUcIds.has(ucId) && !scrapedHandles.has(handleLower)) {
            // Channel was unsubscribed
            delete currentChannels[ucId];
            if (ch.handle) delete handleToUcId[ch.handle];
            categories.forEach(cat => {
              if (Array.isArray(cat.channelIds)) {
                cat.channelIds = cat.channelIds.filter(id => id !== ucId);
              } else {
                cat.channelIds = [];
              }
            });
            hasChanges = true;
            Logger.info(`[SubShelf] Removed unsubscribed channel: ${ch.title} (${ucId})`);
          }
        }
      }

      // 4. Purge any legacy __uncategorized__ deck from categories
      const cleanCategories = categories.filter(c => c.id !== '__uncategorized__');
      if (cleanCategories.length !== categories.length) {
        hasChanges = true;
      }

      if (hasChanges) {
        // Atomic storage update serialized through write queue
        await SubDeckStorage.syncSubscriptions({
          channels: currentChannels,
          handleToUcId,
          categories: cleanCategories,
          lastScrapedAt: Date.now(),
        });

        await SidebarManager.render();
      }
    } catch (err) {
      Logger.error('Error during subscription sync:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Syncs initial channels broadcast from YouTube's in-memory ytInitialGuideData.
   */
  static async syncInitialChannels(rawChannels: unknown[]): Promise<void> {
    if (!SubDeckStorage.isContextValid() || !Array.isArray(rawChannels) || rawChannels.length === 0) return;
    try {
      const validChannels: SubscribedChannel[] = [];
      for (const item of rawChannels) {
        if (
          item &&
          typeof item === 'object' &&
          typeof (item as any).ucId === 'string' &&
          typeof (item as any).title === 'string'
        ) {
          if (isSystemChannelOrCurator(item as any)) continue;
          validChannels.push({
            ucId: (item as any).ucId,
            title: (item as any).title,
            handle: (item as any).handle || `@${(item as any).ucId}`,
            url: (item as any).url || `https://www.youtube.com/channel/${(item as any).ucId}`,
            avatarUrl: typeof (item as any).avatarUrl === 'string' ? (item as any).avatarUrl : '',
            discoveredAt: Date.now(),
          });
        }
      }
      if (validChannels.length > 0) {
        await this.diffAndSync(validChannels);
      }
    } catch (err) {
      Logger.error('Error syncing initial channels from broadcast:', err);
    }
  }

  /**
   * Remove a channel by URL (used for unsubscribe detection on channel pages
   * where the sidebar may not be fully expanded).
   */
  static async removeChannelByUrl(url: string): Promise<void> {
    if (!SubDeckStorage.isContextValid()) return;
    const handleMatch = url.match(/\/@([^/?#]+)/);
    if (!handleMatch) return;
    let handle = `@${handleMatch[1].toLowerCase()}`;
    try {
      handle = `@${decodeURIComponent(handleMatch[1]).toLowerCase()}`;
    } catch {}

    const handleToUcId = await SubDeckStorage.getHandleToUcIdMap();
    const ucId = handleToUcId[handle];
    if (!ucId) return;

    await SubDeckStorage.removeChannel(ucId);
    await SidebarManager.render();
    Logger.info(`[SubShelf] Removed unsubscribed channel by URL: ${handle} (${ucId})`);
  }

  /**
   * Safely merges sanitized avatar maps received via broadcast events into storage.
   */
  static async mergeAvatars(avatarMap: Map<string, string>): Promise<void> {
    if (!SubDeckStorage.isContextValid() || avatarMap.size === 0) return;
    try {
      const state = await SubDeckStorage.getAll();
      const currentChannels = { ...(state.channels || {}) };
      const handleToUcId = state.handleToUcId || {};
      let hasChanges = false;

      for (const [key, url] of avatarMap.entries()) {
        const ucId = key.startsWith('UC') ? key : handleToUcId[key] || handleToUcId['@' + key];
        if (ucId && currentChannels[ucId]) {
          if (!currentChannels[ucId].avatarUrl || currentChannels[ucId].avatarUrl !== url) {
            currentChannels[ucId].avatarUrl = url;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        await SubDeckStorage.update(['channels'], () => ({ channels: currentChannels }));
        SidebarManager.render();
      }
    } catch {}
  }
}
