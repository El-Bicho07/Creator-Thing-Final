/**
 * Extracts the shortcode from an Instagram post/reel URL.
 * Example URLs:
 * https://www.instagram.com/reel/C8XYZabc123/
 * https://www.instagram.com/p/C8XYZabc123/
 * https://www.instagram.com/p/C8XYZabc123/?igshid=abc
 * @param {string} url
 * @returns {string|null} The shortcode or null if not found
 */
function extractShortcode(url) {
  if (!url) return null;
  const regex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Fetches comments for a given Instagram post shortcode.
 * Currently uses a realistic mock generator.
 * Integrations with Instagram Graph API or RapidAPI can be plugged in here.
 * @param {string} shortcode
 * @returns {Promise<Array<Object>>} List of comment objects
 */
async function fetchCommentsForPost(shortcode) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const instagramUserId = process.env.INSTAGRAM_USER_ID;
  const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || 'v23.0';

  if (!accessToken || !instagramUserId) {
    throw new Error('Instagram fetching is not configured. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID for a managed professional account.');
  }

  const baseUrl = `https://graph.facebook.com/${apiVersion}`;
  const firstPageUrl = (edge, fields) => {
    const url = new URL(`${baseUrl}/${edge}`);
    url.searchParams.set('fields', fields);
    url.searchParams.set('limit', '100');
    url.searchParams.set('access_token', accessToken);
    return url;
  };

  const fetchAllPages = async (firstUrl) => {
    const rows = [];
    const visited = new Set();
    let nextUrl = firstUrl.toString();

    while (nextUrl) {
      const url = new URL(nextUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'graph.facebook.com') {
        throw new Error('Instagram Graph API returned an invalid pagination URL.');
      }
      if (visited.has(url.toString())) {
        throw new Error('Instagram Graph API returned a repeated pagination URL.');
      }
      visited.add(url.toString());

      const response = await fetch(url);
      const body = await response.json();
      if (!response.ok || body.error) {
        throw new Error(body.error?.message || `Instagram Graph API request failed (${response.status}).`);
      }

      rows.push(...(body.data || []));
      nextUrl = body.paging?.next || null;
    }

    return rows;
  };

  const media = await fetchAllPages(firstPageUrl(
    `${encodeURIComponent(instagramUserId)}/media`,
    'id,permalink'
  ));
  const matchingMedia = media.find(item => extractShortcode(item.permalink) === shortcode);

  if (!matchingMedia) {
    throw new Error('That post was not found in the connected Instagram account. The Graph API only exposes posts managed by that account.');
  }

  const commentFields = 'id,text,username,timestamp,replies.limit(100){id,text,username,timestamp}';
  const topLevelComments = await fetchAllPages(firstPageUrl(
    `${encodeURIComponent(matchingMedia.id)}/comments`,
    commentFields
  ));

  const comments = [];
  for (const comment of topLevelComments) {
    comments.push({ id: comment.id, user: comment.username || '', text: comment.text || '' });

    const firstReplies = comment.replies?.data || [];
    comments.push(...firstReplies.map(reply => ({
      id: reply.id,
      user: reply.username || '',
      text: reply.text || '',
    })));

    if (comment.replies?.paging?.next) {
      const moreReplies = await fetchAllPages(comment.replies.paging.next);
      comments.push(...moreReplies.map(reply => ({
        id: reply.id,
        user: reply.username || '',
        text: reply.text || '',
      })));
    }
  }

  return comments;
}

module.exports = {
  extractShortcode,
  fetchCommentsForPost
};
