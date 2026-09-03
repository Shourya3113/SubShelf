import { SubDeckExportPayload, SubDeckStorageSchema, CategoryDeck, SubscribedChannel } from '@/types';
import { SubDeckStorage } from './storage';

export class ExportImport {
  static async exportToFile(): Promise<void> {
    const data = await SubDeckStorage.getAll();

    // Security: Strip sensitive credentials before exporting
    const sanitizedData: SubDeckStorageSchema = {
      ...data,
      settings: {
        ...data.settings,
        apiKey: undefined,
      },
    };

    const payload: SubDeckExportPayload = {
      exportVersion: 1,
      exportedAt: Date.now(),
      data: sanitizedData,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subdeck_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static async importFromFile(file: File, mode: 'merge' | 'overwrite' = 'merge'): Promise<void> {
    let payload: SubDeckExportPayload;
    try {
      const text = await file.text();
      payload = JSON.parse(text) as SubDeckExportPayload;
    } catch {
      throw new Error('Selected file is not valid JSON');
    }

    // Strict schema validation
    if (!payload || typeof payload !== 'object' || !payload.data || payload.exportVersion !== 1) {
      throw new Error('Invalid SubDeck backup file format');
    }

    if (!Array.isArray(payload.data.categories) || typeof payload.data.channels !== 'object') {
      throw new Error('Corrupted backup structure: invalid categories or channels');
    }

    // Validate categories
    const validatedCategories: CategoryDeck[] = [];
    for (const cat of payload.data.categories) {
      if (
        typeof cat.id === 'string' &&
        typeof cat.name === 'string' &&
        typeof cat.icon === 'string' &&
        Array.isArray(cat.channelIds)
      ) {
        validatedCategories.push({
          id: cat.id.slice(0, 100),
          name: cat.name.slice(0, 100),
          icon: cat.icon.slice(0, 10),
          color: typeof cat.color === 'string' ? cat.color.slice(0, 20) : '#3B82F6',
          channelIds: cat.channelIds.filter(id => typeof id === 'string' && id.length < 100),
          isCollapsed: !!cat.isCollapsed,
          sortOrder: typeof cat.sortOrder === 'number' ? cat.sortOrder : 0,
          isSystem: !!cat.isSystem,
        });
      }
    }

    // Validate channels & sanitize against prototype pollution
    const validatedChannels: Record<string, SubscribedChannel> = {};
    const validatedHandles: Record<string, string> = {};

    for (const [ucId, ch] of Object.entries(payload.data.channels || {})) {
      if (ucId === '__proto__' || ucId === 'constructor' || ucId === 'prototype') continue;
      if (ch && typeof ch === 'object' && typeof ch.title === 'string' && typeof ch.ucId === 'string') {
        validatedChannels[ch.ucId] = {
          ucId: ch.ucId,
          title: ch.title.slice(0, 200),
          handle: typeof ch.handle === 'string' ? ch.handle.slice(0, 100) : '',
          url: typeof ch.url === 'string' ? ch.url.slice(0, 300) : '',
          avatarUrl: typeof ch.avatarUrl === 'string' ? ch.avatarUrl.slice(0, 500) : '',
          categoryIds: Array.isArray(ch.categoryIds) ? ch.categoryIds : [],
          discoveredAt: typeof ch.discoveredAt === 'number' ? ch.discoveredAt : Date.now(),
        };
        if (ch.handle) {
          validatedHandles[ch.handle] = ch.ucId;
        }
      }
    }

    if (mode === 'overwrite') {
      const current = await SubDeckStorage.getAll();
      await SubDeckStorage.setAll({
        categories: validatedCategories,
        channels: validatedChannels,
        handleToUcId: validatedHandles,
        activeCategoryId: null,
        settings: current.settings, // Preserve user's local settings and API key
      });
    } else {
      const current = await SubDeckStorage.getAll();
      const existingCategoryIds = new Set(current.categories.map(c => c.id));
      const mergedCategories = [
        ...current.categories,
        ...validatedCategories.filter(c => !existingCategoryIds.has(c.id)),
      ];
      const mergedChannels = { ...current.channels, ...validatedChannels };
      const mergedHandles = { ...current.handleToUcId, ...validatedHandles };

      await SubDeckStorage.setAll({
        categories: mergedCategories,
        channels: mergedChannels,
        handleToUcId: mergedHandles,
      });
    }
  }
}
