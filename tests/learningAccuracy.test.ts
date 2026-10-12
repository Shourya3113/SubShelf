import { describe, it, expect } from 'vitest';
import { HeuristicCategorizer, SUBDECK_TAXONOMY } from '@/ai/heuristic';
import { applyLearnedCorrections } from '@/ai/learning';
import { CategoryDeck, SubscribedChannel } from '@/types';
import { PUBLIC_CHANNELS } from './fixtures/publicChannels';

/**
 * Simulates a user who fixes some of the offline engine's mistakes by hand, then measures what the
 * learner does to every OTHER channel: how many wrong ones it fixes and, more importantly, how many
 * correct ones it breaks.
 */
const channels: Record<string, SubscribedChannel> = {};
const expectedOf = new Map<string, string>();
PUBLIC_CHANNELS.forEach((c, i) => {
  const id = `UC${String(i).padStart(22, '0')}`;
  channels[id] = { ucId: id, title: c.title, handle: c.handle, url: '', avatarUrl: '', discoveredAt: 0, description: c.description } as SubscribedChannel;
  expectedOf.set(id, c.expected);
});

const engineDecks = HeuristicCategorizer.categorize(Object.values(channels));
const ownerOf = (decks: CategoryDeck[], id: string) => decks.find(d => d.channelIds.includes(id))?.id ?? null;
const allFolders: CategoryDeck[] = SUBDECK_TAXONOMY.map((t, i) => ({
  id: t.id, name: t.name, icon: t.icon, isCollapsed: true, sortOrder: i, isSystem: true,
  channelIds: engineDecks.find(d => d.id === t.id)?.channelIds ?? [],
}));

function simulate(corrections: number) {
  const wrong = Object.keys(channels).filter(id => ownerOf(engineDecks, id) !== expectedOf.get(id));
  const corrected = new Set(wrong.slice(0, corrections));
  const manual = Object.fromEntries([...corrected].map(id => [id, [expectedOf.get(id)!]]));

  // The user's moves, as Auto-AI's input would reflect them
  const userDecks = allFolders.map(d => ({ ...d, channelIds: d.channelIds.filter(id => !corrected.has(id)) }));
  for (const id of corrected) userDecks.find(d => d.id === expectedOf.get(id))!.channelIds.push(id);

  const { decks: after, moved } = applyLearnedCorrections(userDecks, channels, manual, {}, userDecks);
  const others = Object.keys(channels).filter(id => !corrected.has(id));
  const right = (decks: CategoryDeck[], id: string) => ownerOf(decks, id) === expectedOf.get(id);
  return {
    corrections: corrected.size,
    moved,
    before: others.filter(id => right(userDecks, id)).length,
    after: others.filter(id => right(after, id)).length,
    fixed: others.filter(id => !right(userDecks, id) && right(after, id)).length,
    broken: others.filter(id => right(userDecks, id) && !right(after, id)).map(id => channels[id].title),
    total: others.length,
  };
}

describe('learning from corrections (public-channel fixture)', () => {
  it('fixes some other channels and never breaks correct ones', () => {
    const lines: string[] = [];
    for (const k of [3, 6, 10]) {
      const r = simulate(k);
      lines.push(
        `  ${r.corrections} corrections: other channels right ${r.before}/${r.total} -> ${r.after}/${r.total}` +
        ` (fixed ${r.fixed}, broke ${r.broken.length}${r.broken.length ? ': ' + r.broken.join(', ') : ''}, moved ${r.moved})`
      );
      expect(r.broken, `corrections=${k}`).toEqual([]);
      expect(r.after).toBeGreaterThanOrEqual(r.before);
    }
    console.log(`Learning from corrections on ${PUBLIC_CHANNELS.length} public channels:\n${lines.join('\n')}`);
  });
});
