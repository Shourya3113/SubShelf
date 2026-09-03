import { ChannelExtractor } from './channelExtractor';
import { SubDeckStorage } from '@/utils/storage';
import { SidebarManager } from './sidebarManager';
import { Logger } from '@/utils/logger';

export class SubscriptionSync {
  private static isSyncing = false;

  static async diffAndSync(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const scraped = ChannelExtractor.scrapeFromSidebar();
      if (scraped.length === 0) return;

      const currentChannels = await SubDeckStorage.getChannels();
      const categories = await SubDeckStorage.getCategories();
      let hasChanges = false;

      // Add any newly discovered channels to __uncategorized__
      for (const ch of scraped) {
        if (!currentChannels[ch.ucId]) {
          await SubDeckStorage.addChannel(ch);
          await SubDeckStorage.addChannelToCategory(ch.ucId, '__uncategorized__');
          hasChanges = true;
          Logger.info(`[SubDeck] Discovered new subscription: ${ch.title} (${ch.ucId})`);
        }
      }

      if (hasChanges) {
        await SubDeckStorage.setAll({ categories, lastScrapedAt: Date.now() });
        await SidebarManager.render();
      }
    } catch (err) {
      Logger.error('[SubDeck] Error during subscription sync:', err);
    } finally {
      this.isSyncing = false;
    }
  }
}
