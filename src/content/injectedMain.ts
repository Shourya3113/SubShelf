// Runs in YouTube's MAIN execution world with direct access to window.ytInitialData,
// window.ytcfg, and YouTube's internal JSON response payloads.

(function () {
  const globalAvatars: Record<string, string> = {};

  function extractThumbUrl(thumbsOrImage: any): string | null {
    if (!thumbsOrImage) return null;
    // Format 1: { thumbnails: [ { url } ] }
    const thumbs = thumbsOrImage.thumbnails || thumbsOrImage;
    if (Array.isArray(thumbs) && thumbs.length > 0) {
      const last = thumbs[thumbs.length - 1];
      if (last?.url) return last.url;
    }
    // Format 2: { sources: [ { url } ] } or { image: { sources: [ { url } ] } }
    const sources = thumbsOrImage.sources || thumbsOrImage.image?.sources;
    if (Array.isArray(sources) && sources.length > 0) {
      const last = sources[sources.length - 1];
      if (last?.url) return last.url;
    }
    return null;
  }

  function makeCrispUrl(rawUrl: string): string {
    let url = rawUrl;
    if (url.startsWith('//')) url = 'https:' + url;
    if (url.startsWith('data:image')) return '';
    // Upgrade to sharp 88x88 avatar for Retina displays
    return url.replace(/=s\d+(-c-k)?/, '=s88$1');
  }

  function storeAvatar(key: string | undefined | null, url: string) {
    if (!key || !url) return;
    const clean = key.trim();
    if (!clean) return;
    globalAvatars[clean] = url;
  }

  function traverseAndCollect(obj: any) {
    if (!obj || typeof obj !== 'object') return;

    // 1. YouTube classic guideEntryRenderer
    if (obj.guideEntryRenderer) {
      const ger = obj.guideEntryRenderer;
      const ucId = ger.navigationEndpoint?.browseEndpoint?.browseId;
      const handle = ger.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl;
      const rawUrl = extractThumbUrl(ger.thumbnail);
      if (rawUrl) {
        const crisp = makeCrispUrl(rawUrl);
        if (crisp) {
          if (ucId) storeAvatar(ucId, crisp);
          if (handle) {
            const hClean = handle.replace(/^[\/@]+/, '').toLowerCase();
            storeAvatar(hClean, crisp);
            storeAvatar('@' + hClean, crisp);
          }
          const title =
            typeof ger.title === 'string'
              ? ger.title
              : (ger.title?.runs?.[0]?.text || ger.title?.simpleText || ger.formattedTitle?.simpleText);
          if (title) storeAvatar(title.toLowerCase().trim(), crisp);
        }
      }
    }

    // 2. YouTube modern guideEntryViewModel (2024–2026 UI)
    if (obj.guideEntryViewModel) {
      const vm = obj.guideEntryViewModel;
      const browseEp = vm.rendererContext?.commandContext?.onTap?.innertubeCommand?.browseEndpoint;
      const ucId = browseEp?.browseId;
      const handle = browseEp?.canonicalBaseUrl;
      const rawUrl = extractThumbUrl(vm.thumbnail);
      if (rawUrl) {
        const crisp = makeCrispUrl(rawUrl);
        if (crisp) {
          if (ucId) storeAvatar(ucId, crisp);
          if (handle) {
            const hClean = handle.replace(/^[\/@]+/, '').toLowerCase();
            storeAvatar(hClean, crisp);
            storeAvatar('@' + hClean, crisp);
          }
          const title = vm.title?.content || vm.formattedTitle?.content;
          if (title) storeAvatar(title.toLowerCase().trim(), crisp);
        }
      }
    }

    // 3. channelRenderer, compactChannelRenderer, gridChannelRenderer
    if (obj.channelRenderer || obj.compactChannelRenderer || obj.gridChannelRenderer) {
      const cr = obj.channelRenderer || obj.compactChannelRenderer || obj.gridChannelRenderer;
      const ucId = cr.channelId;
      const handle = cr.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl;
      const rawUrl = extractThumbUrl(cr.thumbnail);
      if (rawUrl) {
        const crisp = makeCrispUrl(rawUrl);
        if (crisp) {
          if (ucId) storeAvatar(ucId, crisp);
          if (handle) {
            const hClean = handle.replace(/^[\/@]+/, '').toLowerCase();
            storeAvatar(hClean, crisp);
            storeAvatar('@' + hClean, crisp);
          }
          const title = cr.title?.simpleText || cr.title?.runs?.[0]?.text;
          if (title) storeAvatar(title.toLowerCase().trim(), crisp);
        }
      }
    }

    // Recurse child properties
    for (const key of Object.keys(obj)) {
      traverseAndCollect(obj[key]);
    }
  }

  function broadcastAvatars() {
    if (Object.keys(globalAvatars).length === 0) return;

    try {
      document.dispatchEvent(
        new CustomEvent('subshelf-avatars-broadcast', {
          detail: globalAvatars,
        })
      );
    } catch {}

    try {
      window.postMessage(
        {
          type: 'SUBSHELF_AVATARS_BROADCAST',
          avatars: globalAvatars,
        },
        '*'
      );
    } catch {}
  }

  function processData(data: any) {
    if (!data) return;
    const countBefore = Object.keys(globalAvatars).length;
    traverseAndCollect(data);
    const countAfter = Object.keys(globalAvatars).length;
    if (countAfter > countBefore || countAfter > 0) {
      broadcastAvatars();
    }
  }

  function extractFromWindow() {
    try {
      const data =
        (window as any).ytInitialData || (window as any).ytcfg?.get?.('INITIAL_DATA');
      if (data) {
        processData(data);
      }
    } catch {}
  }

  // 1. Intercept window.ytInitialData assignment via property descriptor
  try {
    let _ytInitialData = (window as any).ytInitialData;
    Object.defineProperty(window, 'ytInitialData', {
      configurable: true,
      enumerable: true,
      get() {
        return _ytInitialData;
      },
      set(val) {
        _ytInitialData = val;
        if (val) {
          processData(val);
        }
      },
    });
  } catch {}

  // 2. Intercept window.fetch for YouTube InnerTube browse/guide responses
  try {
    const origFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await origFetch.apply(this, args);
      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
        if (url.includes('/youtubei/v1/guide') || url.includes('/youtubei/v1/browse')) {
          response
            .clone()
            .json()
            .then(json => {
              if (json) processData(json);
            })
            .catch(() => {});
        }
      } catch {}
      return response;
    };
  } catch {}

  // 3. Listen for on-demand avatar requests from the isolated content script
  document.addEventListener('subshelf-request-avatars', () => {
    extractFromWindow();
    broadcastAvatars();
  });

  window.addEventListener('message', e => {
    if (e.data?.type === 'SUBSHELF_REQUEST_AVATARS') {
      extractFromWindow();
      broadcastAvatars();
    }
  });

  // 4. Initial extraction & lifecycle listeners
  extractFromWindow();
  window.addEventListener('load', extractFromWindow);
  document.addEventListener('yt-navigate-finish', extractFromWindow);
  document.addEventListener('yt-page-data-updated', extractFromWindow);
  document.addEventListener('DOMContentLoaded', extractFromWindow);

  // Staggered checks for lazy hydration
  setTimeout(extractFromWindow, 200);
  setTimeout(extractFromWindow, 800);
  setTimeout(extractFromWindow, 2000);
  setTimeout(extractFromWindow, 4500);
})();
