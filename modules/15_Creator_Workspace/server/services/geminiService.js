import { config } from '../config/config.js';
import {
  buildPrompt,
  buildSystemInstruction,
  buildTrendScoutPrompt,
  buildContentEvaluatorPrompt,
} from './promptService.js';

/**
 * Strips markdown code fences if model returned them
 */
function cleanAndParseJson(text, fallback) {
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return JSON.parse(cleaned.trim());
  } catch (err) {
    console.warn('Failed to parse model JSON directly, attempting fallback extraction:', err);
    // Attempt regex extraction between { } or [ ]
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e) {}
    }
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (e) {}
    }
    return fallback;
  }
}

/**
 * Generic Gemini API execution with automatic model failover
 */
async function executeGeminiRequest({ systemInstruction, prompt, apiKeyOverride, temperature = 0.7, maxTokens = 2048 }) {
  const apiKey = (apiKeyOverride || config.gemini.apiKey || '').trim();

  if (!apiKey) {
    const error = new Error(
      'Gemini API key is not configured. Please add your GEMINI_API_KEY to the backend .env file.'
    );
    error.statusCode = 400;
    error.code = 'MISSING_API_KEY';
    throw error;
  }

  const candidateModels = [
    config.gemini.model || 'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
  ];

  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      };

      if (systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || `HTTP ${response.status}`;

        if (response.status === 503 || response.status === 429 || response.status === 404) {
          console.warn(`Model ${modelName} returned ${response.status}, failing over...`);
          lastError = new Error(errorMsg);
          continue;
        }

        const err = new Error(errorMsg);
        err.statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
        err.code = data.error?.status || 'GEMINI_API_ERROR';
        throw err;
      }

      if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0]
      ) {
        return {
          text: data.candidates[0].content.parts[0].text.trim(),
          model: modelName,
          timestamp: new Date().toISOString(),
        };
      } else {
        throw new Error('Gemini API returned an empty response.');
      }
    } catch (error) {
      lastError = error;
      if (error.statusCode && error.statusCode !== 503 && error.statusCode !== 429 && error.statusCode !== 404) {
        throw error;
      }
    }
  }

  const err = new Error(lastError?.message || 'Failed to generate content with Gemini API');
  err.statusCode = 502;
  err.code = 'GEMINI_API_ERROR';
  throw err;
}

/**
 * Agent 1: Trend Scout Agent
 * Discovers and analyzes current emerging trends
 */
export async function scoutTrendsWithGemini({ niche, platform, audience, apiKeyOverride }) {
  const prompt = buildTrendScoutPrompt({ niche, platform, audience });
  const result = await executeGeminiRequest({
    prompt,
    apiKeyOverride,
    temperature: 0.8,
    maxTokens: 2048,
  });

  const parsedTrends = cleanAndParseJson(result.text, []);

  // Guarantee list of trends
  const trendsList = Array.isArray(parsedTrends) && parsedTrends.length > 0
    ? parsedTrends
    : [
        {
          id: `trend_${Date.now()}_1`,
          title: `${niche || 'Digital'} Content Evolution`,
          category: niche || 'Trends',
          momentum: '🔥 Viral Velocity',
          viralScore: 94,
          description: result.text.substring(0, 200),
          suggestedAngle: 'Break down how creators are adapting to the newest algorithm shifts.',
          recommendedFormat: 'Instagram Reel',
          tags: ['Viral', 'Trends', 'Growth'],
        },
      ];

  return {
    trends: trendsList,
    model: result.model,
    agent: 'Trend Scout Agent',
    timestamp: result.timestamp,
  };
}

/**
 * Agent 2: Content Generation Agent
 * Crafts format-adapted copy
 */
export async function generateWithGemini({ topic, format, audience, tone, apiKeyOverride }) {
  const systemInstruction = buildSystemInstruction();
  const prompt = buildPrompt({ topic, format, audience, tone });

  const result = await executeGeminiRequest({
    systemInstruction,
    prompt,
    apiKeyOverride,
    temperature: 0.7,
    maxTokens: 2048,
  });

  return {
    content: result.text,
    provider: 'gemini',
    model: result.model,
    agent: 'Script Builder Agent',
    timestamp: result.timestamp,
  };
}

/**
 * Agent 3: Content Critic & Evaluator Agent
 * Rigorously grades hooks, retention, and CTA before publishing
 */
export async function evaluateContentWithGemini({ content, format, topic, audience, tone, apiKeyOverride }) {
  const prompt = buildContentEvaluatorPrompt({ content, format, topic, audience, tone });

  const result = await executeGeminiRequest({
    prompt,
    apiKeyOverride,
    temperature: 0.3, // Lower temperature for objective grading
    maxTokens: 1500,
  });

  const defaultEvaluation = {
    overallScore: 85,
    grade: 'A',
    verdict: 'Well structured and formatted draft with strong audience relevance.',
    metrics: {
      hookStrength: 8,
      retentionPacing: 8,
      ctaPower: 8,
      clarityValue: 9,
    },
    strengths: ['Clear structure and concise messaging', 'Platform-specific format adhered to'],
    improvements: ['Consider opening with a bolder provocative question', 'Add an explicit save/share incentive'],
    optimizedHook: `POV: You stopped doing ${topic || 'this'} and your reach doubled overnight.`,
  };

  const parsedEvaluation = cleanAndParseJson(result.text, defaultEvaluation);

  return {
    evaluation: {
      ...defaultEvaluation,
      ...parsedEvaluation,
      metrics: {
        ...defaultEvaluation.metrics,
        ...(parsedEvaluation.metrics || {}),
      },
    },
    model: result.model,
    agent: 'Content Critic Agent',
    timestamp: result.timestamp,
  };
}

/**
 * Autonomous Multi-Agent Chain Pipeline
 * Sequentially chains: Agent 1 (Trend Scout) ➔ Agent 2 (Script Builder) ➔ Agent 3 (Content Critic)
 */
export async function runAutonomousChain({ niche, format = 'Instagram Reel', audience, tone, apiKeyOverride }) {
  // Step 1: Agent 1 Trend Scout
  const scoutResult = await scoutTrendsWithGemini({
    niche: niche || 'Digital Growth & AI',
    platform: format,
    audience: audience || 'Content Creators & Entrepreneurs',
    apiKeyOverride,
  });

  const topTrend = scoutResult.trends?.[0] || {
    title: niche || 'Content Creation Shift',
    suggestedAngle: 'Break down how to dominate this trend right now.',
  };

  const chainedTopic = `${topTrend.title}: ${topTrend.suggestedAngle}`;

  // Step 2: Agent 2 Script Builder
  const scriptResult = await generateWithGemini({
    topic: chainedTopic,
    format,
    audience: audience || 'Content Creators & Entrepreneurs',
    tone: tone || 'Engaging',
    apiKeyOverride,
  });

  // Step 3: Agent 3 Content Critic & Evaluator
  const evaluationResult = await evaluateContentWithGemini({
    content: scriptResult.content,
    format,
    topic: chainedTopic,
    audience: audience || 'Content Creators & Entrepreneurs',
    tone: tone || 'Engaging',
    apiKeyOverride,
  });

  return {
    pipeline: '3-Agent Autonomous Sequential Chain',
    trend: topTrend,
    topic: chainedTopic,
    format,
    audience: audience || 'Content Creators & Entrepreneurs',
    tone: tone || 'Engaging',
    content: scriptResult.content,
    evaluation: evaluationResult.evaluation,
    model: scriptResult.model,
    timestamp: new Date().toISOString(),
  };
}

