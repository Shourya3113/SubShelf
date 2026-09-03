import { SubDeckStorage } from '@/utils/storage';
import { ExportImport } from '@/utils/exportImport';
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
        const newId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);
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
        const card = document.createElement('div');
        card.className = 'deck-card';
        card.innerHTML = `
          <span class="deck-icon">${cat.icon}</span>
          <div class="deck-info">
            <div class="deck-title">${cat.name}</div>
            <div class="deck-subs-count">${cat.channelIds.length} channels</div>
          </div>
          <div class="deck-actions-btns">
            <button class="action-btn edit" title="Edit Deck">✏️</button>
            <button class="action-btn delete" title="Delete Deck">🗑️</button>
          </div>
        `;

        // Edit Deck
        card.querySelector('.edit')?.addEventListener('click', () => {
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
        card.querySelector('.delete')?.addEventListener('click', async () => {
          if (confirm(`Delete category "${cat.name}"? Channels will move to Uncategorized.`)) {
            await this.deleteDeck(cat);
          }
        });

        list.appendChild(card);
      });
  }

  private static async deleteDeck(deck: CategoryDeck): Promise<void> {
    let categories = await SubDeckStorage.getCategories();
    // Remove deck
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
    searchInput?.addEventListener('input', () => {
      this.renderChannels(searchInput.value.toLowerCase().trim());
    });
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
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:12px;">No channels found.</div>';
      return;
    }

    filtered.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'channel-card';

      // Find current deck
      const currentDeck = categories.find(c => c.channelIds.includes(ch.ucId)) || categories.find(c => c.id === '__uncategorized__');

      // Dropdown options
      const optionsHtml = categories
        .map(cat => `<option value="${cat.id}" ${currentDeck?.id === cat.id ? 'selected' : ''}>${cat.icon} ${cat.name}</option>`)
        .join('');

      card.innerHTML = `
        <div class="channel-meta">
          <div class="channel-title" title="${ch.title}">${ch.title}</div>
          <div class="channel-handle">${ch.handle}</div>
        </div>
        <select class="channel-deck-select" data-ucid="${ch.ucId}">
          ${optionsHtml}
        </select>
      `;

      // Handle category change
      const select = card.querySelector('.channel-deck-select') as HTMLSelectElement;
      select.addEventListener('change', async () => {
        const newCatId = select.value;
        await this.assignChannelToCategory(ch.ucId, newCatId);
      });

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

    // Load initial settings
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
        await ExportImport.importFromFile(file, 'merge');
        this.state = await SubDeckStorage.getAll();
        alert('SubDeck backup imported successfully!');
        await this.renderDecks();
        await this.renderChannels();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  PopupManager.init();
});
