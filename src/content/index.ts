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

    // Listen to category filter events from the sidebar
    document.addEventListener('subdeck-filter-category', (e: Event) => {
      const customEvent = e as CustomEvent;
      FeedFilter.setCategory(customEvent.detail);
    });

    window.addEventListener('yt-navigate-finish', this.handleNavigation);
    window.addEventListener('yt-page-data-updated', this.handleDataUpdate);
    this.waitForYouTubeReady();
  }

  static waitForYouTubeReady(): void {
    const observer = new MutationObserver((_, obs) => {
      if (document.querySelector('ytd-app')) {
        obs.disconnect();
        this.handleNavigation();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  static handleNavigation = debounce(async () => {
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
        // Outside the subscriptions page, clean up feed filter and banner
        FeedFilter.clearFilter();
      }
    }
  }, 350);

  static handleDataUpdate = debounce(async () => {
    await SubscriptionSync.diffAndSync();
    if (window.location.pathname.startsWith('/feed/subscriptions')) {
      FeedFilter.applyFilter();
    }
  }, 350);
}

SubDeckCoordinator.init();
