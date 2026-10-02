/**
 * Explainable Content Recommendation Engine
 * Evaluates historical Instagram post metrics against creator baselines,
 * calculates decay curves and evergreen propensity, and assigns tactical categories:
 * - REPOST: High historical ER + dormant (>60d) + evergreen topic
 * - REWORK: High reach/impressions but underperforming conversion (weak hook/CTA)
 * - REPURPOSE: High-save single image or carousel primed for Reel / Story sequence
 * - ARCHIVE: Ephemeral, time-bound, or persistently low-performing posts
 */

const EVERGREEN_POSITIVE_KEYWORDS = [
  'how to', 'guide', 'cheatsheet', 'cheat sheet', 'roadmap', 'architecture',
  'under the hood', 'step by step', 'tips', 'tricks', 'principles', 'vs',
  'explained', 'mistakes', 'vulnerabilities', 'best practices', 'shortcuts',
  'optimizing', 'deep dive', 'tutorial', 'rules', 'framework', 'normalization'
];

const TIME_BOUND_KEYWORDS = [
  'giveaway', 'sale', 'discount', 'ends tonight', 'tomorrow', 'tonight',
  'live q&a', 'happy independence', 'summit today', 'booth', 'winners announced',
  'flash sale', 'milestone', 'promo code', 'hall 3', 'attending', 'celebrating'
];

/**
 * Calculate post engagement rate with customizable weighting
 */
export function calculateEngagementRate(post, weights = {}) {
  const savesMul = weights.savesMultiplier ?? 2.0;
  const sharesMul = weights.sharesMultiplier ?? 1.5;
  const reach = Math.max(post.reach || 0, 1);
  
  const weightedInteractions = 
    (post.likes || 0) + 
    (post.comments || 0) + 
    ((post.shares || 0) * sharesMul) + 
    ((post.saves || 0) * savesMul);

  return Number(((weightedInteractions / reach) * 100).toFixed(2));
}

/**
 * Calculate creator-wide baseline statistics across all posts
 */
export function calculateCreatorBaseline(posts, weights = {}) {
  if (!posts || posts.length === 0) {
    return {
      totalPosts: 0,
      meanER: 0,
      stdER: 0.1,
      meanReach: 0,
      meanSaves: 0,
      topER: 0,
    };
  }

  const erList = posts.map(p => calculateEngagementRate(p, weights));
  const reachList = posts.map(p => p.reach || 0);
  const savesList = posts.map(p => p.saves || 0);

  const meanER = erList.reduce((acc, v) => acc + v, 0) / erList.length;
  const meanReach = reachList.reduce((acc, v) => acc + v, 0) / reachList.length;
  const meanSaves = savesList.reduce((acc, v) => acc + v, 0) / savesList.length;

  const varianceER = erList.reduce((acc, v) => acc + Math.pow(v - meanER, 2), 0) / erList.length;
  const stdER = Math.max(Math.sqrt(varianceER), 0.5); // avoid division by zero

  const topER = Math.max(...erList);

  return {
    totalPosts: posts.length,
    meanER: Number(meanER.toFixed(2)),
    stdER: Number(stdER.toFixed(2)),
    meanReach: Math.round(meanReach),
    meanSaves: Math.round(meanSaves),
    topER: Number(topER.toFixed(2)),
  };
}

/**
 * Calculate Evergreen Confidence Score based on linguistic markers (0 to 1)
 */
export function evaluateEvergreenScore(caption = '') {
  const text = caption.toLowerCase();
  let score = 0.5; // neutral starting baseline

  for (const kw of EVERGREEN_POSITIVE_KEYWORDS) {
    if (text.includes(kw)) score += 0.12;
  }

  for (const kw of TIME_BOUND_KEYWORDS) {
    if (text.includes(kw)) score -= 0.25;
  }

  return Number(Math.max(0.05, Math.min(1.0, score)).toFixed(2));
}

/**
 * Calculate audience fatigue decay factor (0 to 1)
 * High score (>0.7) means post is old enough that re-sharing won't cause feed fatigue.
 */
export function calculateDecayFactor(postDate, thresholdDays = 60) {
  const now = new Date();
  const created = new Date(postDate);
  const diffDays = Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));

  if (diffDays >= thresholdDays) {
    // Mature content ready for re-introduction
    const bonus = Math.min(0.2, (diffDays - thresholdDays) / 100);
    return { ageDays: diffDays, decayFactor: Number((0.8 + bonus).toFixed(2)), isMature: true };
  } else if (diffDays <= 14) {
    // Recent content: high risk of audience fatigue
    return { ageDays: diffDays, decayFactor: 0.2, isMature: false };
  } else {
    // Moderate age
    const factor = 0.2 + ((diffDays - 14) / (thresholdDays - 14)) * 0.6;
    return { ageDays: diffDays, decayFactor: Number(factor.toFixed(2)), isMature: false };
  }
}

/**
 * Analyze a single post and produce an explainable recommendation
 */
export function analyzePost(post, baseline, weights = {}) {
  const er = calculateEngagementRate(post, weights);
  const zScore = baseline.stdER > 0 ? (er - baseline.meanER) / baseline.stdER : 0;
  const reachRatio = baseline.meanReach > 0 ? (post.reach || 0) / baseline.meanReach : 1;
  const savesRatio = baseline.meanSaves > 0 ? (post.saves || 0) / baseline.meanSaves : 1;

  const thresholdDays = weights.dormantDaysThreshold ?? 60;
  const { ageDays, decayFactor, isMature } = calculateDecayFactor(post.postDate, thresholdDays);
  const evergreenScore = evaluateEvergreenScore(post.caption);

  // Scoring sub-components (0 to 100 scale)
  const performanceScore = Math.min(100, Math.max(0, Math.round(50 + zScore * 25)));
  const reusabilityScore = Math.round(decayFactor * 100);
  const evergreenPct = Math.round(evergreenScore * 100);
  
  // Format potential score: Single Image or Carousel with high saves has huge Reel/Carousel repurpose value
  let formatScore = 50;
  if (post.mediaType === 'IMAGE' && savesRatio >= 1.0) formatScore = 90;
  else if (post.mediaType === 'CAROUSEL' && savesRatio >= 1.1) formatScore = 85;
  else if (post.mediaType === 'REEL' && reachRatio >= 1.2) formatScore = 80;

  // Strategic Classification Logic
  let type = 'ARCHIVE';
  let primaryReason = '';
  let tacticalAdvice = '';
  let targetFormat = post.mediaType;

  // 1. REPOST Candidate: High ER, Mature age, Evergreen topic
  if (zScore >= 0.35 && isMature && evergreenScore >= 0.55) {
    type = 'REPOST';
    targetFormat = post.mediaType;
    primaryReason = `Top-tier historical performer (${er}% ER, +${zScore.toFixed(1)}σ above baseline). Dormant for ${ageDays} days with 0% feed fatigue. High evergreen score (${evergreenPct}%).`;
    tacticalAdvice = `Re-publish directly or with minor caption modernization. Your new followers over the last ${ageDays} days haven't seen this high-value asset.`;
  }
  // 2. REWORK Candidate: High Reach, but below-average conversion (weak hook/CTA)
  else if (reachRatio >= 1.05 && zScore < 0.1 && evergreenScore >= 0.45) {
    type = 'REWORK';
    targetFormat = post.mediaType === 'REEL' ? 'REEL' : 'CAROUSEL';
    primaryReason = `High algorithmic distribution (${(post.reach || 0).toLocaleString()} reach, ${(reachRatio * 100).toFixed(0)}% of baseline), but engagement conversion lagged at ${er}%.`;
    tacticalAdvice = `The topic drew eyeballs but audience didn't save or comment. Rewrite the first 3-second hook, improve slide 2 pacing, and replace the CTA with a specific bookmark prompt.`;
  }
  // 3. REPURPOSE Candidate: High bookmarks/saves on static format or ripe for format conversion
  else if (savesRatio >= 0.95 && (post.mediaType === 'IMAGE' || post.mediaType === 'CAROUSEL')) {
    type = 'REPURPOSE';
    targetFormat = post.mediaType === 'IMAGE' ? 'REEL' : 'CAROUSEL';
    primaryReason = `High bookmark density (${(post.saves || 0).toLocaleString()} saves, ${(savesRatio * 100).toFixed(0)}% of average) indicates valuable reference content locked in a static ${post.mediaType}.`;
    tacticalAdvice = `Repurpose this into a fast-paced 30s Reel with voiceover or a 7-slide educational Carousel breakdown to capture fresh algorithm momentum.`;
  }
  // 4. ARCHIVE Candidate: Time-bound or persistently low response
  else {
    targetFormat = post.mediaType;
    if (evergreenScore < 0.4) {
      primaryReason = `Time-sensitive or event-specific post (${evergreenPct}% evergreen rating). Not suitable for recycling without misleading audience.`;
      tacticalAdvice = `Archive or keep as historical portfolio. Do not re-circulate expired discounts, dated announcements, or seasonal posts.`;
    } else {
      primaryReason = `Underperformed creator baseline (${er}% ER, ${zScore.toFixed(1)}σ vs baseline). Minimal bookmark or share interest.`;
      tacticalAdvice = `Retire from active recycling queue. Review audience feedback to see if the core premise should be entirely reimagined.`;
    }
  }

  // Composite Opportunity Index (0 to 100)
  const compositeScore = Math.min(100, Math.max(10, Math.round(
    performanceScore * 0.35 +
    reusabilityScore * 0.25 +
    evergreenPct * 0.25 +
    formatScore * 0.15
  )));

  return {
    postId: post.originalId || post._id,
    recommendationType: type,
    compositeScore,
    targetFormat,
    metrics: {
      calculatedER: er,
      zScore: Number(zScore.toFixed(2)),
      reachRatio: Number(reachRatio.toFixed(2)),
      savesRatio: Number(savesRatio.toFixed(2)),
      ageDays,
      isMature,
    },
    breakdown: {
      performanceScore,
      reusabilityScore,
      evergreenConfidence: evergreenPct,
      formatPotentialScore: formatScore,
    },
    explainability: {
      primaryReason,
      tacticalAdvice,
    }
  };
}

/**
 * Generate full recommendation analysis for a list of posts
 */
export function generateRecommendations(posts, weights = {}) {
  const baseline = calculateCreatorBaseline(posts, weights);
  
  const recommendations = posts.map(p => {
    const analysis = analyzePost(p, baseline, weights);
    return {
      post: p,
      ...analysis,
    };
  });

  // Sort by composite score descending
  recommendations.sort((a, b) => b.compositeScore - a.compositeScore);

  const summary = {
    totalAnalyzed: posts.length,
    counts: {
      REPOST: recommendations.filter(r => r.recommendationType === 'REPOST').length,
      REWORK: recommendations.filter(r => r.recommendationType === 'REWORK').length,
      REPURPOSE: recommendations.filter(r => r.recommendationType === 'REPURPOSE').length,
      ARCHIVE: recommendations.filter(r => r.recommendationType === 'ARCHIVE').length,
    },
    baseline,
  };

  return { summary, recommendations };
}
