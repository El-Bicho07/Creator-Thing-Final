require('dotenv').config();
const express = require('express');
const path    = require('path');

const { extractShortcode, fetchCommentsForPost } = require('./linkFetcher');
const { processComment }                          = require('./hustleBot');
const { classifyBatch }                           = require('./nlpPipeline');
const { savePostAnalysis, getAllPosts, getPostByShortcode, getMetricsForPost } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ─────────────────────────────────────────────────────────────
   POST /api/analyze-link
   Body: { url: "https://www.instagram.com/reel/..." }
───────────────────────────────────────────────────────────── */
app.post('/api/analyze-link', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL is required.' });

    const shortcode = extractShortcode(url);
    if (!shortcode) return res.status(400).json({ success: false, error: 'Could not parse a shortcode from that URL. Make sure it is an instagram.com/p/ or instagram.com/reel/ link.' });

    // 1 ── Fetch raw comments (mock or real API)
    const rawComments = await fetchCommentsForPost(shortcode);

    // 2 ── HustleBot: spam filter + emoji translation
    const toClassify = [];   // { id, text (cleaned), raw_text }
    const spamRows   = [];   // already fully formed DB rows

    for (const c of rawComments) {
      const result = processComment(c.text);
      if (result.isSpam) {
        spamRows.push({
          instagram_comment_id: c.id,
          raw_text:    c.text,
          cleaned_text: c.text,
          category:    'Spam',
          sub_category:'Promotional spam',
          sentiment:   'Neutral',
          is_actionable: false,
          prime_for_reel: false,
          summary: result.spamReason || 'Spam detected',
        });
      } else {
        toClassify.push({ id: c.id, text: result.processedText, raw_text: c.text });
      }
    }

    // 3 ── Gemini batch classification
    let classifiedRows = [];
    if (toClassify.length > 0) {
      const batchInput  = toClassify.map(c => ({ id: c.id, text: c.text }));
      const batchResult = await classifyBatch(batchInput);

      // Build a lookup by id for O(1) access
      const resultMap = {};
      if (Array.isArray(batchResult)) {
        batchResult.forEach(r => { if (r && r.id) resultMap[r.id] = r; });
      }

      classifiedRows = toClassify.map(c => {
        const r = resultMap[c.id] || {
          category: 'Uncategorized', subCategory: 'Unknown',
          sentiment: 'Neutral', actionable: false, summary: 'Classification failed',
        };
        const primeForReel = r.category === 'Opportunity' ||
                             (r.category === 'Question' && r.actionable === true);
        return {
          instagram_comment_id: c.id,
          raw_text:    c.raw_text,
          cleaned_text: c.text,
          category:    r.category,
          sub_category: r.subCategory || '',
          sentiment:   r.sentiment   || 'Neutral',
          is_actionable: r.actionable ? 1 : 0,
          prime_for_reel: primeForReel ? 1 : 0,
          summary:     r.summary || '',
        };
      });
    }

    // 4 ── Persist to SQLite
    const allRows = [...classifiedRows, ...spamRows];
    savePostAnalysis({ shortcode, original_url: url, total_comments: allRows.length }, allRows);

    // 5 ── Return response
    const metrics = getMetricsForPost(shortcode);
    res.json({ success: true, shortcode, totalAnalyzed: allRows.length, metrics, comments: allRows });

  } catch (err) {
    console.error('[/api/analyze-link]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/posts  –  list of analysed posts
───────────────────────────────────────────────────────────── */
app.get('/api/posts', (req, res) => {
  try   { res.json(getAllPosts()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/posts/:shortcode/comments
───────────────────────────────────────────────────────────── */
app.get('/api/posts/:shortcode/comments', (req, res) => {
  try   { res.json(getPostByShortcode(req.params.shortcode)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/posts/:shortcode/metrics
───────────────────────────────────────────────────────────── */
app.get('/api/posts/:shortcode/metrics', (req, res) => {
  try   { res.json(getMetricsForPost(req.params.shortcode)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

/* ─── Start ─── */
app.listen(PORT, () => console.log(`✓  Server running → http://localhost:${PORT}`));
module.exports = app;
