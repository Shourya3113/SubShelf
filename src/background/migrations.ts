import { SubDeckStorageSchema, DEFAULT_STORAGE, CURRENT_SCHEMA_VERSION, API_KEY_FIELD } from '@/types';
import { Logger } from '@/utils/logger';

export type MigrationStep = (data: SubDeckStorageSchema) => SubDeckStorageSchema;

/**
 * Migration registry mapping target schema version -> migration step function.
 * Step N migrates the schema from version (N - 1) to version N.
 */
export const MIGRATION_REGISTRY: Record<number, MigrationStep> = {
  1: (data) => {
    // Migration 0 -> 1: Initialize baseline schema structure
    return {
      ...DEFAULT_STORAGE,
      ...data,
      settings: {
        ...DEFAULT_STORAGE.settings,
        ...(data.settings || {}),
      },
      channelExclusions: data.channelExclusions || {},
      manualAssignments: data.manualAssignments || {},
      version: 1,
    };
  },
  2: (data) => {
    // Migration 1 -> 2: Isolate apiKey into dedicated storage key and remove legacy settings
    const migrated = { ...data };
    if (migrated.settings && 'apiKey' in migrated.settings) {
      if (typeof migrated.settings.apiKey === 'string' && migrated.settings.apiKey.length > 0) {
        (migrated as any)[API_KEY_FIELD] = migrated.settings.apiKey;
      }
      delete migrated.settings.apiKey;
    }
    if (migrated.settings && 'telemetryOptIn' in (migrated.settings as any)) {
      delete (migrated.settings as any).telemetryOptIn;
    }
    migrated.version = 2;
    return migrated;
  },
};

/**
 * Handles schema migrations step-by-step from fromVersion up to toVersion.
 * Never hardcodes or forces a fixed version; sequentially applies each intermediate migration step.
 */
export function runMigrations(
  fromVersion: number,
  toVersion: number = CURRENT_SCHEMA_VERSION,
  data: Partial<SubDeckStorageSchema>
): SubDeckStorageSchema {
  let current: SubDeckStorageSchema = {
    ...DEFAULT_STORAGE,
    ...data,
    settings: {
      ...DEFAULT_STORAGE.settings,
      ...(data.settings || {}),
    },
  };

  // If already at or beyond target version, return data stamped with fromVersion
  if (fromVersion >= toVersion) {
    current.version = fromVersion;
    return current;
  }

  // Sequentially execute intermediate migration steps
  for (let nextVersion = fromVersion + 1; nextVersion <= toVersion; nextVersion++) {
    const step = MIGRATION_REGISTRY[nextVersion];
    if (typeof step === 'function') {
      try {
        current = step(current);
        current.version = nextVersion;
        Logger.info(`[SubShelf Migrations] Applied schema migration to v${nextVersion}`);
      } catch (err) {
        Logger.error(`[SubShelf Migrations] Error executing migration step to v${nextVersion}:`, err);
        throw err;
      }
    } else {
      // If no explicit migration transform is registered for this step, advance version marker
      current.version = nextVersion;
    }
  }

  current.version = toVersion;
  return current;
}
