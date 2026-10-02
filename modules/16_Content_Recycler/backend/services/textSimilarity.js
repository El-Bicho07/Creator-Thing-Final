/**
 * Lightweight Zero-Cost NLP Similarity Engine (TF-IDF & Cosine Similarity)
 * Identifies thematic overlaps in Instagram captions and hashtags,
 * forming high-synergy multi-post clusters for Carousels, Megathreads, or Reel series.
 */

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'all', 'also', 'am', 'an', 'and', 'any', 'are', 'aren\'t',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'cannot', 'could', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her',
  'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isn\'t',
  'it', 'its', 'itself', 'let', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of',
  'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'out', 'over', 'own', 'same',
  'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  // Social media specific noise words
  'link', 'bio', 'comment', 'comments', 'swipe', 'left', 'check', 'save', 'bookmark', 'drop',
  'share', 'follow', 'post', 'tonight', 'tomorrow', 'yesterday', 'don\'t', 'won\'t', 'here\'s',
  'think', 'favorite', 'probably', 'like', 'come', 'hope', 'happy', 'thank', 'today', 'say'
]);

/**
 * Basic algorithmic stemmer for English words
 */
function stemWord(word) {
  if (word.length <= 3) return word;
  
  if (word.endsWith('ing')) return word.slice(0, -3);
  if (word.endsWith('tion')) return word.slice(0, -4);
  if (word.endsWith('ment')) return word.slice(0, -4);
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es')) return word.slice(0, -2);
  if (word.endsWith('ed')) return word.slice(0, -2);
  if (word.endsWith('ly')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/**
 * Preprocess caption and hashtags into normalized token stream
 */
export function preprocessText(caption = '', hashtags = []) {
  // Combine caption and hashtags
  const tagsText = Array.isArray(hashtags) ? hashtags.join(' ') : String(hashtags || '');
  const combined = `${caption} ${tagsText}`.toLowerCase();

  // Strip URLs and special characters
  const clean = combined
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawTokens = clean.split(' ');
  const tokens = [];

  for (const raw of rawTokens) {
    if (!raw || raw.length < 3 || STOP_WORDS.has(raw)) continue;
    const stemmed = stemWord(raw);
    if (!STOP_WORDS.has(stemmed) && stemmed.length >= 3) {
      tokens.push(stemmed);
    }
  }

  return tokens;
}

/**
 * Compute Term Frequency (TF) for a token list
 */
function computeTF(tokens) {
  const tf = new Map();
  if (tokens.length === 0) return tf;

  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  const length = tokens.length;
  for (const [token, count] of tf.entries()) {
    tf.set(token, count / length);
  }

  return tf;
}

/**
 * Compute Inverse Document Frequency (IDF) across all posts
 */
function computeIDF(documentsTokens) {
  const idf = new Map();
  const N = documentsTokens.length;

  for (const tokens of documentsTokens) {
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      idf.set(token, (idf.get(token) || 0) + 1);
    }
  }

  for (const [token, docCount] of idf.entries()) {
    // Smoothed logarithmic IDF
    idf.set(token, Math.log(1 + N / (1 + docCount)));
  }

  return idf;
}

/**
 * Compute Cosine Similarity between two TF-IDF maps
 */
function computeCosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const val of vecA.values()) {
    normA += val * val;
  }
  for (const val of vecB.values()) {
    normB += val * val;
  }

  if (normA === 0 || normB === 0) return 0;

  // Dot product over shared terms
  for (const [term, valA] of vecA.entries()) {
    const valB = vecB.get(term);
    if (valB) {
      dotProduct += valA * valB;
    }
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Analyze all posts, calculate pairwise cosine similarity and extract clusters
 */
export function analyzeContentSimilarity(posts, similarityThreshold = 0.28) {
  if (!posts || posts.length === 0) {
    return { clusters: [], similarityPairs: [] };
  }

  // 1. Preprocess all posts
  const docsTokens = posts.map(p => preprocessText(p.caption, p.hashtags));
  const idf = computeIDF(docsTokens);

  // 2. Build TF-IDF vectors
  const tfidfVectors = docsTokens.map((tokens, idx) => {
    const tf = computeTF(tokens);
    const vector = new Map();
    for (const [term, tfVal] of tf.entries()) {
      const idfVal = idf.get(term) || 0.1;
      vector.set(term, tfVal * idfVal);
    }
    return {
      postIndex: idx,
      post: posts[idx],
      vector,
      tokens: new Set(tokens),
    };
  });

  // 3. Compute pairwise similarities
  const pairs = [];
  const n = tfidfVectors.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = computeCosineSimilarity(tfidfVectors[i].vector, tfidfVectors[j].vector);
      if (sim >= similarityThreshold) {
        // Find top shared terms
        const sharedTerms = [];
        for (const term of tfidfVectors[i].tokens) {
          if (tfidfVectors[j].tokens.has(term)) {
            sharedTerms.push(term);
          }
        }

        pairs.push({
          postA: {
            id: tfidfVectors[i].post.originalId || tfidfVectors[i].post._id,
            caption: tfidfVectors[i].post.caption,
            mediaType: tfidfVectors[i].post.mediaType,
            reach: tfidfVectors[i].post.reach,
            saves: tfidfVectors[i].post.saves,
          },
          postB: {
            id: tfidfVectors[j].post.originalId || tfidfVectors[j].post._id,
            caption: tfidfVectors[j].post.caption,
            mediaType: tfidfVectors[j].post.mediaType,
            reach: tfidfVectors[j].post.reach,
            saves: tfidfVectors[j].post.saves,
          },
          similarityScore: Number(sim.toFixed(3)),
          similarityPercentage: Math.round(sim * 100),
          sharedKeywords: sharedTerms.slice(0, 5),
          repurposingSuggestion: generateRepurposeIdea(tfidfVectors[i].post, tfidfVectors[j].post, sharedTerms),
        });
      }
    }
  }

  // Sort pairs by highest similarity
  pairs.sort((a, b) => b.similarityScore - a.similarityScore);

  // 4. Form thematic clusters using graph connected components / greedy grouping
  const clusters = buildThematicClusters(tfidfVectors, pairs);

  return {
    totalPairsFound: pairs.length,
    totalClustersFound: clusters.length,
    clusters,
    topPairs: pairs.slice(0, 20),
  };
}

/**
 * Generate tactical repackaging prompt based on media types and overlap
 */
function generateRepurposeIdea(postA, postB, sharedTerms) {
  const keywords = sharedTerms.slice(0, 3).join(', ');
  
  if (postA.mediaType === 'IMAGE' && postB.mediaType === 'IMAGE') {
    return `Combine both single-image concepts into a unified 8-slide deep-dive Carousel focusing on "${keywords}".`;
  }
  if (postA.mediaType === 'CAROUSEL' && postB.mediaType === 'REEL') {
    return `Create a high-energy Reel using the carousel's step-by-step structure as the visual outline with focus on "${keywords}".`;
  }
  if (postA.mediaType === 'CAROUSEL' && postB.mediaType === 'CAROUSEL') {
    return `Synthesize these two high-performing carousels into a comprehensive 2026 Masterclass Guide on "${keywords}".`;
  }
  return `Remix these complementary posts into a side-by-side comparison Reel or multi-slide case study on "${keywords}".`;
}

/**
 * Group connected similar posts into thematic clusters
 */
function buildThematicClusters(vectors, pairs) {
  const adjacency = new Map();
  for (let i = 0; i < vectors.length; i++) {
    adjacency.set(i, []);
  }

  for (const pair of pairs) {
    const idxA = vectors.findIndex(v => (v.post.originalId || v.post._id) === pair.postA.id);
    const idxB = vectors.findIndex(v => (v.post.originalId || v.post._id) === pair.postB.id);
    if (idxA !== -1 && idxB !== -1) {
      adjacency.get(idxA).push({ target: idxB, sim: pair.similarityScore, terms: pair.sharedKeywords });
      adjacency.get(idxB).push({ target: idxA, sim: pair.similarityScore, terms: pair.sharedKeywords });
    }
  }

  const visited = new Set();
  const clusters = [];

  for (let i = 0; i < vectors.length; i++) {
    if (visited.has(i)) continue;
    const neighbors = adjacency.get(i);
    if (neighbors.length === 0) continue;

    // Component BFS
    const group = [i];
    visited.add(i);
    const queue = [i];
    const clusterKeywords = new Set();

    while (queue.length > 0) {
      const curr = queue.shift();
      for (const edge of adjacency.get(curr)) {
        edge.terms.forEach(t => clusterKeywords.add(t));
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          group.push(edge.target);
          queue.push(edge.target);
        }
      }
    }

    if (group.length >= 2) {
      const memberPosts = group.map(idx => vectors[idx].post);
      const totalSaves = memberPosts.reduce((acc, p) => acc + (p.saves || 0), 0);
      const totalReach = memberPosts.reduce((acc, p) => acc + (p.reach || 0), 0);
      const keywordsArray = Array.from(clusterKeywords).slice(0, 6);

      const title = keywordsArray.length > 0 
        ? `${keywordsArray.slice(0, 3).map(k => k.toUpperCase()).join(' & ')} SYNERGY BUNDLE`
        : `CONTENT RECYCLING CLUSTER #${clusters.length + 1}`;

      clusters.push({
        clusterId: `cluster_${clusters.length + 1}`,
        title,
        postCount: memberPosts.length,
        keywords: keywordsArray,
        aggregateReach: totalReach,
        aggregateSaves: totalSaves,
        suggestedFormat: memberPosts.length >= 3 ? '10-SLIDE MEGA CAROUSEL' : 'SPLIT REEL & CAROUSEL PACK',
        strategicRationale: `These ${memberPosts.length} posts address overlapping concepts (${keywordsArray.slice(0, 3).join(', ')}). Combining their cumulative historical reach (${totalReach.toLocaleString()}) into one updated asset maximizes reach with zero content ideation overhead.`,
        posts: memberPosts.map(p => ({
          id: p.originalId || p._id,
          caption: p.caption,
          mediaType: p.mediaType,
          postDate: p.postDate,
          reach: p.reach,
          saves: p.saves,
          likes: p.likes,
        })),
      });
    }
  }

  // Sort clusters by post count and total reach
  clusters.sort((a, b) => b.aggregateReach - a.aggregateReach);
  return clusters;
}
