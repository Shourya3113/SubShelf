import { SubDeckStorage } from '@/utils/storage';

document.addEventListener('DOMContentLoaded', async () => {
  const state = await SubDeckStorage.getAll();
  console.log('[SubDeck] Popup loaded, current state:', state);
});
