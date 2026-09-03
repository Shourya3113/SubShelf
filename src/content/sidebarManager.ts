import { getSubscriptionSection } from '@/config/selectors';
import { SubDeckStorage } from '@/utils/storage';
import { ChannelExtractor } from './channelExtractor';

export class SidebarManager {
  private static containerId = 'subdeck-sidebar-container';
  private static observer: MutationObserver | null = null;

  static async ensureInjected(): Promise<void> {
    const subSection = getSubscriptionSection();
    if (!subSection) return;

    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      // Insert directly above the subscriptions section
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

    // Show All Button
    const showAllBtn = document.createElement('button');
    showAllBtn.innerText = '☰ Show All Subscriptions';
    showAllBtn.className = 'subdeck-clear-filter';
    showAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.subdeck-folder-header').forEach(el => el.classList.remove('active-filter'));
      document.dispatchEvent(new CustomEvent('subdeck-filter-category', { detail: null }));
    });
    container.appendChild(showAllBtn);

    categories
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(cat => {
        const folder = document.createElement('div');
        folder.className = 'subdeck-folder-container';

        const header = document.createElement('div');
        header.className = `subdeck-folder-header ${activeCategory === cat.id ? 'active-filter' : ''}`;
        header.innerHTML = `
          <span>${cat.icon}</span>
          <span style="margin-left: 8px; font-weight: 500;">${cat.name}</span>
          <span class="subdeck-channel-count">${cat.channelIds.length}</span>
          <span class="subdeck-chevron ${cat.isCollapsed ? '' : 'open'}">▼</span>
        `;

        const list = document.createElement('div');
        list.className = `subdeck-channel-list ${cat.isCollapsed ? 'collapsed' : ''}`;

        cat.channelIds.forEach(id => {
          const ch = channelsMap[id];
          if (!ch) return;
          const item = document.createElement('a');
          item.className = 'subdeck-channel-item';
          item.href = ch.url;

          const avatarHtml = ch.avatarUrl
            ? `<img class="subdeck-channel-avatar" src="${ch.avatarUrl}" alt="" onerror="this.style.display='none'" />`
            : `<div class="subdeck-channel-avatar" style="display:flex;align-items:center;justify-content:center;font-size:12px;">📺</div>`;

          item.innerHTML = `
            ${avatarHtml}
            <span>${ch.title}</span>
          `;
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
          }
        });

        folder.appendChild(header);
        folder.appendChild(list);
        container.appendChild(folder);
      });
  }

  static async syncWithNativeSubscriptions(): Promise<void> {
    const scraped = ChannelExtractor.scrapeFromSidebar();
    if (scraped.length === 0) return;

    const storageChannels = await SubDeckStorage.getChannels();
    let hasChanges = false;

    for (const ch of scraped) {
      if (!storageChannels[ch.ucId]) {
        await SubDeckStorage.addChannel(ch);
        await SubDeckStorage.addChannelToCategory(ch.ucId, '__uncategorized__');
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await this.render();
    }
  }
}
