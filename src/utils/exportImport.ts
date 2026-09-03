import { SubDeckExportPayload } from '@/types';
import { SubDeckStorage } from './storage';

export class ExportImport {
  static async exportToFile(): Promise<void> {
    const data = await SubDeckStorage.getAll();
    const payload: SubDeckExportPayload = {
      exportVersion: 1,
      exportedAt: Date.now(),
      data,
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
    const text = await file.text();
    const payload = JSON.parse(text) as SubDeckExportPayload;
    if (!payload.data || !payload.exportVersion) {
      throw new Error('Invalid SubDeck backup file format');
    }
    if (mode === 'overwrite') {
      await SubDeckStorage.setAll(payload.data);
    } else {
      const current = await SubDeckStorage.getAll();
      const existingCategoryIds = new Set(current.categories.map(c => c.id));
      const mergedCategories = [
        ...current.categories,
        ...payload.data.categories.filter(c => !existingCategoryIds.has(c.id)),
      ];
      const mergedChannels = { ...current.channels, ...payload.data.channels };
      const mergedHandles = { ...current.handleToUcId, ...payload.data.handleToUcId };
      await SubDeckStorage.setAll({
        categories: mergedCategories,
        channels: mergedChannels,
        handleToUcId: mergedHandles,
      });
    }
  }
}
