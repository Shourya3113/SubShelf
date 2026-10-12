import { CategoryDeck, SubscribedChannel } from '@/types';
import { SUBDECK_TAXONOMY } from './heuristic';

/**
 * Merges freshly generated (system) decks with the user's existing state.
 * - System IDs come from taxonomy; generated decks are isSystem: true.
 * - User-created decks are carried over; old system decks are replaced.
 * - Dead channels, exclusions, and manual removals are respected.
 * - Exactly one owner per channel unless the user explicitly assigned several.
 * - Empty system decks are dropped, empty user decks kept.
 */
export function applyOverrides(
  generated: CategoryDeck[] = [],
  existing: CategoryDeck[] = [],
  manual: Record<string, string[]> = {},
  exclusions: Record<string, string[]> = {},
  channels: SubscribedChannel[] = []
): CategoryDeck[] {
  const live = new Set((channels || []).map(c => c.ucId));
  const systemIds = new Set<string>([...SUBDECK_TAXONOMY.map(t => t.id), '__uncategorized__']);
  const decks = new Map<string, CategoryDeck>();

  // 1) Fresh generated (system) decks; membership is regenerated, but the user's customizations
  //    of an existing folder (name, icon, color, collapsed state, order) are kept
  for (const d of (generated || [])) {
    const prior = (existing || []).find(x => x.id === d.id);
    const custom = prior
      ? { name: prior.name, icon: prior.icon, color: prior.color, isCollapsed: prior.isCollapsed, sortOrder: prior.sortOrder }
      : {};
    decks.set(d.id, { ...d, ...custom, isSystem: true, channelIds: [...(d.channelIds || [])] });
  }

  // 2) Carry over USER-created decks only (never old system decks)
  for (const d of (existing || [])) {
    if (d.isSystem || systemIds.has(d.id) || decks.has(d.id)) continue;
    decks.set(d.id, { ...d, isSystem: false, channelIds: [...(d.channelIds || [])] });
  }

  const ordered = [...decks.values()].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  // 3) Drop dead channels, exclusions, and decks the user manually moved a channel out of
  for (const d of ordered) {
    d.channelIds = (d.channelIds || []).filter(id => {
      if (!live.has(id)) return false;
      if ((exclusions[id] ?? []).includes(d.id)) return false;
      const m = manual[id] ?? [];
      return !(m.length > 0 && !m.includes(d.id));
    });
  }

  // 4) Apply manual assignments (restore user-owned deck if needed)
  for (const [id, deckIds] of Object.entries(manual || {})) {
    if (!live.has(id)) continue;
    for (const deckId of deckIds || []) {
      if (deckId === '__uncategorized__') continue;
      let d = decks.get(deckId);
      if (!d) {
        const src = (existing || []).find(x => x.id === deckId);
        if (!src) continue;
        d = { ...src, channelIds: [] };
        decks.set(deckId, d);
        ordered.push(d);
      }
      if (!d.channelIds.includes(id)) d.channelIds.push(id);
    }
  }

  // 5) One owner per channel unless the user explicitly assigned several
  const owner = new Set<string>();
  for (const d of ordered) {
    d.channelIds = (d.channelIds || []).filter(id => {
      if ((manual[id] ?? []).length > 1) return true;
      if (owner.has(id)) return false;
      owner.add(id);
      return true;
    });
  }

  // 6) Drop empty system decks, keep empty user decks
  return ordered.filter(d => (d.channelIds && d.channelIds.length > 0) || !d.isSystem);
}
