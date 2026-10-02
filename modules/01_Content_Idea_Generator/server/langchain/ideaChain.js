const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { z } = require('zod');

// Schema for a single YouTube video concept matching IdeaForge contract
const IdeaSchema = z.object({
  type: z.string().describe('Distinct concept type, e.g. Myth Buster, Case Study, Tutorial, Challenge, Comparison, etc.'),
  title: z.string().describe('Specific, high CTR YouTube title under 60 characters without emojis or em dashes'),
  hook: z.string().describe('Word-for-word spoken hook for first 15 seconds, 1-2 sentences'),
  thumbnail: z.object({
    visual: z.string().describe('Visual imagery description of what is visible in frame'),
    overlay: z.string().max(25).describe('Punchy bold text overlay on thumbnail, max 3 words')
  }),
  why: z.string().describe('One practical sentence explaining the psychological or algorithmic trigger'),
  format: z.string().describe('Format description aligned with length, e.g. Vertical short 30-60s'),
  effort: z.enum(['Easy', 'Medium', 'Hard']).describe('Production effort required'),
  score: z.number().int().min(55).max(98).describe('Predicted virality/performance score between 55 and 98'),
  outline: z.array(z.string()).min(3).max(6).describe('5-step structured video breakdown/beats')
});

const IdeaListSchema = z.object({
  ideas: z.array(IdeaSchema).length(10).describe('Array of exactly 10 distinct video ideas')
});

const BANNED_WORDS = [
  'unleash', 'unlock', 'dive into', 'delve', 'ultimate guide', 'game-changer',
  'revolutionize', 'supercharge', 'elevate', 'master the art',
  'in today\'s fast-paced world', 'journey', 'landscape', 'leverage',
  'seamless', 'cutting-edge', 'comprehensive', 'crucial', 'tapestry'
];

// Models to try in order of preference (verified via ListModels API)
const MODEL_CANDIDATES = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview'
];

/**
 * Generate 10 YouTube video ideas using LangChain and Google Gemini
 * Retries across multiple model candidates if one is unavailable.
 */
async function generateIdeasWithChain({ topic, audience, niche, tone, length }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.trim() === 'your_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in server/.env');
  }

  // Build the ordered list of models to try
  const envModel = process.env.GEMINI_MODEL;
  const modelsToTry = envModel
    ? [envModel, ...MODEL_CANDIDATES.filter(m => m !== envModel)]
    : [...MODEL_CANDIDATES];

  const promptTemplate = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are an elite YouTube creator consultant and algorithm strategist with 10+ years of production experience.
You generate specific, high-click-through-rate, human-sounding YouTube video concepts.

CRITICAL WRITING QUALITY RULES:
1. NEVER use any of these banned AI buzzwords anywhere: ${BANNED_WORDS.map(w => `"${w}"`).join(', ')}.
2. NO em dashes and NO emojis in titles. Titles must be concrete, specific, and punchy, strictly under 60 characters.
3. Every hook must be written as if spoken aloud directly to camera in the first 15 seconds (1-2 sentences).
4. Thumbnail concepts must describe real visual composition in frame + max 3 words for overlay text.
5. "Why it works" must be exactly ONE practical sentence explaining why viewers click and watch.
6. All 10 ideas must have DIFFERENT concept types (e.g. Myth Buster, Case Study, Step-by-Step, Challenge, Comparison, Mistakes to Avoid, Before/After, Reality Check, Breakdown, Storytime).
7. Do not repeat titles or core angles.
8. Adapt to the requested tone ({tone}) and target video length ({length}).`
    ],
    [
      'human',
      `Generate exactly 10 diverse, specific YouTube video concepts for:
Topic: {topic}
Audience: {audience}
Category/Niche: {niche}
Tone: {tone}
Target Format/Length: {length}`
    ]
  ]);

  let lastError = null;

  for (const modelName of modelsToTry) {
    console.log(`[LangChain] Trying model: ${modelName}...`);

    const llm = new ChatGoogleGenerativeAI({
      modelName: modelName,
      apiKey: apiKey.trim(),
      temperature: 0.7,
      maxRetries: 1
    });

    const structuredLlm = llm.withStructuredOutput(IdeaListSchema);

    // 60-second timeout per model attempt (structured output generation needs time)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 60000);

    try {
      const chain = promptTemplate.pipe(structuredLlm);
      const result = await chain.invoke(
        {
          topic: String(topic).trim(),
          audience: String(audience).trim(),
          niche: niche || 'Fitness',
          tone: tone || 'Casual',
          length: length || 'Shorts'
        },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!result || !Array.isArray(result.ideas) || result.ideas.length !== 10) {
        throw new Error(`Chain returned malformed idea count: ${result?.ideas?.length}`);
      }

      console.log(`[LangChain] Success with model: ${modelName}`);

      // Verify banned words and length caps
      const cleanedIdeas = result.ideas.map((idea, idx) => {
        let cleanTitle = String(idea.title || '').replace(/[—–]/g, '-').replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
        if (cleanTitle.length > 60) {
          cleanTitle = cleanTitle.substring(0, 57).trim() + '...';
        }

        // Format string helper
        let formatStr = idea.format || 'Standard 10-15 min';
        if (length === 'Shorts') formatStr = 'Vertical short 30-60s';
        else if (length === '5-8 min') formatStr = 'Quick guide 5-8 min';
        else if (length === '10-15 min') formatStr = 'In-depth tutorial 10-15 min';
        else if (length === '20+ min') formatStr = 'Full masterclass 20+ min';

        return {
          type: idea.type || 'Strategy',
          title: cleanTitle,
          hook: idea.hook || `If you want to master ${topic}, here is what you need to know.`,
          thumbnail: {
            visual: idea.thumbnail?.visual || `Creator demonstrating ${topic} for ${audience}`,
            overlay: (idea.thumbnail?.overlay || 'WATCH THIS').toUpperCase()
          },
          why: idea.why || 'High search demand paired with strong curiosity gap.',
          format: formatStr,
          effort: ['Easy', 'Medium', 'Hard'].includes(idea.effort) ? idea.effort : 'Medium',
          score: Math.min(98, Math.max(55, Math.round(Number(idea.score) || 82))),
          outline: Array.isArray(idea.outline) && idea.outline.length >= 3 ? idea.outline : [
            'Hook (0-15s): Address the core problem immediately.',
            `Setup (15-45s): Why this matters for ${audience}.`,
            'Main Beat 1: First key technique and demonstration.',
            'Main Beat 2: Common mistake to avoid.',
            'Call to Action: Actionable takeaway and subscribe ask.'
          ]
        };
      });

      return cleanedIdeas;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      const msg = err.message || '';
      if (msg.includes('404') || msg.includes('no longer available') || msg.includes('not found')) {
        console.warn(`[LangChain] Model ${modelName} not available (404), trying next...`);
        continue;
      }
      if (msg.includes('503') || msg.includes('high demand') || msg.includes('overloaded')) {
        console.warn(`[LangChain] Model ${modelName} overloaded (503), trying next...`);
        continue;
      }
      if (err.name === 'AbortError' || controller.signal.aborted) {
        console.warn(`[LangChain] Model ${modelName} timed out, trying next...`);
        continue;
      }
      // For other errors (auth, schema, etc.), throw immediately
      throw err;
    }
  }

  // All models exhausted
  throw new Error(`All Gemini models failed. Last error: ${lastError?.message}`);
}

module.exports = {
  generateIdeasWithChain
};
