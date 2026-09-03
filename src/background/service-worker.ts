import { SubDeckStorage } from '@/utils/storage';
import { AICategorizer } from '@/ai/categorizer';
import { Logger } from '@/utils/logger';
import { CategoryDeck } from '@/types';
import { runMigrations } from './migrations';

chrome.runtime.onInstalled.addListener(async (details) => {
  const current = await SubDeckStorage.getAll();
  if (details.reason === 'update') {
    const fromVersion = current.version || 1;
    const migrated = runMigrations(fromVersion, 1, current);
    await SubDeckStorage.setAll(migrated);
    Logger.info(`[SubDeck] Migrated storage schema from v${fromVersion} to v1`);
  } else {
    Logger.info('[SubDeck] Service worker initialized with default storage');
  }
});

// Handle auto-categorization and background tasks
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Security: Validate message origin (must match our extension ID)
  if (sender.id !== chrome.runtime.id) {
    Logger.warn('[SubDeck Background] Rejected message from unauthorized sender:', sender.id);
    return false;
  }

  if (message?.type === 'subdeck-auto-organize') {
    (async () => {
      try {
        Logger.info('[SubDeck Background] Running AI auto-categorization...');
        const channelsMap = await SubDeckStorage.getChannels();
        const channels = Object.values(channelsMap);

        if (channels.length === 0) {
          sendResponse({ success: false, message: 'No channels discovered yet' });
          return;
        }

        const categorizedDecks = await AICategorizer.categorizeAll(channels);

        // Only retain genuinely custom decks created manually by the user
        const currentCategories = await SubDeckStorage.getCategories();
        const systemDeckNames = new Set(categorizedDecks.map(d => d.name.toLowerCase().trim()));
        const obsoleteSystemIds = new Set(['education', 'tech', 'music', 'gaming', 'entertainment', 'news-politics', 'general-other', '__uncategorized__']);

        const customDecks = currentCategories.filter(c =>
          !c.isSystem &&
          !obsoleteSystemIds.has(c.id) &&
          !systemDeckNames.has(c.name.toLowerCase().trim()) &&
          !categorizedDecks.some(d => d.id === c.id)
        );

        // Deduplicate final decks by normalized name to guarantee zero duplicate folders
        const finalDecks: CategoryDeck[] = [];
        const seenNames = new Set<string>();

        for (const deck of [...categorizedDecks, ...customDecks]) {
          const normName = deck.name.toLowerCase().trim();
          if (!seenNames.has(normName)) {
            seenNames.add(normName);
            finalDecks.push(deck);
          } else {
            // Merge channel IDs into canonical deck
            const canonical = finalDecks.find(d => d.name.toLowerCase().trim() === normName);
            if (canonical) {
              const merged = new Set([...canonical.channelIds, ...deck.channelIds]);
              canonical.channelIds = Array.from(merged);
            }
          }
        }

        await SubDeckStorage.setAll({ categories: finalDecks });

        Logger.info(`[SubDeck Background] Categorized into ${finalDecks.length} unique decks`);
        sendResponse({ success: true, count: channels.length, decks: finalDecks.length });
      } catch (err) {
        Logger.error('[SubDeck Background] Auto-organization failed:', err);
        // Security: Send sanitized error message without leaking sensitive strings
        const safeError = err instanceof Error ? err.message : 'Auto-organization failed';
        sendResponse({ success: false, error: safeError });
      }
    })();
    return true; // Keep message port open for async response
  }
  return false;
});
