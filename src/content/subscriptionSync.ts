import { ChannelExtractor } from './channelExtractor';
import { SubDeckStorage } from '@/utils/storage';
import { SidebarManager } from './sidebarManager';
import { Logger } from '@/utils/logger';
import { CategoryDeck, SubscribedChannel } from '@/types';
import { HeuristicCategorizer } from '@/ai/heuristic';

export class SubscriptionSync {
  private static isSyncing = false;

  static async diffAndSync(): Promise<void> {
    if (!SubDeckStorage.isContextValid()) return;
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
      const newChannels: SubscribedChannel[] = [];

      // 1. Reconcile new subscriptions
      for (const ch of scraped) {
        if (!currentChannels[ch.ucId]) {
          currentChannels[ch.ucId] = ch;
          if (ch.handle) {
            handleToUcId[ch.handle] = ch.ucId;
          }
          newChannels.push(ch);
          hasChanges = true;
          Logger.info(`[SubShelf] Discovered new subscription: ${ch.title} (${ch.ucId})`);
        } else {
          // Update avatar URL if it changed (keep avatars fresh)
          if (ch.avatarUrl && ch.avatarUrl !== currentChannels[ch.ucId].avatarUrl) {
            currentChannels[ch.ucId].avatarUrl = ch.avatarUrl;
            hasChanges = true;
          }
        }
      }

      // 1b. Backfill missing avatars for ANY channel currently missing one in storage
      const initialAvatars = ChannelExtractor.getInitialAvatars();
      if (initialAvatars.size > 0) {
        for (const [ucId, ch] of Object.entries(currentChannels)) {
          if (!ch.avatarUrl || ch.avatarUrl.startsWith('data:image')) {
            const cleanHandle = (ch.handle || '').replace(/^[\/@]+/, '').toLowerCase();
            const found =
              initialAvatars.get(ucId) ||
              initialAvatars.get(ch.handle) ||
              initialAvatars.get(cleanHandle) ||
              initialAvatars.get('@' + cleanHandle) ||
              initialAvatars.get(ch.title.toLowerCase().trim());
            if (found && found !== ch.avatarUrl && !found.startsWith('data:image')) {
              currentChannels[ucId].avatarUrl = found;
              hasChanges = true;
            }
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
            for (const id of deck.channelIds) {
              if (!existingCat.channelIds.includes(id)) {
                existingCat.channelIds.push(id);
              }
            }
          }
        }
      }

      // 3. Reconcile deleted/unsubscribed channels if sidebar is fully expanded
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

      // 4. Purge any legacy __uncategorized__ deck from categories
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
      Logger.error('Error during subscription sync:', err);
    } finally {
      this.isSyncing = false;
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

    const state = await SubDeckStorage.getAll();
    const ucId = state.handleToUcId[handle];
    if (!ucId || !state.channels[ucId]) return;

    const channels = { ...state.channels };
    const handleToUcId = { ...state.handleToUcId };
    const categories = state.categories.map(c => ({
      ...c,
      channelIds: c.channelIds.filter(id => id !== ucId),
    }));

    const ch = channels[ucId];
    delete channels[ucId];
    if (ch.handle) delete handleToUcId[ch.handle];

    await SubDeckStorage.setAll({ channels, handleToUcId, categories });
    await SidebarManager.render();
    Logger.info(`[SubShelf] Removed unsubscribed channel by URL: ${ch.title} (${ucId})`);
  }
}
