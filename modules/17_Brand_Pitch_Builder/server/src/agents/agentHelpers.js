const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");
const config = require('../config');

/**
 * Safely parse JSON from LLM output, stripping markdown fences if present.
 */
function cleanAndParseJSON(rawText) {
  if (!rawText) throw new Error("Empty response from AI engine");

  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  const firstBrace = cleaned.search(/[\{\[]/);
  const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

/**
 * Checks if the configured Gemini key is a valid key
 */
function isGeminiKeyConfigured() {
  const key = config.geminiApiKey;
  return Boolean(
    key &&
    key.trim() !== '' &&
    key !== 'PASTE_YOUR_KEY_HERE' &&
    key.length > 5
  );
}

/**
 * Invoke Google Gemini via LangChain with automatic model fallback
 */
async function invokeLangChain(systemPrompt, userPrompt) {
  const apiKey = config.geminiApiKey;
  if (!apiKey || apiKey === 'PASTE_YOUR_KEY_HERE') {
    throw new Error("Gemini API key is not configured.");
  }

  const primaryModel = config.geminiModel || 'gemini-flash-lite-latest';
  const modelsToTry = [
    primaryModel,
    'gemini-flash-lite-latest',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest'
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const llm = new ChatGoogleGenerativeAI({
        model: model,
        modelName: model,
        apiKey: apiKey,
        maxRetries: 1,
        temperature: 0.7,
        topP: 0.95
      });

      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ]);

      return cleanAndParseJSON(response.content);
    } catch (err) {
      lastError = err;
      const isRetryable = err.message.includes('404') || err.message.includes('503') || err.message.includes('ResourceExhausted');
      if (isRetryable) {
        console.warn(`[LangChain Agent] Model ${model} returned retryable error: ${err.message}. Trying next fallback model...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("All Gemini models failed in LangChain invocation.");
}

/**
 * Anti-hallucination sanitization: Ensures strict placeholders if creator omitted data.
 */
function enforceDataIntegrity(proposal, profile) {
  const reachProvided = profile.metrics?.totalReach && String(profile.metrics.totalReach).trim() !== '';
  const engagementProvided = profile.metrics?.avgEngagementRate && String(profile.metrics.avgEngagementRate).trim() !== '';
  const rateProvided = profile.rateCard?.basic || profile.rateCard?.standard;

  // Clone to avoid mutating original
  const sanitized = JSON.parse(JSON.stringify(proposal));

  // Check pricing packages
  if (!rateProvided && sanitized.sections?.pricingPackages?.packages) {
    sanitized.sections.pricingPackages.packages.forEach((pkg, index) => {
      if (typeof pkg.price === 'string' && (pkg.price.startsWith('$') || !isNaN(pkg.price.replace(/[$,]/g, '')))) {
        pkg.price = index === 0 ? '[Your starting rate]' : index === 1 ? '[Your standard rate]' : '[Your premium rate]';
      }
    });
  }

  // Check KPI metrics
  if (sanitized.sections?.kpisAndResults?.metrics) {
    sanitized.sections.kpisAndResults.metrics.forEach(m => {
      if (!reachProvided && /reach|follower/i.test(m.label)) {
        m.value = '[Your follower count]';
      }
      if (!engagementProvided && /engagement/i.test(m.label)) {
        m.value = '[Your engagement rate %]';
      }
    });
  }

  return sanitized;
}

module.exports = {
  cleanAndParseJSON,
  isGeminiKeyConfigured,
  invokeLangChain,
  enforceDataIntegrity
};
