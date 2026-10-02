import { BASE_SYSTEM_INSTRUCTION, wrapUserInput } from './base';

export const PROMPT_VERSION_HOOKS = 'hook-generator-v1';

export function buildHooksPrompt(params: {
  angle: string;
  trendTitle: string;
  niche: string;
  targetAudience: string;
  platform: string;
  goal: string;
  goalDirective: string;
}): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = `${BASE_SYSTEM_INSTRUCTION}
Generate EXACTLY 7 viral hooks for the given creator angle, one for each of the 7 categories:
1. Curiosity
2. Contrarian
3. Question
4. Story
5. Bold statement
6. Problem
7. Transformation

Rules:
- For video platforms (Reels, Shorts, TikTok, YouTube), each spoken hook MUST be 22 words or fewer.
- For text platforms (LinkedIn), hook text MUST be 200 characters or fewer; for X, 240 characters or fewer.
- No duplicate hooks. No numeric scores.
- Include a qualitative styleTag for each hook (e.g., "curiosity-driven", "pattern-interrupt").
- Identify topPickIndex (0-6) and topPickReason specifically tied to the content goal: ${params.goal}.
`;

  const userPrompt = `
CREATOR ANGLE: ${wrapUserInput(params.angle)}
TREND TITLE: ${wrapUserInput(params.trendTitle)}
PLATFORM: ${params.platform}
GOAL: ${params.goal} (${params.goalDirective})
TARGET AUDIENCE: ${params.targetAudience}

Return JSON schema:
{
  "hooks": [
    { "type": "Curiosity", "text": string, "rationale": string, "styleTag": string },
    { "type": "Contrarian", "text": string, "rationale": string, "styleTag": string },
    { "type": "Question", "text": string, "rationale": string, "styleTag": string },
    { "type": "Story", "text": string, "rationale": string, "styleTag": string },
    { "type": "Bold statement", "text": string, "rationale": string, "styleTag": string },
    { "type": "Problem", "text": string, "rationale": string, "styleTag": string },
    { "type": "Transformation", "text": string, "rationale": string, "styleTag": string }
  ],
  "topPickIndex": number,
  "topPickReason": string
}
`;

  return { systemInstruction, userPrompt };
}
