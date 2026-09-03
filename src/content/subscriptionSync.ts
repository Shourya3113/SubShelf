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
      const newUcIds: string[] = [];

      for (const ch of scraped) {
        if (!currentChannels[ch.ucId]) {
          currentChannels[ch.ucId] = ch;
          if (ch.handle) {
            handleToUcId[ch.handle] = ch.ucId;
          }
          newUcIds.push(ch.ucId);
          hasChanges = true;
          Logger.info(`[SubDeck] Discovered new subscription: ${ch.title} (${ch.ucId})`);
        }
      }

      if (hasChanges) {
        // Add new channel IDs to uncategorized deck
        let uncategorized = categories.find(c => c.id === '__uncategorized__');
        if (!uncategorized) {
          uncategorized = {
            id: '__uncategorized__',
            name: 'Uncategorized',
            icon: '📂',
            color: '#6B7280',
            channelIds: [],
            isCollapsed: true,
            sortOrder: 999,
            isSystem: true,
          };
          categories.push(uncategorized);
        }

        const mergedIds = new Set([...uncategorized.channelIds, ...newUcIds]);
        uncategorized.channelIds = Array.from(mergedIds);

        // Atomic storage update in a single write operation
        await SubDeckStorage.setAll({
          channels: currentChannels,
          handleToUcId,
          categories,
          lastScrapedAt: Date.now(),
        });

        await SidebarManager.render();
      }
    } catch (err) {
      Logger.error('[SubDeck] Error during subscription sync:', err);
    } finally {
      this.isSyncing = false;
    }
  }
}
