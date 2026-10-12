import { normalizeHandle } from './channelIdentity';

export class IdNormalizer {
  static extractFromAnchor(anchor: HTMLAnchorElement): { ucId: string | null; handle: string | null } {
    let ucId = anchor.getAttribute('data-browse-id') || null;
    if (ucId && !ucId.startsWith('UC')) ucId = null;

    const href = anchor.getAttribute('href') || '';
    if (!ucId) {
      const ucMatch = href.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
      if (ucMatch) {
        ucId = ucMatch[1];
      }
    }

    const handleMatch = href.match(/\/@([^/?#]+)/);
    const handle = handleMatch ? normalizeHandle(handleMatch[1]) || null : null;

    return { ucId, handle };
  }
}
