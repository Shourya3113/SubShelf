import { SubDeckStorage } from '@/utils/storage';
import { ExportImport } from '@/utils/exportImport';
import { debounce } from '@/utils/debounce';
import { CategoryDeck, SubDeckStorageSchema } from '@/types';

class PopupManager {
  private static state: SubDeckStorageSchema | null = null;

  static async init(): Promise<void> {
    this.state = await SubDeckStorage.getAll();
    this.setupTabs();
    this.setupDeckForm();
    this.setupSettings();
    this.setupChannelSearch();
    await this.renderDecks();
    await this.renderChannels();
  }

  // --- TAB NAVIGATION ---
  private static setupTabs(): void {
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
    const panels = document.querySelectorAll<HTMLElement>('.tab-panel');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetTab = btn.getAttribute('data-tab');
        const targetPanel = document.getElementById(`tab-${targetTab}`);
        targetPanel?.classList.add('active');

        this.state = await SubDeckStorage.getAll();
        if (targetTab === 'decks') await this.renderDecks();
        if (targetTab === 'channels') await this.renderChannels();
      });
    });
  }

  // --- TAB 1: DECKS MANAGER ---
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
      form.style.display = 'block';
      nameInput.focus();
    });

    cancelBtn?.addEventListener('click', () => {
      form.style.display = 'none';
    });

    saveBtn?.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      const icon = iconInput.value.trim() || '📁';
      const editId = editIdInput.value;

      if (!name) return;

      const categories = (await SubDeckStorage.getCategories()).slice();

      if (editId) {
        // Edit existing deck
        const target = categories.find(c => c.id === editId);
        if (target) {
          target.name = name;
          target.icon = icon;
        }
      } else {
        // Create new deck
        let cleanId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (!cleanId) cleanId = 'deck-' + Date.now().toString(36);
        const newId = `${cleanId}-${Date.now().toString().slice(-4)}`;

        categories.push({
          id: newId,
          name,
          icon,
          color: '#3B82F6',
          channelIds: [],
          isCollapsed: true,
          sortOrder: categories.length,
        });
      }

      await SubDeckStorage.setAll({ categories });
      this.state = await SubDeckStorage.getAll();
      form.style.display = 'none';
      await this.renderDecks();
    });
  }

  private static async renderDecks(): Promise<void> {
    const list = document.getElementById('decks-list');
    if (!list) return;
    list.innerHTML = '';

    const categories = await SubDeckStorage.getCategories();

    categories
      .filter(cat => cat.id !== '__uncategorized__')
      .forEach(cat => {
        // Safe DOM construction: Zero innerHTML
        const card = document.createElement('div');
        card.className = 'deck-card';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'deck-icon';
        iconSpan.textContent = cat.icon;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'deck-info';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'deck-title';
        titleDiv.textContent = cat.name;

        const subsCountDiv = document.createElement('div');
        subsCountDiv.className = 'deck-subs-count';
        subsCountDiv.textContent = `${cat.channelIds.length} channels`;

        infoDiv.appendChild(titleDiv);
        infoDiv.appendChild(subsCountDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'deck-actions-btns';

        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit';
        editBtn.title = 'Edit Deck';
        editBtn.textContent = '✏️';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete';
        deleteBtn.title = 'Delete Deck';
        deleteBtn.textContent = '🗑️';

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        card.appendChild(iconSpan);
        card.appendChild(infoDiv);
        card.appendChild(actionsDiv);

        // Edit Deck
        editBtn.addEventListener('click', () => {
          const form = document.getElementById('deck-form') as HTMLElement;
          const editIdInput = document.getElementById('deck-edit-id') as HTMLInputElement;
          const iconInput = document.getElementById('deck-icon-input') as HTMLInputElement;
          const nameInput = document.getElementById('deck-name-input') as HTMLInputElement;

          editIdInput.value = cat.id;
          iconInput.value = cat.icon;
          nameInput.value = cat.name;
          form.style.display = 'block';
          nameInput.focus();
        });

        // Delete Deck
        deleteBtn.addEventListener('click', async () => {
          if (confirm(`Delete category "${cat.name}"? Channels will move to Uncategorized.`)) {
            await this.deleteDeck(cat);
          }
        });

        list.appendChild(card);
      });
  }

  private static async deleteDeck(deck: CategoryDeck): Promise<void> {
    let categories = await SubDeckStorage.getCategories();
    categories = categories.filter(c => c.id !== deck.id);

    // Add orphaned channels back to uncategorized
    const uncategorized = categories.find(c => c.id === '__uncategorized__');
    if (uncategorized) {
      const currentIds = new Set(uncategorized.channelIds);
      deck.channelIds.forEach(id => currentIds.add(id));
      uncategorized.channelIds = Array.from(currentIds);
    }

    await SubDeckStorage.setAll({ categories });
    this.state = await SubDeckStorage.getAll();
    await this.renderDecks();
  }

  // --- TAB 2: CHANNELS MANAGER ---
  private static setupChannelSearch(): void {
    const searchInput = document.getElementById('channel-search') as HTMLInputElement;
    if (!searchInput) return;

    // Debounce search input to prevent rapid UI thrashing
    const debouncedSearch = debounce(() => {
      this.renderChannels(searchInput.value.toLowerCase().trim());
    }, 150);

    searchInput.addEventListener('input', debouncedSearch);
  }

  private static async renderChannels(filter = ''): Promise<void> {
    const container = document.getElementById('channels-list');
    if (!container) return;
    container.innerHTML = '';

    const channelsMap = await SubDeckStorage.getChannels();
    const categories = await SubDeckStorage.getCategories();
    const channels = Object.values(channelsMap);

    const filtered = filter
      ? channels.filter(c => c.title.toLowerCase().includes(filter) || c.handle.toLowerCase().includes(filter))
      : channels;

    if (filtered.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.textAlign = 'center';
      emptyDiv.style.padding = '20px';
      emptyDiv.style.color = 'var(--text-secondary)';
      emptyDiv.style.fontSize = '12px';
      emptyDiv.textContent = 'No channels found.';
      container.appendChild(emptyDiv);
      return;
    }

    filtered.forEach(ch => {
      // Safe DOM construction: Zero innerHTML
      const card = document.createElement('div');
      card.className = 'channel-card';

      const currentDeck =
        categories.find(c => c.channelIds.includes(ch.ucId)) ||
        categories.find(c => c.id === '__uncategorized__');

      const metaDiv = document.createElement('div');
      metaDiv.className = 'channel-meta';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'channel-title';
      titleDiv.title = ch.title;
      titleDiv.textContent = ch.title;

      const handleDiv = document.createElement('div');
      handleDiv.className = 'channel-handle';
      handleDiv.textContent = ch.handle;

      metaDiv.appendChild(titleDiv);
      metaDiv.appendChild(handleDiv);

      const select = document.createElement('select');
      select.className = 'channel-deck-select';
      select.setAttribute('data-ucid', ch.ucId);

      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = `${cat.icon} ${cat.name}`;
        if (currentDeck?.id === cat.id) {
          option.selected = true;
        }
        select.appendChild(option);
      });

      select.addEventListener('change', async () => {
        const newCatId = select.value;
        await this.assignChannelToCategory(ch.ucId, newCatId);
      });

      card.appendChild(metaDiv);
      card.appendChild(select);
      container.appendChild(card);
    });
  }

  private static async assignChannelToCategory(ucId: string, newCatId: string): Promise<void> {
    const categories = await SubDeckStorage.getCategories();

    // Remove from all categories
    categories.forEach(cat => {
      cat.channelIds = cat.channelIds.filter(id => id !== ucId);
    });

    // Add to selected category
    const target = categories.find(c => c.id === newCatId);
    if (target) {
      target.channelIds.push(ucId);
    }

    await SubDeckStorage.setAll({ categories });
    this.state = await SubDeckStorage.getAll();
  }

  // --- TAB 3: SETTINGS ---
  private static setupSettings(): void {
    const aiProvider = document.getElementById('setting-ai-provider') as HTMLSelectElement;
    const apiKey = document.getElementById('setting-api-key') as HTMLInputElement;
    const hideShorts = document.getElementById('setting-hide-shorts') as HTMLInputElement;
    const exportBtn = document.getElementById('export-backup-btn');
    const importFile = document.getElementById('import-backup-file') as HTMLInputElement;

    if (!this.state) return;

    aiProvider.value = this.state.settings.aiProvider;
    apiKey.value = this.state.settings.apiKey || '';
    hideShorts.checked = this.state.settings.hideShortsFromFeed;

    aiProvider.addEventListener('change', async () => {
      if (this.state) {
        this.state.settings.aiProvider = aiProvider.value as 'gemini-nano' | 'gemini-api' | 'openai' | 'heuristic';
        await SubDeckStorage.setAll({ settings: this.state.settings });
      }
    });

    apiKey.addEventListener('change', async () => {
      if (this.state) {
        this.state.settings.apiKey = apiKey.value.trim();
        await SubDeckStorage.setAll({ settings: this.state.settings });
      }
    });

    hideShorts.addEventListener('change', async () => {
      if (this.state) {
        this.state.settings.hideShortsFromFeed = hideShorts.checked;
        await SubDeckStorage.setAll({ settings: this.state.settings });
      }
    });

    exportBtn?.addEventListener('click', async () => {
      await ExportImport.exportToFile();
    });

    importFile?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await ExportImport.importFromFile(file, 'merge');
          this.state = await SubDeckStorage.getAll();
          alert('SubDeck backup imported successfully!');
          await this.renderDecks();
          await this.renderChannels();
        } catch (err) {
          alert(`Failed to import backup: ${err instanceof Error ? err.message : 'Invalid file'}`);
        } finally {
          // Reset file input so user can re-import the same file if needed
          importFile.value = '';
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  PopupManager.init();
});
