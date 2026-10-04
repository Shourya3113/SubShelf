import { SubscribedChannel, CategoryDeck } from '@/types';
import { isSystemChannelOrCurator } from '@/utils/systemChannels';

export interface TaxonomyEntry {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  keywords: string[];
  exactSignatures?: string[];
}

export const SUBDECK_TAXONOMY: TaxonomyEntry[] = [
  {
    id: 'tech-coding',
    name: 'Tech & Coding',
    icon: '💻',
    color: '#3B82F6',
    description: 'Software development, programming languages, web and mobile dev, AI/ML, cloud, DevOps, PC hardware, smartphones, cybersecurity, and consumer tech reviews.',
    exactSignatures: [
      // Major Tech Titans & Platforms
      'google', 'made by google', 'google developers', 'google earth', 'google cloud', 'google cloud tech',
      'apple', 'apple explained', 'apple india', 'apple support', 'apple developer', 'appleinsider', 'apple insider',
      'microsoft', 'microsoft developer', 'microsoft ignite', 'windows developer',
      'github', 'visual studio code', 'vscode', 'android developers', 'android authority', 'android central',
      'aws', 'amazon web services', 'docker', 'kubernetes', 'hashicorp', 'linux foundation',
      'openai', 'anthropic', 'meta open source', 'nvidia', 'nvidia developer', 'intel', 'amd',
      'raspberry pi', 'arduino', 'arduino official', 'qualcomm', 'arm', 'canonical ubuntu', 'red hat',
      // Influential Programmers & Educators
      'cs50', 'david malan', 'freecodecamp', 'freecodecamp.org', 'traversy media', 'brad traversy',
      'fireship', 'fireship.io', 'the primeagen', 'primeagen', 'theo - t3.gg', 't3 dot gg', 't3gg',
      'web dev simplified', 'kevin powell', 'academind', 'maximilian schwarzmüller',
      'programming with mosh', 'mosh hamedani', 'clever programmer', 'george hotz', 'geohot',
      'lex fridman', 'lex fridman podcast', 'networkchuck', 'techlead', 'joma tech', 'joma',
      'bytebytego', 'alex xu', 'hussein nasser', 'arjancodes', 'tech with tim', 'corey schafer',
      'sentdex', 'derek banas', 'john savill', 'jeff geerling', 'craft computing', 'retro man cave',
      'ben eater', 'computerphile', 'sebastian lague', 'daniel shiffman', 'the coding train',
      'coding garden', 'cj coding garden', 'bro code', 'coder coder', 'the net ninja', 'developedbyed',
      'jack herrington', 'james q quick', 'tech with nana', 'techworld with nana', 'nana janashia',
      'continuous delivery', 'dave farley', 'code with antonio', 'code with harry', 'apna college',
      'love babbar', 'striver', 'take u forward', 'takeuforward', 'pepcoding', 'neetcode', 'neetcodeio',
      'techdose', 'errichto', 'william lin', 'clément mihailescu', 'clement mihailescu', 'algoexpert',
      'tech with lucy', 'kalle hallden', 'nick chapsas', 'tim corey', 'iamtimcorey', 'javidx9',
      'the cherno', 'low level learning', 'lowlevellearning', 'edureka', 'simplilearn', 'programmingknowledge',
      'amigoscode', 'patrick collins', 'dapp university', 'moralis web3',
      // Hardware, PC Building & Deep Tech
      'linus tech tips', 'linus media group', 'ltt', 'shortcircuit', 'techquickie', 'techlinked', 'tech linked',
      'gamers nexus', 'gamersnexus', 'steve burke', 'hardware unboxed', 'hardware canucks', 'hardwarecanucks',
      'paul\'s hardware', 'pauls hardware', 'jayztwocents', 'jayz two cents', 'bitwit', 'der8auer',
      'optimum tech', 'optimum', 'level1techs', 'level 1 techs', 'wendell',
      'digital foundry', 'stuff made here', 'simone giertz', 'coldfusion', 'cold fusion',
      'techmoan', 'technology connections', 'nostalgia nerd', 'the 8-bit guy', '8-bit guy', 'lgr',
      'lazy game reviews', 'adrian\'s digital basement', 'curiousmarc',
      // Consumer Tech Reviewers & News Outlets
      'mkbhd', 'marques brownlee', 'mkbhd clips', 'waveform', 'waveform podcast', 'dave2d', 'dave lee',
      'austin evans', 'jerryrigeverything', 'zack nelson', 'mrwhosetheboss', 'arun maini',
      'unbox therapy', 'lewis hilsenteger', 'supersaf', 'safwan ahmedmia', 'uravgconsumer', 'judner aura',
      'snazzy labs', 'quinn nelson', 'jonathan morrison', 'flossy carter', 'michael fisher', 'mr mobile', 'mrmobile',
      'tailosive tech', 'zoneoftech', 'zone of tech', 'sara dietschy', 'karl conrad', 'ijustine', 'justine ezarik',
      'sam beckman', 'matthew moniz', 'matthewmoniz', 'the verge', 'verge', 'engadget', 'techcrunch',
      'cnet', 'zdnet', 'wired', 'ars technica', 'tom\'s hardware', 'tomshardware', 'anandtech', 'digital trends',
      'macrumors', '9to5mac', '9to5google', 'gsmarena', 'phone arena', 'pocketnow',
      // Regional Tech Authorities
      'tech burner', 'shlok srivastava', 'beebom', 'geekyranjit', 'ranjit kumar', 'technical guruji',
      'gaurav chaudhary', 'techbar', 'trakin tech', 'c4etech', 'technical sagar', 'gadgets 360',
      'ishan agarwal', 'tech altar', 'techaltar',
    ],
    keywords: [
      'tech', 'technology', 'code', 'coding', 'programmer', 'programming', 'developer', 'development',
      'software', 'hardware', 'computer', 'computing', 'algorithm', 'algorithms',
      'linux', 'python', 'javascript', 'typescript', 'rust', 'rustlang', 'golang', 'go lang',
      'react', 'reactjs', 'angular', 'vue', 'vuejs', 'svelte', 'sveltekit', 'nextjs', 'next.js',
      'nuxtjs', 'web dev', 'web development', 'frontend', 'backend', 'fullstack', 'full stack',
      'devops', 'ai', 'artificial intelligence', 'machine learning', 'deep learning', 'llm',
      'large language model', 'neural network', 'generative ai', 'chatgpt', 'cybersecurity',
      'hacking', 'ethical hacking', 'infosec', 'penetration testing', 'engineering',
      'intel', 'amd', 'nvidia', 'gpu', 'cpu', 'processor', 'motherboard', 'pc build', 'custom pc',
      'setup', 'server', 'terminal', 'bash', 'shell', 'zsh', 'cloud', 'aws', 'azure', 'gcp',
      'data science', 'pandas', 'pytorch', 'tensorflow', 'github', 'git', 'gitlab', 'macos',
      'ios', 'android', 'smartphone', 'flagship', 'benchmark', 'overclocking', 'overclock',
      'tech review', 'gadgets', 'gadget', 'robotics', 'arduino', 'raspberry pi', 'microcontroller',
      'sysadmin', 'kubernetes', 'k8s', 'docker', 'containerization', 'sql', 'nosql', 'postgres',
      'mongodb', 'redis', 'database', 'semiconductor', 'transistor', 'tsmc', 'leetcode', 'dsa',
      'data structures', 'api', 'rest api', 'graphql', 'grpc', 'flutter', 'swift', 'swiftui',
      'kotlin', 'jetpack compose', 'java', 'c++', 'cpp', 'c#', 'dotnet', '.net', 'unboxing',
      'teardown', 'firmware', 'open source', 'foss', 'embedded', 'clean code', 'refactoring',
      'unit testing', 'ci cd', 'monorepo', 'microservices', 'cloud native',
    ],
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: '🎮',
    color: '#10B981',
    description: 'Video games, walkthroughs, Let\'s Plays, esports tournaments, live game streaming, speedruns, gaming news, game lore, and console gaming.',
    exactSignatures: [
      // Global Gaming Icons & Streamers
      'pewdiepie', 'markiplier', 'jacksepticeye', 'dantdm', 'ninja', 'shroud', 'pokimane',
      'dream', 'tommyinnit', 'georgenotfound', 'sapnap', 'asmongold', 'zackrawrr',
      'ludwig', 'ludwig ahgren', 'moistcritikal', 'penguinz0', 'xqc', 'xqcow',
      'sykkuno', 'valkyrae', 'timthetatman', 'dr disrespect', 'drdisrespect',
      'coryxkenshin', 'dashiegames', 'dashiexp', 'sssniperwolf', 'ali-a', 'alia',
      'typical gamer', 'lazarbeam', 'fresh', 'lachlan', 'muselk', 'nick eh 30', 'nickeh30',
      'sypherpk', 'loserfruit', 'tfue', 'summit1g', 'tarik', 'kyedae', 'tenz',
      'disguised toast', 'lilypichu', 'callmekevin', 'rtgame', 'rt game',
      'lets game it out', 'letsgameitout', 'graystillplays', 'modest pelican', 'spiffing brit',
      'the spiffing brit', 'ambiguousamphibian', 'josh lets game it out',
      // Game Journalism, Reviews & Lore
      'ign', 'gamespot', 'game theory', 'game theorists', 'matpat', 'the game theorists',
      'videogamedunkey', 'dunkey', 'scott the woz', 'scottthewoz', 'spawn wave', 'spawnwave',
      'angryjoeshow', 'angry joe', 'kotaku', 'polygon', 'pc gamer', 'eurogamer', 'skill up',
      'skillup', 'acg', 'angrycentaurgaming', 'radbrad', 'the rad brad', 'theradbrad',
      'gameranx', 'before you buy', 'digital foundry', 'noclip', 'vaatividya', 'iron pineapple',
      'max0r', 'zanny', 'prod', 'the act man', 'theactman', 'upper echelon gamers',
      'bellular', 'bellular news', 'bellular gaming', 'kinda funny games', 'easy allies',
      'whatculture gaming', 'outsidexbox', 'outsidextra', 'jackfrags', 'drift0r', 'xclusiveace',
      // Minecraft, Sandbox & Indie Communities
      'hermitcraft', 'grian', 'mumbo jumbo', 'mumbojumbo', 'bdoubleo100', 'ethoslab',
      'goodtimeswithscar', 'keralis', 'iskall85', 'rendog', 'docm77', 'tango tek',
      'stampylonghead', 'stampy', 'popularmmos', 'captainsparklez', 'sparklez',
      'ibxtoycat', 'wadzee', 'philza', 'technoblade', 'ranboo', 'tubbo', 'quackity',
      'fundy', 'wilbur soot', 'skeppy', 'aphmau', 'ldshadowlady', 'smallishbeans',
      'ssundee', 'crainer', 'jelly', 'slogoman', 'kwebbelkop',
      // Regional & International Powerhouses
      'total gaming', 'ajay total gaming', 'carryislive', 'dynamo gaming', 'mortal',
      'scoutop', 'techno gamerz', 'ujjwal techno gamerz', 'mythpat gaming', 'payal gaming',
      'gamerfleet', 'anshu bisht', 'lokesh gamer', 'gyan gaming', 'a-s gaming', 'as gaming',
      'desigamers', 'two side gamers', 'ibai', 'ibai llanos', 'rubius', 'elrubius', 'elrubiusomg',
      'vegetta777', 'auronplay', 'auron', 'thegrefg', 'willyrex', 'mikecrack',
      // Publishers & Official Franchises
      'nintendo', 'nintendo of america', 'playstation', 'xbox', 'valve', 'riot games',
      'rockstar games', 'ubisoft', 'ea sports', 'activision', 'blizzard', 'bethesda',
      'capcom', 'square enix', 'bandai namco', 'fromsoftware', 'cd projekt red',
      'supercell', 'clash royale', 'brawl stars', 'the pokemon company',
    ],
    keywords: [
      'game', 'games', 'gaming', 'gamer', 'gameplay', 'playthrough', 'walkthrough',
      'let\'s play', 'lets play', 'streamer', 'twitch', 'steam', 'esports', 'speedrun',
      'speedrunner', 'speedrunning', 'rpg', 'jrpg', 'fps', 'multiplayer', 'co-op',
      'mod', 'mods', 'modding', 'modded', 'roblox', 'fortnite', 'valorant',
      'league of legends', 'lol', 'dota', 'dota 2', 'counter-strike', 'csgo', 'cs2',
      'minecraft', 'gta', 'gta 5', 'gta 6', 'gta v', 'grand theft auto', 'pokemon',
      'zelda', 'overwatch', 'apex legends', 'call of duty', 'warzone', 'console',
      'emulator', 'emulation', 'nintendo switch', 'ps5', 'ps4', 'playstation',
      'xbox series', 'xbox', 'boss fight', 'mmo', 'mmorpg', 'world of warcraft',
      'final fantasy', 'elden ring', 'dark souls', 'bloodborne', 'sekiro', 'soulsborne',
      'baldur\'s gate', 'baldurs gate', 'diablo', 'cyberpunk 2077', 'witcher',
      'red dead redemption', 'rdr2', 'resident evil', 'silent hill', 'halo',
      'god of war', 'spider-man game', 'smash bros', 'mario kart', 'super mario',
      'metroid', 'hollow knight', 'silksong', 'indie game', 'unreal engine',
      'unity game', 'loot', 'quest', 'patch notes', 'dlc', 'early access', 'pvp', 'pve',
    ],
  },
  {
    id: 'music',
    name: 'Music & Audio',
    icon: '🎵',
    color: '#EC4899',
    description: 'Music tracks, official music videos, lyric videos, songs, audio releases, record labels, live concerts, albums, DJs, electronic music, hip hop, pop, rock, classical, and music theory.',
    exactSignatures: [
      // Global Chart Toppers & Pop Stars
      'taylor swift', 'ed sheeran', 'drake', 'the weeknd', 'theweeknd', 'justin bieber',
      'billie eilish', 'adele', 'bts', 'bts official', 'blackpink', 'twice', 'stray kids',
      'newjeans', 'seventeen', 'exo', 'alan walker', 'marshmello', 'bruno mars',
      'post malone', 'postmalone', 'coldplay', 'imagine dragons', 'maroon 5',
      'kendrick lamar', 'travis scott', 'kanye west', 'ye', 'bad bunny', 'j balvin',
      'rosalía', 'dua lipa', 'olivia rodrigo', 'selena gomez', 'shawn mendes',
      'katy perry', 'shakira', 'lady gaga', 'rihanna', 'ariana grande', 'beyonce',
      'beyoncé', 'sza', 'doja cat', 'miley cyrus', 'harry styles', 'charlie puth',
      'clean bandit', 'chappell roan', 'sabrina carpenter',
      // Rock, Metal & Classic Legends
      'queen', 'michael jackson', 'nirvana', 'linkin park', 'green day', 'metallica',
      'slipknot', 'iron maiden', 'guns n roses', 'pink floyd', 'the beatles', 'led zeppelin',
      'twenty one pilots', 'panic at the disco', 'fall out boy', 'paramore',
      'my chemical romance', 'arctic monkeys', 'the 1975', 'gorillaz', 'radiohead', 'daft punk',
      // Hip Hop & Rap
      'eminem', 'eminemmusic', 'snoop dogg', '50 cent', 'jay-z', 'lil nas x', 'cardi b',
      'nicki minaj', 'megan thee stallion', 'ice spice', 'future', 'metro boomin', 'j cole',
      '21 savage', 'playboi carti', 'lil baby', 'gunna', 'young thug',
      // Electronic, Dance & DJs
      'avicii', 'david guetta', 'calvin harris', 'the chainsmokers', 'kygo', 'skrillex',
      'tiesto', 'tiësto', 'martin garrix', 'dj snake', 'major lazer', 'alesso', 'hardwell',
      'armin van buuren', 'afrojack', 'steve aoki', 'zedd', 'deadmau5', 'kaskade',
      'fred again', 'illenium', 'san holo', 'porter robinson', 'madeon', 'disclosure', 'flume',
      // Labels, Curators & Music Platforms
      'vevo', 'sony music', 'sony music entertainment', 'warner records', 'warner music',
      'universal music group', 'umg', 't-series', 'tseries', 'trap nation', 'bass nation',
      'chill nation', 'rap nation', 'house nation', 'monstercat', 'lofi girl', 'lofigirl',
      'chilledcow', 'spinnin records', 'spinnin\' records', 'ultra records', 'ultra music',
      'nocopyrightsounds', 'ncs', 'chillhop music', 'chillhop', 'npr music', 'tiny desk',
      'tiny desk concert', 'boiler room', 'the first take', 'colors', 'colorsxstudios',
      'a colors show', 'genius', 'genius lyrics', 'cercle', 'majestic casual', 'mrsuicidesheep',
      'suicidesheep', 'proximity', 'selected.', 'the sound you need',
      // South Asian Music
      'arijit singh', 'neha kakkar', 'badshah', 'diljit dosanjh', 'sidhu moose wala',
      'ap dhillon', 'anuv jain', 'prateek kuhad', 'coke studio', 'coke studio pakistan',
      'coke studio india', 'zee music company', 'speed records', 'tips official',
      'saregama music', 'saregama', 'rajshri', 'yrf music', 'aditya music', 'lahari music',
      // Music Theory, Education & Production
      'rick beato', 'adam neely', 'andrew huang', 'roomie', 'roomieofficial', 'jacob collier',
      'marc rebillet', 'polyphonic', 'charles cornell', 'nahre sol', 'sideways',
      'david bennett piano', '12tone', 'listening in', 'middle 8', 'mic the snare',
      'todd in the shadows', 'anthony fantano', 'theneedledrop', 'the needle drop', 'fantano',
      'two set violin', 'twosetviolin', 'daniel thrasher', 'samurai guitarist',
      'signals music studio', 'paul davids', 'music is win', 'andertons', 'andertons music co',
      'sweetwater', 'rob scallon', 'mary spender', 'stevie t', 'jared dines',
    ],
    keywords: [
      'music', 'musical', 'musician', 'vevo', 'records', 'sound', 'audio', 'song', 'songs',
      'band', 'orchestra', 'beats', 'bass', 'lyrics', 'lyric', 'acoustic', 'remix', 'remixes',
      'hiphop', 'hip hop', 'pop', 'rock', 'rap', 'rapper', 'dj', 'vocals', 'radio',
      'track', 'tracks', 'concert', 'album', 'melody', 'instrumental', 'jazz',
      'lo-fi', 'lofi', 'trap', 'guitar', 'piano', 'drums', 'singer', 'chords',
      'studio', 'synthesizer', 'official audio', 'official video', 'lyric video',
      'discography', 'mixtape', 'symphony', 'cover song', 'karaoke', 'playlist',
      'edm', 'classical', 'choir', 'composer', 'synthesizer', 'synth', 'vocalist',
      'bassline', 'acoustic guitar', 'electric guitar', 'beatmaking', 'producer',
      'fl studio', 'ableton', 'logic pro', 'r&b', 'rnb', 'indie rock', 'alt rock',
      'metal', 'heavy metal', 'punk rock', 'folk music', 'blues', 'country music',
      'reggae', 'reggaeton', 'k-pop', 'kpop', 'j-pop', 'jpop', 'bollywood music',
      'soundtrack', 'ost', 'score', 'ep', 'single', 'live performance', 'harmony',
    ],
  },
  {
    id: 'education-science',
    name: 'Education & Science',
    icon: '📚',
    color: '#8B5CF6',
    description: 'Science, physics, mathematics, biology, chemistry, astronomy, history, geography, university lectures, educational animations, academic tutorials, and deep explanatory essays.',
    exactSignatures: [
      // Popular Science & Engineering
      'domain of science', 'physics demos', 'veritasium', 'derek muller', 'vsauce', 'vsauce2',
      'vsauce3', 'michael stevens', 'kurzgesagt', 'kurzgesagt – in a nutshell', 'ted', 'ted-ed',
      'crashcourse', 'crash course', 'hank green', 'john green', 'scishow', 'scishow space',
      'smarter everyday', 'smartereveryday', 'destin sandlin', 'mark rober', 'action lab',
      'the action lab', 'electroboom', 'mehdi sadaghdar', 'steve mould', 'nilered', 'nileblue',
      'applied science', 'cody\'s lab', 'codyslab', 'styropyro', 'minutephysics', 'minute earth',
      'minutearth', 'asapscience', 'two minute papers', 'real engineering', 'practical engineering',
      'wendover productions', 'half as interesting', 'reallifelore', 'oversimplified', 'tierzoo',
      'tom scott', 'anton petrov', 'sabine hossenfelder', 'pbs space time', 'pbs spacetime',
      'pbs eons', 'pbs terra', 'be smart', 'it\'s okay to be smart', 'joe scott',
      'answers with joe', 'cool worlds', 'isaac arthur', 'event horizon', 'dr becky',
      'astrum', 'scott manley', 'everyday astronaut', 'tim dodd', 'periodic videos',
      'sixty symbols', 'deep sky videos', 'numberphile', 'computerphile', 'stand-up maths',
      'standupmaths', 'matt parker', '3blue1brown', 'grant sanderson',
      // Math, Academic & University
      'khan academy', 'sal khan', 'mit opencourseware', 'stanford online', 'yale courses',
      'harvard online', 'brilliant', 'the organic chemistry tutor', 'professor leonard',
      'professor dave explains', 'tibees', 'mathologer', 'zach star', 'flammable maths',
      'blackpenredpen', 'dr trefor bazett', 'michael penn', 'physics wallah', 'alakh pandey',
      'unacademy', 'byjus', 'aman dhattarwal', 'apni kaksha', 'dear sir', 'magnet brains',
      // History, Philosophy, Geography & Exploratory Essays
      'history matters', 'feature history', 'kings and generals', 'history with cy',
      'fire of learning', 'overly sarcastic productions', 'extra credits', 'extra history',
      'historia civilis', 'invicta', 'knowing better', 'sam o\'nella', 'sam onella',
      'internet historian', 'lemmino', 'aperture', 'exurb1a', 'today i found out',
      'the infographics show', 'infographics show', 'atlas pro', 'geography now', 'paul barbato',
      'usefulcharts', 'cgp grey', 'cgpgrey', 'alternatehistoryhub', 'fall of civilizations',
      'dan carlin', 'hardcore history', 'national geographic', 'nat geo', 'nat geo wild',
      'smithsonian channel', 'smithsonian', 'discovery channel', 'discovery',
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
      'organic chemistry', 'differential equations', 'geometry', 'thermodynamics',
      'relativity', 'electromagnetism', 'solar system', 'exoplanets', 'black hole',
      'telescope', 'james webb', 'historical', 'ancient history', 'medieval', 'world war',
      'civilization', 'mythology', 'pedagogy', 'academic', 'curiosity',
    ],
  },
  {
    id: 'entertainment',
    name: 'Entertainment & Media',
    icon: '🍿',
    color: '#F59E0B',
    description: 'Comedy sketches, YouTube entertainment challenges, movie & TV reviews, pop culture video essays, podcasts, late night shows, and animated stories.',
    exactSignatures: [
      // Challenge Creators & Global Sensations
      'mrbeast', 'mr beast', 'beast reacts', 'beast philanthropy', 'dude perfect',
      'ryan trahan', 'airrack', 'yes theory', 'faze rug', 'faze clan', 'david dobrik',
      'sidemen', 'ksi', 'miniminter', 'w2s', 'vikkstar123', 'tbjzl', 'zerkaa',
      'beta squad', 'niko omilana', 'chunkz', 'amp', 'kai cenat', 'fanum', 'agent00',
      'duke dennis', 'ishowspeed', 'speed', 'daily dose of internet', 'corridor crew',
      'corridor digital', 'smosh', 'smosh pit', 'smosh games', 'collegehumor', 'dropout',
      'the try guys', 'try guys',
      // Comedy, Commentary & Skits
      'carryminati', 'bb ki vines', 'bhuvan bam', 'ashish chanchlani', 'amit bhadana',
      'harsh beniwal', 'round2hell', 'round 2 hell', 'tvf', 'the viral fever',
      'filtercopy', 'zakir khan', 'anubhav singh bassi', 'abhishek upmanyu',
      'samay raina', 'tanmay bhat', 'triggered insaan', 'fukra insaan', 'mythpat',
      'flying beast', 'sourav joshi vlogs', 'cody ko', 'noel miller', 'tiny meat gang',
      'danny gonzalez', 'drew gooden', 'kurtis conner', 'jarvis johnson', 'eddy burback',
      'gus johnson', 'jacksfilms', 'nigahiga', 'ryan higa', 'lilly singh', 'superwoman',
      // Podcasts & Talk Shows
      'the tonight show', 'jimmy fallon', 'jimmy kimmel', 'saturday night live', 'snl',
      'stephen colbert', 'the late show', 'seth meyers', 'the daily show', 'last week tonight',
      'john oliver', 'trevor noah', 'the joe rogan experience', 'joe rogan', 'jre clips',
      'h3 podcast', 'h3h3productions', 'ethan klein', 'theo von', 'bad friends',
      'tigerbelly', 'flagrant', 'andrew schulz', 'impaulsive', 'logan paul',
      'hasanabi', 'hasan piker', 'penguinz0 clips',
      // Animation & Storytime
      'theodd1sout', 'the odd 1s out', 'jaiden animations', 'domics', 'swoozie',
      'let me explain studios', 'illymation', 'circletoons', 'haminations', 'tabbes',
      'ice cream sandwich', 'casually explained',
      // Cinema, TV & Pop Culture
      'marvel', 'marvel studios', 'sony pictures', 'warner bros', 'universal pictures',
      'paramount pictures', 'disney', 'walt disney', 'netflix', 'a24', 'hbo',
      'rotten tomatoes', 'cinemasins', 'cinema sins', 'cinemawins', 'cinema wins',
      'screen junkies', 'honest trailers', 'screen rant', 'screenrant', 'pitch meeting',
      'watchmojo', 'watch mojo', 'looper', 'new rockstars', 'heavy spoilers',
      'emergency awesome', 'comic book cast', 'chris stuckmann', 'jeremy jahns',
      'yms', 'your movie sucks', 'i hate everything', 'nerdwriter', 'nerdwriter1',
      'every frame a painting', 'lessons from the screenplay', 'patrick h willems',
      'thomas flight', 'like stories of old', 'filmento',
    ],
    keywords: [
      'entertainment', 'entertaining', 'comedy', 'comedian', 'comic', 'vlog', 'vlogs',
      'vlogger', 'daily vlog', 'show', 'cinema', 'movie', 'movies', 'film', 'films',
      'podcast', 'podcasts', 'funny', 'fun', 'humor', 'humour', 'skit', 'skits',
      'sketches', 'sketch', 'reaction', 'reactions', 'drama', 'animation', 'animated',
      'anime', 'cartoon', 'studios', 'interview', 'talk show', 'late night',
      'memes', 'meme', 'hollywood', 'parody', 'acting', 'shorts', 'clips', 'bloopers',
      'episode', 'season', 'scene', 'trailer', 'teaser', 'stand-up', 'standup',
      'commentary', 'video essay', 'tier list', 'ranking', 'challenge', 'prank',
      'storytime', 'roast', 'improv', 'critique', 'film review', 'movie recap', 'recap',
    ],
  },
  {
    id: 'finance-crypto',
    name: 'Finance & Business',
    icon: '📈',
    color: '#059669',
    description: 'Personal finance, stock markets, investing, crypto/Bitcoin, real estate, macroeconomics, business case studies, and startup entrepreneurship.',
    exactSignatures: [
      // Personal Finance, Wealth & Real Estate
      'graham stephan', 'andrei jikh', 'meet kevin', 'kevin paffrath', 'ali abdaal',
      'mark tilbury', 'minority mindset', 'jaspreet singh', 'the plain bagel', 'ben felix',
      'whiteboard finance', 'the financial diet', 'two cents', 'dave ramsey', 'the ramsey show',
      'ramsey solutions', 'suze orman', 'clearvalue tax', 'the swedish investor', 'patrick boyle',
      'ramit sethi', 'i will teach you to be rich', 'humphrey yang', 'tori dunlap',
      // Startups, Entrepreneurship & Case Studies
      'y combinator', 'ycombinator', 'a16z', 'andreessen horowitz', 'naval', 'naval ravikant',
      'garyvee', 'gary vaynerchuk', 'patrick bet-david', 'valuetainment', 'alex hormozi',
      'hormozi', 'noah kagan', 'my first million', 'the hustle', 'think media',
      'the futur', 'chris do', 'shark tank', 'shark tank india', 'cnbc make it',
      'bloomberg originals', 'business insider', 'forbes', 'fortune', 'financial times',
      'the wall street journal', 'wsj', 'wsj markets', 'how money works', 'company man',
      'magnatesmedia', 'magnates media', 'economics explained', 'modern mba',
      // Markets, Crypto & Regional Finance
      'bloomberg markets', 'bloomberg finance', 'cnbc', 'cnbc television', 'marketwatch',
      'seeking alpha', 'investopedia', 'the motley fool', 'benzinga', 'yahoo finance',
      'coin bureau', 'coindesk', 'coin desk', 'cointelegraph', 'crypto daily',
      'bitboy crypto', 'bankless', 'zerodha', 'groww', 'moneycontrol', 'economic times',
      'business today', 'ankur warikoo', 'warikoo', 'rachana ranade', 'ca rachana ranade',
      'pranjal kamra', 'akshat shrivastava', 'labour law advisor', 'lla', 'asset yogi',
      'finology legal', 'raj shamani',
    ],
    keywords: [
      'finance', 'financial', 'money', 'business', 'invest', 'investing', 'investment',
      'investor', 'stocks', 'stock market', 'crypto', 'cryptocurrency', 'bitcoin', 'btc',
      'ethereum', 'eth', 'altcoin', 'blockchain', 'economy', 'economic', 'economics',
      'wealth', 'market', 'markets', 'startup', 'startups', 'entrepreneur', 'entrepreneurship',
      'trading', 'trader', 'day trading', 'swing trading', 'options', 'options trading',
      'real estate', 'bank', 'banking', 'passive income', 'wall street', 'shares',
      'shareholder', 'capital', 'venture capital', 'dividends', 'portfolio',
      'financial independence', 'fire', 'personal finance', 'budget', 'budgeting',
      'credit card', 'taxation', 'taxes', 'mutual funds', 'etf', 'index funds',
      'forex', 'side hustle', 'saas', 'revenue', 'profit', 'ecommerce', 'debt',
      'compound interest', 'net worth', 'valuation', 'inflation', 'recession',
      'interest rates', 'federal reserve', 'macroeconomics', 'case study', 'ipo',
    ],
  },
  {
    id: 'fitness-sports',
    name: 'Fitness & Sports',
    icon: '💪',
    color: '#EF4444',
    description: 'Gym workouts, bodybuilding, sports leagues (NBA, Premier League, NFL, F1, UFC, Cricket), calisthenics, yoga, running, athletic training, and sports analysis.',
    exactSignatures: [
      // Fitness, Bodybuilding & Calisthenics
      'chris heria', 'thenx', 'hybrid calisthenics', 'calisthenics movement', 'jeff nippard',
      'athlean-x', 'athleanx', 'jeff cavaliere', 'renaissance periodization', 'mike israetel',
      'dr mike israetel', 'jeremy ethier', 'noel deyzel', 'greg doucette', 'coach greg',
      'sean nalewanyj', 'will tennyson', 'jesse james west', 'cbum', 'chris bumstead',
      'ronnie coleman', 'arnold schwarzenegger', 'larry wheels', 'eddie hall', 'brian shaw',
      'hafthor bjornsson', 'buff dudes', 'anabolic aliens', 'bodybuilding.com',
      'strength side', 'tom merrick', 'the bioneer', 'chloe ting', 'blogilates',
      'pamela reif', 'sydney cummings', 'fitness blender', 'popsugar fitness', 'hasfit',
      'yoga with adriene', 'adriene mishler', 'boho beautiful', 'guru mann', 'rohit khatri',
      // Sports Networks & Global Leagues
      'ufc', 'dana white', 'nba', 'bleacher report', 'fifa', 'premier league',
      'la liga', 'bundesliga', 'serie a', 'uefa', 'champions league', 'wwe', 'wrestling',
      'olympics', 'red bull', 'red bull sports', 'redbull', 'espn', 'sky sports',
      'formula 1', 'formula one', 'f1', 'nfl', 'mlb', 'nhl', 'dazn', 'bt sport',
      'tnt sports', 'the score', 'pat mcafee', 'the pat mcafee show', 'cricket australia',
      'icc', 'bcci', 'ipl', 'star sports', 'sony sports network', 'hotstar cricket',
      'jomboy media', 'jomboy', 'secret base', 'sb nation', 'tifo football', 'tifo irl',
      'copa90', 'house of highlights',
    ],
    keywords: [
      'fitness', 'gym', 'workout', 'health', 'healthy', 'nutrition', 'bodybuilding',
      'bodybuilder', 'diet', 'calisthenics', 'yoga', 'exercise', 'exercises', 'training',
      'trainer', 'sports', 'sport', 'athlete', 'athletic', 'football', 'soccer',
      'basketball', 'boxing', 'boxer', 'mma', 'wrestling', 'running', 'runner',
      'muscle', 'lifting', 'powerlifting', 'weightlifting', 'cardio', 'weight loss',
      'fat loss', 'hypertrophy', 'cricket', 'tennis', 'badminton', 'physique',
      'marathon', 'triathlon', 'swimming', 'rugby', 'f1', 'motorsport', 'racing',
      'bike', 'cycling', 'pilates', 'mobility', 'crossfit', 'strength', 'deadlift',
      'squat', 'bench press', 'touchdown', 'goal', 'slam dunk', 'knockout',
    ],
  },
  {
    id: 'lifestyle-food',
    name: 'Food & Lifestyle',
    icon: '🍳',
    color: '#D97706',
    description: 'Cooking, culinary recipes, food reviews, street food, baking, home lifestyle, organization, coffee, beauty, fashion, and gardening.',
    exactSignatures: [
      // Culinary Creators & Master Chefs
      'gordon ramsay', 'jamie oliver', 'babish culinary universe', 'binging with babish',
      'babish', 'joshua weissman', 'bon appetit', 'bon appétit', 'tasty', 'buzzfeed tasty',
      'epicurious', 'america\'s test kitchen', 'americas test kitchen', 'sorted food',
      'sortedfood', 'food wishes', 'chef john', 'adam ragusea', 'maangchi',
      'first we feast', 'hot ones', 'sean evans', 'uncle roger', 'nigel ng', 'food insider',
      'best ever food review show', 'sonny side', 'mark wiens', 'strictly dumpling',
      'mikey chen', 'matt stonie', 'internet shaquille', 'pro home cooks',
      'french cooking academy', 'preppy kitchen', 'laura in the kitchen', 'marion\'s kitchen',
      'chinese cooking demystified', 'souped up recipes', 'nick digiovanni', 'bayashi tv',
      'zach choi asmr', 'albert can cook', 'sam the cooking guy', 'kenji lópez-alt',
      'mythical kitchen',
      // Indian & Regional Cooking
      'ranveer brar', 'sanjeev kapoor', 'kabitas kitchen', 'kabita\'s kitchen',
      'nisha madhulika', 'nishamadhulika', 'village cooking channel', 'village food factory',
      'bharatzkitchen', 'kunal kapur', 'vahchef', 'hebbar\'s kitchen', 'hebbars kitchen',
      'rajshri food', 'grandpa kitchen', 'cookingshooking',
      // Lifestyle, Home & Beauty
      'architectural digest', 'marie kondo', 'cleanmyspace', 'james hoffmann',
      'morgan drinks coffee', 'lance hedrick', 'safiya nygaard', 'emma chamberlain',
      'michelle phan', 'nikkietutorials', 'hyram', 'doctorly', 'brad mondo',
    ],
    keywords: [
      'food', 'foodie', 'cook', 'cooking', 'recipe', 'recipes', 'kitchen', 'chef',
      'bake', 'baking', 'bakery', 'lifestyle', 'house', 'home', 'interior design',
      'room tour', 'apartment tour', 'diy', 'restaurant', 'street food', 'eating',
      'asmr', 'mukbang', 'grill', 'grilling', 'bbq', 'culinary', 'sourdough', 'pastry',
      'dessert', 'dinner', 'spices', 'gourmet', 'gardening', 'garden', 'plants',
      'houseplants', 'fashion', 'beauty', 'makeup', 'skincare', 'cosmetics', 'style',
      'coffee', 'espresso', 'barista', 'latte art', 'clean with me', 'organizing', 'declutter',
    ],
  },
  {
    id: 'news-politics',
    name: 'News & Politics',
    icon: '📰',
    color: '#6366F1',
    description: 'World news, journalism, geopolitics, elections, investigative reports, political commentary, international relations, and public affairs.',
    exactSignatures: [
      // Major News Broadcasts & Outlets
      'bbc', 'bbc news', 'bbc world service', 'cnn', 'cnn international', 'fox news',
      'fox business', 'msnbc', 'vox', 'the new york times', 'nyt', 'the washington post',
      'washington post', 'the wall street journal', 'wsj', 'reuters', 'bloomberg news',
      'bloomberg quicktake', 'vice news', 'al jazeera', 'al jazeera english', 'the guardian',
      'pbs newshour', 'pbs frontline', 'abc news', 'sky news', 'dw news', 'deutsche welle',
      'associated press', 'ap news', 'the economist', 'nbc news', 'cbs news', '60 minutes',
      'euronews', 'france 24', 'channel 4 news', 'nhk world', 'cgtn',
      // Geopolitical Analysis & Independent Media
      'johnny harris', 'j.j. mccullough', 'tldr news', 'tldr daily', 'visualpolitik',
      'visual politik', 'caspian report', 'good times bad times', 'the daily show',
      'last week tonight', 'john oliver', 'trevor noah', 'the atlantic', 'politico',
      'axios', 'the hill', 'breaking points', 'the majority report', 'secular talk',
      'david pakman', 'the young turks', 'the daily wire', 'ben shapiro',
      // South Asian & Regional News
      'ndtv', 'india today', 'aaj tak', 'zee news', 'abp news', 'republic world',
      'wion', 'gravitas wion', 'palki sharma', 'firstpost', 'the print', 'theprint',
      'the wire', 'quint', 'dhruv rathee', 'soch by mohak mangal', 'newslaundry',
      'the lallantop', 'ravish kumar official',
    ],
    keywords: [
      'news', 'politics', 'political', 'geopolitics', 'journalism', 'journalist',
      'breaking news', 'current affairs', 'election', 'elections', 'live news',
      'press conference', 'congress', 'parliament', 'government', 'prime minister',
      'president', 'supreme court', 'foreign policy', 'diplomacy', 'policy', 'senate',
      'legislation', 'democracy', 'international affairs', 'world affairs', 'war',
      'conflict', 'investigation', 'investigative', 'report', 'reporter', 'anchor',
      'headline', 'dispatch', 'commentary', 'sanctions', 'treaty', 'united nations',
      'nato', 'white house', 'polling', 'debate', 'propaganda',
    ],
  },
  {
    id: 'art-design',
    name: 'Art & Design',
    icon: '🎨',
    color: '#F43F5E',
    description: 'Digital art, illustration, painting, drawing tutorials, graphic design, animation techniques, 3D modeling, Blender, UX/UI design, and visual crafts.',
    exactSignatures: [
      'proko', 'stan prokopenko', 'jazza', 'draw with jazza', 'drawfee', 'drawfee show',
      'bob ross', 'the joy of painting', 'solar sands', 'aaron blaise', 'ethan becker',
      'sinix design', 'sinix', 'marco bucci', 'ross draws', 'rossdraws', 'samdoesarts',
      'kooleen', 'kasey golden', 'moriah elizabeth', 'lethalchris drawing', 'marcello barenghi',
      'alpay efe', 'ten hundred', 'zhc', 'zhc crafts', 'peter draws',
      'blender guru', 'andrew price', 'grant abbitt', 'cg geek', 'cg matter', 'default cube',
      'ian hubert', 'ducky 3d', 'flippednormals', 'fllippednormals', 'the futur',
      'satori graphics', 'will paterson', 'zimri mayfield', 'charlimarietv', 'femke design',
      'flux academy', 'juxtopposed', 'designcourse', 'gary simon', 'adobe',
      'adobe creative cloud', 'photoshop', 'illustrator', 'procreate',
    ],
    keywords: [
      'art', 'artist', 'artwork', 'draw', 'drawing', 'illustration', 'illustrator',
      'sketch', 'sketchbook', 'painting', 'oil painting', 'watercolor', 'acrylic painting',
      'digital art', 'concept art', 'character design', 'portrait', 'speedpaint', 'canvas',
      'graphic design', 'typography', 'logo design', 'branding', 'ui design', 'ux design',
      'web design', 'blender', 'blender 3d', '3d modeling', '3d render', 'cgi', 'vfx',
      'zbrush', 'procreate', 'photoshop', 'illustrator', 'animator', 'animation',
      'storyboard', 'calligraphy', 'craft', 'crafting', 'ceramics', 'pottery',
    ],
  },
  {
    id: 'travel-outdoor',
    name: 'Travel & Outdoors',
    icon: '✈️',
    color: '#14B8A6',
    description: 'Travel vlogs, backpacking, world exploration, cultural immersion, wildlife expeditions, outdoor survival, camping, hiking, and road trips.',
    exactSignatures: [
      'kara and nate', 'drew binsky', 'yes theory travel', 'bald and bankrupt',
      'harald baldr', 'eva zu beck', 'indigo traveller', 'fearless and far', 'mike corey',
      'karl watson', 'gabriel traveler', 'flying the nest', 'the bucket list family',
      'lost leblanc', 'sailing la vagabonde', 'vagabrothers', 'wolters world', 'rick steves',
      'brave wilderness', 'coyote peterson', 'outdoor boys', 'luke nichols', 'ta outdoors',
      'joe robinet', 'corporals corner', 'survival lilly', 'my self reliance', 'shawn james',
      'steve wallis', 'camping with steve', 'foresty forest', 'mav', 'darwin onthetrail',
      'dixie homemade wanderlust', 'cleverhiker', 'nomadic matt', 'tourist2townie',
    ],
    keywords: [
      'travel', 'traveler', 'travelling', 'traveling', 'travel vlog', 'trip', 'journey',
      'adventure', 'backpacking', 'backpacker', 'wanderlust', 'explore', 'explorer',
      'exploration', 'destination', 'tour', 'tourism', 'tourist', 'flight', 'hotel',
      'resort', 'hostel', 'road trip', 'van life', 'vanlife', 'camper van', 'rv life',
      'camping', 'wild camping', 'stealth camping', 'tent', 'outdoors', 'wilderness',
      'survival', 'bushcraft', 'hiking', 'hike', 'trail', 'trekking', 'national park',
      'wildlife', 'expedition', 'mountaineering', 'overlanding', 'off-grid', 'cabin build',
      'scuba diving', 'kayaking', 'safari',
    ],
  },
  {
    id: 'auto-vehicles',
    name: 'Automotive & Vehicles',
    icon: '🚗',
    color: '#DC2626',
    description: 'Car reviews, supercar showcases, automotive repair & mechanics, project car builds, drag racing, drifting, motorcycles, electric vehicles, and aviation.',
    exactSignatures: [
      'carwow', 'mat watson', 'donut media', 'donut', 'doug demuro', 'top gear',
      'the grand tour', 'jeremy clarkson', 'richard hammond', 'james may',
      'throttle house', 'the straight pipes', 'straight pipes', 'savagegeese',
      'everyday driver', 'motortrend', 'car and driver', 'road & track', 'hagerty',
      'jason cammisa', 'jay leno\'s garage', 'jay leno garage', 'vinwiki', 'ed bolian',
      'tflcar', 'the fast lane car', 'redline reviews', 'kelley blue book', 'autotrader',
      'edmunds', 'chrisfix', 'chris fix', 'mighty car mods', 'tavarish', 'cleetus mcfarland',
      'hoovies garage', 'the car wizard', 'scotty kilmer', 'rich rebuilds', 'b is for build',
      'goonzquad', 'boostedboiz', 'adam lz', 'tj hunt', 'whistlindiesel', 'whistlin diesel',
      'ammo nyc', 'shmee150', 'supercar blondie', 'fully charged show', 'fortnine',
      'ryan f9', 'revzilla', 'yammie noob', 'mentour pilot', 'blancolirio',
    ],
    keywords: [
      'car', 'cars', 'automobile', 'automotive', 'vehicle', 'vehicles', 'motor', 'motors',
      'driving', 'drive', 'supercar', 'hypercar', 'sports car', 'racing', 'drag race',
      'drift', 'drifting', 'track day', 'engine', 'horsepower', 'torque', 'exhaust',
      'turbo', 'turbocharger', 'v8', 'v6', 'v12', 'electric vehicle', 'ev', 'tesla',
      'rivian', 'porsche', 'ferrari', 'lamborghini', 'bmw', 'mercedes', 'audi',
      'toyota', 'honda', 'ford', 'corvette', 'mustang', 'mechanic', 'car repair',
      'diy car', 'oil change', 'brakes', 'restoration', 'project car', 'barn find',
      'dyno', 'off-road', 'offroad', '4x4', 'truck', 'pickup truck', 'motorcycle',
      'motorbike', 'biker', 'aviation', 'airplane', 'pilot',
    ],
  },
  {
    id: 'general-other',
    name: 'General & Others',
    icon: '🌐',
    color: '#6B7280',
    description: 'Catch-all category for channels that genuinely do not fit any specific category.',
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
      isSystem: true,
    }));

    const assigned = new Set<string>();

    for (const ch of channels) {
      if (isSystemChannelOrCurator(ch)) continue;
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

          // Substring match for distinctive multi-word or long brand signatures (>= 7 chars)
          // Guards against short single-word substring false positives (e.g. "apple" in "pineapple")
          if (
            (sig.original.includes(' ') || sig.clean.length >= 7) &&
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
      if (isSystemChannelOrCurator(ch)) continue;
      if (!assigned.has(ch.ucId)) {
        generalDeck?.channelIds.push(ch.ucId);
        assigned.add(ch.ucId);
      }
    }

    // Return decks that contain channels
    return decks.filter(d => d.channelIds.length > 0);
  }
}
