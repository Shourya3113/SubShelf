/**
 * Accuracy fixture for channel categorization: well-known PUBLIC YouTube channels with a short
 * description written in the style of their "About" text (paraphrased, not copied) and the folder a
 * person would most likely pick for them. Contains no data from any user's subscriptions.
 *
 * Deliberately mixed: several regions and languages, names that do and don't reveal the topic, and
 * descriptions with the usual boilerplate (contact addresses, upload schedules). Channel IDs are not
 * included; tests generate placeholder IDs.
 */
export interface FixtureChannel {
  title: string;
  handle: string;
  description: string;
  expected: string;
}

export const PUBLIC_CHANNELS: FixtureChannel[] = [
  // Tech & Coding
  { title: 'Hussein Nasser', handle: '@hnasr', expected: 'tech-coding',
    description: 'Backend engineering explained. I talk about databases, proxies, networking protocols and software architecture.' },
  { title: 'Ben Eater', handle: '@BenEater', expected: 'tech-coding',
    description: 'Videos about building and programming computers from the ground up, like an 8-bit breadboard computer and a 6502 project.' },
  { title: 'Kunal Kushwaha', handle: '@KunalKushwaha', expected: 'tech-coding',
    description: 'Free courses on DSA, Java, DevOps and open source to help you start a career in tech. Business inquiries: hello@example.com' },
  { title: 'Technical Guruji', handle: '@TechnicalGuruji', expected: 'tech-coding',
    description: 'Namaskar dosto! Yahan aapko milenge latest smartphones aur gadgets ke reviews, unboxing aur tech news.' },
  { title: 'Coreteks', handle: '@Coreteks', expected: 'tech-coding',
    description: 'Analysis of the semiconductor industry, CPUs, GPUs and where computing hardware is heading next.' },
  { title: 'Dave2D', handle: '@Dave2D', expected: 'tech-coding',
    description: 'Laptops, phones and other gadgets, reviewed with an eye for design.' },

  // Gaming
  { title: 'PointCrow', handle: '@PointCrow', expected: 'gaming',
    description: 'Breath of the Wild and Pokemon challenges, mods and randomizers. New videos every week!' },
  { title: 'Skill Up', handle: '@SkillUp', expected: 'gaming',
    description: 'Long-form video game reviews and honest discussion about the games industry.' },
  { title: 'MortaL', handle: '@MortaL', expected: 'gaming',
    description: 'Official channel of Mortal. Live streams of BGMI and other mobile battle royale games. For collaborations: team@example.com' },
  { title: 'Gaules', handle: '@Gaules', expected: 'gaming',
    description: 'Tribo! Lives de Counter-Strike todos os dias, campeonatos e muita resenha.' },
  { title: 'Sseth', handle: '@Sseth', expected: 'gaming',
    description: 'Video game reviews delivered with far too much enthusiasm.' },

  // Music & Audio
  { title: 'Rick Beato', handle: '@RickBeato', expected: 'music',
    description: 'Music theory, interviews with legendary musicians and breakdowns of what makes great songs work.' },
  { title: 'COLORS', handle: '@COLORSxSTUDIOS', expected: 'music',
    description: 'A unique aesthetic music platform showcasing exceptional talent from around the globe.' },
  { title: 'HYBE LABELS', handle: '@HYBELABELS', expected: 'music',
    description: 'The official channel of HYBE LABELS, home of BTS, SEVENTEEN, TXT, ENHYPEN and more.' },
  { title: 'Coke Studio Pakistan', handle: '@cokestudio', expected: 'music',
    description: 'Celebrating the musical heritage of Pakistan through live studio sessions with artists from across the country.' },
  { title: 'Adam Neely', handle: '@AdamNeely', expected: 'music',
    description: 'Videos about music, jazz, bass guitar and the stranger corners of music theory.' },

  // Education & Science
  { title: 'Sabine Hossenfelder', handle: '@SabineHossenfelder', expected: 'education-science',
    description: 'Science news and commentary on physics, astrophysics and the occasional overhyped headline. New videos daily.' },
  { title: 'Dr. Becky', handle: '@DrBecky', expected: 'education-science',
    description: 'An astrophysicist at Oxford explaining the latest discoveries about black holes, galaxies and the universe.' },
  { title: 'Unacademy JEE', handle: '@UnacademyJEE', expected: 'education-science',
    description: 'Free live classes for JEE Main and Advanced: physics, chemistry and mathematics from top educators.' },
  { title: 'Dr. Trefor Bazett', handle: '@DrTrefor', expected: 'education-science',
    description: 'Math videos for university students covering calculus, linear algebra and differential equations.' },
  { title: 'Historia Civilis', handle: '@HistoriaCivilis', expected: 'education-science',
    description: 'Animated history of the Roman Republic, its politics and its wars.' },
  { title: 'Breaking Lab', handle: '@BreakingLab', expected: 'education-science',
    description: 'Wissenschaft verständlich erklärt: Physik, Chemie und die großen Fragen der Forschung.' },

  // Entertainment & Media
  { title: 'Sidemen', handle: '@Sidemen', expected: 'entertainment',
    description: 'The official Sidemen channel: challenges, game shows and general chaos every Sunday.' },
  { title: 'Jubilee', handle: '@jubileemedia', expected: 'entertainment',
    description: 'We make videos that bring people together. Middle Ground, Surrounded and more conversations across divides.' },
  { title: 'Saturday Night Live', handle: '@SaturdayNightLive', expected: 'entertainment',
    description: 'The official channel of SNL: sketches, monologues, music performances and Weekend Update.' },
  { title: 'BB Ki Vines', handle: '@BBKiVines', expected: 'entertainment',
    description: 'Comedy sketches and the characters of BB Ki Vines by Bhuvan Bam.' },
  { title: 'Corridor Crew', handle: '@CorridorCrew', expected: 'entertainment',
    description: 'VFX artists react to movie effects and make their own short films. Join us on our website for more.' },
  { title: 'Whindersson Nunes', handle: '@whinderssonnunes', expected: 'entertainment',
    description: 'Humorista. Vlogs, músicas e stand-up.' },
  { title: 'HajimeSyacho', handle: '@HajimeSyacho', expected: 'entertainment',
    description: 'はじめしゃちょーの公式チャンネル。毎日動画を投稿しています。' },

  // Finance & Business
  { title: 'Ben Felix', handle: '@BenFelixCSI', expected: 'finance-crypto',
    description: 'Evidence-based investing and personal finance from a portfolio manager.' },
  { title: 'Patrick Boyle', handle: '@PBoyle', expected: 'finance-crypto',
    description: 'A hedge fund manager turned professor talking about finance, markets and the occasional financial scandal.' },
  { title: 'Ankur Warikoo', handle: '@warikoo', expected: 'finance-crypto',
    description: 'Helping you make better decisions about money, career and life. Business inquiries: team@example.com' },
  { title: 'Coin Bureau', handle: '@CoinBureau', expected: 'finance-crypto',
    description: 'Crypto education without the hype: research on bitcoin, ethereum and blockchain projects.' },
  { title: 'Me Poupe!', handle: '@MePoupe', expected: 'finance-crypto',
    description: 'Nathalia Arcuri ajuda você a sair das dívidas, organizar as contas e investir melhor.' },
  { title: 'Finanzfluss', handle: '@Finanzfluss', expected: 'finance-crypto',
    description: 'Finanzbildung für alle: ETFs, Altersvorsorge und Geldanlage einfach erklärt.' },

  // Fitness & Sports
  { title: 'Chloe Ting', handle: '@ChloeTing', expected: 'fitness-sports',
    description: 'Free workout programs and home exercises for every fitness level.' },
  { title: 'FC Barcelona', handle: '@fcbarcelona', expected: 'fitness-sports',
    description: 'Official channel of FC Barcelona. Highlights, interviews and exclusive content from the club.' },
  { title: 'ICC', handle: '@ICC', expected: 'fitness-sports',
    description: 'The official YouTube channel of the International Cricket Council, with highlights from every ICC event.' },
  { title: 'Jeremy Ethier', handle: '@JeremyEthier', expected: 'fitness-sports',
    description: 'Science-based training and nutrition to help you build muscle and lose fat.' },
  { title: 'Pamela Reif', handle: '@PamelaRf1', expected: 'fitness-sports',
    description: 'Home workouts and healthy recipes, no equipment needed. New video every Sunday.' },
  { title: 'NBA', handle: '@NBA', expected: 'fitness-sports',
    description: 'The official NBA channel: highlights, top plays and game recaps.' },

  // Food & Lifestyle
  { title: 'J. Kenji López-Alt', handle: '@JKenjiLopezAlt', expected: 'lifestyle-food',
    description: 'Point-of-view cooking videos from my home kitchen, with the science behind the recipes.' },
  { title: 'Nisha Madhulika', handle: '@NishaMadhulika', expected: 'lifestyle-food',
    description: 'Simple vegetarian Indian recipes you can cook at home.' },
  { title: 'Bon Appétit', handle: '@BonAppetit', expected: 'lifestyle-food',
    description: 'Recipes, restaurant tours and cooking techniques from the Bon Appétit test kitchen.' },
  { title: 'Mark Wiens', handle: '@MarkWiens', expected: 'lifestyle-food',
    description: 'Travel and food videos: eating the best street food around the world.' },
  { title: 'Kurashiru', handle: '@kurashiru', expected: 'lifestyle-food',
    description: '毎日の献立に役立つ簡単レシピ動画をお届けします。' },
  { title: 'James Hoffmann', handle: '@jameshoffmann', expected: 'lifestyle-food',
    description: 'Videos about coffee: brewing, espresso machines, grinders and the occasional deep dive.' },
  { title: 'Hyram', handle: '@Hyram', expected: 'lifestyle-food',
    description: 'Skincare education and honest product reviews for every skin type.' },

  // News & Politics
  { title: 'WION', handle: '@WION', expected: 'news-politics',
    description: 'World Is One News: global news and geopolitics from an Indian perspective.' },
  { title: 'Al Jazeera English', handle: '@aljazeeraenglish', expected: 'news-politics',
    description: 'Breaking news, analysis and documentaries from around the world.' },
  { title: 'Caspian Report', handle: '@CaspianReport', expected: 'news-politics',
    description: 'Geopolitical analysis of conflicts, economies and power around the world.' },
  { title: 'Dhruv Rathee', handle: '@dhruvrathee', expected: 'news-politics',
    description: 'Videos on politics, social issues and current affairs, explained simply. Business inquiries: contact@example.com' },
  { title: 'Le Monde', handle: '@lemondefr', expected: 'news-politics',
    description: "L'actualité expliquée en vidéo par les journalistes du Monde." },

  // Art & Design
  { title: 'Proko', handle: '@ProkoTV', expected: 'art-design',
    description: 'Learn to draw: anatomy, figure drawing and portraits taught by professional artists.' },
  { title: 'Sinix Design', handle: '@SinixDesign', expected: 'art-design',
    description: 'Painting tutorials and digital art critiques.' },
  { title: 'The Futur', handle: '@thefutur', expected: 'art-design',
    description: 'Teaching designers the business of design: branding, typography and pricing your creative work.' },
  { title: 'Lena Danya', handle: '@LenaDanya', expected: 'art-design',
    description: 'Acrylic painting, gouache experiments and sketchbook tours.' },
  { title: 'Ross Draws', handle: '@RossDraws', expected: 'art-design',
    description: 'Painting and illustration tutorials full of colour and fun.' },
  { title: 'Florian Gadsby', handle: '@FlorianGadsby', expected: 'art-design',
    description: 'A potter in London making functional ceramics on the wheel.' },

  // Travel & Outdoors
  { title: 'Kara and Nate', handle: '@karaandnate', expected: 'travel-outdoor',
    description: 'Full-time travelers on a mission to visit every country, sharing travel tips along the way.' },
  { title: 'Bald and Bankrupt', handle: '@baldandbankrupt', expected: 'travel-outdoor',
    description: 'Off the beaten path in the former Soviet Union and beyond.' },
  { title: 'My Self Reliance', handle: '@MySelfReliance', expected: 'travel-outdoor',
    description: 'Off-grid living in a log cabin I built in the Canadian wilderness.' },
  { title: 'Steve Wallis', handle: '@SteveWallis', expected: 'travel-outdoor',
    description: 'Stealth camping, hearty meals and good times outdoors.' },
  { title: 'Lost LeBlanc', handle: '@LostLeBlanc', expected: 'travel-outdoor',
    description: "Cinematic travel films and guides to the world's most beautiful destinations." },

  // Automotive & Vehicles
  { title: 'carwow', handle: '@carwow', expected: 'auto-vehicles',
    description: 'Car reviews, drag races and help choosing your next car.' },
  { title: 'Hoonigan', handle: '@Hoonigan', expected: 'auto-vehicles',
    description: 'Burnouts, builds and car culture.' },
  { title: 'PowerDrift', handle: '@PowerDrift', expected: 'auto-vehicles',
    description: "India's automotive channel: car and bike reviews, comparisons and road tests." },
  { title: 'Engineering Explained', handle: '@EngineeringExplained', expected: 'auto-vehicles',
    description: 'How cars work: engines, suspension, tyres and the physics of driving.' },
  { title: 'AUTO BILD', handle: '@autobild', expected: 'auto-vehicles',
    description: 'Tests, Fahrberichte und News rund ums Auto.' },
  { title: '74 Gear', handle: '@74gear', expected: 'auto-vehicles',
    description: 'An airline pilot sharing what it is really like to fly airliners for a living.' },

  // General & Others (no folder in the taxonomy fits)
  { title: 'Sadhguru', handle: '@sadhguru', expected: 'general-other',
    description: 'Yogi, mystic and visionary. Talks on spirituality, meditation and wellbeing.' },
  { title: 'BibleProject', handle: '@bibleproject', expected: 'general-other',
    description: 'Animated videos that explore the story of the Bible.' },
  { title: "Zak George's Dog Training Revolution", handle: '@ZakGeorge', expected: 'general-other',
    description: 'Positive, science-based dog training tips for every dog owner.' },
];
