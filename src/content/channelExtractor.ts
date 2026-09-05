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

    this.hasAttemptedExpand = true;
    try {
      toggleBtn.click();
      return true;
    } catch {
      return false;
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
