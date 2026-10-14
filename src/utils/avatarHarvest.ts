import { bareHandle, isChannelId, normalizeHandle } from './channelIdentity';
import { safeAvatarUrl } from './avatarUrl';
import { cleanDescription } from './channelDetails';
import { SubscribedChannel } from '@/types';

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
      const h = bareHandle(m[1]);
      out.set('@' + h, url);
      out.set(h, url);
    }
    if (m[2]) out.set(m[2], url);
    const title = (a.getAttribute('title') || '').toLowerCase().trim();
    if (title) out.set(title, url);
  });
  return out;
}

export interface ChannelsPageData {
  /** Avatar URLs keyed by UC ID, handle ("name" and "@name") and lowercase title. */
  avatars: Map<string, string>;
  /** Cleaned descriptions keyed by UC ID (or "@handle" when YouTube gave no ID); "" when the channel has none. */
  descriptions: Map<string, string>;
  /** Every subscribed channel the page listed (with a UC ID). */
  channels: SubscribedChannel[];
  /** True when the page listed everything at once (no "load more"), so `channels` is the full list. */
  complete: boolean;
}

/** Plain text of a YouTube text node ({ simpleText } or { runs: [{ text }] }). */
const textOf = (node: any): string =>
  typeof node?.simpleText === 'string'
    ? node.simpleText
    : Array.isArray(node?.runs) ? node.runs.map((r: any) => (typeof r?.text === 'string' ? r.text : '')).join('') : '';

/** Pulls avatars and descriptions out of the All subscriptions page's ytInitialData. Pure. */
export function parseChannelsPage(data: unknown): ChannelsPageData {
  const avatars = new Map<string, string>();
  const descriptions = new Map<string, string>();
  const channels = new Map<string, SubscribedChannel>();
  let hasMore = false;
  const walk = (n: any, depth = 0) => {
    if (!n || typeof n !== 'object' || depth > 40) return;
    if (n.continuationItemRenderer) hasMore = true;
    const r = n.channelRenderer || n.gridChannelRenderer || n.compactChannelRenderer;
    if (r) {
      const base = r.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl as string | undefined;
      const handle = typeof base === 'string' && base.startsWith('/@') ? normalizeHandle(base) : '';

      const thumbs = r.thumbnail?.thumbnails;
      const raw = Array.isArray(thumbs) && thumbs.length ? thumbs[thumbs.length - 1].url : '';
      const url = safeAvatarUrl(raw?.startsWith('//') ? 'https:' + raw : raw);
      if (url) {
        const clean = url.replace(/=s\d+(-c-k)?/, '=s88$1');
        if (r.channelId) avatars.set(r.channelId, clean);
        if (base) {
          const h = bareHandle(base);
          avatars.set(h, clean);
          avatars.set('@' + h, clean);
        }
        const t = (r.title?.simpleText || r.title?.runs?.[0]?.text || '').toLowerCase().trim();
        if (t) avatars.set(t, clean);
      }

      const key = isChannelId(r.channelId) ? r.channelId : handle;
      const desc = cleanDescription(textOf(r.descriptionSnippet));
      if (key && desc !== undefined) descriptions.set(key, desc);

      const title = textOf(r.title).trim();
      if (isChannelId(r.channelId) && title && !channels.has(r.channelId)) {
        channels.set(r.channelId, {
          ucId: r.channelId,
          title,
          handle: handle || `@${r.channelId}`,
          url: handle ? `https://www.youtube.com/${handle}` : `https://www.youtube.com/channel/${r.channelId}`,
          avatarUrl: url || '',
          discoveredAt: Date.now(),
        });
      }
    }
    for (const k in n) {
      if (Object.prototype.hasOwnProperty.call(n, k)) walk(n[k], depth + 1);
    }
  };
  walk(data);
  return { avatars, descriptions, channels: [...channels.values()], complete: !hasMore && channels.size > 0 };
}

/**
 * Same-origin fetch of /feed/channels (YouTube's All subscriptions page), which lists the user's
 * subscriptions with avatars and short descriptions. Later pages would need YouTube's signed API
 * headers, so only this first page is read. Returns null when the page can't be read.
 */
export async function harvestFromChannelsPage(): Promise<ChannelsPageData | null> {
  try {
    const res = await fetch('/feed/channels', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
    if (!m) return null;
    return parseChannelsPage(JSON.parse(m[1]));
  } catch {
    return null; // offline or layout change
  }
}
