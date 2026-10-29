import { isChannelId, normalizeHandle } from './channelIdentity';

/**
 * Which subscriptions YouTube marks with its blue "new videos" dot, read from the same guide
 * (sidebar) data injectedMain already walks for the channel list. Nothing is fetched or stored.
 */

const SUBSCRIPTIONS_SECTION_KEY = /subscriptions?section/i;
const NEW_CONTENT_STYLE = 'GUIDE_ENTRY_PRESENTATION_STYLE_NEW_CONTENT';
const MAX_DEPTH = 35;

function isNewContent(entry: any): boolean {
  return entry?.presentationStyle === NEW_CONTENT_STYLE;
}

/** The entry's UC ID, or its "@handle" when YouTube gave no ID. */
function entryKey(browse: any): string | null {
  if (isChannelId(browse?.browseId)) return browse.browseId;
  const canonical = typeof browse?.canonicalBaseUrl === 'string' ? browse.canonicalBaseUrl : '';
  return canonical.includes('@') ? normalizeHandle(canonical) : null;
}

/**
 * `found` is false when the payload has no subscriptions section (a browse page, a search...):
 * such data says nothing about the dots and must not clear them.
 */
export function newContentKeys(data: unknown): { found: boolean; keys: string[] } {
  let found = false;
  const keys = new Set<string>();

  const walk = (n: any, depth: number, inSubscriptions: boolean) => {
    if (!n || typeof n !== 'object' || depth > MAX_DEPTH) return;
    if (inSubscriptions) {
      found = true;
      const g = n.guideEntryRenderer;
      if (g && isNewContent(g)) {
        const key = entryKey(g.navigationEndpoint?.browseEndpoint);
        if (key) keys.add(key);
      }
      const v = n.guideEntryViewModel;
      if (v && isNewContent(v)) {
        const key = entryKey(v.rendererContext?.commandContext?.onTap?.innertubeCommand?.browseEndpoint);
        if (key) keys.add(key);
      }
    }
    for (const k in n) {
      if (Object.prototype.hasOwnProperty.call(n, k)) {
        walk(n[k], depth + 1, inSubscriptions || SUBSCRIPTIONS_SECTION_KEY.test(k));
      }
    }
  };
  walk(data, 0, false);
  return { found, keys: [...keys] };
}
