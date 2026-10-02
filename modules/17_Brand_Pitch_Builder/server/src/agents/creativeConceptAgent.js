const { invokeLangChain } = require('./agentHelpers');

/**
 * Deterministic fallback for Creative Concept Agent
 */
function getCreativeConceptsFallback({ profile, brandInfo, tone = 'professional' }) {
  const brandName = brandInfo.brandName || 'Brand';
  const goal = brandInfo.goal || brandInfo.campaignGoals || 'Brand Awareness';

  return {
    collaborationConcepts: {
      title: "Tailored Content Concepts",
      concepts: [
        {
          conceptNumber: 1,
          title: `The Authentic Integration: Spotlight on ${brandName}`,
          format: "Dedicated Short-form Video (Reel / TikTok / Short)",
          hook: `"Here is why I've been loving ${brandName} lately..."`,
          narrative: `Organic introduction of ${brandName} within a natural daily workflow or tutorial, focusing directly on driving ${goal.toLowerCase()}.`,
          callToAction: `Direct CTA to visit ${brandInfo.websiteUrl || brandName} via link in bio / description.`
        },
        {
          conceptNumber: 2,
          title: `Problem-Solution Routine Integration`,
          format: "Multi-Frame Story Series or Carousel",
          hook: `"The easiest way to solve [key challenge] using ${brandName}."`,
          narrative: `Step-by-step breakdown demonstrating practical utility and highlighting key product benefits.`,
          callToAction: `Swipe up / Link sticker to claim special introductory offer.`
        },
        {
          conceptNumber: 3,
          title: `Q&A & Community Review`,
          format: "Interactive Community Post + Story Highlight",
          hook: `"Answering your most common questions about ${brandName}."`,
          narrative: `Honest, transparent evaluation answering common user questions, building high trust and conversions.`,
          callToAction: `Exclusive partner link pinned in comments.`
        }
      ]
    }
  };
}

/**
 * Creative Concept Strategist Agent
 * Generates 3 bespoke, high-converting content angles with hooks and CTAs.
 */
async function runCreativeConceptAgent({ profile, brandInfo, tone = 'professional' }) {
  const systemPrompt = `You are the Creative Concept Strategist Agent in a multi-agent creator partnership system.
Your role is to formulate 3 innovative, high-impact content concepts tailored to the creator's niche and the sponsor brand.

STRICT CONSTRAINTS:
1. NO FABRICATED DATA: Do not invent follower metrics or clickthrough guarantees.
2. CREATIVE QUALITY: Provide punchy, viral-ready opening hooks (first 3 seconds), clear narrative arcs, and distinct calls-to-action for each concept.
3. OUTPUT FORMAT: Return ONLY a raw JSON object matching the exact structure requested, with NO markdown backticks or commentary.`;

  const userPrompt = `Creator:
- Name: ${profile.name || 'Creator'}
- Channel/Handle: ${profile.socialLink || profile.handle || '[Your social handle]'}
- Niche: ${profile.niche || 'General'}

Brand:
- Name: ${brandInfo.brandName}
- Website: ${brandInfo.websiteUrl || 'Not specified'}
- Goal: ${brandInfo.goal || brandInfo.campaignGoals || 'Brand Awareness'}
- Notes: ${brandInfo.notes || 'None'}

Tone: ${tone}

Required JSON structure:
{
  "collaborationConcepts": {
    "title": "Tailored Content Concepts",
    "concepts": [
      {
        "conceptNumber": 1,
        "title": "Clear, appealing title for Concept 1",
        "format": "e.g. Dedicated Reel / YouTube Video / TikTok",
        "hook": "Attention-grabbing opening hook line",
        "narrative": "Step-by-step storyline and natural integration of the brand",
        "callToAction": "Clear action for viewer"
      },
      {
        "conceptNumber": 2,
        "title": "Concept 2 Title",
        "format": "e.g. Carousel Guide / Story Sequence",
        "hook": "Opening hook",
        "narrative": "Storyline and benefit demonstration",
        "callToAction": "Clear action for viewer"
      },
      {
        "conceptNumber": 3,
        "title": "Concept 3 Title",
        "format": "e.g. Problem-Solution Showcase",
        "hook": "Opening hook",
        "narrative": "Storyline and real-world results",
        "callToAction": "Clear action for viewer"
      }
    ]
  }
}`;

  try {
    const result = await invokeLangChain(systemPrompt, userPrompt);
    if (!result.collaborationConcepts || !Array.isArray(result.collaborationConcepts.concepts)) {
      throw new Error("Invalid output structure from Creative Concept Agent");
    }
    return result;
  } catch (err) {
    console.warn(`[CreativeConceptAgent] LangChain invocation failed (${err.message}). Retrying once...`);
    try {
      return await invokeLangChain(systemPrompt, userPrompt);
    } catch (retryErr) {
      console.warn(`[CreativeConceptAgent] Retry failed (${retryErr.message}). Using fallback creative concepts.`);
      return getCreativeConceptsFallback({ profile, brandInfo, tone });
    }
  }
}

module.exports = {
  runCreativeConceptAgent,
  getCreativeConceptsFallback
};
