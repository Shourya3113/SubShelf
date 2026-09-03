import { SubDeckStorageSchema, DEFAULT_STORAGE } from '@/types';

/**
 * Handles schema migrations across extension versions.
 */
export function runMigrations(fromVersion: number, toVersion: number, data: Partial<SubDeckStorageSchema>): SubDeckStorageSchema {
  const current: SubDeckStorageSchema = {
    ...DEFAULT_STORAGE,
    ...data,
    settings: {
      ...DEFAULT_STORAGE.settings,
      ...(data.settings || {}),
    },
  };

  if (fromVersion < 1) {
    current.version = 1;
  }

  current.version = toVersion;
  return current;
}
