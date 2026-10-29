import { SidebarManager } from './sidebarManager';
import { HealthMonitor } from './healthMonitor';
import { FeedFilter } from './feedFilter';
import { SubscriptionSync } from './subscriptionSync';
import { ChannelExtractor } from './channelExtractor';
import { NewUploads } from './newUploads';
import { SubDeckStorage } from '@/utils/storage';
import { debounce } from '@/utils/debounce';
import { Logger } from '@/utils/logger';
import { sanitizeAvatarMap } from '@/utils/avatarUrl';
import { harvestAvatarsFromDom, harvestFromChannelsPage } from '@/utils/avatarHarvest';
import { DETAILS_RECHECK_MS, needsDetailsLookup } from '@/utils/channelDetails';
import { ALL_SUBSCRIPTIONS_RECHECK_MS } from './subscriptionSync';

class SubShelfCoordinator {
  static init(): void {
    Logger.info('Initializing SubShelf Coordinator');
    SidebarManager.listenForFilterChanges();

    // YouTube's "new videos" dots: redraw the sidebar when they change, and clear a channel's dot
    // once the user opens it, wherever on YouTube (YouTube clears its own the same way)
    NewUploads.onChange(() => SidebarManager.render());
    NewUploads.onChange(() => FeedFilter.refreshChips());
    window.addEventListener('yt-navigate-finish', async () => {
      if (NewUploads.isEmpty || !SubDeckStorage.isContextValid()) return;
      try {
        NewUploads.clearForPath(window.location.pathname, (await SubDeckStorage.getAll()).channels);
      } catch {}
    });

    // Secure avatar broadcasts handling
    const handleAvatars = (payload: unknown) => {
      if (!SubDeckStorage.isContextValid()) return;
      const map = sanitizeAvatarMap(payload);
      if (map.size === 0) return;
      ChannelExtractor.mergeAvatars(map);
      SubscriptionSync.mergeAvatars(map);
    };

    // Secure channel broadcasts handling from YouTube's initial guide payload
    const handleChannels = (payload: unknown) => {
      if (!SubDeckStorage.isContextValid()) return;
      if (!Array.isArray(payload) || payload.length === 0) return;
      SubscriptionSync.syncInitialChannels(payload);
    };

    document.addEventListener('subshelf-avatars-broadcast', (e) => handleAvatars((e as CustomEvent).detail));
    document.addEventListener('subshelf-channels-broadcast', (e) => handleChannels((e as CustomEvent).detail));

    window.addEventListener('message', (e) => {
      if (e.source !== window || e.origin !== location.origin) return;
      if (e.data?.type === 'SUBSHELF_AVATARS_BROADCAST') {
        handleAvatars(e.data.avatars);
      } else if (e.data?.type === 'SUBSHELF_CHANNELS_BROADCAST') {
        handleChannels(e.data.channels);
      } else if (e.data?.type === 'SUBSHELF_NEW_UPLOADS') {
        NewUploads.apply(e.data.seq, e.data.keys);
      } else if (e.data?.type === 'SUBSHELF_SUBSCRIPTION_CHANGED' && Array.isArray(e.data.changes)) {
        // Subscribe/unsubscribe clicks, as confirmed by YouTube's own response (see injectedMain)
        for (const c of e.data.changes.slice(0, 20)) {
          if (c && typeof c.channelId === 'string' && typeof c.subscribed === 'boolean') {
            SubscriptionSync.applySubscriptionChange(c.channelId, c.subscribed);
          }
        }
      }
    });

    const requestAvatars = () => {
      try {
        document.dispatchEvent(new CustomEvent('subshelf-request-avatars'));
        window.postMessage({ type: 'SUBSHELF_REQUEST_AVATARS' }, location.origin);
      } catch {}
    };

    requestAvatars();
    setTimeout(requestAvatars, 800);
    setTimeout(requestAvatars, 2000);

    const applyHarvest = (map: Map<string, string>) => {
      if (!SubDeckStorage.isContextValid() || map.size === 0) return;
      ChannelExtractor.mergeAvatars(map);
      SubscriptionSync.mergeAvatars(map);
    };
    const harvest = () => applyHarvest(harvestAvatarsFromDom());

    [1500, 3500, 7000, 12000].forEach(ms => setTimeout(harvest, ms));
    document.addEventListener('yt-navigate-finish', () => setTimeout(harvest, 1200));

    // One-time catch-up, after the first harvests had a chance: YouTube's All subscriptions page
    // fills in channels still without a logo and descriptions never looked up (re-checked at most
    // daily, as some channels are never listed there), and every few hours it is the full list that
    // catches channels unsubscribed on another device.
    setTimeout(async () => {
      if (!SubDeckStorage.isContextValid()) return;
      const all = Object.values((await SubDeckStorage.getAll()).channels ?? {});
      const now = Date.now();
      const checkedAt = await SubDeckStorage.getChannelDetailsCheckedAt();
      const listDue = now - (await SubDeckStorage.getAllSubscriptionsCheckedAt()) >= ALL_SUBSCRIPTIONS_RECHECK_MS;
      if (!listDue && !all.some(c => !c.avatarUrl) && !needsDetailsLookup(all, checkedAt, now, DETAILS_RECHECK_MS)) return;
      const page = await harvestFromChannelsPage();
      if (!page) return;
      // Channels the list adds need their records before descriptions can be stored on them
      if (listDue) await SubscriptionSync.syncFullList(page);
      await SubscriptionSync.applyChannelsPage(page);
    }, 15000);

    window.addEventListener('yt-navigate-start', (e: any) => {
      const url = e?.detail?.url || window.location.pathname;
      if (!url.startsWith('/feed/subscriptions')) {
        SidebarManager.clearActiveFilterHighlight();
        FeedFilter.removeBanner();
      }
    });
    window.addEventListener('yt-navigate-finish', this.handleNavigation);
    window.addEventListener('yt-page-data-updated', this.handleDataUpdate);

    // Cross-tab sync: re-render sidebar when storage changes from another tab or popup
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (!SubDeckStorage.isContextValid()) return;
        if (area !== 'local') return;
        if (changes.categories || changes.channels) {
          SidebarManager.render();
        }
        if (changes.categories || changes.channels || changes.handleToUcId) {
          FeedFilter.refreshFromStorage();
        }
        if (changes.settings) {
          FeedFilter.setHideShorts(Boolean(changes.settings.newValue?.hideShortsFromFeed));
        }
      });
    } catch {}

    SubDeckStorage.getSettings()
      .then(s => FeedFilter.setHideShorts(Boolean(s.hideShortsFromFeed)))
      .catch(() => {});

    // A confirm dialog can be anything (delete playlist, clear history, ...), so it only triggers a
    // sync; sync removals are guarded, and explicit unsubscribes are handled via yt-action below.
    document.addEventListener('click', (e) => {
      if (!SubDeckStorage.isContextValid()) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('#confirm-button, yt-confirm-dialog-renderer #confirm-button')) {
        setTimeout(() => {
          if (!SubDeckStorage.isContextValid()) return;
          SubscriptionSync.diffAndSync();
        }, 2000);
      }
    });

    // Visibility-change fallback: sync when user switches back to YouTube tab
    document.addEventListener('visibilitychange', () => {
      if (!SubDeckStorage.isContextValid()) return;
      if (document.visibilityState === 'visible') {
        setTimeout(() => {
          if (!SubDeckStorage.isContextValid()) return;
          SubscriptionSync.diffAndSync();
        }, 500);
      }
    });

    this.waitForYouTubeReady();
  }

  static waitForYouTubeReady(): void {
    // If ytd-app already exists, execute immediately without creating a mutation observer
    if (document.querySelector('ytd-app')) {
      this.handleNavigation();
      return;
    }

    let timeoutId: number | null = null;
    const observer = new MutationObserver((_, obs) => {
      if (document.querySelector('ytd-app')) {
        if (timeoutId) clearTimeout(timeoutId);
        obs.disconnect();
        this.handleNavigation();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Safety timeout: disconnect after 8 seconds if ytd-app never mounts
    timeoutId = window.setTimeout(() => {
      observer.disconnect();
    }, 8000);
  }

  static handleNavigation = debounce(async () => {
    if (!SubDeckStorage.isContextValid()) return;
    try {
      if (!HealthMonitor.validateSelectors()) {
        HealthMonitor.showDegradationBanner();
      } else {
        HealthMonitor.hideDegradationBanner();
        await SidebarManager.ensureInjected();

        // If storage has no channels yet, expand native subscriptions so full channel list mounts
        const currentChannelCount = Object.keys(await SubDeckStorage.getChannels()).length;
        if (currentChannelCount === 0) {
          ChannelExtractor.autoExpandNativeSubscriptions();
        }
        await SubscriptionSync.diffAndSync();

        // Feed filter state is per tab: re-apply it on the subscriptions feed, tear it down elsewhere
        await FeedFilter.onNavigation(await SubDeckStorage.getCategories());
        if (!window.location.pathname.startsWith('/feed/subscriptions')) {
          SidebarManager.clearActiveFilterHighlight();
        }
      }
    } catch (err) {
      Logger.error('Navigation handler error:', err);
    }
  }, 350);

  static handleDataUpdate = debounce(async () => {
    if (!SubDeckStorage.isContextValid()) return;
    try {
      await SubscriptionSync.diffAndSync();
      if (window.location.pathname.startsWith('/feed/subscriptions')) {
        FeedFilter.applyFilter();
      }
    } catch (err) {
      Logger.error('Data update error:', err);
    }
  }, 350);
}

SubShelfCoordinator.init();
