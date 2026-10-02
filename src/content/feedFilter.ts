import { YT_SELECTORS } from '@/config/selectors';
import { SubDeckStorage } from '@/utils/storage';
import { debounce } from '@/utils/debounce';
import { CategoryDeck } from '@/types';
import { IdNormalizer } from '@/utils/idNormalizer';

export class FeedFilter {
  private static activeCategory: CategoryDeck | null = null;
  private static observer: MutationObserver | null = null;
  private static bannerId = 'subdeck-feed-banner';

  static async setCategory(category: CategoryDeck | null): Promise<void> {
    if (!SubDeckStorage.isContextValid()) return;
    this.activeCategory = category;
    await SubDeckStorage.setActiveCategoryId(category ? category.id : null);

    if (!category) {
      this.clearFilter();
      this.removeBanner();
      this.stopObserving();
      return;
    }

    this.renderBanner(category);
    this.applyFilter();
    this.startObserving();
  }

  static getActiveCategory(): CategoryDeck | null {
    return this.activeCategory;
  }

  static applyFilter(): void {
    if (!SubDeckStorage.isContextValid()) return;
    if (!window.location.pathname.startsWith('/feed/subscriptions')) return;
    if (!this.activeCategory) return;

    const cards = document.querySelectorAll<HTMLElement>(
      `${YT_SELECTORS.richItemRenderer}, ${YT_SELECTORS.richSectionRenderer}, ytd-grid-video-renderer`
    );

    if (cards.length === 0) return;

    const targetChannelIds = new Set(this.activeCategory.channelIds);
    let visibleCount = 0;

    cards.forEach(card => {
      // Handle Shorts shelf or rich section
      if (card.tagName.toLowerCase() === YT_SELECTORS.richSectionRenderer.toLowerCase()) {
        card.style.display = 'none';
        return;
      }

      const anchor = card.querySelector<HTMLAnchorElement>(
        `${YT_SELECTORS.channelNameLink}, #channel-name a, a[href*="/@"], a[href*="/channel/"]`
      );

      if (!anchor) {
        card.style.display = 'none';
        return;
      }

      const { ucId, handle } = IdNormalizer.extractFromAnchor(anchor);
      const isMatch =
        (ucId && targetChannelIds.has(ucId)) ||
        (handle && targetChannelIds.has(handle));

      if (isMatch) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    this.updateBannerStatus(visibleCount);
  }

  static clearFilter(): void {
    const cards = document.querySelectorAll<HTMLElement>(
      `${YT_SELECTORS.richItemRenderer}, ${YT_SELECTORS.richSectionRenderer}, ytd-grid-video-renderer`
    );
    cards.forEach(card => {
      card.style.display = '';
    });
  }

  private static updateBannerStatus(count: number): void {
    const statusEl = document.getElementById('subdeck-feed-banner-status');
    if (!statusEl) return;
    if (count === 0) {
      statusEl.textContent = ' — No matching videos loaded yet (scroll down to load more)';
    } else {
      statusEl.textContent = ` — ${count} video${count === 1 ? '' : 's'} shown`;
    }
  }

  private static renderBanner(category: CategoryDeck): void {
    this.removeBanner();

    const banner = document.createElement('div');
    banner.id = this.bannerId;
    banner.className = 'subdeck-feed-banner';

    // Safe DOM construction — 0 innerHTML
    const infoDiv = document.createElement('div');
    infoDiv.style.display = 'flex';
    infoDiv.style.alignItems = 'center';
    infoDiv.style.gap = '8px';
    infoDiv.style.flexWrap = 'wrap';

    const iconSpan = document.createElement('span');
    iconSpan.style.fontSize = '16px';
    iconSpan.textContent = category.icon;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = 'Showing: ';

    const strongEl = document.createElement('strong');
    strongEl.style.color = 'var(--sd-brand-blue, #065fd4)';
    strongEl.textContent = category.name;

    const countText = document.createTextNode(` (${category.channelIds.length} channels)`);

    labelSpan.appendChild(strongEl);
    labelSpan.appendChild(countText);

    const statusSpan = document.createElement('span');
    statusSpan.id = 'subdeck-feed-banner-status';
    statusSpan.style.color = 'var(--sd-text-secondary, #aaa)';
    statusSpan.style.fontSize = '12px';

    infoDiv.appendChild(iconSpan);
    infoDiv.appendChild(labelSpan);
    infoDiv.appendChild(statusSpan);

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'subdeck-banner-dismiss';
    dismissBtn.id = 'subdeck-feed-clear-btn';
    dismissBtn.textContent = '✕ Show All Videos';
    dismissBtn.addEventListener('click', () => {
      document.querySelectorAll('.subdeck-folder-header').forEach(el => el.classList.remove('active-filter'));
      this.setCategory(null);
    });

    banner.appendChild(infoDiv);
    banner.appendChild(dismissBtn);

    const grid =
      document.querySelector('ytd-rich-grid-renderer #contents') ||
      document.querySelector('ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer') ||
      document.querySelector('ytd-rich-grid-renderer');

    if (grid?.parentNode) {
      grid.parentNode.insertBefore(banner, grid);
    } else {
      document.body.prepend(banner);
    }
  }

  static removeBanner(): void {
    document.getElementById(this.bannerId)?.remove();
  }

  static startObserving(): void {
    if (this.observer) return;

    const debouncedFilter = debounce(() => this.applyFilter(), 200);
    this.observer = new MutationObserver((mutations) => {
      let hasAddedNodes = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          hasAddedNodes = true;
          break;
        }
      }
      if (hasAddedNodes) debouncedFilter();
    });

    const target =
      document.querySelector('ytd-rich-grid-renderer') ||
      document.querySelector('ytd-browse[page-subtype="subscriptions"]') ||
      document.querySelector('#contents');

    if (target) {
      this.observer.observe(target, { childList: true, subtree: true });
    }
  }

  static stopObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
