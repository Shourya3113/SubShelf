import { SubDeckStorage } from '@/utils/storage';
import { ExportImport } from '@/utils/exportImport';
import { debounce } from '@/utils/debounce';
import { CategoryDeck, resolveGeminiModel, SubDeckStorageSchema, SubscribedChannel } from '@/types';
import { toast } from '@/utils/toast';
import { hasCloudPermission, requestCloudPermission } from '@/utils/cloudPermission';
import { safeAvatarUrl } from '@/utils/avatarUrl';
import { hydrateIcons, iconButton } from '@/ui/icons';
import { storeReviewUrl } from '@/utils/ratePrompt';
import {
  describeNanoStatus,
  getNanoStatus,
  resolveLanguageModelAPI,
} from '@/ai/nano';

const YOUTUBE_SUBSCRIPTIONS_URL = 'https://www.youtube.com/feed/subscriptions';

const byTitle = (a: SubscribedChannel, b: SubscribedChannel) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

const openTab = (url: string) => {
  if (chrome.tabs?.create) chrome.tabs.create({ url });
  else window.open(url, '_blank');
};

class PopupManager {
  private static state: SubDeckStorageSchema | null = null;

  static async init(): Promise<void> {
    hydrateIcons();
    const versionEl = document.getElementById('version');
    if (versionEl) {
      versionEl.textContent = `v${chrome.runtime.getManifest().version}`;
    }
    this.state = await SubDeckStorage.getAll();
    this.setupTabs();
    this.setupDeckForm();
    this.setupSettings();
    this.setupChannelSearch();
    document.getElementById('open-youtube-btn')?.addEventListener('click', () => openTab(YOUTUBE_SUBSCRIPTIONS_URL));
    await this.renderDecks();
    await this.renderChannels();
  }

  // --- TABS ---
  private static setupTabs(): void {
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
    const panels = document.querySelectorAll<HTMLElement>('.tab-panel');

    tabButtons.forEach(btn => {
      btn.setAttribute('aria-selected', String(btn.classList.contains('active')));
      btn.addEventListener('click', async () => {
        tabButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        panels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const targetTab = btn.getAttribute('data-tab');
        document.getElementById(`tab-${targetTab}`)?.classList.add('active');

        this.state = await SubDeckStorage.getAll();
        if (targetTab === 'decks') await this.renderDecks();
        if (targetTab === 'channels') await this.renderChannels();
      });
    });
  }

  // --- FOLDERS ---
  private static setupDeckForm(): void {
    const addBtn = document.getElementById('add-deck-btn');
    const form = document.getElementById('deck-form') as HTMLElement;
    const saveBtn = document.getElementById('deck-save-btn');
    const cancelBtn = document.getElementById('deck-cancel-btn');
    const editIdInput = document.getElementById('deck-edit-id') as HTMLInputElement;
    const iconInput = document.getElementById('deck-icon-input') as HTMLInputElement;
    const nameInput = document.getElementById('deck-name-input') as HTMLInputElement;

    addBtn?.addEventListener('click', () => {
      editIdInput.value = '';
      iconInput.value = '📁';
      nameInput.value = '';
      form.hidden = false;
      nameInput.focus();
    });

    cancelBtn?.addEventListener('click', () => {
      form.hidden = true;
    });

    const save = async () => {
      const name = nameInput.value.trim();
      const icon = iconInput.value.trim() || '📁';
      const editId = editIdInput.value;
      if (!name) return;

      if (editId) {
        await SubDeckStorage.updateCategory(editId, { name, icon });
      } else {
        const categories = await SubDeckStorage.getCategories();
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'deck-' + Date.now().toString(36);
        await SubDeckStorage.createCategory({
          id: `${slug}-${Date.now().toString().slice(-4)}`,
          name,
          icon,
          color: '#3B82F6',
          channelIds: [],
          isCollapsed: true,
          sortOrder: categories.length,
          isSystem: false,
        });
      }

      this.state = await SubDeckStorage.getAll();
      form.hidden = true;
      await this.renderDecks();
    };
    saveBtn?.addEventListener('click', save);
    for (const input of [nameInput, iconInput]) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') form.hidden = true;
      });
    }
  }

  private static async renderDecks(): Promise<void> {
    const list = document.getElementById('decks-list');
    if (!list) return;

    // Normalized view: folder IDs are already canonical and deduplicated, system channels removed
    const { categories, channels: channelsMap } = await SubDeckStorage.getAll();
    this.renderFoldersEmptyState(categories.length === 0, Object.keys(channelsMap).length);

    list.replaceChildren(
      ...[...categories].sort((a, b) => a.sortOrder - b.sortOrder).map(cat => {
        const row = document.createElement('div');
        row.className = 'list-row';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'row-emoji';
        iconSpan.textContent = cat.icon;

        const info = document.createElement('div');
        info.className = 'row-info';
        const title = document.createElement('div');
        title.className = 'row-title';
        title.textContent = cat.name;
        const count = cat.channelIds.filter(id => channelsMap[id]).length;
        const sub = document.createElement('div');
        sub.className = 'row-sub';
        sub.textContent = `${count} channel${count === 1 ? '' : 's'}`;
        info.append(title, sub);

        const editBtn = iconButton('edit', `Rename ${cat.name}`, 'row-action', 18);
        editBtn.addEventListener('click', () => {
          (document.getElementById('deck-edit-id') as HTMLInputElement).value = cat.id;
          (document.getElementById('deck-icon-input') as HTMLInputElement).value = cat.icon;
          const nameInput = document.getElementById('deck-name-input') as HTMLInputElement;
          nameInput.value = cat.name;
          (document.getElementById('deck-form') as HTMLElement).hidden = false;
          nameInput.focus();
        });

        const deleteBtn = iconButton('delete', `Delete ${cat.name}`, 'row-action danger', 18);
        deleteBtn.addEventListener('click', async () => {
          if (confirm(`Delete "${cat.name}"? Its channels stay subscribed and become unsorted.`)) {
            await this.deleteDeck(cat);
          }
        });

        row.append(iconSpan, info, editBtn, deleteBtn);
        return row;
      })
    );
  }

  /** First-run guidance: explains where folders come from instead of showing an empty list. */
  private static renderFoldersEmptyState(empty: boolean, channelCount: number): void {
    const box = document.getElementById('folders-empty');
    const text = document.getElementById('folders-empty-text');
    if (!box || !text) return;
    box.hidden = !empty;
    text.textContent = channelCount > 0
      ? `SubShelf found ${channelCount} subscriptions. Open YouTube and click Auto-sort in the sidebar to put them into folders in one click, or create your own folder below.`
      : 'SubShelf reads your subscriptions from YouTube\'s sidebar. Open YouTube while signed in, then click Auto-sort in the sidebar.';
  }

  private static async deleteDeck(deck: CategoryDeck): Promise<void> {
    await SubDeckStorage.deleteCategory(deck.id);
    this.state = await SubDeckStorage.getAll();
    await this.renderDecks();
  }

  // --- CHANNELS ---
  private static setupChannelSearch(): void {
    const searchInput = document.getElementById('channel-search') as HTMLInputElement;
    if (!searchInput) return;
    const debouncedSearch = debounce(() => {
      this.renderChannels(searchInput.value.toLowerCase().trim());
    }, 150);
    searchInput.addEventListener('input', debouncedSearch);
  }

  private static buildAvatar(ch: SubscribedChannel): HTMLElement {
    const src = safeAvatarUrl(ch.avatarUrl);
    if (src) {
      const img = document.createElement('img');
      img.className = 'row-avatar';
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      return img;
    }
    const fallback = document.createElement('span');
    fallback.className = 'row-avatar row-avatar-fallback';
    fallback.textContent = ch.title.charAt(0).toUpperCase();
    return fallback;
  }

  private static async renderChannels(filter = ''): Promise<void> {
    const container = document.getElementById('channels-list');
    if (!container) return;

    // Normalized view: one record per channel, system channels already removed
    const { categories, channels: channelsMap } = await SubDeckStorage.getAll();
    const channels = Object.values(channelsMap);
    const sorted = (filter
      ? channels.filter(c => c.title.toLowerCase().includes(filter) || c.handle.toLowerCase().includes(filter))
      : channels.slice()
    ).sort(byTitle);

    if (sorted.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-text list-empty';
      empty.textContent = channels.length === 0
        ? 'No subscriptions yet. Open YouTube while signed in and SubShelf will find them.'
        : 'No channels match your search.';
      container.replaceChildren(empty);
      return;
    }

    const folders = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    container.replaceChildren(...sorted.map(ch => {
      const row = document.createElement('div');
      row.className = 'list-row';

      const info = document.createElement('div');
      info.className = 'row-info';
      const title = document.createElement('div');
      title.className = 'row-title';
      title.title = ch.title;
      title.textContent = ch.title;
      const handle = document.createElement('div');
      handle.className = 'row-sub';
      handle.textContent = ch.handle;
      info.append(title, handle);

      const select = document.createElement('select');
      select.className = 'row-select';
      select.setAttribute('aria-label', `Folder for ${ch.title}`);
      const currentDeck = categories.find(c => c.channelIds.includes(ch.ucId));
      const none = document.createElement('option');
      none.value = '';
      none.textContent = 'No folder';
      none.selected = !currentDeck;
      select.appendChild(none);
      for (const cat of folders) {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = `${cat.icon} ${cat.name}`;
        option.selected = currentDeck?.id === cat.id;
        select.appendChild(option);
      }
      select.addEventListener('change', () => this.assignChannelToCategory(ch.ucId, select.value));

      row.append(this.buildAvatar(ch), info, select);

      // Takes the channel out of every folder and keeps it out of Auto-sort (you stay subscribed on
      // YouTube, so removing it from SubShelf itself would only last until the next sync)
      if (currentDeck) {
        const removeBtn = iconButton('close', `Remove ${ch.title} from all folders`, 'row-action danger', 18);
        removeBtn.addEventListener('click', async () => {
          if (confirm(`Remove "${ch.title}" from all folders? It stays in this list, and Auto-sort leaves it unsorted until you choose a folder.`)) {
            await SubDeckStorage.setChannelCategory(ch.ucId, '');
            this.state = await SubDeckStorage.getAll();
            await this.renderChannels(filter);
          }
        });
        row.appendChild(removeBtn);
      } else {
        const spacer = document.createElement('span');
        spacer.className = 'row-action-spacer';
        row.appendChild(spacer); // keeps the folder dropdowns aligned
      }
      return row;
    }));
  }

  private static async assignChannelToCategory(ucId: string, newCatId: string): Promise<void> {
    await SubDeckStorage.setChannelCategory(ucId, newCatId);
    this.state = await SubDeckStorage.getAll();
  }

  // --- SETTINGS ---
  private static setupSettings(): void {
    const aiProvider = document.getElementById('setting-ai-provider') as HTMLSelectElement;
    const apiKey = document.getElementById('setting-api-key') as HTMLInputElement;
    const hideShorts = document.getElementById('setting-hide-shorts') as HTMLInputElement;
    const resetOverridesBtn = document.getElementById('reset-overrides-btn');
    const exportBtn = document.getElementById('export-backup-btn');
    const importFile = document.getElementById('import-backup-file') as HTMLInputElement;

    if (!this.state) return;

    aiProvider.value = this.state.settings.aiProvider;
    hideShorts.checked = this.state.settings.hideShortsFromFeed;

    // Securely retrieve API key from background service worker
    chrome.runtime.sendMessage({ type: 'subshelf-get-api-key' }, (res) => {
      if (res?.success && typeof res.apiKey === 'string') {
        apiKey.value = res.apiKey;
      }
    });

    resetOverridesBtn?.addEventListener('click', async () => {
      if (confirm('Forget every channel you placed or removed by hand? Auto-sort will re-sort everything from scratch next time.')) {
        await SubDeckStorage.clearOverrides();
        this.state = await SubDeckStorage.getAll();
        toast('Your corrections have been cleared.');
      }
    });

    let previousProvider = aiProvider.value;
    // Known up front so the change handler can call permissions.request without awaiting first
    // (an await before it could lose the click's user gesture)
    let cloudGranted = false;
    hasCloudPermission().then(granted => {
      cloudGranted = granted;
      if (!granted && aiProvider.value === 'gemini-api') {
        toast('Cloud AI is selected, but Chrome\'s permission was not granted. Select it again to allow access.');
      }
    });

    aiProvider.addEventListener('change', async () => {
      const val = aiProvider.value as 'gemini-nano' | 'gemini-api' | 'heuristic';
      if (val === 'gemini-api' && !cloudGranted) {
        // Chrome's permission prompt usually closes this popup, so the service worker records the
        // opt-in and switches the provider itself once the permission is granted (onAdded).
        const granted = requestCloudPermission();
        chrome.runtime.sendMessage({ type: 'subshelf-cloud-optin-pending' });
        if (!(await granted)) {
          aiProvider.value = previousProvider;
          toast('Cloud AI needs permission to contact Google\'s Gemini API. Your setting was not changed.');
          return;
        }
      }
      previousProvider = val;
      if (this.state) {
        this.state.settings.aiProvider = val;
      }
      this.toggleProviderSections(val);
      await SubDeckStorage.updateSettings({ aiProvider: val });
    });

    this.toggleProviderSections(aiProvider.value);
    this.setupNanoModel();

    let keyTimer: number | undefined;
    const saveKey = () => {
      chrome.runtime.sendMessage({ type: 'subshelf-set-api-key', apiKey: apiKey.value.trim() });
    };
    apiKey.addEventListener('input', () => {
      clearTimeout(keyTimer);
      keyTimer = window.setTimeout(saveKey, 400);
    });
    apiKey.addEventListener('blur', saveKey);

    const geminiModel = document.getElementById('setting-gemini-model') as HTMLInputElement;
    if (geminiModel) {
      geminiModel.value = resolveGeminiModel(this.state.settings.geminiModel);
      geminiModel.addEventListener('change', async () => {
        const val = geminiModel.value.trim();
        if (this.state) {
          this.state.settings.geminiModel = val;
        }
        await SubDeckStorage.updateSettings({ geminiModel: val });
      });
    }

    hideShorts.addEventListener('change', async () => {
      const val = hideShorts.checked;
      if (this.state) {
        this.state.settings.hideShortsFromFeed = val;
      }
      await SubDeckStorage.updateSettings({ hideShortsFromFeed: val });
    });

    exportBtn?.addEventListener('click', async () => {
      await ExportImport.exportToFile();
    });

    importFile?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await ExportImport.importFromFile(file);
          this.state = await SubDeckStorage.getAll();
          toast('Backup imported.');
          await this.renderDecks();
          await this.renderChannels();
        } catch (err) {
          toast(`Failed to import backup: ${err instanceof Error ? err.message : 'Invalid file'}`);
        } finally {
          // Reset file input so user can re-import the same file if needed
          importFile.value = '';
        }
      }
    });

    // Chrome Web Store reviews; hidden for copies that didn't come from the store
    const rateLink = document.getElementById('footer-rate-link') as HTMLAnchorElement | null;
    const reviewUrl = storeReviewUrl();
    if (rateLink) {
      if (reviewUrl) rateLink.href = reviewUrl;
      else rateLink.hidden = true;
    }

    document.querySelectorAll<HTMLAnchorElement>('.footer-link').forEach((link) => {
      link.addEventListener('click', (e: Event) => {
        e.preventDefault();
        openTab(link.href);
      });
    });
  }

  /** Shows only the settings that belong to the chosen engine. */
  private static toggleProviderSections(provider: string): void {
    const nano = document.getElementById('nano-group');
    if (nano) nano.hidden = provider !== 'gemini-nano';
    const cloud = document.getElementById('cloud-group');
    if (cloud) cloud.hidden = provider !== 'gemini-api';
  }

  /** Status only: SubShelf never downloads the model; it uses it if Chrome already has it. */
  private static async setupNanoModel(): Promise<void> {
    const badge = document.getElementById('nano-status-badge');
    const text = document.getElementById('nano-status-text');
    if (!badge || !text) return;
    const status = await getNanoStatus(resolveLanguageModelAPI());
    const view = describeNanoStatus(status);
    badge.dataset.status = status;
    badge.textContent = view.badge;
    text.textContent = view.text;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  PopupManager.init();
});
