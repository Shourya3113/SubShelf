import { SubscribedChannel, CategoryDeck, DEFAULT_GEMINI_CLOUD_MODEL, DEFAULT_STORAGE } from '@/types';
import { HeuristicCategorizer, SUBDECK_TAXONOMY } from './heuristic';
import { buildCategorizationPrompt } from './prompt';
import { applyOverrides } from './overrides';
import { hasCloudPermission } from '@/utils/cloudPermission';
import { SubDeckStorage } from '@/utils/storage';
import { Logger } from '@/utils/logger';
import { isSystemChannelOrCurator } from '@/utils/systemChannels';

export type AIProvider = 'gemini-nano' | 'gemini-api' | 'heuristic';

export interface CategorizeAllResult {
  decks: CategoryDeck[];
  providerUsed: AIProvider;
  fallbackNotice?: string;
}

export const DEFAULT_GEMINI_MODEL = DEFAULT_GEMINI_CLOUD_MODEL;
const NANO_CHUNK = 40;          // Nano context window budget
const CLOUD_CHUNK = 150;
const CLOUD_TIMEOUT_MS = 25_000;

const chunk = <T,>(a: T[], n: number): T[][] =>
  Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

function mergeDecks(a: CategoryDeck[] = [], b: CategoryDeck[] = []): CategoryDeck[] {
  const map = new Map<string, CategoryDeck>((a || []).map(d => [d.id, { ...d, channelIds: [...(d.channelIds || [])] }]));
  for (const d of (b || [])) {
    const t = map.get(d.id);
    const incomingIds = Array.isArray(d.channelIds) ? d.channelIds : [];
    if (t) {
      t.channelIds = [...new Set([...(t.channelIds || []), ...incomingIds])];
    } else {
      map.set(d.id, { ...d, channelIds: [...incomingIds] });
    }
  }
  return [...map.values()]
    .filter(d => (d.channelIds && d.channelIds.length > 0) || !d.isSystem)
    .sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0));
}

/** Parse model output. Each valid channel is assigned at most once across all decks. */
function parseAIResponse(raw: string, channels: SubscribedChannel[]): CategoryDeck[] | null {
  const ref = new Map<string, string>(channels.map((c, i) => [`c${i}`, c.ucId]));
  const valid = new Set(channels.map(c => c.ucId));
  const text = raw.replace(/`{3}(?:json)?/gi, '').trim();
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      obj = JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;

  const seen = new Set<string>();
  const decks = SUBDECK_TAXONOMY.map((t, i): CategoryDeck => {
    const list = (obj as Record<string, unknown>)[t.id];
    const ids: string[] = [];
    if (Array.isArray(list)) {
      for (const x of list) {
        if (typeof x !== 'string') continue;
        const trimmed = x.trim();
        const real = ref.get(trimmed) || (valid.has(trimmed) ? trimmed : undefined);
        if (real && !seen.has(real)) {
          seen.add(real);
          ids.push(real);
        }
      }
    }
    return {
      id: t.id,
      name: t.name,
      icon: t.icon,
      color: t.color,
      channelIds: ids,
      isCollapsed: true,
      sortOrder: i,
      isSystem: true,
    };
  });

  return seen.size === 0 ? null : decks.filter(d => d.channelIds.length > 0);
}

/** Guarantee 100% assignment: anything skipped by the model is categorized via deterministic heuristics. */
function completeAssignments(decks: CategoryDeck[], channels: SubscribedChannel[]): CategoryDeck[] {
  const assigned = new Set(decks.flatMap(d => d.channelIds));
  const missing = channels.filter(c => !assigned.has(c.ucId));
  if (missing.length === 0) return decks;
  Logger.info(`[SubShelf AI] ${missing.length} channels unassigned by model, applying heuristic completion`);
  return mergeDecks(decks, HeuristicCategorizer.categorize(missing));
}

/** Run batches across channel chunks. Partial success merges results; total failure throws. */
async function runChunks(
  channels: SubscribedChannel[],
  size: number,
  call: (prompt: string) => Promise<string>
): Promise<CategoryDeck[]> {
  let merged: CategoryDeck[] = [];
  let ok = 0;
  let lastErr: unknown;

  for (const part of chunk(channels, size)) {
    try {
      const out = await call(buildCategorizationPrompt(part));
      const decks = parseAIResponse(out, part);
      if (decks) {
        merged = mergeDecks(merged, decks);
        ok++;
      }
    } catch (e) {
      lastErr = e;
    }
  }

  if (!ok) throw lastErr ?? new Error('Model returned no usable output across chunks');
  return merged;
}

// ---------- Gemini Nano (Chrome Built-in Prompt API) ----------
const NANO_OPTS = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

function resolveLanguageModelAPI(): any {
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

async function tryGeminiNano(channels: SubscribedChannel[]): Promise<CategoryDeck[]> {
  const LM = resolveLanguageModelAPI();
  if (!LM) throw new Error('LanguageModel API is not exposed in this context');

  let availability = 'available';
  if (typeof LM.availability === 'function') {
    availability = await LM.availability(NANO_OPTS);
  } else if (typeof LM.capabilities === 'function') {
    const caps = await LM.capabilities();
    availability = caps?.available || 'unavailable';
  }

  if (availability !== 'available' && availability !== 'readily') {
    throw new Error(`Gemini Nano status: ${availability}`);
  }

  return runChunks(channels, NANO_CHUNK, async (prompt) => {
    // Fresh session per chunk to avoid context-window saturation
    const session = await LM.create(NANO_OPTS);
    try {
      return await session.prompt(prompt);
    } finally {
      session?.destroy?.();
    }
  });
}

// ---------- Gemini Cloud API ----------
async function callGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CLOUD_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0 },
        }),
      }
    );

    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      throw new Error(`Gemini API ${res.status}${res.status === 404 ? ' (model not found, update model name)' : ''}: ${body}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('');
    if (!text) {
      throw new Error(data?.promptFeedback?.blockReason ? `Blocked: ${data.promptFeedback.blockReason}` : 'Empty response');
    }
    return text;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Gemini Cloud API timed out after ${CLOUD_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Orchestrator ----------
export class AICategorizer {
  static async categorizeAll(
    channels: SubscribedChannel[],
    apiKeyOverride?: string
  ): Promise<CategorizeAllResult> {
    channels = channels.filter(ch => !isSystemChannelOrCurator(ch));
    if (channels.length === 0) return { decks: [], providerUsed: 'heuristic' };

    const state = await SubDeckStorage.getAll();
    const settings = state.settings || structuredClone(DEFAULT_STORAGE.settings);
    const apiKey = apiKeyOverride || (typeof window === 'undefined' ? await SubDeckStorage.getApiKey() : undefined);
    const requested: AIProvider = (settings.aiProvider as AIProvider) ?? 'gemini-nano';
    // Never escalate to the cloud on the user's behalf: channel names leave the device only when
    // "gemini-api" is explicitly selected (the privacy policy promises Nano makes no network requests).
    const order: AIProvider[] =
      requested === 'heuristic'
        ? ['heuristic']
        : requested === 'gemini-api'
        ? ['gemini-api', 'heuristic']
        : ['gemini-nano', 'heuristic'];

    const failures: string[] = [];
    for (const p of order) {
      try {
        let decks: CategoryDeck[];
        if (p === 'gemini-nano') {
          decks = await tryGeminiNano(channels);
        } else if (p === 'gemini-api') {
          if (!apiKey) {
            failures.push('Cloud: no API key configured');
            continue;
          }
          if (!(await hasCloudPermission())) {
            failures.push('Cloud: permission to contact the Gemini API was not granted (re-select Cloud in Settings)');
            continue;
          }
          const model = settings.geminiModel || DEFAULT_GEMINI_MODEL;
          decks = await runChunks(channels, CLOUD_CHUNK, pr => callGemini(pr, apiKey, model));
        } else {
          decks = HeuristicCategorizer.categorize(channels);
        }

        decks = completeAssignments(decks, channels).map(d => ({ ...d, isSystem: true }));
        decks = this.rescueGeneralOther(decks, channels);

        const notice = p !== requested && failures.length
          ? `Used ${p === 'heuristic' ? 'offline engine' : p}. ${failures.join(' | ')}`
          : undefined;

        return { decks, providerUsed: p, fallbackNotice: notice };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Logger.warn(`[SubShelf AI] ${p} failed:`, msg);
        failures.push(`${p}: ${msg}`);
      }
    }

    // Heuristic fallback guarantee
    const fallbackDecks = HeuristicCategorizer.categorize(channels).map(d => ({ ...d, isSystem: true }));
    return {
      decks: fallbackDecks,
      providerUsed: 'heuristic',
      fallbackNotice: failures.length ? `Cloud AI failed, used offline engine (${failures.join(' | ')})` : undefined,
    };
  }

  /**
   * Rescues channels placed in general-other by checking if deterministic heuristics have a match.
   */
  static rescueGeneralOther(decks: CategoryDeck[], channels: SubscribedChannel[]): CategoryDeck[] {
    const generalDeck = decks.find(d => d.id === 'general-other');
    if (!generalDeck || generalDeck.channelIds.length === 0) return decks;

    const channelMap = new Map(channels.map(ch => [ch.ucId, ch]));
    const stuckChannels = generalDeck.channelIds
      .map(id => channelMap.get(id))
      .filter((ch): ch is SubscribedChannel => Boolean(ch));

    if (stuckChannels.length === 0) return decks;

    const heuristicResult = HeuristicCategorizer.categorize(stuckChannels);
    let rescued = 0;

    for (const hDeck of heuristicResult) {
      if (hDeck.id === 'general-other' || hDeck.channelIds.length === 0) continue;

      const targetDeck = decks.find(d => d.id === hDeck.id);
      for (const ucId of hDeck.channelIds) {
        generalDeck.channelIds = generalDeck.channelIds.filter(id => id !== ucId);
        if (targetDeck) {
          if (!targetDeck.channelIds.includes(ucId)) {
            targetDeck.channelIds.push(ucId);
          }
        } else {
          decks.push({ ...hDeck, channelIds: [ucId], isSystem: true });
        }
        rescued++;
      }
    }

    if (rescued > 0) {
      Logger.info(`[SubShelf AI] Rescued ${rescued} channels from General & Others via heuristic fallback`);
    }

    return decks.filter(d => d.channelIds.length > 0 || !d.isSystem);
  }

  /** See applyOverrides in ./overrides (shared with the storage write queue). */
  static applyOverrides = applyOverrides;
}

export const AIEngine = AICategorizer;
