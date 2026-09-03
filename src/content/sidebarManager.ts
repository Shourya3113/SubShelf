import { getSubscriptionSection } from '@/config/selectors';
import { SubDeckStorage } from '@/utils/storage';
import { ChannelExtractor } from './channelExtractor';
import { CategoryDeck } from '@/types';

export class SidebarManager {
  private static containerId = 'subdeck-sidebar-container';
  private static observer: MutationObserver | null = null;

  static async ensureInjected(): Promise<void> {
    const subSection = getSubscriptionSection();
    if (!subSection) return;

    // Deduplicate: Clean up any extra containers
    const existing = document.querySelectorAll(`#${this.containerId}`);
    if (existing.length > 1) {
      existing.forEach((el, idx) => {
        if (idx > 0) el.remove();
      });
    }

    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
    }

    // Anchor inside or directly above the subscriptions list
    const itemsContainer = subSection.querySelector('#items');
    if (itemsContainer && container.nextElementSibling !== itemsContainer) {
      itemsContainer.parentNode?.insertBefore(container, itemsContainer);
    } else if (!itemsContainer && container.nextElementSibling !== subSection) {
      subSection.parentNode?.insertBefore(container, subSection);
    }

    // Attach observer to native subscription section so clicking "Show more" auto-syncs
    if (!this.observer) {
      this.observer = new MutationObserver(() => {
        this.syncWithNativeSubscriptions();
      });
      this.observer.observe(subSection, { childList: true, subtree: true });
    }

    await this.render();
  }

  static async render(): Promise<void> {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.innerHTML = '';

    const categories = await SubDeckStorage.getCategories();
    const channelsMap = await SubDeckStorage.getChannels();
    const activeCategory = (await SubDeckStorage.getAll()).activeCategoryId;
    const channelCount = Object.keys(channelsMap).length;

    // 1. Categorize Subscriptions Action Bar Card
    const actionCard = document.createElement('div');
    actionCard.className = 'subdeck-action-card';
    actionCard.innerHTML = `
      <div class="subdeck-action-header">
        <span class="subdeck-brand">⚡ SubDeck</span>
        <span class="subdeck-subtext">${channelCount} channels</span>
      </div>
      <div class="subdeck-action-buttons">
        <button class="subdeck-btn-ai" id="subdeck-ai-btn">✨ Auto-AI</button>
        <button class="subdeck-btn-manual" id="subdeck-manual-btn">+ Folder</button>
      </div>
      <div class="subdeck-manual-input-box" id="subdeck-manual-box" style="display: none;">
        <input type="text" id="subdeck-new-folder-name" placeholder="Folder name..." />
        <button id="subdeck-save-folder-btn" class="subdeck-btn-save">Save</button>
        <button id="subdeck-cancel-folder-btn" class="subdeck-btn-cancel">✕</button>
      </div>
    `;

    // Action button listeners
    const aiBtn = actionCard.querySelector('#subdeck-ai-btn') as HTMLButtonElement | null;
    const manualBtn = actionCard.querySelector('#subdeck-manual-btn') as HTMLButtonElement | null;
    const manualBox = actionCard.querySelector('#subdeck-manual-box') as HTMLElement | null;
    const folderInput = actionCard.querySelector('#subdeck-new-folder-name') as HTMLInputElement | null;
    const saveBtn = actionCard.querySelector('#subdeck-save-folder-btn') as HTMLButtonElement | null;
    const cancelBtn = actionCard.querySelector('#subdeck-cancel-folder-btn') as HTMLButtonElement | null;

    // Auto-AI Click Handler
    aiBtn?.addEventListener('click', async () => {
      if (aiBtn.disabled) return;
      aiBtn.disabled = true;
      aiBtn.innerText = '⏳ Clustering...';

      try {
        await this.runQuickCategorization();
      } finally {
        aiBtn.disabled = false;
        aiBtn.innerText = '✨ Auto-AI';
      }
    });

    // Manual Folder Creation
    manualBtn?.addEventListener('click', () => {
      if (manualBox) {
        manualBox.style.display = manualBox.style.display === 'none' ? 'flex' : 'none';
        if (manualBox.style.display === 'flex') folderInput?.focus();
      }
    });

    cancelBtn?.addEventListener('click', () => {
      if (manualBox) manualBox.style.display = 'none';
    });

    const saveFolder = async () => {
      const name = folderInput?.value.trim();
      if (!name) return;

      const currentCategories = await SubDeckStorage.getCategories();
      const newId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      if (!currentCategories.find(c => c.id === newId)) {
        currentCategories.push({
          id: newId,
          name,
          icon: '📁',
          channelIds: [],
          isCollapsed: false,
          sortOrder: currentCategories.length,
        });
        await SubDeckStorage.setAll({ categories: currentCategories });
        if (folderInput) folderInput.value = '';
        if (manualBox) manualBox.style.display = 'none';
        await this.render();
      }
    };

    saveBtn?.addEventListener('click', saveFolder);
    folderInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveFolder();
      if (e.key === 'Escape' && manualBox) manualBox.style.display = 'none';
    });

    container.appendChild(actionCard);

    // 2. Show All Button
    const showAllBtn = document.createElement('button');
    showAllBtn.innerText = '☰ Show All Subscriptions';
    showAllBtn.className = 'subdeck-clear-filter';
    showAllBtn.addEventListener('click', async () => {
      document.querySelectorAll('.subdeck-folder-header').forEach(el => el.classList.remove('active-filter'));
      await SubDeckStorage.setAll({ activeCategoryId: null });
      document.dispatchEvent(new CustomEvent('subdeck-filter-category', { detail: null }));
    });
    container.appendChild(showAllBtn);

    // 3. Render Category Folders (Skip Uncategorized Folder entirely)
    categories
      .filter(cat => cat.id !== '__uncategorized__')
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(cat => {
        const folder = document.createElement('div');
        folder.className = 'subdeck-folder-container';

        const header = document.createElement('div');
        header.className = `subdeck-folder-header ${activeCategory === cat.id ? 'active-filter' : ''}`;
        header.innerHTML = `
          <span class="subdeck-folder-icon">${cat.icon}</span>
          <span class="subdeck-folder-title" title="${cat.name}">${cat.name}</span>
          <span class="subdeck-channel-count">${cat.channelIds.length}</span>
          <span class="subdeck-chevron ${cat.isCollapsed ? '' : 'open'}">▼</span>
        `;

        const list = document.createElement('div');
        list.className = `subdeck-channel-list ${cat.isCollapsed ? 'collapsed' : ''}`;

        // Render clean channel text items (no logos)
        cat.channelIds.forEach(id => {
          const ch = channelsMap[id];
          if (!ch) return;
          const item = document.createElement('a');
          item.className = 'subdeck-channel-item';
          item.href = ch.url;
          item.textContent = ch.title;
          item.title = ch.title;
          list.appendChild(item);
        });

        header.addEventListener('click', async () => {
          const chevron = header.querySelector('.subdeck-chevron');
          const isNowCollapsed = !list.classList.contains('collapsed');
          list.classList.toggle('collapsed');
          chevron?.classList.toggle('open', !isNowCollapsed);

          cat.isCollapsed = isNowCollapsed;
          await SubDeckStorage.setAll({ categories });

          if (window.location.pathname.startsWith('/feed/subscriptions')) {
            document.querySelectorAll('.subdeck-folder-header').forEach(el => el.classList.remove('active-filter'));
            header.classList.add('active-filter');
            document.dispatchEvent(new CustomEvent('subdeck-filter-category', { detail: cat }));
          } else {
            await SubDeckStorage.setAll({ activeCategoryId: cat.id });
            window.location.href = '/feed/subscriptions';
          }
        });

        folder.appendChild(header);
        folder.appendChild(list);
        container.appendChild(folder);
      });
  }

  static async runQuickCategorization(): Promise<void> {
    const channelsMap = await SubDeckStorage.getChannels();
    const channels = Object.values(channelsMap);
    if (channels.length === 0) return;

    const taxonomy: Record<string, { name: string; icon: string; keywords: string[] }> = {
      'tech-coding': {
        name: 'Tech & Coding',
        icon: '💻',
        keywords: ['tech', 'apple', 'code', 'coding', 'cs50', 'software', 'programming', 'developer', 'linux', 'dev', 'python', 'ai', 'engineer', 'linus'],
      },
      gaming: {
        name: 'Gaming',
        icon: '🎮',
        keywords: ['game', 'gaming', 'destiny', 'playthrough', 'twitch', 'steam', 'xbox', 'playstation', 'nintendo', 'clips'],
      },
      music: {
        name: 'Music',
        icon: '🎵',
        keywords: ['music', 'puth', 'bandit', 'records', 'song', 'audio', 'sound', 'band', 'vevo', 'dolby', 'charlie', 'dizasta', 'eminem'],
      },
      education: {
        name: 'Education & Science',
        icon: '📚',
        keywords: ['science', 'learn', 'education', 'domain', 'course', 'academy', 'history', 'physics', 'math', 'explained', 'demos'],
      },
      entertainment: {
        name: 'Entertainment',
        icon: '🍿',
        keywords: ['entertainment', 'comedy', 'vlog', 'show', 'cinema', 'movie', 'film', 'podcast', 'marvel', 'sony'],
      },
    };

    const newDecks: CategoryDeck[] = Object.entries(taxonomy).map(([id, meta], idx) => ({
      id,
      name: meta.name,
      icon: meta.icon,
      channelIds: [],
      isCollapsed: true, // Collapsed by default
      sortOrder: idx,
    }));

    const assignedIds = new Set<string>();

    for (const ch of channels) {
      const text = `${ch.title} ${ch.handle}`.toLowerCase();
      for (const [catId, meta] of Object.entries(taxonomy)) {
        if (meta.keywords.some(kw => text.includes(kw))) {
          const deck = newDecks.find(d => d.id === catId);
          deck?.channelIds.push(ch.ucId);
          assignedIds.add(ch.ucId);
          break;
        }
      }
    }

    // Capture remaining into Uncategorized in storage (but hidden from sidebar display)
    const unassigned = channels.filter(c => !assignedIds.has(c.ucId)).map(c => c.ucId);
    newDecks.push({
      id: '__uncategorized__',
      name: 'Uncategorized',
      icon: '📂',
      channelIds: unassigned,
      isCollapsed: true,
      sortOrder: 999,
      isSystem: true,
    });

    // Save only decks that have channels or are uncategorized
    const finalDecks = newDecks.filter(d => d.channelIds.length > 0 || d.id === '__uncategorized__');
    await SubDeckStorage.setAll({ categories: finalDecks });
    await this.render();
  }

  static async syncWithNativeSubscriptions(): Promise<void> {
    const scraped = ChannelExtractor.scrapeFromSidebar();
    if (scraped.length === 0) return;

    const storageChannels = await SubDeckStorage.getChannels();
    const categories = await SubDeckStorage.getCategories();
    let hasChanges = false;

    // Purge any accidental system topics from storage
    const SYSTEM_NAMES = new Set(['your videos', 'shopping', 'music', 'gaming', 'news', 'movies', 'live', 'podcasts', 'sports']);
    for (const [ucId, ch] of Object.entries(storageChannels)) {
      if (SYSTEM_NAMES.has(ch.title.toLowerCase())) {
        await SubDeckStorage.removeChannel(ucId);
        categories.forEach(cat => {
          cat.channelIds = cat.channelIds.filter(id => id !== ucId);
        });
        hasChanges = true;
      }
    }

    for (const ch of scraped) {
      if (!storageChannels[ch.ucId]) {
        await SubDeckStorage.addChannel(ch);
        await SubDeckStorage.addChannelToCategory(ch.ucId, '__uncategorized__');
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await SubDeckStorage.setAll({ categories });
      await this.render();
    }
  }
}
