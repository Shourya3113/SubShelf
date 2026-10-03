import { getSubscriptionSection } from '@/config/selectors';
import { SubDeckStorage } from '@/utils/storage';
import { ChannelExtractor } from './channelExtractor';
import { AICategorizer } from '@/ai/categorizer';
import { FeedFilter } from './feedFilter';
import { CategoryDeck, SubscribedChannel } from '@/types';
import { debounce } from '@/utils/debounce';
import { SubscriptionSync } from './subscriptionSync';
import { Logger } from '@/utils/logger';
import { safeAvatarUrl } from '@/utils/avatarUrl';

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
    const currentHeight = container.offsetHeight;
    if (currentHeight > 0) {
      container.style.minHeight = `${currentHeight}px`;
    }

    // Fetch storage state concurrently BEFORE touching the DOM
    const [categories, channelsMap, allState] = await Promise.all([
      SubDeckStorage.getCategories(),
      SubDeckStorage.getChannels(),
      SubDeckStorage.getAll(),
    ]);

    // Auto-repair any channels missing avatars from YouTube's initial guide payload
    const initialAvatars = ChannelExtractor.getInitialAvatars();
    if (initialAvatars.size > 0) {
      const repaired: Record<string, string> = {};
      for (const ch of Object.values(channelsMap)) {
        if (!ch.avatarUrl) {
          const cleanHandle = (ch.handle || '').replace(/^[\/@]+/, '').toLowerCase();
          const found =
            initialAvatars.get(ch.ucId) ||
            initialAvatars.get(ch.handle) ||
            initialAvatars.get(cleanHandle) ||
            initialAvatars.get('@' + cleanHandle) ||
            initialAvatars.get(ch.title.toLowerCase().trim());
          if (found) {
            ch.avatarUrl = found;
            repaired[ch.ucId] = found;
          }
        }
      }
      if (Object.keys(repaired).length > 0) {
        SubDeckStorage.update(['channels'], cur => {
          const channels = { ...(cur.channels || {}) };
          for (const [id, url] of Object.entries(repaired)) {
            if (channels[id]) {
              channels[id].avatarUrl = url;
            }
          }
          return { channels };
        }).catch(() => {});
      }
    }

    const activeCategory = allState.activeCategoryId;
    const uniqueChannelKeys = new Set<string>();
    for (const ch of Object.values(channelsMap)) {
      if (!ch) continue;
      const key = (ch.ucId && ch.ucId.startsWith('UC'))
        ? ch.ucId
        : (ch.handle ? ch.handle.toLowerCase() : ch.title.toLowerCase().trim());
      uniqueChannelKeys.add(key);
    }
    const channelCount = uniqueChannelKeys.size;

    // Construct entire UI inside an in-memory DocumentFragment for an atomic swap
    const fragment = document.createDocumentFragment();

    // 1. Categorize Subscriptions Action Bar Card (Built via DOM APIs)
    const actionCard = document.createElement('div');
    actionCard.className = 'subdeck-action-card';

    const actionHeader = document.createElement('div');
    actionHeader.className = 'subdeck-action-header';

    const brandSpan = document.createElement('span');
    brandSpan.className = 'subdeck-brand';
    brandSpan.textContent = 'SubShelf';

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

    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.id = 'subdeck-new-folder-icon';
    iconInput.className = 'subdeck-input-icon';
    iconInput.value = '📁';
    iconInput.maxLength = 8;
    iconInput.title = 'Folder icon (emoji)';

    const folderInput = document.createElement('input');
    folderInput.type = 'text';
    folderInput.id = 'subdeck-new-folder-name';
    folderInput.className = 'subdeck-input-name';
    folderInput.placeholder = 'Folder name...';

    const saveBtn = document.createElement('button');
    saveBtn.id = 'subdeck-save-folder-btn';
    saveBtn.className = 'subdeck-btn-save';
    saveBtn.textContent = 'Save';

    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'subdeck-cancel-folder-btn';
    cancelBtn.className = 'subdeck-btn-cancel';
    cancelBtn.textContent = '✕';

    manualBox.appendChild(iconInput);
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

      const guideInner = document.querySelector<HTMLElement>('#guide-inner-content');
      const savedGuideScroll = guideInner ? guideInner.scrollTop : 0;
      const savedWinScroll = window.scrollY;

      const keepScrollLevel = () => {
        if (guideInner && guideInner.scrollTop !== savedGuideScroll) {
          guideInner.scrollTop = savedGuideScroll;
        }
        if (window.scrollY !== savedWinScroll) {
          window.scrollTo(window.scrollX, savedWinScroll);
        }
      };

      try {
        // 1. Expand all native subscriptions so all channels mount into DOM without scroll jump
        ChannelExtractor.autoExpandNativeSubscriptions(true);
        keepScrollLevel();
        await new Promise(r => setTimeout(r, 600));
        keepScrollLevel();

        // 2. Scrape and sync all channels into storage
        await this.syncWithNativeSubscriptions();
        keepScrollLevel();

        // 3. Verify channel count, retry once after brief pause if empty
        let channelsMap = await SubDeckStorage.getChannels();
        if (Object.keys(channelsMap).length === 0) {
          await new Promise(r => setTimeout(r, 600));
          await this.syncWithNativeSubscriptions();
          channelsMap = await SubDeckStorage.getChannels();
        }

        const channelCount = Object.keys(channelsMap).length;
        if (channelCount === 0) {
          SidebarManager.showToast('No subscriptions found in YouTube sidebar. Please ensure you are signed in.');
          return;
        }

        aiBtn.textContent = '⏳ Clustering...';

        // 4. Run categorization across full list of channels
        await new Promise<void>((resolve) => {
          chrome.runtime.sendMessage({ type: 'subshelf-auto-organize' }, async (res) => {
            if (res?.success) {
              if (res.fallbackNotice) {
                SidebarManager.showToast(res.fallbackNotice);
              }
              await this.render();
            } else {
              Logger.info('[SubShelf Sidebar] Background worker did not complete categorization; running direct window categorization...');
              await this.runDirectCategorization();
            }
            keepScrollLevel();
            resolve();
          });
        });
      } catch (err) {
        Logger.warn('[SubShelf Sidebar] Auto-AI execution caught error, running direct window categorization:', err);
        await this.runDirectCategorization();
        keepScrollLevel();
      } finally {
        aiBtn.disabled = false;
        aiBtn.textContent = '✨ Auto-AI';
        keepScrollLevel();
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
      const icon = iconInput.value.trim() || '📁';
      if (!name) return;

      const currentCategories = await SubDeckStorage.getCategories();
      let cleanId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (!cleanId) cleanId = 'deck-' + Date.now().toString(36);
      const newId = `${cleanId}-${Date.now().toString().slice(-4)}`;

      if (!currentCategories.find(c => c.id === newId)) {
        await SubDeckStorage.createCategory({
          id: newId,
          name,
          icon,
          color: '#3B82F6',
          channelIds: [],
          isCollapsed: false,
          sortOrder: currentCategories.length,
          isSystem: false,
        });
        folderInput.value = '';
        iconInput.value = '📁';
        manualBox.style.display = 'none';
        await this.render();
      }
    };

    saveBtn.addEventListener('click', saveFolder);
    folderInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveFolder();
      if (e.key === 'Escape') manualBox.style.display = 'none';
    });
    iconInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveFolder();
      if (e.key === 'Escape') manualBox.style.display = 'none';
    });

    fragment.appendChild(actionCard);

    // 2. Show All Button
    const showAllBtn = document.createElement('button');
    showAllBtn.textContent = '☰ Show All Subscriptions';
    showAllBtn.className = 'subdeck-clear-filter';
    showAllBtn.addEventListener('click', async () => {
      document.querySelectorAll('.subdeck-folder-header').forEach(el => el.classList.remove('active-filter'));
      await SubDeckStorage.setActiveCategoryId(null);
      FeedFilter.setCategory(null);
      if (!window.location.pathname.startsWith('/feed/subscriptions')) {
        SidebarManager.navigateToSubscriptionsFeed();
      }
    });
    fragment.appendChild(showAllBtn);

    // 3. Deduplicate Category Folders by normalized name
    const handleToUc = allState.handleToUcId || {};
    const seenNames = new Set<string>();
    const uniqueCategories: CategoryDeck[] = [];
    for (const cat of categories) {
      if (cat.id === '__uncategorized__') continue;
      // Deduplicate channelIds in cat by resolving to canonical UC ID
      const canonicalIds: string[] = [];
      const seenInCat = new Set<string>();
      for (const rawId of cat.channelIds) {
        const ch = channelsMap[rawId];
        const canonId = (ch && ch.ucId) ? ch.ucId : (handleToUc[rawId.toLowerCase()] || rawId);
        if (!seenInCat.has(canonId)) {
          seenInCat.add(canonId);
          canonicalIds.push(canonId);
        }
      }
      cat.channelIds = canonicalIds;

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
        // Resolve unique channels for this category folder (preventing duplicate renders and accurate badge count)
        const seenFolderKeys = new Set<string>();
        const uniqueFolderChannels: SubscribedChannel[] = [];
        for (const id of cat.channelIds) {
          const ch = channelsMap[id];
          if (!ch) continue;
          const key = (ch.ucId && ch.ucId.startsWith('UC'))
            ? ch.ucId
            : (ch.handle ? ch.handle.toLowerCase() : ch.title.toLowerCase().trim());
          if (!seenFolderKeys.has(key)) {
            seenFolderKeys.add(key);
            uniqueFolderChannels.push(ch);
          }
        }
        const sortedFolderChannels = uniqueFolderChannels.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
        );

        const folder = document.createElement('div');
        folder.className = 'subdeck-folder-container';

        const isOnSubFeed = window.location.pathname.startsWith('/feed/subscriptions');
        const isFolderActive = isOnSubFeed && activeCategory === cat.id;
        const header = document.createElement('div');
        header.className = `subdeck-folder-header ${isFolderActive ? 'active-filter' : ''}`;

        // Safe DOM construction for folder header (Zero innerHTML)
        const folderMain = document.createElement('a');
        folderMain.className = 'subdeck-folder-main';
        folderMain.href = '/feed/subscriptions';
        folderMain.title = `Open feed for ${cat.name}`;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'subdeck-folder-icon';
        iconSpan.textContent = cat.icon;

        const titleSpan = document.createElement('span');
        titleSpan.className = 'subdeck-folder-title';
        titleSpan.textContent = cat.name;

        const countSpan = document.createElement('span');
        countSpan.className = 'subdeck-channel-count';
        countSpan.textContent = String(sortedFolderChannels.length);

        folderMain.appendChild(iconSpan);
        folderMain.appendChild(titleSpan);
        folderMain.appendChild(countSpan);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'subdeck-header-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'subdeck-header-btn edit';
        editBtn.title = 'Rename folder & icon';
        editBtn.textContent = '✏️';

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

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(addBtn);
        actionsDiv.appendChild(deleteBtn);
        actionsDiv.appendChild(chevronBtn);

        header.appendChild(folderMain);
        header.appendChild(actionsDiv);

        // Inline Folder Rename / Icon Edit Box
        const editBox = document.createElement('div');
        editBox.className = 'subdeck-folder-edit-box';
        editBox.style.display = 'none';

        const editIcon = document.createElement('input');
        editIcon.type = 'text';
        editIcon.className = 'subdeck-input-icon';
        editIcon.value = cat.icon;
        editIcon.maxLength = 8;
        editIcon.title = 'Folder icon (emoji)';

        const editName = document.createElement('input');
        editName.type = 'text';
        editName.className = 'subdeck-input-name';
        editName.value = cat.name;

        const editSaveBtn = document.createElement('button');
        editSaveBtn.className = 'subdeck-btn-save';
        editSaveBtn.textContent = 'Save';

        const editCancelBtn = document.createElement('button');
        editCancelBtn.className = 'subdeck-btn-cancel';
        editCancelBtn.textContent = '✕';

        editBox.appendChild(editIcon);
        editBox.appendChild(editName);
        editBox.appendChild(editSaveBtn);
        editBox.appendChild(editCancelBtn);

        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpening = editBox.style.display === 'none';
          editBox.style.display = isOpening ? 'flex' : 'none';
          if (isOpening) editName.focus();
        });

        editCancelBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          editBox.style.display = 'none';
        });

        const saveEdit = async (e: Event) => {
          e.stopPropagation();
          const newName = editName.value.trim();
          const newIcon = editIcon.value.trim() || '📁';
          if (!newName) return;

          cat.name = newName;
          cat.icon = newIcon;
          await SubDeckStorage.saveCategories(categories);
          await this.render();
        };

        editSaveBtn.addEventListener('click', saveEdit);
        editName.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') saveEdit(e);
          if (e.key === 'Escape') editBox.style.display = 'none';
        });
        editIcon.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') saveEdit(e);
          if (e.key === 'Escape') editBox.style.display = 'none';
        });

        // Safe DOM construction for channel picker (Zero innerHTML, sorted alphabetically)
        const addPickerBox = document.createElement('div');
        addPickerBox.className = 'subdeck-add-picker';
        addPickerBox.style.display = 'none';

        const select = document.createElement('select');
        select.className = 'subdeck-add-select';

        const inFolderKeys = new Set(sortedFolderChannels.map(ch =>
          (ch.ucId && ch.ucId.startsWith('UC')) ? ch.ucId : (ch.handle ? ch.handle.toLowerCase() : ch.title.toLowerCase().trim())
        ));
        const seenAvail = new Set<string>();
        const availableChannels: SubscribedChannel[] = [];
        for (const ch of Object.values(channelsMap)) {
          if (!ch) continue;
          const key = (ch.ucId && ch.ucId.startsWith('UC'))
            ? ch.ucId
            : (ch.handle ? ch.handle.toLowerCase() : ch.title.toLowerCase().trim());
          if (!inFolderKeys.has(key) && !seenAvail.has(key)) {
            seenAvail.add(key);
            availableChannels.push(ch);
          }
        }
        availableChannels.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

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
            await SubDeckStorage.deleteCategory(cat.id);
            await this.render();
          }
        });

        const list = document.createElement('div');
        list.className = `subdeck-channel-list ${cat.isCollapsed ? 'collapsed' : ''}`;

        // Safe DOM construction for channel items sorted alphabetically

        sortedFolderChannels.forEach(ch => {
          const id = ch.ucId;
          const item = document.createElement('div');
          item.className = 'subdeck-channel-item';

          const link = document.createElement('a');
          link.className = 'subdeck-channel-link';
          const safeUrl = ch.url.startsWith('https://') || ch.url.startsWith('/') ? ch.url : '#';
          link.href = safeUrl;
          link.title = ch.title;

          const titleSpan = document.createElement('span');
          titleSpan.className = 'subdeck-channel-title';
          titleSpan.textContent = ch.title;

          // Channel avatar (24px circular profile picture)
          let avatarSrc = ch.avatarUrl;
          if (!avatarSrc) {
            const cleanHandle = (ch.handle || '').replace(/^[\/@]+/, '').toLowerCase();
            avatarSrc =
              initialAvatars.get(ch.ucId) ||
              initialAvatars.get(ch.handle) ||
              initialAvatars.get(cleanHandle) ||
              initialAvatars.get('@' + cleanHandle) ||
              initialAvatars.get(ch.title.toLowerCase().trim()) ||
              '';
            if (avatarSrc) ch.avatarUrl = avatarSrc;
          }

          const fallbackColor = (title: string): string => {
            let h = 0;
            for (const char of title) h = (h * 31 + char.charCodeAt(0)) >>> 0;
            return `hsl(${h % 360} 40% 36%)`;
          };

          const safe = safeAvatarUrl(avatarSrc);
          if (safe) {
            const avatar = document.createElement('img');
            avatar.className = 'subdeck-channel-avatar';
            avatar.src = safe;
            avatar.alt = '';
            avatar.loading = 'lazy';
            avatar.onerror = () => {
              avatar.style.display = 'none';
              const fallback = document.createElement('span');
              fallback.className = 'subdeck-channel-avatar-fallback';
              fallback.textContent = ch.title.charAt(0).toUpperCase();
              fallback.style.background = fallbackColor(ch.title);
              fallback.style.color = '#fff';
              link.insertBefore(fallback, titleSpan);
            };
            link.appendChild(avatar);
          } else {
            const fallback = document.createElement('span');
            fallback.className = 'subdeck-channel-avatar-fallback';
            fallback.textContent = ch.title.charAt(0).toUpperCase();
            fallback.style.background = fallbackColor(ch.title);
            fallback.style.color = '#fff';
            link.appendChild(fallback);
          }

          link.appendChild(titleSpan);

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
          await SubDeckStorage.saveCategories(categories);
        });

        // 2. FOLDER TITLE CLICK: Opens and filters the feed directly via YouTube's SPA router!
        folderMain.addEventListener('click', async (e: MouseEvent) => {
          if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
            return;
          }
          e.preventDefault();

          if (window.location.pathname.startsWith('/feed/subscriptions')) {
            document.querySelectorAll('.subdeck-folder-header').forEach(el => el.classList.remove('active-filter'));
            header.classList.add('active-filter');
            FeedFilter.setCategory(cat);
          } else {
            await SubDeckStorage.setActiveCategoryId(cat.id);
            SidebarManager.navigateToSubscriptionsFeed();
          }
        });

        folder.appendChild(header);
        folder.appendChild(editBox);
        folder.appendChild(addPickerBox);
        folder.appendChild(list);
        fragment.appendChild(folder);
      });

    // Atomic DOM replacement - single operation with zero interleaving window
    container.replaceChildren(fragment);

    // Release minHeight and ensure scroll position was preserved
    requestAnimationFrame(() => {
      if (container) {
        container.style.minHeight = '';
      }
      if (guideInner && guideInner.scrollTop !== savedGuideScroll) {
        guideInner.scrollTop = savedGuideScroll;
      }
    });
  }

  static async runDirectCategorization(): Promise<void> {
    const channelsMap = await SubDeckStorage.getChannels();
    const channels = Object.values(channelsMap);
    if (channels.length === 0) return;

    Logger.info('[SubShelf Sidebar] Running AICategorizer in YouTube Window context...');
    const state = await SubDeckStorage.getAll();
    const { decks: rawDecks, fallbackNotice } = await AICategorizer.categorizeAll(channels);
    if (fallbackNotice) {
      SidebarManager.showToast(fallbackNotice);
    }
    const finalDecks = AICategorizer.applyOverrides(
      rawDecks,
      state.categories || [],
      state.manualAssignments || {},
      state.channelExclusions || {},
      channels
    );
    await SubDeckStorage.saveCategories(finalDecks);
    await this.render();
  }

  static showToast(message: string, duration = 4000): void {
    const existing = document.getElementById('subdeck-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'subdeck-toast';
    toast.className = 'subdeck-toast';
    toast.textContent = message;

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.add('subdeck-toast-visible');
    });

    setTimeout(() => {
      toast.classList.remove('subdeck-toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  static async runQuickCategorization(): Promise<void> {
    return this.runDirectCategorization();
  }

  static async syncWithNativeSubscriptions(): Promise<void> {
    await SubscriptionSync.diffAndSync();
  }

  static clearActiveFilterHighlight(): void {
    document.querySelectorAll('.subdeck-folder-header').forEach(el => el.classList.remove('active-filter'));
  }

  /**
   * Navigates to YouTube's Subscriptions feed by clicking a real anchor,
   * allowing YouTube's internal SPA router to handle the transition without a page reload.
   */
  static navigateToSubscriptionsFeed(): void {
    const link = document.querySelector<HTMLAnchorElement>(
      'ytd-guide-renderer a[href="/feed/subscriptions"], ytd-mini-guide-renderer a[href="/feed/subscriptions"], ytd-guide-entry-renderer a[href="/feed/subscriptions"], #guide a[href="/feed/subscriptions"]'
    );
    if (link) {
      link.click();
    } else {
      window.location.href = '/feed/subscriptions';
    }
  }
}
