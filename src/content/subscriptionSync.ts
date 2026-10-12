import { ChannelExtractor } from './channelExtractor';
import { SubDeckStorage } from '@/utils/storage';
import { SidebarManager } from './sidebarManager';
import { Logger } from '@/utils/logger';
import { SubscribedChannel } from '@/types';
import { isSystemChannelOrCurator } from '@/utils/systemChannels';
import { normalizeHandle } from '@/utils/channelIdentity';
import { ChannelsPageData, harvestFromChannelsPage } from '@/utils/avatarHarvest';
import { needsDetailsLookup } from '@/utils/channelDetails';

export class SubscriptionSync {
  private static isSyncing = false;
  private static rerunRequested = false;
  private static pendingChannels: SubscribedChannel[] = [];

  /**
   * Reports the channels visible on the page to the service worker, which reconciles them against
   * fresh storage inside its write queue. Calls arriving mid-sync are coalesced into one more pass
   * so channels broadcast from YouTube's guide payload are never dropped.
   */
  static async diffAndSync(additionalChannels: SubscribedChannel[] = []): Promise<void> {
    if (!SubDeckStorage.isContextValid()) return;
    if (additionalChannels.length > 0) this.pendingChannels.push(...additionalChannels);
    if (this.isSyncing) {
      this.rerunRequested = true;
      return;
    }
    this.isSyncing = true;

    try {
      do {
        this.rerunRequested = false;
        await this.runSyncPass(this.pendingChannels.splice(0));
      } while (this.rerunRequested && SubDeckStorage.isContextValid());
    } catch (err) {
      Logger.error('Error during subscription sync:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  private static async runSyncPass(additionalChannels: SubscribedChannel[]): Promise<void> {
    // Resolve handles to UC IDs with the known map so sidebar entries match stored records
    const handleToUcId = await SubDeckStorage.getHandleToUcIdMap();
    const scraped = ChannelExtractor.scrapeFromSidebar(handleToUcId);

    const discovered = [...additionalChannels, ...scraped].filter(ch => !isSystemChannelOrCurator(ch));
    if (discovered.length === 0) return;

    // Only a non-empty scrape of the fully expanded list may count toward unsubscribe detection
    const sidebarComplete = scraped.length > 0 && ChannelExtractor.isSidebarFullyExpanded();

    const result = await SubDeckStorage.syncObservation(discovered, sidebarComplete);
    if (result?.added.length) Logger.info(`[SubShelf] Discovered ${result.added.length} new subscription(s)`);
    if (result?.removed.length) Logger.info(`[SubShelf] Removed ${result.removed.length} unsubscribed channel(s)`);
    if (result?.changed) await SidebarManager.render();
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
    const handle = normalizeHandle(handleMatch[1]);

    const handleToUcId = await SubDeckStorage.getHandleToUcIdMap();
    const ucId = handleToUcId[handle];
    if (!ucId) return;

    await SubDeckStorage.removeChannel(ucId);
    await SidebarManager.render();
    Logger.info(`[SubShelf] Removed unsubscribed channel by URL: ${handle} (${ucId})`);
  }

  /**
   * Sends sanitized avatar maps to the service worker, which applies them to fresh storage.
   */
  static async mergeAvatars(avatarMap: Map<string, string>): Promise<void> {
    if (!SubDeckStorage.isContextValid() || avatarMap.size === 0) return;
    try {
      const res = await SubDeckStorage.mergeAvatars(Object.fromEntries(avatarMap));
      if (res?.changed) SidebarManager.render();
    } catch {}
  }

  /** Sends what YouTube's All subscriptions page listed (avatars and descriptions) to the service worker. */
  static async applyChannelsPage(page: ChannelsPageData): Promise<void> {
    if (!SubDeckStorage.isContextValid()) return;
    ChannelExtractor.mergeAvatars(page.avatars);
    await this.mergeAvatars(page.avatars);
    try {
      await SubDeckStorage.mergeChannelDetails(Object.fromEntries(page.descriptions));
    } catch {}
  }

  /**
   * Reads the All subscriptions page when some stored channel has never had its description looked
   * up (and the last lookup is at least `minIntervalMs` old). Gives up quietly after `timeoutMs`,
   * since Auto-AI waits for it.
   */
  static async refreshChannelDescriptions(minIntervalMs: number, timeoutMs = 10_000): Promise<void> {
    if (!SubDeckStorage.isContextValid()) return;
    const channels = Object.values(await SubDeckStorage.getChannels());
    if (!needsDetailsLookup(channels, await SubDeckStorage.getChannelDetailsCheckedAt(), Date.now(), minIntervalMs)) return;
    const page = await Promise.race([
      harvestFromChannelsPage(),
      new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (page) await this.applyChannelsPage(page);
  }
}
