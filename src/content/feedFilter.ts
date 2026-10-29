import { SubDeckStorage } from '@/utils/storage';
import { debounce } from '@/utils/debounce';
import { CategoryDeck } from '@/types';
import { IdNormalizer } from '@/utils/idNormalizer';
import { buildFeedTargets, cardMatches } from '@/utils/feedMatch';
import { NewUploads } from './newUploads';

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

/** Fired on document when the active folder changes (detail: folder ID or null), e.g. from a chip. */
export const FILTER_CHANGED_EVENT = 'subshelf-filter-changed';

export class FeedFilter {
  private static activeCategory: CategoryDeck | null = null;
  private static targets = new Set<string>();
  private static hideShorts = false;
  private static observer: MutationObserver | null = null;
  private static bannerId = 'subdeck-feed-banner';
  private static folders: CategoryDeck[] = [];
  private static barRetries = 0;
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
    document.dispatchEvent(new CustomEvent(FILTER_CHANGED_EVENT, { detail: category ? category.id : null }));

    if (!category) {
      this.clearFilter();
      this.renderBar();
      this.syncObserver();
      return;
    }

    this.loadedAtStart = this.gridItems().length;
    this.loadBudget = LOAD_BUDGET_STEP;
    await this.refreshTargets();
    this.renderBar();
    this.applyFilter();
    this.syncObserver();
  }

  /** Re-reads folders after storage changes (new/renamed/deleted folders, membership edits). */
  static async refreshFromStorage(): Promise<void> {
    if (!SubDeckStorage.isContextValid()) return;
    this.folders = await SubDeckStorage.getCategories();
    if (this.activeCategory) {
      const fresh = this.folders.find(c => c.id === this.activeCategory?.id);
      if (!fresh) {
        await this.setCategory(null);
        return;
      }
      this.activeCategory = fresh;
      await this.refreshTargets();
    }
    if (onSubscriptionsFeed()) {
      this.renderBar();
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

  // ---- Folder chips (YouTube-style "All · Tech · Gaming …" row above the feed) ----

  private static updateBannerStatus(count: number): void {
    const statusEl = document.getElementById('subdeck-feed-banner-status');
    if (!statusEl) return;
    if (!this.activeCategory) {
      statusEl.textContent = '';
    } else if (count > 0) {
      const looking = count < MIN_VISIBLE && !this.loadingPaused ? ' · looking for more…' : '';
      statusEl.textContent = `${count} video${count === 1 ? '' : 's'}${looking}`;
    } else if (this.loadingPaused) {
      statusEl.textContent = `None in your latest ${this.scannedCount} uploads`;
    } else {
      statusEl.textContent = 'Looking for videos…';
    }
  }

  /** Redraws the chips (e.g. when the new-video dots change); does nothing if the bar isn't shown. */
  static refreshChips(): void {
    if (document.getElementById(this.bannerId)) this.renderBar();
  }

  private static buildChip(label: string, emoji: string | null, active: boolean, onClick: () => void, hasNew = false): HTMLButtonElement {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'subdeck-chip';
    chip.setAttribute('aria-pressed', String(active));
    if (emoji) {
      const e = document.createElement('span');
      e.className = 'subdeck-chip-emoji';
      e.setAttribute('aria-hidden', 'true');
      e.textContent = emoji;
      chip.appendChild(e);
    }
    chip.appendChild(document.createTextNode(label));
    if (hasNew) {
      const dot = document.createElement('span');
      dot.className = 'subdeck-new-dot';
      dot.setAttribute('aria-hidden', 'true');
      chip.appendChild(dot);
      chip.title = `${label} has new videos`;
    }
    chip.addEventListener('click', onClick);
    return chip;
  }

  /** Renders (or refreshes) the chip row above the grid; waits briefly if the grid isn't there yet. */
  private static renderBar(): void {
    if (!onSubscriptionsFeed() || this.folders.length === 0) {
      this.removeBanner();
      return;
    }
    const grid = this.feedRoot();
    if (!grid?.parentNode) {
      if (this.barRetries++ < 20) setTimeout(() => this.renderBar(), 500);
      return;
    }
    this.barRetries = 0;

    const activeId = this.activeCategory?.id ?? null;
    const bar = document.createElement('div');
    bar.id = this.bannerId;
    bar.className = 'subdeck-chipbar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Filter subscriptions by folder');

    const chips = document.createElement('div');
    chips.className = 'subdeck-chips';
    chips.appendChild(this.buildChip('All', null, activeId === null, () => {
      if (this.activeCategory) this.setCategory(null);
    }));
    for (const folder of [...this.folders].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const hasNew = folder.channelIds.some(id => NewUploads.has({ ucId: id, handle: id }));
      chips.appendChild(this.buildChip(folder.name, folder.icon, folder.id === activeId, () => {
        if (this.activeCategory?.id !== folder.id) this.setCategory(folder);
      }, hasNew));
    }

    const status = document.createElement('div');
    status.className = 'subdeck-chip-status';
    const statusText = document.createElement('span');
    statusText.id = 'subdeck-feed-banner-status';
    statusText.setAttribute('aria-live', 'polite');
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.type = 'button';
    loadMoreBtn.className = 'subdeck-chip subdeck-chip-outline';
    loadMoreBtn.id = 'subdeck-feed-load-more';
    loadMoreBtn.textContent = 'Load more';
    loadMoreBtn.style.display = this.loadingPaused ? '' : 'none';
    loadMoreBtn.addEventListener('click', () => this.loadMore());
    status.append(statusText, loadMoreBtn);

    bar.append(chips, status);

    // Keep the horizontal scroll position when refreshing an existing bar
    const existing = document.getElementById(this.bannerId);
    const scrollLeft = existing?.querySelector('.subdeck-chips')?.scrollLeft ?? 0;
    existing?.remove();
    // Pin it right under the masthead as measured. YouTube's --ytd-masthead-height is 112px on the
    // subscriptions page (it counts a chip row YouTube doesn't show there), and sticking at 112px
    // pushed the bar down out of its own space onto the first row of thumbnails.
    const masthead = document.getElementById('masthead-container')?.getBoundingClientRect().height;
    if (masthead && masthead > 0 && masthead < 200) bar.style.top = `${Math.round(masthead)}px`;
    grid.parentNode.insertBefore(bar, grid);
    chips.scrollLeft = scrollLeft;
    // Bring the active chip into view horizontally only (scrollIntoView could also scroll the page)
    const active = chips.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (active && (active.offsetLeft < chips.scrollLeft || active.offsetLeft + active.offsetWidth > chips.scrollLeft + chips.clientWidth)) {
      chips.scrollLeft = Math.max(0, active.offsetLeft - 16);
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
    // The chip row may have been rendered before the grid existed (arriving from another page)
    if (document.getElementById(this.bannerId)?.nextElementSibling !== target) this.renderBar();
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
    this.folders = categories;
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
      this.activeCategory = null;
      this.renderBar();
      this.applyShorts();
      this.syncObserver();
    }
  }
}
