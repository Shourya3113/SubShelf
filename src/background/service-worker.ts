import { SubDeckStorage, enqueueMutation, enqueueStorageTask } from '@/utils/storage';
import { AICategorizer } from '@/ai/categorizer';
import { Logger } from '@/utils/logger';
import { runMigrations } from './migrations';
import { acquireOffscreenNano, releaseOffscreenNano } from './offscreenNano';
import { CURRENT_SCHEMA_VERSION, DEFAULT_STORAGE } from '@/types';
import { GEMINI_ORIGIN } from '@/utils/cloudPermission';

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

// Cloud opt-in: Chrome's permission prompt closes the popup, so the popup records the user's intent
// here and the provider is switched only when Chrome reports the permission as granted.
const CLOUD_OPTIN_KEY = 'cloudOptInPendingAt';
const CLOUD_OPTIN_TTL_MS = 10 * 60_000;

chrome.permissions.onAdded.addListener(async (perms) => {
  if (!perms.origins?.includes(GEMINI_ORIGIN)) return;
  try {
    const pending = (await chrome.storage.session.get(CLOUD_OPTIN_KEY))[CLOUD_OPTIN_KEY];
    await chrome.storage.session.remove(CLOUD_OPTIN_KEY);
    if (typeof pending === 'number' && Date.now() - pending < CLOUD_OPTIN_TTL_MS) {
      await enqueueMutation('updateSettings', { aiProvider: 'gemini-api' });
      Logger.info('[SubShelf] Cloud permission granted; provider switched to Gemini Cloud');
    }
  } catch (err) {
    Logger.error('[SubShelf] Failed to apply Cloud opt-in:', err);
  }
});

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

  if (message?.type === 'subshelf-cloud-optin-pending') {
    if (!sender.url?.startsWith(chrome.runtime.getURL(''))) return false;
    chrome.storage.session.set({ [CLOUD_OPTIN_KEY]: Date.now() }).catch(() => {});
    return false;
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

        // Some Chrome builds don't expose the Prompt API to service workers; Nano then runs in an
        // offscreen document. The heuristic fallback still applies if neither context can use it.
        let usedOffscreen = false;
        const result = await AICategorizer.categorizeAll(channels, undefined, {
          nanoFallback: async () => {
            const runner = await acquireOffscreenNano();
            usedOffscreen = Boolean(runner);
            return runner;
          },
        }).finally(() => (usedOffscreen ? releaseOffscreenNano() : undefined));

        // Overrides are applied against fresh storage inside the write queue
        const finalDecks = await SubDeckStorage.applyGeneratedDecks(result.decks);

        Logger.info(`[SubShelf Background] Categorized into ${finalDecks.length} unique decks`);
        sendResponse({
          success: true,
          count: channels.length,
          decks: finalDecks.length,
          provider: result.providerUsed,
          aiReviewed: result.aiReviewed,
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
