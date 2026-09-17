import { SidebarManager } from './sidebarManager';
import { HealthMonitor } from './healthMonitor';
import { FeedFilter } from './feedFilter';
import { SubscriptionSync } from './subscriptionSync';
import { ChannelExtractor } from './channelExtractor';
import { SubDeckStorage } from '@/utils/storage';
import { debounce } from '@/utils/debounce';
import { Logger } from '@/utils/logger';

class SubDeckCoordinator {
  static init(): void {
    Logger.info('Initializing SubShelf Coordinator');

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
        if (area === 'local' && (changes.categories || changes.channels)) {
          SidebarManager.render();
        }
      });
    } catch {}

    // Detect unsubscribe confirmation dialog clicks on YouTube pages
    document.addEventListener('click', (e) => {
      if (!SubDeckStorage.isContextValid()) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const confirmBtn = target.closest('#confirm-button, yt-confirm-dialog-renderer #confirm-button');
      if (confirmBtn) {
        // Unsubscribe confirmed — remove channel by current page URL and also run full sync
        const currentUrl = window.location.href;
        setTimeout(() => {
          if (!SubDeckStorage.isContextValid()) return;
          SubscriptionSync.removeChannelByUrl(currentUrl);
        }, 800);
        setTimeout(() => {
          if (!SubDeckStorage.isContextValid()) return;
          SubscriptionSync.diffAndSync();
        }, 2000);
      }
    });

    // Real-time subscribe/unsubscribe detection via YouTube's internal action events
    document.addEventListener('yt-action', ((e: CustomEvent) => {
      if (!SubDeckStorage.isContextValid()) return;
      const actionName = e.detail?.actionName;
      if (!actionName) return;

      if (actionName === 'yt-subscribe' || actionName === 'yt-subscribe-endpoint') {
        Logger.info('[SubShelf] Subscribe action detected');
        // Delay to let YouTube's sidebar update, then sync (picks up new channel + auto-categorizes)
        setTimeout(() => {
          if (!SubDeckStorage.isContextValid()) return;
          ChannelExtractor.autoExpandNativeSubscriptions(true);
          SubscriptionSync.diffAndSync();
        }, 1500);
        // Second pass after sidebar fully renders
        setTimeout(() => {
          if (!SubDeckStorage.isContextValid()) return;
          SubscriptionSync.diffAndSync();
        }, 3500);
      }

      if (actionName === 'yt-unsubscribe' || actionName === 'yt-unsubscribe-endpoint') {
        Logger.info('[SubShelf] Unsubscribe action detected');
        const currentUrl = window.location.href;
        setTimeout(() => {
          if (!SubDeckStorage.isContextValid()) return;
          SubscriptionSync.removeChannelByUrl(currentUrl);
        }, 800);
        setTimeout(() => {
          if (!SubDeckStorage.isContextValid()) return;
          SubscriptionSync.diffAndSync();
        }, 2500);
      }
    }) as EventListener);

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
        await SubscriptionSync.diffAndSync();

        // Manage feed filter state across navigation
        if (window.location.pathname.startsWith('/feed/subscriptions')) {
          const state = await SubDeckStorage.getAll();
          if (state.activeCategoryId) {
            const cat = state.categories.find(c => c.id === state.activeCategoryId);
            if (cat) {
              await FeedFilter.setCategory(cat);
            }
          }
        } else {
          // Outside subscriptions page, cleanly tear down feed filter, observer, and banner
          await SubDeckStorage.setAll({ activeCategoryId: null });
          FeedFilter.clearFilter();
          FeedFilter.removeBanner();
          FeedFilter.stopObserving();
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

SubDeckCoordinator.init();
