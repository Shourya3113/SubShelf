const AVATAR_HOSTS = [/(^|\.)ggpht\.com$/, /(^|\.)googleusercontent\.com$/, /(^|\.)ytimg\.com$/];

/**
 * Validates and normalizes YouTube avatar URLs.
 * Rejects non-strings, lengths > 500, non-HTTPS protocols, and non-whitelisted hostnames.
 */
export function safeAvatarUrl(u: unknown): string {
  if (typeof u !== 'string' || u.length > 500) return '';
  try {
    const url = new URL(u);
    if (url.protocol !== 'https:') return '';
    return AVATAR_HOSTS.some(r => r.test(url.hostname)) ? url.href : '';
  } catch {
    return '';
  }
}

/**
 * Sanitizes incoming avatar maps with size caps and prototype pollution defenses.
 */
export function sanitizeAvatarMap(input: unknown, maxEntries = 3000): Map<string, string> {
  const out = new Map<string, string>();
  if (!input || typeof input !== 'object') return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (out.size >= maxEntries) break;
    if (k.length > 100 || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    const url = safeAvatarUrl(v);
    if (url) out.set(k, url);
  }
  return out;
}
