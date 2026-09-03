import { YT_SELECTORS } from '@/config/selectors';
import { IdNormalizer } from '@/utils/idNormalizer';
import { SubscribedChannel } from '@/types';

export class ChannelExtractor {
  static scrapeFromSidebar(): SubscribedChannel[] {
    const channels: SubscribedChannel[] = [];
    const entries = document.querySelectorAll(
      `${YT_SELECTORS.subscriptionSection} ${YT_SELECTORS.guideEntry}`
    );

    entries.forEach(entry => {
      const anchor = entry.querySelector('a') as HTMLAnchorElement | null;
      if (!anchor) return;

      const { ucId, handle } = IdNormalizer.extractFromAnchor(anchor);
      if (!ucId) return;

      const titleEl = entry.querySelector('yt-formatted-string') as HTMLElement | null;
      const title = titleEl ? titleEl.innerText.trim() : (handle || 'Channel');

      const imgEl = entry.querySelector('img') as HTMLImageElement | null;
      const avatarUrl = imgEl ? imgEl.src : '';

      channels.push({
        ucId,
        title,
        handle: handle || `@${ucId}`,
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
