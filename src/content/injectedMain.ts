import { isSystemChannelOrCurator } from '@/utils/systemChannels';

(() => {
  const avatars: Record<string, string> = {};
  const channels: Record<string, { ucId: string; title: string; handle: string; url: string; avatarUrl: string }> = {};
  const MAX_DEPTH = 35;
  const scanned = new WeakSet<object>();
  let dirty = false;

  const pick = (e: any): string | null => {
    if (!e) return null;
    const t = e.thumbnails || e;
    if (Array.isArray(t) && t.length) {
      const l = t[t.length - 1];
      if (l?.url) return l.url;
    }
    const s = e.sources || e.image?.sources;
    if (Array.isArray(s) && s.length) {
      const l = s[s.length - 1];
      if (l?.url) return l.url;
    }
    return null;
  };

  const norm = (u: string): string => {
    let x = u;
    if (x.startsWith('//')) x = 'https:' + x;
    if (x.startsWith('data:image')) return '';
    return x.replace(/=s\d+(-c-k)?/, '=s88$1');
  };

  const put = (key: string | undefined | null, url: string) => {
    const k = key?.trim();
    if (k && avatars[k] !== url) {
      avatars[k] = url;
      dirty = true;
    }
  };

  const addChannel = (id?: string, canonical?: string, title?: string, rawUrl?: string | null) => {
    if (!id && !canonical) return;
    const cleanTitle = (title || '').trim();
    if (!cleanTitle) return;

    const browseId = id?.startsWith('UC') ? id : null;
    const canon = canonical?.includes('@') ? canonical : null;
    const isChannel = Boolean(browseId || canon);
    if (!isChannel) return;

    const handle = canon
      ? (canon.startsWith('@') ? canon.toLowerCase() : `@${canon.replace(/^[\/@]+/, '').toLowerCase()}`)
      : (browseId ? `@${browseId}` : `@${id}`);
    const key = browseId || handle;

    // Exclude YouTube built-in feed curators and system topics (Gaming, Music, Sports, etc.)
    if (isSystemChannelOrCurator({ ucId: key, title: cleanTitle, handle, url: canonical })) {
      return;
    }

    if (browseId && channels[handle]) {
      delete channels[handle];
      dirty = true;
    }

    if (!channels[key]) {
      const url = rawUrl ? norm(rawUrl) : '';
      channels[key] = {
        ucId: key,
        title: cleanTitle,
        handle,
        url: canon ? `https://www.youtube.com/${canon.replace(/^\/+/, '')}` : `https://www.youtube.com/channel/${key}`,
        avatarUrl: url || '',
      };
      dirty = true;
    }
  };

  const index = (id?: string, canonical?: string, title?: string, rawUrl?: string | null) => {
    if (!rawUrl) return;
    const url = norm(rawUrl);
    if (!url) return;
    if (id) put(id, url);
    if (canonical) {
      const h = canonical.replace(/^[\/@]+/, '').toLowerCase();
      put(h, url);
      put('@' + h, url);
    }
    if (title) put(title.toLowerCase().trim(), url);
  };

  const walk = (n: any, depth = 0) => {
    if (!n || typeof n !== 'object' || depth > MAX_DEPTH) return;

    // 1. YouTube classic guideEntryRenderer
    const g = n.guideEntryRenderer;
    if (g) {
      const be = g.navigationEndpoint?.browseEndpoint;
      const t =
        typeof g.title === 'string'
          ? g.title
          : g.title?.runs?.[0]?.text || g.title?.simpleText || g.formattedTitle?.simpleText;
      const thumb = pick(g.thumbnail);
      index(be?.browseId, be?.canonicalBaseUrl, t, thumb);
      addChannel(be?.browseId, be?.canonicalBaseUrl, t, thumb);
    }

    // 2. YouTube modern guideEntryViewModel (2024–2026 UI)
    const v = n.guideEntryViewModel;
    if (v) {
      const be = v.rendererContext?.commandContext?.onTap?.innertubeCommand?.browseEndpoint;
      const t = v.title?.content || v.formattedTitle?.content;
      const thumb = pick(v.thumbnail);
      index(be?.browseId, be?.canonicalBaseUrl, t, thumb);
      addChannel(be?.browseId, be?.canonicalBaseUrl, t, thumb);
    }

    // 3. channelRenderer, compactChannelRenderer, gridChannelRenderer
    const c = n.channelRenderer || n.compactChannelRenderer || n.gridChannelRenderer;
    if (c) {
      const t = c.title?.simpleText || c.title?.runs?.[0]?.text;
      const thumb = pick(c.thumbnail);
      index(c.channelId, c.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl, t, thumb);
      addChannel(c.channelId, c.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl, t, thumb);
    }

    for (const k in n) {
      if (Object.prototype.hasOwnProperty.call(n, k)) {
        walk(n[k], depth + 1);
      }
    }
  };

  const broadcast = (force = false) => {
    if (!force && !dirty) return;
    dirty = false;
    if (Object.keys(avatars).length > 0) {
      const snapshot = { ...avatars };
      try {
        document.dispatchEvent(new CustomEvent('subshelf-avatars-broadcast', { detail: snapshot }));
      } catch {}
      try {
        window.postMessage({ type: 'SUBSHELF_AVATARS_BROADCAST', avatars: snapshot }, location.origin);
      } catch {}
    }
    if (Object.keys(channels).length > 0) {
      const channelList = Object.values(channels);
      try {
        document.dispatchEvent(new CustomEvent('subshelf-channels-broadcast', { detail: channelList }));
      } catch {}
      try {
        window.postMessage({ type: 'SUBSHELF_CHANNELS_BROADCAST', channels: channelList }, location.origin);
      } catch {}
    }
  };

  const ingest = (data: any) => {
    if (!data || typeof data !== 'object' || scanned.has(data)) return;
    scanned.add(data);
    walk(data);
    broadcast();
  };

  const scanInitial = () => {
    try {
      const guide = (window as any).ytInitialGuideData;
      if (guide) ingest(guide);
      const initial = (window as any).ytInitialData || (window as any).ytcfg?.get?.('INITIAL_DATA');
      if (initial) ingest(initial);
    } catch {}
  };

  // Hook ytInitialGuideData & ytInitialData assignment in window
  try {
    let curGuide = (window as any).ytInitialGuideData;
    Object.defineProperty(window, 'ytInitialGuideData', {
      configurable: true,
      enumerable: true,
      get() {
        return curGuide;
      },
      set(v) {
        curGuide = v;
        if (v) ingest(v);
      },
    });

    let curData = (window as any).ytInitialData;
    Object.defineProperty(window, 'ytInitialData', {
      configurable: true,
      enumerable: true,
      get() {
        return curData;
      },
      set(v) {
        curData = v;
        if (v) ingest(v);
      },
    });
  } catch {}

  // Observe guide/browse InnerTube network responses
  try {
    const orig = window.fetch;
    window.fetch = function (this: any, ...args: Parameters<typeof fetch>) {
      const p = Reflect.apply(orig, this, args) as Promise<Response>;
      try {
        const a0: any = args[0];
        const url: string = typeof a0 === 'string' ? a0 : a0?.url || a0?.href || '';
        if (url.includes('/youtubei/v1/guide') || url.includes('/youtubei/v1/browse')) {
          p.then(r => r.clone().json()).then(ingest).catch(() => {});
        }
      } catch {}
      return p;
    } as typeof fetch;
  } catch {}

  // Content script asks for a resend
  document.addEventListener('subshelf-request-avatars', () => {
    scanInitial();
    broadcast(true);
  });
  window.addEventListener('message', (e) => {
    if (e.source !== window || e.data?.type !== 'SUBSHELF_REQUEST_AVATARS') return;
    scanInitial();
    broadcast(true);
  });

  document.addEventListener('yt-navigate-finish', scanInitial);
  document.addEventListener('yt-page-data-updated', scanInitial);
  scanInitial();
  setTimeout(scanInitial, 1500);
})();
