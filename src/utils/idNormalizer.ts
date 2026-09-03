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

    let handle: string | null = null;
    const handleMatch = href.match(/\/@([a-zA-Z0-9_.-]+)/);
    if (handleMatch) {
      handle = '@' + handleMatch[1].toLowerCase();
    }

    return { ucId, handle };
  }
}
