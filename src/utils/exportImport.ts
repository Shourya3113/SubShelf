import { SubDeckExportPayload, SubDeckStorageSchema, CategoryDeck, SubscribedChannel } from '@/types';
import { findMatchingFolder, mergeFolders, SubDeckStorage } from './storage';
import { safeAvatarUrl } from './avatarUrl';
import { cleanDescription } from './channelDetails';
import { SUBDECK_TAXONOMY } from '@/ai/heuristic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_CATEGORIES = 200;
const MAX_CHANNELS = 10_000;
const MAX_CHANNELS_PER_CATEGORY = 5_000;
const MAX_OVERRIDE_ENTRIES = 10_000;

const CHANNEL_KEY = /^(?:UC[\w-]{22}|@[\p{L}\p{N}_.\-·]{1,100})$/u;
const HANDLE = /^@?[\p{L}\p{N}_.\-·]{1,100}$/u;

const SYSTEM_DECK_IDS = new Set<string>([
  ...SUBDECK_TAXONOMY.map(t => t.id),
  '__uncategorized__',
]);

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const okKey = (v: unknown): v is string =>
  typeof v === 'string' && CHANNEL_KEY.test(v) && !FORBIDDEN_KEYS.has(v);

/** A backup file that passed validation. */
export type ImportData = Pick<SubDeckStorageSchema, 'categories' | 'channels' | 'handleToUcId' | 'channelExclusions' | 'manualAssignments'>;

export interface ImportPreview {
  addFolders: number;
  combineFolders: number;
  newChannels: number;
  /** Folders in the file, which is what Replace leaves. */
  fileFolders: number;
  /** Folders only this account has, which Replace removes. */
  dropFolders: string[];
  /** Channels in a folder now that are in none after Replace. */
  unfiledChannels: number;
}

export type ImportMode = 'merge' | 'replace';

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

export function previewImport(data: ImportData, current: Pick<SubDeckStorageSchema, 'categories' | 'channels'>): ImportPreview {
  const merged = mergeFolders(current.categories, data.categories);
  const inFile = new Set(data.categories.flatMap(c => c.channelIds));
  const filedNow = new Set(current.categories.flatMap(c => c.channelIds));
  return {
    addFolders: merged.added,
    combineFolders: merged.combined,
    newChannels: Object.keys(data.channels).filter(id => !current.channels[id]).length,
    fileFolders: data.categories.length,
    dropFolders: current.categories.filter(c => !findMatchingFolder(data.categories, c)).map(c => c.name),
    unfiledChannels: [...filedNow].filter(id => !inFile.has(id)).length,
  };
}

export function describeMerge(p: ImportPreview): string {
  const parts = [
    p.addFolders > 0 ? `adds ${count(p.addFolders, 'folder')}` : '',
    p.combineFolders > 0 ? `combines ${p.addFolders > 0 ? p.combineFolders : count(p.combineFolders, 'folder')}` : '',
    p.newChannels > 0 ? count(p.newChannels, 'new channel') : '',
  ].filter(Boolean);
  if (parts.length === 0) return 'Nothing new in this file.';
  const text = parts.join(', ');
  return `${text[0].toUpperCase()}${text.slice(1)}. Everything you have now stays.`;
}

export function describeReplace(p: ImportPreview): string {
  const shown = p.dropFolders.slice(0, 5).join(', ');
  const more = p.dropFolders.length > 5 ? ` and ${p.dropFolders.length - 5} more` : '';
  return [
    `Uses the ${count(p.fileFolders, 'folder')} in this file.`,
    p.dropFolders.length > 0 ? `Removes ${count(p.dropFolders.length, 'folder')} you only have on this device: ${shown}${more}.` : '',
    p.unfiledChannels > 0 ? `${count(p.unfiledChannels, 'channel')} will leave your folders.` : '',
    'Your current folders are saved to a backup file first.',
  ].filter(Boolean).join(' ');
}

export function describeMergeResult(r: { added: number; combined: number; kept: number }): string {
  // Only what happened: "kept 0" would read as if nothing was kept
  const parts = [
    r.added > 0 ? `added ${count(r.added, 'folder')}` : '',
    r.combined > 0 ? `combined ${r.added > 0 ? r.combined : count(r.combined, 'folder')}` : '',
    r.kept > 0 && (r.added > 0 || r.combined > 0) ? `kept ${r.kept}` : '',
  ].filter(Boolean);
  if (parts.length === 0) return 'Nothing new in this file.';
  const text = parts.join(', ');
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}

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
    a.download = `subshelf_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /** Reads and validates a backup file without changing anything. */
  static async parseBackup(file: File): Promise<ImportData> {
    // 1. File size cap
    if (!file || typeof file.size !== 'number') {
      throw new Error('Invalid file selected');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Backup file exceeds maximum allowed size (5MB)');
    }

    let payload: SubDeckExportPayload;
    try {
      const text = await file.text();
      payload = JSON.parse(text) as SubDeckExportPayload;
    } catch {
      throw new Error('Selected file is not valid JSON');
    }

    // 2. Strict schema structure validation
    if (!payload || typeof payload !== 'object' || !payload.data || payload.exportVersion !== 1) {
      throw new Error('Invalid SubShelf backup file format');
    }

    if (!Array.isArray(payload.data.categories) || typeof payload.data.channels !== 'object' || payload.data.channels === null) {
      throw new Error('Corrupted backup structure: invalid categories or channels');
    }

    // 3. Entry count caps
    if (payload.data.categories.length > MAX_CATEGORIES) {
      throw new Error(`Backup exceeds maximum allowed category folders (${MAX_CATEGORIES})`);
    }

    const rawChannelsEntries = Object.entries(payload.data.channels);
    if (rawChannelsEntries.length > MAX_CHANNELS) {
      throw new Error(`Backup exceeds maximum allowed channels (${MAX_CHANNELS})`);
    }

    // 4. Validate incoming categories
    const validatedCategories: CategoryDeck[] = [];
    for (const cat of payload.data.categories) {
      if (validatedCategories.length >= MAX_CATEGORIES) break;
      if (
        cat &&
        typeof cat === 'object' &&
        typeof cat.id === 'string' &&
        typeof cat.name === 'string' &&
        typeof cat.icon === 'string' &&
        Array.isArray(cat.channelIds) &&
        !FORBIDDEN_KEYS.has(cat.id) &&
        cat.id.trim().length > 0 &&
        cat.id.length <= 100
      ) {
        const cleanId = cat.id.trim();
        const cleanIds = Array.from(new Set(
          cat.channelIds
            .filter((id): id is string => okKey(id))
            .slice(0, MAX_CHANNELS_PER_CATEGORY)
        ));

        validatedCategories.push({
          id: cleanId,
          name: cat.name.slice(0, 100).trim(),
          icon: cat.icon.slice(0, 10),
          color: typeof cat.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(cat.color) ? cat.color : '#3B82F6',
          channelIds: cleanIds,
          isCollapsed: Boolean(cat.isCollapsed),
          sortOrder: typeof cat.sortOrder === 'number' && Number.isFinite(cat.sortOrder) ? cat.sortOrder : 0,
          isSystem: SYSTEM_DECK_IDS.has(cleanId),
        });
      }
    }

    // 5. Validate incoming channels
    const validatedChannels: Record<string, SubscribedChannel> = Object.create(null);
    const validatedHandles: Record<string, string> = Object.create(null);

    for (const [key, ch] of rawChannelsEntries) {
      if (Object.keys(validatedChannels).length >= MAX_CHANNELS) break;
      if (!okKey(key)) continue;

      if (
        ch &&
        typeof ch === 'object' &&
        typeof ch.title === 'string' &&
        typeof ch.ucId === 'string' &&
        ch.ucId === key &&
        okKey(ch.ucId)
      ) {
        const handle = typeof ch.handle === 'string' && HANDLE.test(ch.handle.trim())
          ? ch.handle.trim().slice(0, 100)
          : '';
        const url = typeof ch.url === 'string' && (ch.url.startsWith('https://www.youtube.com/') || ch.url.startsWith('/'))
          ? ch.url.slice(0, 300)
          : (ch.ucId.startsWith('UC') ? `https://www.youtube.com/channel/${ch.ucId}` : `https://www.youtube.com/${handle || ch.ucId}`);

        validatedChannels[ch.ucId] = {
          ucId: ch.ucId,
          title: ch.title.slice(0, 200).trim(),
          handle,
          url,
          avatarUrl: safeAvatarUrl(ch.avatarUrl),
          discoveredAt: typeof ch.discoveredAt === 'number' && Number.isFinite(ch.discoveredAt) ? ch.discoveredAt : Date.now(),
        };
        const description = cleanDescription(ch.description);
        if (description !== undefined) validatedChannels[ch.ucId].description = description;

        if (handle && !FORBIDDEN_KEYS.has(handle)) {
          validatedHandles[handle] = ch.ucId;
        }
      }
    }

    if (payload.data.handleToUcId && typeof payload.data.handleToUcId === 'object') {
      for (const [h, ucId] of Object.entries(payload.data.handleToUcId)) {
        if (typeof h === 'string' && HANDLE.test(h) && !FORBIDDEN_KEYS.has(h) && okKey(ucId)) {
          validatedHandles[h] = ucId;
        }
      }
    }

    // 6. Validate incoming channelExclusions & manualAssignments
    const validatedExclusions: Record<string, string[]> = Object.create(null);
    if (payload.data.channelExclusions && typeof payload.data.channelExclusions === 'object' && payload.data.channelExclusions !== null) {
      for (const [key, cats] of Object.entries(payload.data.channelExclusions)) {
        if (Object.keys(validatedExclusions).length >= MAX_OVERRIDE_ENTRIES) break;
        if (!okKey(key)) continue;
        if (Array.isArray(cats)) {
          const cleanCats = cats
            .filter((c): c is string => typeof c === 'string' && !FORBIDDEN_KEYS.has(c) && c.length <= 100)
            .slice(0, 100);
          if (cleanCats.length > 0) {
            validatedExclusions[key] = cleanCats;
          }
        }
      }
    }

    const validatedManualAssignments: Record<string, string[]> = Object.create(null);
    if (payload.data.manualAssignments && typeof payload.data.manualAssignments === 'object' && payload.data.manualAssignments !== null) {
      for (const [key, cats] of Object.entries(payload.data.manualAssignments)) {
        if (Object.keys(validatedManualAssignments).length >= MAX_OVERRIDE_ENTRIES) break;
        if (!okKey(key)) continue;
        if (Array.isArray(cats)) {
          const cleanCats = cats
            .filter((c): c is string => typeof c === 'string' && !FORBIDDEN_KEYS.has(c) && c.length <= 100)
            .slice(0, 100);
          if (cleanCats.length > 0) {
            validatedManualAssignments[key] = cleanCats;
          }
        }
      }
    }

    return {
      categories: validatedCategories,
      channels: { ...validatedChannels },
      handleToUcId: { ...validatedHandles },
      channelExclusions: { ...validatedExclusions },
      manualAssignments: { ...validatedManualAssignments },
    };
  }

  /**
   * Applies a validated backup inside the service worker's write queue. Merge keeps everything the
   * account has; Replace saves it to a file first, since that is the one way to lose sorting here.
   */
  static async applyImport(data: ImportData, mode: ImportMode): Promise<{ added: number; combined: number; kept: number } | { folders: number }> {
    if (mode === 'merge') return SubDeckStorage.requestMutation('importMerge', data);
    await this.exportToFile();
    return SubDeckStorage.requestMutation('importReplace', data);
  }
}
