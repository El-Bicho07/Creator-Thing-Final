const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const { classifyBatch } = require('../src/nlpPipeline');

const originalApiKey = process.env.GEMINI_API_KEY;

after(() => {
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
});

test('classifies every comment when the thread exceeds one model batch', async () => {
  process.env.GEMINI_API_KEY = 'your_gemini_api_key_here';
  const comments = Array.from({ length: 61 }, (_, index) => ({
    id: `comment-${index}`,
    text: index % 2 === 0 ? 'How do I get started?' : 'This is wonderful!',
  }));

  const results = await classifyBatch(comments);

  assert.equal(results.length, comments.length);
  assert.deepEqual(results.map(result => result.id), comments.map(comment => comment.id));
});