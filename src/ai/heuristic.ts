import { SubscribedChannel, CategoryDeck } from '@/types';

export interface TaxonomyEntry {
  id: string;
  name: string;
  icon: string;
  color: string;
  keywords: string[];
}

export const SUBDECK_TAXONOMY: TaxonomyEntry[] = [
  {
    id: 'tech-coding',
    name: 'Tech & Coding',
    icon: '💻',
    color: '#3B82F6',
    keywords: [
      'tech', 'apple', 'code', 'coding', 'programming', 'developer', 'software',
      'linux', 'python', 'javascript', 'typescript', 'rust', 'react', 'web',
      'dev', 'computer', 'ai', 'machine learning', 'cs50', 'linus', 'mkbhd',
      'verge', 'hardware', 'gadgets', 'cyber', 'engineering',
    ],
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: '🎮',
    color: '#10B981',
    keywords: [
      'game', 'gaming', 'playthrough', 'walkthrough', 'gameplay', 'destiny',
      'minecraft', 'twitch', 'steam', 'xbox', 'playstation', 'nintendo',
      'ign', 'gamespot', 'speedrun', 'esports', 'streamer', 'rpg', 'fps',
    ],
  },
  {
    id: 'music',
    name: 'Music',
    icon: '🎵',
    color: '#EC4899',
    keywords: [
      'music', 'vevo', 'records', 'sound', 'audio', 'song', 'songs', 'band',
      'orchestra', 'beats', 'bass', 'charlie puth', 'clean bandit', 'dolby',
      'eminem', 'dizasta', 'lyrics', 'acoustic', 'remix', 'hiphop', 'pop',
    ],
  },
  {
    id: 'education-science',
    name: 'Education & Science',
    icon: '📚',
    color: '#8B5CF6',
    keywords: [
      'science', 'education', 'learn', 'course', 'academy', 'physics', 'math',
      'chemistry', 'biology', 'history', 'space', 'nasa', 'veritasium',
      'kurzgesagt', 'vsauce', 'ted', 'crashcourse', 'domain of science',
      'explained', 'lecture', 'documentary', 'demos',
    ],
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: '🍿',
    color: '#F59E0B',
    keywords: [
      'entertainment', 'comedy', 'vlog', 'show', 'cinema', 'movie', 'film',
      'trailer', 'podcast', 'marvel', 'sony pictures', 'disney', 'netflix',
      'clips', 'funny', 'skit', 'reaction', 'drama',
    ],
  },
  {
    id: 'finance-crypto',
    name: 'Finance & Business',
    icon: '📈',
    color: '#059669',
    keywords: [
      'finance', 'money', 'business', 'invest', 'investing', 'stocks', 'crypto',
      'bitcoin', 'economy', 'wealth', 'market', 'startup', 'entrepreneur',
    ],
  },
  {
    id: 'fitness-health',
    name: 'Fitness & Health',
    icon: '💪',
    color: '#EF4444',
    keywords: [
      'fitness', 'gym', 'workout', 'health', 'nutrition', 'bodybuilding',
      'diet', 'calisthenics', 'yoga', 'exercise', 'training',
    ],
  },
];

export class HeuristicCategorizer {
  static categorize(channels: SubscribedChannel[]): CategoryDeck[] {
    const decks: CategoryDeck[] = SUBDECK_TAXONOMY.map((tax, idx) => ({
      id: tax.id,
      name: tax.name,
      icon: tax.icon,
      color: tax.color,
      channelIds: [],
      isCollapsed: true,
      sortOrder: idx,
    }));

    const assigned = new Set<string>();

    for (const ch of channels) {
      const text = `${ch.title} ${ch.handle}`.toLowerCase();

      for (const tax of SUBDECK_TAXONOMY) {
        const matches = tax.keywords.some(kw => text.includes(kw));
        if (matches) {
          const deck = decks.find(d => d.id === tax.id);
          deck?.channelIds.push(ch.ucId);
          assigned.add(ch.ucId);
          break;
        }
      }
    }

    // Assign remaining channels to __uncategorized__
    const unassigned = channels.filter(c => !assigned.has(c.ucId)).map(c => c.ucId);
    decks.push({
      id: '__uncategorized__',
      name: 'Uncategorized',
      icon: '📂',
      color: '#6B7280',
      channelIds: unassigned,
      isCollapsed: true,
      sortOrder: 999,
      isSystem: true,
    });

    // Return only decks with channels or system decks
    return decks.filter(d => d.channelIds.length > 0 || d.isSystem);
  }
}
