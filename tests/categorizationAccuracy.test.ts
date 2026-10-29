import { describe, it, expect } from 'vitest';
import { HeuristicCategorizer, SUBDECK_TAXONOMY } from '@/ai/heuristic';
import { SubscribedChannel } from '@/types';
import { PUBLIC_CHANNELS } from './fixtures/publicChannels';

const placeholderId = (i: number) => 'UC' + String(i).padStart(22, '0');

const toChannels = (withDescriptions: boolean): SubscribedChannel[] =>
  PUBLIC_CHANNELS.map((c, i) => ({
    ucId: placeholderId(i),
    title: c.title,
    handle: c.handle,
    url: `https://www.youtube.com/${c.handle}`,
    avatarUrl: '',
    discoveredAt: 0,
    ...(withDescriptions ? { description: c.description } : {}),
  }));

interface Run {
  predicted: string[];
  accuracy: number;
  generalShare: number;
}

function run(withDescriptions: boolean): Run {
  const decks = HeuristicCategorizer.categorize(toChannels(withDescriptions));
  const folderOf = new Map<string, string>();
  for (const d of decks) for (const id of d.channelIds) folderOf.set(id, d.id);
  const predicted = PUBLIC_CHANNELS.map((_, i) => folderOf.get(placeholderId(i)) ?? 'none');
  const correct = predicted.filter((p, i) => p === PUBLIC_CHANNELS[i].expected).length;
  return {
    predicted,
    accuracy: correct / PUBLIC_CHANNELS.length,
    generalShare: predicted.filter(p => p === 'general-other').length / PUBLIC_CHANNELS.length,
  };
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

describe('categorization accuracy (offline heuristic, public-channel fixture)', () => {
  it('fixture is well-formed', () => {
    const ids = new Set(SUBDECK_TAXONOMY.map(t => t.id));
    for (const c of PUBLIC_CHANNELS) expect(ids.has(c.expected), c.title).toBe(true);
    expect(new Set(PUBLIC_CHANNELS.map(c => c.handle.toLowerCase())).size).toBe(PUBLIC_CHANNELS.length);
    expect(PUBLIC_CHANNELS.length).toBeGreaterThanOrEqual(60);
  });

  it('descriptions improve accuracy and shrink General & Others', () => {
    const before = run(false);
    const after = run(true);

    const signatures = new Set(SUBDECK_TAXONOMY.flatMap(t => t.exactSignatures ?? []).map(s => s.toLowerCase()));
    const knownCreators = PUBLIC_CHANNELS.filter(c =>
      signatures.has(c.title.toLowerCase()) || signatures.has(c.handle.slice(1).toLowerCase())
    ).length;

    const changed = PUBLIC_CHANNELS.flatMap((c, i) =>
      before.predicted[i] === after.predicted[i]
        ? []
        : [`  ${c.title}: ${before.predicted[i]} -> ${after.predicted[i]} (expected ${c.expected})`]
    );
    const stillWrong = PUBLIC_CHANNELS.flatMap((c, i) =>
      after.predicted[i] === c.expected ? [] : [`  ${c.title}: ${after.predicted[i]} (expected ${c.expected})`]
    );

    console.log(
      [
        `Heuristic accuracy on ${PUBLIC_CHANNELS.length} public channels (${knownCreators} on the built-in creator list):`,
        `  title + handle:               accuracy ${pct(before.accuracy)}, General & Others ${pct(before.generalShare)}`,
        `  title + handle + description: accuracy ${pct(after.accuracy)}, General & Others ${pct(after.generalShare)}`,
        `Changed by descriptions (${changed.length}):`,
        ...changed,
        `Still wrong with descriptions (${stillWrong.length}):`,
        ...stillWrong,
      ].join('\n')
    );

    expect(after.accuracy).toBeGreaterThanOrEqual(before.accuracy);
    expect(after.generalShare).toBeLessThanOrEqual(before.generalShare);
  });
});

describe('"home" and "house" in a channel name (reported on Reddit)', () => {
  const folderOf = (title: string, handle: string, description = '') => {
    const ch: SubscribedChannel = { ucId: placeholderId(1), title, handle, url: '', avatarUrl: '', discoveredAt: 0, description };
    return HeuristicCategorizer.categorize([ch]).find(d => d.channelIds.includes(ch.ucId))?.id;
  };

  it('does not send homelab or gaming channels to Food & Lifestyle', () => {
    expect(folderOf('ServersatHome', '@ServersatHome')).toBe('tech-coding');
    expect(folderOf('Servers at Home', '@serversathome', 'Homelab, self-hosting and TrueNAS guides.')).toBe('tech-coding');
    expect(folderOf('DefendTheHouse', '@DefendTheHouse')).not.toBe('lifestyle-food');
    expect(folderOf('DefendTheHouse', '@DefendTheHouse', 'Arc Raiders, Helldivers and other video games.')).toBe('gaming');
  });

  it('still files real home and cooking channels under Food & Lifestyle', () => {
    expect(folderOf('Home Decor Ideas', '@homedecorideas')).toBe('lifestyle-food');
    expect(folderOf('Pro Home Cooks', '@ProHomeCooks')).toBe('lifestyle-food');
  });
});
