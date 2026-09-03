export const YT_SELECTORS = {
  guideRenderer: 'ytd-guide-renderer',
  guideSectionRenderer: 'ytd-guide-section-renderer',
  guideEntry: 'ytd-guide-entry-renderer',
  subscriptionSection: '#sections > ytd-guide-section-renderer:has(#guide-section-title)',
  richGridRenderer: 'ytd-rich-grid-renderer',
  richItemRenderer: 'ytd-rich-item-renderer',
  richSectionRenderer: 'ytd-rich-section-renderer',
  channelNameLink: 'ytd-channel-name a',
  videoOwnerRenderer: 'ytd-video-owner-renderer',
  channelAvatar: '#avatar yt-img-shadow img, #avatar img',
  channelHandle: '#channel-handle',
  pageManager: 'ytd-page-manager',
  browseRenderer: 'ytd-browse',
  continuationItem: 'ytd-continuation-item-renderer',
} as const;

export type SelectorKey = keyof typeof YT_SELECTORS;

/**
 * Accurately finds the channel Subscriptions section in YouTube's guide sidebar.
 * Specifically targets the section with title "Subscriptions" or link to /feed/channels,
 * deliberately ignoring navigation links like /feed/subscriptions in the Home section.
 */
export function getSubscriptionSection(): Element | null {
  const guide =
    document.querySelector('ytd-guide-renderer #sections') ||
    document.querySelector('#sections');
  if (!guide) return null;

  const sections = Array.from(guide.querySelectorAll('ytd-guide-section-renderer'));

  // Match the section whose #guide-section-title contains "subscription"
  for (const s of sections) {
    const titleEl = s.querySelector('#guide-section-title');
    const title = titleEl?.textContent?.trim().toLowerCase() || '';
    if (title.includes('subscription')) {
      return s;
    }
  }

  // Secondary match: header link specifically pointing to /feed/channels
  for (const s of sections) {
    if (s.querySelector('a[href*="/feed/channels"]')) {
      return s;
    }
  }

  // Fallback: section containing multiple channel links (/@ or /channel/UC)
  for (const s of sections) {
    const channelLinks = s.querySelectorAll('a[href*="/@"], a[href*="/channel/UC"]');
    if (channelLinks.length >= 2) {
      return s;
    }
  }

  return null;
}
