import { Readable } from 'stream';
import csvParser from 'csv-parser';

/**
 * Validate and normalize a single parsed CSV row
 */
export function validateAndNormalizeRow(row, existingIds = new Set(), existingCaptions = new Set(), index = 0) {
  const errors = [];
  const warnings = [];

  // Normalize column names (handle case variations and trimmed whitespace)
  const normalizedKeys = {};
  for (const [k, v] of Object.entries(row)) {
    const cleanKey = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    normalizedKeys[cleanKey] = typeof v === 'string' ? v.trim() : v;
  }

  // 1. Caption validation
  const caption = normalizedKeys.caption || normalizedKeys.text || normalizedKeys.postcaption || '';
  if (!caption || caption.length < 3) {
    errors.push('Missing or too short caption (minimum 3 characters)');
  }

  // 2. ID and duplicate check
  let originalId = normalizedKeys.originalid || normalizedKeys.id || normalizedKeys.postid || `CSV_POST_${Date.now()}_${index + 1}`;
  let isDuplicate = false;
  if (existingIds.has(originalId)) {
    isDuplicate = true;
    warnings.push(`Duplicate ID: ${originalId} already exists in database`);
  }
  if (caption && existingCaptions.has(caption.toLowerCase())) {
    isDuplicate = true;
    warnings.push('Identical caption content already found in historical library');
  }

  // 3. Media Type validation
  const rawMediaType = (normalizedKeys.mediatype || normalizedKeys.type || 'IMAGE').toUpperCase();
  const validMediaTypes = ['IMAGE', 'CAROUSEL', 'REEL', 'VIDEO'];
  const mediaType = validMediaTypes.includes(rawMediaType) ? rawMediaType : 'IMAGE';
  if (!validMediaTypes.includes(rawMediaType)) {
    warnings.push(`Unknown media type "${rawMediaType}", defaulted to IMAGE`);
  }

  // 4. Post Date validation
  const rawDate = normalizedKeys.postdate || normalizedKeys.date || normalizedKeys.timestamp || new Date().toISOString();
  let postDate = new Date(rawDate);
  if (isNaN(postDate.getTime())) {
    warnings.push('Unrecognized date format, defaulted to current timestamp');
    postDate = new Date();
  }

  // 5. Numeric metric validation
  const parseNum = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const n = parseInt(String(val).replace(/,/g, ''), 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  };

  const reach = parseNum(normalizedKeys.reach || normalizedKeys.impressions);
  const views = parseNum(normalizedKeys.views || normalizedKeys.video_views || reach);
  const likes = parseNum(normalizedKeys.likes);
  const comments = parseNum(normalizedKeys.comments);
  const shares = parseNum(normalizedKeys.shares);
  const saves = parseNum(normalizedKeys.saves || normalizedKeys.saved);

  // 6. Hashtags validation
  let hashtags = [];
  const rawTags = normalizedKeys.hashtags || normalizedKeys.tags || '';
  if (typeof rawTags === 'string') {
    hashtags = rawTags
      .split(/[,;\s]+/)
      .map(t => t.replace(/^#/, '').trim().toLowerCase())
      .filter(t => t.length > 1);
  }

  const permalink = normalizedKeys.permalink || normalizedKeys.url || `https://instagram.com/p/${originalId.toLowerCase()}`;
  const isSynthetic = normalizedKeys.issynthetic !== undefined 
    ? String(normalizedKeys.issynthetic).toLowerCase() === 'true'
    : false;

  const isValid = errors.length === 0;

  return {
    rowIndex: index + 1,
    isValid,
    isDuplicate,
    errors,
    warnings,
    record: {
      originalId,
      caption,
      mediaType,
      postDate: postDate.toISOString(),
      reach,
      views,
      likes,
      comments,
      shares,
      saves,
      hashtags,
      permalink,
      isSynthetic,
    }
  };
}

/**
 * Stream-parse a CSV buffer or string into validated preview rows
 */
export async function parseInstagramCSV(bufferOrString, existingPosts = []) {
  const existingIds = new Set(existingPosts.map(p => p.originalId).filter(Boolean));
  const existingCaptions = new Set(existingPosts.map(p => p.caption ? p.caption.toLowerCase() : '').filter(Boolean));

  return new Promise((resolve, reject) => {
    const results = [];
    const stream = typeof bufferOrString === 'string'
      ? Readable.from(bufferOrString)
      : Readable.from(bufferOrString.toString('utf-8'));

    let rowIndex = 0;

    stream
      .pipe(csvParser({
        mapHeaders: ({ header }) => header.trim()
      }))
      .on('data', (row) => {
        const validated = validateAndNormalizeRow(row, existingIds, existingCaptions, rowIndex++);
        results.push(validated);
      })
      .on('end', () => {
        const validCount = results.filter(r => r.isValid && !r.isDuplicate).length;
        const duplicateCount = results.filter(r => r.isDuplicate).length;
        const errorCount = results.filter(r => !r.isValid).length;

        resolve({
          totalParsed: results.length,
          validCount,
          duplicateCount,
          errorCount,
          previewRows: results.slice(0, 100), // First 100 rows for preview UI
          allRows: results,
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}
