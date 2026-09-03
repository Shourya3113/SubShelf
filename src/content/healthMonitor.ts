import { YT_SELECTORS } from '@/config/selectors';

export class HealthMonitor {
  static validateSelectors(): boolean {
    const required = [YT_SELECTORS.pageManager, YT_SELECTORS.guideRenderer];
    for (const sel of required) {
      if (!document.querySelector(sel)) return false;
    }
    return true;
  }

  static showDegradationBanner(): void {
    if (document.getElementById('subdeck-degradation-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'subdeck-degradation-banner';
    banner.className = 'subdeck-degradation-banner';
    banner.innerHTML = `
      <span>⚠️ YouTube layout has changed. SubDeck is running in degraded mode.</span>
      <button class="subdeck-banner-dismiss" id="subdeck-dismiss-btn">✕</button>
    `;
    banner.querySelector('#subdeck-dismiss-btn')?.addEventListener('click', () => {
      banner.remove();
    });
    document.body.prepend(banner);
  }

  static hideDegradationBanner(): void {
    document.getElementById('subdeck-degradation-banner')?.remove();
  }
}
