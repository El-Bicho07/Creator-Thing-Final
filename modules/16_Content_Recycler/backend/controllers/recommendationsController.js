import { PostRepository, UserRepository } from '../db/storage.js';
import { generateRecommendations, analyzePost, calculateCreatorBaseline } from '../services/recommendationEngine.js';

export async function getRecommendations(req, res) {
  try {
    const { type, limit = 50 } = req.query;
    const posts = await PostRepository.find();

    if (!posts || posts.length === 0) {
      return res.json({
        success: true,
        summary: {
          totalAnalyzed: 0,
          counts: { REPOST: 0, REWORK: 0, REPURPOSE: 0, ARCHIVE: 0 },
          baseline: { meanER: 0, stdER: 0, meanReach: 0, meanSaves: 0 },
        },
        recommendations: [],
      });
    }

    // Retrieve user baseline custom weights if available
    let weights = {};
    if (req.user && req.user.id) {
      const user = await UserRepository.findById(req.user.id);
      if (user && user.baselineWeights) weights = user.baselineWeights;
    }

    const { summary, recommendations } = generateRecommendations(posts, weights);

    // Apply type filter if specified (REPOST, REWORK, REPURPOSE, ARCHIVE)
    let filtered = recommendations;
    if (type && type !== 'ALL') {
      filtered = recommendations.filter(r => r.recommendationType === type);
    }

    const limited = filtered.slice(0, parseInt(limit, 10) || 50);

    return res.json({
      success: true,
      summary,
      totalMatches: filtered.length,
      recommendations: limited,
    });
  } catch (error) {
    console.error('[Recommendations Ctrl] getRecommendations error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate content recommendations.' });
  }
}

export async function getPostRecommendationDetail(req, res) {
  try {
    const post = await PostRepository.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const allPosts = await PostRepository.find();
    let weights = {};
    if (req.user && req.user.id) {
      const user = await UserRepository.findById(req.user.id);
      if (user && user.baselineWeights) weights = user.baselineWeights;
    }

    const baseline = calculateCreatorBaseline(allPosts, weights);
    const analysis = analyzePost(post, baseline, weights);

    return res.json({
      success: true,
      post,
      baseline,
      analysis,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to evaluate post recommendation detail.' });
  }
}
