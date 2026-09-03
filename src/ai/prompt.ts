import { SubscribedChannel } from '@/types';
import { SUBDECK_TAXONOMY } from './heuristic';

export function buildCategorizationPrompt(channels: SubscribedChannel[]): string {
  const taxonomyDesc = SUBDECK_TAXONOMY.map(
    t => `- "${t.id}": ${t.name} (Keywords: ${t.keywords.slice(0, 6).join(', ')})`
  ).join('\n');

  const channelList = channels
    .map(c => `- ID: "${c.ucId}", Title: "${c.title}", Handle: "${c.handle}"`)
    .join('\n');

  return `You are SubDeck AI, a YouTube subscription organizer.
Your task is to assign each YouTube channel to the single most relevant category from the taxonomy below.

Taxonomy:
${taxonomyDesc}
- "__uncategorized__": Any channel that does not clearly fit above categories.

Channels to categorize:
${channelList}

Output strict JSON ONLY with this schema:
{
  "tech-coding": ["channel_id_1", ...],
  "gaming": ["channel_id_2", ...],
  "music": [...],
  "education-science": [...],
  "entertainment": [...],
  "finance-crypto": [...],
  "fitness-health": [...],
  "__uncategorized__": [...]
}
Do not include markdown codeblocks or conversational filler. Only valid JSON.`;
}
