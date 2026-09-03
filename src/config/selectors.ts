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
