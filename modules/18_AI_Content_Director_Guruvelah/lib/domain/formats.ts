export const ALL_FORMATS = [
  'Talking Head',
  'POV',
  'Storytime',
  'Tutorial',
  'Listicle',
  'Screen Recording',
  'Voiceover + B-roll',
  'Reaction',
  'Interview',
  'Before/After',
  'Myth vs Fact',
  'Case Study',
  'Explainer',
] as const;

export type ContentFormat = (typeof ALL_FORMATS)[number];

export const ALLOWED_FORMATS_BY_PLATFORM: Record<string, ContentFormat[]> = {
  'Instagram Reels': [...ALL_FORMATS],
  'YouTube Shorts': [...ALL_FORMATS],
  TikTok: [...ALL_FORMATS],
  YouTube: [
    'Tutorial',
    'Explainer',
    'Case Study',
    'Storytime',
    'Listicle',
    'Screen Recording',
    'Voiceover + B-roll',
    'Interview',
    'Reaction',
  ],
  LinkedIn: [
    'Case Study',
    'Listicle',
    'Myth vs Fact',
    'Storytime',
    'Explainer',
    'Before/After',
  ],
  X: ['Listicle', 'Myth vs Fact', 'Storytime', 'Explainer', 'Reaction'],
};

export function getAllowedFormats(platform: string): ContentFormat[] {
  return ALLOWED_FORMATS_BY_PLATFORM[platform] || [...ALL_FORMATS];
}
