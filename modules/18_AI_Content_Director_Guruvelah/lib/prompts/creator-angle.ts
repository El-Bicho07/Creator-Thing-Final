import { BASE_SYSTEM_INSTRUCTION, wrapUserInput } from './base';

export const PROMPT_VERSION_ANGLE = 'angle-generator-v1';

export function buildCreatorAnglePrompt(params: {
  trendAnalysis: any;
  niche: string;
  subNiche?: string;
  targetAudience: string;
  platform: string;
  goal: string;
  contentStyle?: string;
  tone: string[];
  experienceLevel?: string;
  creatorDescription?: string;
  memoryText?: string;
  goalDirective: string;
  lifecycleDirective: string;
}): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = `${BASE_SYSTEM_INSTRUCTION}
You are a creator strategy engine. Do NOT generate generic content ideas.
Transform the trend into ONE content angle that only THIS creator can credibly make.
Reason explicitly about: what the trend is, why people care, the target audience's specific pain point or curiosity, what unique perspective this creator has that a generic creator lacks, and how the content goal changes the angle positioning.
`;

  const userPrompt = `
TREND ANALYSIS SUMMARY: ${wrapUserInput(JSON.stringify(params.trendAnalysis))}
CREATOR NICHE / SUB-NICHE: ${params.niche} / ${params.subNiche || 'N/A'}
TARGET AUDIENCE: ${params.targetAudience}
PLATFORM: ${params.platform}       CONTENT GOAL: ${params.goal}
CONTENT STYLE: ${params.contentStyle || 'General'}     TONE: ${params.tone.join(', ')}     EXPERIENCE LEVEL: ${params.experienceLevel || 'Intermediate'}
CREATOR DESCRIPTION: ${wrapUserInput(params.creatorDescription)}
CREATOR MEMORY (learned preferences): ${wrapUserInput(params.memoryText || 'None')}
STRATEGY DIRECTIVES:
- Goal Directive: ${params.goalDirective}
- Lifecycle Directive: ${params.lifecycleDirective}

Return JSON with schema:
{
  "genericTrend": string,
  "creatorSummary": string,
  "audiencePainPoint": string,
  "uniquePerspective": string,
  "creatorFit": string,
  "angle": string, (First-person or creator-positioned statement, max 200 chars)
  "angleReason": string,
  "contentConcept": string,
  "emotionalTrigger": string,
  "recommendedFormat": string,
  "ctaDirection": string
}
`;

  return { systemInstruction, userPrompt };
}
