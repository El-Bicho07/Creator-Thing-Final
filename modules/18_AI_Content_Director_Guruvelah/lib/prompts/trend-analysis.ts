import { BASE_SYSTEM_INSTRUCTION, wrapUserInput } from './base';

export const PROMPT_VERSION_TREND_ANALYSIS = 'trend-analyzer-v1';

export function buildTrendAnalysisPrompt(
  topic: string,
  sourceText?: string,
  lifecycleHint?: string
): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = `${BASE_SYSTEM_INSTRUCTION}
Your task is to analyze a trending topic or news snippet objectively (creator-independent summary).
If source text is provided, base the analysis strictly on the source text as the source of truth.
If the trend is very recent or obscure, set knowledgeConfidence to "low", keep explanations general, list assumptions, and do not invent fake details.`;

  const userPrompt = `
Analyze the following trend:
TOPIC: ${wrapUserInput(topic)}
${sourceText ? `SOURCE TEXT (Source of truth): ${wrapUserInput(sourceText)}` : ''}
${lifecycleHint ? `LIFECYCLE HINT: ${wrapUserInput(lifecycleHint)}` : ''}

Return JSON with schema:
{
  "trendTitle": string,
  "category": string,
  "explanation": string,
  "whyPeopleCare": string,
  "audienceRelevance": string,
  "lifecycle": {
    "stage": "emerging" | "rising" | "peak" | "declining" | "evergreen" | "unknown",
    "basis": "user" | "source" | "unknown"
  },
  "contentOpportunities": [string, string, ...], (2 to 4 items)
  "risks": [string, ...],
  "knowledgeConfidence": "high" | "medium" | "low",
  "assumptions": [string, ...]
}
`;

  return { systemInstruction, userPrompt };
}
