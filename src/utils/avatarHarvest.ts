import { safeAvatarUrl } from './avatarUrl';

/** Reads avatars straight from YouTube's native sidebar entries (visible or expanded). */
export function harvestAvatarsFromDom(): Map<string, string> {
  const out = new Map<string, string>();
  document.querySelectorAll<HTMLAnchorElement>('ytd-guide-entry-renderer a[href], yt-guide-entry-view-model a[href]').forEach(a => {
    const href = a.getAttribute('href') || '';
    const m = href.match(/\/@([^/?#]+)|\/channel\/(UC[\w-]{22})/);
    if (!m) return;
    const img = a.querySelector<HTMLImageElement>('yt-img-shadow img, yt-avatar-shape img, yt-avatar-view-model img, img');
    if (!img) return;
    let src = img.currentSrc || img.getAttribute('src') || (img as any).dataset?.src || img.getAttribute('data-thumb') || '';
    if (src.startsWith('//')) src = 'https:' + src;
    const safe = safeAvatarUrl(src);                       // also rejects data: placeholders
    if (!safe) return;
    const url = safe.replace(/=s\d+(-c-k)?/, '=s88$1');
    if (m[1]) {
      const h = m[1].toLowerCase();
      out.set('@' + h, url);
      out.set(h, url);
    }
    if (m[2]) out.set(m[2], url);
    const title = (a.getAttribute('title') || '').toLowerCase().trim();
    if (title) out.set(title, url);
  });
  return out;
}

/** Same-origin fetch of /feed/channels as an independent source (covers the first batch of subscriptions). */
export async function harvestFromChannelsPage(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  try {
    const res = await fetch('/feed/channels', { credentials: 'same-origin' });
    if (!res.ok) return out;
    const html = await res.text();
    const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
    if (!m) return out;
    const data = JSON.parse(m[1]);
    const walk = (n: any, depth = 0) => {
      if (!n || typeof n !== 'object' || depth > 40) return;
      const r = n.channelRenderer || n.gridChannelRenderer || n.compactChannelRenderer;
      if (r) {
        const thumbs = r.thumbnail?.thumbnails;
        const raw = Array.isArray(thumbs) && thumbs.length ? thumbs[thumbs.length - 1].url : '';
        const url = safeAvatarUrl(raw?.startsWith('//') ? 'https:' + raw : raw);
        if (url) {
          const clean = url.replace(/=s\d+(-c-k)?/, '=s88$1');
          if (r.channelId) out.set(r.channelId, clean);
          const base = r.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl as string | undefined;
          if (base) {
            const h = base.replace(/^[/@]+/, '').toLowerCase();
            out.set(h, clean);
            out.set('@' + h, clean);
          }
          const t = (r.title?.simpleText || r.title?.runs?.[0]?.text || '').toLowerCase().trim();
          if (t) out.set(t, clean);
        }
      }
      for (const k in n) {
        if (Object.prototype.hasOwnProperty.call(n, k)) walk(n[k], depth + 1);
      }
    };
    walk(data);
  } catch { /* offline or layout change: ignore */ }
  return out;
}
