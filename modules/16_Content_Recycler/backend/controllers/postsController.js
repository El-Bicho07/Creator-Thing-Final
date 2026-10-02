import { PostRepository, UserRepository } from '../db/storage.js';
import { syntheticInstagramPosts } from '../data/syntheticPosts.js';
import { calculateEngagementRate, calculateCreatorBaseline } from '../services/recommendationEngine.js';

export async function getPosts(req, res) {
  try {
    const { mediaType, search, sortBy = 'postDate', order = 'desc', limit = 100, page = 1 } = req.query;

    const filter = {};
    if (mediaType && mediaType !== 'ALL') {
      filter.mediaType = mediaType;
    }
    if (search) {
      filter.search = search;
    }

    const sortDir = order === 'asc' ? 1 : -1;
    const posts = await PostRepository.find(filter, { [sortBy]: sortDir });

    // Fetch user baseline weights if authenticated
    let weights = {};
    if (req.user && req.user.id) {
      const user = await UserRepository.findById(req.user.id);
      if (user && user.baselineWeights) {
        weights = user.baselineWeights;
      }
    }

    // Attach calculated engagement rate to each post
    const enriched = posts.map(p => {
      const postObj = p.toObject ? p.toObject() : { ...p };
      return {
        ...postObj,
        calculatedER: calculateEngagementRate(postObj, weights),
      };
    });

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = enriched.slice(startIndex, startIndex + limitNum);

    return res.json({
      success: true,
      total: enriched.length,
      page: pageNum,
      totalPages: Math.ceil(enriched.length / limitNum) || 1,
      posts: paginated,
    });
  } catch (error) {
    console.error('[Posts Ctrl] getPosts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve posts.' });
  }
}

export async function getPostById(req, res) {
  try {
    const post = await PostRepository.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }
    const postObj = post.toObject ? post.toObject() : { ...post };
    postObj.calculatedER = calculateEngagementRate(postObj);
    return res.json({ success: true, post: postObj });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve post details.' });
  }
}

export async function deletePost(req, res) {
  try {
    const deleted = await PostRepository.deleteById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Post not found or already deleted.' });
    }
    return res.json({ success: true, message: 'Post deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete post.' });
  }
}

export async function clearAllPosts(req, res) {
  try {
    await PostRepository.clearAll();
    return res.json({ success: true, message: 'All post records cleared successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to clear posts.' });
  }
}

export async function seedDemoData(req, res) {
  try {
    // Check if posts already exist
    const count = await PostRepository.count();
    if (count > 0 && req.query.force !== 'true') {
      return res.json({
        success: true,
        message: `Library already contains ${count} posts. Use ?force=true to reset.`,
        count,
      });
    }

    if (req.query.force === 'true') {
      await PostRepository.clearAll();
    }

    const inserted = await PostRepository.insertMany(syntheticInstagramPosts);

    return res.status(201).json({
      success: true,
      message: `Successfully seeded ${inserted.length} realistic synthetic Instagram posts for demonstration.`,
      count: inserted.length,
    });
  } catch (error) {
    console.error('[Posts Ctrl] seedDemoData error:', error);
    return res.status(500).json({ success: false, message: 'Failed to seed synthetic posts.' });
  }
}

export async function getDashboardStats(req, res) {
  try {
    const posts = await PostRepository.find();
    
    if (!posts || posts.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalPosts: 0,
          totalReach: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalSaves: 0,
          avgEngagementRate: 0,
          topPerformingPosts: [],
          performanceTimeline: [],
          mediaTypeBreakdown: [],
          recyclingSummary: { repost: 0, rework: 0, repurpose: 0, archive: 0 },
        }
      });
    }

    let weights = {};
    if (req.user && req.user.id) {
      const user = await UserRepository.findById(req.user.id);
      if (user && user.baselineWeights) weights = user.baselineWeights;
    }

    const baseline = calculateCreatorBaseline(posts, weights);

    // Calculate aggregated metrics
    let totalReach = 0;
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalSaves = 0;

    const enriched = posts.map(p => {
      const pObj = p.toObject ? p.toObject() : { ...p };
      totalReach += (pObj.reach || 0);
      totalViews += (pObj.views || 0);
      totalLikes += (pObj.likes || 0);
      totalComments += (pObj.comments || 0);
      totalShares += (pObj.shares || 0);
      totalSaves += (pObj.saves || 0);
      return {
        ...pObj,
        calculatedER: calculateEngagementRate(pObj, weights),
      };
    });

    // Top 5 performing posts by ER
    const topPosts = [...enriched]
      .sort((a, b) => b.calculatedER - a.calculatedER)
      .slice(0, 5)
      .map(p => ({
        id: p.originalId || p._id,
        caption: p.caption,
        mediaType: p.mediaType,
        postDate: p.postDate,
        reach: p.reach,
        likes: p.likes,
        saves: p.saves,
        calculatedER: p.calculatedER,
      }));

    // Performance Timeline: chronological aggregation by month/week for Recharts
    const timelineMap = new Map();
    const sortedChronological = [...enriched].sort((a, b) => new Date(a.postDate) - new Date(b.postDate));

    for (const p of sortedChronological) {
      const date = new Date(p.postDate);
      const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
      if (!timelineMap.has(key)) {
        timelineMap.set(key, {
          date: key,
          reach: 0,
          saves: 0,
          avgER: 0,
          postCount: 0,
          totalER: 0,
        });
      }
      const entry = timelineMap.get(key);
      entry.reach += p.reach || 0;
      entry.saves += p.saves || 0;
      entry.totalER += p.calculatedER;
      entry.postCount += 1;
      entry.avgER = Number((entry.totalER / entry.postCount).toFixed(2));
    }

    const performanceTimeline = Array.from(timelineMap.values()).slice(-15); // latest 15 points

    // Media Type Breakdown
    const mediaCounts = { IMAGE: 0, CAROUSEL: 0, REEL: 0, VIDEO: 0 };
    const mediaReach = { IMAGE: 0, CAROUSEL: 0, REEL: 0, VIDEO: 0 };

    for (const p of enriched) {
      const m = p.mediaType || 'IMAGE';
      mediaCounts[m] = (mediaCounts[m] || 0) + 1;
      mediaReach[m] = (mediaReach[m] || 0) + (p.reach || 0);
    }

    const mediaTypeBreakdown = Object.keys(mediaCounts).map(type => ({
      name: type,
      count: mediaCounts[type],
      totalReach: mediaReach[type],
      avgReach: mediaCounts[type] > 0 ? Math.round(mediaReach[type] / mediaCounts[type]) : 0,
    }));

    return res.json({
      success: true,
      stats: {
        totalPosts: posts.length,
        totalReach,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalSaves,
        avgEngagementRate: baseline.meanER,
        baselineStandardDeviation: baseline.stdER,
        topPerformingPosts: topPosts,
        performanceTimeline,
        mediaTypeBreakdown,
      },
    });
  } catch (error) {
    console.error('[Posts Ctrl] getDashboardStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate dashboard statistics.' });
  }
}
