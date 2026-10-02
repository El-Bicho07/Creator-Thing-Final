const express = require('express');
const router = express.Router();
const llmService = require('../services/llmService');
const config = require('../config');

// Status endpoint: reports whether key is configured without exposing the key itself
router.get('/status', (req, res) => {
  const isConfigured = llmService.isGeminiKeyConfigured();
  const isPlaceholder = config.geminiApiKey === 'PASTE_YOUR_KEY_HERE';

  res.json({
    success: true,
    hasGeminiKey: isConfigured,
    isPlaceholder,
    message: isConfigured
      ? 'Gemini API key is configured and active.'
      : isPlaceholder
      ? 'GEMINI_API_KEY in .env is still set to placeholder PASTE_YOUR_KEY_HERE.'
      : 'GEMINI_API_KEY is not set in .env.'
  });
});

// Generate Full Proposal
router.post('/generate', async (req, res) => {
  try {
    const { profile, brandInfo, tone = 'professional', format = 'deck', customInstructions = '' } = req.body;

    if (!profile || !profile.name) {
      return res.status(400).json({ error: 'Creator name is required.' });
    }

    if (!brandInfo || !brandInfo.brandName) {
      return res.status(400).json({ error: 'Brand name is required.' });
    }

    const result = await llmService.generateProposal({
      profile,
      brandInfo,
      tone,
      format,
      customInstructions
    });

    res.json({
      success: true,
      data: result.data,
      usedLiveAI: result.usedLiveAI,
      warning: result.warning || null,
      meta: {
        creator: profile.name,
        brand: brandInfo.brandName,
        tone,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[AI Route] Generate proposal error:', err);
    res.status(500).json({
      error: 'Failed to generate proposal',
      message: err.message
    });
  }
});

// Regenerate / Refine a Specific Section
router.post('/regenerate-section', async (req, res) => {
  try {
    const {
      sectionKey,
      currentContent,
      modifier = 'more_persuasive',
      customPrompt = '',
      profile,
      brandInfo,
      tone = 'professional'
    } = req.body;

    if (!sectionKey || !currentContent) {
      return res.status(400).json({ error: 'sectionKey and currentContent are required.' });
    }

    const updatedSection = await llmService.regenerateSection({
      sectionKey,
      currentContent,
      modifier,
      customPrompt,
      profile: profile || {},
      brandInfo: brandInfo || {},
      tone
    });

    res.json({
      success: true,
      sectionKey,
      data: updatedSection
    });
  } catch (err) {
    console.error('[AI Route] Regenerate section error:', err);
    res.status(500).json({
      error: 'Failed to regenerate section',
      message: err.message
    });
  }
});

module.exports = router;
