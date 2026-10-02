import { BASE_SYSTEM_INSTRUCTION, wrapUserInput } from './base';

export const PROMPT_VERSION_FORMAT = 'format-recommender-v1';

export function buildFormatPrompt(params: {
  angle: string;
  trendTitle: string;
  platform: string;
  allowedFormats: string[];
  goal: string;
  targetAudience: string;
}): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = `${BASE_SYSTEM_INSTRUCTION}
Recommend the optimal content format for this creator angle on ${params.platform}.
The primary recommendedFormat MUST be chosen from the allowed list: ${params.allowedFormats.join(', ')}.
You may optionally provide a secondaryFormat (e.g., "Screen Recording" to make "Talking Head + Screen Recording") if appropriate.
`;

  const userPrompt = `
CREATOR ANGLE: ${wrapUserInput(params.angle)}
TREND TITLE: ${wrapUserInput(params.trendTitle)}
PLATFORM: ${params.platform}
ALLOWED FORMATS: ${JSON.stringify(params.allowedFormats)}
GOAL: ${params.goal}

Return JSON schema:
{
  "recommendedFormat": string,
  "secondaryFormat": string | null,
  "reason": string,
  "structure": [string, string, ...],
  "visualRequirements": [string, ...],
  "alternatives": [string, ...]
}
`;

  return { systemInstruction, userPrompt };
}
