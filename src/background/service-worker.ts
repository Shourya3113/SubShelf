import { SubDeckStorage } from '@/utils/storage';
import { AICategorizer } from '@/ai/categorizer';
import { Logger } from '@/utils/logger';

chrome.runtime.onInstalled.addListener(async () => {
  await SubDeckStorage.getAll();
  Logger.info('[SubDeck] Service worker initialized with default storage');
});

// Handle auto-categorization and background tasks
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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

        // Retain any custom non-system decks created by the user
        const currentCategories = await SubDeckStorage.getCategories();
        const customDecks = currentCategories.filter(c => !c.isSystem && !categorizedDecks.find(d => d.id === c.id));

        const finalDecks = [...categorizedDecks, ...customDecks];
        await SubDeckStorage.setAll({ categories: finalDecks });

        Logger.info(`[SubDeck Background] Categorized into ${finalDecks.length} decks`);
        sendResponse({ success: true, count: channels.length, decks: finalDecks.length });
      } catch (err) {
        Logger.error('[SubDeck Background] Auto-organization failed:', err);
        sendResponse({ success: false, error: String(err) });
      }
    })();
    return true; // Keep message port open for async response
  }
});
