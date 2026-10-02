/**
 * IdeaForge - YouTube Content Idea Generator
 * Tech Stack: Plain Vanilla JavaScript (ES6+)
 * Local Storage Key: ideaforge_v1
 */

'use strict';

/* ==========================================================================
   1. State & Storage Management
   ========================================================================== */
const STORAGE_KEY = 'ideaforge_v1';

const DEFAULT_STATE = {
  theme: 'dark',
  saved: [], // Array of saved idea objects
  history: [], // Array of past generation sessions
  stats: {
    totalIdeas: 0,
    savedIdeas: 0,
    generations: 0,
    lastGenDate: null,
    streak: 0,
    dailyCounts: {}, // { 'YYYY-MM-DD': count }
    topics: {} // { topicName: count }
  }
};

let state = loadState();
let currentIdeas = []; // Holds currently generated 10 ideas in memory
let usedTitlesInSession = new Set(); // Prevent duplicate titles in generation

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      theme: parsed.theme || 'light',
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      stats: {
        totalIdeas: parsed.stats?.totalIdeas || 0,
        savedIdeas: parsed.stats?.savedIdeas || 0,
        generations: parsed.stats?.generations || 0,
        lastGenDate: parsed.stats?.lastGenDate || null,
        streak: parsed.stats?.streak || 0,
        dailyCounts: parsed.stats?.dailyCounts || {},
        topics: parsed.stats?.topics || {}
      }
    };
  } catch (err) {
    console.warn('Failed to load localStorage state, using defaults:', err);
    return { ...DEFAULT_STATE };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save state to localStorage:', err);
  }
}

/* ==========================================================================
   2. Banned Words & Writing Quality Safeguards
   ========================================================================== */
const BANNED_WORDS = [
  'unleash', 'unlock', 'dive into', 'delve', 'ultimate guide',
  'game-changer', 'revolutionize', 'supercharge', 'elevate',
  'master the art', "in today's fast-paced world", 'journey',
  'landscape', 'leverage', 'seamless', 'cutting-edge',
  'comprehensive', 'crucial', 'tapestry'
];

function sanitizeString(str) {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
}

function formatTopicInput(topic) {
  let cleaned = sanitizeString(topic);
  // Check if topic is acronym like "SQL", "HTML", "iPhone", "SaaS"
  if (/[A-Z]{2,}/.test(cleaned) || /[a-z][A-Z]/.test(cleaned)) {
    return cleaned;
  }
  return cleaned.toLowerCase();
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ==========================================================================
   3. Idea Types Library (24 Core Types + Niche Specials)
   ========================================================================== */
const IDEA_TYPES_LIBRARY = [
  {
    id: 'type-mistakes',
    type: 'Beginner mistakes',
    format: 'Talking head · Easy',
    effort: 'Easy',
    baseScore: 84,
    titleTemplates: [
      '5 {topic} mistakes {audience} keep making',
      'Stop making these {topic} mistakes if you are a {audience}',
      'The worst {topic} habit holding {audience} back',
      '3 simple {topic} fixes for {audience}'
    ],
    hookTemplates: [
      'If you are still doing this, you are making your progress twice as hard as it needs to be.',
      'Most {audience} mess this up in their first week without even realizing it.',
      'Here is the exact reason why your {topic} isn\'t getting the results you want.'
    ],
    thumbnailTemplates: [
      { visual: 'Close up of creator pointing at bad practice with red X', overlay: 'STOP THIS' },
      { visual: 'Split comparison showing WRONG vs RIGHT technique', overlay: 'WRONG WAY' },
      { visual: 'Shocked creator face looking at a big error graphic', overlay: 'DON\'T DO THIS' }
    ],
    whyTemplates: [
      'Mistake videos trigger curiosity and fear of missing out, driving massive CTR.',
      'Viewers love quick diagnostic advice that fixes immediate pain points.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Call out the #1 mistake instantly with high energy.',
      'Setup (15-45s): Explain why this mistake is so common among ' + a + '.',
      'Main Beat 1: Breakdown of mistakes #1 & #2 with real visual examples.',
      'Main Beat 2: Breakdown of mistakes #3-#5 and the instant fix for each.',
      'Call to Action: Ask viewers which mistake they were making + subscribe prompt.'
    ]
  },
  {
    id: 'type-mythbuster',
    type: 'Myth-buster',
    format: 'Talking head + B-roll · Easy',
    effort: 'Easy',
    baseScore: 88,
    titleTemplates: [
      'The biggest {topic} myth {audience} still believe',
      'Why common {topic} advice for {audience} is dead wrong',
      'I tested popular {topic} advice so you don\'t have to',
      'The truth about {topic} for {audience}'
    ],
    hookTemplates: [
      'Everyone tells you to do this for {topic}, but the actual data says the exact opposite.',
      'If you are following traditional advice on {topic}, you might be wasting hours of your time.',
      'Let\'s bust the biggest myth surrounding {topic} once and for all.'
    ],
    thumbnailTemplates: [
      { visual: 'Creator holding a sign that says "LIE" in bold red text', overlay: 'FAKE NEWS' },
      { visual: 'Surprised face pointing at popular belief graphic', overlay: 'NOT TRUE' },
      { visual: 'Split screen: Myth vs Science proof', overlay: 'THE TRUTH' }
    ],
    whyTemplates: [
      'Challenging established wisdom sparks strong emotion and high comment section debate.',
      'Debunking myths instantly establishes you as an authoritative, honest creator.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): State the myth loud and clear, then state why it is false.',
      'Setup (15-45s): How this myth became popular in the ' + t + ' community.',
      'Main Beat 1: The actual science/reality behind how ' + t + ' works.',
      'Main Beat 2: A practical replacement method for ' + a + '.',
      'Call to Action: Drop a comment with other myths to bust next.'
    ]
  },
  {
    id: 'type-vs',
    type: 'X vs Y comparison',
    format: 'Side-by-side review · Medium',
    effort: 'Medium',
    baseScore: 86,
    titleTemplates: [
      'Popular {topic} methods compared for {audience}',
      '{topic} option A vs option B: which wins for {audience}?',
      'Expensive vs budget {topic}: what {audience} actually need',
      'Testing 2 popular {topic} approaches side by side'
    ],
    hookTemplates: [
      'I tested both approaches side by side for 30 days to see which one actually wins.',
      'Before spending another dollar on {topic}, you need to see this direct comparison.',
      'Which of these two {topic} choices is worth your precious time?'
    ],
    thumbnailTemplates: [
      { visual: 'Split screen with left side vs right side and question mark', overlay: 'VS' },
      { visual: 'Creator holding two competing tools or methods', overlay: 'WHICH WINS?' },
      { visual: 'Price tag contrast: cheap vs expensive gear', overlay: 'BUY THIS?' }
    ],
    whyTemplates: [
      'Comparison videos rank high in search because people watch them right before taking action.',
      'Clear decision frameworks provide immense practical utility.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Present both options and reveal the testing criteria.',
      'Setup (15-45s): Overview of Option A vs Option B for ' + a + '.',
      'Main Beat 1: Deep dive into pros and cons of Option A.',
      'Main Beat 2: Deep dive into pros and cons of Option B.',
      'Call to Action: Final verdict & recommendation for different budgets.'
    ]
  },
  {
    id: 'type-challenge',
    type: 'N-day challenge',
    format: 'Vlog / Experiment · Hard',
    effort: 'Hard',
    baseScore: 92,
    titleTemplates: [
      'I tried {topic} for {n} days as a {audience}',
      'What happens when a {audience} does {topic} for {n} days',
      'I committed to {topic} for {days} days straight',
      '{n} days of {topic}: the honest results for {audience}'
    ],
    hookTemplates: [
      'Can you actually see real results in just {n} days? Here is what nobody tells you.',
      'I did {topic} every single day for a month, and the result surprised even me.',
      'Here is what happened to my routine when I forced myself to stick with {topic}.'
    ],
    thumbnailTemplates: [
      { visual: 'Day 1 vs Day 30 side-by-side progress photo', overlay: '30 DAYS' },
      { visual: 'Calendar with checkmarks leading to final result photo', overlay: 'IT WORKED?' },
      { visual: 'Exhausted creator at midpoint vs triumphant finish', overlay: 'RESULTS' }
    ],
    whyTemplates: [
      'Time-bound personal experiments create a natural storytelling arc with high retention.',
      'Audiences love watching real transformations without taking the risk themselves.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Show a 3-second teaser of the day 30 final result.',
      'Setup (15-45s): Rules of the challenge and baseline starting point.',
      'Main Beat 1: Days 1-7 struggles and initial adjustment period.',
      'Main Beat 2: Days 8-30 breakthroughs, data metrics, and key takeaways.',
      'Call to Action: Challenge the audience to try a 7-day mini version.'
    ]
  },
  {
    id: 'type-casestudy',
    type: 'Case study',
    format: 'Screen share + Breakdown · Medium',
    effort: 'Medium',
    baseScore: 85,
    titleTemplates: [
      'How this simple strategy transformed {topic} for {audience}',
      'How a {audience} mastered {topic} in 30 days',
      'Deconstructing a successful {topic} blueprint for {audience}',
      'The exact formula used to win at {topic}'
    ],
    hookTemplates: [
      'Here is the exact step-by-step breakdown of how a {audience} achieved top results.',
      'We analyzed dozens of examples of {topic}, and found 3 patterns everyone copies.',
      'Steal this exact blueprint if you want to fast-track your {topic} progress.'
    ],
    thumbnailTemplates: [
      { visual: 'Growth chart curve pointing sharply upward', overlay: '10X BLUEPRINT' },
      { visual: 'Creator pointing at breakdown whiteboard', overlay: 'HOW IT WORKS' },
      { visual: 'Case study subject with success metrics overlay', overlay: 'STEAL THIS' }
    ],
    whyTemplates: [
      'Case studies offer concrete proof and actionable frameworks viewers can replicate.',
      'High authority format that attracts serious, highly engaged subscribers.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Highlight the headline result achieved in the case study.',
      'Setup (15-45s): Context on where the subject started before applying the method.',
      'Main Beat 1: The key strategy shift that unlocked rapid progress.',
      'Main Beat 2: Common bottlenecks faced and how they were solved.',
      'Call to Action: Downloadable template or workflow link in description.'
    ]
  },
  {
    id: 'type-tutorial',
    type: 'Step-by-step tutorial',
    format: 'Tutorial · Medium',
    effort: 'Medium',
    baseScore: 87,
    titleTemplates: [
      'The simple {topic} roadmap for {audience}',
      'How to get started with {topic} as a {audience}',
      '{topic} for {audience}: step-by-step guide ({year})',
      'Master {topic} in 4 simple steps'
    ],
    hookTemplates: [
      'If I had to start {topic} completely over from scratch today, this is the exact blueprint I would follow.',
      'No fluff, no wasted time. Here is everything a {audience} needs to know.',
      'By the end of this video, you will have a complete, working system for {topic}.'
    ],
    thumbnailTemplates: [
      { visual: 'Step 1-2-3 numbered badges with clean graphics', overlay: 'EASY STEPS' },
      { visual: 'Creator pointing at a clean beginner diagram', overlay: 'START HERE' },
      { visual: 'Target graphic with arrow hitting bullseye', overlay: 'COMPLETE GUIDE' }
    ],
    whyTemplates: [
      'Actionable step-by-step roadmaps get saved, shared, and rewatched constantly.',
      'Lowers friction for beginners overwhelmed by information overload.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Clear promise of what viewer will be able to do in 10 minutes.',
      'Setup (15-45s): Required tools / mindset needed before step 1.',
      'Main Beat 1: Step 1 (Foundation) & Step 2 (Core Execution).',
      'Main Beat 2: Step 3 (Optimization) & Step 4 (Maintenance).',
      'Call to Action: Encouragement + subscribe for weekly tutorials.'
    ]
  },
  {
    id: 'type-budget',
    type: 'Budget/cheap version',
    format: 'Talking head + Gear · Easy',
    effort: 'Easy',
    baseScore: 83,
    titleTemplates: [
      '{topic} on a budget: what {audience} actually need',
      'How to do {topic} without spending a fortune',
      'The cheap {topic} setup for {audience}',
      'Zero-dollar {topic} hacks for {audience}'
    ],
    hookTemplates: [
      'You do not need to spend thousands of dollars to get great results with {topic}.',
      'Here are the budget alternatives for {topic} that work almost as well as top-tier gear.',
      'Stop wasting money on unnecessary tools. Here is what you actually need.'
    ],
    thumbnailTemplates: [
      { visual: 'Creator holding dollar bills next to budget gear', overlay: '$0 BUDGET' },
      { visual: 'Expensive item crossed out vs cheap alternative circled', overlay: 'SAVE MONEY' },
      { visual: 'Budget price tag tag highlighted in bright neon yellow', overlay: 'CHEAP & EASY' }
    ],
    whyTemplates: [
      'Budget content opens your channel to the widest possible audience looking to start cheap.',
      'High search volume for affordable solutions.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Show that expensive setups aren\'t mandatory for ' + a + '.',
      'Setup (15-45s): Total budget target breakdown ($0 to $50).',
      'Main Beat 1: The 3 essential budget items worth buying.',
      'Main Beat 2: Free DIY alternatives for everything else.',
      'Call to Action: Links to budget items in description.'
    ]
  },
  {
    id: 'type-wishiknew',
    type: 'Things I wish I knew',
    format: 'Talking head · Easy',
    effort: 'Easy',
    baseScore: 89,
    titleTemplates: [
      '7 things I wish I knew before starting {topic}',
      'What I wish someone told me about {topic} earlier',
      'If I could restart {topic} as a {audience}, I would do this',
      'Lessons from 3 years of {topic} for {audience}'
    ],
    hookTemplates: [
      'I lost months of progress making these errors. Don\'t make the same mistakes I did.',
      'Looking back on my {topic} experience, there are 5 things I wish someone explained day one.',
      'Save yourself months of frustration by knowing these key insights right now.'
    ],
    thumbnailTemplates: [
      { visual: 'Thoughtful creator face with regret gesture', overlay: 'IF ONLY...' },
      { visual: 'Creator talking directly into camera with serious look', overlay: 'MY REGRETS' },
      { visual: 'Time machine or retro calendar graphic overlay', overlay: 'START OVER' }
    ],
    whyTemplates: [
      'Hindsight insights from experienced creators build deep rapport and trust.',
      'Viewers love learning from other people\'s hard lessons.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Express the single biggest regret from your early days.',
      'Setup (15-45s): Quick background on how long you\'ve been doing ' + t + '.',
      'Main Beat 1: Insights #1 to #3 regarding gear and mindset.',
      'Main Beat 2: Insights #4 to #7 regarding daily consistency and strategy.',
      'Call to Action: Ask viewers what lesson surprised them most.'
    ]
  },
  {
    id: 'type-reacting',
    type: 'Reacting to common advice',
    format: 'Reaction / Commentary · Easy',
    effort: 'Easy',
    baseScore: 81,
    titleTemplates: [
      'Testing popular {topic} advice from the internet',
      'Reacting to terrible {topic} advice for {audience}',
      'Does viral {topic} advice actually work?',
      'Rating {topic} tips for {audience} from worst to best'
    ],
    hookTemplates: [
      'I tested the top 5 viral tips for {topic} to see which ones are legit and which are total garbage.',
      'Internet gurus love giving this advice, but let\'s see if it holds up in real life.',
      'Let\'s react to the most common {topic} suggestions out there.'
    ],
    thumbnailTemplates: [
      { visual: 'Laptop screen with creator giving facepalm gesture', overlay: 'REAL OR FAKE?' },
      { visual: 'Rating scale from S-tier to F-tier overlay', overlay: 'RATING TIPS' },
      { visual: 'Confused face looking at viral video screenshot', overlay: 'SERIOUSLY?' }
    ],
    whyTemplates: [
      'Taps into pre-existing search traffic of viral trends and famous advice.',
      'Entertaining commentary format with high viewer engagement.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Play 5-second clip/quote of the viral advice.',
      'Setup (15-45s): Why this advice is spreading fast among ' + a + '.',
      'Main Beat 1: Testing advice item #1 and #2 with real scoring.',
      'Main Beat 2: Testing advice item #3 and #4 + final tier ranking.',
      'Call to Action: Send clips for next reaction video in comments.'
    ]
  },
  {
    id: 'type-behindthescenes',
    type: 'Behind the scenes',
    format: 'Vlog / Process · Medium',
    effort: 'Medium',
    baseScore: 80,
    titleTemplates: [
      'Inside my daily {topic} system for {audience}',
      'How I organize my {topic} workflow step by step',
      'Behind the scenes of a realistic {topic} routine',
      'The secret {topic} setup behind my results'
    ],
    hookTemplates: [
      'Ever wonder what a realistic, unglamorous {topic} routine looks like? Let me show you.',
      'Today I\'m opening up my full workspace and system so you can see how it all comes together.',
      'No polished facade—here is the exact daily routine I use for {topic}.'
    ],
    thumbnailTemplates: [
      { visual: 'Behind the camera perspective shot of workstation', overlay: 'UNFILTERED' },
      { visual: 'Creator organizing setup with peak efficiency', overlay: 'REAL ROUTINE' },
      { visual: 'Over-the-shoulder view of real work in progress', overlay: 'BEHIND SCENES' }
    ],
    whyTemplates: [
      'Authentic transparency creates a personal connection that turns casual viewers into loyal fans.',
      'High rewatchability for workflow details.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Quick 5-second montage of the behind-the-scenes workflow.',
      'Setup (15-45s): Why having a repeatable system is key for ' + a + '.',
      'Main Beat 1: Morning preparation and tool setup.',
      'Main Beat 2: Core execution phase and troubleshooting live errors.',
      'Call to Action: Comment your current routine setup.'
    ]
  },
  {
    id: 'type-toolstack',
    type: 'Tool/resource stack',
    format: 'Overview · Easy',
    effort: 'Easy',
    baseScore: 85,
    titleTemplates: [
      'My exact {topic} setup for {audience}',
      '5 essential tools every {audience} needs for {topic}',
      'The ultimate {topic} resource stack ({year})',
      'Best free tools for {topic} in {year}'
    ],
    hookTemplates: [
      'These 4 essential tools cut my workload in half and doubled my consistency with {topic}.',
      'If you are doing {topic} without these free tools, you are doing it the hard way.',
      'Here are the exact apps, tools, and resources I rely on every single week.'
    ],
    thumbnailTemplates: [
      { visual: 'Neatly arranged app icons or physical tools grid', overlay: 'MY STACK' },
      { visual: 'Creator pointing at 4 floating software badges', overlay: 'BEST TOOLS' },
      { visual: 'Tool chest graphic with glowing golden light', overlay: 'MUST HAVES' }
    ],
    whyTemplates: [
      'Tool lists attract high-intent viewers looking for immediate practical upgrades.',
      'Great potential for affiliate links and resource downloads.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Name the top tool that saved the most time.',
      'Setup (15-45s): How tool selection impacts ' + t + ' outcomes.',
      'Main Beat 1: Essential Tool #1 and Tool #2 (Free tier focus).',
      'Main Beat 2: Essential Tool #3 and Tool #4 (Pro features).',
      'Call to Action: All links listed in description box.'
    ]
  },
  {
    id: 'type-dayinlife',
    type: 'Day in the life',
    format: 'Vlog · Medium',
    effort: 'Medium',
    baseScore: 82,
    titleTemplates: [
      'A realistic day of {topic} for {audience}',
      'Day in the life of a {audience} focusing on {topic}',
      'How I balance {topic} with a full schedule',
      '24 hours of {topic}: realistic routine for {audience}'
    ],
    hookTemplates: [
      'No fake 5 AM wakeups or unrealistic routines. Here is what balancing {topic} actually looks like.',
      'Come along with me for a full day as I navigate {topic} alongside a busy schedule.',
      'Here is how a real {audience} manages their time without burning out.'
    ],
    thumbnailTemplates: [
      { visual: 'Clock graphic showing daily timeline points', overlay: 'REAL DAY' },
      { visual: 'Morning coffee shot vs evening workout contrast', overlay: '24 HOURS' },
      { visual: 'Creator walking outdoors carrying daily gear', overlay: 'FOLLOW ALONG' }
    ],
    whyTemplates: [
      'Relatable storytelling helps viewers visualize how to fit new habits into their own life.',
      'Establishes strong creator-audience rapport.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Quick cinematic teaser of the day\'s highlight.',
      'Setup (15-45s): Daily goal and schedule constraints for ' + a + '.',
      'Main Beat 1: Morning routine and main ' + t + ' session.',
      'Main Beat 2: Afternoon adjustment, meals, and evening review.',
      'Call to Action: Share your daily schedule in the comments.'
    ]
  },
  {
    id: 'type-beforeafter',
    type: 'Before vs after',
    format: 'Case Study / Vlog · Medium',
    effort: 'Medium',
    baseScore: 91,
    titleTemplates: [
      'What happens when {audience} fix their {topic}',
      '{topic} transformation: before and after 30 days',
      'From struggling to succeeding with {topic}',
      'The difference proper {topic} makes for {audience}'
    ],
    hookTemplates: [
      'Look at the difference just 2 weeks of proper execution makes for {topic}.',
      'Here is what changed when we stopped guessing and applied a proven {topic} framework.',
      'The contrast between day 1 and day 30 will show you why this method works.'
    ],
    thumbnailTemplates: [
      { visual: 'Split screen: sad/messy BEFORE vs clean/happy AFTER', overlay: 'TRANSFORM' },
      { visual: 'Bold red arrow pointing from low metric to high metric', overlay: 'RESULTS' },
      { visual: 'Creator holding progress report card', overlay: 'BEFORE vs AFTER' }
    ],
    whyTemplates: [
      'Visual transformations provide compelling social proof and high emotional payoff.',
      'One of the highest-converting YouTube video archetypes.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Show the dramatic contrast between Before and After.',
      'Setup (15-45s): The exact pain points experienced in the "Before" state.',
      'Main Beat 1: The key intervention applied to ' + t + '.',
      'Main Beat 2: The measurable outcome in the "After" state.',
      'Call to Action: Step-by-step guide link for viewers wanting similar results.'
    ]
  },
  {
    id: 'type-opinion',
    type: 'Unpopular opinion',
    format: 'Talking head · Easy',
    effort: 'Easy',
    baseScore: 84,
    titleTemplates: [
      'Why most {audience} get {topic} completely wrong',
      'Unpopular opinion: stop overcomplicating {topic}',
      'The harsh reality of {topic} for {audience}',
      'Why I disagree with conventional {topic} advice'
    ],
    hookTemplates: [
      'This might make some people mad in the comments, but somebody needs to say it.',
      'Everyone in the {topic} space is pushing this trend, but it is actually terrible for {audience}.',
      'Here is the blunt truth about {topic} that most creators are afraid to talk about.'
    ],
    thumbnailTemplates: [
      { visual: 'Serious creator looking directly at camera with crossed arms', overlay: 'HOT TAKE' },
      { visual: 'Popular trend crossed out with red spray paint graphic', overlay: 'WRONG!' },
      { visual: 'Creator with expressive warning hand gesture', overlay: 'UNPOPULAR' }
    ],
    whyTemplates: [
      'Controversy and strong opinions spark vibrant comment discussions.',
      'Differentiates your channel from generic consensus content.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Deliver the hot take clearly within 10 seconds.',
      'Setup (15-45s): Acknowledge why the mainstream view exists.',
      'Main Beat 1: Argument #1 and #2 exposing flaws in mainstream thinking.',
      'Main Beat 2: Present your alternative approach tailored for ' + a + '.',
      'Call to Action: Ask viewers whether they agree or disagree in comments.'
    ]
  },
  {
    id: 'type-realitycheck',
    type: 'Reality check',
    format: 'Talking head · Easy',
    effort: 'Easy',
    baseScore: 86,
    titleTemplates: [
      'The honest truth about {topic} nobody talks about',
      'What nobody tells {audience} about {topic}',
      'The dark side of {topic} for {audience}',
      'Realistic expectations for {topic} in {year}'
    ],
    hookTemplates: [
      'Behind the hype and polished social media posts, here is what doing {topic} actually requires.',
      'Before you commit your time to {topic}, you need to know these 3 unvarnished facts.',
      'Let\'s set realistic expectations so you don\'t get discouraged early on.'
    ],
    thumbnailTemplates: [
      { visual: 'Creator sitting back with candid, honest expression', overlay: 'REAL TALK' },
      { visual: 'Expectation vs Reality split visual', overlay: 'TRUTH' },
      { visual: 'Warning sign next to topic graphic', overlay: 'READ THIS' }
    ],
    whyTemplates: [
      'Radical honesty builds deep trust and long-term viewer loyalty.',
      'Sets realistic benchmarks so audience members stay engaged.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): State the #1 expectation vs reality mismatch.',
      'Setup (15-45s): Why online hype distorts expectations for ' + a + '.',
      'Main Beat 1: Reality check #1 (Time commitment) and #2 (Cost).',
      'Main Beat 2: How to overcome these real barriers effectively.',
      'Call to Action: Encouragement message + subscribe for transparent advice.'
    ]
  },
  {
    id: 'type-roadmap',
    type: 'Beginner roadmap',
    format: 'Guide / Presentation · Medium',
    effort: 'Medium',
    baseScore: 88,
    titleTemplates: [
      'How to start {topic} from scratch in {year}',
      'The zero-to-hero {topic} roadmap for {audience}',
      'If I had to learn {topic} from zero, I would do this',
      'Complete beginner blueprint for {topic}'
    ],
    hookTemplates: [
      'Zero experience? No problem. Here is your complete zero-to-one blueprint for {topic}.',
      'Don\'t waste time wandering around YouTube tutorials. Here is the exact order to learn things.',
      'Follow these 4 phases to go from complete beginner to confident with {topic}.'
    ],
    thumbnailTemplates: [
      { visual: 'Winding road diagram leading to trophy icon', overlay: 'START HERE' },
      { visual: 'Phase 1-2-3-4 step graphics with clean typography', overlay: 'ROADMAP' },
      { visual: 'Creator pointing at beginner checklist board', overlay: 'ZERO TO HERO' }
    ],
    whyTemplates: [
      'Evergreen search content that steadily accumulates views over months and years.',
      'Crucial entry point for new subscribers discovering your channel.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Promise a structured learning order without overwhelm.',
      'Setup (15-45s): Prerequisites and mindset needed for ' + a + '.',
      'Main Beat 1: Phase 1 (Fundamentals) & Phase 2 (Building Consistency).',
      'Main Beat 2: Phase 3 (Advanced Polish) & Phase 4 (Long-term Mastery).',
      'Call to Action: Downloadable roadmap graphic link in description.'
    ]
  },
  {
    id: 'type-qna',
    type: 'Q&A from comments',
    format: 'Talking head · Easy',
    effort: 'Easy',
    baseScore: 79,
    titleTemplates: [
      'Answering the hardest {topic} questions from {audience}',
      'Addressing your top {topic} concerns',
      '{topic} Q&A: solving common struggles for {audience}',
      'Your biggest {topic} questions answered'
    ],
    hookTemplates: [
      'I picked the top 5 most requested questions from last week\'s comments on {topic}.',
      'Struggling with {topic}? Let\'s answer the most common questions you sent in.',
      'Here are straight answers to the questions every {audience} is asking.'
    ],
    thumbnailTemplates: [
      { visual: 'Overlaid comment speech bubbles over creator face', overlay: 'Q&A TIME' },
      { visual: 'Creator with questioning look holding speech bubble', overlay: 'YOU ASKED' },
      { visual: 'Question mark icon with bright accent glow', overlay: 'ANSWERS' }
    ],
    whyTemplates: [
      'Community Q&A videos make subscribers feel valued and boost future comment engagement.',
      'Directly addresses real audience pain points.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Feature top question #1 directly on screen.',
      'Setup (15-45s): Thank community and explain session format.',
      'Main Beat 1: Deep answers to Questions #1, #2, and #3.',
      'Main Beat 2: Deep answers to Questions #4 and #5 + bonus tip.',
      'Call to Action: Ask viewers to leave questions for part 2.'
    ]
  },
  {
    id: 'type-stopdoing',
    type: 'Stop doing this',
    format: 'Talking head · Easy',
    effort: 'Easy',
    baseScore: 85,
    titleTemplates: [
      'Stop doing this with {topic} immediately',
      'The #1 mistake ruining {topic} for {audience}',
      'If you do this in {topic}, stop right now',
      'Why this common {topic} habit is killing your progress'
    ],
    hookTemplates: [
      'If you are doing this one common habit with {topic}, you are accidentally ruining your results.',
      'I see so many {audience} make this exact error. Here is why you must stop today.',
      'Break this single bad habit and watch your {topic} performance double.'
    ],
    thumbnailTemplates: [
      { visual: 'Creator holding hand up in stop sign gesture', overlay: 'STOP THIS' },
      { visual: 'Red stop sign icon over common bad practice', overlay: 'NO MORE' },
      { visual: 'Warning banner with bold typography overlay', overlay: 'SERIOUS ERROR' }
    ],
    whyTemplates: [
      'Urgency-based warnings trigger strong click-through motivation.',
      'Identifies subtle flaws viewers may not realize they have.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Name the bad habit immediately within 8 seconds.',
      'Setup (15-45s): Explain why ' + a + ' fall into this habit trap.',
      'Main Beat 1: The hidden negative impact of this habit.',
      'Main Beat 2: The 2-minute replacement habit that fixes it.',
      'Call to Action: Subscribe for more quick performance tweaks.'
    ]
  },
  {
    id: 'type-speedrun',
    type: 'Speed run (learn in 1 video)',
    format: 'Fast-paced tutorial · Medium',
    effort: 'Medium',
    baseScore: 90,
    titleTemplates: [
      'Learn essential {topic} in under 10 minutes',
      'The 10-minute {topic} crash course for {audience}',
      '{topic} speedrun: everything {audience} need fast',
      'Fast-track {topic}: zero fluff guide'
    ],
    hookTemplates: [
      'No fluff, no 5-minute intro. Just pure actionable {topic} value starting right now.',
      'If you only have 10 minutes to learn {topic}, this is the only video you need.',
      'Here is the ultimate fast-paced breakdown for busy {audience}.'
    ],
    thumbnailTemplates: [
      { visual: 'Stopwatch icon hitting 09:59 timer mark', overlay: 'FAST GUIDE' },
      { visual: 'Lightning bolt graphic with fast motion blur', overlay: '10 MINUTES' },
      { visual: 'Creator pointing at rapid timeline chart', overlay: 'NO FLUFF' }
    ],
    whyTemplates: [
      'High retention format because viewers appreciate rapid value without filler.',
      'Appeals directly to busy audiences with limited time.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): On-screen timer starts counting down from 10:00.',
      'Setup (15-45s): Outline the 3 core pillars to cover fast.',
      'Main Beat 1: Pillar 1 (Essentials) & Pillar 2 (Execution) at 2x speed style.',
      'Main Beat 2: Pillar 3 (Common Traps to Avoid).',
      'Call to Action: Pause & bookmark video for future reference.'
    ]
  },
  {
    id: 'type-expertvsnoob',
    type: 'Expert vs beginner',
    format: 'Comparison / Demonstration · Medium',
    effort: 'Medium',
    baseScore: 87,
    titleTemplates: [
      '{topic}: Expert approach vs Beginner approach',
      'How a pro does {topic} vs a {audience}',
      '3 levels of {topic}: beginner to advanced',
      'What separates pro {topic} from beginner {topic}'
    ],
    hookTemplates: [
      'The difference between beginners and pros in {topic} comes down to these 3 simple habits.',
      'Watch what happens when a total beginner and an experienced pro tackle the same {topic} task.',
      'Here is how to level up your {topic} execution from tier 1 to tier 3.'
    ],
    thumbnailTemplates: [
      { visual: 'Split face image: confused beginner vs confident pro', overlay: 'PRO VS NOOB' },
      { visual: 'Level 1 vs Level 100 skill bar overlay', overlay: 'LEVEL UP' },
      { visual: 'Side-by-side comparison of output quality', overlay: '3 LEVELS' }
    ],
    whyTemplates: [
      'Level-based comparison format provides clear aspirational targets.',
      'Highly engaging visually with strong contrast.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Show side-by-side result of beginner vs expert.',
      'Setup (15-45s): Define what characterizes Level 1 vs Level 3 for ' + a + '.',
      'Main Beat 1: Level 1 (Beginner habits) vs Level 2 (Intermediate).',
      'Main Beat 2: Level 3 (Expert secret techniques).',
      'Call to Action: Comment which level you are currently at.'
    ]
  },
  {
    id: 'type-experiment',
    type: 'Experiment/test',
    format: 'Experiment / Testing · Medium',
    effort: 'Medium',
    baseScore: 86,
    titleTemplates: [
      'I tested 3 {topic} hacks for {audience}',
      'Testing viral {topic} claims so you don\'t have to',
      'Does this popular {topic} strategy actually work?',
      'Putting {topic} advice to the ultimate test'
    ],
    hookTemplates: [
      'Do viral internet hacks actually work? I spent a week testing them all for {topic}.',
      'We put 3 popular claims about {topic} through a rigorous test. Here are the results.',
      'Let\'s find out if this simple {topic} trick lives up to the hype.'
    ],
    thumbnailTemplates: [
      { visual: 'Science flask or clipboard graphic with checkmarks', overlay: 'TESTED!' },
      { visual: 'Creator holding measuring tape or test log', overlay: 'IT WORKED?' },
      { visual: 'Big green checkmark vs red X on test subjects', overlay: '3 HACKS' }
    ],
    whyTemplates: [
      'Satisfies viewer curiosity without requiring them to spend time testing.',
      'Data-driven testing builds high credibility.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Show the test setup and target outcome metric.',
      'Setup (15-45s): Testing methodology and controls for ' + a + '.',
      'Main Beat 1: Test #1 & Test #2 live execution and raw findings.',
      'Main Beat 2: Test #3 final verdict and score out of 10.',
      'Call to Action: Suggest future experiments in the comments.'
    ]
  },
  {
    id: 'type-storytime',
    type: 'Storytime',
    format: 'Vlog / Storytelling · Medium',
    effort: 'Medium',
    baseScore: 83,
    titleTemplates: [
      'My worst {topic} disaster and what it taught me',
      'How I almost failed at {topic} as a {audience}',
      'The story behind my biggest {topic} breakthrough',
      'What happened when I ignored basic {topic} rules'
    ],
    hookTemplates: [
      'Everything went completely wrong with my {topic} setup, but it ended up being my biggest lesson.',
      'I was ready to give up on {topic} completely until I discovered this single realization.',
      'Here is the story of how a major mistake turned into my best strategy.'
    ],
    thumbnailTemplates: [
      { visual: 'Dramatic warning icon with head-in-hands creator photo', overlay: 'MY MISTAKE' },
      { visual: 'Creator telling story with expressive gestures', overlay: 'STORY TIME' },
      { visual: 'Broken gear or failed attempt visual', overlay: 'DISASTER' }
    ],
    whyTemplates: [
      'Vulnerability and personal story arcs forge deep emotional connections with viewers.',
      'Memorable narrative structure increases watch time.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Start right at the climax of the story conflict.',
      'Setup (15-45s): Rewind to how things began for ' + a + '.',
      'Main Beat 1: The unfolding failure and turning point realization.',
      'Main Beat 2: The recovery phase and key lesson learned.',
      'Call to Action: Share your worst story in the comments.'
    ]
  },
  {
    id: 'type-trends',
    type: 'Trends breakdown',
    format: 'Industry review · Medium',
    effort: 'Medium',
    baseScore: 84,
    titleTemplates: [
      'New {topic} trends every {audience} should know',
      'The future of {topic} in {year}',
      '3 major {topic} shifts happening right now',
      'Where {topic} is heading for {audience}'
    ],
    hookTemplates: [
      'The {topic} industry is changing fast. Here are the 3 major shifts happening right now.',
      'If you are still using last year\'s {topic} strategy, you are already falling behind.',
      'Here are the upcoming trends that every {audience} needs on their radar.'
    ],
    thumbnailTemplates: [
      { visual: 'Upward trendline with futuristic accent glow', overlay: 'NEW TRENDS' },
      { visual: 'Creator looking into futuristic binoculars graphic', overlay: 'WHAT\'S NEXT' },
      { visual: 'Bold text overlay showing the target year', overlay: 'FUTURE INSIGHT' }
    ],
    whyTemplates: [
      'Positions your channel as forward-thinking and ahead of the curve.',
      'Captures high-volume news and trend search traffic.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Highlight the #1 biggest trend impacting ' + a + '.',
      'Setup (15-45s): Why traditional approaches are losing effectiveness.',
      'Main Beat 1: Breakdown of Trend #1 and Trend #2 with real examples.',
      'Main Beat 2: Breakdown of Trend #3 + practical adaptation action plan.',
      'Call to Action: Subscribe to stay updated on weekly trends.'
    ]
  },
  {
    id: 'type-checklist',
    type: 'Checklist/template giveaway',
    format: 'Resource breakdown · Easy',
    effort: 'Easy',
    baseScore: 88,
    titleTemplates: [
      'The ultimate 5-point {topic} checklist for {audience}',
      'My free {topic} template for {audience}',
      'The exact {topic} checklist I use every week',
      'Steal my 5-step {topic} framework'
    ],
    hookTemplates: [
      'I built the exact template I wish I had when I first started out with {topic}.',
      'Stop starting from a blank page. Here is a 5-point checklist you can copy right now.',
      'Here is the streamlined framework that guarantees consistent {topic} quality.'
    ],
    thumbnailTemplates: [
      { visual: 'Digital checklist document with green checkmarks', overlay: 'FREE TEMPLATE' },
      { visual: 'Creator holding up clipboard with checklist overlay', overlay: 'CHECKLIST' },
      { visual: 'Download icon next to clean template preview', overlay: 'STEAL THIS' }
    ],
    whyTemplates: [
      'Free resource giveaways create high save rates and strong subscriber conversions.',
      'Delivers immediate tangible value.'
    ],
    outline: (t, a) => [
      'Hook (0-15s): Display the clean 5-point checklist preview on screen.',
      'Setup (15-45s): Why using a checklist prevents costly oversight for ' + a + '.',
      'Main Beat 1: Walkthrough of Checklist items #1 to #3.',
      'Main Beat 2: Walkthrough of Checklist items #4 & #5.',
      'Call to Action: Grab the free copy link in description.'
    ]
  }
];

/* Niche-Specific Idea Additions */
const NICHE_SPECIALS = {
  Tech: [
    {
      id: 'niche-tech-setup',
      type: 'Setup tour',
      format: 'Tour / Desk setup · Medium',
      effort: 'Medium',
      baseScore: 89,
      titleTemplates: ['Minimalist desk setup for {topic} ({audience})', 'My tech setup for {topic} in {year}'],
      hookTemplates: ['Here is my full minimalist desk setup optimized for {topic}.'],
      thumbnailTemplates: [{ visual: 'Sleek dark desk setup with RGB ambient backlight', overlay: 'DESK TOUR' }],
      whyTemplates: ['Setup tours have evergreen popularity and high affiliate revenue potential.'],
      outline: (t, a) => ['Hook (0-15s): Wide cinematic pan of full desk.', 'Setup: Desk dimensions.', 'Main Beat 1: Core hardware.', 'Main Beat 2: Cable management.', 'CTA: Links below.']
    }
  ],
  Fitness: [
    {
      id: 'niche-fit-followalong',
      type: 'Follow-along workout',
      format: 'Follow-along · Medium',
      effort: 'Medium',
      baseScore: 92,
      titleTemplates: ['15-minute home workout for {topic} ({audience})', 'No equipment {topic} routine for {audience}'],
      hookTemplates: ['Grab your water bottle. We are doing a 15-minute follow-along routine starting now.'],
      thumbnailTemplates: [{ visual: 'Timer badge on workout athlete photo', overlay: '15 MINS' }],
      whyTemplates: ['Follow-along workouts build habit loops where viewers return daily to rewatch.'],
      outline: (t, a) => ['Hook (0-15s): Countdown start.', 'Setup: Warmup.', 'Main Beat 1: Circuit 1.', 'Main Beat 2: Circuit 2.', 'CTA: Save video.']
    }
  ],
  Finance: [
    {
      id: 'niche-fin-numbers',
      type: 'Real numbers breakdown',
      format: 'Breakdown · Easy',
      effort: 'Easy',
      baseScore: 90,
      titleTemplates: ['The exact cost of {topic} for {audience}', 'Real numbers: what {topic} actually earns/costs'],
      hookTemplates: ['I am opening my real spreadsheet to show you the exact numbers behind {topic}.'],
      thumbnailTemplates: [{ visual: 'Open spreadsheet with highlighted total column', overlay: 'REAL DATA' }],
      whyTemplates: ['Hard dollar figures and real data generate unmatched click-through rates.'],
      outline: (t, a) => ['Hook (0-15s): Reveal total figure.', 'Setup: Categories.', 'Main Beat 1: Income/Cost 1.', 'Main Beat 2: Income/Cost 2.', 'CTA: Subscribe.']
    }
  ],
  Food: [
    {
      id: 'niche-food-15min',
      type: '15-minute meal',
      format: 'Cooking · Easy',
      effort: 'Easy',
      baseScore: 89,
      titleTemplates: ['15-minute cheap {topic} recipe for {audience}', 'Easy 3-ingredient {topic} for busy {audience}'],
      hookTemplates: ['If you only have 15 minutes after work, this is the easiest meal you can make.'],
      thumbnailTemplates: [{ visual: 'Delicious finished dish with steaming heat graphic', overlay: '15 MINS' }],
      whyTemplates: ['Quick recipe solutions target high daily search traffic from hungry viewers.'],
      outline: (t, a) => ['Hook (0-15s): Finished meal bite.', 'Setup: Ingredients.', 'Main Beat 1: Prep phase.', 'Main Beat 2: Cooking.', 'CTA: Recipe card link.']
    }
  ],
  Gaming: [
    {
      id: 'niche-game-tierlist',
      type: 'Tier list',
      format: 'Tier list · Easy',
      effort: 'Easy',
      baseScore: 91,
      titleTemplates: ['Ranking all {topic} items for {audience}', 'The definitive {topic} tier list ({year})'],
      hookTemplates: ['We are ranking every single option for {topic} from S-Tier to F-Tier.'],
      thumbnailTemplates: [{ visual: 'Tier list grid graphic with S, A, B, C categories', overlay: 'TIER LIST' }],
      whyTemplates: ['Tier lists drive long watch time and debate in comment sections.'],
      outline: (t, a) => ['Hook (0-15s): S-Tier teaser.', 'Setup: Criteria.', 'Main Beat 1: C & B tiers.', 'Main Beat 2: A & S tiers.', 'CTA: Comment your tier list.']
    }
  ],
  Education: [
    {
      id: 'niche-edu-fastmemory',
      type: 'Fast study hack',
      format: 'Tutorial · Easy',
      effort: 'Easy',
      baseScore: 88,
      titleTemplates: ['How {audience} can memorize {topic} 2x faster', 'The Feynman method for {topic}'],
      hookTemplates: ['Stop re-reading notes. Use this active recall hack to learn {topic} in half the time.'],
      thumbnailTemplates: [{ visual: 'Glowing brain graphic with lightning bolts', overlay: '2X FASTER' }],
      whyTemplates: ['Study efficiency hacks rank extremely high among student audiences.'],
      outline: (t, a) => ['Hook (0-15s): Active recall promise.', 'Setup: Why old ways fail.', 'Main Beat 1: Step 1.', 'Main Beat 2: Step 2.', 'CTA: Save post.']
    }
  ]
};

/* ==========================================================================
   4. The Core Idea Generation Engine
   ========================================================================== */
function generateIdeasLocal(topicInput, audienceInput, niche = 'Fitness', tone = 'Casual', length = 'Shorts') {
  const cleanTopic = formatTopicInput(topicInput);
  const cleanAudience = sanitizeString(audienceInput) || 'viewers';
  const currentYear = new Date().getFullYear();

  // Combine core library with niche specials
  let pool = [...IDEA_TYPES_LIBRARY];
  if (NICHE_SPECIALS[niche]) {
    pool = [...pool, ...NICHE_SPECIALS[niche]];
  }

  // Shuffle pool to pick 10 unique types
  const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
  const selectedTypes = shuffledPool.slice(0, 10);

  const generatedList = [];
  usedTitlesInSession.clear();

  selectedTypes.forEach((item, idx) => {
    const numberBadge = (idx + 1).toString().padStart(2, '0');
    
    // Pick random templates
    const rawTitleTpl = getRandomItem(item.titleTemplates);
    const rawHookTpl = getRandomItem(item.hookTemplates);
    const rawThumbObj = getRandomItem(item.thumbnailTemplates);
    const rawWhyTpl = getRandomItem(item.whyTemplates);

    // Replace placeholders
    const nVal = getRandomItem([3, 5, 7, 10]);
    const daysVal = getRandomItem([7, 14, 30]);

    let title = rawTitleTpl
      .replace(/{topic}/g, cleanTopic)
      .replace(/{audience}/g, cleanAudience)
      .replace(/{year}/g, currentYear)
      .replace(/{n}/g, nVal)
      .replace(/{days}/g, daysVal);

    let hook = rawHookTpl
      .replace(/{topic}/g, cleanTopic)
      .replace(/{audience}/g, cleanAudience);

    let thumbVisual = rawThumbObj.visual
      .replace(/{topic}/g, cleanTopic)
      .replace(/{audience}/g, cleanAudience);
    
    let thumbOverlay = rawThumbObj.overlay;
    let why = rawWhyTpl;

    // Apply Tone Adjustments
    if (tone === 'Funny') {
      title = title.replace(/mistakes/i, 'embarrassing mistakes');
      hook = 'Prepare to laugh, because ' + hook;
    } else if (tone === 'Inspiring') {
      title = title.replace(/mistakes/i, 'growth traps');
      hook = 'You are capable of mastering this. ' + hook;
    } else if (tone === 'Serious') {
      title = title.replace(/hacks/i, 'strategies');
    }

    // Apply Video Length Adjustments
    let updatedFormat = item.format;
    if (length === 'Shorts') {
      updatedFormat = 'Vertical short · 30–60s';
      if (title.length > 55) {
        title = title.substring(0, 52) + '...';
      }
    } else if (length === '20+ min') {
      updatedFormat = 'Full masterclass · 20+ min';
    } else if (length === '10–15 min') {
      updatedFormat = 'In-depth tutorial · 10–15 min';
    }

    // Enforce title length cap & uniqueness
    if (title.length > 65) {
      title = title.substring(0, 62) + '...';
    }
    
    // Ensure uniqueness
    let attempt = 1;
    let uniqueTitle = title;
    while (usedTitlesInSession.has(uniqueTitle)) {
      uniqueTitle = `${title} (${attempt})`;
      attempt++;
    }
    usedTitlesInSession.add(uniqueTitle);

    // Calculate score
    let score = item.baseScore + getRandomInt(-4, 6);
    if (/\d/.test(uniqueTitle)) score += 3;
    if (/vs|stop/i.test(uniqueTitle)) score += 3;
    score = Math.min(97, Math.max(58, score));

    // Create outline
    const outlineSteps = item.outline ? item.outline(cleanTopic, cleanAudience) : [
      'Hook (0-15s): Grab attention with core promise.',
      'Setup (15-45s): Explain why this matters for ' + cleanAudience + '.',
      'Main Beat 1: Core insight #1.',
      'Main Beat 2: Core insight #2.',
      'Call to Action: Subscribe ask.'
    ];

    generatedList.push({
      id: 'idea_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
      number: numberBadge,
      type: item.type,
      title: uniqueTitle,
      hook: hook,
      thumbnail: { visual: thumbVisual, overlay: thumbOverlay },
      why: why,
      format: updatedFormat,
      effort: item.effort,
      score: score,
      outline: outlineSteps,
      topic: cleanTopic,
      audience: cleanAudience,
      saved: false
    });
  });

  return generatedList;
}

/**
 * Asynchronous Idea Generation:
 * Tries the LangChain + Google Gemini backend (http://localhost:3001/api/generate-ideas).
 * On any failure, network error, timeout, or malformed data, silently falls back
 * to the built-in local engine (generateIdeasLocal) with ZERO visible errors.
 */
async function generateIdeas(topic, audience, niche = 'Fitness', tone = 'Casual', length = 'Shorts') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('http://localhost:3001/api/generate-ideas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: String(topic || '').trim(),
        audience: String(audience || '').trim(),
        niche: niche || 'Fitness',
        tone: tone || 'Casual',
        length: length || 'Shorts'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.source === 'gemini' && Array.isArray(data.ideas) && data.ideas.length === 10) {
        return data.ideas.map((item, idx) => {
          const numberBadge = (idx + 1).toString().padStart(2, '0');
          let formatStr = item.format || 'Standard · 10–15 min';
          if (length === 'Shorts') formatStr = 'Vertical short · 30–60s';
          else if (length === '5–8 min') formatStr = 'Quick guide · 5–8 min';
          else if (length === '10–15 min') formatStr = 'In-depth tutorial · 10–15 min';
          else if (length === '20+ min') formatStr = 'Full masterclass · 20+ min';

          const outlineSteps = Array.isArray(item.outline) && item.outline.length >= 3 ? item.outline : [
            'Hook (0-15s): Address the core problem immediately.',
            'Setup (15-45s): Why this matters for ' + (audience || 'viewers') + '.',
            'Main Beat 1: Core insight and demonstration.',
            'Main Beat 2: Key pitfall to avoid.',
            'Call to Action: Summary and subscribe ask.'
          ];

          return {
            id: 'idea_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
            number: numberBadge,
            type: item.type || 'Strategy',
            title: item.title,
            hook: item.hook,
            thumbnail: {
              visual: typeof item.thumbnail === 'object' && item.thumbnail.visual ? item.thumbnail.visual : (item.thumbnail || 'Creator demonstrating ' + topic),
              overlay: typeof item.thumbnail === 'object' && item.thumbnail.overlay ? item.thumbnail.overlay : 'WATCH THIS'
            },
            why: item.why || 'High search demand and viewer retention.',
            format: formatStr,
            effort: ['Easy', 'Medium', 'Hard'].includes(item.effort) ? item.effort : 'Medium',
            score: Math.min(98, Math.max(55, Math.round(Number(item.score) || 85))),
            outline: outlineSteps,
            topic: String(topic || '').trim(),
            audience: String(audience || '').trim(),
            saved: false
          };
        });
      }
    }
  } catch (err) {
    // Silently fall through to local generator — zero console or UI error
  } finally {
    clearTimeout(timeoutId);
  }

  // Graceful, silent local fallback
  return generateIdeasLocal(topic, audience, niche, tone, length);
}

/* ==========================================================================
   5. UI Rendering Functions
   ========================================================================== */

// Render Idea Cards Grid
function renderIdeasGrid(ideasArray, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!ideasArray || ideasArray.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = ideasArray.map((idea, index) => {
    const isSaved = state.saved.some(s => s.title === idea.title);
    const animDelay = (index * 0.06).toFixed(2);
    
    // Effort pill color
    let effortClass = 'effort-easy';
    if (idea.effort === 'Medium') effortClass = 'effort-medium';
    if (idea.effort === 'Hard') effortClass = 'effort-hard';

    // Score ring color
    let scoreColor = '#7c3aed'; // Violet
    if (idea.score >= 86) scoreColor = '#10b981'; // Emerald
    if (idea.score <= 74) scoreColor = '#f59e0b'; // Amber

    const strokeOffset = 100 - idea.score;

    return `
      <article class="glass-card idea-card" id="card-${idea.id}" style="animation-delay: ${animDelay}s">
        <div>
          <!-- Top Tag & Score Gauge -->
          <div class="card-top-bar">
            <div class="card-tags">
              <span class="card-number">${idea.number || '01'}</span>
              <span class="card-type-tag">${escapeHtml(idea.type)}</span>
            </div>

            <!-- Score Gauge -->
            <div class="score-gauge-box" title="Potential Score: ${idea.score}/100">
              <svg class="score-svg" viewBox="0 0 36 36">
                <path class="score-bg" stroke-width="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path class="score-fill" stroke="${scoreColor}" stroke-width="3.5" stroke-dasharray="100, 100" stroke-linecap="round" fill="none" style="stroke-dashoffset: ${strokeOffset};" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span class="score-number">${idea.score}</span>
            </div>
          </div>

          <!-- Title -->
          <h3 class="card-title" style="margin-top: 0.75rem;">${escapeHtml(idea.title)}</h3>

          <!-- Hook -->
          <div class="card-section-box" style="margin-top: 0.75rem;">
            <div class="box-label">Hook (First 15s)</div>
            <div class="box-text">"${escapeHtml(idea.hook)}"</div>
          </div>

          <!-- Thumbnail Concept -->
          <div class="card-section-box thumb-box" style="margin-top: 0.6rem;">
            <div class="box-label">
              Thumbnail Concept 
              ${idea.thumbnail.overlay ? `<span class="overlay-pill">${escapeHtml(idea.thumbnail.overlay)}</span>` : ''}
            </div>
            <div class="box-text" style="font-style: normal; font-size: 0.825rem;">
              📷 ${escapeHtml(idea.thumbnail.visual)}
            </div>
          </div>

          <!-- Why it works -->
          <div class="why-box" style="margin-top: 0.6rem;">
            <span class="why-icon"></span> <strong>Why it works:</strong> ${escapeHtml(idea.why)}
          </div>
        </div>

        <div>
          <!-- Meta Row -->
          <div class="card-meta-row">
            <span>🎥 ${escapeHtml(idea.format)}</span>
            <span class="effort-badge ${effortClass}">${escapeHtml(idea.effort)}</span>
          </div>

          <!-- Card Actions -->
          <div class="card-actions-row">
            <button class="card-btn ${isSaved ? 'saved-active' : ''}" onclick="toggleSaveIdea('${idea.id}')" title="Save Idea">
              <svg class="heart-icon" viewBox="0 0 24 24" width="16" height="16" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span>${isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button class="card-btn" onclick="copyCardContent('${idea.id}')" title="Copy Title & Hook">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy</span>
            </button>

            ${containerId === 'ideas-grid' ? `
              <button class="card-btn" onclick="swapCard('${idea.id}')" title="Swap for a new idea">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                <span>Swap</span>
              </button>
            ` : ''}

            <button class="card-btn" onclick="toggleOutlineAccordion('${idea.id}')" id="btn-outline-${idea.id}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              <span>Outline</span>
            </button>
          </div>

          <!-- Accordion Outline -->
          <div class="outline-accordion" id="accordion-${idea.id}">
            <div class="accordion-inner">
              <div class="outline-content">
                <div class="outline-title">5-Point Video Outline</div>
                <ul class="outline-steps">
                  ${(idea.outline || []).map((step, sIdx) => `
                    <li class="outline-step-item">
                      <span class="step-num">${sIdx + 1}.</span>
                      <span>${escapeHtml(step)}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==========================================================================
   6. Card Actions (Save, Copy, Swap, Outline)
   ========================================================================== */
function toggleSaveIdea(ideaId) {
  let targetIdea = currentIdeas.find(i => i.id === ideaId);
  if (!targetIdea) {
    targetIdea = state.saved.find(i => i.id === ideaId);
  }
  if (!targetIdea) return;

  const existingIdx = state.saved.findIndex(s => s.title === targetIdea.title);

  if (existingIdx >= 0) {
    state.saved.splice(existingIdx, 1);
    state.stats.savedIdeas = Math.max(0, state.stats.savedIdeas - 1);
    showToast('Removed from saved list', 'info');
  } else {
    state.saved.unshift({ ...targetIdea, savedAt: Date.now() });
    state.stats.savedIdeas += 1;
    showToast('Saved to your list! +10 XP 💎', 'success');
    if (typeof addXP === 'function') addXP(XP_CONFIG.perSave);

    // Trigger Confetti on 1st save and 10th save
    if (state.stats.savedIdeas === 1 || state.stats.savedIdeas === 10) {
      triggerConfetti();
    }
  }

  saveState();
  updateSavedBadge();
  
  // Re-render relevant grids
  const currentView = document.querySelector('.view-section:not(.hidden)').id;
  if (currentView === 'view-generate') {
    renderIdeasGrid(currentIdeas, 'ideas-grid');
  } else if (currentView === 'view-saved') {
    renderSavedView();
  }
  renderDashboard();
}

function copyCardContent(ideaId) {
  let idea = currentIdeas.find(i => i.id === ideaId) || state.saved.find(i => i.id === ideaId);
  if (!idea) return;

  const textToCopy = `TITLE: ${idea.title}\n\nHOOK: ${idea.hook}\n\nTHUMBNAIL: ${idea.thumbnail.visual} (Overlay: "${idea.thumbnail.overlay}")\n\nWHY IT WORKS: ${idea.why}\n\nFORMAT: ${idea.format}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast('Copied to clipboard! 📋', 'success');
    }).catch(() => fallbackCopyText(textToCopy));
  } else {
    fallbackCopyText(textToCopy);
  }
}

function fallbackCopyText(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
    showToast('Copied to clipboard! 📋', 'success');
  } catch (err) {
    showToast('Failed to copy', 'danger');
  }
  document.body.removeChild(textarea);
}

function swapCard(ideaId) {
  const cardIdx = currentIdeas.findIndex(i => i.id === ideaId);
  if (cardIdx < 0) return;

  const oldCardEl = document.getElementById(`card-${ideaId}`);
  if (oldCardEl) {
    oldCardEl.classList.add('flipping');
  }

  setTimeout(async () => {
    const topic = document.getElementById('topic-input').value.trim() || currentIdeas[cardIdx].topic;
    const audience = document.getElementById('audience-input').value.trim() || currentIdeas[cardIdx].audience;
    const niche = document.getElementById('niche-select').value;
    const tone = document.querySelector('#tone-group .active')?.dataset.value || 'Casual';
    const length = document.querySelector('#length-group .active')?.dataset.value || 'Shorts';

    // Generate single replacement idea of a fresh type
    const freshIdeas = await generateIdeas(topic, audience, niche, tone, length);
    // Find one whose title isn't in currentIdeas
    const existingTitles = new Set(currentIdeas.map(i => i.title));
    const replacement = freshIdeas.find(f => !existingTitles.has(f.title)) || freshIdeas[0];

    replacement.number = currentIdeas[cardIdx].number;
    currentIdeas[cardIdx] = replacement;

    renderIdeasGrid(currentIdeas, 'ideas-grid');
    showToast('Swapped with a fresh idea 🔄', 'info');
  }, 250);
}

function toggleOutlineAccordion(ideaId) {
  const accordion = document.getElementById(`accordion-${ideaId}`);
  const btn = document.getElementById(`btn-outline-${ideaId}`);
  if (!accordion || !btn) return;

  const isExpanded = accordion.classList.contains('expanded');
  if (isExpanded) {
    accordion.classList.remove('expanded');
    btn.classList.remove('outline-active');
    btn.querySelector('span').textContent = 'Outline';
  } else {
    accordion.classList.add('expanded');
    btn.classList.add('outline-active');
    btn.querySelector('span').textContent = 'Hide outline';
  }
}

/* ==========================================================================
   7. Form Generation Handler & Example Chips
   ========================================================================== */
function handleFormSubmit(e) {
  if (e) e.preventDefault();

  const topicInput = document.getElementById('topic-input');
  const audienceInput = document.getElementById('audience-input');
  const errorMsg = document.getElementById('form-error');

  const topicVal = sanitizeString(topicInput.value);
  const audienceVal = sanitizeString(audienceInput.value);

  // Validation
  let hasError = false;
  if (!topicVal || !audienceVal) {
    hasError = true;
    if (!topicVal) topicInput.classList.add('input-error');
    if (!audienceVal) audienceInput.classList.add('input-error');
    errorMsg.classList.remove('hidden');
    return;
  }

  // Clear errors
  topicInput.classList.remove('input-error');
  audienceInput.classList.remove('input-error');
  errorMsg.classList.add('hidden');

  const niche = document.getElementById('niche-select').value;
  const tone = document.querySelector('#tone-group .active')?.dataset.value || 'Casual';
  const length = document.querySelector('#length-group .active')?.dataset.value || 'Shorts';

  runGeneration(topicVal, audienceVal, niche, tone, length);
}

async function runGeneration(topic, audience, niche, tone, length) {
  const skeletonGrid = document.getElementById('skeleton-section');
  const resultsSection = document.getElementById('results-section');

  // Show Skeleton Loader
  resultsSection.classList.add('hidden');
  skeletonGrid.classList.remove('hidden');
  skeletonGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Generate 10 ideas (LangChain backend with silent local fallback)
  currentIdeas = await generateIdeas(topic, audience, niche, tone, length);

  // Update Stats
  state.stats.totalIdeas += 10;
  state.stats.generations += 1;

  // Track Topic Count
  const cleanTopicKey = topic.toLowerCase();
  state.stats.topics[cleanTopicKey] = (state.stats.topics[cleanTopicKey] || 0) + 1;

  // Daily Counts (YYYY-MM-DD)
  const todayKey = new Date().toISOString().split('T')[0];
  state.stats.dailyCounts[todayKey] = (state.stats.dailyCounts[todayKey] || 0) + 10;

  // Calculate Streak
  updateStreak(todayKey);

  // History Record (cap at 20)
  const historyItem = {
    id: 'hist_' + Date.now(),
    topic,
    audience,
    niche,
    tone,
    length,
    engine: 'IdeaForge Engine',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    timeAgo: 'Just now',
    timestamp: Date.now()
  };

  state.history.unshift(historyItem);
  if (state.history.length > 20) state.history.pop();

  saveState();
  updateFooterCount();

  // Gamification: Award XP for generation
  if (typeof addXP === 'function') addXP(XP_CONFIG.perGeneration);

  // Render Results Header & Grid
  document.getElementById('res-topic').textContent = topic;
  document.getElementById('res-audience').textContent = audience;

  renderIdeasGrid(currentIdeas, 'ideas-grid');

  skeletonGrid.classList.add('hidden');
  resultsSection.classList.remove('hidden');

  showToast('Generated 10 fresh ideas! +25 XP ⚡', 'success');
}

function updateStreak(todayKey) {
  if (!state.stats.lastGenDate) {
    state.stats.streak = 1;
    state.stats.lastGenDate = todayKey;
    return;
  }

  if (state.stats.lastGenDate === todayKey) return; // Same day

  const lastDate = new Date(state.stats.lastGenDate);
  const todayDate = new Date(todayKey);
  const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    state.stats.streak += 1;
  } else if (diffDays > 1) {
    state.stats.streak = 1;
  }
  state.stats.lastGenDate = todayKey;
}

/* ==========================================================================
   8. Dashboard Charts & Stats
   ========================================================================== */
function renderDashboard() {
  // Stat Counters with count-up animation
  animateCountUp('stat-total-ideas', state.stats.totalIdeas);
  animateCountUp('stat-saved-ideas', state.saved.length);
  animateCountUp('stat-generations-run', state.stats.generations);
  animateCountUp('stat-day-streak', state.stats.streak);

  // Render Bar Chart (Last 7 Days)
  renderBarChart();

  // Render Donut Chart (Saved Ideas by Type)
  renderDonutChart();

  // Render Top Topics List
  renderTopTopics();

  // Render Recent Activity Timeline
  renderRecentActivity();
}

function animateCountUp(elementId, targetValue) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const startVal = parseInt(el.textContent) || 0;
  if (startVal === targetValue) {
    el.textContent = targetValue;
    return;
  }

  const duration = 800;
  const frameRate = 30;
  const totalFrames = Math.round(duration / frameRate);
  let frame = 0;

  const timer = setInterval(() => {
    frame++;
    const progress = frame / totalFrames;
    const current = Math.round(startVal + (targetValue - startVal) * progress);
    el.textContent = current;

    if (frame >= totalFrames) {
      el.textContent = targetValue;
      clearInterval(timer);
    }
  }, frameRate);
}

// Pure SVG Bar Chart
function renderBarChart() {
  const container = document.getElementById('bar-chart-container');
  if (!container) return;

  // Generate last 7 dates
  const days = [];
  const counts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    days.push(label);
    counts.push(state.stats.dailyCounts[dateKey] || 0);
  }

  const maxCount = Math.max(...counts, 10);
  const chartHeight = 160;
  const svgWidth = 320;

  const svgHtml = `
    <svg viewBox="0 0 ${svgWidth} ${chartHeight + 30}" style="width: 100%; height: 100%; overflow: visible;">
      <!-- Grid lines -->
      <line x1="0" y1="${chartHeight}" x2="${svgWidth}" y2="${chartHeight}" stroke="var(--border-color)" stroke-width="1" />
      <line x1="0" y1="${chartHeight / 2}" x2="${svgWidth}" y2="${chartHeight / 2}" stroke="var(--border-color)" stroke-dasharray="4" stroke-width="1" />

      ${counts.map((val, idx) => {
        const barWidth = 24;
        const spacing = svgWidth / 7;
        const x = idx * spacing + (spacing - barWidth) / 2;
        const barH = (val / maxCount) * (chartHeight - 20);
        const y = chartHeight - barH;

        return `
          <g class="bar-group">
            <rect 
              x="${x}" 
              y="${y}" 
              width="${barWidth}" 
              height="${barH}" 
              rx="4" 
              fill="url(#barGrad)" 
              style="transition: height 0.8s ease-out, y 0.8s ease-out;"
            >
              <title>${days[idx]}: ${val} ideas generated</title>
            </rect>
            <text x="${x + barWidth / 2}" y="${chartHeight + 20}" fill="var(--text-muted)" font-size="11" text-anchor="middle">
              ${days[idx]}
            </text>
          </g>
        `;
      }).join('')}

      <defs>
        <linearGradient id="barGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#7c3aed" />
          <stop offset="100%" stop-color="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  `;

  container.innerHTML = svgHtml;
}

// Pure SVG Donut Chart
function renderDonutChart() {
  const container = document.getElementById('donut-chart-container');
  if (!container) return;

  if (state.saved.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 2rem 0;">
        No saved ideas yet to build chart.
      </div>
    `;
    return;
  }

  // Count by Type
  const typeCounts = {};
  state.saved.forEach(s => {
    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
  });

  const totalSaved = state.saved.length;
  const colors = ['#7c3aed', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#ec4899', '#8b5cf6'];
  const entries = Object.entries(typeCounts);

  let cumulativePercent = 0;
  const strokeSegments = entries.map(([type, count], idx) => {
    const percent = count / totalSaved;
    const strokeDasharray = `${percent * 100} ${100 - percent * 100}`;
    const strokeDashoffset = -cumulativePercent * 100;
    cumulativePercent += percent;
    const color = colors[idx % colors.length];

    return { type, count, color, strokeDasharray, strokeDashoffset };
  });

  const svgHtml = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 1.5rem; flex-wrap: wrap; width: 100%;">
      <div style="position: relative; width: 130px; height: 130px;">
        <svg viewBox="0 0 42 42" style="width: 100%; height: 100%; transform: rotate(-90deg);">
          ${strokeSegments.map(seg => `
            <circle 
              cx="21" cy="21" r="15.9155" 
              fill="transparent" 
              stroke="${seg.color}" 
              stroke-width="5" 
              stroke-dasharray="${seg.strokeDasharray}" 
              stroke-dashoffset="${seg.strokeDashoffset}"
              style="transition: stroke-dasharray 0.8s ease-out;"
            >
              <title>${seg.type}: ${seg.count} (${Math.round((seg.count/totalSaved)*100)}%)</title>
            </circle>
          `).join('')}
        </svg>
        <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--text-muted);">
          <span style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; color: var(--text-primary); line-height: 1;">${totalSaved}</span>
          <span>Saved</span>
        </div>
      </div>

      <!-- Legend -->
      <div style="display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.8rem;">
        ${strokeSegments.map(seg => `
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${seg.color};"></span>
            <span style="font-weight: 500;">${escapeHtml(seg.type)}:</span>
            <span style="color: var(--text-muted);">${seg.count}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = svgHtml;
}

// Top Topics List
function renderTopTopics() {
  const container = document.getElementById('top-topics-container');
  if (!container) return;

  const topicEntries = Object.entries(state.stats.topics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (topicEntries.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No searches recorded yet.</div>`;
    return;
  }

  const maxVal = Math.max(...topicEntries.map(t => t[1]), 1);

  container.innerHTML = topicEntries.map(([topic, count]) => {
    const percent = Math.round((count / maxVal) * 100);
    return `
      <div class="topic-bar-item">
        <div class="topic-bar-info">
          <span class="topic-bar-name">${escapeHtml(topic)}</span>
          <span class="topic-bar-count">${count} ${count === 1 ? 'gen' : 'gens'}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${percent}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Recent Activity Timeline
function renderRecentActivity() {
  const container = document.getElementById('recent-activity-container');
  if (!container) return;

  const recent = state.history.slice(0, 4);
  if (recent.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No recent generations yet.</div>`;
    return;
  }

  container.innerHTML = recent.map(item => `
    <div class="timeline-item">
      <div>
        <div class="timeline-topic">${escapeHtml(item.topic)}</div>
        <div class="timeline-audience">for ${escapeHtml(item.audience)}</div>
      </div>
      <span class="timeline-time">${escapeHtml(item.date)}</span>
    </div>
  `).join('');
}

/* ==========================================================================
   9. Saved & History Views Rendering
   ========================================================================== */
function renderSavedView() {
  const searchVal = (document.getElementById('saved-search-input')?.value || '').toLowerCase().trim();
  const sortVal = document.getElementById('saved-sort-select')?.value || 'newest';
  const filterChipActive = document.querySelector('#saved-filter-chips .chip-btn.active')?.dataset.type || 'All';

  // Render Filter Chips
  renderSavedFilterChips();

  let filtered = [...state.saved];

  // Search Filter
  if (searchVal) {
    filtered = filtered.filter(i => 
      i.title.toLowerCase().includes(searchVal) || 
      i.topic.toLowerCase().includes(searchVal) ||
      i.type.toLowerCase().includes(searchVal)
    );
  }

  // Type Filter Chip
  if (filterChipActive !== 'All') {
    filtered = filtered.filter(i => i.type === filterChipActive);
  }

  // Sorting
  if (sortVal === 'score') {
    filtered.sort((a, b) => b.score - a.score);
  } else {
    filtered.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }

  const emptyState = document.getElementById('saved-empty-state');
  const savedGrid = document.getElementById('saved-grid');

  if (state.saved.length === 0 || filtered.length === 0) {
    savedGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    renderIdeasGrid(filtered, 'saved-grid');
  }
}

function renderSavedFilterChips() {
  const container = document.getElementById('saved-filter-chips');
  if (!container) return;

  const types = ['All', ...new Set(state.saved.map(s => s.type))];
  const activeType = container.querySelector('.chip-btn.active')?.dataset.type || 'All';

  container.innerHTML = types.map(t => `
    <button class="chip-btn ${t === activeType ? 'active' : ''}" data-type="${escapeHtml(t)}" onclick="selectSavedFilterChip('${escapeHtml(t)}')">
      ${escapeHtml(t)}
    </button>
  `).join('');
}

function selectSavedFilterChip(type) {
  const chips = document.querySelectorAll('#saved-filter-chips .chip-btn');
  chips.forEach(c => {
    if (c.dataset.type === type) c.classList.add('active');
    else c.classList.remove('active');
  });
  renderSavedView();
}

function renderHistoryView() {
  const container = document.getElementById('history-list');
  const emptyState = document.getElementById('history-empty-state');
  if (!container) return;

  if (state.history.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  container.innerHTML = state.history.map(item => `
    <div class="glass-card history-item">
      <div class="history-info">
        <div class="history-title-line">${escapeHtml(item.topic)} → <span style="color: var(--accent-primary);">${escapeHtml(item.audience)}</span></div>
        <div class="history-meta-line">
          Niche: ${escapeHtml(item.niche)} · Tone: ${escapeHtml(item.tone)} · Length: ${escapeHtml(item.length)} · ${escapeHtml(item.date)}
        </div>
      </div>
      <div class="history-actions">
        <button class="action-btn secondary-btn compact-btn" onclick="reopenHistoryItem('${item.id}')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          <span>Re-open</span>
        </button>
        <button class="action-btn danger-btn compact-btn" onclick="deleteHistoryItem('${item.id}')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          <span>Delete</span>
        </button>
      </div>
    </div>
  `).join('');
}

function reopenHistoryItem(histId) {
  const item = state.history.find(h => h.id === histId);
  if (!item) return;

  document.getElementById('topic-input').value = item.topic;
  document.getElementById('audience-input').value = item.audience;
  document.getElementById('niche-select').value = item.niche;

  // Set tone button
  const toneBtns = document.querySelectorAll('#tone-group .segment-btn');
  toneBtns.forEach(b => {
    b.classList.toggle('active', b.dataset.value === item.tone);
  });

  // Set length button
  const lengthBtns = document.querySelectorAll('#length-group .segment-btn');
  lengthBtns.forEach(b => {
    b.classList.toggle('active', b.dataset.value === item.length);
  });

  switchView('generate');
  runGeneration(item.topic, item.audience, item.niche, item.tone, item.length);
}

function deleteHistoryItem(histId) {
  state.history = state.history.filter(h => h.id !== histId);
  saveState();
  renderHistoryView();
  showToast('History item deleted', 'info');
}

/* ==========================================================================
   10. Exports (.txt, .csv, Copy All)
   ========================================================================== */
function exportTxt(ideasArr) {
  if (!ideasArr || ideasArr.length === 0) return;

  let textContent = `IDEAFORGE - YOUTUBE CONTENT IDEAS EXPORT\nGenerated on: ${new Date().toLocaleString()}\n\n`;

  ideasArr.forEach((idea, idx) => {
    textContent += `========================================\n`;
    textContent += `IDEA #${idx + 1}: ${idea.title.toUpperCase()}\n`;
    textContent += `Type: ${idea.type} | Format: ${idea.format} | Score: ${idea.score}/100\n`;
    textContent += `HOOK: "${idea.hook}"\n`;
    textContent += `THUMBNAIL: ${idea.thumbnail.visual} (Overlay: "${idea.thumbnail.overlay}")\n`;
    textContent += `WHY IT WORKS: ${idea.why}\n\n`;
  });

  downloadBlob(textContent, 'text/plain', 'ideaforge-ideas.txt');
  showToast('Exported .txt file +15 XP 📄', 'success');
  if (typeof addXP === 'function') addXP(XP_CONFIG.perExport);
}

function exportCsv(ideasArr) {
  if (!ideasArr || ideasArr.length === 0) return;

  let csvContent = 'Number,Type,Title,Hook,Thumbnail,Format,Effort,Score\n';

  ideasArr.forEach((idea, idx) => {
    const row = [
      idx + 1,
      `"${escapeCsv(idea.type)}"`,
      `"${escapeCsv(idea.title)}"`,
      `"${escapeCsv(idea.hook)}"`,
      `"${escapeCsv(idea.thumbnail.visual + ' (Overlay: ' + idea.thumbnail.overlay + ')')}"`,
      `"${escapeCsv(idea.format)}"`,
      `"${escapeCsv(idea.effort)}"`,
      idea.score
    ];
    csvContent += row.join(',') + '\n';
  });

  downloadBlob(csvContent, 'text/csv', 'ideaforge-ideas.csv');
  showToast('Exported .csv file +15 XP 📊', 'success');
  if (typeof addXP === 'function') addXP(XP_CONFIG.perExport);
}

function escapeCsv(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '""');
}

function downloadBlob(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyAllIdeas() {
  if (!currentIdeas || currentIdeas.length === 0) return;
  let fullText = currentIdeas.map((idea, i) => `${i + 1}. ${idea.title}\n   Hook: ${idea.hook}\n`).join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullText).then(() => showToast('Copied all 10 ideas! 📋', 'success'));
  } else {
    fallbackCopyText(fullText);
  }
}

/* ==========================================================================
   11. Particle Confetti Canvas Engine
   ========================================================================== */
function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#7c3aed', '#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#ec4899'];

  for (let i = 0; i < 70; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2 + 50,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 8 + 4,
      color: getRandomItem(colors),
      rotation: Math.random() * 360,
      rSpeed: (Math.random() - 0.5) * 10,
      opacity: 1
    });
  }

  let animationFrame;
  const startTime = Date.now();

  function render() {
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4; // gravity
      p.rotation += p.rSpeed;
      p.opacity = Math.max(0, 1 - elapsed / 1200);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    if (elapsed < 1200) {
      animationFrame = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  render();
}

/* ==========================================================================
   12. Toast & Modal Utilities
   ========================================================================== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-slide-out');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }, 2500);
}

function showModal({ title, message, confirmText, onConfirm }) {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const confirmBtn = document.getElementById('modal-confirm-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');

  if (!overlay) return;

  titleEl.textContent = title;
  bodyEl.textContent = message;
  confirmBtn.textContent = confirmText || 'Confirm';

  overlay.classList.remove('hidden');

  const cleanup = () => {
    overlay.classList.add('hidden');
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
    window.removeEventListener('keydown', handleEscKey);
  };

  const handleEscKey = (e) => {
    if (e.key === 'Escape') cleanup();
  };

  confirmBtn.onclick = () => {
    if (onConfirm) onConfirm();
    cleanup();
  };

  cancelBtn.onclick = cleanup;
  overlay.onclick = (e) => {
    if (e.target === overlay) cleanup();
  };
  window.addEventListener('keydown', handleEscKey);
}

/* ==========================================================================
   13. View Navigation & General Init
   ========================================================================== */
function switchView(viewName) {
  const views = document.querySelectorAll('.view-section');
  views.forEach(v => {
    if (v.id === `view-${viewName}`) {
      v.classList.remove('hidden');
    } else {
      v.classList.add('hidden');
    }
  });

  // Desktop Tabs active class
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === viewName);
  });

  // Mobile Tabs active class
  document.querySelectorAll('.mobile-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === viewName);
  });

  if (viewName === 'dashboard') {
    renderDashboard();
  } else if (viewName === 'saved') {
    renderSavedView();
  } else if (viewName === 'history') {
    renderHistoryView();
  }
}

function updateSavedBadge() {
  const badge = document.getElementById('saved-badge');
  if (badge) {
    badge.textContent = state.saved.length;
  }
}

function updateFooterCount() {
  const footerEl = document.getElementById('footer-count');
  if (footerEl) {
    footerEl.textContent = state.stats.totalIdeas;
  }
}

/* Typewriter Hero Animation */
function initTypewriter() {
  const target = document.getElementById('typewriter-text');
  if (!target) return;

  const topics = ['home workouts', 'budget travel', 'gaming setups', 'study tips', 'meal prep', 'python basics'];
  let topicIdx = 0;
  let charIdx = 0;
  let isDeleting = false;

  function typeStep() {
    const currentTopic = topics[topicIdx];
    if (isDeleting) {
      target.textContent = currentTopic.substring(0, charIdx - 1);
      charIdx--;
    } else {
      target.textContent = currentTopic.substring(0, charIdx + 1);
      charIdx++;
    }

    let delay = isDeleting ? 40 : 80;

    if (!isDeleting && charIdx === currentTopic.length) {
      delay = 1800; // Pause at end of word
      isDeleting = true;
    } else if (isDeleting && charIdx === 0) {
      isDeleting = false;
      topicIdx = (topicIdx + 1) % topics.length;
      delay = 400;
    }

    setTimeout(typeStep, delay);
  }

  typeStep();
}

/* Character Counters & Input Listeners */
function initFormListeners() {
  const form = document.getElementById('generator-form');
  const topicInput = document.getElementById('topic-input');
  const audienceInput = document.getElementById('audience-input');

  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  if (topicInput) {
    topicInput.addEventListener('input', (e) => {
      document.getElementById('topic-counter').textContent = `${e.target.value.length}/60`;
    });
  }

  if (audienceInput) {
    audienceInput.addEventListener('input', (e) => {
      document.getElementById('audience-counter').textContent = `${e.target.value.length}/60`;
    });
  }

  // Segmented Radio Buttons (Tone & Video Length)
  const setupSegmentedGroup = (groupId) => {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.segment-btn');
      if (!btn) return;
      group.querySelectorAll('.segment-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
    });
  };

  setupSegmentedGroup('tone-group');
  setupSegmentedGroup('length-group');

  // Example Chips Click Handlers
  document.querySelectorAll('.chip-btn').forEach(chip => {
    chip.addEventListener('click', () => {
      const topic = chip.dataset.topic;
      const audience = chip.dataset.audience;
      const niche = chip.dataset.niche;

      if (topic) {
        document.getElementById('topic-input').value = topic;
        document.getElementById('topic-counter').textContent = `${topic.length}/60`;
      }
      if (audience) {
        document.getElementById('audience-input').value = audience;
        document.getElementById('audience-counter').textContent = `${audience.length}/60`;
      }
      if (niche) {
        document.getElementById('niche-select').value = niche;
      }

      handleFormSubmit();
    });
  });

  // Action Bar Buttons
  document.getElementById('regen-btn')?.addEventListener('click', () => handleFormSubmit());
  document.getElementById('export-txt-btn')?.addEventListener('click', () => exportTxt(currentIdeas));
  document.getElementById('export-csv-btn')?.addEventListener('click', () => exportCsv(currentIdeas));
  document.getElementById('copy-all-btn')?.addEventListener('click', copyAllIdeas);

  // Saved Actions
  document.getElementById('export-saved-csv-btn')?.addEventListener('click', () => exportCsv(state.saved));
  document.getElementById('clear-saved-btn')?.addEventListener('click', () => {
    showModal({
      title: 'Clear all saved ideas?',
      message: 'Are you sure you want to remove all saved ideas? This action cannot be undone.',
      confirmText: 'Clear All',
      onConfirm: () => {
        state.saved = [];
        state.stats.savedIdeas = 0;
        saveState();
        updateSavedBadge();
        renderSavedView();
        showToast('Saved list cleared', 'info');
      }
    });
  });

  document.getElementById('saved-search-input')?.addEventListener('input', renderSavedView);
  document.getElementById('saved-sort-select')?.addEventListener('change', renderSavedView);

  // Dashboard Reset Data
  document.getElementById('reset-data-btn')?.addEventListener('click', () => {
    showModal({
      title: 'Reset all application data?',
      message: 'This will reset all your stats, saved ideas, and history. Are you sure?',
      confirmText: 'Reset Data',
      onConfirm: () => {
        state = { ...DEFAULT_STATE, theme: state.theme };
        saveState();
        updateSavedBadge();
        updateFooterCount();
        renderDashboard();
        showToast('Application data reset', 'info');
      }
    });
  });
}

/* Theme Toggle Setup */
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      saveState();
    });
  }
}

/* Global Keyboard Shortcuts */
function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ctrl+K or Cmd+K to focus topic field
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      switchView('generate');
      const topicInput = document.getElementById('topic-input');
      if (topicInput) topicInput.focus();
    }
  });
}

/* Event Listeners for Nav Tabs & Logo */
function initNavigation() {
  document.querySelectorAll('.nav-tab, .mobile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const viewName = tab.dataset.view;
      if (viewName) switchView(viewName);
    });
  });

  const brandHome = document.getElementById('brand-home');
  if (brandHome) {
    brandHome.addEventListener('click', () => switchView('generate'));
    brandHome.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') switchView('generate');
    });
  }

  // Go-to-Gen empty state buttons
  document.querySelectorAll('.goto-gen-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView('generate'));
  });
}

/* Application Initialization */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTypewriter();
  initFormListeners();
  initNavigation();
  initKeyboardShortcuts();
  updateSavedBadge();
  updateFooterCount();
  initCustomCursor();
  initParticleBackground();
  initScrollRevealFallback();
  initGamification();
  initMagneticButtons();
  initTiltCards();
});

/* ==========================================================================
   14. Custom Cursor with Dot Trail (Antigravity-inspired)
   ========================================================================== */
function initCustomCursor() {
  if (window.innerWidth <= 768) return;

  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  const canvas = document.getElementById('cursor-trail-canvas');
  if (!dot || !ring || !canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let mouseX = -100, mouseY = -100;
  let ringX = -100, ringY = -100;
  const trailPoints = [];
  const MAX_TRAIL = 25;

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top = mouseY + 'px';

    trailPoints.push({ x: mouseX, y: mouseY, alpha: 1, size: 3 });
    if (trailPoints.length > MAX_TRAIL) trailPoints.shift();
  });

  // Hover detection for interactive elements
  const hoverTargets = 'a, button, input, select, textarea, [role="button"], .chip-btn, .card-btn, .primary-btn, .nav-tab, .mobile-tab, .idea-card';

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverTargets)) {
      dot.classList.add('hovering');
      ring.classList.add('hovering');
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverTargets)) {
      dot.classList.remove('hovering');
      ring.classList.remove('hovering');
    }
  });

  function animateCursor() {
    // Smooth ring follow
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';

    // Draw trail
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < trailPoints.length; i++) {
      const p = trailPoints[i];
      const progress = i / trailPoints.length;
      p.alpha -= 0.025;

      if (p.alpha <= 0) continue;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * progress, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(124, 58, 237, ${p.alpha * 0.4})`;
      ctx.fill();

      // Secondary glow dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * progress * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(6, 182, 212, ${p.alpha * 0.3})`;
      ctx.fill();
    }

    // Remove dead points
    while (trailPoints.length > 0 && trailPoints[0].alpha <= 0) {
      trailPoints.shift();
    }

    requestAnimationFrame(animateCursor);
  }

  animateCursor();
}

/* ==========================================================================
   15. Particle Background System
   ========================================================================== */
function initParticleBackground() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let w, h;
  const particles = [];
  const PARTICLE_COUNT = 50;
  const CONNECTION_DIST = 120;
  let mouseX = -1000, mouseY = -1000;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Create particles
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.3 + 0.1
    });
  }

  function animate() {
    ctx.clearRect(0, 0, w, h);

    particles.forEach((p, i) => {
      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Mouse repulsion
      const dx = p.x - mouseX;
      const dy = p.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        p.x += dx * 0.01;
        p.y += dy * 0.01;
      }

      // Wrap
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      // Draw dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(124, 58, 237, ${p.alpha})`;
      ctx.fill();

      // Connect nearby particles
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const ddx = p.x - p2.x;
        const ddy = p.y - p2.y;
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < CONNECTION_DIST) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(124, 58, 237, ${0.06 * (1 - d / CONNECTION_DIST)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    });

    requestAnimationFrame(animate);
  }

  animate();
}

/* ==========================================================================
   16. Scroll Reveal Fallback (IntersectionObserver for non-supporting browsers)
   ========================================================================== */
function initScrollRevealFallback() {
  // If native CSS scroll-driven animations are supported, skip the JS fallback
  if (CSS.supports('(animation-timeline: view()) and (animation-range: entry)')) {
    return;
  }

  const elements = document.querySelectorAll('.scroll-reveal');
  elements.forEach(el => {
    el.classList.add('scroll-reveal-js');
    el.classList.remove('scroll-reveal');
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.scroll-reveal-js').forEach(el => observer.observe(el));
}

/* ==========================================================================
   17. Gamification System (XP, Levels, Achievements)
   ========================================================================== */
const XP_CONFIG = {
  perGeneration: 25,
  perSave: 10,
  perExport: 15,
  levelThresholds: [0, 100, 250, 500, 1000, 2000, 4000, 7500, 12000, 20000],
  levelNames: ['Newbie', 'Thinker', 'Ideator', 'Creator', 'Producer', 'Director', 'Visionary', 'Legend', 'Master', 'Titan']
};

const ACHIEVEMENTS = [
  { id: 'first_spark', name: 'First Spark ⚡', condition: (s) => s.stats.generations >= 1, icon: '⚡' },
  { id: 'idea_machine', name: 'Idea Machine 🧠', condition: (s) => s.stats.totalIdeas >= 50, icon: '🧠' },
  { id: 'collector', name: 'Collector 💎', condition: (s) => s.saved.length >= 10, icon: '💎' },
  { id: 'streak_3', name: '3-Day Streak 🔥', condition: (s) => s.stats.streak >= 3, icon: '🔥' },
  { id: 'century', name: 'Century Club 💯', condition: (s) => s.stats.totalIdeas >= 100, icon: '💯' },
  { id: 'power_user', name: 'Power User 🚀', condition: (s) => s.stats.generations >= 20, icon: '🚀' },
];

function initGamification() {
  if (!state.xp) state.xp = 0;
  if (!state.level) state.level = 1;
  if (!state.achievements) state.achievements = [];
  updateXPBar();
}

function addXP(amount) {
  if (!state.xp) state.xp = 0;
  state.xp += amount;

  // Level up check
  const newLevel = calculateLevel(state.xp);
  if (newLevel > (state.level || 1)) {
    state.level = newLevel;
    const levelName = XP_CONFIG.levelNames[Math.min(newLevel - 1, XP_CONFIG.levelNames.length - 1)];
    showAchievement(`Level ${newLevel}: ${levelName} 🎮`);
    triggerConfetti();
  }

  state.level = newLevel;
  saveState();
  updateXPBar();
  checkAchievements();
}

function calculateLevel(xp) {
  for (let i = XP_CONFIG.levelThresholds.length - 1; i >= 0; i--) {
    if (xp >= XP_CONFIG.levelThresholds[i]) return i + 1;
  }
  return 1;
}

function updateXPBar() {
  const xp = state.xp || 0;
  const level = state.level || 1;
  const levelIdx = Math.min(level - 1, XP_CONFIG.levelThresholds.length - 2);
  const currentThreshold = XP_CONFIG.levelThresholds[levelIdx] || 0;
  const nextThreshold = XP_CONFIG.levelThresholds[levelIdx + 1] || XP_CONFIG.levelThresholds[XP_CONFIG.levelThresholds.length - 1];
  const progressInLevel = xp - currentThreshold;
  const levelRange = nextThreshold - currentThreshold;
  const percent = Math.min(100, (progressInLevel / levelRange) * 100);

  const fillEl = document.getElementById('xp-fill');
  const textEl = document.getElementById('xp-text');
  const badgeEl = document.getElementById('xp-level-badge');

  if (fillEl) fillEl.style.width = percent + '%';
  if (textEl) textEl.textContent = `${xp} / ${nextThreshold} XP`;
  if (badgeEl) {
    const levelName = XP_CONFIG.levelNames[Math.min(level - 1, XP_CONFIG.levelNames.length - 1)];
    badgeEl.textContent = `LVL ${level}`;
    badgeEl.title = levelName;
  }
}

function checkAchievements() {
  if (!state.achievements) state.achievements = [];

  ACHIEVEMENTS.forEach(ach => {
    if (!state.achievements.includes(ach.id) && ach.condition(state)) {
      state.achievements.push(ach.id);
      saveState();
      showAchievement(ach.name);
    }
  });
}

function showAchievement(name) {
  const popup = document.getElementById('achievement-popup');
  const nameEl = document.getElementById('achievement-name');
  if (!popup || !nameEl) return;

  nameEl.textContent = name;
  popup.classList.remove('hidden');
  popup.classList.add('visible');

  setTimeout(() => {
    popup.classList.remove('visible');
    setTimeout(() => popup.classList.add('hidden'), 400);
  }, 3500);
}

/* ==========================================================================
   18. Magnetic Buttons
   ========================================================================== */
function initMagneticButtons() {
  if (window.innerWidth <= 768) return;

  document.querySelectorAll('.magnetic-btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });
}

/* ==========================================================================
   19. Interactive Tilt Cards (3D perspective on hover)
   ========================================================================== */
function initTiltCards() {
  if (window.innerWidth <= 768) return;

  document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.idea-card');
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      if (!isVisible) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

      if (dist < 300) {
        const rotateX = ((y - centerY) / centerY) * -3;
        const rotateY = ((x - centerX) / centerX) * 3;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      }
    });
  });

  document.addEventListener('mouseleave', () => {
    document.querySelectorAll('.idea-card').forEach(card => {
      card.style.transform = '';
    });
  });
}
