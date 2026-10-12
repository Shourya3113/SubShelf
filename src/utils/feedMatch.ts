import { SubscribedChannel } from '@/types';

const normHandle = (h: string): string => (h.startsWith('@') ? h : '@' + h).toLowerCase();

/**
 * Builds the set of identifiers that mark a feed card as belonging to a folder.
 * Folders store UC IDs, but feed cards link to /@handle, so every member's handle is included too.
 */
export function buildFeedTargets(
  channelIds: string[],
  channels: Record<string, SubscribedChannel>,
  handleToUcId: Record<string, string>
): Set<string> {
  const members = new Set(channelIds);
  const targets = new Set<string>();
  for (const id of channelIds) {
    targets.add(id.startsWith('UC') ? id : normHandle(id));
    const handle = channels[id]?.handle;
    if (handle && !handle.startsWith('@UC')) targets.add(normHandle(handle));
  }
  for (const [handle, ucId] of Object.entries(handleToUcId)) {
    if (members.has(ucId)) targets.add(normHandle(handle));
  }
  return targets;
}

/** True when a card's channel (UC ID and/or lowercase @handle from its link) is in the target set. */
export function cardMatches(card: { ucId: string | null; handle: string | null }, targets: Set<string>): boolean {
  return Boolean((card.ucId && targets.has(card.ucId)) || (card.handle && targets.has(card.handle.toLowerCase())));
}
