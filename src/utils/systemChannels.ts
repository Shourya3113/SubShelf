/**
 * src/utils/systemChannels.ts
 *
 * Centralized registry and detector for YouTube's built-in feed curators,
 * explore topic channels, system navigation destinations, and non-subscription links.
 */

export const SYSTEM_BROWSE_IDS = new Set([
  'UCOpNcN46UbXVtpKMrmU4Abg', // Gaming
  'UC-9-kyTW8ZkZNDHQJ6FgpwQ', // Music
  'UCEgdi0XIXXZ-qJOFPf4JSKw', // Sports
  'UCYfdidRxbB8Qhf0Nx7ioOYw', // News
  'UClgRkhTL3_hImCAmdLfDE4g', // Movies & TV / Movies & Shows
  'UC1x8rV_f-2yPpzlN0JWZXIQ', // Fashion & Beauty
  'UCtFRv9O2AHqOZjjynzrv-xg', // Learning
  'UC4R8DWoMoI7CAwX8_bqQ5yQ', // Live
  'UClzC1VT7QCk7ap1sLWKG_Xg', // Podcasts
  'UCq-Fj5jknLsUf-MWSy4_brA', // Trending
  'UCBR8-60-lk78Kz5fFVvf6JA', // Official YouTube
]);

export const SYSTEM_TITLES = new Set([
  'gaming',
  'music',
  'sports',
  'news',
  'movies',
  'movies & tv',
  'movies & shows',
  'movies and tv',
  'movies and shows',
  'live',
  'fashion & beauty',
  'fashion and beauty',
  'learning',
  'podcasts',
  'trending',
  'shopping',
  'browse channels',
  'show more',
  'show fewer',
  'your videos',
  'history',
  'playlists',
  'watch later',
  'liked videos',
  'your clips',
  'courses',
  'youtube premium',
  'youtube music',
  'youtube kids',
  'youtube tv',
  'youtube studio',
  'send feedback',
  'help',
  'settings',
  'report history',
  'explore',
  'subscriptions',
  'home',
  'shorts',
  'you',
]);

export const SYSTEM_HANDLES = new Set([
  'gaming',
  'music',
  'sports',
  'news',
  'movies',
  'podcasts',
  'fashion',
  'live',
  'trending',
  'shopping',
  'learning',
  'youtube',
  'youtubegaming',
  'youtubemusic',
  'youtubekids',
  'youtubepremium',
]);

export interface ChannelIdentityCandidate {
  ucId?: string | null;
  title?: string | null;
  handle?: string | null;
  url?: string | null;
}

/**
 * Returns true if the candidate channel matches any known YouTube system topic,
 * feed curator, navigation entry, or explore section link.
 */
export function isSystemChannelOrCurator(channel: ChannelIdentityCandidate | null | undefined): boolean {
  if (!channel || typeof channel !== 'object') return false;

  const { ucId, title, handle, url } = channel;

  // 1. Check UC ID / Browse ID
  if (ucId && typeof ucId === 'string') {
    const cleanId = ucId.trim();
    if (SYSTEM_BROWSE_IDS.has(cleanId)) return true;
    if (cleanId.startsWith('FE') || cleanId.startsWith('VL')) return true;
  }

  // 2. Check Channel Title
  if (title && typeof title === 'string') {
    const cleanTitle = title.toLowerCase().trim();
    if (SYSTEM_TITLES.has(cleanTitle)) return true;
    if (/^youtube\s+(gaming|music|sports|news|movies|live|kids|tv|premium|studio)/i.test(cleanTitle)) {
      return true;
    }
  }

  // 3. Check Channel Handle
  if (handle && typeof handle === 'string') {
    const cleanHandle = handle.toLowerCase().replace(/^[\/@]+/, '').trim();
    if (SYSTEM_HANDLES.has(cleanHandle)) return true;
    if (SYSTEM_TITLES.has(cleanHandle)) return true;
  }

  // 4. Check URL
  if (url && typeof url === 'string') {
    const cleanUrl = url.toLowerCase().trim();
    // System feed and playlist paths
    if (cleanUrl.includes('/feed/') || cleanUrl.includes('/playlist')) return true;

    // Direct vanity system paths
    const urlPath = cleanUrl.replace(/^https?:\/\/[^/]+/, '');
    const cleanPath = urlPath.replace(/^\/+/, '').split(/[?#]/)[0];
    if (SYSTEM_HANDLES.has(cleanPath) || SYSTEM_TITLES.has(cleanPath)) {
      return true;
    }

    // Known browse IDs in URL
    for (const sysId of SYSTEM_BROWSE_IDS) {
      if (cleanUrl.includes(sysId.toLowerCase())) return true;
    }
  }

  return false;
}
