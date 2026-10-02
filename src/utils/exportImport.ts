import { SubDeckExportPayload, SubDeckStorageSchema, CategoryDeck, SubscribedChannel } from '@/types';
import { SubDeckStorage } from './storage';
import { isValidYouTubeAvatarUrl } from './validators';
import { SUBDECK_TAXONOMY } from '@/ai/heuristic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_CATEGORIES = 200;
const MAX_CHANNELS = 10_000;
const MAX_CHANNELS_PER_CATEGORY = 5_000;
const MAX_OVERRIDE_ENTRIES = 10_000;

const UCID_REGEX = /^UC[\w-]{22}$/;
const HANDLE_REGEX = /^@?[\w.-]{3,60}$/;
const SYSTEM_DECK_IDS = new Set<string>([
  ...SUBDECK_TAXONOMY.map(t => t.id),
  '__uncategorized__',
]);

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

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

  static async importFromFile(file: File, mode: 'merge' | 'overwrite' = 'merge'): Promise<void> {
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

    // 4. Validate categories
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
            .filter((id): id is string => typeof id === 'string' && UCID_REGEX.test(id))
            .slice(0, MAX_CHANNELS_PER_CATEGORY)
        ));

        validatedCategories.push({
          id: cleanId,
          name: cat.name.slice(0, 100).trim(),
          icon: cat.icon.slice(0, 10),
          color: typeof cat.color === 'string' ? cat.color.slice(0, 20) : '#3B82F6',
          channelIds: cleanIds,
          isCollapsed: Boolean(cat.isCollapsed),
          sortOrder: typeof cat.sortOrder === 'number' && Number.isFinite(cat.sortOrder) ? cat.sortOrder : 0,
          // Security: Derive isSystem strictly from built-in taxonomy, never from untrusted input
          isSystem: SYSTEM_DECK_IDS.has(cleanId),
        });
      }
    }

    // 5. Validate channels with Object.create(null) and strict UCID / handle checks
    const validatedChannels: Record<string, SubscribedChannel> = Object.create(null);
    const validatedHandles: Record<string, string> = Object.create(null);

    for (const [keyUcId, ch] of rawChannelsEntries) {
      if (Object.keys(validatedChannels).length >= MAX_CHANNELS) break;
      if (FORBIDDEN_KEYS.has(keyUcId) || !UCID_REGEX.test(keyUcId)) continue;

      if (
        ch &&
        typeof ch === 'object' &&
        typeof ch.title === 'string' &&
        typeof ch.ucId === 'string' &&
        ch.ucId === keyUcId &&
        UCID_REGEX.test(ch.ucId)
      ) {
        const handle = typeof ch.handle === 'string' && HANDLE_REGEX.test(ch.handle.trim())
          ? ch.handle.trim().slice(0, 100)
          : '';
        const url = typeof ch.url === 'string' && (ch.url.startsWith('https://') || ch.url.startsWith('/'))
          ? ch.url.slice(0, 300)
          : `https://www.youtube.com/channel/${ch.ucId}`;

        validatedChannels[ch.ucId] = {
          ucId: ch.ucId,
          title: ch.title.slice(0, 200).trim(),
          handle,
          url,
          avatarUrl: isValidYouTubeAvatarUrl(ch.avatarUrl) ? (ch.avatarUrl as string).slice(0, 500) : '',
          discoveredAt: typeof ch.discoveredAt === 'number' && Number.isFinite(ch.discoveredAt) ? ch.discoveredAt : Date.now(),
        };

        if (handle && !FORBIDDEN_KEYS.has(handle)) {
          validatedHandles[handle] = ch.ucId;
        }
      }
    }

    // 6. Validate channelExclusions & manualAssignments with Object.create(null)
    const validatedExclusions: Record<string, string[]> = Object.create(null);
    if (payload.data.channelExclusions && typeof payload.data.channelExclusions === 'object' && payload.data.channelExclusions !== null) {
      for (const [ucId, cats] of Object.entries(payload.data.channelExclusions)) {
        if (Object.keys(validatedExclusions).length >= MAX_OVERRIDE_ENTRIES) break;
        if (FORBIDDEN_KEYS.has(ucId) || !UCID_REGEX.test(ucId)) continue;
        if (Array.isArray(cats)) {
          const cleanCats = cats
            .filter((c): c is string => typeof c === 'string' && !FORBIDDEN_KEYS.has(c) && c.length <= 100)
            .slice(0, 100);
          if (cleanCats.length > 0) {
            validatedExclusions[ucId] = cleanCats;
          }
        }
      }
    }

    const validatedManualAssignments: Record<string, string[]> = Object.create(null);
    if (payload.data.manualAssignments && typeof payload.data.manualAssignments === 'object' && payload.data.manualAssignments !== null) {
      for (const [ucId, cats] of Object.entries(payload.data.manualAssignments)) {
        if (Object.keys(validatedManualAssignments).length >= MAX_OVERRIDE_ENTRIES) break;
        if (FORBIDDEN_KEYS.has(ucId) || !UCID_REGEX.test(ucId)) continue;
        if (Array.isArray(cats)) {
          const cleanCats = cats
            .filter((c): c is string => typeof c === 'string' && !FORBIDDEN_KEYS.has(c) && c.length <= 100)
            .slice(0, 100);
          if (cleanCats.length > 0) {
            validatedManualAssignments[ucId] = cleanCats;
          }
        }
      }
    }

    if (mode === 'overwrite') {
      const current = await SubDeckStorage.getAll();
      await SubDeckStorage.setAll({
        categories: validatedCategories,
        channels: Object.assign(Object.create(null), validatedChannels),
        handleToUcId: Object.assign(Object.create(null), validatedHandles),
        channelExclusions: Object.assign(Object.create(null), validatedExclusions),
        manualAssignments: Object.assign(Object.create(null), validatedManualAssignments),
        activeCategoryId: null,
        settings: current.settings, // Preserve user's local settings and API key
      });
    } else {
      const current = await SubDeckStorage.getAll();

      // Merge categories: union channelIds for existing categories, add new ones
      const mergedCategories = current.categories.map(existing => {
        const imported = validatedCategories.find(c => c.id === existing.id);
        if (imported) {
          const mergedIds = new Set([...existing.channelIds, ...imported.channelIds]);
          return {
            ...existing,
            channelIds: Array.from(mergedIds).filter(id => UCID_REGEX.test(id)).slice(0, MAX_CHANNELS_PER_CATEGORY),
            isSystem: SYSTEM_DECK_IDS.has(existing.id),
          };
        }
        return existing;
      });
      const existingCategoryIds = new Set(current.categories.map(c => c.id));
      for (const cat of validatedCategories) {
        if (!existingCategoryIds.has(cat.id)) {
          mergedCategories.push(cat);
        }
      }

      const mergedChannels: Record<string, SubscribedChannel> = Object.create(null);
      for (const [ucId, ch] of Object.entries(current.channels || {})) {
        if (UCID_REGEX.test(ucId) && !FORBIDDEN_KEYS.has(ucId)) {
          mergedChannels[ucId] = ch;
        }
      }
      for (const [ucId, ch] of Object.entries(validatedChannels)) {
        if (UCID_REGEX.test(ucId) && !FORBIDDEN_KEYS.has(ucId)) {
          mergedChannels[ucId] = ch;
        }
      }

      const mergedHandles: Record<string, string> = Object.create(null);
      for (const [handle, ucId] of Object.entries(current.handleToUcId || {})) {
        if (!FORBIDDEN_KEYS.has(handle) && UCID_REGEX.test(ucId)) {
          mergedHandles[handle] = ucId;
        }
      }
      for (const [handle, ucId] of Object.entries(validatedHandles)) {
        if (!FORBIDDEN_KEYS.has(handle) && UCID_REGEX.test(ucId)) {
          mergedHandles[handle] = ucId;
        }
      }

      // Union arrays per-key for exclusions and manual assignments
      const mergedExclusions: Record<string, string[]> = Object.create(null);
      for (const [ucId, cats] of Object.entries(current.channelExclusions || {})) {
        if (UCID_REGEX.test(ucId) && !FORBIDDEN_KEYS.has(ucId)) {
          mergedExclusions[ucId] = [...cats];
        }
      }
      for (const [ucId, cats] of Object.entries(validatedExclusions)) {
        if (UCID_REGEX.test(ucId) && !FORBIDDEN_KEYS.has(ucId)) {
          if (mergedExclusions[ucId]) {
            const merged = new Set([...mergedExclusions[ucId], ...cats]);
            mergedExclusions[ucId] = Array.from(merged).slice(0, 100);
          } else {
            mergedExclusions[ucId] = cats;
          }
        }
      }

      const mergedManualAssignments: Record<string, string[]> = Object.create(null);
      for (const [ucId, cats] of Object.entries(current.manualAssignments || {})) {
        if (UCID_REGEX.test(ucId) && !FORBIDDEN_KEYS.has(ucId)) {
          mergedManualAssignments[ucId] = [...cats];
        }
      }
      for (const [ucId, cats] of Object.entries(validatedManualAssignments)) {
        if (UCID_REGEX.test(ucId) && !FORBIDDEN_KEYS.has(ucId)) {
          if (mergedManualAssignments[ucId]) {
            const merged = new Set([...mergedManualAssignments[ucId], ...cats]);
            mergedManualAssignments[ucId] = Array.from(merged).slice(0, 100);
          } else {
            mergedManualAssignments[ucId] = cats;
          }
        }
      }

      await SubDeckStorage.update(
        ['categories', 'channels', 'handleToUcId', 'channelExclusions', 'manualAssignments'],
        () => ({
          categories: mergedCategories,
          channels: Object.assign(Object.create(null), mergedChannels),
          handleToUcId: Object.assign(Object.create(null), mergedHandles),
          channelExclusions: Object.assign(Object.create(null), mergedExclusions),
          manualAssignments: Object.assign(Object.create(null), mergedManualAssignments),
        })
      );
    }
  }
}
