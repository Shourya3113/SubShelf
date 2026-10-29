import { SubscribedChannel } from '@/types';
import { isChannelId, normalizeHandle } from '@/utils/channelIdentity';

const MAX_KEYS = 5000;

/**
 * Channels YouTube marks with its blue "new videos" dot (see utils/guideNewContent). Kept in
 * memory only: YouTube sends the state with every page load, and the page script numbers each
 * snapshot so a resend of one already applied changes nothing.
 */
export class NewUploads {
  private static keys = new Set<string>();
  private static seq = 0;
  private static listeners: (() => void)[] = [];

  static onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  private static notify(): void {
    for (const listener of this.listeners) listener();
  }

  /** Applies a snapshot from the page script; returns false if it was invalid or already applied. */
  static apply(seq: unknown, keys: unknown): boolean {
    if (typeof seq !== 'number' || seq <= this.seq || !Array.isArray(keys)) return false;
    this.seq = seq;
    const next = new Set<string>();
    for (const k of keys.slice(0, MAX_KEYS)) {
      if (typeof k !== 'string') continue;
      const key = isChannelId(k) ? k : normalizeHandle(k);
      if (key) next.add(key);
    }
    const changed = next.size !== this.keys.size || [...next].some(k => !this.keys.has(k));
    this.keys = next;
    if (changed) this.notify();
    return true;
  }

  static get isEmpty(): boolean {
    return this.keys.size === 0;
  }

  static has(ch: Pick<SubscribedChannel, 'ucId' | 'handle'>): boolean {
    if (this.keys.size === 0) return false;
    if (this.keys.has(ch.ucId)) return true;
    const h = normalizeHandle(ch.handle);
    return Boolean(h) && this.keys.has(h);
  }

  /** The user opened the channel, which clears YouTube's own dot too. */
  static clear(ch: Pick<SubscribedChannel, 'ucId' | 'handle'>): void {
    const h = normalizeHandle(ch.handle);
    const byId = this.keys.delete(ch.ucId);
    const byHandle = Boolean(h) && this.keys.delete(h);
    if (byId || byHandle) this.notify();
  }

  /** Clears the channel a YouTube page path belongs to ("/@name…" or "/channel/UC…"). */
  static clearForPath(path: string, channels: Record<string, SubscribedChannel>): void {
    const id = /^\/channel\/(UC[\w-]{22})/.exec(path)?.[1];
    const handle = /^\/(@[^/?#]+)/.exec(path)?.[1];
    if (!id && !handle) return;
    const h = handle ? normalizeHandle(handle) : '';
    const ch = Object.values(channels).find(c => (id && c.ucId === id) || (h && normalizeHandle(c.handle) === h));
    this.clear(ch ?? { ucId: id ?? '', handle: h });
  }
}
