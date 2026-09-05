import { YT_SELECTORS, getSubscriptionSection, getNativeExpander } from '@/config/selectors';
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
  /**
   * Expands YouTube's native collapsed "Show more" subscription section so
   * all subscribed channels (not just the first 7) are mounted into the DOM.
   */
  static autoExpandNativeSubscriptions(): boolean {
    const subSection = getSubscriptionSection();
    if (!subSection) return false;

    const expander = getNativeExpander(subSection);
    if (!expander) return false;

    const isExpanded =
      expander.hasAttribute('expanded') ||
      expander.classList.contains('expanded') ||
      expander.getAttribute('aria-expanded') === 'true';

    if (!isExpanded) {
      const clickTarget =
        expander.querySelector<HTMLElement>('a, button, #endpoint, yt-formatted-string, #button') ||
        expander;
      clickTarget.click();
      return true;
    }
    return false;
  }

  static scrapeFromSidebar(): SubscribedChannel[] {
    const channels: SubscribedChannel[] = [];
    const subSection = getSubscriptionSection();
    if (!subSection) return channels;

    // Check if we should expand the native list to capture all channels
    this.autoExpandNativeSubscriptions();

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
      let avatarUrl = '';
      if (imgEl) {
        avatarUrl = imgEl.src || imgEl.getAttribute('src') || '';
        if (avatarUrl.startsWith('data:image')) {
          avatarUrl = imgEl.getAttribute('data-thumb') || '';
        }
      }

      const channelKey = ucId || handle || '';

      channels.push({
        ucId: channelKey,
        title,
        handle: handle || `@${channelKey}`,
        url: anchor.href,
        avatarUrl,
        categoryIds: [],
        discoveredAt: Date.now(),
      });
    });

    return channels;
  }

  static scrapeFromFeedCard(card: HTMLElement): { ucId: string | null; handle: string | null } | null {
    const anchor = card.querySelector(YT_SELECTORS.channelNameLink) as HTMLAnchorElement | null;
    if (!anchor) return null;
    return IdNormalizer.extractFromAnchor(anchor);
  }
}
