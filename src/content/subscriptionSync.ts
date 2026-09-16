import { ChannelExtractor } from './channelExtractor';
import { SubDeckStorage } from '@/utils/storage';
import { SidebarManager } from './sidebarManager';
import { Logger } from '@/utils/logger';
import { CategoryDeck } from '@/types';

export class SubscriptionSync {
  private static isSyncing = false;

  static async diffAndSync(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const scraped = ChannelExtractor.scrapeFromSidebar();
      if (scraped.length === 0) return;

      const state = await SubDeckStorage.getAll();
      const currentChannels = { ...state.channels };
      const categories: CategoryDeck[] = state.categories.map(c => ({
        ...c,
        channelIds: [...c.channelIds],
      }));
      const handleToUcId = { ...state.handleToUcId };

      let hasChanges = false;

      // 1. Reconcile new subscriptions
      for (const ch of scraped) {
        if (!currentChannels[ch.ucId]) {
          currentChannels[ch.ucId] = ch;
          if (ch.handle) {
            handleToUcId[ch.handle] = ch.ucId;
          }
          hasChanges = true;
          Logger.info(`[SubShelf] Discovered new subscription: ${ch.title} (${ch.ucId})`);
        }
      }

      // 2. Reconcile deleted/unsubscribed channels if sidebar is fully expanded
      if (ChannelExtractor.isSidebarFullyExpanded()) {
        const scrapedUcIds = new Set(scraped.map(c => c.ucId));
        const scrapedHandles = new Set(scraped.map(c => (c.handle || '').toLowerCase()));

        for (const [ucId, ch] of Object.entries(currentChannels)) {
          const handleLower = (ch.handle || '').toLowerCase();
          if (!scrapedUcIds.has(ucId) && !scrapedHandles.has(handleLower)) {
            // Channel was unsubscribed
            delete currentChannels[ucId];
            if (ch.handle) delete handleToUcId[ch.handle];
            categories.forEach(cat => {
              cat.channelIds = cat.channelIds.filter(id => id !== ucId);
            });
            hasChanges = true;
            Logger.info(`[SubShelf] Removed unsubscribed channel: ${ch.title} (${ucId})`);
          }
        }
      }

      // 3. Purge any legacy __uncategorized__ deck from categories
      const cleanCategories = categories.filter(c => c.id !== '__uncategorized__');
      if (cleanCategories.length !== categories.length) {
        hasChanges = true;
      }

      if (hasChanges) {
        // Atomic storage update in a single write operation
        await SubDeckStorage.setAll({
          channels: currentChannels,
          handleToUcId,
          categories: cleanCategories,
          lastScrapedAt: Date.now(),
        });

        await SidebarManager.render();
      }
    } catch (err) {
      Logger.error('[SubShelf] Error during subscription sync:', err);
    } finally {
      this.isSyncing = false;
    }
  }
}
