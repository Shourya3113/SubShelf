import { ChannelExtractor } from './channelExtractor';
import { SubDeckStorage } from '@/utils/storage';
import { SidebarManager } from './sidebarManager';
import { Logger } from '@/utils/logger';
import { CategoryDeck, SubscribedChannel } from '@/types';
import { HeuristicCategorizer } from '@/ai/heuristic';

export class SubscriptionSync {
  private static isSyncing = false;

  static async diffAndSync(additionalChannels: SubscribedChannel[] = []): Promise<void> {
    if (!SubDeckStorage.isContextValid()) return;
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const scraped = ChannelExtractor.scrapeFromSidebar();
      const allDiscovered = [...scraped];
      const seenIds = new Set(allDiscovered.map(c => c.ucId));
      for (const ch of additionalChannels) {
        if (!seenIds.has(ch.ucId)) {
          seenIds.add(ch.ucId);
          allDiscovered.push(ch);
        }
      }

      if (allDiscovered.length === 0) return;

      const state = await SubDeckStorage.getAll();
      const currentChannels = { ...(state.channels || {}) };
      const categories: CategoryDeck[] = (state.categories || []).map(c => ({
        ...c,
        channelIds: Array.isArray(c?.channelIds) ? [...c.channelIds] : [],
      }));
      const handleToUcId = { ...(state.handleToUcId || {}) };

      let hasChanges = false;
      const newChannels: SubscribedChannel[] = [];

      // 1. Reconcile new subscriptions
      for (const ch of allDiscovered) {
        if (!currentChannels[ch.ucId]) {
          currentChannels[ch.ucId] = ch;
          if (ch.handle) {
            handleToUcId[ch.handle] = ch.ucId;
          }
          newChannels.push(ch);
          hasChanges = true;
          Logger.info(`[SubShelf] Discovered new subscription: ${ch.title} (${ch.ucId})`);
        } else {
          // Update avatar URL if it changed or was previously missing
          if (ch.avatarUrl && ch.avatarUrl !== currentChannels[ch.ucId].avatarUrl) {
            currentChannels[ch.ucId].avatarUrl = ch.avatarUrl;
            hasChanges = true;
          }
          if (ch.handle && !handleToUcId[ch.handle]) {
            handleToUcId[ch.handle] = ch.ucId;
            hasChanges = true;
          }
        }
      }

      // 2. Auto-categorize newly discovered channels if folders already exist
      if (newChannels.length > 0 && categories.length > 0) {
        const heuristicResults = HeuristicCategorizer.categorize(newChannels);
        for (const deck of heuristicResults) {
          // Find matching existing category by id
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
    const handleMatch = url.match(/\/@([^\/\?]+)/);
    if (!handleMatch) return;
    const handle = `@${handleMatch[1]}`;

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
