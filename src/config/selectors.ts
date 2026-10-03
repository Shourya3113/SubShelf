export const YT_SELECTORS = {
  guideRenderer: 'ytd-guide-renderer',
  guideSectionRenderer: 'ytd-guide-section-renderer, yt-guide-section-view-model',
  guideEntry: 'ytd-guide-entry-renderer, yt-guide-entry-view-model',
  subscriptionSection: '#sections > ytd-guide-section-renderer, #sections > yt-guide-section-view-model',
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
 * Accurately finds the channel Subscriptions section in YouTube's active, visible guide sidebar.
 * Uses robust structural and multi-lingual checks, avoiding off-screen/drawer duplicates.
 */
export function getSubscriptionSection(): Element | null {
  // Find all guide renderers in the document (desktop persistent vs mobile/drawer)
  const guideRenderers = Array.from(document.querySelectorAll<HTMLElement>('ytd-guide-renderer'));
  if (guideRenderers.length === 0) return null;

  // Filter for the guide renderer that is currently visible in the layout
  const visibleGuide = guideRenderers.find(g => {
    const rect = g.getBoundingClientRect();
    const style = window.getComputedStyle(g);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }) || guideRenderers[0];

  const sectionsContainer = visibleGuide.querySelector('#sections') || visibleGuide;
  const sections = Array.from(sectionsContainer.querySelectorAll('ytd-guide-section-renderer, yt-guide-section-view-model'));

  // 1. Structural match: section containing header link to /feed/channels
  for (const s of sections) {
    if (s.querySelector('a[href*="/feed/channels"]')) {
      return s;
    }
  }

  // 2. Direct lookup fallback: locate section from feed/channels link anywhere in visible guide
  const feedChannelsLink = visibleGuide.querySelector('a[href*="/feed/channels"]');
  if (feedChannelsLink) {
    const parentSection = feedChannelsLink.closest('ytd-guide-section-renderer, yt-guide-section-view-model, #sections > *');
    if (parentSection) return parentSection;
  }

  // 3. Multi-lingual title check across common YouTube interface languages
  const SUB_KEYWORDS = [
    'subscription', 'suscrip', 'abonnements', 'abos', 'iscrizioni',
    'inscrições', 'inscricoes', 'subskrypcje', 'подписки', 'सदस्यता',
    '구독', '订阅', '訂閱', '登録チャンネル',
  ];

  for (const s of sections) {
    const titleEl = s.querySelector('#guide-section-title, .guide-section-title, yt-formatted-string');
    const title = titleEl?.textContent?.trim().toLowerCase() || '';
    if (SUB_KEYWORDS.some(kw => title.includes(kw))) {
      return s;
    }
  }

  // 4. Structural fallback: section containing multiple channel links (/@ or /channel/UC)
  for (const s of sections) {
    const channelLinks = s.querySelectorAll('a[href*="/@"], a[href*="/channel/UC"], a[href*="/channel/"]');
    if (channelLinks.length >= 2) {
      return s;
    }
  }

  return null;
}

/**
 * Finds the native "Show more" expander button within the YouTube subscriptions section.
 */
export function getNativeExpander(subSection?: Element | null): HTMLElement | null {
  const section = subSection || getSubscriptionSection();
  if (!section) return null;

  const expander = section.querySelector<HTMLElement>(
    'ytd-guide-collapsible-entry-renderer, #expander-item, #expander-button, #expand-button, ytd-guide-entry-renderer#collapsible-expander, ytd-guide-collapsible-section-entry-renderer, yt-guide-entry-view-model#expander-item'
  );

  return expander;
}
