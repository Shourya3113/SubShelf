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
 * Accurately finds the Subscriptions section in YouTube's guide sidebar.
 * Avoids false matches on the Home navigation section or Library section.
 */
export function getSubscriptionSection(): Element | null {
  const sections = Array.from(
    document.querySelectorAll('#sections > ytd-guide-section-renderer')
  );

  // Strategy 1: Section with header titled "Subscriptions" or link to /feed/channels
  for (const s of sections) {
    const titleEl = s.querySelector('#guide-section-title');
    const titleText = titleEl?.textContent?.trim().toLowerCase() || '';
    const headerLink = s.querySelector('a[href*="/feed/channels"], a[href*="/feed/subscriptions"]');
    if (headerLink || titleText.includes('subscription')) {
      return s;
    }
  }

  // Strategy 2: Section containing multiple channel links (/@ or /channel/)
  for (const s of sections) {
    const channelLinks = s.querySelectorAll('a[href*="/@"], a[href*="/channel/UC"]');
    if (channelLinks.length >= 2) {
      return s;
    }
  }

  // Fallback to second or third section
  return sections[1] || sections[2] || document.querySelector(YT_SELECTORS.subscriptionSection);
}
