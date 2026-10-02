import { BASE_SYSTEM_INSTRUCTION, wrapUserInput } from './base';

export const PROMPT_VERSION_CAPTION = 'caption-generator-v1';

export function buildCaptionPrompt(params: {
  script: any;
  angle: string;
  platform: string;
  goal: string;
  hashtagMin: number;
  hashtagMax: number;
  captionCharCap: number;
  modifierInstruction?: string;
}): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = `${BASE_SYSTEM_INSTRUCTION}
Generate an optimized social media caption and hashtags for ${params.platform}.
${params.modifierInstruction ? `REWRITE INSTRUCTION: ${params.modifierInstruction}` : ''}
Rules:
- Caption MUST be within the ${params.captionCharCap} character limit for ${params.platform}.
- Generate between ${params.hashtagMin} and ${params.hashtagMax} relevant hashtags starting with '#', deduped, with no spaces.
- Include a compelling title if ${params.platform} supports video titles.
`;

  const userPrompt = `
CREATOR ANGLE: ${wrapUserInput(params.angle)}
SCRIPT CONTEXT: ${wrapUserInput(JSON.stringify(params.script))}
PLATFORM: ${params.platform}
GOAL: ${params.goal}

Return JSON schema:
{
  "title": string (optional),
  "caption": string,
  "hashtags": [string, ...]
}
`;

  return { systemInstruction, userPrompt };
}
