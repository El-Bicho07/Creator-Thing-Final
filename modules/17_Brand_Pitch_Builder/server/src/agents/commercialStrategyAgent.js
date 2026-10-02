const { invokeLangChain } = require('./agentHelpers');

/**
 * Deterministic fallback for Commercial Strategy Agent
 */
function getCommercialStrategyFallback({ profile, brandInfo, tone = 'professional' }) {
  const reach = profile.metrics?.totalReach || '[Your follower count]';
  const engagement = profile.metrics?.avgEngagementRate || '[Your engagement rate %]';
  const rateCard = profile.rateCard || {};
  const t1Price = rateCard.basic ? `$${rateCard.basic}` : '[Your starting rate]';
  const t2Price = rateCard.standard ? `$${rateCard.standard}` : '[Your standard rate]';
  const t3Price = rateCard.premium ? `$${rateCard.premium}` : '[Your premium rate]';

  return {
    deliverablesTimeline: {
      title: "Deliverables & Campaign Timeline",
      phases: [
        {
          phase: "Week 1: Creative Brief & Narrative Approval",
          description: "Align on campaign objectives, required brand disclosures, tracking links, and creative hooks."
        },
        {
          phase: "Week 2: Production & Review Cut",
          description: "Production of content and delivery of private review link for brand approval."
        },
        {
          phase: "Week 3: Publication & Active Engagement",
          description: "Live publishing at peak audience activity hours with active comment replies."
        },
        {
          phase: "Week 4: Performance Analytics Report",
          description: "Delivery of post-campaign report with verified reach and click metrics."
        }
      ]
    },
    pricingPackages: {
      title: "Proposed Partnership Packages",
      packages: [
        {
          tier: "Basic / Starter",
          deliverables: [
            "1x Dedicated Short-form Video (Reel / TikTok)",
            "1x Supporting Story Frame with Link Sticker"
          ],
          price: t1Price,
          idealFor: "Testing audience response and initial conversion signals.",
          badge: ""
        },
        {
          tier: "Standard / Growth",
          deliverables: [
            "1x Dedicated Video / High-Impact Integration",
            "2x Supporting Multi-frame Story Sets",
            "30-Day Digital Usage Rights"
          ],
          price: t2Price,
          idealFor: "Recommended for comprehensive brand storytelling and conversions.",
          badge: "Recommended"
        },
        {
          tier: "Premium / Omnichannel",
          deliverables: [
            "Multi-platform content package",
            "Category Exclusivity Window",
            "Paid Ad Whitelisting & Raw Assets"
          ],
          price: t3Price,
          idealFor: "Dominant category presence and multi-touchpoint reach.",
          badge: "Highest Impact"
        }
      ]
    },
    kpisAndResults: {
      title: "Expected Results & Key Performance Indicators",
      text: "Partnerships are evaluated on measurable business impact. All projections are benchmarked directly against verified creator data:",
      metrics: [
        { label: "Audience Reach", value: reach },
        { label: "Target Engagement", value: engagement },
        { label: "Deliverable Guarantee", value: "100% on-time delivery with tracking parameter support" }
      ]
    }
  };
}

/**
 * Commercial & Deal Packaging Agent
 * Generates pricing tiers, delivery timeline, and verified KPI projections.
 */
async function runCommercialStrategyAgent({ profile, brandInfo, tone = 'professional' }) {
  const reach = profile.metrics?.totalReach ? String(profile.metrics.totalReach) : '[Your follower count]';
  const engagement = profile.metrics?.avgEngagementRate ? String(profile.metrics.avgEngagementRate) : '[Your engagement rate %]';
  const rateCard = profile.rateCard || {};
  const t1Price = rateCard.basic ? `$${rateCard.basic}` : '[Your starting rate]';
  const t2Price = rateCard.standard ? `$${rateCard.standard}` : '[Your standard rate]';
  const t3Price = rateCard.premium ? `$${rateCard.premium}` : '[Your premium rate]';

  const systemPrompt = `You are the Commercial & Deal Packaging Agent in a multi-agent creator partnership system.
Your role is to formulate tiered partnership packages, a realistic campaign production timeline, and measurable KPI benchmarks.

CRITICAL ANTI-HALLUCINATION INSTRUCTIONS:
1. NEVER INVENT METRICS OR PRICING:
   - Reach must be: "${reach}". If it is a bracketed placeholder, keep the placeholder! Do not invent numbers like "50,000" or "100K".
   - Engagement must be: "${engagement}". If it is a placeholder, keep it! Do not invent numbers like "4.5%".
   - Pricing tiers must be: Tier 1: "${t1Price}", Tier 2: "${t2Price}", Tier 3: "${t3Price}". Never invent custom dollar amounts if the user provided placeholders.
2. OUTPUT FORMAT: Return ONLY a raw JSON object matching the requested schema, with NO markdown formatting or comments.`;

  const userPrompt = `Creator Info:
- Name: ${profile.name || 'Creator'}
- Channel/Niche: ${profile.niche || 'General'}
- Verified Reach: ${reach}
- Verified Engagement: ${engagement}
- Base Rates: Tier 1: ${t1Price}, Tier 2: ${t2Price}, Tier 3: ${t3Price}

Brand Info:
- Brand: ${brandInfo.brandName}
- Campaign Goal: ${brandInfo.goal || brandInfo.campaignGoals || 'Brand Awareness'}

Required JSON structure:
{
  "deliverablesTimeline": {
    "title": "Deliverables & Campaign Timeline",
    "phases": [
      { "phase": "Week 1: Concept Brief & Hook Approval", "description": "Phase detail" },
      { "phase": "Week 2: Production & Review Cut", "description": "Phase detail" },
      { "phase": "Week 3: Live Publishing & Community Engagement", "description": "Phase detail" },
      { "phase": "Week 4: Performance Analytics Report", "description": "Phase detail" }
    ]
  },
  "pricingPackages": {
    "title": "Proposed Partnership Packages",
    "packages": [
      {
        "tier": "Basic / Starter",
        "deliverables": ["Deliverable item 1", "Deliverable item 2"],
        "price": "${t1Price}",
        "idealFor": "Testing audience response",
        "badge": ""
      },
      {
        "tier": "Standard / Growth",
        "deliverables": ["Deliverable item 1", "Deliverable item 2", "Usage rights"],
        "price": "${t2Price}",
        "idealFor": "Recommended for comprehensive storytelling",
        "badge": "Recommended"
      },
      {
        "tier": "Premium / Omnichannel",
        "deliverables": ["Multi-platform coverage", "Exclusivity window", "Whitelisting"],
        "price": "${t3Price}",
        "idealFor": "Maximum category presence",
        "badge": "Highest Impact"
      }
    ]
  },
  "kpisAndResults": {
    "title": "Expected Results & Key Performance Indicators",
    "text": "Contextual paragraph on campaign measurement.",
    "metrics": [
      { "label": "Audience Reach", "value": "${reach}" },
      { "label": "Target Engagement", "value": "${engagement}" },
      { "label": "Deliverable Guarantee", "value": "100% on-time delivery with tracking parameter support" }
    ]
  }
}`;

  try {
    const result = await invokeLangChain(systemPrompt, userPrompt);
    if (!result.deliverablesTimeline || !result.pricingPackages || !result.kpisAndResults) {
      throw new Error("Invalid output structure from Commercial Strategy Agent");
    }
    return result;
  } catch (err) {
    console.warn(`[CommercialStrategyAgent] LangChain invocation failed (${err.message}). Retrying once...`);
    try {
      return await invokeLangChain(systemPrompt, userPrompt);
    } catch (retryErr) {
      console.warn(`[CommercialStrategyAgent] Retry failed (${retryErr.message}). Using fallback commercial strategy.`);
      return getCommercialStrategyFallback({ profile, brandInfo, tone });
    }
  }
}

module.exports = {
  runCommercialStrategyAgent,
  getCommercialStrategyFallback
};
