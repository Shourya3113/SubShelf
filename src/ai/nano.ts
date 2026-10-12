// Chrome Built-in Prompt API (Gemini Nano) helpers, shared by the categorizer, the popup and the
// offscreen document. Nothing here talks to the network: the model download is handled by Chrome.

export const NANO_OPTS = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

/** runtime message type the service worker uses to reach the offscreen Nano runner. */
export const NANO_OFFSCREEN_MESSAGE = 'subshelf-nano-offscreen';

/** The four states the UI cares about, plus 'no-api' when this Chrome doesn't expose the API at all. */
export type NanoStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'no-api';

export interface NanoRunner {
  availability(): Promise<NanoStatus>;
  /** `constraint` is a JSON Schema the response must follow (Prompt API `responseConstraint`). */
  prompt(text: string, constraint?: Record<string, unknown>): Promise<string>;
}

export function resolveLanguageModelAPI(): any {
  const g = globalThis as any;
  const s = typeof self !== 'undefined' ? (self as any) : null;
  const w = typeof window !== 'undefined' ? (window as any) : null;

  if (typeof g?.LanguageModel?.create === 'function') return g.LanguageModel;
  if (typeof s?.LanguageModel?.create === 'function') return s.LanguageModel;
  if (typeof w?.LanguageModel?.create === 'function') return w.LanguageModel;

  if (typeof g?.ai?.languageModel?.create === 'function') return g.ai.languageModel;
  if (typeof s?.ai?.languageModel?.create === 'function') return s.ai.languageModel;
  if (typeof w?.ai?.languageModel?.create === 'function') return w.ai.languageModel;

  return null;
}

/** Maps current and legacy (capabilities().available) availability strings onto NanoStatus. */
export function normalizeNanoAvailability(raw: unknown): NanoStatus {
  switch (raw) {
    case 'available':
    case 'readily':
      return 'available';
    case 'downloadable':
    case 'after-download':
      return 'downloadable';
    case 'downloading':
      return 'downloading';
    default:
      return 'unavailable';
  }
}

export async function getNanoStatus(LM: any = resolveLanguageModelAPI()): Promise<NanoStatus> {
  if (!LM) return 'no-api';
  try {
    if (typeof LM.availability === 'function') {
      return normalizeNanoAvailability(await LM.availability(NANO_OPTS));
    }
    if (typeof LM.capabilities === 'function') {
      const caps = await LM.capabilities();
      return normalizeNanoAvailability(caps?.available);
    }
    // Very old builds exposed create() without any availability probe
    return 'available';
  } catch {
    return 'unavailable';
  }
}

/** Short reason shown in the Auto-AI fallback toast when Nano can't be used yet. */
export function nanoUnavailableReason(status: NanoStatus): string {
  switch (status) {
    case 'downloadable':
      return 'On-device model not downloaded yet. Open SubShelf settings to download it';
    case 'downloading':
      return 'On-device model is still downloading. Try again when it finishes';
    case 'no-api':
      return 'This version of Chrome does not offer on-device AI';
    case 'unavailable':
      return 'On-device AI is not supported on this device';
    default:
      return `Gemini Nano status: ${status}`;
  }
}

/**
 * Converts a downloadprogress event to a 0–100 percentage. Current Chrome reports `loaded` as a
 * 0–1 fraction (total = 1); early builds reported bytes with a separate `total`.
 */


/** Runs prompts against a LanguageModel in the current context. Fresh session per prompt. */
export function localNanoRunner(LM: any): NanoRunner {
  return {
    availability: () => getNanoStatus(LM),
    async prompt(text: string, constraint?: Record<string, unknown>) {
      const session = await LM.create(NANO_OPTS);
      try {
        if (!constraint) return await session.prompt(text);
        try {
          return await session.prompt(text, { responseConstraint: constraint });
        } catch (err) {
          // Chrome builds without structured output reject the option; the parser still validates
          if (err instanceof Error && /constraint|not ?supported/i.test(`${err.name} ${err.message}`)) {
            return await session.prompt(text);
          }
          throw err;
        }
      } finally {
        session?.destroy?.();
      }
    },
  };
}

export interface NanoStatusView {
  badge: string;
  text: string;
}

/** What the popup shows for each status. A download is only ever offered, never started. */
export function describeNanoStatus(status: NanoStatus): NanoStatusView {
  switch (status) {
    case 'available':
      return {
        badge: 'Ready',
        text: 'Chrome already has its on-device AI model, so Auto-AI uses it for channels the offline engine can\'t place. Nothing leaves your computer.',
      };
    case 'downloadable':
    case 'downloading':
      return {
        badge: 'Not installed',
        text: 'SubShelf never downloads AI models. If Chrome installs its on-device model for its own features, SubShelf will use it; until then this works exactly like Offline.',
      };
    default:
      return {
        badge: 'Not available',
        text: 'This computer or Chrome version has no on-device AI, so this works exactly like Offline.',
      };
  }
}
