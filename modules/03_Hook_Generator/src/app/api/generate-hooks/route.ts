import { NextRequest, NextResponse } from 'next/server';
import { generateHooksWithGemini } from '@/lib/gemini';
import { Platform, Tone, GenerateHooksRequest } from '@/types';

const VALID_PLATFORMS: Platform[] = [
  'Instagram',
  'YouTube',
  'LinkedIn',
  'X/Twitter',
  'TikTok',
];

const VALID_TONES: Tone[] = [
  'Bold',
  'Professional',
  'Funny',
  'Educational',
  'Emotional',
];

export async function POST(request: NextRequest) {
  try {
    let body: Partial<GenerateHooksRequest>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const { topic, audience, platform, tone } = body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json(
        { error: 'Topic is required. Please provide a topic to generate hooks for.' },
        { status: 400 }
      );
    }

    if (topic.trim().length > 300) {
      return NextResponse.json(
        { error: 'Topic is too long. Please keep your topic under 300 characters.' },
        { status: 400 }
      );
    }

    const validatedPlatform: Platform = VALID_PLATFORMS.includes(platform as Platform)
      ? (platform as Platform)
      : 'LinkedIn';

    const validatedTone: Tone = VALID_TONES.includes(tone as Tone)
      ? (tone as Tone)
      : 'Bold';

    const hooks = await generateHooksWithGemini({
      topic: topic.trim(),
      audience: audience?.trim() || undefined,
      platform: validatedPlatform,
      tone: validatedTone,
    });

    return NextResponse.json({
      hooks,
      topic: topic.trim(),
      platform: validatedPlatform,
      tone: validatedTone,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred while generating hooks.';

    // Do NOT log secrets or sensitive payloads
    console.error('API Error in /api/generate-hooks:', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
