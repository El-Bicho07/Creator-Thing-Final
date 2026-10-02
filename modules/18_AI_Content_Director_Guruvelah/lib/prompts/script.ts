import { BASE_SYSTEM_INSTRUCTION, wrapUserInput } from './base';
import { ScriptSlot } from '@/lib/domain/timing';

export const PROMPT_VERSION_SCRIPT = 'script-generator-v1';

export function buildScriptPrompt(params: {
  angle: string;
  hookText: string;
  format: string;
  platform: string;
  kind: 'video' | 'text';
  durationSec?: number;
  timingSlots?: ScriptSlot[];
  niche: string;
  tone: string[];
  modifierInstruction?: string;
}): { systemInstruction: string; userPrompt: string } {
  const isVideo = params.kind === 'video';

  const systemInstruction = `${BASE_SYSTEM_INSTRUCTION}
Generate a complete, high-converting script for a ${params.kind.toUpperCase()} post on ${params.platform}.
${params.modifierInstruction ? `REWRITE INSTRUCTION: ${params.modifierInstruction}` : ''}

CRITICAL RULES:
- The opening line MUST use the selected hook verbatim (or minimal spoken adaptation): "${params.hookText}"
- ${
    isVideo
      ? `This is a VIDEO script for duration ${params.durationSec}s.
You MUST fill in content for the exact injected timing slots. Do NOT change startSec or endSec timestamps.`
      : `This is a TEXT post script for ${params.platform}.
For LinkedIn: output assembledPost as the full ready-to-copy post.
For X: output thread as an array of tweets, each 280 characters or fewer.`
  }
`;

  const userPrompt = `
CREATOR ANGLE: ${wrapUserInput(params.angle)}
SELECTED HOOK VERBATIM: ${wrapUserInput(params.hookText)}
RECOMMENDED FORMAT: ${params.format}
PLATFORM: ${params.platform}
TONE: ${params.tone.join(', ')}

${
  isVideo
    ? `VIDEO TIMING SKELETON (fill content per slot):
${JSON.stringify(params.timingSlots, null, 2)}

Return JSON schema for VideoScript:
{
  "kind": "video",
  "title": string,
  "durationSec": ${params.durationSec},
  "ctaText": string,
  "segments": [
    {
      "label": "HOOK" | "SETUP" | "VALUE" | "PAYOFF" | "CTA",
      "startSec": number,
      "endSec": number,
      "voiceover": string, (Spoken words for this slot)
      "onScreenText": string,
      "visual": string,
      "bRoll": string,
      "camera": string
    }
  ]
}`
    : `Return JSON schema for TextPostScript:
{
  "kind": "text_post",
  "title": string,
  "ctaText": string,
  "sections": [
    { "label": "HOOK" | "SETUP" | "VALUE" | "PAYOFF" | "CTA", "text": string }
  ],
  "assembledPost": string, (Full post for LinkedIn)
  "thread": [string, ...] (Array of tweets for X, each <= 280 chars)
}`
}
`;

  return { systemInstruction, userPrompt };
}
