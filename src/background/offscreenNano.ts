import { NANO_OFFSCREEN_MESSAGE, NanoRunner, NanoStatus } from '@/ai/nano';
import { Logger } from '@/utils/logger';

const OFFSCREEN_URL = 'src/offscreen/offscreen.html';

let creating: Promise<void> | null = null;
let users = 0;

async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return;
  creating ??= chrome.offscreen
    .createDocument({
      url: OFFSCREEN_URL,
      // No offscreen reason names the Prompt API; WORKERS is the closest fit
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: "Run Chrome's on-device Gemini Nano model, which is not available to the service worker",
    })
    .finally(() => {
      creating = null;
    });
  await creating;
}

async function send<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await chrome.runtime.sendMessage({ type: NANO_OFFSCREEN_MESSAGE, ...payload });
  if (!res?.ok) throw new Error(res?.error || 'Offscreen document did not respond');
  return res as T;
}

/**
 * Nano runner backed by an offscreen document, for when the service worker can't use the Prompt
 * API itself. Callers must pair every successful call with releaseOffscreenNano().
 */
export async function acquireOffscreenNano(): Promise<NanoRunner | null> {
  if (!chrome.offscreen?.createDocument) return null;
  try {
    users++;
    await ensureOffscreenDocument();
  } catch (err) {
    users--;
    Logger.warn('[SubShelf AI] Could not open offscreen document for Gemini Nano:', err);
    return null;
  }
  return {
    availability: async () => (await send<{ status: NanoStatus }>({ op: 'availability' })).status,
    prompt: async (text: string) => (await send<{ text: string }>({ op: 'prompt', text })).text,
  };
}

export async function releaseOffscreenNano(): Promise<void> {
  if (users === 0) return;
  users--;
  if (users > 0) return;
  try {
    if (await chrome.offscreen.hasDocument()) await chrome.offscreen.closeDocument();
  } catch {
    // Already closed
  }
}
