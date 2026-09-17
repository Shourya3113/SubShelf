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
      'google', 'made by google', 'google developers', 'google earth', 'google cloud',
      'apple', 'apple explained', 'apple india', 'apple support', 'cs50', 'linus tech tips', 'the coding school',
      'fireship', 'mkbhd', 'marques brownlee', 'dave2d', 'traversy media', 'freecodecamp',
      'networkchuck', 'techlead', 'austin evans', 'jerryrigeverything', 'computerphile',
      'lex fridman', 'web dev simplified', 'kevin powell', 'academind', 'programming with mosh',
      'clever programmer', 'theo - t3.gg', 'primeagen', 'the primeagen', 'george hotz', 'the verge',
      'verge', 'engadget', 'techcrunch', 'android authority', 'macrumors', '9to5mac', '9to5google',
      'mrwhosetheboss', 'tech burner', 'beebom', 'geekyranjit', 'ltt', 'shortcircuit', 'hardware canucks',
      'pauls hardware', 'bytebytego', 'hussein nasser', 'arjancodes', 'nick ackerman',
      'tech with tim', 'corey schafer', 'sentdex', 'derek banas', 'john savill', 'jeff geerling',
      'craft computing', 'retro man cave', 'ben eater', 'veritasium tech', 'mkbhd clips',
      'waveform', 'mister mobile', 'snazzy labs', 'jonathan morrison', 'flossy carter',
      'microsoft', 'microsoft developer', 'tesla', 'openai', 'anthropic', 'meta', 'nvidia',
      // Extended signatures
      'unbox therapy', 'techlinked', 'tech linked', 'linus media group', 'techquickie',
      'digital foundry', 'joma tech', 'techaltar', 'tailosive tech', 'sara dietschy',
      'karl conrad', 'ijustine', 'justine ezarik', 'booredatwork', 'supersaf',
      'phone arena', 'gsmarena', 'sam beckman', 'matthewmoniz', 'matthew moniz',
      'tld', 'techlinked daily', 'tech with nana', 'nana janashia', 'bro code',
      'coder coder', 'the net ninja', 'developedbyed', 'jack herrington',
      'james q quick', 'brad traversy', 'techworld with nana', 'continuous delivery',
      'code with antonio', 'the coding train', 'coding garden', 'code with harry',
      'apna college', 'love babbar', 'striver', 'take u forward', 'pepcoding',
      'neetcode', 'neetcodeio', 'techdose', 'errichto', 'william lin',
      'clément mihailescu', 'clement mihailescu', 'tech with lucy',
      'github', 'visual studio code', 'android developers',
      'apple developer', 'aws', 'amazon web services',
      'google cloud tech', 'hashicorp', 'docker', 'kubernetes',
      'dave lee', 'arun maini',
      'ishan agarwal', 'technical guruji', 'techbar', 'trakin tech', 'c4etech',
      'geeky ranjit', 'technical sagar', 'tech with sagar', 'gadgets 360',
      'stuff made here', 'simone giertz', 'coldfusion', 'cold fusion',
    ],
    keywords: [
      'tech', 'technology', 'code', 'coding', 'programmer', 'programming', 'developer', 'development',
      'software', 'hardware', 'computer', 'computing', 'algorithm', 'algorithms',
      'linux', 'python', 'javascript', 'typescript', 'rust', 'react', 'reactjs', 'web dev', 'web development',
      'frontend', 'backend', 'fullstack', 'devops', 'ai', 'artificial intelligence',
      'machine learning', 'deep learning', 'llm', 'neural', 'cybersecurity', 'hacking', 'security',
      'engineering', 'intel', 'amd', 'nvidia', 'setup', 'server', 'terminal',
      'cloud', 'aws', 'azure', 'data science', 'github', 'macos', 'ios',
      'android', 'smartphone', 'benchmark', 'overclock', 'pc build', 'tech review',
      'unboxing', 'teardown', 'gadgets', 'gadget', 'robotics', 'sysadmin', 'kubernetes', 'docker', 'git',
      'sql', 'database', 'dev', 'semiconductor', 'leetcode', 'dsa', 'api', 'rest api', 'graphql',
      'nextjs', 'nodejs', 'vue', 'svelte', 'flutter', 'swift', 'kotlin', 'java', 'golang', 'c++',
      'mobile app',
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
      'game theory', 'game theorists', 'matpat', 'nintendo', 'nintendo of america',
      'playstation', 'xbox', 'call of duty', 'minecraft',
      'valve', 'riot games', 'rockstar games', 'ubisoft', 'ea sports', 'gamers nexus',
      'total gaming', 'carryislive', 'dynamo gaming', 'mortal', 'techno gamerz', 'mythpat gaming',
      'typical gamer', 'ali-a', 'lazarbeam', 'ludwig', 'moistcritikal', 'penguinz0',
      'xqc', 'sykkuno', 'valkyrae', 'timthetatman', 'dr disrespect', 'videogamedunkey',
      'dunkey', 'scott the woz', 'spawn wave', 'angryjoeshow', 'kotaku', 'polygon',
      'pc gamer', 'eurogamer', 'skill up', 'acg', 'radbrad', 'the rad brad', 'theradbrad',
      'gameranx', 'digital foundry', 'noclip', 'supercell', 'clash royale', 'brawl stars',
      // Extended signatures
      'ibai', 'rubius', 'vegetta777', 'elrubius', 'auronplay',
      'nick eh 30', 'nickeh30', 'sypherpk', 'fresh', 'lachlan',
      'coryxkenshin', 'dashiexp', 'dashiegames', 'sssniperwolf',
      'gamer tag',
      'jaiden animations gaming', 'jschlatt', 'slimecicle', 'callmekevin',
      'rtgame', 'lets game it out', 'letsgameitout',
      'iron pineapple', 'vaatividya', 'prod', 'zanny', 'max0r',
      'blitz', 'mr fruit', 'fallout plays', 'aztecross', 'datto',
      'the act man', 'upper echelon gamers', 'bellular',
      'kinda funny games', 'easy allies',
      'whatculture gaming', 'outsidexbox', 'outsidextra',
      'stampylonghead', 'stampy', 'popularmmos', 'captainsparklez',
      'hermitcraft', 'grian', 'mumbo jumbo', 'bdoubleo100', 'ethoslab',
      'ibxtoycat', 'wadzee', 'philza', 'technoblade', 'ranboo',
      'epicnate315', 'theepicnate315', 'mathasgames',
    ],
    keywords: [
      'game', 'games', 'gaming', 'gamer', 'gameplay', 'playthrough', 'walkthrough',
      'let\'s play', 'lets play', 'streamer', 'twitch', 'steam', 'esports',
      'speedrun', 'speedrunning', 'rpg', 'fps', 'multiplayer', 'mod', 'mods',
      'modding', 'roblox', 'fortnite', 'valorant', 'league of legends', 'minecraft',
      'gta', 'pokemon', 'zelda', 'overwatch', 'counter-strike', 'csgo', 'cs2',
      'apex legends', 'console', 'emulator', 'nintendo switch', 'ps5', 'ps4',
      'xbox series', 'boss fight', 'mmo', 'mmorpg', 'elden ring', 'dark souls',
      'baldur', 'diablo', 'warzone',
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
      'trap nation', 'monstercat', 'lofi girl', 'lofigirl', 'taylor swift', 'ed sheeran', 'drake',
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
      'music', 'musical', 'musician', 'vevo', 'records', 'sound', 'audio', 'song', 'songs',
      'band', 'orchestra', 'beats', 'bass', 'lyrics', 'lyric', 'acoustic', 'remix', 'remixes',
      'hiphop', 'hip hop', 'pop', 'rock', 'rap', 'rapper', 'dj', 'vocals', 'radio',
      'track', 'tracks', 'concert', 'album', 'melody', 'instrumental', 'jazz',
      'lo-fi', 'lofi', 'trap', 'guitar', 'piano', 'drums', 'singer', 'chords',
      'studio', 'synthesizer', 'official audio', 'official video', 'lyric video',
      'discography', 'mixtape', 'symphony', 'cover song', 'karaoke', 'playlist',
      'edm', 'classical', 'choir', 'composer',
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
      'scishow', 'national geographic', 'nat geo', 'nasa', 'minutephysics', 'minute earth',
      'real engineering', 'practical engineering', 'wendover productions', 'wendover',
      'half as interesting', 'reallifelore', 'khan academy', 'oversimplified', 'mark rober',
      'action lab', 'the action lab', 'electroboom', 'stand-up maths', 'standupmaths',
      'physics wallah', 'unacademy', 'byjus', 'aman dhattarwal', 'apni kaksha',
      'dear sir', 'magnet brains', 'crash course', 'periodic videos', 'deep sky videos',
      'sixty symbols', 'tom scott', 'anton petrov', 'sabine hossenfelder', 'pbs space time',
      'pbs spacetime', 'pbs eons', 'asapscience', 'tierzoo', 'kurzgesagt – in a nutshell',
      'steve mould', 'nilered', 'nileblue', 'two minute papers', 'everyday astronaut',
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
      'atlas pro', 'geography now', 'joe scott',
      'answers with joe', 'cool worlds', 'isaac arthur', 'event horizon',
      'dr becky', 'astrum', 'scott manley',
      'destin', 'smartereveryday',
    ],
    keywords: [
      'science', 'education', 'educational', 'learn', 'learning', 'course', 'academy',
      'physics', 'math', 'mathematics', 'chemistry', 'biology', 'history', 'space',
      'astronomy', 'universe', 'galaxy', 'planets', 'explained', 'explanation', 'lecture',
      'documentary', 'demos', 'geography', 'tutorial', 'philosophy', 'discovery',
      'cosmos', 'curious', 'experiments', 'scientific', 'quantum', 'gravity',
      'evolution', 'anatomy', 'calculus', 'algebra', 'lesson', 'exam', 'study',
      'astrophysics', 'linguistics', 'psychology', 'sociology', 'anthropology',
      'archaeology', 'paleontology', 'ecology', 'geology', 'neuroscience', 'genetics',
    ],
  },
  {
    id: 'entertainment',
    name: 'Entertainment & Media',
    icon: '🍿',
    color: '#F59E0B',
    exactSignatures: [
      'marvel', 'marvel studios', 'marvel entertainment', 'sony pictures entertainment',
      'sony pictures', 'warner bros', 'universal pictures', 'disney', 'walt disney',
      'netflix', 'a24', 'rotten tomatoes', 'cinemasins', 'cinema sins', 'screen junkies',
      'screen rant', 'screenrant', 'watchmojo', 'jimmy kimmel', 'the tonight show',
      'saturday night live', 'snl', 'dude perfect', 'mrbeast', 'mr beast',
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
      'casually explained', 'cgp grey',
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
      'entertainment', 'entertaining', 'comedy', 'comedian', 'comic', 'vlog', 'vlogs',
      'vlogger', 'daily vlog', 'show', 'cinema', 'movie', 'movies', 'film', 'films',
      'podcast', 'podcasts', 'funny', 'fun', 'humor', 'humour', 'skit', 'skits',
      'sketches', 'sketch', 'reaction', 'reactions', 'drama', 'animation', 'animated',
      'anime', 'cartoon', 'studios', 'interview', 'talk show', 'late night',
      'memes', 'meme', 'hollywood', 'parody', 'acting', 'shorts', 'clips', 'bloopers',
      'episode', 'season', 'scene', 'trailer', 'teaser', 'stand-up', 'standup',
      'commentary', 'video essay', 'tier list', 'ranking',
    ],
  },
  {
    id: 'finance-crypto',
    name: 'Finance & Business',
    icon: '📈',
    color: '#059669',
    exactSignatures: [
      'bloomberg markets', 'bloomberg finance', 'cnbc', 'forbes', 'financial times',
      'wall street journal', 'wsj markets', 'graham stephan', 'andrei jikh', 'ali abdaal',
      'meet kevin', 'mark tilbury', 'minority mindset', 'coin bureau', 'investopedia',
      'ankur warikoo', 'rachana ranade', 'ca rachana ranade', 'pranjal kamra',
      'akshat shrivastava', 'labour law advisor', 'lla', 'asset yogi', 'finology legal',
      'shark tank', 'shark tank india', 'garyvee', 'patrick bet-david', 'valuetainment',
      'the plain bagel', 'two cents', 'the financial diet', 'nerdwallet', 'dave ramsey',
      'the dave ramsey show', 'suze orman', 'the motley fool', 'benzinga', 'yahoo finance',
      'marketwatch', 'seeking alpha', 'coindesk', 'coin desk', 'crypto daily',
      'bitboy crypto', 'biaheza', 'noah kagan', 'my first million', 'the hustle',
      'y combinator', 'ycombinator', 'a16z', 'naval', 'naval ravikant', 'the futur',
      'chris do', 'alex hormozi', 'hormozi', 'think media', 'zerodha', 'groww',
      'moneycontrol', 'economic times', 'business today', 'business insider',
      'patrick boyle', 'ben felix', 'whiteboard finance', 'the swedish investor',
      'clearvalue tax', 'ramit sethi', 'i will teach you to be rich',
    ],
    keywords: [
      'finance', 'financial', 'money', 'business', 'invest', 'investing', 'investment',
      'investor', 'stocks', 'stock market', 'crypto', 'cryptocurrency', 'bitcoin', 'btc',
      'ethereum', 'eth', 'altcoin', 'blockchain', 'economy', 'economic', 'economics',
      'wealth', 'market', 'markets', 'startup', 'startups', 'entrepreneur', 'entrepreneurship',
      'trading', 'trader', 'day trading', 'options', 'real estate', 'bank', 'banking',
      'passive income', 'wall street', 'shares', 'shareholder', 'capital', 'venture capital',
      'dividends', 'portfolio', 'financial independence', 'fire', 'personal finance',
      'budget', 'budgeting', 'credit card', 'taxation', 'taxes', 'mutual funds',
      'etf', 'index funds', 'forex', 'side hustle', 'saas', 'revenue', 'profit',
      'ecommerce', 'debt', 'compound interest', 'net worth', 'valuation',
    ],
  },
  {
    id: 'fitness-sports',
    name: 'Fitness & Sports',
    icon: '💪',
    color: '#EF4444',
    exactSignatures: [
      'ufc', 'nba', 'fifa', 'premier league', 'wwe', 'olympics', 'red bull', 'redbull',
      'espn', 'sky sports', 'formula 1', 'formula one', 'f1', 'nfl', 'mlb', 'nhl',
      'chris heria', 'jeff nippard', 'athlean-x', 'athleanx', 'chloe ting',
      'calisthenics movement', 'bodybuilding.com', 'noel deyzel', 'greg doucette',
      'renaissance periodization', 'mike israetel', 'jeremy ethier', 'yoga with adriene',
      'cbum', 'chris bumstead', 'ronnie coleman', 'arnold schwarzenegger',
      'bleacher report', 'dazn', 'tifo football', 'pat mcafee', 'thenx', 'hybrid calisthenics',
      'cricket australia', 'icc', 'bcci', 'guru mann', 'rohit khatri', 'jeet selal',
      // Extended signatures
      'blogilates', 'pamela reif', 'sydney cummings',
      'fitness blender', 'popsugar fitness', 'hasfit',
      'adriene mishler', 'boho beautiful', 'tom merrick', 'the bioneer',
      'strength side', 'anabolic aliens', 'buff dudes',
      'brian shaw', 'larry wheels', 'eddie hall', 'hafthor bjornsson',
      'bt sport', 'the score',
      'jomboy media', 'jomboy', 'secret base', 'sb nation',
      'tifo irl', 'footballia', 'copa90',
      'star sports', 'sony sports', 'hotstar cricket',
      'wilty', 'the pat mcafee show',
    ],
    keywords: [
      'fitness', 'gym', 'workout', 'health', 'healthy', 'nutrition', 'bodybuilding',
      'bodybuilder', 'diet', 'calisthenics', 'yoga', 'exercise', 'exercises', 'training',
      'trainer', 'sports', 'sport', 'athlete', 'athletic', 'football', 'soccer',
      'basketball', 'boxing', 'boxer', 'mma', 'wrestling', 'running', 'runner',
      'muscle', 'lifting', 'powerlifting', 'weightlifting', 'cardio', 'weight loss',
      'fat loss', 'hypertrophy', 'cricket', 'tennis', 'badminton', 'physique',
      'marathon', 'triathlon', 'swimming', 'rugby', 'f1', 'motorsport', 'racing',
      'bike', 'cycling',
    ],
  },
  {
    id: 'lifestyle-food',
    name: 'Food & Lifestyle',
    icon: '🍳',
    color: '#D97706',
    exactSignatures: [
      'gordon ramsay', 'jamie oliver', 'babish culinary universe', 'binging with babish',
      'babish', 'joshua weissman', 'bon appetit', 'tasty', 'buzzfeed tasty',
      'architectural digest', 'uncle roger', 'nigel ng', 'epicurious',
      'america\'s test kitchen', 'americas test kitchen', 'best ever food review show',
      'mark wiens', 'sonny side', 'sorted food', 'food wishes', 'adam ragusea',
      'maangchi', 'first we feast', 'hot ones', 'the try guys', 'donut media', 'donut',
      'throttle house', 'doug demuro', 'carwow', 'top gear', 'the grand tour',
      'casey neistat', 'peter mckinnon', 'marie kondo', 'food insider', 'proko',
      'ranveer brar', 'sanjeev kapoor', 'kabitas kitchen', 'nisha madhulika',
      'village cooking channel',
      // Extended signatures
      'matt stonie', 'mikey chen', 'strictly dumpling',
      'worth it', 'buzzfeed video', 'chef john',
      'internet shaquille', 'pro home cooks', 'french cooking academy',
      'preppy kitchen', 'laura in the kitchen',
      'marion\'s kitchen', 'chinese cooking demystified', 'souped up recipes',
      'yes i can cook', 'hebbar\'s kitchen', 'hebbars kitchen', 'rajshri food',
      'kunal kapur', 'vahchef', 'bharatzkitchen',
      'mango street', 'jessica kobeissi', 'the slanted lens',
      'thomas heaton', 'buzzfeed unsolved', 'watcher',
      'cleanmyspace', 'marie forleo',
      'savagegeese', 'jay leno garage', 'straight pipes', 'everyday driver',
    ],
    keywords: [
      'food', 'foodie', 'cook', 'cooking', 'recipe', 'recipes', 'kitchen', 'chef',
      'bake', 'baking', 'bakery', 'travel', 'traveler', 'traveling', 'adventure',
      'trip', 'tour', 'lifestyle', 'house', 'home', 'interior design', 'architecture',
      'room tour', 'diy', 'craft', 'crafts', 'crafting', 'car', 'cars', 'automotive',
      'automobile', 'motor', 'vehicle', 'driving', 'supercar', 'photography',
      'photographer', 'photo', 'camera', 'art', 'artist', 'painting', 'drawing',
      'restaurant', 'street food', 'eating', 'asmr', 'mukbang', 'grill', 'grilling',
      'bbq', 'culinary', 'woodworking', 'gardening', 'garden', 'plants', 'renovation',
      'fashion', 'beauty', 'makeup', 'skincare', 'cosmetics', 'style', 'coffee', 'cafe',
    ],
  },
  {
    id: 'news-politics',
    name: 'News & Politics',
    icon: '📰',
    color: '#6366F1',
    exactSignatures: [
      'bbc', 'bbc news', 'bbc world service', 'cnn', 'cnn international', 'fox', 'fox news',
      'fox business', 'msnbc', 'vox', 'the new york times', 'nyt', 'the wall street journal',
      'wsj', 'reuters', 'bloomberg', 'bloomberg quicktake', 'vice news', 'al jazeera',
      'the guardian', 'pbs newshour', 'abc news', 'sky news', 'dw news', 'washington post',
      'the washington post', 'new york post', 'daily news', 'associated press', 'ap', 'ap archive',
      'the economist', 'nbc news', 'cbs news', 'euronews', 'france 24', 'channel 4 news',
      'ndtv', 'india today', 'aaj tak', 'zee news', 'abp news', 'republic world', 'wion',
      'firstpost', 'the print', 'the wire', 'quint',
      // Extended signatures
      'johnny harris', 'j.j. mccullough', 'tldr news', 'tldr daily',
      'visual politik', 'caspian report', 'good times bad times',
      'the daily show', 'last week tonight', 'john oliver', 'trevor noah',
      'nhk world', 'arirang', 'cgtn',
      'the atlantic', 'politico', 'axios', 'the hill',
      'breaking points', 'the majority report', 'secular talk',
      'pbs', 'pbs digital studios', 'frontline pbs',
      'gravitas wion', 'palki sharma', 'dhruv rathee', 'soch', 'soch by mohak mangal',
      'newslaundry', 'the lallantop', 'print',
    ],
    keywords: [
      'news', 'politics', 'political', 'geopolitics', 'journalism', 'journalist',
      'breaking news', 'current affairs', 'election', 'elections', 'live news',
      'press conference', 'congress', 'parliament', 'government', 'prime minister',
      'president', 'supreme court', 'foreign policy', 'diplomacy', 'policy', 'senate',
      'legislation', 'democracy', 'international affairs', 'world affairs', 'war',
      'conflict', 'investigation', 'investigative', 'report', 'reporter', 'anchor',
      'headline', 'dispatch', 'daily wire', 'daily beast', 'huffpost', 'commentary',
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

export function tokenizeWords(str: string): string[] {
  if (!str) return [];
  let s = str.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  s = s.replace(/([a-zA-Z])([0-9])/g, '$1 $2');
  s = s.replace(/([0-9])([a-zA-Z])/g, '$1 $2');
  s = s.replace(/[^a-zA-Z0-9]/g, ' ');
  return s.toLowerCase().split(/\s+/).filter(Boolean);
}

// Pre-compile regexes once at module init
interface CompiledSignature {
  original: string;
  clean: string;
  regex: RegExp;
}

interface CompiledKeyword {
  original: string;
  clean: string;
  isMultiWord: boolean;
  regex: RegExp;
}

interface CompiledTaxonomy extends TaxonomyEntry {
  compiledKeywords: CompiledKeyword[];
  compiledSignatures: CompiledSignature[];
}

const COMPILED_TAXONOMY: CompiledTaxonomy[] = SUBDECK_TAXONOMY.map(tax => ({
  ...tax,
  compiledSignatures: (tax.exactSignatures || []).map(sig => ({
    original: sig.toLowerCase().trim(),
    clean: sig.toLowerCase().replace(/[^a-z0-9]/g, ''),
    regex: new RegExp(`\\b${sig.toLowerCase().trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
  })),
  compiledKeywords: tax.keywords.map(kw => ({
    original: kw.toLowerCase().trim(),
    clean: kw.toLowerCase().replace(/[^a-z0-9]/g, ''),
    isMultiWord: kw.includes(' '),
    regex: new RegExp(`\\b${kw.toLowerCase().trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
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

      const titleTokens = tokenizeWords(ch.title).join(' ');
      const handleTokens = tokenizeWords(ch.handle || '').join(' ');
      const combinedTokens = `${titleTokens} ${handleTokens} ${titleLower} ${handleLower}`;

      let bestCatId: string | null = null;
      let highestScore = 0;

      for (const tax of COMPILED_TAXONOMY) {
        if (tax.id === 'general-other') continue;
        let score = 0;

        // 1. Signature Matching
        for (const sig of tax.compiledSignatures) {
          // Exact signature match (+350 points)
          if (
            titleLower === sig.original ||
            handleLower === sig.original ||
            cleanTitle === sig.clean ||
            cleanHandle === sig.clean
          ) {
            score += 350;
            break;
          }

          // Word-boundary / phrase signature match (+280 points)
          if (
            sig.regex.test(combinedTokens) ||
            sig.regex.test(titleLower) ||
            sig.regex.test(handleLower)
          ) {
            score += 280;
            break;
          }

          // Substring match for long distinct creator names/brands (>= 5 chars)
          if (
            sig.clean.length >= 5 &&
            (cleanTitle.includes(sig.clean) || cleanHandle.includes(sig.clean))
          ) {
            score += 280;
            break;
          }
        }

        // 2. Keyword Matching
        for (const kw of tax.compiledKeywords) {
          if (kw.isMultiWord) {
            if (combinedTokens.includes(kw.original) || titleLower.includes(kw.original)) {
              score += 45;
            }
          } else {
            if (kw.regex.test(titleTokens) || kw.regex.test(titleLower)) {
              score += 25;
            } else if (kw.regex.test(handleTokens) || kw.regex.test(handleLower)) {
              score += 20;
            } else if (
              kw.clean.length >= 4 &&
              (cleanTitle.includes(kw.clean) || cleanHandle.includes(kw.clean))
            ) {
              score += 12;
            }
          }
        }

        if (score > highestScore) {
          highestScore = score;
          bestCatId = tax.id;
        }
      }

      // Assign to winner if threshold met (>= 15 points)
      if (bestCatId && highestScore >= 15) {
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
