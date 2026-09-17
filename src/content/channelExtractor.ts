import { YT_SELECTORS, getSubscriptionSection } from '@/config/selectors';
import { IdNormalizer } from '@/utils/idNormalizer';
import { SubscribedChannel } from '@/types';

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
    const collapsible = subSection.querySelector<HTMLElement>('ytd-guide-collapsible-entry-renderer, #expander-item');
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
    const toggleBtn = collapsible.querySelector<HTMLElement>('tp-yt-paper-button, #button, #endpoint, yt-formatted-string');
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
    const origFocus = HTMLElement.prototype.focus;
    const origScrollIntoView = Element.prototype.scrollIntoView;
    const origScrollIntoViewIfNeeded = (Element.prototype as any).scrollIntoViewIfNeeded;

    this.hasAttemptedExpand = true;
    try {
      // Temporarily override focus and scrollIntoView to prevent browser or Polymer from scrolling to toggleBtn
      HTMLElement.prototype.focus = function (this: HTMLElement, options?: FocusOptions) {
        origFocus.call(this, { ...options, preventScroll: true });
      };
      Element.prototype.scrollIntoView = function () {};
      if (origScrollIntoViewIfNeeded) {
        (Element.prototype as any).scrollIntoViewIfNeeded = function () {};
      }

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
      HTMLElement.prototype.focus = origFocus;
      Element.prototype.scrollIntoView = origScrollIntoView;
      if (origScrollIntoViewIfNeeded) {
        (Element.prototype as any).scrollIntoViewIfNeeded = origScrollIntoViewIfNeeded;
      }
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

  static scrapeFromSidebar(): SubscribedChannel[] {
    const channels: SubscribedChannel[] = [];
    const subSection = getSubscriptionSection();
    if (!subSection) return channels;

    const entries = subSection.querySelectorAll(YT_SELECTORS.guideEntry);

    entries.forEach(entry => {
      const anchor = entry.querySelector('a') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href') || '';
      // Skip non-channel links
      if (!href.includes('/@') && !href.includes('/channel/')) return;
      if (href.includes('/feed/') || href.includes('/playlist')) return;

      const { ucId, handle } = IdNormalizer.extractFromAnchor(anchor);
      if (!ucId && !handle) return;

      const rawTitle =
        anchor.getAttribute('title') ||
        (entry.querySelector('yt-formatted-string') as HTMLElement)?.innerText?.trim() ||
        (entry.querySelector('#guide-entry-title') as HTMLElement)?.textContent?.trim() ||
        handle ||
        'Channel';

      const title = rawTitle.trim();
      if (SYSTEM_NAMES.has(title.toLowerCase())) return;

      // Extract real channel avatar
      const imgEl = entry.querySelector('yt-img-shadow img, img') as HTMLImageElement | null;
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

      const channelKey = ucId || handle || '';

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

  private static initialAvatarsCache: Map<string, string> | null = null;

  /**
   * Extracts channel avatars from YouTube's server-rendered ytInitialData JSON payload.
   * This provides instant, high-resolution avatar URLs for ALL subscribed channels,
   * even if they haven't been scrolled into view in YouTube's native sidebar.
   */
  static getInitialAvatars(): Map<string, string> {
    if (this.initialAvatarsCache && this.initialAvatarsCache.size > 0) {
      return this.initialAvatarsCache;
    }

    const map = new Map<string, string>();

    try {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const text = script.textContent || '';
        if (!text.includes('ytInitialData')) continue;

        const marker = text.indexOf('ytInitialData');
        if (marker === -1) continue;

        const equalsIndex = text.indexOf('=', marker);
        if (equalsIndex === -1) continue;

        const braceStart = text.indexOf('{', equalsIndex);
        if (braceStart === -1) continue;

        // Balanced brace scan to extract complete JSON object
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
            this.collectAvatarsFromData(data, map);
            if (map.size > 0) {
              this.initialAvatarsCache = map;
              return map;
            }
          } catch {}
        }
      }
    } catch {}

    if (map.size > 0) {
      this.initialAvatarsCache = map;
    }
    return map;
  }

  private static collectAvatarsFromData(obj: any, map: Map<string, string>): void {
    if (!obj || typeof obj !== 'object') return;

    if (obj.guideEntryRenderer) {
      const ger = obj.guideEntryRenderer;
      const ucId = ger.navigationEndpoint?.browseEndpoint?.browseId;
      const handle = ger.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl;
      const thumbs = ger.thumbnail?.thumbnails;
      let url = thumbs && thumbs.length ? thumbs[thumbs.length - 1].url : null;
      if (url && url.startsWith('//')) {
        url = 'https:' + url;
      }
      if (url && !url.startsWith('data:image')) {
        // Upgrade low-res =s32 or =s48 to =s88 for sharp Retina rendering
        const crispUrl = url.replace(/=s\d+(-c-k)/, '=s88$1');
        if (ucId) map.set(ucId, crispUrl);
        if (handle) {
          const clean = handle.replace(/^[\/@]+/, '').toLowerCase();
          map.set(clean, crispUrl);
          map.set('@' + clean, crispUrl);
        }
        const titleText =
          typeof ger.title === 'string'
            ? ger.title
            : (ger.title?.runs?.[0]?.text || ger.title?.simpleText || '');
        if (titleText) {
          map.set(titleText.toLowerCase().trim(), crispUrl);
        }
      }
    }

    if (obj.channelRenderer || obj.compactChannelRenderer) {
      const cr = obj.channelRenderer || obj.compactChannelRenderer;
      const ucId = cr.channelId;
      const thumbs = cr.thumbnail?.thumbnails;
      let url = thumbs && thumbs.length ? thumbs[thumbs.length - 1].url : null;
      if (url && url.startsWith('//')) {
        url = 'https:' + url;
      }
      if (url && ucId && !url.startsWith('data:image')) {
        const crispUrl = url.replace(/=s\d+(-c-k)/, '=s88$1');
        map.set(ucId, crispUrl);
      }
    }

    for (const key of Object.keys(obj)) {
      this.collectAvatarsFromData(obj[key], map);
    }
  }

  static scrapeFromFeedCard(card: HTMLElement): { ucId: string | null; handle: string | null } | null {
    const anchor = card.querySelector(YT_SELECTORS.channelNameLink) as HTMLAnchorElement | null;
    if (!anchor) return null;
    return IdNormalizer.extractFromAnchor(anchor);
  }
}
