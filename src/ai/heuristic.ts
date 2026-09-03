import { SubscribedChannel, CategoryDeck } from '@/types';

export interface TaxonomyEntry {
  id: string;
  name: string;
  icon: string;
  color: string;
  keywords: string[];
  exactSignatures?: string[];
}

export const SUBDECK_TAXONOMY: TaxonomyEntry[] = [
  {
    id: 'tech-coding',
    name: 'Tech & Coding',
    icon: '💻',
    color: '#3B82F6',
    exactSignatures: [
      'apple', 'apple explained', 'apple india', 'cs50', 'linus tech tips', 'the coding school',
      'fireship', 'mkbhd', 'marques brownlee', 'dave2d', 'traversy media', 'freecodecamp',
      'networkchuck', 'techlead', 'austin evans', 'jerryrigeverything', 'computerphile',
      'lex fridman', 'web dev simplified', 'kevin powell', 'academind', 'programming with mosh',
      'clever programmer', 'theo - t3.gg', 'primeagen', 'george hotz', 'the verge',
      'engadget', 'techcrunch', 'android authority', 'macrumors', '9to5mac',
    ],
    keywords: [
      'tech', 'technology', 'code', 'coding', 'programming', 'developer', 'software',
      'linux', 'python', 'javascript', 'typescript', 'rust', 'react', 'web dev',
      'frontend', 'backend', 'devops', 'computer', 'ai', 'artificial intelligence',
      'machine learning', 'deep learning', 'neural', 'hardware', 'gadgets', 'cybersecurity',
      'engineering', 'intel', 'amd', 'nvidia', 'setup', 'server', 'terminal',
      'cloud', 'aws', 'data science', 'algorithms', 'github', 'macos', 'ios',
      'android', 'smartphone', 'review', 'benchmark', 'overclock',
    ],
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: '🎮',
    color: '#10B981',
    exactSignatures: [
      'destiny', 'pewdiepie', 'markiplier', 'jacksepticeye', 'ign', 'gamespot',
      'dantdm', 'ninja', 'shroud', 'pokimane', 'dream', 'tommyinnit', 'asmongold',
      'game theory', 'nintendo', 'playstation', 'xbox', 'call of duty', 'minecraft',
      'valve', 'riot games', 'rockstar games', 'ubisoft', 'ea sports', 'gamers nexus',
    ],
    keywords: [
      'game', 'games', 'gaming', 'playthrough', 'walkthrough', 'gameplay',
      'play', 'streamer', 'twitch', 'steam', 'esports', 'speedrun', 'rpg',
      'fps', 'multiplayer', 'trailer', 'mod', 'roblox', 'fortnite', 'valorant',
      'league of legends', 'minecraft', 'gta', 'pokemon', 'zelda', 'overwatch',
      'counter-strike', 'apex legends', 'console', 'emulator',
    ],
  },
  {
    id: 'music',
    name: 'Music & Audio',
    icon: '🎵',
    color: '#EC4899',
    exactSignatures: [
      'charlie puth', 'clean bandit', 'eminem', 'eminemmusic', 'dizastamusic', 'dolby',
      'vevo', 'sony music', 'warner records', 't-series', 'trap nation', 'monstercat',
      'lofi girl', 'taylor swift', 'ed sheeran', 'drake', 'the weeknd', 'justin bieber',
      'billie eilish', 'adele', 'bts', 'alan walker', 'marshmello', 'bruno mars',
      'spinnin records', 'we the sus music', 'noisiest', 'ultra records',
    ],
    keywords: [
      'music', 'vevo', 'records', 'sound', 'audio', 'song', 'songs', 'band',
      'orchestra', 'beats', 'bass', 'lyrics', 'acoustic', 'remix', 'hiphop',
      'pop', 'rock', 'rap', 'dj', 'vocals', 'radio', 'track', 'concert',
      'album', 'melody', 'instrumental', 'jazz', 'lo-fi', 'lofi', 'trap',
      'guitar', 'piano', 'singer', 'chords', 'studio', 'synthesizer',
    ],
  },
  {
    id: 'education-science',
    name: 'Education & Science',
    icon: '📚',
    color: '#8B5CF6',
    exactSignatures: [
      'domain of science', 'physics demos', 'veritasium', 'vsauce', 'kurzgesagt',
      'ted', 'ted-ed', 'crashcourse', '3blue1brown', 'numberphile', 'smarter everyday',
      'scishow', 'national geographic', 'nasa', 'bbc', 'minutephysics', 'real engineering',
      'wendover productions', 'half as interesting', 'reallifelore', 'khan academy',
      'oversimplified', 'mark rober', 'action lab', 'electroboom', 'stand-up maths',
    ],
    keywords: [
      'science', 'education', 'learn', 'course', 'academy', 'physics', 'math',
      'chemistry', 'biology', 'history', 'space', 'astronomy', 'universe',
      'explained', 'lecture', 'documentary', 'demos', 'geography', 'tutorial',
      'philosophy', 'discovery', 'cosmos', 'curious', 'experiments', 'scientific',
      'quantum', 'gravity', 'evolution', 'anatomy', 'calculus', 'algebra',
    ],
  },
  {
    id: 'entertainment',
    name: 'Entertainment & Media',
    icon: '🍿',
    color: '#F59E0B',
    exactSignatures: [
      'marvel entertainment', 'sony pictures entertainment', 'sony pictures', 'marvel',
      'warner bros', 'universal pictures', 'disney', 'netflix', 'a24', 'rotten tomatoes',
      'cinemasins', 'screen junkies', 'screen rant', 'watchmojo', 'jimmy kimmel',
      'the tonight show', 'saturday night live', 'dude perfect', 'mrbeast', 'corridor crew',
      'spacecinema', 'xqc clips', 'daily dose of internet', 'smosh', 'collegehumor',
    ],
    keywords: [
      'entertainment', 'comedy', 'vlog', 'show', 'cinema', 'movie', 'film',
      'podcast', 'funny', 'skit', 'reaction', 'drama', 'animation', 'anime',
      'cartoon', 'studios', 'review', 'interview', 'talk show', 'late night',
      'memes', 'hollywood', 'parody', 'acting', 'shorts', 'clips', 'bloopers',
      'episode', 'season', 'scene',
    ],
  },
  {
    id: 'finance-crypto',
    name: 'Finance & Business',
    icon: '📈',
    color: '#059669',
    exactSignatures: [
      'graham stephan', 'andrei jikh', 'ali abdaal', 'coin bureau', 'meet kevin',
      'mark tilbury', 'minority mindset', 'benjamin cowen', 'investopedia',
      'bloomberg technology', 'cnbc', 'forbes', 'financial times', 'wall street journal',
    ],
    keywords: [
      'finance', 'money', 'business', 'invest', 'investing', 'stocks', 'crypto',
      'bitcoin', 'ethereum', 'economy', 'wealth', 'market', 'startup', 'entrepreneur',
      'trading', 'real estate', 'bank', 'passive income', 'wall street', 'shares',
      'capital', 'dividends', 'portfolio', 'financial independence',
    ],
  },
  {
    id: 'fitness-sports',
    name: 'Fitness & Sports',
    icon: '💪',
    color: '#EF4444',
    exactSignatures: [
      'chris heria', 'jeff nippard', 'athlean-x', 'chloe ting', 'calisthenics movement',
      'bodybuilding.com', 'ufc', 'nba', 'fifa', 'premier league', 'wwe', 'olympics',
      'red bull', 'espn', 'sky sports', 'thenx', 'hybrid calisthenics',
    ],
    keywords: [
      'fitness', 'gym', 'workout', 'health', 'nutrition', 'bodybuilding',
      'diet', 'calisthenics', 'yoga', 'exercise', 'training', 'sports',
      'football', 'soccer', 'basketball', 'boxing', 'running', 'muscle',
      'athlete', 'crossfit', 'lifting', 'cardio', 'weight loss', 'hypertrophy',
    ],
  },
  {
    id: 'lifestyle-food',
    name: 'Food & Lifestyle',
    icon: '🍳',
    color: '#D97706',
    exactSignatures: [
      'gordon ramsay', 'jamie oliver', 'babish culinary universe', 'joshua weissman',
      'bon appetit', 'tasty', 'food insider', 'casey neistat', 'peter mckinnon',
      'proko', 'architectural digest', 'buzzfeed tasty',
    ],
    keywords: [
      'food', 'cook', 'cooking', 'recipe', 'kitchen', 'chef', 'travel',
      'adventure', 'trip', 'tour', 'vlog', 'lifestyle', 'house', 'interior design',
      'diy', 'craft', 'car', 'automotive', 'motor', 'photography', 'art',
      'baking', 'restaurant', 'street food', 'eating', 'asmr',
    ],
  },
  {
    id: 'news-politics',
    name: 'News & Politics',
    icon: '📰',
    color: '#6366F1',
    exactSignatures: [
      'bbc news', 'cnn', 'fox news', 'msnbc', 'vox', 'the new york times',
      'the wall street journal', 'reuters', 'bloomberg', 'vice news', 'al jazeera',
      'the guardian', 'pbs newshour', 'abc news', 'sky news', 'dw news',
    ],
    keywords: [
      'news', 'politics', 'daily', 'report', 'journalism', 'breaking',
      'world', 'global', 'press', 'coverage', 'commentary', 'affairs',
      'election', 'times', 'post', 'live news', 'current affairs', 'geopolitics',
    ],
  },
  {
    id: 'general-other',
    name: 'General & Others',
    icon: '🌐',
    color: '#6B7280',
    keywords: [],
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
      const titleLower = ch.title.toLowerCase().trim();
      const handleLower = (ch.handle || '').toLowerCase().replace(/^@/, '').trim();
      const combined = `${titleLower} ${handleLower}`;

      let bestCatId: string | null = null;
      let highestScore = 0;

      for (const tax of SUBDECK_TAXONOMY) {
        if (tax.id === 'general-other') continue;
        let score = 0;

        // 1. Direct Famous Signature Match (+100 points)
        if (tax.exactSignatures) {
          for (const sig of tax.exactSignatures) {
            if (titleLower === sig || handleLower === sig || titleLower.includes(sig) || handleLower.includes(sig)) {
              score += 100;
              break;
            }
          }
        }

        // 2. Word Boundary Matching (+10 points per keyword match)
        for (const kw of tax.keywords) {
          // Use regex word boundary to prevent partial collisions (e.g. 'cod' in 'coding', 'war' in 'software')
          const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escaped}\\b`, 'i');

          if (regex.test(titleLower)) {
            score += 15;
          } else if (regex.test(handleLower)) {
            score += 10;
          } else if (combined.includes(kw) && kw.includes(' ')) {
            // Multi-word phrases like "real engineering", "tech tips", "web dev"
            score += 25;
          }
        }

        if (score > highestScore) {
          highestScore = score;
          bestCatId = tax.id;
        }
      }

      // Assign to winner if threshold met
      if (bestCatId && highestScore >= 10) {
        const deck = decks.find(d => d.id === bestCatId);
        deck?.channelIds.push(ch.ucId);
        assigned.add(ch.ucId);
      }
    }

    // Assign remaining channels to "General & Others"
    const generalDeck = decks.find(d => d.id === 'general-other');
    for (const ch of channels) {
      if (!assigned.has(ch.ucId)) {
        generalDeck?.channelIds.push(ch.ucId);
        assigned.add(ch.ucId);
      }
    }

    // Keep __uncategorized__ for schema compatibility
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

    // Return decks that contain channels
    return decks.filter(d => d.channelIds.length > 0);
  }
}
