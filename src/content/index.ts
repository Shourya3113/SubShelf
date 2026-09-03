import { SidebarManager } from './sidebarManager';
import { HealthMonitor } from './healthMonitor';
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
      await SidebarManager.syncWithNativeSubscriptions();
    }
  }, 400);

  static handleDataUpdate = debounce(async () => {
    await SidebarManager.syncWithNativeSubscriptions();
  }, 400);
}

SubDeckCoordinator.init();
