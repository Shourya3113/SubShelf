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
  prompt(text: string): Promise<string>;
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
export function downloadProgressPercent(loaded: unknown, total?: unknown): number {
  const l = typeof loaded === 'number' && Number.isFinite(loaded) ? loaded : 0;
  const t = typeof total === 'number' && Number.isFinite(total) && total > 1 ? total : 1;
  const pct = Math.round((l / t) * 100);
  return Math.min(100, Math.max(0, pct));
}

/**
 * Starts (or attaches to) the model download. Must be called from a user gesture handler, because
 * Chrome only allows create() to trigger a download with transient user activation.
 */
export async function downloadNanoModel(LM: any, onProgress: (percent: number) => void): Promise<void> {
  if (!LM) throw new Error('On-device AI is not available in this browser');
  const session = await LM.create({
    ...NANO_OPTS,
    monitor(m: EventTarget) {
      m.addEventListener('downloadprogress', (e: Event) => {
        const ev = e as Event & { loaded?: number; total?: number };
        onProgress(downloadProgressPercent(ev.loaded, ev.total));
      });
    },
  });
  // The session was only needed to trigger the download
  session?.destroy?.();
}

/** Runs prompts against a LanguageModel in the current context. Fresh session per prompt. */
export function localNanoRunner(LM: any): NanoRunner {
  return {
    availability: () => getNanoStatus(LM),
    async prompt(text: string) {
      const session = await LM.create(NANO_OPTS);
      try {
        return await session.prompt(text);
      } finally {
        session?.destroy?.();
      }
    },
  };
}

export interface NanoStatusView {
  badge: string;
  text: string;
  /** Label for the download button, or null when no download can be offered. */
  action: string | null;
}

/** What the popup shows for each status. A download is only ever offered, never started. */
export function describeNanoStatus(status: NanoStatus): NanoStatusView {
  switch (status) {
    case 'available':
      return {
        badge: 'Ready',
        text: 'Gemini Nano is installed. Auto-AI runs on this device and channel names never leave your computer.',
        action: null,
      };
    case 'downloadable':
      return {
        badge: 'Not downloaded',
        text: 'Auto-AI uses offline keywords until the on-device model is downloaded.',
        action: 'Download on-device AI model',
      };
    case 'downloading':
      return {
        badge: 'Downloading',
        text: 'Chrome is downloading the model. Auto-AI uses offline keywords until it finishes.',
        action: 'Show download progress',
      };
    case 'no-api':
      return {
        badge: 'Not supported',
        text: 'This version of Chrome does not offer on-device AI. Update Chrome, or choose "Offline keywords" above, which works everywhere.',
        action: null,
      };
    default:
      return {
        badge: 'Not supported',
        text: 'Chrome cannot run on-device AI on this computer. It needs about 22 GB of free disk space and either a GPU with more than 4 GB of video memory or 16 GB of RAM. Choose "Offline keywords" above, which works on any computer.',
        action: null,
      };
  }
}
