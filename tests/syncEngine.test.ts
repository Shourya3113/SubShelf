import { describe, it, expect } from 'vitest';
import {
  computeSync,
  SyncSnapshot,
  REMOVAL_MIN_STRIKES,
  REMOVAL_STRIKE_INTERVAL_MS,
} from '@/utils/syncEngine';
import { CategoryDeck, SubscribedChannel } from '@/types';

const uc = (n: number) => `UC${String(n).padStart(22, '0')}`;

const ch = (n: number, title = `Channel ${n}`, handle = `@channel${n}`): SubscribedChannel => ({
  ucId: uc(n),
  title,
  handle,
  url: `https://www.youtube.com/${handle}`,
  avatarUrl: '',
  discoveredAt: 0,
});

const deck = (id: string, channelIds: string[], extra: Partial<CategoryDeck> = {}): CategoryDeck => ({
  id,
  name: id,
  icon: '📁',
  channelIds,
  isCollapsed: true,
  sortOrder: 0,
  ...extra,
});

function snapshotWith(channels: SubscribedChannel[], categories: CategoryDeck[] = []): SyncSnapshot {
  const map: Record<string, SubscribedChannel> = {};
  const handles: Record<string, string> = {};
  for (const c of channels) {
    map[c.ucId] = c;
    handles[c.handle] = c.ucId;
    handles[c.handle.slice(1)] = c.ucId;
  }
  return { channels: map, categories, handleToUcId: handles, missing: {} };
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('computeSync: additions', () => {
  it('adds a new channel and auto-categorizes it into an existing system folder', () => {
    const prev = snapshotWith([ch(1)], [deck('tech-coding', [uc(1)], { isSystem: true })]);
    const fireship = ch(2, 'Fireship', '@fireship');

    const res = computeSync(prev, { discovered: [ch(1), fireship], sidebarComplete: false, now: 0 });

    expect(res.added).toEqual([uc(2)]);
    expect(res.next.channels[uc(2)].title).toBe('Fireship');
    expect(res.next.handleToUcId['@fireship']).toBe(uc(2));
    expect(res.next.categories.find(c => c.id === 'tech-coding')!.channelIds).toContain(uc(2));
    expect(res.changed).toBe(true);
  });

  it('reports no change when the observation matches storage', () => {
    const prev = snapshotWith([ch(1), ch(2)]);
    const res = computeSync(prev, { discovered: [ch(1), ch(2)], sidebarComplete: true, now: 0 });
    expect(res.changed).toBe(false);
  });

  it('migrates a legacy handle-keyed record to its UC ID and remaps folder references', () => {
    const legacy: SubscribedChannel = { ...ch(5), ucId: '@channel5' };
    const prev: SyncSnapshot = {
      channels: { '@channel5': legacy },
      categories: [deck('user-deck', ['@channel5'])],
      handleToUcId: {},
      missing: {},
    };

    const res = computeSync(prev, { discovered: [ch(5)], sidebarComplete: false, now: 0 });

    expect(res.next.channels['@channel5']).toBeUndefined();
    expect(res.next.channels[uc(5)]).toBeDefined();
    expect(res.next.categories[0].channelIds).toEqual([uc(5)]);
  });

  it('purges stored YouTube system curators from channels and folders', () => {
    const music: SubscribedChannel = { ...ch(9, 'Music', '@music'), ucId: 'UC-9-kyTW8ZkZNDHQJ6FgpwQ' };
    const prev = snapshotWith([ch(1), music], [deck('mine', [uc(1), music.ucId])]);

    const res = computeSync(prev, { discovered: [ch(1)], sidebarComplete: false, now: 0 });

    expect(res.next.channels[music.ucId]).toBeUndefined();
    expect(res.next.categories[0].channelIds).toEqual([uc(1)]);
  });
});

describe('computeSync: unsubscribe reconciliation safety', () => {
  const stored = range(85).map(n => ch(n));
  const folders = [deck('user-deck', stored.map(c => c.ucId))];

  it('never removes anything when the sidebar scrape is not complete', () => {
    const prev = snapshotWith(stored, folders);
    const res = computeSync(prev, { discovered: stored.slice(0, 7), sidebarComplete: false, now: 0 });

    expect(res.removed).toEqual([]);
    expect(Object.keys(res.next.channels)).toHaveLength(85);
    expect(res.next.missing).toEqual({});
  });

  it('refuses a "complete" scrape that would wipe most channels (collapsed guide shows 7 of 85)', () => {
    let state = snapshotWith(stored, folders);
    // Even repeated over a long time, an implausible scrape must not remove or even strike anything
    for (let i = 0; i < 10; i++) {
      const res = computeSync(state, {
        discovered: stored.slice(0, 7),
        sidebarComplete: true,
        now: i * REMOVAL_STRIKE_INTERVAL_MS * 2,
      });
      expect(res.removed).toEqual([]);
      expect(res.removalSkipped).toMatch(/78\/85/);
      state = res.next;
    }
    expect(Object.keys(state.channels)).toHaveLength(85);
    expect(state.categories[0].channelIds).toHaveLength(85);
    expect(state.missing).toEqual({});
  });

  it('removes a genuinely unsubscribed channel only after repeated, spaced-out misses', () => {
    const withoutLast = stored.slice(0, 84);
    let state = snapshotWith(stored, folders);
    let t = 0;

    for (let strike = 1; strike < REMOVAL_MIN_STRIKES; strike++) {
      const res = computeSync(state, { discovered: withoutLast, sidebarComplete: true, now: t });
      expect(res.removed).toEqual([]);
      expect(res.next.missing[uc(85)].strikes).toBe(strike);
      state = res.next;
      t += REMOVAL_STRIKE_INTERVAL_MS;
    }

    const final = computeSync(state, { discovered: withoutLast, sidebarComplete: true, now: t });
    expect(final.removed).toEqual([uc(85)]);
    expect(final.next.channels[uc(85)]).toBeUndefined();
    expect(final.next.categories[0].channelIds).not.toContain(uc(85));
    expect(final.next.handleToUcId['@channel85']).toBeUndefined();
    expect(final.next.missing[uc(85)]).toBeUndefined();
  });

  it('does not count a burst of syncs inside the strike interval as extra strikes', () => {
    const withoutLast = stored.slice(0, 84);
    let state = snapshotWith(stored, folders);
    for (let i = 0; i < 20; i++) {
      const res = computeSync(state, { discovered: withoutLast, sidebarComplete: true, now: i * 100 });
      expect(res.removed).toEqual([]);
      state = res.next;
    }
    expect(state.missing[uc(85)].strikes).toBe(1);
  });

  it('clears the strike record as soon as the channel is seen again', () => {
    const withoutLast = stored.slice(0, 84);
    const first = computeSync(snapshotWith(stored, folders), { discovered: withoutLast, sidebarComplete: true, now: 0 });
    expect(first.next.missing[uc(85)]).toBeDefined();

    // Seen again via YouTube's guide payload, even with an incomplete sidebar
    const seen = computeSync(first.next, { discovered: [ch(85)], sidebarComplete: false, now: 1 });
    expect(seen.next.missing[uc(85)]).toBeUndefined();
    expect(seen.next.channels[uc(85)]).toBeDefined();
  });

  it('matches stored channels by handle when the scrape could not resolve a UC ID', () => {
    const handleOnly = stored.map(c => ({ ...c, ucId: c.handle }));
    const res = computeSync(snapshotWith(stored, folders), { discovered: handleOnly, sidebarComplete: true, now: 0 });
    expect(res.removed).toEqual([]);
    expect(res.next.missing).toEqual({});
  });
});
