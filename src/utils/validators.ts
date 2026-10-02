/**
 * Strict allowlist validator for YouTube avatar hostnames.
 * Prevents tracking pixels, arbitrary domain injection, and insecure http/data URIs.
 */
const ALLOWED_AVATAR_HOSTS = new Set([
  'yt3.ggpht.com',
  'yt3.googleusercontent.com',
  'i.ytimg.com',
]);

export function isValidYouTubeAvatarUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    return false;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return (
      ALLOWED_AVATAR_HOSTS.has(host) ||
      host.endsWith('.yt3.ggpht.com') ||
      host.endsWith('.googleusercontent.com') ||
      host.endsWith('.ytimg.com')
    );
  } catch {
    return false;
  }
}
