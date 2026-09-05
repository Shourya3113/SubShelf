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
      'clever programmer', 'theo - t3.gg', 'primeagen', 'the primeagen', 'george hotz', 'the verge',
      'engadget', 'techcrunch', 'android authority', 'macrumors', '9to5mac', 'mrwhosetheboss',
      'tech burner', 'beebom', 'geekyranjit', 'ltt', 'shortcircuit', 'hardware canucks',
      'gamers nexus', 'pauls hardware', 'bytebytego', 'hussein nasser', 'arjancodes',
      'tech with tim', 'corey schafer', 'sentdex', 'derek banas', 'john savill', 'jeff geerling',
      'craft computing', 'retro man cave', 'ben eater', 'veritasium tech', 'mkbhd clips',
      'waveform', 'mister mobile', 'snazzy labs', 'jonathan morrison', 'flossy carter',
    ],
    keywords: [
      'tech', 'technology', 'code', 'coding', 'programming', 'developer', 'software',
      'linux', 'python', 'javascript', 'typescript', 'rust', 'react', 'web dev',
      'frontend', 'backend', 'devops', 'computer', 'ai', 'artificial intelligence',
      'machine learning', 'deep learning', 'neural', 'hardware', 'gadgets', 'cybersecurity',
      'engineering', 'intel', 'amd', 'nvidia', 'setup', 'server', 'terminal',
      'cloud', 'aws', 'data science', 'algorithms', 'github', 'macos', 'ios',
      'android', 'smartphone', 'benchmark', 'overclock', 'pc build', 'tech review',
      'unboxing', 'gadget', 'robotics', 'sysadmin', 'kubernetes', 'docker', 'git',
      'sql', 'dev', 'fullstack', 'semiconductor',
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
      'total gaming', 'carryislive', 'dynamo gaming', 'mortal', 'techno gamerz', 'mythpat gaming',
      'typical gamer', 'ali-a', 'lazarbeam', 'ludwig', 'moistcrItikal', 'penguinz0',
      'xqc', 'sykkuno', 'valkyrae', 'timthetatman', 'dr disrespect', 'videogamedunkey',
      'dunkey', 'scott the woz', 'spawn wave', 'angryjoeshow', 'kotaku', 'polygon',
      'pc gamer', 'eurogamer', 'skill up', 'acg', 'radbrad', 'the rad brad',
    ],
    keywords: [
      'game', 'games', 'gaming', 'playthrough', 'walkthrough', 'gameplay',
      'streamer', 'twitch', 'steam', 'esports', 'speedrun', 'rpg',
      'fps', 'multiplayer', 'mod', 'roblox', 'fortnite', 'valorant',
      'league of legends', 'minecraft', 'gta', 'pokemon', 'zelda', 'overwatch',
      'counter-strike', 'apex legends', 'console', 'emulator', 'nintendo switch',
      'ps5', 'xbox series', 'boss fight', 'mmo', 'mmorpg', 'let\'s play',
    ],
  },
  {
    id: 'music',
    name: 'Music & Audio',
    icon: '🎵',
    color: '#EC4899',
    exactSignatures: [
      'post malone', 'postmalone', 'charlie puth', 'clean bandit', 'eminem', 'eminemmusic',
      'dizastamusic', 'dolby', 'vevo', 'sony music', 'warner records', 't-series',
      'trap nation', 'monstercat', 'lofi girl', 'taylor swift', 'ed sheeran', 'drake',
      'the weeknd', 'justin bieber', 'billie eilish', 'adele', 'bts', 'alan walker',
      'marshmello', 'bruno mars', 'spinnin records', 'we the sus music', 'noisiest',
      'ultra records', 'coldplay', 'imagine dragons', 'maroon 5', 'kendrick lamar',
      'travis scott', 'kanye west', 'bad bunny', 'j balvin', 'dua lipa', 'olivia rodrigo',
      'selena gomez', 'shawn mendes', 'katy perry', 'shakira', 'lady gaga', 'rihanna',
      'ariana grande', 'queen', 'michael jackson', 'nirvana', 'linkin park', 'green day',
      'metallica', 'snoop dogg', '50 cent', 'jay-z', 'lil nas x', 'cardi b', 'nicki minaj',
      'avicii', 'david guetta', 'calvin harris', 'the chainsmokers', 'kygo', 'skrillex',
      'arijit singh', 'neha kakkar', 'badshah', 'diljit dosanjh', 'sidhu moose wala',
      'ap dhillon', 'anuv jain', 'prateek kuhad', 'coke studio', 'zee music company',
      'speed records', 'tips official', 'saregama music', 'rajshri', 'nocopyrightsounds',
      'ncs', 'chillhop music', 'npr music', 'tiny desk', 'boiler room',
    ],
    keywords: [
      'music', 'vevo', 'records', 'sound', 'audio', 'song', 'songs', 'band',
      'orchestra', 'beats', 'bass', 'lyrics', 'acoustic', 'remix', 'hiphop',
      'pop', 'rock', 'rap', 'dj', 'vocals', 'radio', 'track', 'concert',
      'album', 'melody', 'instrumental', 'jazz', 'lo-fi', 'lofi', 'trap',
      'guitar', 'piano', 'singer', 'chords', 'studio', 'synthesizer', 'official audio',
      'official video', 'lyric video', 'discography', 'mixtape', 'symphony', 'cover song',
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
      'physics wallah', 'unacademy', 'byjus', 'aman dhattarwal', 'apni kaksha',
      'dear sir', 'magnet brains', 'crash course', 'periodic videos', 'deep sky videos',
      'sixty symbols', 'tom scott', 'practical engineering', 'anton petrov',
      'sabine hossenfelder', 'pbs space time', 'pbs eons', 'asapscience', 'tierzoo',
      'kurzgesagt – in a nutshell', 'steve mould', 'nilered', 'nileblue',
    ],
    keywords: [
      'science', 'education', 'learn', 'course', 'academy', 'physics', 'math',
      'mathematics', 'chemistry', 'biology', 'history', 'space', 'astronomy', 'universe',
      'explained', 'lecture', 'documentary', 'demos', 'geography', 'tutorial',
      'philosophy', 'discovery', 'cosmos', 'curious', 'experiments', 'scientific',
      'quantum', 'gravity', 'evolution', 'anatomy', 'calculus', 'algebra', 'lesson',
      'exam', 'study', 'astrophysics',
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
      'the tonight show', 'saturday night live', 'dude perfect', 'mrbeast', 'mr beast',
      'corridor crew', 'spacecinema', 'xqc clips', 'daily dose of internet', 'smosh',
      'collegehumor', 'carryminati', 'bb ki vines', 'ashish chanchlani', 'bhuvan bam',
      'amit bhadana', 'harsh beniwal', 'round2hell', 'tvf', 'the viral fever',
      'filtercopy', 'zakir khan', 'anubhav singh bassi', 'abhishek upmanyu',
      'samay raina', 'tanmay bhat', 'triggered insaan', 'fukra insaan', 'mythpat',
      'flying beast', 'sourav joshi vlogs', 'sidemen', 'ksi', 'miniminter',
      'w2s', 'vikkstar123', 'tbjzl', 'zerkaa', 'beta squad', 'amp', 'kai cenat',
      'fanum', 'agent00', 'duke dennis', 'ishowspeed', 'speed',
    ],
    keywords: [
      'entertainment', 'comedy', 'vlog', 'vlogs', 'show', 'cinema', 'movie', 'movies',
      'film', 'films', 'podcast', 'funny', 'skit', 'reaction', 'drama', 'animation',
      'anime', 'cartoon', 'studios', 'interview', 'talk show', 'late night',
      'memes', 'hollywood', 'parody', 'acting', 'shorts', 'clips', 'bloopers',
      'episode', 'season', 'scene', 'trailer', 'teaser', 'stand-up', 'sketches',
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
      'wsj', 'ankur warikoo', 'rachana ranade', 'ca rachana ranade', 'pranjal kamra',
      'akshat shrivastava', 'labour law advisor', 'lla', 'asset yogi', 'finology legal',
      'shark tank', 'shark tank india', 'garyvee', 'patrick bet-david', 'valuetainment',
    ],
    keywords: [
      'finance', 'money', 'business', 'invest', 'investing', 'investment', 'stocks', 'crypto',
      'bitcoin', 'ethereum', 'economy', 'wealth', 'market', 'startup', 'entrepreneur',
      'trading', 'real estate', 'bank', 'passive income', 'wall street', 'shares',
      'capital', 'dividends', 'portfolio', 'financial independence', 'personal finance',
      'budget', 'credit card', 'taxation', 'mutual funds', 'forex', 'side hustle',
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
      'red bull', 'espn', 'sky sports', 'thenx', 'hybrid calisthenics', 'formula 1',
      'f1', 'nfl', 'mlb', 'nhl', 'cricket australia', 'icc', 'bcci', 'guru mann',
      'rohit khatri', 'jeet selal', 'tarun gill', 'yatinder singh',
    ],
    keywords: [
      'fitness', 'gym', 'workout', 'health', 'nutrition', 'bodybuilding',
      'diet', 'calisthenics', 'yoga', 'exercise', 'training', 'sports',
      'football', 'soccer', 'basketball', 'boxing', 'running', 'muscle',
      'athlete', 'crossfit', 'lifting', 'cardio', 'weight loss', 'hypertrophy',
      'cricket', 'mma', 'wrestling', 'tennis', 'badminton', 'physique',
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
      'proko', 'architectural digest', 'buzzfeed tasty', 'ranveer brar', 'sanjeev kapoor',
      'kabitas kitchen', 'nisha madhulika', 'village cooking channel', 'uncle roger',
      'nigel ng', 'epicurious', 'binging with babish', 'americas test kitchen',
    ],
    keywords: [
      'food', 'cook', 'cooking', 'recipe', 'recipes', 'kitchen', 'chef', 'travel',
      'adventure', 'trip', 'tour', 'lifestyle', 'house', 'interior design',
      'diy', 'craft', 'car', 'cars', 'automotive', 'motor', 'photography', 'art',
      'baking', 'restaurant', 'street food', 'eating', 'asmr', 'mukbang', 'grill',
      'culinary', 'woodworking',
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
      'washington post', 'the washington post', 'new york post', 'the new york post',
      'daily news', 'associated press', 'ndtv', 'india today', 'aaj tak', 'zee news',
      'abp news', 'republic world', 'the print', 'the wire', 'quint', 'wion',
      'firstpost', 'the economist', 'nbc news', 'cbs news',
    ],
    keywords: [
      'news', 'politics', 'journalism', 'breaking news',
      'commentary', 'current affairs', 'election', 'live news',
      'geopolitics', 'press conference', 'daily wire', 'daily beast',
      'huffpost', 'political', 'congress', 'parliament', 'government',
      'prime minister', 'president',
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
      const cleanTitle = titleLower.replace(/[^a-z0-9]/g, '');
      const cleanHandle = handleLower.replace(/[^a-z0-9]/g, '');
      const combined = `${titleLower} ${handleLower}`;

      let bestCatId: string | null = null;
      let highestScore = 0;

      for (const tax of SUBDECK_TAXONOMY) {
        if (tax.id === 'general-other') continue;
        let score = 0;

        // 1. Direct Famous Signature Match (+250 points)
        if (tax.exactSignatures) {
          for (const sig of tax.exactSignatures) {
            const cleanSig = sig.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (
              titleLower === sig ||
              handleLower === sig ||
              cleanTitle === cleanSig ||
              cleanHandle === cleanSig ||
              cleanTitle.includes(cleanSig) ||
              cleanHandle.includes(cleanSig)
            ) {
              score += 250;
              break;
            }
          }
        }

        // 2. Word Boundary Matching on Title (+20 points per keyword match)
        for (const kw of tax.keywords) {
          const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escaped}\\b`, 'i');

          if (regex.test(titleLower)) {
            score += 20;
          } else if (regex.test(handleLower)) {
            score += 15;
          } else if (kw.includes(' ') && combined.includes(kw)) {
            score += 30;
          } else if (cleanHandle.includes(escaped) && escaped.length >= 4) {
            score += 12;
          }
        }

        if (score > highestScore) {
          highestScore = score;
          bestCatId = tax.id;
        }
      }

      // Assign to winner if threshold met (>= 12 points)
      if (bestCatId && highestScore >= 12) {
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
