export type PlatformKind = 'video' | 'text';

export interface PlatformConfig {
  name: string;
  kind: PlatformKind;
  defaultDurationSec?: number;
  captionCharCap: number;
  captionAimChars: number;
  hashtagMin: number;
  hashtagMax: number;
  ctaNorm: string;
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  'Instagram Reels': {
    name: 'Instagram Reels',
    kind: 'video',
    defaultDurationSec: 30,
    captionCharCap: 2200,
    captionAimChars: 300,
    hashtagMin: 5,
    hashtagMax: 10,
    ctaNorm: 'Comment below, save this reel, share with a friend, or follow for more.',
  },
  'YouTube Shorts': {
    name: 'YouTube Shorts',
    kind: 'video',
    defaultDurationSec: 30,
    captionCharCap: 100, // title cap
    captionAimChars: 300, // description aim
    hashtagMin: 3,
    hashtagMax: 5,
    ctaNorm: 'Drop a comment and subscribe for daily tech insights.',
  },
  TikTok: {
    name: 'TikTok',
    kind: 'video',
    defaultDurationSec: 30,
    captionCharCap: 2200,
    captionAimChars: 150,
    hashtagMin: 3,
    hashtagMax: 6,
    ctaNorm: 'Comment your thoughts, hit the plus button to follow.',
  },
  YouTube: {
    name: 'YouTube',
    kind: 'video',
    defaultDurationSec: 180,
    captionCharCap: 100,
    captionAimChars: 1000,
    hashtagMin: 3,
    hashtagMax: 5,
    ctaNorm: 'Subscribe to the channel, hit the notification bell, and leave a comment below.',
  },
  LinkedIn: {
    name: 'LinkedIn',
    kind: 'text',
    captionCharCap: 3000,
    captionAimChars: 1500,
    hashtagMin: 3,
    hashtagMax: 5,
    ctaNorm: 'Comment your take below or connect with me for weekly breakdowns.',
  },
  X: {
    name: 'X',
    kind: 'text',
    captionCharCap: 280,
    captionAimChars: 240,
    hashtagMin: 0,
    hashtagMax: 2,
    ctaNorm: 'Reply with your thoughts, repost the first tweet, and follow for more threads.',
  },
};

export function getPlatformConfig(platform: string): PlatformConfig {
  return PLATFORMS[platform] || PLATFORMS['Instagram Reels'];
}
