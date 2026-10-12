import { getSubscriptionSection } from '@/config/selectors';
import { SubDeckStorage } from '@/utils/storage';
import { ChannelExtractor } from './channelExtractor';
import { AICategorizer } from '@/ai/categorizer';
import { FeedFilter } from './feedFilter';
import { CategoryDeck } from '@/types';
import { debounce } from '@/utils/debounce';
import { SubscriptionSync } from './subscriptionSync';
import { Logger } from '@/utils/logger';
import { DETAILS_RECHECK_ON_DEMAND_MS } from '@/utils/channelDetails';
import { buildActionCard, buildFirstRunCard, setAutoSortLabel } from './sidebar/actionCard';
import { buildFolder, DroppedChannel, FolderHandlers, FolderMember } from './sidebar/folderView';
import { IdNormalizer } from '@/utils/idNormalizer';
import { resolveChannelId } from '@/utils/channelIdentity';
import { FILTER_CHANGED_EVENT } from './feedFilter';

const byTitle = (a: FolderMember, b: FolderMember) =>
  a.channel.title.localeCompare(b.channel.title, undefined, { sensitivity: 'base' });

export class SidebarManager {
  private static containerId = 'subdeck-sidebar-container';
  private static observer: MutationObserver | null = null;
  private static retryCount = 0;
  private static retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private static isInjecting = false;
  private static pendingInject = false;
  private static isRendering = false;
  private static pendingRender = false;

  private static debouncedSync = debounce(async () => {
    if (!SubDeckStorage.isContextValid()) {
      if (SidebarManager.observer) {
        SidebarManager.observer.disconnect();
        SidebarManager.observer = null;
      }
      return;
    }
    await SidebarManager.syncWithNativeSubscriptions();
  }, 300);

  static async ensureInjected(): Promise<void> {
    if (!SubDeckStorage.isContextValid()) return;
    if (this.isInjecting) {
      this.pendingInject = true;
      return;
    }
    this.isInjecting = true;
    try {
      do {
        this.pendingInject = false;
        await this.executeInjection();
      } while (this.pendingInject);
    } finally {
      this.isInjecting = false;
    }
  }

  private static async executeInjection(): Promise<void> {
    if (!SubDeckStorage.isContextValid()) return;
    const subSection = getSubscriptionSection();
      if (!subSection) {
        if (this.retryCount < 6) {
          this.retryCount++;
          if (this.retryTimeout) clearTimeout(this.retryTimeout);
          this.retryTimeout = setTimeout(() => {
            this.retryTimeout = null;
            this.ensureInjected();
          }, 400);
        }
        return;
      }
      this.retryCount = 0;
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }

      // Deduplicate: Clean up any containers not inside active subSection, or extra containers
      const existingContainers = Array.from(document.querySelectorAll<HTMLElement>(`#${this.containerId}`));
      let container: HTMLElement | null = null;

      for (const el of existingContainers) {
        if (subSection.contains(el)) {
          if (!container) {
            container = el;
          } else {
            el.remove();
          }
        } else {
          // Remove stale container from other sections or off-screen drawers
          el.remove();
        }
      }

      if (!container) {
        container = document.createElement('div');
        container.id = this.containerId;
      }

      // Anchor inside subSection (strictly as a child of subSection)
      const itemsContainer = subSection.querySelector('#items');
      if (itemsContainer) {
        if (container.nextElementSibling !== itemsContainer) {
          itemsContainer.parentNode?.insertBefore(container, itemsContainer);
        }
      } else {
        if (subSection.firstElementChild !== container) {
          subSection.insertBefore(container, subSection.firstChild);
        }
      }

      // Clean up old observer if attached to a stale node
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      this.observer = new MutationObserver((mutations) => {
        // Check if any mutation originates from outside our container
        const hasExternal = mutations.some(m => {
          let target: Node | null = m.target;
          while (target) {
            if (target instanceof Element && target.id === this.containerId) return false;
            target = target.parentNode;
          }
          return true;
        });
        if (hasExternal) {
          this.debouncedSync();
        }
      });

      this.observer.observe(subSection, { childList: true, subtree: true });

      await this.render();
  }

  static async render(): Promise<void> {
    if (!SubDeckStorage.isContextValid()) return;
    if (this.isRendering) {
      this.pendingRender = true;
      return;
    }
    this.isRendering = true;
    try {
      do {
        this.pendingRender = false;
        try {
          await this.executeRender();
        } catch (err) {
          Logger.error('Render cycle failed:', err);
        }
      } while (this.pendingRender);
    } finally {
      this.isRendering = false;
    }
  }

  private static async executeRender(): Promise<void> {
    if (!SubDeckStorage.isContextValid()) return;
    const subSection = getSubscriptionSection();
    if (!subSection) return;

    // Prune any rogue containers outside the active subSection
    let container: HTMLElement | null = null;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(`#${this.containerId}`))) {
      if (subSection.contains(el) && !container) {
        container = el;
      } else {
        el.remove();
      }
    }
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      const itemsContainer = subSection.querySelector('#items');
      if (itemsContainer) {
        itemsContainer.parentNode?.insertBefore(container, itemsContainer);
      } else {
        subSection.insertBefore(container, subSection.firstChild);
      }
    }

    // Preserve scroll position and prevent height collapse during re-render
    const guideInner = document.querySelector<HTMLElement>('#guide-inner-content');
    const savedGuideScroll = guideInner ? guideInner.scrollTop : 0;
    if (container.offsetHeight > 0) {
      container.style.minHeight = `${container.offsetHeight}px`;
    }

    // getAll() returns the normalized view: canonical channel records, no system channels, and folders
    // whose IDs are deduplicated and remapped. Nothing here needs to re-filter or re-deduplicate.
    const state = await SubDeckStorage.getAll();
    const entries: FolderMember[] = Object.entries(state.channels).map(([id, channel]) => ({ id, channel }));

    // Fill in avatars YouTube's page data provided for channels stored without one
    const repaired: Record<string, string> = {};
    for (const { id, channel } of entries) {
      if (channel.avatarUrl) continue;
      const found = ChannelExtractor.lookupAvatar(channel);
      if (found) {
        channel.avatarUrl = found;
        repaired[id] = found;
      }
    }
    if (Object.keys(repaired).length > 0) {
      SubDeckStorage.mergeAvatars(repaired).catch(() => {});
    }

    const fragment = document.createDocumentFragment();
    fragment.appendChild(buildActionCard(entries.length, {
      onAutoSort: (button) => this.runAutoAI(button),
      onCreateFolder: (name, icon) => this.createFolder(name, icon),
    }));
    if (state.categories.length === 0) {
      fragment.appendChild(buildFirstRunCard(entries.length, (button) => this.runAutoAI(button)));
    }

    const activeId = window.location.pathname.startsWith('/feed/subscriptions') ? FeedFilter.getActiveCategoryId() : null;
    const handlers = this.folderHandlers();
    for (const cat of [...state.categories].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const inFolder = new Set(cat.channelIds);
      const members = cat.channelIds
        .filter(id => state.channels[id])
        .map(id => ({ id, channel: state.channels[id] }))
        .sort(byTitle);
      const available = entries.filter(m => !inFolder.has(m.id)).sort(byTitle);
      fragment.appendChild(buildFolder(cat, members, available, activeId === cat.id, handlers));
    }

    // Atomic DOM replacement - single operation with zero interleaving window
    container.replaceChildren(fragment);

    // Release minHeight and ensure scroll position was preserved
    requestAnimationFrame(() => {
      if (container) container.style.minHeight = '';
      if (guideInner && guideInner.scrollTop !== savedGuideScroll) {
        guideInner.scrollTop = savedGuideScroll;
      }
    });
  }

  private static folderHandlers(): FolderHandlers {
    const rerenderAfter = (op: Promise<unknown>) => op.then(() => this.render());
    return {
      onOpen: (cat: CategoryDeck, header: HTMLElement) => {
        if (window.location.pathname.startsWith('/feed/subscriptions')) {
          this.clearActiveFilterHighlight();
          header.classList.add('active-filter');
          FeedFilter.setCategory(cat);
        } else {
          FeedFilter.setActiveCategoryId(cat.id);
          this.navigateToSubscriptionsFeed();
        }
      },
      onRename: (cat, name, icon) => rerenderAfter(SubDeckStorage.updateCategory(cat.id, { name, icon })),
      onAddChannel: (cat, id) => rerenderAfter(SubDeckStorage.addChannelToCategory(id, cat.id)),
      onDelete: (cat) => rerenderAfter(SubDeckStorage.deleteCategory(cat.id)),
      onRemoveChannel: (cat, id) => rerenderAfter(SubDeckStorage.removeChannelFromCategory(id, cat.id)),
      onToggle: (cat, collapsed) => SubDeckStorage.updateCategory(cat.id, { isCollapsed: collapsed }),
      onDropChannel: (cat, dropped) => this.moveDroppedChannel(cat, dropped),
    };
  }

  /** Drag & drop: moving a channel onto a folder is a manual correction (the learner uses it). */
  private static async moveDroppedChannel(cat: CategoryDeck, dropped: DroppedChannel): Promise<void> {
    const state = await SubDeckStorage.getAll();
    let id = dropped.channelId;
    if (!id && dropped.url) {
      // A link dragged from YouTube's own subscription list: /@handle or /channel/UC...
      const anchor = document.createElement('a');
      anchor.href = dropped.url;
      if (!/(^|\.)youtube\.com$/.test(anchor.hostname)) return;
      const { ucId, handle } = IdNormalizer.extractFromAnchor(anchor);
      id = ucId || (handle ? resolveChannelId(handle, state.handleToUcId) : undefined);
    }
    const channel = id ? state.channels[id] : undefined;
    if (!id || !channel) {
      this.showToast('That channel isn\'t in your subscriptions yet. Subscribe first, then try again.');
      return;
    }
    if (cat.channelIds.includes(id) && (state.manualAssignments[id] ?? []).join() === cat.id) return;
    await SubDeckStorage.setChannelCategory(id, cat.id);
    await this.render();
    this.showToast(`Moved ${channel.title} to ${cat.name}`);
  }

  private static async createFolder(name: string, icon: string): Promise<void> {
    const currentCategories = await SubDeckStorage.getCategories();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'deck-' + Date.now().toString(36);
    await SubDeckStorage.createCategory({
      id: `${slug}-${Date.now().toString().slice(-4)}`,
      name,
      icon,
      color: '#3B82F6',
      channelIds: [],
      isCollapsed: false,
      sortOrder: currentCategories.length,
      isSystem: false,
    });
    await this.render();
  }

  /** Auto-sort: expand YouTube's full subscription list, sync it, then categorize every channel. */
  private static async runAutoAI(aiBtn: HTMLButtonElement): Promise<void> {
    // After the extension is reloaded or updated, scripts already on this page lose access to it
    // until the page reloads; every read comes back empty, so say that instead of "not signed in".
    if (!SubDeckStorage.isContextValid()) {
      this.showToast('SubShelf was updated or reloaded. Refresh this page to keep using it.', 6000);
      return;
    }
    aiBtn.disabled = true;
    setAutoSortLabel(aiBtn, 'Finding channels…');

    const guideInner = document.querySelector<HTMLElement>('#guide-inner-content');
    const savedGuideScroll = guideInner ? guideInner.scrollTop : 0;
    const savedWinScroll = window.scrollY;
    const keepScrollLevel = () => {
      if (guideInner && guideInner.scrollTop !== savedGuideScroll) guideInner.scrollTop = savedGuideScroll;
      if (window.scrollY !== savedWinScroll) window.scrollTo(window.scrollX, savedWinScroll);
    };

    try {
      // 1. Expand all native subscriptions so all channels mount into the DOM
      ChannelExtractor.autoExpandNativeSubscriptions(true);
      keepScrollLevel();
      await new Promise(r => setTimeout(r, 600));
      keepScrollLevel();

      // 2. Scrape and sync, retrying once if nothing was found yet
      await this.syncWithNativeSubscriptions();
      keepScrollLevel();
      let channelCount = Object.keys(await SubDeckStorage.getChannels()).length;
      if (channelCount === 0) {
        await new Promise(r => setTimeout(r, 600));
        await this.syncWithNativeSubscriptions();
        channelCount = Object.keys(await SubDeckStorage.getChannels()).length;
      }
      if (channelCount === 0) {
        this.showToast('No subscriptions found in YouTube sidebar. Please ensure you are signed in.');
        return;
      }

      // 3. Descriptions give every engine more to go on than the channel name
      setAutoSortLabel(aiBtn, 'Reading channels…');
      await SubscriptionSync.refreshChannelDescriptions(DETAILS_RECHECK_ON_DEMAND_MS);
      keepScrollLevel();

      // 4. Categorize in the service worker; fall back to this page if it can't
      setAutoSortLabel(aiBtn, 'Sorting…');
      const startedAt = performance.now();
      await new Promise<void>((resolve) => {
        chrome.runtime.sendMessage({ type: 'subshelf-auto-organize' }, async (res) => {
          if (res?.success) {
            this.showAutoAISummary(res, performance.now() - startedAt);
            await this.render();
          } else {
            Logger.info('[SubShelf Sidebar] Background worker did not complete categorization; running in page');
            await this.runDirectCategorization();
          }
          keepScrollLevel();
          resolve();
        });
      });
    } catch (err) {
      Logger.warn('[SubShelf Sidebar] Auto-sort failed in the worker path, running in page:', err);
      await this.runDirectCategorization();
      keepScrollLevel();
    } finally {
      aiBtn.disabled = false;
      setAutoSortLabel(aiBtn, 'Auto-sort');
      keepScrollLevel();
    }
  }

  static async runDirectCategorization(): Promise<void> {
    const channels = Object.values(await SubDeckStorage.getChannels());
    if (channels.length === 0) return;

    Logger.info('[SubShelf Sidebar] Running AICategorizer in YouTube Window context...');
    const startedAt = performance.now();
    const result = await AICategorizer.categorizeAll(channels);
    const rawDecks = result.decks;
    this.showAutoAISummary(
      { count: channels.length, decks: rawDecks.length, provider: result.providerUsed, aiReviewed: result.aiReviewed, learnedMoves: result.learnedMoves, fallbackNotice: result.fallbackNotice },
      performance.now() - startedAt
    );
    // Overrides are applied against fresh storage inside the service worker's write queue
    await SubDeckStorage.applyGeneratedDecks(rawDecks);
    await this.render();
  }

  /** Always tells the user what Auto-sort did: how many channels, which engine, how long. */
  private static showAutoAISummary(
    res: { count?: number; decks?: number; provider?: string; aiReviewed?: number; learnedMoves?: number; fallbackNotice?: string },
    elapsedMs: number
  ): void {
    const engine =
      res.provider === 'gemini-api' ? 'Gemini Cloud'
      : res.provider === 'gemini-nano' ? `offline engine + on-device AI for ${res.aiReviewed ?? 0} unclear channel${res.aiReviewed === 1 ? '' : 's'}`
      : 'offline engine';
    const secs = elapsedMs < 10_000 ? (elapsedMs / 1000).toFixed(1) : Math.round(elapsedMs / 1000).toString();
    const learned = res.learnedMoves ? ` · ${res.learnedMoves} placed using your corrections` : '';
    const summary = `Sorted ${res.count ?? 0} channels into ${res.decks ?? 0} folders · ${engine}${learned} · ${secs}s`;
    this.showToast(res.fallbackNotice ? `${summary}. ${res.fallbackNotice}` : summary, res.fallbackNotice ? 8000 : 5000);
  }

  static showToast(message: string, duration = 4000): void {
    document.getElementById('subdeck-toast')?.remove();

    const toast = document.createElement('div');
    toast.id = 'subdeck-toast';
    toast.className = 'subdeck-toast';
    toast.textContent = message;

    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('subdeck-toast-visible'));
    setTimeout(() => {
      toast.classList.remove('subdeck-toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  static async syncWithNativeSubscriptions(): Promise<void> {
    await SubscriptionSync.diffAndSync();
  }

  /** Highlights the folder the feed is filtered by (the chips can change it without a re-render). */
  static syncActiveHighlight(activeId: string | null): void {
    document.querySelectorAll<HTMLElement>('#subdeck-sidebar-container .subdeck-folder-header').forEach(el => {
      el.classList.toggle('active-filter', Boolean(activeId) && el.dataset.folderId === activeId);
    });
  }

  static listenForFilterChanges(): void {
    document.addEventListener(FILTER_CHANGED_EVENT, (e) => this.syncActiveHighlight((e as CustomEvent<string | null>).detail));
  }

  static clearActiveFilterHighlight(): void {
    document.querySelectorAll('.subdeck-folder-header').forEach(el => el.classList.remove('active-filter'));
  }

  /**
   * Navigates to YouTube's Subscriptions feed by clicking a real anchor,
   * allowing YouTube's internal SPA router to handle the transition without a page reload.
   */
  static navigateToSubscriptionsFeed(): void {
    // Our own folder headers also link to /feed/subscriptions and sit above YouTube's entry in the
    // guide, so skip them: clicking one from here re-enters this handler and the browser ignores it.
    const link = Array.from(document.querySelectorAll<HTMLAnchorElement>(
      'ytd-guide-renderer a[href="/feed/subscriptions"], ytd-mini-guide-renderer a[href="/feed/subscriptions"], #guide a[href="/feed/subscriptions"]'
    )).find(a => !a.closest(`#${this.containerId}`));
    if (link) {
      link.click();
    } else {
      window.location.href = '/feed/subscriptions';
    }
  }
}
