import { YT_SELECTORS, getSubscriptionSection } from '@/config/selectors';
import { IdNormalizer } from '@/utils/idNormalizer';
import { SubscribedChannel } from '@/types';
import { isValidYouTubeAvatarUrl } from '@/utils/validators';
import { Logger } from '@/utils/logger';

// YouTube navigation items and system topics to exclude
const SYSTEM_NAMES = new Set([
  'your videos',
  'history',
  'playlists',
  'watch later',
  'liked videos',
  'your clips',
  'shopping',
  'music',
  'movies',
  'live',
  'gaming',
  'news',
  'sports',
  'learning',
  'podcasts',
  'browse channels',
  'show more',
  'show fewer',
  'report history',
  'help',
  'send feedback',
]);

export class ChannelExtractor {
  private static hasAttemptedExpand = false;

  /**
   * Checks whether YouTube's native subscription list is fully expanded (all subscriptions rendered in DOM).
   * Returns true if there is no collapsible expander (user has few channels) or if the expander is in expanded state.
   */
  static isSidebarFullyExpanded(): boolean {
    const subSection = getSubscriptionSection();
    if (!subSection) return false;

    const collapsible = subSection.querySelector<HTMLElement>('ytd-guide-collapsible-entry-renderer, #expander-item');
    if (!collapsible) {
      // If there's no collapsible expander item, all channels are visible in DOM
      return true;
    }

    return (
      collapsible.hasAttribute('expanded') ||
      collapsible.classList.contains('expanded') ||
      collapsible.getAttribute('aria-expanded') === 'true'
    );
  }

  /**
   * Safely expands YouTube's native collapsed "Show more" subscription section.
   * STRICT SAFEGUARD: Never clicks any link that has an href to prevent navigation loops.
   */
  static autoExpandNativeSubscriptions(force = false): boolean {
    if (this.hasAttemptedExpand && !force) return false;

    const subSection = getSubscriptionSection();
    if (!subSection) return false;

    // Look specifically for the collapsible container
    const collapsible = subSection.querySelector<HTMLElement>(
      'ytd-guide-collapsible-entry-renderer, #expander-item, ytd-guide-collapsible-section-entry-renderer, yt-guide-entry-view-model#expander-item'
    );
    if (!collapsible) return false;

    // Check if already expanded
    const isExpanded =
      collapsible.hasAttribute('expanded') ||
      collapsible.classList.contains('expanded') ||
      collapsible.getAttribute('aria-expanded') === 'true';

    if (isExpanded) {
      this.hasAttemptedExpand = true;
      return false;
    }

    // Safety: Verify it's an expander, NOT a page link (like /feed/subscriptions or /feed/channels)
    const anchor = collapsible.querySelector('a');
    if (anchor) {
      const href = anchor.getAttribute('href') || '';
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        // This is a navigation link! NEVER click it.
        return false;
      }
    }

    // Find the toggle button
    const toggleBtn = collapsible.querySelector<HTMLElement>(
      'tp-yt-paper-button, #button, #endpoint, yt-formatted-string, button, [role="button"], a'
    );
    if (!toggleBtn) return false;

    // Double check toggleBtn is not inside a navigation link
    const parentA = toggleBtn.closest('a[href]');
    if (parentA) {
      const href = parentA.getAttribute('href') || '';
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        return false;
      }
    }

    // Snapshot scroll positions of all scrollable containers in the hierarchy
    const scrollSnapshots: Array<{ el: HTMLElement; top: number; left: number }> = [];
    let curr: HTMLElement | null = toggleBtn.parentElement;
    while (curr) {
      scrollSnapshots.push({ el: curr, top: curr.scrollTop, left: curr.scrollLeft });
      curr = curr.parentElement;
    }
    const guideInner = document.querySelector<HTMLElement>('#guide-inner-content');
    if (guideInner && !scrollSnapshots.some(s => s.el === guideInner)) {
      scrollSnapshots.push({ el: guideInner, top: guideInner.scrollTop, left: guideInner.scrollLeft });
    }
    const winScrollY = window.scrollY;
    const winScrollX = window.scrollX;

    const restoreScroll = () => {
      for (const snap of scrollSnapshots) {
        if (snap.el.scrollTop !== snap.top) {
          snap.el.scrollTop = snap.top;
        }
        if (snap.el.scrollLeft !== snap.left) {
          snap.el.scrollLeft = snap.left;
        }
      }
      if (window.scrollY !== winScrollY || window.scrollX !== winScrollX) {
        window.scrollTo(winScrollX, winScrollY);
      }
    };

    const activeEl = document.activeElement as HTMLElement | null;

    this.hasAttemptedExpand = true;
    try {
      toggleBtn.click();

      // Ensure toggle button does not retain focus causing browser to scroll
      if (document.activeElement === toggleBtn || toggleBtn.contains(document.activeElement)) {
        if (activeEl && typeof activeEl.focus === 'function' && activeEl !== toggleBtn) {
          activeEl.focus({ preventScroll: true });
        } else if (typeof toggleBtn.blur === 'function') {
          toggleBtn.blur();
        }
      }
      return true;
    } catch {
      return false;
    } finally {
      restoreScroll();

      // Guard against asynchronous scroll jumps during YouTube DOM expansion
      requestAnimationFrame(restoreScroll);
      setTimeout(restoreScroll, 20);
      setTimeout(restoreScroll, 50);
      setTimeout(restoreScroll, 100);
      setTimeout(restoreScroll, 200);
      setTimeout(restoreScroll, 350);
    }
  }

  static scrapeFromSidebar(handleToUcId?: Record<string, string>): SubscribedChannel[] {
    const channels: SubscribedChannel[] = [];
    const subSection = getSubscriptionSection();
    if (!subSection) return channels;

    let entries = Array.from(subSection.querySelectorAll<HTMLElement>(YT_SELECTORS.guideEntry));
    if (entries.length === 0) {
      const channelAnchors = Array.from(subSection.querySelectorAll<HTMLAnchorElement>('a[href*="/@"], a[href*="/channel/"]'));
      entries = channelAnchors.map(a => a.closest<HTMLElement>('ytd-guide-entry-renderer, yt-guide-entry-view-model, tp-yt-paper-item, #items > *') || a);
    }

    const seenIds = new Set<string>();

    entries.forEach(entry => {
      const anchor = (entry.tagName === 'A' ? entry : entry.querySelector('a')) as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href') || '';
      // Skip non-channel links
      if (!href.includes('/@') && !href.includes('/channel/')) return;
      if (href.includes('/feed/') || href.includes('/playlist')) return;

      let { ucId, handle } = IdNormalizer.extractFromAnchor(anchor);
      if (!ucId && !handle) return;

      if (!ucId) {
        const browseAttr = anchor.getAttribute('data-browse-id') || entry.getAttribute('data-browse-id');
        if (browseAttr?.startsWith('UC')) {
          ucId = browseAttr;
        }
      }

      if (!ucId && handle && handleToUcId) {
        const cleanH = handle.toLowerCase();
        const mapped = handleToUcId[cleanH] || handleToUcId['@' + cleanH.replace(/^@/, '')] || handleToUcId[cleanH.replace(/^@/, '')];
        if (mapped?.startsWith('UC')) {
          ucId = mapped;
        }
      }

      const channelKey = ucId || handle || '';
      if (seenIds.has(channelKey) || (handle && seenIds.has(handle.toLowerCase())) || (ucId && seenIds.has(ucId))) {
        return;
      }
      seenIds.add(channelKey);
      if (handle) seenIds.add(handle.toLowerCase());
      if (ucId) seenIds.add(ucId);

      const rawTitle =
        anchor.getAttribute('title') ||
        (entry.querySelector('yt-formatted-string, .yt-core-attributed-string, #guide-entry-title, .title') as HTMLElement)?.innerText?.trim() ||
        (entry.querySelector('#guide-entry-title') as HTMLElement)?.textContent?.trim() ||
        anchor.textContent?.trim() ||
        handle ||
        'Channel';

      const title = rawTitle.trim();
      if (SYSTEM_NAMES.has(title.toLowerCase())) return;

      // Extract real channel avatar directly from sidebar DOM entry
      const imgEl = entry.querySelector('yt-img-shadow img, yt-avatar-shape img, yt-avatar-view-model img, #avatar img, img') as HTMLImageElement | null;
      const ytImgShadow = entry.querySelector('yt-img-shadow') as HTMLElement | null;
      let avatarUrl = '';
      if (imgEl) {
        avatarUrl =
          imgEl.currentSrc ||
          imgEl.src ||
          imgEl.getAttribute('src') ||
          imgEl.getAttribute('data-thumb') ||
          imgEl.getAttribute('data-src') ||
          '';
        if (avatarUrl.startsWith('data:image')) {
          avatarUrl = imgEl.getAttribute('data-thumb') || imgEl.getAttribute('data-src') || '';
        }
      }
      if (!avatarUrl && ytImgShadow) {
        avatarUrl =
          ytImgShadow.getAttribute('data-thumb') ||
          ytImgShadow.getAttribute('data-src') ||
          '';
      }

      if (avatarUrl) {
        if (avatarUrl.startsWith('//')) avatarUrl = 'https:' + avatarUrl;
        if (!avatarUrl.startsWith('data:image') && isValidYouTubeAvatarUrl(avatarUrl)) {
          avatarUrl = avatarUrl.replace(/=s\d+(-c-k)?/, '=s88$1');
        } else {
          avatarUrl = '';
        }
      }

      // Check extracted initial avatars cache as fallback (catches off-screen/unrendered items)
      if (!avatarUrl || avatarUrl.startsWith('data:image')) {
        const avatars = this.getInitialAvatars();
        const cleanHandle = (handle || '').replace(/^[\/@]+/, '').toLowerCase();
        avatarUrl =
          avatars.get(channelKey) ||
          avatars.get(handle || '') ||
          avatars.get(cleanHandle) ||
          avatars.get('@' + cleanHandle) ||
          avatars.get(title.toLowerCase().trim()) ||
          '';
      }

      channels.push({
        ucId: channelKey,
        title,
        handle: handle || `@${channelKey}`,
        url: anchor.href,
        avatarUrl,
        discoveredAt: Date.now(),
      });
    });

    return channels;
  }

  private static initialAvatarsCache = new Map<string, string>();

  /**
   * Merges avatars received externally into the cache.
   */
  static mergeAvatars(recordOrMap: Record<string, string> | Map<string, string>): void {
    if (!recordOrMap) return;
    if (recordOrMap instanceof Map) {
      for (const [k, v] of recordOrMap.entries()) {
        if (isValidYouTubeAvatarUrl(v)) {
          this.initialAvatarsCache.set(k, v);
        }
      }
    } else {
      for (const [k, v] of Object.entries(recordOrMap)) {
        if (isValidYouTubeAvatarUrl(v)) {
          this.initialAvatarsCache.set(k, v);
        }
      }
    }
  }

  /**
   * Returns channel avatars extracted from YouTube's server-rendered JSON payloads.
   * Provides instant, high-resolution avatar URLs for ALL subscribed channels,
   * even if they haven't been scrolled into view in YouTube's native sidebar.
   */
  static getInitialAvatars(): Map<string, string> {
    if (this.initialAvatarsCache.size > 0) {
      return this.initialAvatarsCache;
    }

    const map = this.initialAvatarsCache;

    try {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const text = script.textContent || '';
        if (!text.includes('ytInitialData') && !text.includes('ytInitialGuideData')) continue;

        for (const varName of ['ytInitialGuideData', 'ytInitialData']) {
          const marker = text.indexOf(varName);
          if (marker === -1) continue;

          const equalsIndex = text.indexOf('=', marker);
          if (equalsIndex === -1) continue;

          // Support JSON.parse('...') and direct inline JSON object
          const parseIndex = text.indexOf('JSON.parse(', equalsIndex);
          if (parseIndex !== -1 && parseIndex < equalsIndex + 20) {
            const quoteChar = text[parseIndex + 11];
            if (quoteChar === '\'' || quoteChar === '"') {
              const startQuote = parseIndex + 11;
              let endQuote = -1;
              let escape = false;
              for (let q = startQuote + 1; q < text.length; q++) {
                if (escape) { escape = false; continue; }
                if (text[q] === '\\') { escape = true; continue; }
                if (text[q] === quoteChar) { endQuote = q; break; }
              }
              if (endQuote !== -1) {
                try {
                  const rawEscaped = text.substring(startQuote + 1, endQuote);
                  const unescaped = JSON.parse(`"${rawEscaped.replace(/"/g, '\\"')}"`);
                  const data = JSON.parse(unescaped);
                  this.collectAvatarsFromData(data, map, 0);
                  continue;
                } catch {}
              }
            }
          }

          const braceStart = text.indexOf('{', equalsIndex);
          if (braceStart === -1) continue;

          let depth = 0;
          let inString = false;
          let escape = false;
          let jsonStr = '';

          for (let j = braceStart; j < text.length; j++) {
            const char = text[j];
            if (escape) {
              escape = false;
              continue;
            }
            if (char === '\\') {
              escape = true;
              continue;
            }
            if (char === '"') {
              inString = !inString;
              continue;
            }
            if (!inString) {
              if (char === '{') depth++;
              else if (char === '}') {
                depth--;
                if (depth === 0) {
                  jsonStr = text.substring(braceStart, j + 1);
                  break;
                }
              }
            }
          }

          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              this.collectAvatarsFromData(data, map, 0);
            } catch {}
          }
        }
      }
    } catch (err) {
      Logger.warn('[SubShelf] Error extracting initial avatars from script tags:', err);
    }

    return map;
  }

  private static collectAvatarsFromData(obj: any, map: Map<string, string>, depth = 0): void {
    if (!obj || typeof obj !== 'object' || depth > 20) return;

    const addAvatar = (key: string | undefined | null, rawUrl: string | undefined | null) => {
      if (!key || !rawUrl) return;
      let url = rawUrl;
      if (url.startsWith('//')) url = 'https:' + url;
      if (url.startsWith('data:image')) return;
      if (!isValidYouTubeAvatarUrl(url)) return;
      const crispUrl = url.replace(/=s\d+(-c-k)?/, '=s88$1');
      const cleanKey = key.trim();
      if (cleanKey) map.set(cleanKey, crispUrl);
    };

    const extractThumb = (thumbObj: any): string | null => {
      if (!thumbObj) return null;
      const arr = thumbObj.thumbnails || thumbObj.sources || (Array.isArray(thumbObj) ? thumbObj : null);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr[arr.length - 1]?.url || null;
      }
      return null;
    };

    // 1. guideEntryRenderer
    if (obj.guideEntryRenderer) {
      const ger = obj.guideEntryRenderer;
      const ucId = ger.navigationEndpoint?.browseEndpoint?.browseId;
      const handle = ger.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl;
      const thumbUrl = extractThumb(ger.thumbnail);
      if (thumbUrl) {
        addAvatar(ucId, thumbUrl);
        if (handle) {
          const clean = handle.replace(/^[\/@]+/, '').toLowerCase();
          addAvatar(clean, thumbUrl);
          addAvatar('@' + clean, thumbUrl);
        }
        const title =
          typeof ger.title === 'string'
            ? ger.title
            : (ger.title?.runs?.[0]?.text || ger.title?.simpleText || ger.formattedTitle?.simpleText);
        if (title) addAvatar(title.toLowerCase().trim(), thumbUrl);
      }
    }

    // 2. guideEntryViewModel (modern YouTube Web Components)
    if (obj.guideEntryViewModel) {
      const vm = obj.guideEntryViewModel;
      const browseEp = vm.rendererContext?.commandContext?.onTap?.innertubeCommand?.browseEndpoint;
      const ucId = browseEp?.browseId;
      const handle = browseEp?.canonicalBaseUrl;
      const thumbUrl = extractThumb(vm.thumbnail);
      if (thumbUrl) {
        addAvatar(ucId, thumbUrl);
        if (handle) {
          const clean = handle.replace(/^[\/@]+/, '').toLowerCase();
          addAvatar(clean, thumbUrl);
          addAvatar('@' + clean, thumbUrl);
        }
        const title = vm.title?.content || vm.formattedTitle?.content;
        if (title) addAvatar(title.toLowerCase().trim(), thumbUrl);
      }
    }

    // 3. channelRenderer, compactChannelRenderer, gridChannelRenderer
    if (obj.channelRenderer || obj.compactChannelRenderer || obj.gridChannelRenderer) {
      const cr = obj.channelRenderer || obj.compactChannelRenderer || obj.gridChannelRenderer;
      const ucId = cr.channelId;
      const handle = cr.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl;
      const thumbUrl = extractThumb(cr.thumbnail);
      if (thumbUrl) {
        addAvatar(ucId, thumbUrl);
        if (handle) {
          const clean = handle.replace(/^[\/@]+/, '').toLowerCase();
          addAvatar(clean, thumbUrl);
          addAvatar('@' + clean, thumbUrl);
        }
        const title =
          typeof cr.title === 'string'
            ? cr.title
            : (cr.title?.runs?.[0]?.text || cr.title?.simpleText);
        if (title) addAvatar(title.toLowerCase().trim(), thumbUrl);
      }
    }

    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.collectAvatarsFromData(obj[key], map, depth + 1);
      }
    }
  }

  static scrapeFromFeedCard(card: HTMLElement): { ucId: string | null; handle: string | null } | null {
    const anchor = card.querySelector(YT_SELECTORS.channelNameLink) as HTMLAnchorElement | null;
    if (!anchor) return null;
    return IdNormalizer.extractFromAnchor(anchor);
  }
}
