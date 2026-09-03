import { SubDeckStorage } from '@/utils/storage';

chrome.runtime.onInstalled.addListener(async () => {
  await SubDeckStorage.getAll();
  console.log('[SubDeck] Service worker initialized with default storage');
});
