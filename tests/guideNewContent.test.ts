import { describe, it, expect, beforeEach } from 'vitest';
import { newContentKeys } from '@/utils/guideNewContent';
import { NewUploads } from '@/content/newUploads';

const NEW = 'GUIDE_ENTRY_PRESENTATION_STYLE_NEW_CONTENT';
const id = (n: number) => 'UC' + String(n).padStart(22, '0');

const entry = (n: number, isNew: boolean, handle = `@chan${n}`) => ({
  guideEntryRenderer: {
    navigationEndpoint: { browseEndpoint: { browseId: id(n), canonicalBaseUrl: `/${handle}` } },
    formattedTitle: { simpleText: `Channel ${n}` },
    ...(isNew ? { presentationStyle: NEW } : {}),
  },
});

const viewModel = (n: number, isNew: boolean) => ({
  guideEntryViewModel: {
    title: { content: `Channel ${n}` },
    rendererContext: { commandContext: { onTap: { innertubeCommand: { browseEndpoint: { browseId: id(n) } } } } },
    ...(isNew ? { presentationStyle: NEW } : {}),
  },
});

const guide = (items: unknown[], more: unknown[] = []) => ({
  items: [
    { guideSectionRenderer: { items: [{ guideEntryRenderer: { presentationStyle: NEW, navigationEndpoint: { browseEndpoint: { browseId: id(99) } } } }] } },
    {
      guideSubscriptionsSectionRenderer: {
        items: [...items, { guideCollapsibleEntryRenderer: { expandableItems: more } }],
      },
    },
  ],
});

describe('newContentKeys (YouTube guide data)', () => {
  it('returns the subscriptions YouTube marks as having new videos, including under "Show more"', () => {
    const r = newContentKeys(guide([entry(1, true), entry(2, false), viewModel(3, true)], [entry(4, true), entry(5, false)]));
    expect(r.found).toBe(true);
    expect(r.keys.sort()).toEqual([id(1), id(3), id(4)]);
  });

  it('ignores entries outside the subscriptions section', () => {
    expect(newContentKeys(guide([entry(1, false)])).keys).not.toContain(id(99));
  });

  it('reports found=false for data without a subscriptions section, so dots are left alone', () => {
    expect(newContentKeys({ contents: { twoColumnBrowseResultsRenderer: {} } })).toEqual({ found: false, keys: [] });
  });

  it('reports found=true with no keys when nothing is new (clears the dots)', () => {
    expect(newContentKeys(guide([entry(1, false)]))).toEqual({ found: true, keys: [] });
  });

  it('falls back to the handle when an entry has no channel ID', () => {
    const noId = { guideEntryRenderer: { presentationStyle: NEW, navigationEndpoint: { browseEndpoint: { browseId: 'FEwhatever', canonicalBaseUrl: '/@SomeOne' } } } };
    expect(newContentKeys(guide([noId])).keys).toEqual(['@someone']);
  });
});

describe('NewUploads (content-script store)', () => {
  let changes = 0;
  let seq = 1000;
  beforeEach(() => {
    changes = 0;
    NewUploads.onChange(() => changes++);
    NewUploads.apply(++seq, []);
    changes = 0;
  });

  it('matches channels by ID or handle', () => {
    NewUploads.apply(++seq, [id(1), '@Chan2']);
    expect(changes).toBe(1);
    expect(NewUploads.has({ ucId: id(1), handle: '' })).toBe(true);
    expect(NewUploads.has({ ucId: id(2), handle: '@chan2' })).toBe(true);
    expect(NewUploads.has({ ucId: id(3), handle: '@chan3' })).toBe(false);
  });

  it('applies each snapshot once, so a resend does not relight a cleared dot', () => {
    const s = ++seq;
    NewUploads.apply(s, [id(1)]);
    NewUploads.clear({ ucId: id(1), handle: '' });
    expect(NewUploads.apply(s, [id(1)])).toBe(false);
    expect(NewUploads.has({ ucId: id(1), handle: '' })).toBe(false);
  });

  it('clears the channel the user navigates to', () => {
    NewUploads.apply(++seq, [id(1), id(2)]);
    const channels = { [id(2)]: { ucId: id(2), title: 'Two', handle: '@chan2', url: '', avatarUrl: '', discoveredAt: 0 } };
    NewUploads.clearForPath('/@Chan2/videos', channels);
    NewUploads.clearForPath(`/channel/${id(1)}`, channels);
    expect(NewUploads.isEmpty).toBe(true);
  });

  it('tells every listener (sidebar and feed chips)', () => {
    let other = 0;
    NewUploads.onChange(() => other++);
    NewUploads.apply(++seq, [id(7)]);
    expect(changes).toBeGreaterThan(0);
    expect(other).toBe(1);
  });

  it('rejects malformed messages', () => {
    expect(NewUploads.apply('1', [id(1)])).toBe(false);
    expect(NewUploads.apply(++seq, 'nope')).toBe(false);
    NewUploads.apply(++seq, [42, null, id(5)]);
    expect(NewUploads.has({ ucId: id(5), handle: '' })).toBe(true);
  });
});
