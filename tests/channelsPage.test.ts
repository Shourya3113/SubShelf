import { describe, it, expect, afterEach, vi } from 'vitest';
import { harvestFromChannelsPage, parseChannelsPage } from '@/utils/avatarHarvest';
import { hashAccountId } from '@/utils/account';

const renderer = (n: number) => ({
  channelRenderer: {
    channelId: `UC${String(n).padStart(22, '0')}`,
    title: { simpleText: `Channel ${n}` },
    navigationEndpoint: { browseEndpoint: { canonicalBaseUrl: `/@channel${n}` } },
    thumbnail: { thumbnails: [{ url: `//yt3.ggpht.com/avatar${n}=s88-c-k` }] },
    descriptionSnippet: { runs: [{ text: `About channel ${n}` }] },
  },
});

describe('reading the All subscriptions page for an account', () => {
  afterEach(() => vi.unstubAllGlobals());

  const serve = (accountId: string | null) => {
    const cfg = accountId ? `ytcfg.set({"DATASYNC_ID":"${accountId}","LOGGED_IN":true});` : '';
    const data = JSON.stringify({ contents: { items: [renderer(1)] } });
    vi.stubGlobal('fetch', async () => new Response(`<script>${cfg}</script><script>var ytInitialData = ${data};</script>`));
  };

  it('uses the page when it belongs to this tab\'s account', async () => {
    serve('111||');
    const page = await harvestFromChannelsPage(await hashAccountId('111||'));
    expect(page?.channels).toHaveLength(1);
  });

  it('ignores the page when the browser has moved to another account', async () => {
    serve('222||');
    expect(await harvestFromChannelsPage(await hashAccountId('111||'))).toBeNull();
  });

  it('ignores a page that does not say whose it is', async () => {
    serve(null);
    expect(await harvestFromChannelsPage(await hashAccountId('111||'))).toBeNull();
  });

  it('ignores the page while the tab has no account', async () => {
    serve('111||');
    expect(await harvestFromChannelsPage(null)).toBeNull();
  });
});

describe('YouTube All subscriptions page', () => {
  it('reads every listed channel and marks the list complete when there is no "load more"', () => {
    const page = parseChannelsPage({ contents: { items: [renderer(1), renderer(2), renderer(3)] } });
    expect(page.complete).toBe(true);
    expect(page.channels.map(c => c.ucId)).toEqual([1, 2, 3].map(n => `UC${String(n).padStart(22, '0')}`));
    expect(page.channels[0]).toMatchObject({ title: 'Channel 1', handle: '@channel1', url: 'https://www.youtube.com/@channel1' });
    expect(page.channels[0].avatarUrl).toMatch(/^https:\/\/yt3\.ggpht\.com\//);
  });

  it('is not complete when YouTube would load more channels', () => {
    const page = parseChannelsPage({ contents: { items: [renderer(1), { continuationItemRenderer: { trigger: 'CONTINUATION_TRIGGER_ON_ITEM_SHOWN' } }] } });
    expect(page.channels).toHaveLength(1);
    expect(page.complete).toBe(false);
  });

  it('is never complete when it found no channels (logged out, layout change)', () => {
    expect(parseChannelsPage({ contents: {} }).complete).toBe(false);
  });
});
