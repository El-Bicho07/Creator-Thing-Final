const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'comments.db');
const db = new Database(dbPath);

// Create the schema
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    shortcode TEXT PRIMARY KEY,
    original_url TEXT,
    total_comments INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instagram_comment_id TEXT UNIQUE,
    post_shortcode TEXT,
    raw_text TEXT,
    cleaned_text TEXT,
    category TEXT,
    sub_category TEXT,
    sentiment TEXT,
    is_actionable INTEGER,
    prime_for_reel INTEGER,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_shortcode) REFERENCES posts(shortcode)
  );
`);

/**
 * Saves a new post analysis and its comments.
 * @param {Object} postData { shortcode, original_url, total_comments }
 * @param {Array<Object>} commentsList
 */
function savePostAnalysis(postData, commentsList) {
  const insertPost = db.prepare(`
    INSERT INTO posts (shortcode, original_url, total_comments)
    VALUES (?, ?, ?)
    ON CONFLICT(shortcode) DO UPDATE SET
      original_url = excluded.original_url,
      total_comments = excluded.total_comments
  `);

  const deleteComments = db.prepare('DELETE FROM comments WHERE post_shortcode = ?');

  const insertComment = db.prepare(`
    INSERT OR REPLACE INTO comments (
      instagram_comment_id, post_shortcode, raw_text, cleaned_text, category, sub_category, sentiment, is_actionable, prime_for_reel, summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((post, comments) => {
    insertPost.run(post.shortcode, post.original_url, post.total_comments);
    deleteComments.run(post.shortcode);

    for (const data of comments) {
      insertComment.run(
        data.instagram_comment_id,
        post.shortcode,
        data.raw_text,
        data.cleaned_text,
        data.category,
        data.sub_category,
        data.sentiment,
        data.is_actionable ? 1 : 0,
        data.prime_for_reel ? 1 : 0,
        data.summary
      );
    }
  });

  transaction(postData, commentsList);
}

/**
 * Retrieves all analyzed posts.
 */
function getAllPosts() {
  return db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
}

/**
 * Retrieves comments for a specific post.
 * @param {string} shortcode
 */
function getPostByShortcode(shortcode) {
  return db.prepare('SELECT * FROM comments WHERE post_shortcode = ? ORDER BY created_at DESC').all(shortcode);
}

/**
 * Retrieves counts for the dashboard metric strip for a specific post.
 * @param {string} shortcode
 */
function getMetricsForPost(shortcode) {
  const totalProcessed = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_shortcode = ?').get(shortcode).count;
  const actionableQuestions = db.prepare("SELECT COUNT(*) as count FROM comments WHERE post_shortcode = ? AND category = 'Question' AND is_actionable = 1").get(shortcode).count;
  const priorityComplaints = db.prepare("SELECT COUNT(*) as count FROM comments WHERE post_shortcode = ? AND category = 'Complaint'").get(shortcode).count;
  const contentLeads = db.prepare("SELECT COUNT(*) as count FROM comments WHERE post_shortcode = ? AND category = 'Opportunity'").get(shortcode).count;
  const primeForReel = db.prepare("SELECT COUNT(*) as count FROM comments WHERE post_shortcode = ? AND prime_for_reel = 1").get(shortcode).count;

  return {
    totalProcessed,
    actionableQuestions,
    priorityComplaints,
    contentLeads,
    primeForReel
  };
}

module.exports = {
  db,
  savePostAnalysis,
  getAllPosts,
  getPostByShortcode,
  getMetricsForPost
};
