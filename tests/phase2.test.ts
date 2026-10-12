import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildFeedTargets, cardMatches } from '@/utils/feedMatch';
import { applyOverrides } from '@/ai/overrides';
import { AICategorizer } from '@/ai/categorizer';
import { isSystemChannelOrCurator } from '@/utils/systemChannels';
import { CategoryDeck, SubscribedChannel } from '@/types';

const UC1 = 'UC0000000000000000000001';
const UC2 = 'UC0000000000000000000002';
const UC3 = 'UC0000000000000000000003';

const ch = (ucId: string, handle: string, title = handle): SubscribedChannel => ({
  ucId, title, handle, url: `https://www.youtube.com/${handle}`, avatarUrl: '', discoveredAt: 0,
});
const deck = (id: string, channelIds: string[], extra: Partial<CategoryDeck> = {}): CategoryDeck => ({
  id, name: id, icon: '📁', channelIds, isCollapsed: true, sortOrder: 0, ...extra,
});

describe('feed filter matching', () => {
  const channels = { [UC1]: ch(UC1, '@MrWhoseTheBoss'), [UC2]: ch(UC2, '@unboxtherapy') };

  it('matches feed cards that only carry an @handle link (the live YouTube format)', () => {
    const targets = buildFeedTargets([UC1], channels, {});
    expect(cardMatches({ ucId: null, handle: '@mrwhosetheboss' }, targets)).toBe(true);
    expect(cardMatches({ ucId: null, handle: '@unboxtherapy' }, targets)).toBe(false);
  });

  it('still matches cards that carry a UC ID link', () => {
    const targets = buildFeedTargets([UC1], channels, {});
    expect(cardMatches({ ucId: UC1, handle: null }, targets)).toBe(true);
  });

  it('uses the handle map for channels whose stored record has no real handle', () => {
    const targets = buildFeedTargets([UC3], { [UC3]: ch(UC3, `@${UC3}`) }, { '@techlinked': UC3, techlinked: UC3 });
    expect(cardMatches({ ucId: null, handle: '@techlinked' }, targets)).toBe(true);
  });
});

describe('Auto-AI keeps folder customizations', () => {
  it('keeps the name, icon and collapsed state of a regenerated system folder', () => {
    const generated = [deck('travel-outdoors', [UC1], { name: 'Travel & Outdoors', icon: '✈️', isSystem: true })];
    const existing = [deck('travel-outdoors', [UC1], { name: 'Travel Test', icon: '✉️', isCollapsed: false, isSystem: true })];
    const [result] = applyOverrides(generated, existing, {}, {}, [ch(UC1, '@one')]);
    expect(result.name).toBe('Travel Test');
    expect(result.icon).toBe('✉️');
    expect(result.isCollapsed).toBe(false);
  });
});

describe('AI provider fallback privacy', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('never sends channels to the cloud when Gemini Nano is selected but unavailable', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    // Default settings select gemini-nano; an API key is available but must not be used
    const result = await AICategorizer.categorizeAll([ch(UC1, '@fireship', 'Fireship')], 'test-key');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.providerUsed).toBe('heuristic');
  });
});

describe('system channel detection keeps real creators', () => {
  it('does not drop real channels whose names are generic words', () => {
    expect(isSystemChannelOrCurator({ ucId: UC1, title: 'HISTORY', handle: '@history' })).toBe(false);
    expect(isSystemChannelOrCurator({ ucId: UC2, title: 'News', handle: '@news' })).toBe(false);
  });

  it('still drops navigation entries that have no channel ID', () => {
    expect(isSystemChannelOrCurator({ title: 'History', url: '/feed/history' })).toBe(true);
    expect(isSystemChannelOrCurator({ title: 'Help' })).toBe(true);
  });
});
