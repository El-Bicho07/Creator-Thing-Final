require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { generateIdeasWithChain } = require('./langchain/ideaChain');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() !== '' &&
    process.env.GEMINI_API_KEY.trim() !== 'your_key_here'
  );
  res.json({
    status: 'ok',
    geminiConfigured: hasKey
  });
});

/**
 * POST /api/generate-ideas
 * Body: { topic, audience, niche, tone, length }
 * Returns: { source: "gemini", ideas: [...] } or { source: "fallback", ideas: [] }
 */
app.post('/api/generate-ideas', async (req, res) => {
  const { topic, audience, niche, tone, length } = req.body || {};

  // Input Validation
  if (
    typeof topic !== 'string' || !topic.trim() || topic.trim().length > 60 ||
    typeof audience !== 'string' || !audience.trim() || audience.trim().length > 60
  ) {
    return res.status(400).json({
      error: 'Topic and Audience are required and must each be 60 characters or less.'
    });
  }

  try {
    const ideas = await generateIdeasWithChain({
      topic: topic.trim(),
      audience: audience.trim(),
      niche: niche || 'Fitness',
      tone: tone || 'Casual',
      length: length || 'Shorts'
    });

    if (Array.isArray(ideas) && ideas.length === 10) {
      return res.status(200).json({
        source: 'gemini',
        ideas: ideas
      });
    }

    throw new Error(`Unexpected ideas length: ${ideas?.length}`);
  } catch (err) {
    // Log failure reason to server console
    console.error('[Gemini / LangChain Error]:', err.message);

    // Return 500 with descriptive error so frontend can display it
    return res.status(500).json({
      error: err.message || 'Failed to generate ideas. Please try again.',
      source: 'error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`IdeaForge LangChain Backend running on http://localhost:${PORT}`);
  const hasKey = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() !== '' &&
    process.env.GEMINI_API_KEY.trim() !== 'your_key_here'
  );
  console.log(`Gemini API Key configured: ${hasKey ? 'Yes (Live Gemini Active)' : 'No (Local Fallback Active)'}`);
});
