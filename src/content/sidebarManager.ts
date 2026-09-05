import { getSubscriptionSection } from '@/config/selectors';
import { SubDeckStorage } from '@/utils/storage';
import { ChannelExtractor } from './channelExtractor';
import { HeuristicCategorizer } from '@/ai/heuristic';
import { FeedFilter } from './feedFilter';
import { CategoryDeck } from '@/types';

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

    // Anchor inside or directly above the subscriptions list
    const itemsContainer = subSection.querySelector('#items');
    if (itemsContainer && container.nextElementSibling !== itemsContainer) {
      itemsContainer.parentNode?.insertBefore(container, itemsContainer);
    } else if (!itemsContainer && container.nextElementSibling !== subSection) {
      subSection.parentNode?.insertBefore(container, subSection);
    }

    // Clean up old observer if attached to a stale node
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.observer = new MutationObserver((mutations) => {
      // Ignore mutations originating from within our own container
      const isInternal = mutations.some(m => {
        let target: Node | null = m.target;
        while (target) {
          if (target instanceof Element && target.id === this.containerId) return true;
          target = target.parentNode;
        }
        return false;
      });
      if (!isInternal) {
        this.syncWithNativeSubscriptions();
      }
    });

    this.observer.observe(subSection, { childList: true, subtree: true });

    await this.render();
  }

  static async render(): Promise<void> {
    const subSection = getSubscriptionSection();
    if (!subSection) return;

    // Prune any rogue containers outside the active subSection
    const allContainers = Array.from(document.querySelectorAll<HTMLElement>(`#${this.containerId}`));
    let container: HTMLElement | null = null;

    for (const el of allContainers) {
      if (subSection.contains(el)) {
        if (!container) {
          container = el;
        } else {
          el.remove();
        }
      } else {
        el.remove();
      }
    }

    if (!container) return;

    container.innerHTML = '';

    const categories = await SubDeckStorage.getCategories();
    const channelsMap = await SubDeckStorage.getChannels();
    const activeCategory = (await SubDeckStorage.getAll()).activeCategoryId;
    const channelCount = Object.keys(channelsMap).length;

    // 1. Categorize Subscriptions Action Bar Card (Built via DOM APIs)
    const actionCard = document.createElement('div');
    actionCard.className = 'subdeck-action-card';

    const actionHeader = document.createElement('div');
    actionHeader.className = 'subdeck-action-header';

    const brandSpan = document.createElement('span');
    brandSpan.className = 'subdeck-brand';
    brandSpan.textContent = '⚡ SubDeck';

    const subtextSpan = document.createElement('span');
    subtextSpan.className = 'subdeck-subtext';
    subtextSpan.textContent = `${channelCount} channels`;

    actionHeader.appendChild(brandSpan);
    actionHeader.appendChild(subtextSpan);

    const actionBtns = document.createElement('div');
    actionBtns.className = 'subdeck-action-buttons';

    const aiBtn = document.createElement('button');
    aiBtn.className = 'subdeck-btn-ai';
    aiBtn.id = 'subdeck-ai-btn';
    aiBtn.textContent = '✨ Auto-AI';

    const manualBtn = document.createElement('button');
    manualBtn.className = 'subdeck-btn-manual';
    manualBtn.id = 'subdeck-manual-btn';
    manualBtn.textContent = '+ Folder';

    actionBtns.appendChild(aiBtn);
    actionBtns.appendChild(manualBtn);

    const manualBox = document.createElement('div');
    manualBox.className = 'subdeck-manual-input-box';
    manualBox.id = 'subdeck-manual-box';
    manualBox.style.display = 'none';

    const folderInput = document.createElement('input');
    folderInput.type = 'text';
    folderInput.id = 'subdeck-new-folder-name';
    folderInput.placeholder = 'Folder name...';

    const saveBtn = document.createElement('button');
    saveBtn.id = 'subdeck-save-folder-btn';
    saveBtn.className = 'subdeck-btn-save';
    saveBtn.textContent = 'Save';

    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'subdeck-cancel-folder-btn';
    cancelBtn.className = 'subdeck-btn-cancel';
    cancelBtn.textContent = '✕';

    manualBox.appendChild(folderInput);
    manualBox.appendChild(saveBtn);
    manualBox.appendChild(cancelBtn);

    actionCard.appendChild(actionHeader);
    actionCard.appendChild(actionBtns);
    actionCard.appendChild(manualBox);

    // Auto-AI Click Handler: Auto-expands all channels and syncs before clustering
    aiBtn.addEventListener('click', async () => {
      if (aiBtn.disabled) return;
      aiBtn.disabled = true;
      aiBtn.textContent = '⏳ Discovering...';

      try {
        // 1. Expand all native subscriptions so all 80+ channels mount into DOM
        ChannelExtractor.autoExpandNativeSubscriptions();
        await new Promise(r => setTimeout(r, 400));

        // 2. Scrape and sync all channels into storage
        await this.syncWithNativeSubscriptions();

        aiBtn.textContent = '⏳ Clustering...';

        // 3. Run categorization across full list of channels
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
        aiBtn.textContent = '✨ Auto-AI';
      }
    });

    // Manual Folder Creation
    manualBtn.addEventListener('click', () => {
      manualBox.style.display = manualBox.style.display === 'none' ? 'flex' : 'none';
      if (manualBox.style.display === 'flex') folderInput.focus();
    });

    cancelBtn.addEventListener('click', () => {
      manualBox.style.display = 'none';
    });

    const saveFolder = async () => {
      const name = folderInput.value.trim();
      if (!name) return;

      const currentCategories = await SubDeckStorage.getCategories();
      let cleanId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (!cleanId) cleanId = 'deck-' + Date.now().toString(36);
      const newId = `${cleanId}-${Date.now().toString().slice(-4)}`;

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
        folderInput.value = '';
        manualBox.style.display = 'none';
        await this.render();
      }
    };

    saveBtn.addEventListener('click', saveFolder);
    folderInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveFolder();
      if (e.key === 'Escape') manualBox.style.display = 'none';
    });

    container.appendChild(actionCard);

    // 2. Show All Button
    const showAllBtn = document.createElement('button');
    showAllBtn.textContent = '☰ Show All Subscriptions';
    showAllBtn.className = 'subdeck-clear-filter';
    showAllBtn.addEventListener('click', async () => {
      document.querySelectorAll('.subdeck-folder-header').forEach(el => el.classList.remove('active-filter'));
      await SubDeckStorage.setAll({ activeCategoryId: null });
      FeedFilter.setCategory(null);
    });
    container.appendChild(showAllBtn);

    // 3. Deduplicate Category Folders by normalized name
    const seenNames = new Set<string>();
    const uniqueCategories: CategoryDeck[] = [];
    for (const cat of categories) {
      if (cat.id === '__uncategorized__' && cat.channelIds.length === 0) continue;
      const norm = cat.name.toLowerCase().trim();
      if (!seenNames.has(norm)) {
        seenNames.add(norm);
        uniqueCategories.push(cat);
      } else {
        const canonical = uniqueCategories.find(c => c.name.toLowerCase().trim() === norm);
        if (canonical) {
          const merged = new Set([...canonical.channelIds, ...cat.channelIds]);
          canonical.channelIds = Array.from(merged);
        }
      }
    }

    uniqueCategories
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(cat => {
        const folder = document.createElement('div');
        folder.className = 'subdeck-folder-container';

        const header = document.createElement('div');
        header.className = `subdeck-folder-header ${activeCategory === cat.id ? 'active-filter' : ''}`;

        // Safe DOM construction for folder header (Zero innerHTML)
        const folderMain = document.createElement('div');
        folderMain.className = 'subdeck-folder-main';
        folderMain.title = `Open feed for ${cat.name}`;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'subdeck-folder-icon';
        iconSpan.textContent = cat.icon;

        const titleSpan = document.createElement('span');
        titleSpan.className = 'subdeck-folder-title';
        titleSpan.textContent = cat.name;

        const countSpan = document.createElement('span');
        countSpan.className = 'subdeck-channel-count';
        countSpan.textContent = String(cat.channelIds.length);

        folderMain.appendChild(iconSpan);
        folderMain.appendChild(titleSpan);
        folderMain.appendChild(countSpan);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'subdeck-header-actions';

        const addBtn = document.createElement('button');
        addBtn.className = 'subdeck-header-btn add';
        addBtn.title = 'Add channel to folder';
        addBtn.textContent = '+';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'subdeck-header-btn delete';
        deleteBtn.title = 'Delete folder';
        deleteBtn.textContent = '🗑️';

        const chevronBtn = document.createElement('button');
        chevronBtn.className = `subdeck-chevron-btn ${cat.isCollapsed ? '' : 'open'}`;
        chevronBtn.title = 'Toggle channels list';
        chevronBtn.textContent = '▼';

        actionsDiv.appendChild(addBtn);
        actionsDiv.appendChild(deleteBtn);
        actionsDiv.appendChild(chevronBtn);

        header.appendChild(folderMain);
        header.appendChild(actionsDiv);

        // Safe DOM construction for channel picker (Zero innerHTML)
        const addPickerBox = document.createElement('div');
        addPickerBox.className = 'subdeck-add-picker';
        addPickerBox.style.display = 'none';

        const select = document.createElement('select');
        select.className = 'subdeck-add-select';

        const availableChannels = Object.values(channelsMap).filter(ch => !cat.channelIds.includes(ch.ucId));
        if (availableChannels.length === 0) {
          const opt = document.createElement('option');
          opt.value = '';
          opt.textContent = 'All channels already in deck';
          select.appendChild(opt);
        } else {
          availableChannels.forEach(ch => {
            const opt = document.createElement('option');
            opt.value = ch.ucId;
            opt.textContent = ch.title;
            select.appendChild(opt);
          });
        }

        const confirmAddBtn = document.createElement('button');
        confirmAddBtn.className = 'subdeck-add-confirm-btn';
        confirmAddBtn.textContent = 'Add';

        addPickerBox.appendChild(select);
        addPickerBox.appendChild(confirmAddBtn);

        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          addPickerBox.style.display = addPickerBox.style.display === 'none' ? 'flex' : 'none';
        });

        confirmAddBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const selectedUcId = select.value;
          if (selectedUcId) {
            await SubDeckStorage.addChannelToCategory(selectedUcId, cat.id);
            await this.render();
          }
        });

        deleteBtn.addEventListener('click', async (e) => {
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

        // Safe DOM construction for channel items (Zero innerHTML)
        cat.channelIds.forEach(id => {
          const ch = channelsMap[id];
          if (!ch) return;

          const item = document.createElement('div');
          item.className = 'subdeck-channel-item';

          const link = document.createElement('a');
          link.className = 'subdeck-channel-link';
          const safeUrl = ch.url.startsWith('https://') || ch.url.startsWith('/') ? ch.url : '#';
          link.href = safeUrl;
          link.title = ch.title;
          link.textContent = ch.title;

          const removeBtn = document.createElement('button');
          removeBtn.className = 'subdeck-channel-remove-btn';
          removeBtn.title = 'Remove from folder';
          removeBtn.textContent = '✕';

          removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await SubDeckStorage.removeChannelFromCategory(id, cat.id);
            await this.render();
          });

          item.appendChild(link);
          item.appendChild(removeBtn);
          list.appendChild(item);
        });

        // 1. CHEVRON CLICK: ONLY toggles the channels list, NEVER navigates or opens feed!
        chevronBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const isNowCollapsed = !list.classList.contains('collapsed');
          list.classList.toggle('collapsed');
          chevronBtn.classList.toggle('open', !isNowCollapsed);

          cat.isCollapsed = isNowCollapsed;
          await SubDeckStorage.setAll({ categories });
        });

        // 2. FOLDER TITLE CLICK: Opens and filters the feed directly!
        folderMain.addEventListener('click', async () => {
          if (window.location.pathname.startsWith('/feed/subscriptions')) {
            document.querySelectorAll('.subdeck-folder-header').forEach(el => el.classList.remove('active-filter'));
            header.classList.add('active-filter');
            FeedFilter.setCategory(cat);
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
