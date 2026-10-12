import { CategoryDeck, SubscribedChannel } from '@/types';

/**
 * Learns from the user's own corrections. Every channel the user filed by hand (manualAssignments)
 * is a labelled example; each folder gets a TF-IDF word profile built from its examples' title,
 * handle and description. A channel the user hasn't placed themselves is moved to a folder only when
 * it closely matches that folder's profile. Runs entirely on-device.
 */

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'our', 'this', 'that', 'are', 'from', 'all', 'new', 'channel',
  'channels', 'official', 'videos', 'video', 'youtube', 'subscribe', 'welcome', 'here', 'about', 'more', 'every',
  'week', 'will', 'can', 'get', 'not', 'just', 'like', 'what', 'who', 'how', 'its', 'his', 'her', 'they', 'them',
  'also', 'into', 'out', 'one', 'only', 'have', 'has', 'was', 'were', 'but', 'any', 'www', 'com', 'http', 'https',
]);

const FIELD_WEIGHT = { title: 3, handle: 2, description: 1 } as const;
const MAX_DESCRIPTION_TOKENS = 60;

/** Letters/digits in any script; splits camelCase and letter/digit boundaries; drops noise words. */
export function learningTokens(text: string | undefined | null): string[] {
  if (!text) return [];
  return text
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{L})(\p{N})|(\p{N})(\p{L})/gu, (_m, a, b, c, d) => (a ? `${a} ${b}` : `${c} ${d}`))
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u) // \p{M}: vowel signs etc. belong to the word (Hindi, Thai, ...)
    .filter(t => t.length >= 2 && !/^\p{N}+$/u.test(t) && !STOPWORDS.has(t));
}

type Vector = Map<string, number>;

function rawVector(ch: Pick<SubscribedChannel, 'title' | 'handle'> & { description?: string }): Vector {
  const v: Vector = new Map();
  const add = (tokens: string[], w: number) => {
    for (const t of tokens) v.set(t, (v.get(t) ?? 0) + w);
  };
  add(learningTokens(ch.title), FIELD_WEIGHT.title);
  add(learningTokens((ch.handle || '').replace(/^@/, '')), FIELD_WEIGHT.handle);
  add(learningTokens(ch.description).slice(0, MAX_DESCRIPTION_TOKENS), FIELD_WEIGHT.description);
  return v;
}

function weighted(v: Vector, idf: Map<string, number>): Vector {
  const out: Vector = new Map();
  for (const [t, tf] of v) {
    const w = idf.get(t);
    if (w) out.set(t, tf * w);
  }
  return out;
}

const norm = (v: Vector) => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));

/** A single shared word (e.g. "universe" in a cooking channel's name) is not evidence of similarity. */
const MIN_SHARED_WORDS = 2;

function cosine(a: Vector, b: Vector, bNorm: number): number {
  const an = norm(a);
  if (!an || !bNorm) return 0;
  let dot = 0;
  let shared = 0;
  for (const [t, x] of a) {
    const y = b.get(t);
    if (y) {
      dot += x * y;
      shared++;
    }
  }
  return shared >= MIN_SHARED_WORDS ? dot / (an * bNorm) : 0;
}

export interface LearnedModel {
  idf: Map<string, number>;
  folders: { id: string; profile: Vector; norm: number; examples: number }[];
}

export interface Prediction {
  folderId: string;
  score: number;
  margin: number;
}

/** Thresholds, tuned so a single correction generalizes only to clearly similar channels. */
export const LEARN_MIN_SCORE_UNSORTED = 0.35; // channel the engine left in General & Others
export const LEARN_MIN_SCORE_OVERRIDE = 0.6;  // channel the engine already placed elsewhere (fixture false matches reached 0.45)
export const LEARN_MIN_MARGIN = 0.1;          // over the second-best folder

/** Builds folder profiles from the user's manual assignments. Returns null when there's nothing to learn. */
export function trainFromCorrections(
  channels: Record<string, SubscribedChannel>,
  manual: Record<string, string[]>,
  folders: CategoryDeck[]
): LearnedModel | null {
  const folderIds = new Set(folders.map(f => f.id));
  const examples = new Map<string, Vector[]>();
  for (const [channelId, deckIds] of Object.entries(manual || {})) {
    const ch = channels[channelId];
    if (!ch) continue;
    for (const deckId of deckIds || []) {
      if (!folderIds.has(deckId) || deckId === 'general-other') continue;
      if (!examples.has(deckId)) examples.set(deckId, []);
      examples.get(deckId)!.push(rawVector(ch));
    }
  }
  if (examples.size === 0) return null;

  // IDF over all known channels, so words common to everything (e.g. "music" in a music-heavy list) weigh less
  const all = Object.values(channels);
  const df = new Map<string, number>();
  for (const ch of all) for (const t of new Set(rawVector(ch).keys())) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = new Map<string, number>();
  // Words used by only one channel (its own name, its handle) can never match another channel, but
  // would dominate the vector length and drown out the shared words, so they are left out entirely
  for (const [t, n] of df) if (n >= 2) idf.set(t, Math.log((1 + all.length) / (1 + n)) + 1);

  const profiles = [...examples.entries()].map(([id, vecs]) => {
    const profile: Vector = new Map();
    for (const v of vecs) {
      const w = weighted(v, idf);
      const n = norm(w) || 1;
      for (const [t, x] of w) profile.set(t, (profile.get(t) ?? 0) + x / n);
    }
    return { id, profile, norm: norm(profile), examples: vecs.length };
  });
  return { idf, folders: profiles };
}

/** Best-matching folder for a channel, excluding folders the user removed it from. */
export function predictFolder(
  model: LearnedModel,
  ch: SubscribedChannel,
  excluded: string[] = []
): Prediction | null {
  const v = weighted(rawVector(ch), model.idf);
  const scored = model.folders
    .filter(f => !excluded.includes(f.id))
    .map(f => ({ folderId: f.id, score: cosine(v, f.profile, f.norm) }))
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0 || scored[0].score <= 0) return null;
  return { ...scored[0], margin: scored[0].score - (scored[1]?.score ?? 0) };
}

/** Whether a prediction is strong enough, given where the engine would otherwise put the channel. */
export function isConfident(p: Prediction | null, currentFolderId: string | null): p is Prediction {
  if (!p || p.margin < LEARN_MIN_MARGIN || p.folderId === currentFolderId) return false;
  const unsorted = !currentFolderId || currentFolderId === 'general-other';
  return p.score >= (unsorted ? LEARN_MIN_SCORE_UNSORTED : LEARN_MIN_SCORE_OVERRIDE);
}

/**
 * Applies learned corrections to engine output: moves non-manual channels whose profile match is
 * confident. User folders that receive channels are included even if the engine never produced them.
 */
export function applyLearnedCorrections(
  decks: CategoryDeck[],
  channels: Record<string, SubscribedChannel>,
  manual: Record<string, string[]>,
  exclusions: Record<string, string[]>,
  existing: CategoryDeck[]
): { decks: CategoryDeck[]; moved: number } {
  const model = trainFromCorrections(channels, manual, existing);
  if (!model) return { decks, moved: 0 };

  const out = decks.map(d => ({ ...d, channelIds: [...d.channelIds] }));
  const ownerOf = new Map<string, string>();
  for (const d of out) for (const id of d.channelIds) if (!ownerOf.has(id)) ownerOf.set(id, d.id);

  let moved = 0;
  for (const [id, ch] of Object.entries(channels)) {
    if ((manual[id] ?? []).length > 0) continue; // the user already decided
    const current = ownerOf.get(id) ?? null;
    const p = predictFolder(model, ch, exclusions[id] ?? []);
    if (!isConfident(p, current)) continue;

    let target = out.find(d => d.id === p.folderId);
    if (!target) {
      const src = existing.find(d => d.id === p.folderId);
      if (!src) continue;
      target = { ...src, channelIds: [] };
      out.push(target);
    }
    for (const d of out) d.channelIds = d.channelIds.filter(x => x !== id);
    target.channelIds.push(id);
    moved++;
  }
  return { decks: out.filter(d => d.channelIds.length > 0 || !d.isSystem), moved };
}
