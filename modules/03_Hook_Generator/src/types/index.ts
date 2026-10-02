export type Platform = 'Instagram' | 'YouTube' | 'LinkedIn' | 'X/Twitter' | 'TikTok';

export type Tone = 'Bold' | 'Professional' | 'Funny' | 'Educational' | 'Emotional';

export const HOOK_STYLES = [
  'Curiosity',
  'Question',
  'Contrarian',
  'Bold Claim',
  'Statistic/Data',
  'Story',
  'Problem/Pain Point',
  'Fear/Urgency',
  'Future/Possibility',
  'Surprise/Twist',
] as const;

export type HookStyle = (typeof HOOK_STYLES)[number];

export interface HookItem {
  id?: number;
  style: HookStyle | string;
  hook: string;
}

export interface GenerateHooksRequest {
  topic: string;
  audience?: string;
  platform: Platform;
  tone: Tone;
}

export interface GenerateHooksResponse {
  hooks: HookItem[];
  topic: string;
  platform: Platform;
  tone: Tone;
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
}
