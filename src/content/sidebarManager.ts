import { getSubscriptionSection } from '@/config/selectors';
import { SubDeckStorage } from '@/utils/storage';
import { ChannelExtractor } from './channelExtractor';
import { HeuristicCategorizer } from '@/ai/heuristic';

export class SidebarManager {
  private static containerId = 'subdeck-sidebar-container';
  private static observer: MutationObserver | null = null;
  private static retryCount = 0;

  static async ensureInjected(): Promise<void> {
    const subSection = getSubscriptionSection();
    if (!subSection) {
      if (this.retryCount < 6) {
        this.retryCount++;
        setTimeout(() => this.ensureInjected(), 400);
      }
      return;
    }
    this.retryCount = 0;

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
        await new Promise<void>((resolve) => {
          chrome.runtime.sendMessage({ type: 'subdeck-auto-organize' }, async (res) => {
            if (res?.success) {
              await this.render();
            } else {
              await this.runQuickCategorization();
            }
            resolve();
          });
        });
      } catch {
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
          color: '#3B82F6',
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

    // 3. Render Category Folders (Skip system uncategorized if empty)
    categories
      .filter(cat => cat.id !== '__uncategorized__' || cat.channelIds.length > 0)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(cat => {
        const folder = document.createElement('div');
        folder.className = 'subdeck-folder-container';

        const header = document.createElement('div');
        header.className = `subdeck-folder-header ${activeCategory === cat.id ? 'active-filter' : ''}`;
        header.innerHTML = `
          <div class="subdeck-folder-main" title="Open feed for ${cat.name}">
            <span class="subdeck-folder-icon">${cat.icon}</span>
            <span class="subdeck-folder-title">${cat.name}</span>
            <span class="subdeck-channel-count">${cat.channelIds.length}</span>
          </div>
          <div class="subdeck-header-actions">
            <button class="subdeck-header-btn add" title="Add channel to folder">+</button>
            <button class="subdeck-header-btn delete" title="Delete folder">🗑️</button>
            <button class="subdeck-chevron-btn ${cat.isCollapsed ? '' : 'open'}" title="Toggle channels list">▼</button>
          </div>
        `;

        // Inline quick add channel picker box
        const addPickerBox = document.createElement('div');
        addPickerBox.className = 'subdeck-add-picker';
        addPickerBox.style.display = 'none';

        const availableChannels = Object.values(channelsMap).filter(ch => !cat.channelIds.includes(ch.ucId));
        const optionsHtml = availableChannels
          .map(ch => `<option value="${ch.ucId}">${ch.title}</option>`)
          .join('');

        addPickerBox.innerHTML = `
          <select class="subdeck-add-select">
            ${optionsHtml || '<option value="">All channels already in deck</option>'}
          </select>
          <button class="subdeck-add-confirm-btn">Add</button>
        `;

        const addBtn = header.querySelector('.subdeck-header-btn.add');
        addBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          addPickerBox.style.display = addPickerBox.style.display === 'none' ? 'flex' : 'none';
        });

        const addConfirmBtn = addPickerBox.querySelector('.subdeck-add-confirm-btn');
        addConfirmBtn?.addEventListener('click', async (e) => {
          e.stopPropagation();
          const select = addPickerBox.querySelector('.subdeck-add-select') as HTMLSelectElement;
          const selectedUcId = select?.value;
          if (selectedUcId) {
            cat.channelIds.push(selectedUcId);
            await SubDeckStorage.setAll({ categories });
            await this.render();
          }
        });

        const deleteBtn = header.querySelector('.subdeck-header-btn.delete');
        deleteBtn?.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm(`Delete folder "${cat.name}"?`)) {
            const currentCats = await SubDeckStorage.getCategories();
            const updated = currentCats.filter(c => c.id !== cat.id);
            await SubDeckStorage.setAll({ categories: updated });
            await this.render();
          }
        });

        const list = document.createElement('div');
        list.className = `subdeck-channel-list ${cat.isCollapsed ? 'collapsed' : ''}`;

        // Render clean channel text items with remove button
        cat.channelIds.forEach(id => {
          const ch = channelsMap[id];
          if (!ch) return;

          const item = document.createElement('div');
          item.className = 'subdeck-channel-item';
          item.innerHTML = `
            <a class="subdeck-channel-link" href="${ch.url}" title="${ch.title}">${ch.title}</a>
            <button class="subdeck-channel-remove-btn" title="Remove from folder">✕</button>
          `;

          // Remove channel from this folder
          item.querySelector('.subdeck-channel-remove-btn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            cat.channelIds = cat.channelIds.filter(cid => cid !== id);
            await SubDeckStorage.setAll({ categories });
            await this.render();
          });

          list.appendChild(item);
        });

        // 1. CHEVRON CLICK: ONLY toggles the channels list, NEVER navigates or opens feed!
        const chevronBtn = header.querySelector('.subdeck-chevron-btn');
        chevronBtn?.addEventListener('click', async (e) => {
          e.stopPropagation();
          const isNowCollapsed = !list.classList.contains('collapsed');
          list.classList.toggle('collapsed');
          chevronBtn.classList.toggle('open', !isNowCollapsed);

          cat.isCollapsed = isNowCollapsed;
          await SubDeckStorage.setAll({ categories });
        });

        // 2. FOLDER TITLE CLICK: Opens and filters the feed!
        const folderMain = header.querySelector('.subdeck-folder-main');
        folderMain?.addEventListener('click', async () => {
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
        folder.appendChild(addPickerBox);
        folder.appendChild(list);
        container.appendChild(folder);
      });
  }

  static async runQuickCategorization(): Promise<void> {
    const channelsMap = await SubDeckStorage.getChannels();
    const channels = Object.values(channelsMap);
    if (channels.length === 0) return;

    // Use comprehensive 9-category taxonomy with catch-all
    const finalDecks = HeuristicCategorizer.categorize(channels);
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
