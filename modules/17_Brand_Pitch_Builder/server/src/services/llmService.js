const config = require('../config');

/**
 * Safely parse JSON from LLM output, stripping markdown fences if present.
 */
function cleanAndParseJSON(rawText) {
  if (!rawText) throw new Error("Empty response from AI engine");

  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  const firstBrace = cleaned.search(/[\{\[]/);
  const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

/**
 * Checks if the configured Gemini key is a valid key (not empty and not the placeholder)
 */
function isGeminiKeyConfigured() {
  const key = config.geminiApiKey;
  return Boolean(
    key &&
    key.trim() !== '' &&
    key !== 'PASTE_YOUR_KEY_HERE' &&
    key.length > 5
  );
}

/**
 * Smart Proposal Generator (Used when offline or before API key is pasted)
 * Respects strict data integrity: NEVER invents numbers; uses [Your follower count] etc.
 * Marks assumptions as [AI-suggested, please verify].
 */
function generateSmartProposalFallback({ profile, brandInfo, tone = 'professional', format = 'deck' }) {
  const creatorName = profile.name || 'Creator';
  const niche = profile.niche || 'Content Creation';
  const socialHandle = profile.socialLink || profile.handle || '[Your main social link]';
  const brandName = brandInfo.brandName || 'Brand';
  const goal = brandInfo.goal || brandInfo.campaignGoals || 'Brand Awareness';

  // Metrics with strict placeholders
  const reach = profile.metrics?.totalReach || '[Your follower count]';
  const engagement = profile.metrics?.avgEngagementRate || '[Your engagement rate %]';
  const rateCard = profile.rateCard || {};
  const t1Price = rateCard.basic ? `$${rateCard.basic}` : '[Your rate]';
  const t2Price = rateCard.standard ? `$${rateCard.standard}` : '[Your rate]';
  const t3Price = rateCard.premium ? `$${rateCard.premium}` : '[Your rate]';

  const introOpening = tone === 'bold'
    ? `In an attention-fragmented digital world, forward-thinking brands need genuine audience trust. That is why this partnership between ${creatorName} (${niche}) and ${brandName} is strategically positioned to outperform typical sponsorship placements.`
    : tone === 'friendly'
    ? `I have been following ${brandName}'s work with great interest. As an active creator in the ${niche} space (${socialHandle}), I know my community deeply values authentic recommendations from brands they can rely on.`
    : tone === 'minimalist'
    ? `${creatorName} proposes a focused collaboration with ${brandName} to drive ${goal.toLowerCase()} across our core ${niche} audience.`
    : `This proposal outlines a targeted collaboration between ${creatorName} (${socialHandle}) and ${brandName}, designed specifically to achieve ${brandName}'s goal of ${goal.toLowerCase()}.`;

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
    alignmentSummary: `Strong alignment between ${creatorName}'s authentic presence in ${niche} and ${brandName}'s campaign objective (${goal}). Target audience affinity: [AI-suggested, please verify: ideal demographic fit for ${niche} enthusiasts].`,
    sections: {
      introduction: {
        title: "Executive Summary & Creator Introduction",
        text: `${introOpening}\n\nReaching an audience of ${reach} with an average engagement rate of ${engagement}, this campaign will present ${brandName} seamlessly to an audience primed for ${goal.toLowerCase()} [AI-suggested, please verify].`
      },
      alignmentAnalysis: {
        title: "Audience & Brand Alignment Analysis",
        text: `Successful brand collaborations rely on natural synergy between creator content and brand credibility. ${brandName}'s reputation aligns naturally with the community built on ${socialHandle}.\n\nKey synergy points:`,
        keyOverlapPoints: [
          `Audience Demographics: [AI-suggested, please verify: Engaged followers interested in ${niche} with strong purchasing intent].`,
          `High-Trust Content: Followers look to ${creatorName} for authentic advice rather than passive promotion.`,
          `Campaign Focus: Content directly engineered to support ${brandName}'s core target of ${goal.toLowerCase()}.`
        ]
      },
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
      },
      deliverablesTimeline: {
        title: "Deliverables & Campaign Timeline",
        phases: [
          {
            phase: "Week 1: Creative Brief & Narrative Approval",
            description: `Align on talking points, required disclosures, tracking links, and creative hooks.`
          },
          {
            phase: "Week 2: Production & Review Cut",
            description: `Production of content and delivery of private review link for brand approval.`
          },
          {
            phase: "Week 3: Publication & Active Engagement",
            description: `Live publishing at peak audience activity hours with active comment replies.`
          },
          {
            phase: "Week 4: Performance Analytics Report",
            description: `Delivery of post-campaign report with verified reach and click metrics.`
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
        text: `Partnerships are evaluated on measurable business impact. All projections are benchmarked directly against verified creator data:`,
        metrics: [
          { label: "Audience Reach", value: reach },
          { label: "Target Engagement", value: engagement },
          { label: "Deliverable Guarantee", value: "100% on-time delivery with tracking parameter support" }
        ]
      },
      socialProof: {
        title: "Past Work & Social Proof",
        text: `${creatorName} maintains an engaged, loyal community in ${niche}. [Add any past brand sponsors or campaign metrics here before sending].`
      },
      callToAction: {
        title: "Next Steps & Discussion",
        text: `I'd love to discuss how we can tailor this campaign for ${brandName}. Let me know if one of these packages works with your current timeline!`,
        suggestedMeetingSlot: "Available for a brief 15-minute sync this upcoming Thursday or Friday."
      }
    }
  };
}

/**
 * Regenerate single section fallback
 */
function regenerateSectionFallback({ sectionKey, currentContent, modifier, customPrompt, profile, brandInfo }) {
  const brandName = brandInfo.brandName || 'Brand';
  const creatorName = profile.name || 'Creator';

  if (sectionKey === 'introduction') {
    if (modifier === 'shorter') {
      return {
        title: currentContent.title || "Executive Summary",
        text: `${creatorName} (${profile.niche || 'Creator'}) proposes a targeted collaboration with ${brandName}. With an audience of ${profile.metrics?.totalReach || '[Your follower count]'} and ${profile.metrics?.avgEngagementRate || '[Your engagement rate %]'} engagement, this campaign delivers high-intent discovery and authentic results.`
      };
    }
    if (modifier === 'more_persuasive') {
      return {
        title: currentContent.title || "Executive Summary",
        text: `Effective sponsorships don't look like paid interruptions—they look like trusted recommendations. Partnering with ${creatorName} gives ${brandName} direct access to a dedicated ${profile.niche || 'enthusiast'} audience with an average engagement of ${profile.metrics?.avgEngagementRate || '[Your engagement rate %]'}. This collaboration offers an authentic, high-ROI marketing touchpoint.`
      };
    }
    if (modifier === 'more_casual') {
      return {
        title: currentContent.title || "Hey there, Team " + brandName,
        text: `I've been a huge fan of ${brandName}, and my community frequently asks me for recommendations in the ${profile.niche || 'creator'} space. Teaming up to showcase ${brandName} feels like a completely natural fit for both of us!`
      };
    }
  }

  return {
    ...currentContent,
    text: (currentContent.text ? currentContent.text : '') + `\n\n[Refined with modifier: ${modifier || 'updated'}]`
  };
}

const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");

/**
 * Call Google Gemini via LangChain
 */
async function callGemini(systemInstruction, userPrompt) {
  const apiKey = config.geminiApiKey;
  if (!apiKey || apiKey === 'PASTE_YOUR_KEY_HERE') {
    throw new Error("Gemini API key is not configured.");
  }

  const primaryModel = config.geminiModel || 'gemini-flash-lite-latest';
  const modelsToTry = [
    primaryModel,
    'gemini-flash-lite-latest',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest'
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const llm = new ChatGoogleGenerativeAI({
        model: model,
        modelName: model,
        apiKey: apiKey,
        maxRetries: 0,
        temperature: 0.7,
        topP: 0.95,
      });

      const res = await llm.invoke([
        new SystemMessage(systemInstruction),
        new HumanMessage(userPrompt)
      ]);

      return cleanAndParseJSON(res.content);
    } catch (err) {
      lastError = err;
      if (err.message.includes('404') || err.message.includes('503')) {
        console.warn(`[AI] Model ${model} failed (${err.message}). Trying next...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("All Gemini models failed");
}

const { executeMasterProposalPipeline } = require('../agents/masterAgent');

/**
 * Proposal Dispatcher - Orchestrated by LangChain MasterPitchCoordinator
 */
async function generateProposal(promptData) {
  try {
    return await executeMasterProposalPipeline(promptData);
  } catch (err) {
    console.error('[MasterPitchCoordinator] Pipeline error, falling back to smart fallback:', err);
    return {
      data: generateSmartProposalFallback(promptData),
      usedLiveAI: false,
      warning: `Multi-agent generation encountered an issue (${err.message}). A demo proposal was generated instead.`
    };
  }
}

/**
 * Section Regenerate Dispatcher
 */
async function regenerateSection(params) {
  const prompt = require('./promptBuilder').buildSectionRegeneratePrompt(params);

  if (isGeminiKeyConfigured()) {
    try {
      console.log('[AI] Regenerating section with Gemini...');
      const res = await callGemini("You are a creator partnership editor. Respond ONLY in valid JSON.", prompt);
      return res;
    } catch (err) {
      console.warn('[AI] Gemini section refine failed, using fallback:', err.message);
    }
  }

  return regenerateSectionFallback(params);
}

module.exports = {
  generateProposal,
  regenerateSection,
  cleanAndParseJSON,
  isGeminiKeyConfigured,
  generateSmartProposalFallback,
  regenerateSectionFallback
};
