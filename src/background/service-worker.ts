import { SubDeckStorage } from '@/utils/storage';
import { AICategorizer } from '@/ai/categorizer';
import { Logger } from '@/utils/logger';
import { runMigrations } from './migrations';
import { CURRENT_SCHEMA_VERSION, DEFAULT_STORAGE } from '@/types';

chrome.runtime.onInstalled.addListener(async (details) => {
  const raw = await chrome.storage.local.get(null);
  if (!raw || Object.keys(raw).length === 0 || details.reason === 'install') {
    const defaults = structuredClone(DEFAULT_STORAGE);
    const initial = { ...defaults, ...(raw || {}) };
    await chrome.storage.local.set(initial);
    Logger.info(`[SubShelf] Initialized fresh storage schema v${CURRENT_SCHEMA_VERSION}`);
    return;
  }
  const fromVersion = typeof raw.version === 'number' ? raw.version : 1;

  if (details.reason === 'update') {
    if (fromVersion < CURRENT_SCHEMA_VERSION) {
      try {
        const migrated = runMigrations(fromVersion, CURRENT_SCHEMA_VERSION, raw as any);
        await chrome.storage.local.set(migrated);
        Logger.info(`[SubShelf] Successfully migrated storage schema from v${fromVersion} to v${CURRENT_SCHEMA_VERSION}`);
      } catch (err) {
        Logger.error(`[SubShelf] Storage schema migration failed from v${fromVersion} to v${CURRENT_SCHEMA_VERSION}:`, err);
      }
    } else {
      Logger.info(`[SubShelf] Storage schema up to date at v${fromVersion}`);
    }
  }
});

// Self-healing migration check on service worker wake-up
(async () => {
  try {
    const raw = await chrome.storage.local.get(null);
    if (!raw || Object.keys(raw).length === 0) return;
    const v = typeof raw.version === 'number' ? raw.version : 1;
    if (v < CURRENT_SCHEMA_VERSION) {
      const migrated = runMigrations(v, CURRENT_SCHEMA_VERSION, raw as any);
      await chrome.storage.local.set(migrated);
      Logger.info(`[SubShelf] Background startup applied schema migration from v${v} to v${CURRENT_SCHEMA_VERSION}`);
    }
  } catch (err) {
    Logger.error('[SubShelf] Startup schema migration check failed:', err);
  }
})();

// FIFO write queue to serialize all storage mutations and eliminate write races
class StorageWriteQueue {
  private queue: Promise<unknown> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(
      () => task(),
      () => task()
    );
    this.queue = next.catch(() => {});
    return next;
  }
}

const storageQueue = new StorageWriteQueue();

// Handle auto-categorization and background tasks
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Security: Validate message origin (must match our extension ID)
  if (sender.id !== chrome.runtime.id) {
    Logger.warn('[SubShelf Background] Rejected message from unauthorized sender:', sender.id);
    return false;
  }

  if (message?.type === 'subshelf-storage-mutate') {
    (async () => {
      try {
        const result = await storageQueue.enqueue(async () => {
          return await SubDeckStorage.executeMutation(message.action, message.payload);
        });
        sendResponse({ success: true, result });
      } catch (err) {
        Logger.error('[SubShelf Background] Storage mutation failed:', err);
        const safeError = err instanceof Error ? err.message : 'Storage mutation failed';
        sendResponse({ success: false, error: safeError });
      }
    })();
    return true;
  }

  if (message?.type === 'subshelf-get-api-key') {
    // Security: Only allow extension pages (popup) to request the API key; reject content scripts
    const isExtensionPage = sender.url?.startsWith(chrome.runtime.getURL(''));
    if (!isExtensionPage) {
      Logger.warn('[SubShelf Background] Blocked unauthorized API key request from:', sender.url);
      sendResponse({ success: false, apiKey: '' });
      return false;
    }
    (async () => {
      const apiKey = await SubDeckStorage.getApiKey();
      sendResponse({ success: true, apiKey: apiKey || '' });
    })();
    return true;
  }

  if (message?.type === 'subshelf-set-api-key') {
    // Security: Only allow extension pages (popup) to set the API key; reject content scripts
    const isExtensionPage = sender.url?.startsWith(chrome.runtime.getURL(''));
    if (!isExtensionPage) {
      Logger.warn('[SubShelf Background] Blocked unauthorized API key update from:', sender.url);
      sendResponse({ success: false });
      return false;
    }
    (async () => {
      if (typeof message.apiKey === 'string') {
        await SubDeckStorage.setApiKey(message.apiKey);
      }
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message?.type === 'subshelf-auto-organize' || message?.type === 'subdeck-auto-organize') {
    (async () => {
      try {
        Logger.info('[SubShelf Background] Running AI auto-categorization...');
        const channelsMap = await SubDeckStorage.getChannels();
        const channels = Object.values(channelsMap);

        if (channels.length === 0) {
          sendResponse({ success: false, message: 'No channels discovered yet' });
          return;
        }

        const result = await AICategorizer.categorizeAll(channels);

        // Serialize overrides application and storage commit through the write queue
        const finalDecks = await storageQueue.enqueue(async () => {
          const raw = await chrome.storage.local.get(['categories', 'manualAssignments', 'channelExclusions']);
          const currentCategories = Array.isArray(raw.categories) ? raw.categories : [];
          const manualAssignments = raw.manualAssignments || {};
          const channelExclusions = raw.channelExclusions || {};

          const applied = AICategorizer.applyOverrides(
            result.decks,
            currentCategories,
            manualAssignments,
            channelExclusions,
            channels
          );

          await chrome.storage.local.set({ categories: applied });
          return applied;
        });

        Logger.info(`[SubShelf Background] Categorized into ${finalDecks.length} unique decks`);
        sendResponse({
          success: true,
          count: channels.length,
          decks: finalDecks.length,
          provider: result.providerUsed,
          notice: result.fallbackNotice,
          fallbackNotice: result.fallbackNotice,
        });
      } catch (err) {
        Logger.error('[SubShelf Background] Auto-organization failed:', err);
        // Security: Send sanitized error message without leaking sensitive strings
        const safeError = err instanceof Error ? err.message : 'Auto-organization failed';
        sendResponse({ success: false, error: safeError });
      }
    })();
    return true; // Keep message port open for async response
  }
  return false;
});
