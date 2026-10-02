import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { GenerateHooksRequest, HookItem, HOOK_STYLES } from '@/types';
import fs from 'fs';
import path from 'path';

// The 10 mandatory styles in exact order
const REQUIRED_STYLES = [
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

// LangChain structured output schema for the 10 hooks
const HookOutputSchema = z.object({
  hooks: z
    .array(
      z.object({
        style: z
          .string()
          .describe('The style of hook (e.g., Curiosity, Question, Contrarian, etc.)'),
        hook: z.string().describe('The hook copy.'),
      })
    )
    .describe('An array of exactly 10 hooks with their corresponding style.'),
});

/**
 * Safely resolves the GEMINI_API_KEY from environment variables or directly
 * from .env / .env.local on disk to ensure immediate hot-pickup.
 */
function getGeminiApiKey(): string | null {
  // 1. Check process.env first
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && envKey.trim() !== '' && envKey !== 'your_gemini_api_key_here') {
    return envKey.trim();
  }

  // 2. Direct filesystem fallback for hot-reload resilience
  const candidateFiles = ['.env.local', '.env'];
  for (const file of candidateFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const [k, ...vParts] = trimmed.split('=');
          if (k.trim() === 'GEMINI_API_KEY') {
            const rawVal = vParts.join('=').trim().replace(/^["']|["']$/g, '');
            if (rawVal && rawVal !== 'your_gemini_api_key_here') {
              // Cache in process.env for subsequent calls
              process.env.GEMINI_API_KEY = rawVal;
              return rawVal;
            }
          }
        }
      } catch {
        // Ignore file read error
      }
    }
  }

  return null;
}

export async function generateHooksWithGemini(
  params: GenerateHooksRequest
): Promise<HookItem[]> {
  const apiKey = getGeminiApiKey();

  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your valid Google Gemini API key to the .env file.'
    );
  }

  const audienceText = params.audience?.trim()
    ? `Target Audience: ${params.audience.trim()}`
    : 'Target Audience: General audience interested in this space';

  const systemInstruction = `You are Hook Generator, an elite viral copywriter and content strategist specializing in creating irresistible, scroll-stopping hooks for social media.
Your mission is to generate EXACTLY 10 distinct, high-performing hooks for a given topic, tailored precisely to the specified platform, audience, and tone.

Each of the 10 hooks MUST correspond to one of the following 10 styles in this exact order:
1. Curiosity: Stirs intense intrigue or hints at an unspoken secret.
2. Question: A provocative, thought-provoking question that demands an answer.
3. Contrarian: Challenges conventional wisdom or attacks a sacred cow.
4. Bold Claim: A definitive, confident statement that stops people in their tracks.
5. Statistic/Data: A data-centric perspective highlighting trends or measurable reality WITHOUT fabricating numbers.
6. Story: The opening line of a captivating personal or observational narrative.
7. Problem/Pain Point: Directly highlights an acute frustration or obstacle.
8. Fear/Urgency: Creates FOMO, warns of costly mistakes, or sparks timely concern.
9. Future/Possibility: Inspires with what could be or paints an exciting vision.
10. Surprise/Twist: Subverts expectations with an unexpected juxtaposition or pivot.

CRITICAL STATISTIC SAFETY RULE:
For the 'Statistic/Data' hook:
- NEVER invent statistics, percentages, fake study figures, sample sizes, or fabricated claims.
- If the user did not supply a verified statistic in the prompt, frame the hook around the data reality, trend shifts, or verifiable metrics WITHOUT inventing numbers.
- BAD EXAMPLE: "87% of students use AI every day."
- GOOD EXAMPLE: "The data behind how students are using AI is changing faster than most people realize."

REQUIREMENTS:
- Each hook must feel organic and tailored to the platform (${params.platform}) and tone (${params.tone}).
- The hooks must be genuinely different angles and frameworks—do NOT just rewrite the same sentence 10 times.
- Format strictly as JSON with exactly 10 hook objects.`;

  const userPrompt = `Topic: "${params.topic}"
${audienceText}
Platform: ${params.platform}
Tone: ${params.tone}

Generate exactly 10 hooks covering the 10 styles:
1. Curiosity
2. Question
3. Contrarian
4. Bold Claim
5. Statistic/Data
6. Story
7. Problem/Pain Point
8. Fear/Urgency
9. Future/Possibility
10. Surprise/Twist`;

  // We attempt gemini-2.5-pro first as requested, with fallback to active working models
  const modelsToTry = [
    'gemini-2.5-pro',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-3-flash-preview',
  ];
  let lastError: Error | null = null;
  let rawHooks: Array<{ style?: string; hook?: string }> | null = null;

  for (const modelName of modelsToTry) {
    try {
      const llm = new ChatGoogleGenerativeAI({
        model: modelName,
        apiKey,
        maxRetries: 0,
      });

      const structuredLlm = llm.withStructuredOutput(HookOutputSchema);

      const response = await structuredLlm.invoke([
        new SystemMessage(systemInstruction),
        new HumanMessage(userPrompt),
      ]);

      if (response && Array.isArray(response.hooks) && response.hooks.length > 0) {
        rawHooks = response.hooks;
        break; // Successfully got response
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      lastError = new Error(errMessage);

      // If invalid API key, fail immediately with clear instructions
      if (
        errMessage.includes('API_KEY_INVALID') ||
        errMessage.includes('API key not valid') ||
        errMessage.includes('PERMISSION_DENIED')
      ) {
        throw new Error(
          'Invalid Gemini API key. Please verify your GEMINI_API_KEY in the .env file.'
        );
      }
    }
  }

  if (!rawHooks || rawHooks.length === 0) {
    throw new Error(
      lastError?.message || 'Failed to receive a response from Gemini. Please try again.'
    );
  }

  // Validate and normalize exactly 10 hooks
  const validatedHooks: HookItem[] = [];

  for (let i = 0; i < REQUIRED_STYLES.length; i++) {
    const targetStyle = REQUIRED_STYLES[i];
    const matched =
      rawHooks.find(
        (h) => h.style?.toLowerCase() === targetStyle.toLowerCase()
      ) || rawHooks[i];

    if (matched && matched.hook && matched.hook.trim()) {
      validatedHooks.push({
        id: i + 1,
        style: targetStyle,
        hook: matched.hook.trim(),
      });
    } else {
      validatedHooks.push({
        id: i + 1,
        style: targetStyle,
        hook: `Discover how ${params.topic} is transforming the game for ${params.platform}.`,
      });
    }
  }

  if (validatedHooks.length !== 10) {
    throw new Error(`Expected exactly 10 hooks, received ${validatedHooks.length}.`);
  }

  return validatedHooks;
}
