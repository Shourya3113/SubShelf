import { describe, it, expect } from 'vitest';
import { applyLearnedCorrections, learningTokens, predictFolder, trainFromCorrections } from '@/ai/learning';
import { CategoryDeck, SubscribedChannel } from '@/types';

let n = 0;
const ch = (title: string, handle: string, description = ''): SubscribedChannel & { description: string } => ({
  ucId: `UC${String(++n).padStart(22, '0')}`, title, handle, url: '', avatarUrl: '', discoveredAt: 0, description,
});
const deck = (id: string, channelIds: string[], extra: Partial<CategoryDeck> = {}): CategoryDeck => ({
  id, name: id, icon: '📁', channelIds, isCollapsed: true, sortOrder: 0, isSystem: true, ...extra,
});
const byId = (list: SubscribedChannel[]) => Object.fromEntries(list.map(c => [c.ucId, c]));

// A realistic list: tech, music, space and cooking channels
const apple = ch('Apple', '@apple', 'Apple product launches, keynotes and iPhone, Mac and iPad features.');
const appleIndia = ch('Apple India', '@appleindia', 'Official Apple channel for India: iPhone, Mac and iPad.');
const appleExplained = ch('Apple Explained', '@appleexplained', 'Explaining the history of Apple, iPhone and Mac.');
const google = ch('Google', '@google', 'Search, Android, Pixel and AI from Google.');
const mkbhd = ch('Marques Brownlee', '@mkbhd', 'Quality tech videos: smartphones, reviews and gadgets.');
const nasa = ch('NASA', '@nasa', 'Space exploration, rockets, astronauts and the universe.');
const secrets = ch('The Secrets of the Universe', '@secretsoftheuniverse', 'Space documentaries about black holes, planets and the universe.');
const dom = ch('Domain of Science', '@domainofscience', 'Maps of physics, chemistry and the universe explained.');
const babish = ch('Babish Culinary Universe', '@babishculinaryuniverse', 'Cooking recipes from movies and TV.');
const astrum = ch('Astrum', '@astrumspace', 'Space documentaries: planets, black holes and the universe.');
const all = [apple, appleIndia, appleExplained, google, mkbhd, nasa, secrets, dom, babish, astrum];

describe('learningTokens', () => {
  it('splits camelCase and keeps non-Latin scripts', () => {
    expect(learningTokens('TechLinked 2026')).toEqual(['tech', 'linked']);
    expect(learningTokens('हिंदी टेक चैनल')).toEqual(['हिंदी', 'टेक', 'चैनल']);
    expect(learningTokens('The official channel')).toEqual([]);
  });
});

describe('learning from corrections', () => {
  it('learns nothing without manual corrections', () => {
    expect(trainFromCorrections(byId(all), {}, [deck('tech-coding', [])])).toBeNull();
  });

  it('a custom "Apple" folder attracts other Apple channels but not Google or MKBHD', () => {
    const decks = [deck('tech-coding', [apple, appleIndia, appleExplained, google, mkbhd].map(c => c.ucId)), deck('apple-stuff', [apple.ucId, appleIndia.ucId], { isSystem: false })];
    const manual = { [apple.ucId]: ['apple-stuff'], [appleIndia.ucId]: ['apple-stuff'] };
    const { decks: out, moved } = applyLearnedCorrections(decks, byId(all), manual, {}, decks);

    const appleFolder = out.find(d => d.id === 'apple-stuff')!.channelIds;
    expect(appleFolder).toContain(appleExplained.ucId);
    expect(appleFolder).not.toContain(google.ucId);
    expect(appleFolder).not.toContain(mkbhd.ucId);
    expect(out.find(d => d.id === 'tech-coding')!.channelIds).toEqual(expect.arrayContaining([google.ucId, mkbhd.ucId]));
    expect(moved).toBe(1);
  });

  it('moving space channels out of General rescues similar unsorted channels', () => {
    const decks = [deck('general-other', [secrets.ucId, astrum.ucId, babish.ucId]), deck('education-science', [nasa.ucId])];
    const manual = { [nasa.ucId]: ['education-science'], [secrets.ucId]: ['education-science'] };
    const { decks: out } = applyLearnedCorrections(decks, byId(all), manual, {}, decks);
    const edu = out.find(d => d.id === 'education-science')!.channelIds;
    expect(edu).toContain(astrum.ucId);
    // "Universe" alone must not drag a cooking channel into Education
    expect(edu).not.toContain(babish.ucId);
  });

  it('never moves channels the user placed by hand', () => {
    const decks = [deck('tech-coding', [appleExplained.ucId]), deck('apple-stuff', [apple.ucId], { isSystem: false })];
    const manual = { [apple.ucId]: ['apple-stuff'], [appleExplained.ucId]: ['tech-coding'] };
    const { decks: out } = applyLearnedCorrections(decks, byId(all), manual, {}, decks);
    expect(out.find(d => d.id === 'tech-coding')!.channelIds).toContain(appleExplained.ucId);
    expect(out.find(d => d.id === 'apple-stuff')!.channelIds).not.toContain(appleExplained.ucId);
  });

  it('never moves a channel into a folder the user removed it from', () => {
    const decks = [deck('tech-coding', [appleExplained.ucId]), deck('apple-stuff', [apple.ucId, appleIndia.ucId], { isSystem: false })];
    const manual = { [apple.ucId]: ['apple-stuff'], [appleIndia.ucId]: ['apple-stuff'] };
    const p = predictFolder(trainFromCorrections(byId(all), manual, decks)!, appleExplained, ['apple-stuff']);
    expect(p).toBeNull();
    const { moved } = applyLearnedCorrections(decks, byId(all), manual, { [appleExplained.ucId]: ['apple-stuff'] }, decks);
    expect(moved).toBe(0);
  });

  it('keeps an emptied user folder and drops emptied system folders', () => {
    const decks = [deck('tech-coding', [appleExplained.ucId]), deck('apple-stuff', [apple.ucId, appleIndia.ucId], { isSystem: false })];
    const manual = { [apple.ucId]: ['apple-stuff'], [appleIndia.ucId]: ['apple-stuff'] };
    const { decks: out } = applyLearnedCorrections(decks, byId(all), manual, {}, decks);
    expect(out.find(d => d.id === 'tech-coding')).toBeUndefined();
    expect(out.find(d => d.id === 'apple-stuff')!.channelIds).toContain(appleExplained.ucId);
  });
});

describe('Auto-AI merge keeps user folders as user folders', () => {
  it('a user folder that received learned channels is not turned into a system folder', async () => {
    const { applyOverrides } = await import('@/ai/overrides');
    const userFolder = deck('apple-stuff', [apple.ucId, appleExplained.ucId], { isSystem: false, name: 'My Apple' });
    const result = applyOverrides([deck('tech-coding', [google.ucId]), userFolder], [userFolder], { [apple.ucId]: ['apple-stuff'] }, {}, all);
    const kept = result.find(d => d.id === 'apple-stuff')!;
    expect(kept.isSystem).toBe(false);
    expect(kept.name).toBe('My Apple');
    expect(kept.channelIds).toEqual(expect.arrayContaining([apple.ucId, appleExplained.ucId]));
  });
});
