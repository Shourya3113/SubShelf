import { YT_SELECTORS } from '@/config/selectors';
import { SubDeckStorage } from '@/utils/storage';
import { debounce } from '@/utils/debounce';
import { CategoryDeck } from '@/types';
import { IdNormalizer } from '@/utils/idNormalizer';

export class FeedFilter {
  private static activeCategory: CategoryDeck | null = null;
  private static observer: MutationObserver | null = null;
  private static bannerId = 'subdeck-feed-banner';
  private static isScrolling = false;

  static async setCategory(category: CategoryDeck | null): Promise<void> {
    this.activeCategory = category;
    await SubDeckStorage.setAll({ activeCategoryId: category ? category.id : null });

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

    // If fewer than 6 videos are visible, automatically pull more content from YouTube
    if (visibleCount < 6 && !this.isScrolling) {
      this.triggerInfiniteScroll();
    }
  }

  static clearFilter(): void {
    const cards = document.querySelectorAll<HTMLElement>(
      `${YT_SELECTORS.richItemRenderer}, ${YT_SELECTORS.richSectionRenderer}, ytd-grid-video-renderer`
    );
    cards.forEach(card => {
      card.style.display = '';
    });
  }

  private static triggerInfiniteScroll = debounce(() => {
    if (!window.location.pathname.startsWith('/feed/subscriptions')) return;
    this.isScrolling = true;

    // Scroll down to trigger YouTube's native continuation loader
    window.scrollBy({ top: 1200, behavior: 'smooth' });

    setTimeout(() => {
      this.isScrolling = false;
      this.applyFilter();
    }, 800);
  }, 300);

  private static renderBanner(category: CategoryDeck): void {
    this.removeBanner();

    const banner = document.createElement('div');
    banner.id = this.bannerId;
    banner.className = 'subdeck-feed-banner';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">${category.icon}</span>
        <span>Showing: <strong style="color: #3ea6ff;">${category.name}</strong> (${category.channelIds.length} channels)</span>
      </div>
      <button class="subdeck-banner-dismiss" id="subdeck-feed-clear-btn">✕ Show All Videos</button>
    `;

    const clearBtn = banner.querySelector('#subdeck-feed-clear-btn');
    clearBtn?.addEventListener('click', () => {
      document.querySelectorAll('.subdeck-folder-header').forEach(el => el.classList.remove('active-filter'));
      this.setCategory(null);
    });

    // Insert banner above the rich grid or page manager contents
    const grid = document.querySelector('ytd-rich-grid-renderer #contents') ||
                 document.querySelector('ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer') ||
                 document.querySelector('ytd-rich-grid-renderer');

    if (grid?.parentNode) {
      grid.parentNode.insertBefore(banner, grid);
    } else {
      document.body.prepend(banner);
    }
  }

  private static removeBanner(): void {
    document.getElementById(this.bannerId)?.remove();
  }

  private static startObserving(): void {
    if (this.observer) return;

    const debouncedFilter = debounce(() => this.applyFilter(), 200);
    this.observer = new MutationObserver((mutations) => {
      // Only react if video cards were added
      let hasAddedNodes = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          hasAddedNodes = true;
          break;
        }
      }
      if (hasAddedNodes) debouncedFilter();
    });

    const target = document.querySelector('ytd-rich-grid-renderer') || document.body;
    this.observer.observe(target, { childList: true, subtree: true });
  }

  private static stopObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
