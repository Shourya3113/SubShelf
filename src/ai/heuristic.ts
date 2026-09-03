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
      'tech', 'technology', 'apple', 'google', 'microsoft', 'code', 'coding',
      'programming', 'developer', 'software', 'linux', 'python', 'javascript',
      'typescript', 'rust', 'react', 'web', 'dev', 'computer', 'ai', 'gpt',
      'machine learning', 'cs50', 'linus', 'mkbhd', 'verge', 'hardware',
      'gadget', 'gadgets', 'cyber', 'engineering', 'intel', 'amd', 'nvidia',
      'fireship', 'traversy', 'freecodecamp', 'network', 'phone', 'ios',
      'android', 'setup', 'server', 'terminal', 'cloud', 'aws', 'data',
    ],
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: '🎮',
    color: '#10B981',
    keywords: [
      'game', 'games', 'gaming', 'playthrough', 'walkthrough', 'gameplay',
      'destiny', 'minecraft', 'gta', 'fortnite', 'twitch', 'steam', 'xbox',
      'playstation', 'nintendo', 'ign', 'gamespot', 'speedrun', 'esports',
      'streamer', 'rpg', 'fps', 'valve', 'blizzard', 'riot', 'league',
      'valorant', 'pubg', 'cod', 'roblox', 'retro', 'zelda', 'pokemon',
      'arcade', 'console',
    ],
  },
  {
    id: 'music',
    name: 'Music & Audio',
    icon: '🎵',
    color: '#EC4899',
    keywords: [
      'music', 'vevo', 'records', 'sound', 'audio', 'song', 'songs', 'band',
      'orchestra', 'beats', 'bass', 'charlie puth', 'clean bandit', 'dolby',
      'eminem', 'dizasta', 'lyrics', 'acoustic', 'remix', 'hiphop', 'pop',
      'rock', 'rap', 'dj', 'vocals', 'radio', 'track', 'concert', 'album',
      'melody', 'tune', 'instrumental', 'jazz', 'lo-fi', 'lofi', 'trap',
      'guitar', 'piano', 'sing', 'singer',
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
      'explained', 'lecture', 'documentary', 'demos', 'geography', 'how to',
      'tutorial', 'philosophy', 'discovery', 'cosmos', 'national geographic',
      'bbc', 'curious', 'facts', 'astronomy', 'universe',
    ],
  },
  {
    id: 'entertainment',
    name: 'Entertainment & Media',
    icon: '🍿',
    color: '#F59E0B',
    keywords: [
      'entertainment', 'comedy', 'vlog', 'show', 'cinema', 'movie', 'film',
      'trailer', 'podcast', 'marvel', 'sony pictures', 'disney', 'netflix',
      'clips', 'funny', 'skit', 'reaction', 'drama', 'animation', 'anime',
      'cartoon', 'studios', 'review', 'interview', 'talk', 'late night',
      'memes', 'hollywood', 'parody', 'acting',
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
      'trading', 'real estate', 'bank', 'passive income', 'wall street',
      'millionaire', 'shares', 'capital', 'funds',
    ],
  },
  {
    id: 'fitness-sports',
    name: 'Fitness & Sports',
    icon: '💪',
    color: '#EF4444',
    keywords: [
      'fitness', 'gym', 'workout', 'health', 'nutrition', 'bodybuilding',
      'diet', 'calisthenics', 'yoga', 'exercise', 'training', 'sports',
      'football', 'soccer', 'basketball', 'nba', 'fifa', 'ufc', 'boxing',
      'running', 'muscle', 'athlete', 'crossfit', 'lifting',
    ],
  },
  {
    id: 'lifestyle-food',
    name: 'Food & Lifestyle',
    icon: '🍳',
    color: '#D97706',
    keywords: [
      'food', 'cook', 'cooking', 'recipe', 'kitchen', 'chef', 'travel',
      'adventure', 'trip', 'tour', 'vlog', 'lifestyle', 'house', 'design',
      'diy', 'craft', 'car', 'automotive', 'motor', 'photography', 'art',
      'baking', 'restaurant', 'street food',
    ],
  },
  {
    id: 'news-politics',
    name: 'News & Politics',
    icon: '📰',
    color: '#6366F1',
    keywords: [
      'news', 'politics', 'daily', 'report', 'journalism', 'breaking',
      'world', 'global', 'press', 'coverage', 'commentary', 'affairs',
      'election', 'times', 'post', 'today', 'live news',
    ],
  },
  {
    id: 'general-other',
    name: 'General & Others',
    icon: '🌐',
    color: '#6B7280',
    keywords: [], // Catch-all for remaining channels
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
        if (tax.keywords.length === 0) continue; // Skip catch-all in first pass
        const matches = tax.keywords.some(kw => text.includes(kw));
        if (matches) {
          const deck = decks.find(d => d.id === tax.id);
          deck?.channelIds.push(ch.ucId);
          assigned.add(ch.ucId);
          break;
        }
      }
    }

    // Assign all remaining unassigned channels to "General & Others"
    const generalDeck = decks.find(d => d.id === 'general-other');
    for (const ch of channels) {
      if (!assigned.has(ch.ucId)) {
        generalDeck?.channelIds.push(ch.ucId);
        assigned.add(ch.ucId);
      }
    }

    // Keep __uncategorized__ for schema compliance
    decks.push({
      id: '__uncategorized__',
      name: 'Uncategorized',
      icon: '📂',
      color: '#6B7280',
      channelIds: [],
      isCollapsed: true,
      sortOrder: 999,
      isSystem: true,
    });

    // Return only decks that have channels
    return decks.filter(d => d.channelIds.length > 0);
  }
}
