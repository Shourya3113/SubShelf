import { safeAvatarUrl } from './avatarUrl';

/**
 * Strict allowlist validator for YouTube avatar hostnames.
 * Prevents tracking pixels, arbitrary domain injection, and insecure http/data URIs.
 */
export function isValidYouTubeAvatarUrl(url: unknown): boolean {
  return safeAvatarUrl(url).length > 0;
}
