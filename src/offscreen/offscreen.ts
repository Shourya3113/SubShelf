// Hidden extension page that runs Gemini Nano for the service worker in Chrome builds that don't
// expose the Prompt API to service workers. It only prompts an already-downloaded model; it never
// starts a download and makes no network requests.
import { NANO_OFFSCREEN_MESSAGE, getNanoStatus, localNanoRunner, resolveLanguageModelAPI } from '@/ai/nano';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only the service worker talks to this page; it has no tab, unlike content scripts
  if (sender.id !== chrome.runtime.id || sender.tab || message?.type !== NANO_OFFSCREEN_MESSAGE) {
    return false;
  }

  (async () => {
    try {
      const LM = resolveLanguageModelAPI();
      if (message.op === 'availability') {
        sendResponse({ ok: true, status: await getNanoStatus(LM) });
      } else if (message.op === 'prompt' && typeof message.text === 'string') {
        if (!LM) throw new Error('LanguageModel API is not exposed in the offscreen document');
        const constraint = message.constraint && typeof message.constraint === 'object' ? message.constraint : undefined;
        sendResponse({ ok: true, text: await localNanoRunner(LM).prompt(message.text, constraint) });
      } else {
        sendResponse({ ok: false, error: 'Unknown request' });
      }
    } catch (err) {
      sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  })();
  return true;
});
