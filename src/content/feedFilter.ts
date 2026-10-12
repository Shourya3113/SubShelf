import { SubDeckStorage } from '@/utils/storage';
import { debounce } from '@/utils/debounce';
import { CategoryDeck } from '@/types';
import { IdNormalizer } from '@/utils/idNormalizer';
import { buildFeedTargets, cardMatches } from '@/utils/feedMatch';

// While a folder filter is active the grid carries FILTERING_CLASS and CSS hides every card except
// those marked MATCH_CLASS, so cards YouTube appends are hidden from the moment they are inserted
// (hiding non-matches after a debounce made each new batch flash the whole feed).
const FILTERING_CLASS = 'subshelf-filtering';
const MATCH_CLASS = 'subshelf-match';
const SHORTS_CLASS = 'subshelf-shorts-hidden';
const PAUSED_CLASS = 'subshelf-loading-paused';
const ACTIVE_KEY = 'subshelf.activeCategoryId';

/** Below this many matches YouTube keeps auto-loading (its continuation stays on screen). */
const MIN_VISIBLE = 12;
/** Cards YouTube may load per "Load more" step before loading is paused for sparse folders. */
const LOAD_BUDGET_STEP = 300;

const onSubscriptionsFeed = () => window.location.pathname.startsWith('/feed/subscriptions');

export class FeedFilter {
  private static activeCategory: CategoryDeck | null = null;
  private static targets = new Set<string>();
  private static hideShorts = false;
  private static observer: MutationObserver | null = null;
  private static bannerId = 'subdeck-feed-banner';
  private static loadedAtStart = 0;
  private static loadBudget = LOAD_BUDGET_STEP;
  private static loadingPaused = false;
  private static scannedCount = 0;

  // ---- Per-tab active folder (sessionStorage is per tab, so tabs no longer clear each other) ----

  static getActiveCategoryId(): string | null {
    try {
      return window.sessionStorage.getItem(ACTIVE_KEY);
    } catch {
      return null;
    }
  }

  static setActiveCategoryId(id: string | null): void {
    try {
      if (id) window.sessionStorage.setItem(ACTIVE_KEY, id);
      else window.sessionStorage.removeItem(ACTIVE_KEY);
    } catch {
      // Storage blocked: the filter still works for this page view
    }
  }

  static getActiveCategory(): CategoryDeck | null {
    return this.activeCategory;
  }

  // ---- Folder filter ----

  static async setCategory(category: CategoryDeck | null): Promise<void> {
    if (!SubDeckStorage.isContextValid()) return;
    this.activeCategory = category;
    this.setActiveCategoryId(category ? category.id : null);

    if (!category) {
      this.clearFilter();
      this.removeBanner();
      this.syncObserver();
      return;
    }

    this.loadedAtStart = this.gridItems().length;
    this.loadBudget = LOAD_BUDGET_STEP;
    await this.refreshTargets();
    this.renderBanner(category);
    this.applyFilter();
    this.syncObserver();
  }

  /** Re-reads the active folder after storage changes (membership edits, rename, deletion). */
  static async refreshFromStorage(): Promise<void> {
    if (!this.activeCategory || !SubDeckStorage.isContextValid()) return;
    const fresh = (await SubDeckStorage.getCategories()).find(c => c.id === this.activeCategory?.id);
    if (!fresh) {
      await this.setCategory(null);
      return;
    }
    this.activeCategory = fresh;
    await this.refreshTargets();
    if (onSubscriptionsFeed()) {
      this.renderBanner(fresh);
      this.applyFilter();
    }
  }

  private static async refreshTargets(): Promise<void> {
    const cat = this.activeCategory;
    if (!cat) return;
    const [channels, handleToUcId] = await Promise.all([
      SubDeckStorage.getChannels(),
      SubDeckStorage.getHandleToUcIdMap(),
    ]);
    this.targets = buildFeedTargets(cat.channelIds, channels, handleToUcId);
  }

  private static feedRoot(): Element | null {
    return document.querySelector('ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer');
  }

  private static gridItems(): HTMLElement[] {
    const root = this.feedRoot();
    return root ? Array.from(root.querySelectorAll<HTMLElement>('ytd-rich-item-renderer, ytd-grid-video-renderer')) : [];
  }

  static applyFilter(): void {
    if (!SubDeckStorage.isContextValid() || !onSubscriptionsFeed()) return;
    this.applyShorts();
    if (!this.activeCategory) return;

    const root = this.feedRoot();
    if (!root) return;

    // Shelves (Shorts, "Latest" headers) never belong to a single folder; CSS hides them while filtering
    root.classList.add(FILTERING_CLASS);

    let visible = 0;
    for (const card of this.gridItems()) {
      if (card.closest('ytd-rich-section-renderer')) continue;
      const anchor = card.querySelector<HTMLAnchorElement>('a[href^="/@"], a[href*="/channel/UC"]');
      const match = anchor ? cardMatches(IdNormalizer.extractFromAnchor(anchor), this.targets) : false;
      card.classList.toggle(MATCH_CLASS, match);
      if (match && !card.classList.contains(SHORTS_CLASS)) visible++;
    }

    this.manageLoading(root, visible);
    this.updateBannerStatus(visible);
  }

  /**
   * Hiding cards pulls YouTube's continuation spinner into view, which makes YouTube load more by
   * itself. For sparse folders that would never stop, so loading pauses after a budget of cards.
   */
  private static manageLoading(root: Element, visible: number): void {
    const loadedSinceStart = this.gridItems().length - this.loadedAtStart;
    const pause = visible < MIN_VISIBLE && loadedSinceStart >= this.loadBudget;
    // A class on the grid (not on each spinner) hides every continuation YouTube appends the moment it
    // is inserted; hiding them one by one after a debounce let YouTube start the next load each time.
    root.classList.toggle(PAUSED_CLASS, pause);
    this.loadingPaused = pause;
    this.scannedCount = this.gridItems().length;
    const loadMore = document.getElementById('subdeck-feed-load-more');
    if (loadMore) loadMore.style.display = pause ? '' : 'none';
  }

  private static loadMore(): void {
    this.loadBudget += LOAD_BUDGET_STEP;
    this.applyFilter();
  }

  static clearFilter(): void {
    document.querySelectorAll(`.${FILTERING_CLASS}`).forEach(el => el.classList.remove(FILTERING_CLASS));
    document.querySelectorAll(`.${MATCH_CLASS}`).forEach(el => el.classList.remove(MATCH_CLASS));
    document.querySelectorAll(`.${PAUSED_CLASS}`).forEach(el => el.classList.remove(PAUSED_CLASS));
    this.loadingPaused = false;
  }

  // ---- Hide Shorts setting ----

  static setHideShorts(hide: boolean): void {
    this.hideShorts = hide;
    this.applyShorts();
    this.syncObserver();
  }

  private static applyShorts(): void {
    if (!this.hideShorts || !onSubscriptionsFeed()) {
      document.querySelectorAll(`.${SHORTS_CLASS}`).forEach(el => el.classList.remove(SHORTS_CLASS));
      return;
    }
    const root = this.feedRoot();
    if (!root) return;
    root.querySelectorAll<HTMLElement>('ytd-rich-section-renderer, ytd-rich-item-renderer').forEach(el => {
      const isShorts = Boolean(el.querySelector('a[href^="/shorts/"], ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2'));
      // Items inside a Shorts shelf are covered by hiding the shelf itself
      if (el.tagName === 'YTD-RICH-ITEM-RENDERER' && el.closest('ytd-rich-section-renderer')) return;
      el.classList.toggle(SHORTS_CLASS, isShorts);
    });
  }

  // ---- Banner ----

  private static updateBannerStatus(count: number): void {
    const statusEl = document.getElementById('subdeck-feed-banner-status');
    if (!statusEl) return;
    if (count > 0) {
      statusEl.textContent = ` — ${count} video${count === 1 ? '' : 's'} shown`;
    } else if (this.loadingPaused) {
      statusEl.textContent = ` — No videos from this folder in your latest ${this.scannedCount} uploads`;
    } else {
      statusEl.textContent = ' — Looking for videos…';
    }
  }

  private static renderBanner(category: CategoryDeck): void {
    this.removeBanner();

    const banner = document.createElement('div');
    banner.id = this.bannerId;
    banner.className = 'subdeck-feed-banner';

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

    labelSpan.appendChild(strongEl);
    labelSpan.appendChild(document.createTextNode(` (${category.channelIds.length} channels)`));

    const statusSpan = document.createElement('span');
    statusSpan.id = 'subdeck-feed-banner-status';
    statusSpan.style.color = 'var(--sd-text-secondary, #aaa)';
    statusSpan.style.fontSize = '12px';

    infoDiv.appendChild(iconSpan);
    infoDiv.appendChild(labelSpan);
    infoDiv.appendChild(statusSpan);

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';

    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.className = 'subdeck-banner-dismiss';
    loadMoreBtn.id = 'subdeck-feed-load-more';
    loadMoreBtn.textContent = 'Load more';
    loadMoreBtn.style.display = 'none';
    loadMoreBtn.addEventListener('click', () => this.loadMore());

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'subdeck-banner-dismiss';
    dismissBtn.id = 'subdeck-feed-clear-btn';
    dismissBtn.textContent = '✕ Show All Videos';
    dismissBtn.addEventListener('click', () => {
      document.querySelectorAll('.subdeck-folder-header').forEach(el => el.classList.remove('active-filter'));
      this.setCategory(null);
    });

    actions.appendChild(loadMoreBtn);
    actions.appendChild(dismissBtn);
    banner.appendChild(infoDiv);
    banner.appendChild(actions);

    const grid = this.feedRoot();
    if (grid?.parentNode) {
      grid.parentNode.insertBefore(banner, grid);
    } else {
      document.body.prepend(banner);
    }
  }

  static removeBanner(): void {
    document.getElementById(this.bannerId)?.remove();
  }

  // ---- Observer: runs only while a folder filter or Hide Shorts needs it ----

  private static syncObserver(): void {
    if ((this.activeCategory || this.hideShorts) && onSubscriptionsFeed()) this.startObserving();
    else this.stopObserving();
  }

  private static observeRetries = 0;

  static startObserving(): void {
    const target = this.feedRoot();
    if (!target) {
      // The grid renders after navigation finishes; wait for it briefly
      if (this.observeRetries++ < 20) setTimeout(() => this.syncObserver(), 500);
      return;
    }
    this.observeRetries = 0;
    if (this.observer) this.observer.disconnect();
    // The banner may have been created before the grid existed (arriving from another page)
    const banner = document.getElementById(this.bannerId);
    if (this.activeCategory && banner?.nextElementSibling !== target) this.renderBanner(this.activeCategory);
    this.applyFilter();

    const debouncedFilter = debounce(() => this.applyFilter(), 200);
    this.observer = new MutationObserver((mutations) => {
      if (mutations.some(m => m.addedNodes.length > 0)) debouncedFilter();
    });
    this.observer.observe(target, { childList: true, subtree: true });
  }

  static stopObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /** Called on every navigation: re-applies or tears down feed state for the current page. */
  static async onNavigation(categories: CategoryDeck[]): Promise<void> {
    if (!onSubscriptionsFeed()) {
      this.activeCategory = null;
      this.setActiveCategoryId(null);
      this.clearFilter();
      this.applyShorts();
      this.removeBanner();
      this.stopObserving();
      return;
    }
    const id = this.getActiveCategoryId();
    const cat = id ? categories.find(c => c.id === id) : undefined;
    if (cat) {
      await this.setCategory(cat);
    } else {
      if (id) this.setActiveCategoryId(null);
      this.applyShorts();
      this.syncObserver();
    }
  }
}
