/**
 * Folders, channels and corrections belong to one YouTube account. Each account's data lives under
 * its own prefix in chrome.storage.local, named by a hash of YouTube's account ID, so the ID itself
 * is never stored. Settings, the API key and the rate prompt are shared by all accounts.
 */

/** Shared key: every account seen so far, hash -> first seen. */
export const ACCOUNTS_KEY = 'accounts';
/** Shared key: the account last used on YouTube; the popup's fallback when no YouTube tab is active. */
export const LAST_ACCOUNT_KEY = 'lastAccount';

const ACCOUNT_HASH = /^[0-9a-f]{16}$/;

export const isAccountHash = (v: unknown): v is string => typeof v === 'string' && ACCOUNT_HASH.test(v);

export async function hashAccountId(id: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
  return [...new Uint8Array(digest).slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export const accountKey = (account: string, key: string): string => `acct.${account}.${key}`;

export interface AccountStore {
  get(keys: string | string[]): Promise<Record<string, any>>;
  set(items: Record<string, unknown>): Promise<void>;
}

/** chrome.storage.local for one account: callers use plain key names. */
export function accountStore(account: string): AccountStore {
  if (!isAccountHash(account)) throw new Error('No YouTube account');
  return {
    async get(keys) {
      const list = [keys].flat();
      const raw = await chrome.storage.local.get(list.map(k => accountKey(account, k)));
      const out: Record<string, any> = {};
      for (const k of list) {
        const stored = raw[accountKey(account, k)];
        if (stored !== undefined) out[k] = stored;
      }
      return out;
    },
    async set(items) {
      await chrome.storage.local.set(Object.fromEntries(Object.entries(items).map(([k, v]) => [accountKey(account, k), v])));
    },
  };
}
