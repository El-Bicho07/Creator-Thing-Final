import { PostRepository } from '../db/storage.js';
import { analyzeContentSimilarity, preprocessText } from '../services/textSimilarity.js';

export async function getSimilarityAnalysis(req, res) {
  try {
    const threshold = parseFloat(req.query.threshold) || 0.28;
    const posts = await PostRepository.find();

    if (!posts || posts.length === 0) {
      return res.json({
        success: true,
        totalPairsFound: 0,
        totalClustersFound: 0,
        clusters: [],
        topPairs: [],
      });
    }

    const result = analyzeContentSimilarity(posts, threshold);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Similarity Ctrl] getSimilarityAnalysis error:', error);
    return res.status(500).json({ success: false, message: 'Failed to compute content similarity matrix.' });
  }
}

export async function findSimilarToPost(req, res) {
  try {
    const targetPost = await PostRepository.findById(req.params.id);
    if (!targetPost) {
      return res.status(404).json({ success: false, message: 'Target post not found.' });
    }

    const posts = await PostRepository.find();
    const result = analyzeContentSimilarity(posts, 0.20);

    const targetId = targetPost.originalId || targetPost._id;
    const matchingPairs = result.topPairs.filter(p => p.postA.id === targetId || p.postB.id === targetId);

    return res.json({
      success: true,
      targetPost,
      similarPosts: matchingPairs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to search similar posts.' });
  }
}
