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
      'pauls hardware', 'bytebytego', 'hussein nasser', 'arjancodes',
      'tech with tim', 'corey schafer', 'sentdex', 'derek banas', 'john savill', 'jeff geerling',
      'craft computing', 'retro man cave', 'ben eater', 'veritasium tech', 'mkbhd clips',
      'waveform', 'mister mobile', 'snazzy labs', 'jonathan morrison', 'flossy carter',
      // Extended signatures
      'unbox therapy', 'techlinked', 'tech linked', 'linus media group', 'techquickie',
      'digital foundry', 'joma tech', 'techaltar', 'tailosive tech', 'sara dietschy',
      'karl conrad', 'ijustine', 'justine ezarik', 'booredatwork', 'supersaf',
      'phone arena', 'gsmarena', 'sam beckman', 'matthewmoniz',
      'tld', 'techlinked daily', 'tech with nana', 'nana janashia', 'bro code',
      'coder coder', 'the net ninja', 'developedbyed', 'jack herrington',
      'james q quick', 'brad traversy', 'techworld with nana', 'continuous delivery',
      'code with antonio', 'the coding train', 'coding garden', 'code with harry',
      'apna college', 'love babbar', 'striver', 'take u forward', 'pepcoding',
      'neetcode', 'neetcodeio', 'techdose', 'errichto', 'william lin',
      'clément mihailescu', 'clement mihailescu', 'tech with lucy',
      'github', 'visual studio code', 'google developers', 'android developers',
      'apple developer', 'microsoft developer', 'aws', 'amazon web services',
      'google cloud tech', 'hashicorp', 'docker', 'kubernetes',
      'dave lee', 'dave2d', 'tailosive tech', 'arun maini',
      'ishan agarwal', 'technical guruji', 'techbar', 'trakin tech', 'c4etech',
      'geeky ranjit', 'technical sagar', 'tech with sagar', 'gadgets 360',
      'stuff made here', 'simone giertz', 'coldfusion', 'cold fusion',
      'wendover', 'thoughty2', 'polymatter', 'neo',
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
      'sql', 'dev', 'fullstack', 'semiconductor', 'leetcode', 'dsa', 'api',
      'nextjs', 'nodejs', 'flutter', 'swift', 'kotlin', 'java', 'golang',
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
      'typical gamer', 'ali-a', 'lazarbeam', 'ludwig', 'moistcritikal', 'penguinz0',
      'xqc', 'sykkuno', 'valkyrae', 'timthetatman', 'dr disrespect', 'videogamedunkey',
      'dunkey', 'scott the woz', 'spawn wave', 'angryjoeshow', 'kotaku', 'polygon',
      'pc gamer', 'eurogamer', 'skill up', 'acg', 'radbrad', 'the rad brad',
      // Extended signatures
      'ibai', 'rubius', 'vegetta777', 'elrubius', 'auronplay',
      'nick eh 30', 'nickeh30', 'sypherpk', 'fresh', 'lachlan',
      'coryxkenshin', 'dashiexp', 'dashiegames', 'sssniperwolf',
      'theradbrad', 'gamer tag', 'matpat', 'game theorists',
      'jaiden animations gaming', 'jschlatt', 'slimecicle', 'callmekevin',
      'rtgame', 'lets game it out', 'letsgameitout',
      'iron pineapple', 'vaatividya', 'prod', 'zanny', 'max0r',
      'blitz', 'brawl stars', 'supercell', 'clash royale',
      'mr fruit', 'fallout plays', 'aztecross', 'datto',
      'the act man', 'upper echelon gamers', 'bellular',
      'kinda funny games', 'easy allies', 'digital foundry gaming',
      'noclip', 'gameranx', 'whatculture gaming', 'outsidexbox', 'outsidextra',
      'stampylonghead', 'stampy', 'popularmmos', 'captainsparklez',
      'hermitcraft', 'grian', 'mumbo jumbo', 'bdoubleo100', 'ethoslab',
      'ibxtoycat', 'wadzee', 'philza', 'technoblade', 'ranboo',
      'epicnate315', 'theepicnate315', 'mathasgames',
    ],
    keywords: [
      'game', 'games', 'gaming', 'playthrough', 'walkthrough', 'gameplay',
      'streamer', 'twitch', 'steam', 'esports', 'speedrun', 'rpg',
      'fps', 'multiplayer', 'mod', 'roblox', 'fortnite', 'valorant',
      'league of legends', 'minecraft', 'gta', 'pokemon', 'zelda', 'overwatch',
      'counter-strike', 'apex legends', 'console', 'emulator', 'nintendo switch',
      'ps5', 'xbox series', 'boss fight', 'mmo', 'mmorpg', 'let\'s play',
      'elden ring', 'dark souls', 'baldur', 'diablo', 'warzone',
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
      // Extended signatures
      'the first take', 'colors', 'colors show', 'genius', 'genius lyrics',
      'rick beato', 'adam neely', 'andrew huang', 'roomie', 'roomieofficial',
      'jacob collier', 'marc rebillet', 'polyphonic', 'charles cornell',
      'nahre sol', 'sideways', 'david bennett piano', '12tone',
      'listening in', 'middle 8', 'mic the snare', 'todd in the shadows',
      'anthony fantano', 'theneedledrop', 'the needle drop', 'fantano',
      'classical mph', 'two set violin', 'twosetviolin', 'daniel thrasher',
      'samurai guitarist', 'signals music studio', 'paul davids',
      'music is win', 'andertons', 'sweetwater',
      'yt music', 'spotify', 'apple music', 'tidal',
    ],
    keywords: [
      'music', 'vevo', 'records', 'sound', 'audio', 'song', 'songs', 'band',
      'orchestra', 'beats', 'bass', 'lyrics', 'acoustic', 'remix', 'hiphop',
      'pop', 'rock', 'rap', 'dj', 'vocals', 'radio', 'track', 'concert',
      'album', 'melody', 'instrumental', 'jazz', 'lo-fi', 'lofi', 'trap',
      'guitar', 'piano', 'singer', 'chords', 'studio', 'synthesizer', 'official audio',
      'official video', 'lyric video', 'discography', 'mixtape', 'symphony', 'cover song',
      'karaoke', 'playlist', 'edm', 'classical', 'choir', 'composer',
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
      // Extended signatures
      'cody\'s lab', 'codyslab', 'styropyro', 'applied science',
      'technology connections', 'techmoan', 'big think', 'ted talks',
      'tedx talks', 'mit opencourseware', 'stanford', 'yale courses',
      'harvard', 'brilliant', 'the organic chemistry tutor', 'professor leonard',
      'professor dave explains', 'tibees', 'mathologer', 'matt parker',
      'zach star', 'flammable maths', 'blackpenredpen',
      'dr trefor bazett', 'dr. trefor bazett', 'michael penn',
      'history matters', 'feature history', 'kings and generals',
      'history with cy', 'fire of learning', 'overly sarcastic productions',
      'extra credits', 'extra history', 'historia civilis', 'invicta',
      'knowing better', 'sam o\'nella', 'sam onella', 'internet historian',
      'lemmino', 'aperture', 'exurb1a', 'vsauce2', 'vsauce3', 'michael stevens',
      'today i found out', 'infographics show', 'be smart', 'it\'s okay to be smart',
      'minuteearth', 'atlas pro', 'geography now', 'joe scott',
      'answers with joe', 'cool worlds', 'isaac arthur', 'event horizon',
      'dr becky', 'astrum', 'everyday astronaut', 'scott manley',
      'destin', 'smartereveryday', 'stuff made here',
    ],
    keywords: [
      'science', 'education', 'learn', 'course', 'academy', 'physics', 'math',
      'mathematics', 'chemistry', 'biology', 'history', 'space', 'astronomy', 'universe',
      'explained', 'lecture', 'documentary', 'demos', 'geography', 'tutorial',
      'philosophy', 'discovery', 'cosmos', 'curious', 'experiments', 'scientific',
      'quantum', 'gravity', 'evolution', 'anatomy', 'calculus', 'algebra', 'lesson',
      'exam', 'study', 'astrophysics', 'linguistics', 'psychology', 'sociology',
      'anthropology', 'archaeology', 'paleontology', 'ecology', 'geology',
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
      // Extended signatures
      'ryan trahan', 'airrack', 'yes theory', 'faze rug', 'faze clan',
      'david dobrik', 'emma chamberlain', 'safiya nygaard', 'jenna marbles',
      'h3h3productions', 'h3 podcast', 'ethan klein', 'idubbbz',
      'theodd1sout', 'jaiden animations', 'domics', 'swoozie',
      'casually explained', 'exurb1a', 'cgp grey',
      'penguinz0 clips', 'hasanabi', 'hasan piker',
      'chris ramsay', 'zach king', 'nigahiga', 'ryan higa',
      'lily singh', 'lilly singh', 'superwoman', 'jus reign',
      'looper', 'new rockstars', 'heavy spoilers', 'emergency awesome',
      'comic book cast', 'everything always', 'the cosmonaut variety hour',
      'ralphthemoviemaker', 'chris stuckmann', 'jeremy jahns',
      'yms', 'your movie sucks', 'i hate everything', 'cynical reviews',
      'nerdwriter', 'nerdwriter1', 'every frame a painting', 'lessons from the screenplay',
      'patrick h willems', 'thomas flight', 'just write',
      'captain midnight', 'like stories of old', 'storytellers',
    ],
    keywords: [
      'entertainment', 'comedy', 'vlog', 'vlogs', 'show', 'cinema', 'movie', 'movies',
      'film', 'films', 'podcast', 'funny', 'skit', 'reaction', 'drama', 'animation',
      'anime', 'cartoon', 'studios', 'interview', 'talk show', 'late night',
      'memes', 'hollywood', 'parody', 'acting', 'shorts', 'clips', 'bloopers',
      'episode', 'season', 'scene', 'trailer', 'teaser', 'stand-up', 'sketches',
      'commentary', 'video essay', 'tier list', 'ranking',
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
      // Extended signatures
      'the plain bagel', 'two cents', 'the financial diet', 'nerdwallet',
      'the dave ramsey show', 'dave ramsey', 'suze orman', 'the motley fool',
      'benzinga', 'yahoo finance', 'marketwatch', 'seeking alpha',
      'coin desk', 'crypto daily', 'bitboy crypto', 'sheldon evans',
      'biaheza', 'noah kagan', 'my first million', 'the hustle',
      'y combinator', 'a16z', 'naval ravikant', 'ycombinator',
      'the futur', 'chris do', 'alex hormozi', 'hormozi',
      'think media', 'roberto blake', 'vanessa lau',
      'ca rachana', 'zerodha', 'groww', 'moneycontrol',
      'economic times', 'business today', 'business insider',
    ],
    keywords: [
      'finance', 'money', 'business', 'invest', 'investing', 'investment', 'stocks', 'crypto',
      'bitcoin', 'ethereum', 'economy', 'wealth', 'market', 'startup', 'entrepreneur',
      'trading', 'real estate', 'bank', 'passive income', 'wall street', 'shares',
      'capital', 'dividends', 'portfolio', 'financial independence', 'personal finance',
      'budget', 'credit card', 'taxation', 'mutual funds', 'forex', 'side hustle',
      'saas', 'revenue', 'profit', 'growth hacking', 'ecommerce',
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
      // Extended signatures
      'noel deyzel', 'greg doucette', 'renaissance periodization', 'mike israetel',
      'jeremy ethier', 'blogilates', 'pamela reif', 'sydney cummings',
      'fitness blender', 'popsugar fitness', 'hasfit', 'yoga with adriene',
      'adriene mishler', 'boho beautiful', 'tom merrick', 'the bioneer',
      'strength side', 'anabolic aliens', 'buff dudes',
      'brian shaw', 'larry wheels', 'eddie hall', 'hafthor bjornsson',
      'cbum', 'chris bumstead', 'ronnie coleman', 'arnold schwarzenegger',
      'bleacher report', 'bt sport', 'dazn', 'the score',
      'jomboy media', 'jomboy', 'secret base', 'sb nation',
      'tifo football', 'tifo irl', 'footballia', 'copa90',
      'star sports', 'sony sports', 'hotstar cricket',
      'wilty', 'pat mcafee', 'the pat mcafee show',
    ],
    keywords: [
      'fitness', 'gym', 'workout', 'health', 'nutrition', 'bodybuilding',
      'diet', 'calisthenics', 'yoga', 'exercise', 'training', 'sports',
      'football', 'soccer', 'basketball', 'boxing', 'running', 'muscle',
      'athlete', 'crossfit', 'lifting', 'cardio', 'weight loss', 'hypertrophy',
      'cricket', 'mma', 'wrestling', 'tennis', 'badminton', 'physique',
      'marathon', 'triathlon', 'swimming', 'rugby', 'f1', 'motorsport',
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
      // Extended signatures
      'matt stonie', 'mark wiens', 'mikey chen', 'strictly dumpling',
      'best ever food review show', 'sonny side', 'worth it', 'buzzfeed video',
      'sorted food', 'food wishes', 'chef john', 'adam ragusea',
      'internet shaquille', 'pro home cooks', 'french cooking academy',
      'preppy kitchen', 'laura in the kitchen', 'maangchi',
      'marion\'s kitchen', 'chinese cooking demystified', 'souped up recipes',
      'yes i can cook', 'hebbar\'s kitchen', 'hebbars kitchen', 'rajshri food',
      'kunal kapur', 'vahchef', 'bharatzkitchen',
      'peter mckinnon', 'mango street', 'jessica kobeissi', 'the slanted lens',
      'thomas heaton', 'first we feast', 'hot ones',
      'the try guys', 'buzzfeed unsolved', 'watcher',
      'marie kondo', 'cleanmyspace', 'marie forleo',
      'donut media', 'donut', 'throttle house', 'savagegeese',
      'doug demuro', 'carwow', 'top gear', 'the grand tour',
      'jay leno garage', 'straight pipes', 'everyday driver',
    ],
    keywords: [
      'food', 'cook', 'cooking', 'recipe', 'recipes', 'kitchen', 'chef', 'travel',
      'adventure', 'trip', 'tour', 'lifestyle', 'house', 'interior design',
      'diy', 'craft', 'car', 'cars', 'automotive', 'motor', 'photography', 'art',
      'baking', 'restaurant', 'street food', 'eating', 'asmr', 'mukbang', 'grill',
      'culinary', 'woodworking', 'gardening', 'home improvement', 'renovation',
      'fashion', 'beauty', 'makeup', 'skincare', 'hairstyle',
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
      // Extended signatures
      'johnny harris', 'j.j. mccullough', 'tldr news', 'tldr daily',
      'visual politik', 'caspian report', 'good times bad times',
      'the daily show', 'last week tonight', 'john oliver', 'trevor noah',
      'bbc world service', 'channel 4 news', 'france 24 english',
      'euronews', 'nhk world', 'arirang', 'cgtn',
      'the atlantic', 'politico', 'axios', 'the hill',
      'breaking points', 'the majority report', 'secular talk',
      'pbs', 'pbs digital studios', 'frontline pbs',
      'gravitas wion', 'palki sharma', 'dhruv rathee', 'soch',
      'newslaundry', 'the lallantop', 'print',
    ],
    keywords: [
      'news', 'politics', 'journalism', 'breaking news',
      'commentary', 'current affairs', 'election', 'live news',
      'geopolitics', 'press conference', 'daily wire', 'daily beast',
      'huffpost', 'political', 'congress', 'parliament', 'government',
      'prime minister', 'president', 'foreign policy', 'diplomacy',
      'legislation', 'supreme court', 'policy', 'democracy',
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

// Pre-compile keyword regexes once at module init (eliminates ~60k regex compilations per run)
interface CompiledTaxonomy extends TaxonomyEntry {
  compiledKeywords: RegExp[];
  compiledSignatures: { clean: string; original: string }[];
}

const COMPILED_TAXONOMY: CompiledTaxonomy[] = SUBDECK_TAXONOMY.map(tax => ({
  ...tax,
  compiledKeywords: tax.keywords.map(kw => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i');
  }),
  compiledSignatures: (tax.exactSignatures || []).map(sig => ({
    clean: sig.toLowerCase().replace(/[^a-z0-9]/g, ''),
    original: sig.toLowerCase(),
  })),
}));

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

      for (const tax of COMPILED_TAXONOMY) {
        if (tax.id === 'general-other') continue;
        let score = 0;

        // 1. Direct Famous Signature Match (+250 points)
        // Short signatures (<5 chars) require exact match to prevent false positives
        for (const sig of tax.compiledSignatures) {
          const isShort = sig.clean.length < 5;
          if (isShort) {
            // Exact match only for short signatures (e.g., "ign", "ncs", "f1")
            if (
              titleLower === sig.original ||
              handleLower === sig.original ||
              cleanTitle === sig.clean ||
              cleanHandle === sig.clean
            ) {
              score += 250;
              break;
            }
          } else {
            if (
              titleLower === sig.original ||
              handleLower === sig.original ||
              cleanTitle === sig.clean ||
              cleanHandle === sig.clean
            ) {
              score += 250;
              break;
            }
          }
        }

        // 2. Word Boundary Matching on Title (+20 points per keyword match)
        for (let i = 0; i < tax.compiledKeywords.length; i++) {
          const regex = tax.compiledKeywords[i];
          const kw = tax.keywords[i];

          if (regex.test(titleLower)) {
            score += 20;
          } else if (regex.test(handleLower)) {
            score += 20; // Bumped from 15 → 20 (handles are equally descriptive)
          } else if (kw.includes(' ') && combined.includes(kw)) {
            score += 30;
          } else if (kw.length >= 4 && cleanHandle.includes(kw)) {
            score += 12;
          }
        }

        if (score > highestScore) {
          highestScore = score;
          bestCatId = tax.id;
        }
      }

      // Assign to winner if threshold met (>= 10 points, lowered from 12)
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

    // Return decks that contain channels
    return decks.filter(d => d.channelIds.length > 0);
  }
}
