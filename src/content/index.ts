import { SidebarManager } from './sidebarManager';
import { HealthMonitor } from './healthMonitor';
import { FeedFilter } from './feedFilter';
import { SubscriptionSync } from './subscriptionSync';
import { SubDeckStorage } from '@/utils/storage';
import { debounce } from '@/utils/debounce';
import { Logger } from '@/utils/logger';

class SubDeckCoordinator {
  static init(): void {
    Logger.info('Initializing SubDeck Coordinator');

    window.addEventListener('yt-navigate-finish', this.handleNavigation);
    window.addEventListener('yt-page-data-updated', this.handleDataUpdate);
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
          FeedFilter.clearFilter();
          FeedFilter.removeBanner();
          FeedFilter.stopObserving();
        }
      }
    } catch (err) {
      Logger.error('[SubDeck] Navigation handler error:', err);
    }
  }, 350);

  static handleDataUpdate = debounce(async () => {
    try {
      await SubscriptionSync.diffAndSync();
      if (window.location.pathname.startsWith('/feed/subscriptions')) {
        FeedFilter.applyFilter();
      }
    } catch (err) {
      Logger.error('[SubDeck] Data update error:', err);
    }
  }, 350);
}

SubDeckCoordinator.init();
