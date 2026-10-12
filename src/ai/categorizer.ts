import { SubscribedChannel, CategoryDeck, DEFAULT_GEMINI_CLOUD_MODEL, DEFAULT_STORAGE } from '@/types';
import { HeuristicCategorizer, SUBDECK_TAXONOMY } from './heuristic';
import { buildCategorizationPrompt } from './prompt';
import { categorizationGeminiSchema, categorizationJsonSchema } from './responseSchema';
import { applyOverrides } from './overrides';
import { hasCloudPermission } from '@/utils/cloudPermission';
import { SubDeckStorage } from '@/utils/storage';
import { Logger } from '@/utils/logger';
import { isSystemChannelOrCurator } from '@/utils/systemChannels';
import {
  NANO_OPTS,
  NanoRunner,
  localNanoRunner,
  nanoUnavailableReason,
  resolveLanguageModelAPI,
} from './nano';

export { NANO_OPTS, resolveLanguageModelAPI };

export type AIProvider = 'gemini-nano' | 'gemini-api' | 'heuristic';

export interface CategorizeAllResult {
  decks: CategoryDeck[];
  providerUsed: AIProvider;
  fallbackNotice?: string;
}

export interface CategorizeOptions {
  /** Runs Gemini Nano in another context (an offscreen document) when this one can't. */
  nanoFallback?: () => Promise<NanoRunner | null>;
}

// ~120 tokens per channel with a 200-char description: 20 channels keep a prompt near 2.4k tokens,
// well inside Gemini Nano's per-session input quota (40 was ~4.7k and risked overflowing it)
const NANO_CHUNK = 20;
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

const TAXONOMY_IDS = SUBDECK_TAXONOMY.map(t => t.id);

/**
 * Run batches across channel chunks. Partial success merges results; total failure throws.
 * `call` receives the batch's channel references ("c0", "c1", ...) to build its output schema.
 */
async function runChunks(
  channels: SubscribedChannel[],
  size: number,
  call: (prompt: string, refs: string[]) => Promise<string>
): Promise<CategoryDeck[]> {
  let merged: CategoryDeck[] = [];
  let ok = 0;
  let lastErr: unknown;

  for (const part of chunk(channels, size)) {
    try {
      const refs = part.map((_, i) => `c${i}`);
      const out = await call(buildCategorizationPrompt(part), refs);
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
class NanoNotReadyError extends Error {}

async function runNano(channels: SubscribedChannel[], runner: NanoRunner): Promise<CategoryDeck[]> {
  const status = await runner.availability();
  // Never start a download from here: that needs a user gesture in the popup
  if (status !== 'available') throw new NanoNotReadyError(nanoUnavailableReason(status));
  return runChunks(channels, NANO_CHUNK, (prompt, refs) =>
    runner.prompt(prompt, categorizationJsonSchema(TAXONOMY_IDS, refs))
  );
}

async function tryGeminiNano(
  channels: SubscribedChannel[],
  fallback?: () => Promise<NanoRunner | null>
): Promise<CategoryDeck[]> {
  const LM = resolveLanguageModelAPI();
  if (LM) {
    try {
      return await runNano(channels, localNanoRunner(LM));
    } catch (e) {
      // A model that isn't ready won't be ready elsewhere either; other failures (e.g. this
      // context refusing to create sessions) get one retry in the fallback context.
      if (!fallback || e instanceof NanoNotReadyError) throw e;
      Logger.warn('[SubShelf AI] Gemini Nano failed in this context, retrying via fallback:', e);
    }
  }
  const remote = fallback ? await fallback() : null;
  if (!remote) throw new Error(nanoUnavailableReason('no-api'));
  return runNano(channels, remote);
}

// ---------- Gemini Cloud API ----------
async function callGemini(prompt: string, refs: string[], apiKey: string, model: string): Promise<string> {
  try {
    return await requestGemini(prompt, refs, apiKey, model);
  } catch (err) {
    // Some models reject large enum schemas; the response parser still validates every ID
    if (err instanceof SchemaRejectedError) return requestGemini(prompt, null, apiKey, model);
    throw err;
  }
}

class SchemaRejectedError extends Error {}

async function requestGemini(prompt: string, refs: string[] | null, apiKey: string, model: string): Promise<string> {
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
          generationConfig: {
            responseMimeType: 'application/json',
            ...(refs ? { responseSchema: categorizationGeminiSchema(TAXONOMY_IDS, refs) } : {}),
            temperature: 0,
          },
        }),
      }
    );

    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      if (refs && res.status === 400 && /schema/i.test(body)) throw new SchemaRejectedError(body);
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
    apiKeyOverride?: string,
    options: CategorizeOptions = {}
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
          decks = await tryGeminiNano(channels, options.nanoFallback);
        } else if (p === 'gemini-api') {
          if (!apiKey) {
            failures.push('Cloud: no API key configured');
            continue;
          }
          if (!(await hasCloudPermission())) {
            failures.push('Cloud: permission to contact the Gemini API was not granted (re-select Cloud in Settings)');
            continue;
          }
          const model = settings.geminiModel || DEFAULT_GEMINI_CLOUD_MODEL;
          decks = await runChunks(channels, CLOUD_CHUNK, (pr, refs) => callGemini(pr, refs, apiKey, model));
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

