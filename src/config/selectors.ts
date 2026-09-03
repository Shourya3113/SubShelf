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
 * Uses robust structural and multi-lingual checks, avoiding home navigation links.
 */
export function getSubscriptionSection(): Element | null {
  const guide =
    document.querySelector('ytd-guide-renderer #sections') ||
    document.querySelector('#sections');
  if (!guide) return null;

  const sections = Array.from(guide.querySelectorAll('ytd-guide-section-renderer'));

  // 1. Structural match: section containing header link to /feed/channels
  for (const s of sections) {
    if (s.querySelector('a[href*="/feed/channels"]')) {
      return s;
    }
  }

  // 2. Multi-lingual title check across common YouTube interface languages
  const SUB_KEYWORDS = [
    'subscription', 'suscrip', 'abonnements', 'abos', 'iscrizioni',
    'inscrições', 'inscricoes', 'subskrypcje', 'подписки', 'सदस्यता',
    '구독', '订阅', '訂閱', '登録チャンネル',
  ];

  for (const s of sections) {
    const titleEl = s.querySelector('#guide-section-title');
    const title = titleEl?.textContent?.trim().toLowerCase() || '';
    if (SUB_KEYWORDS.some(kw => title.includes(kw))) {
      return s;
    }
  }

  // 3. Structural fallback: section containing multiple channel links (/@ or /channel/UC)
  for (const s of sections) {
    const channelLinks = s.querySelectorAll('a[href*="/@"], a[href*="/channel/UC"]');
    if (channelLinks.length >= 2) {
      return s;
    }
  }

  return null;
}
