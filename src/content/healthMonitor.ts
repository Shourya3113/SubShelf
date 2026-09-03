import { YT_SELECTORS } from '@/config/selectors';

export class HealthMonitor {
  static validateSelectors(): boolean {
    const hasGuide = !!(
      document.querySelector(YT_SELECTORS.guideRenderer) ||
      document.querySelector('ytd-mini-guide-renderer') ||
      document.querySelector('#guide')
    );
    const hasPageManager = !!document.querySelector(YT_SELECTORS.pageManager);
    return hasGuide && hasPageManager;
  }

  static showDegradationBanner(): void {
    if (document.getElementById('subdeck-degradation-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'subdeck-degradation-banner';
    banner.className = 'subdeck-degradation-banner';

    const msgSpan = document.createElement('span');
    msgSpan.textContent = '⚠️ YouTube layout has changed. SubDeck is running in degraded mode.';

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'subdeck-banner-dismiss';
    dismissBtn.id = 'subdeck-dismiss-btn';
    dismissBtn.textContent = '✕';
    dismissBtn.addEventListener('click', () => {
      banner.remove();
    });

    banner.appendChild(msgSpan);
    banner.appendChild(dismissBtn);

    const masthead = document.getElementById('masthead-container');
    if (masthead?.nextSibling) {
      masthead.parentNode?.insertBefore(banner, masthead.nextSibling);
    } else {
      document.body.prepend(banner);
    }
  }

  static hideDegradationBanner(): void {
    document.getElementById('subdeck-degradation-banner')?.remove();
  }
}
