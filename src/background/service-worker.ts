import { SubDeckStorage } from '@/utils/storage';
import { AICategorizer } from '@/ai/categorizer';
import { Logger } from '@/utils/logger';
import { runMigrations } from './migrations';

chrome.runtime.onInstalled.addListener(async (details) => {
  const current = await SubDeckStorage.getAll();
  if (details.reason === 'update') {
    const fromVersion = current.version || 1;
    const migrated = runMigrations(fromVersion, 1, current);
    await SubDeckStorage.setAll(migrated);
    Logger.info(`[SubShelf] Migrated storage schema from v${fromVersion} to v1`);
  } else {
    Logger.info('[SubShelf] Service worker initialized with default storage');
  }
});

// Handle auto-categorization and background tasks
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Security: Validate message origin (must match our extension ID)
  if (sender.id !== chrome.runtime.id) {
    Logger.warn('[SubShelf Background] Rejected message from unauthorized sender:', sender.id);
    return false;
  }

  if (message?.type === 'subdeck-auto-organize') {
    (async () => {
      try {
        Logger.info('[SubShelf Background] Running AI auto-categorization...');
        const channelsMap = await SubDeckStorage.getChannels();
        const channels = Object.values(channelsMap);

        if (channels.length === 0) {
          sendResponse({ success: false, message: 'No channels discovered yet' });
          return;
        }

        const categorizedDecks = await AICategorizer.categorizeAll(channels);
        const state = await SubDeckStorage.getAll();

        const finalDecks = AICategorizer.applyOverrides(
          categorizedDecks,
          state.categories,
          state.manualAssignments || {},
          state.channelExclusions || {},
          channels
        );

        await SubDeckStorage.setAll({ categories: finalDecks });

        Logger.info(`[SubShelf Background] Categorized into ${finalDecks.length} unique decks`);
        sendResponse({ success: true, count: channels.length, decks: finalDecks.length });
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
