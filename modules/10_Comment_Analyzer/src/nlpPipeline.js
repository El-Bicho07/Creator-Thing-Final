const { GoogleGenAI } = require('@google/genai');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const CLASSIFICATION_BATCH_SIZE = 25;

/**
 * Smart mock classifier — uses keyword heuristics so demo data
 * shows real variety (Questions, Complaints, Opportunities, Themes).
 */
function mockClassify(id, text) {
  const t = text.toLowerCase();

  // Opportunity signals
  if (/(partner|collab|brand|agency|client|sponsor|commercial|shoot|rate|pricing|send you|reach out|dm us)/i.test(t)) {
    return { id, category: 'Opportunity', subCategory: 'Partnership / Brand Collab', sentiment: 'Positive', actionable: true, summary: 'Potential business opportunity or brand partnership.' };
  }
  // Question signals
  if (/\?|what|how|where|when|which|can you|do you|tutorial|explain|tell me|software|app|preset|plugin/i.test(t)) {
    return { id, category: 'Question', subCategory: 'How-to / Software Query', sentiment: 'Neutral', actionable: true, summary: 'User is asking a specific question that deserves a reply.' };
  }
  // Complaint signals
  if (/(broken|bug|crash|glitch|out of sync|not working|terrible|disappointed|ripoff|boring|fix|please fix|hard to watch|bad|worst|hate)/i.test(t)) {
    return { id, category: 'Complaint', subCategory: 'Quality / Bug Report', sentiment: 'Negative', actionable: true, summary: 'User expressing dissatisfaction or reporting an issue.' };
  }
  // Default → Theme
  return { id, category: 'Theme', subCategory: 'General Praise / Hype', sentiment: 'Positive', actionable: false, summary: 'Positive general comment about the content.' };
}

/**
 * Classify a single comment — uses Gemini if key present, smart mock otherwise.
 */
async function classifyComment(commentText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    const r = mockClassify('_', commentText);
    return { category: r.category, subCategory: r.subCategory, sentiment: r.sentiment, actionable: r.actionable, summary: r.summary };
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are an expert social media NLP analysis bot. Categorize the following user comment into EXACTLY ONE primary category:
1. "Theme" – general statements, opinions, praise, hype
2. "Question" – requests for info, how-tos, pricing, tutorials
3. "Complaint" – negative feedback, bugs, dissatisfaction
4. "Opportunity" – brand deals, partnership leads, intent to buy

Return JSON only:
{ "category": "Theme|Question|Complaint|Opportunity", "subCategory": "...", "sentiment": "Positive|Neutral|Negative", "actionable": true|false, "summary": "..." }

Comment: "${commentText}"`;

  let delay = 1500;
  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      const resp = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(resp.text);
    } catch (err) {
      if (attempt === 3) return { category: 'Uncategorized', subCategory: 'Unknown', sentiment: 'Neutral', actionable: false, summary: 'Pending retry' };
      await sleep(delay); delay *= 2;
    }
  }
}

/**
 * Batch classify — uses Gemini if key present, smart mock otherwise.
 */
async function classifyBatch(commentsArray) {
  if (!commentsArray || commentsArray.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return commentsArray.map(c => mockClassify(c.id, c.text));
  }

  const ai = new GoogleGenAI({ apiKey });
  const classifiedComments = [];

  for (let start = 0; start < commentsArray.length; start += CLASSIFICATION_BATCH_SIZE) {
    const batch = commentsArray.slice(start, start + CLASSIFICATION_BATCH_SIZE);
    const prompt = `You are an expert social media NLP analysis bot. Categorize EACH comment in the JSON array below.
Categories:
1. "Theme" – general statements, opinions, praise, hype
2. "Question" – requests for info, how-tos, pricing, tutorials
3. "Complaint" – negative feedback, bugs, dissatisfaction
4. "Opportunity" – brand deals, partnership leads, intent to buy

Return a JSON array matching each input object, adding these fields:
{ "id": "...", "category": "...", "subCategory": "...", "sentiment": "Positive|Neutral|Negative", "actionable": true|false, "summary": "..." }

Comments:
${JSON.stringify(batch)}`;

    let delay = 1500;
    let batchResult;
    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        const resp = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
        batchResult = JSON.parse(resp.text);
        if (!Array.isArray(batchResult)) throw new Error('Gemini returned a non-array classification result.');
        break;
      } catch (err) {
        if (attempt === 3) {
          console.error('Gemini batch failed after 3 retries:', err.message);
          batchResult = batch.map(c => mockClassify(c.id, c.text));
          break;
        }
        console.warn(`[NLP] Retry ${attempt + 1} in ${delay}ms…`);
        await sleep(delay);
        delay *= 2;
      }
    }

    classifiedComments.push(...batchResult);
  }

  return classifiedComments;
}

module.exports = { classifyComment, classifyBatch };
