/** Optional host permission for the Gemini Cloud API; requested only when the user selects it. */
export const GEMINI_ORIGIN = 'https://generativelanguage.googleapis.com/*';

export async function hasCloudPermission(): Promise<boolean> {
  try {
    return await chrome.permissions.contains({ origins: [GEMINI_ORIGIN] });
  } catch {
    return false;
  }
}

/** Must be called directly from a user gesture (e.g. the provider <select> change). */
export async function requestCloudPermission(): Promise<boolean> {
  try {
    return await chrome.permissions.request({ origins: [GEMINI_ORIGIN] });
  } catch {
    return false;
  }
}
