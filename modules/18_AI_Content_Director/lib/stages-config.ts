import { StageInfo } from './types';

export const STAGES_CONFIG: StageInfo[] = [
  {
    number: 1,
    key: 'research',
    title: 'Research & Facts',
    shortDesc: 'Key facts, statistics, trends, and pain points',
    icon: 'Search',
    directorTip: 'Focus on extracting surprising, counter-intuitive data points. High-performing content hooks viewers with validated facts that shatter existing assumptions.'
  },
  {
    number: 2,
    key: 'angles',
    title: 'Content Angles',
    shortDesc: '5 distinct hooks, emotions, and positioning angles',
    icon: 'Compass',
    directorTip: 'Choose the angle with the highest emotional tension and relevance to your audience. The opening hook determines whether 80% of your audience continues watching.'
  },
  {
    number: 3,
    key: 'narrative',
    title: 'Narrative Storyboard',
    shortDesc: 'Story structure, core theme, and beat outline',
    icon: 'GitFork',
    directorTip: 'Notice the pacing curve: structure each beat so the audience is left waiting for the resolution of the next question before you answer the previous one.'
  },
  {
    number: 4,
    key: 'script',
    title: 'Spoken Script',
    shortDesc: 'Full word-for-word script with delivery cues',
    icon: 'FileText',
    directorTip: 'Read the dialogue aloud. Eliminate industry jargon and clunky sentences. Aim for ~140-150 words per minute to keep spoken cadence brisk and engaging.'
  },
  {
    number: 5,
    key: 'visuals',
    title: 'Visuals & B-Roll',
    shortDesc: 'On-screen framing, B-roll, stock search, graphics',
    icon: 'Film',
    directorTip: 'The 45-Second Visual Reset rule: Never leave the screen static for more than 45 seconds without a kinetic overlay, angle change, or B-roll cutaway.'
  },
  {
    number: 6,
    key: 'shotList',
    title: 'Production Shot List',
    shortDesc: 'Camera movements, angles, lighting setup, and durations',
    icon: 'Camera',
    directorTip: 'Check off shots during production. Group similar setups (e.g. all Studio Desk shots) together to minimize camera repositioning time.'
  },
  {
    number: 7,
    key: 'publishing',
    title: 'Publishing & Packaging',
    shortDesc: 'Viral titles, SEO description, thumbnails, multi-platform copy',
    icon: 'Share2',
    directorTip: 'Pair high-curiosity titles with high-contrast, uncluttered thumbnail concepts. Test at least 2 title variations in your community within the first 3 hours of posting.'
  }
];
