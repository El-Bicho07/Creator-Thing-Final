import {
  generateWithGemini,
  scoutTrendsWithGemini,
  evaluateContentWithGemini,
  runAutonomousChain,
} from '../services/geminiService.js';

/**
 * Controller for Gemini content generation (Agent 2: Script Builder Agent)
 */
export async function handleGeminiGenerate(req, res) {
  try {
    const { topic, format, audience, tone, apiKey } = req.body;

    // Validation
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Topic is required and cannot be empty.',
      });
    }

    if (!format || typeof format !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Content format is required.',
      });
    }

    const result = await generateWithGemini({
      topic: topic.trim(),
      format: format.trim(),
      audience: audience ? audience.trim() : 'General audience',
      tone: tone ? tone.trim() : 'Engaging',
      apiKeyOverride: apiKey,
    });

    return res.status(200).json({
      success: true,
      data: {
        topic: topic.trim(),
        format: format.trim(),
        audience: audience || 'General audience',
        tone: tone || 'Engaging',
        content: result.content,
        provider: result.provider,
        model: result.model,
        agent: result.agent || 'Script Builder Agent',
        timestamp: result.timestamp,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.code || 'GENERATION_FAILED',
      message: error.message || 'An unexpected error occurred during Gemini generation.',
    });
  }
}

/**
 * Controller for Trend Scout Agent (Agent 1)
 */
export async function handleTrendScout(req, res) {
  try {
    const { niche, platform, audience, apiKey } = req.body;

    const result = await scoutTrendsWithGemini({
      niche: niche ? niche.trim() : 'Digital Creators & Tech',
      platform: platform ? platform.trim() : 'Instagram Reels',
      audience: audience ? audience.trim() : 'Content Creators & Entrepreneurs',
      apiKeyOverride: apiKey,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.code || 'TREND_SCOUT_FAILED',
      message: error.message || 'An unexpected error occurred during trend scouting.',
    });
  }
}

/**
 * Controller for Content Critic & Evaluator Agent (Agent 3)
 */
export async function handleContentEvaluation(req, res) {
  try {
    const { content, format, topic, audience, tone, apiKey } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Content is required for evaluation.',
      });
    }

    const result = await evaluateContentWithGemini({
      content: content.trim(),
      format: format ? format.trim() : 'Instagram Reel',
      topic: topic ? topic.trim() : '',
      audience: audience ? audience.trim() : 'General audience',
      tone: tone ? tone.trim() : 'Engaging',
      apiKeyOverride: apiKey,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.code || 'EVALUATION_FAILED',
      message: error.message || 'An unexpected error occurred during content evaluation.',
    });
  }
}

/**
 * Controller for Autonomous 3-Agent Sequential Chain
 * Agent 1 ➔ Agent 2 ➔ Agent 3
 */
export async function handleAutonomousChain(req, res) {
  try {
    const { niche, format, audience, tone, apiKey } = req.body;

    const result = await runAutonomousChain({
      niche: niche ? niche.trim() : 'Digital Creators & AI',
      format: format ? format.trim() : 'Instagram Reel',
      audience: audience ? audience.trim() : 'Content Creators & Entrepreneurs',
      tone: tone ? tone.trim() : 'Engaging',
      apiKeyOverride: apiKey,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.code || 'CHAIN_FAILED',
      message: error.message || 'An unexpected error occurred during autonomous chaining.',
    });
  }
}
