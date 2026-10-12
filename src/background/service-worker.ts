import { SubDeckStorage, enqueueMutation, enqueueStorageTask } from '@/utils/storage';
import { AICategorizer } from '@/ai/categorizer';
import { Logger } from '@/utils/logger';
import { runMigrations } from './migrations';
import { CURRENT_SCHEMA_VERSION, DEFAULT_STORAGE } from '@/types';

// All storage writes below go through the shared queue so they serialize with content/popup mutations.
chrome.runtime.onInstalled.addListener((details) => {
  enqueueStorageTask(async () => {
    const raw = await chrome.storage.local.get(null);
    if (!raw || Object.keys(raw).length === 0 || details.reason === 'install') {
      const defaults = structuredClone(DEFAULT_STORAGE);
      await chrome.storage.local.set({ ...defaults, ...(raw || {}) });
      Logger.info(`[SubShelf] Initialized fresh storage schema v${CURRENT_SCHEMA_VERSION}`);
    }
  }).catch(err => Logger.error('[SubShelf] Install initialization failed:', err));
});

// Self-healing on every service worker wake-up: migrate, then persist normalized state
enqueueStorageTask(async () => {
  const raw = await chrome.storage.local.get(null);
  if (!raw || Object.keys(raw).length === 0) return;
  const v = typeof raw.version === 'number' ? raw.version : 1;
  if (v < CURRENT_SCHEMA_VERSION) {
    const migrated = runMigrations(v, CURRENT_SCHEMA_VERSION, raw as any);
    await chrome.storage.local.set(migrated);
    Logger.info(`[SubShelf] Background startup applied schema migration from v${v} to v${CURRENT_SCHEMA_VERSION}`);
  }
}).catch(err => Logger.error('[SubShelf] Startup schema migration check failed:', err));

enqueueMutation('normalize').catch(err => Logger.error('[SubShelf] Startup normalization failed:', err));

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
        const result = await enqueueMutation(message.action, message.payload);
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

  if (message?.type === 'subshelf-auto-organize') {
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

        // Overrides are applied against fresh storage inside the write queue
        const finalDecks = await SubDeckStorage.applyGeneratedDecks(result.decks);

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
