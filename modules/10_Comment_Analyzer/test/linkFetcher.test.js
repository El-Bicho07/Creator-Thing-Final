const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const { fetchCommentsForPost } = require('../src/linkFetcher');

const originalFetch = global.fetch;
const originalEnv = {
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
  userId: process.env.INSTAGRAM_USER_ID,
  apiVersion: process.env.INSTAGRAM_GRAPH_API_VERSION,
};

after(() => {
  global.fetch = originalFetch;
  for (const [key, value] of Object.entries({
    INSTAGRAM_ACCESS_TOKEN: originalEnv.accessToken,
    INSTAGRAM_USER_ID: originalEnv.userId,
    INSTAGRAM_GRAPH_API_VERSION: originalEnv.apiVersion,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('fetches every managed post page, comment page, and reply page', async () => {
  process.env.INSTAGRAM_ACCESS_TOKEN = 'test-token';
  process.env.INSTAGRAM_USER_ID = 'account-1';
  process.env.INSTAGRAM_GRAPH_API_VERSION = 'v23.0';

  const mediaPage2 = 'https://graph.facebook.com/v23.0/account-1/media?after=media-2';
  const commentPage2 = 'https://graph.facebook.com/v23.0/media-1/comments?after=comment-2';
  const replyPage2 = 'https://graph.facebook.com/v23.0/comment-1/replies?after=reply-2';
  const responses = new Map([
    ['/v23.0/account-1/media', {
      data: [{ id: 'other-media', permalink: 'https://www.instagram.com/p/OTHER/' }],
      paging: { next: mediaPage2 },
    }],
    ['/v23.0/account-1/media?after=media-2', {
      data: [{ id: 'media-1', permalink: 'https://www.instagram.com/p/TARGET/' }],
    }],
    ['/v23.0/media-1/comments', {
      data: [{
        id: 'comment-1',
        text: 'first comment',
        username: 'first',
        replies: {
          data: [{ id: 'reply-1', text: 'first reply', username: 'reply-one' }],
          paging: { next: replyPage2 },
        },
      }],
      paging: { next: commentPage2 },
    }],
    ['/v23.0/media-1/comments?after=comment-2', {
      data: [{ id: 'comment-2', text: 'second comment', username: 'second', replies: { data: [] } }],
    }],
    ['/v23.0/comment-1/replies?after=reply-2', {
      data: [{ id: 'reply-2', text: 'second reply', username: 'reply-two' }],
    }],
  ]);
  const requestedPaths = [];

  global.fetch = async url => {
    const parsedUrl = new URL(url);
    const cursor = parsedUrl.searchParams.get('after');
    const response = responses.get(`${parsedUrl.pathname}${cursor ? `?after=${cursor}` : ''}`);
    requestedPaths.push(parsedUrl.pathname);
    assert.ok(response, `Unexpected API request: ${parsedUrl.pathname}${parsedUrl.search}`);
    return { ok: true, status: 200, json: async () => response };
  };

  const comments = await fetchCommentsForPost('TARGET');

  assert.deepEqual(comments.map(comment => comment.id), [
    'comment-1', 'reply-1', 'reply-2', 'comment-2',
  ]);
  assert.deepEqual(requestedPaths, [
    '/v23.0/account-1/media',
    '/v23.0/account-1/media',
    '/v23.0/media-1/comments',
    '/v23.0/media-1/comments',
    '/v23.0/comment-1/replies',
  ]);
});

test('requires Instagram credentials instead of returning demo comments', async () => {
  delete process.env.INSTAGRAM_ACCESS_TOKEN;
  delete process.env.INSTAGRAM_USER_ID;

  await assert.rejects(
    fetchCommentsForPost('TARGET'),
    /INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID/
  );
});