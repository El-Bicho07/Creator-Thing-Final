const { invokeLangChain } = require('./agentHelpers');

/**
 * Deterministic fallback for Brand Intelligence Agent
 */
function getBrandIntelligenceFallback({ profile, brandInfo, tone = 'professional' }) {
  const creatorName = profile.name || 'Creator';
  const niche = profile.niche || 'Content Creation';
  const brandName = brandInfo.brandName || 'Brand';
  const goal = brandInfo.goal || brandInfo.campaignGoals || 'Brand Awareness';
  const socialHandle = profile.socialLink || profile.handle || '[Your social handle]';

  return {
    subjectLines: [
      {
        type: "Curiosity Hook",
        text: `Collaboration Idea: ${creatorName} x ${brandName}`
      },
      {
        type: "Value-First",
        text: `${creatorName} x ${brandName}: Tailored ${goal} Partnership Proposal`
      },
      {
        type: "Direct & Personal",
        text: `Partnership Inquiry: ${creatorName} (${niche}) x ${brandName}`
      }
    ],
    alignmentScore: 92,
    alignmentSummary: `Strong alignment between ${creatorName}'s authentic audience in ${niche} and ${brandName}'s focus on ${goal.toLowerCase()}. Target audience affinity: [AI-suggested, please verify: ideal demographic fit for ${niche} enthusiasts].`,
    alignmentAnalysis: {
      title: "Audience & Brand Alignment Analysis",
      text: `Successful brand collaborations rely on natural synergy between creator content and brand credibility. ${brandName}'s mission fits naturally with the community built on ${socialHandle}.\n\nKey synergy points:`,
      keyOverlapPoints: [
        `Audience Demographics: [AI-suggested, please verify: Engaged followers interested in ${niche} with strong purchasing intent].`,
        `High-Trust Content: Followers look to ${creatorName} for authentic advice rather than passive promotion.`,
        `Campaign Focus: Content directly engineered to support ${brandName}'s core target of ${goal.toLowerCase()}.`
      ]
    }
  };
}

/**
 * Brand & Alignment Intelligence Agent
 * Generates subject lines, alignment score, and alignment analysis.
 */
async function runBrandIntelligenceAgent({ profile, brandInfo, tone = 'professional' }) {
  const systemPrompt = `You are the Brand & Alignment Intelligence Agent in a multi-agent creator partnership system.
Your role is to analyze the synergy between a content creator and a prospective brand sponsor, crafting high-converting subject lines and a strategic alignment analysis.

STRICT CONSTRAINTS:
1. NO FABRICATED DATA: Never invent follower counts, engagement numbers, or prices. If a metric is not supplied, use placeholders like [Your follower count].
2. AI ASSUMPTIONS: If you make an assumption about the brand's audience or product features, label it clearly with '[AI-suggested, please verify]'.
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
  "subjectLines": [
    { "type": "Curiosity Hook", "text": "Curiosity hook subject line" },
    { "type": "Value-First", "text": "Value and outcome focused subject line" },
    { "type": "Direct & Personal", "text": "Direct partnership subject line" }
  ],
  "alignmentScore": 94,
  "alignmentSummary": "2-3 sentences explaining the strategic match and shared values.",
  "alignmentAnalysis": {
    "title": "Audience & Brand Alignment Analysis",
    "text": "Detailed analysis explaining why this brand and creator fit naturally together.",
    "keyOverlapPoints": [
      "Point 1 highlighting audience demographic match",
      "Point 2 highlighting creator authority and trust",
      "Point 3 connecting creator niche to the brand's campaign goal"
    ]
  }
}`;

  try {
    const result = await invokeLangChain(systemPrompt, userPrompt);
    if (!result.subjectLines || !result.alignmentAnalysis) {
      throw new Error("Invalid output structure from Brand Intelligence Agent");
    }
    return result;
  } catch (err) {
    console.warn(`[BrandIntelligenceAgent] LangChain invocation failed (${err.message}). Retrying once...`);
    try {
      return await invokeLangChain(systemPrompt, userPrompt);
    } catch (retryErr) {
      console.warn(`[BrandIntelligenceAgent] Retry failed (${retryErr.message}). Using fallback brand intelligence.`);
      return getBrandIntelligenceFallback({ profile, brandInfo, tone });
    }
  }
}

module.exports = {
  runBrandIntelligenceAgent,
  getBrandIntelligenceFallback
};
