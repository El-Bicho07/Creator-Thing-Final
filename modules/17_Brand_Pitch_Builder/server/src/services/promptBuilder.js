/**
 * Prompt Builder Service for Brand Pitch Builder
 * Injects structured JSON context and enforces anti-hallucination & placeholder rules.
 */

function detectMissingMetrics(profile) {
  const missing = [];
  if (!profile.metrics || !profile.metrics.totalReach) missing.push("Follower count / total reach");
  if (!profile.metrics || !profile.metrics.avgEngagementRate) missing.push("Average engagement rate");
  if (!profile.rateCard || Object.keys(profile.rateCard).length === 0) missing.push("Specific package pricing");
  return missing;
}

function buildProposalPrompt({ profile, brandInfo, tone = 'professional', format = 'deck', customInstructions = '' }) {
  const missingMetrics = detectMissingMetrics(profile);

  const systemInstruction = `You are an elite creator partnership strategist.
Your task is to craft a personalized brand collaboration proposal and pitch for a content creator pitching a brand sponsor.

CRITICAL RULES:
1. NEVER INVENT NUMBERS: Never fabricate or invent specific numbers (follower counts, engagement percentages, view counts, or pricing). If numbers were not provided in the creator data, you MUST use bracketed placeholders such as:
   - [Your follower count]
   - [Your engagement rate %]
   - [Your rate / $XXX]
   - [Your average views]
2. AI ASSUMPTIONS TAG: If you must make any assumption while writing (for example regarding the brand's audience demographic or customer persona because the user did not specify it), you MUST explicitly append or prepend '[AI-suggested, please verify]'.
3. NO FILLER: Directly connect the creator's niche ("${profile.niche || 'Creator'}") and primary channel ("${profile.socialLink || profile.handle || 'Social channel'}") to the brand ("${brandInfo.brandName}") and their campaign goal ("${brandInfo.goal || 'Partnership'}").
4. TONE: Write in the requested tone: "${tone}" (options: professional, friendly, bold, minimalist).
5. FORMAT: Respond ONLY with valid, raw JSON matching the required schema. Do not wrap in markdown or commentary.`;

  const userContext = {
    creator: {
      name: profile.name || 'Creator',
      socialLinkOrHandle: profile.socialLink || profile.handle || '',
      niche: profile.niche || '',
      reach: profile.metrics?.totalReach || null,
      engagement: profile.metrics?.avgEngagementRate || null,
      additionalDetails: profile.additionalDetails || profile.bio || ''
    },
    brand: {
      name: brandInfo.brandName,
      website: brandInfo.websiteUrl || '',
      campaignGoal: brandInfo.goal || brandInfo.campaignGoals || 'Brand Awareness',
      additionalNotes: brandInfo.notes || ''
    },
    preferences: {
      tone,
      format,
      customInstructions
    }
  };

  const expectedSchemaDescription = `
Required JSON output structure:
{
  "subjectLines": [
    { "type": "Curiosity Hook", "text": "Catchy subject line referencing creator handle and brand" },
    { "type": "Value-First", "text": "Value and outcome-focused partnership subject line" },
    { "type": "Direct & Personal", "text": "Clean direct collaboration subject line" }
  ],
  "alignmentScore": 92,
  "alignmentSummary": "2-3 sentences explaining why this partnership fits, noting [AI-suggested, please verify] if audience fit was assumed.",
  "sections": {
    "introduction": {
      "title": "Executive Summary & Introduction",
      "text": "Why this creator and this brand fit. Use [Your follower count] if reach was not provided."
    },
    "alignmentAnalysis": {
      "title": "Audience & Brand Alignment Analysis",
      "text": "Analysis connecting creator niche to brand. Mark any assumed brand audience points with [AI-suggested, please verify].",
      "keyOverlapPoints": [
        "Overlap catalyst 1",
        "Overlap catalyst 2",
        "Overlap catalyst 3"
      ]
    },
    "collaborationConcepts": {
      "title": "Tailored Collaboration Concepts",
      "concepts": [
        {
          "conceptNumber": 1,
          "title": "Concept 1 Title",
          "format": "e.g. Dedicated Video / Carousel Breakdown",
          "hook": "Specific first 3-second hook",
          "narrative": "Storyline and natural brand integration",
          "callToAction": "Viewer call to action"
        },
        {
          "conceptNumber": 2,
          "title": "Concept 2 Title",
          "format": "e.g. Routine Integration / Day-in-the-Life",
          "hook": "Opening hook",
          "narrative": "Storyline and demonstration",
          "callToAction": "Viewer call to action"
        },
        {
          "conceptNumber": 3,
          "title": "Concept 3 Title",
          "format": "e.g. Problem-Solution Quick Reel",
          "hook": "Opening hook",
          "narrative": "Storyline and utility",
          "callToAction": "Viewer call to action"
        }
      ]
    },
    "deliverablesTimeline": {
      "title": "Deliverables & Production Timeline",
      "phases": [
        { "phase": "Week 1: Concept Brief & Hook Approval", "description": "Align on campaign messaging and brand talking points." },
        { "phase": "Week 2: Production & Review Cut", "description": "Drafting content and submitting internal review link." },
        { "phase": "Week 3: Live Rollout & Community Engagement", "description": "Publishing at peak audience hours with active comment monitoring." },
        { "phase": "Week 4: Performance Analytics Report", "description": "Delivery of full reach and engagement metrics report." }
      ]
    },
    "pricingPackages": {
      "title": "Proposed Partnership Packages",
      "packages": [
        {
          "tier": "Basic / Starter",
          "deliverables": ["1x Dedicated Post / Short-form video", "1x Supporting Story frame"],
          "price": "[Your starting package rate]",
          "idealFor": "Testing audience interest and initial resonance."
        },
        {
          "tier": "Standard / Growth",
          "deliverables": ["1x In-depth Integration", "2x Supporting Story sets", "30-Day Digital Usage Rights"],
          "price": "[Your standard package rate]",
          "idealFor": "Recommended for comprehensive brand storytelling and conversions.",
          "badge": "Recommended"
        },
        {
          "tier": "Premium / Omnichannel",
          "deliverables": ["Multi-platform coverage", "Category exclusivity window", "Whitelisting rights"],
          "price": "[Your premium package rate]",
          "idealFor": "Maximum category presence and multi-touchpoint reach.",
          "badge": "Highest Impact"
        }
      ]
    },
    "kpisAndResults": {
      "title": "Expected Results & Measurable KPIs",
      "text": "Outcomes based on creator niche. Use placeholders like [Your expected views] if not provided.",
      "metrics": [
        { "label": "Audience Reach", "value": "[Your follower count]" },
        { "label": "Target Engagement", "value": "[Your engagement rate %]" },
        { "label": "Deliverable Guarantee", "value": "100% on-time delivery with tracking link" }
      ]
    },
    "socialProof": {
      "title": "Past Work & Social Proof",
      "text": "Overview of creator authority in their niche. If past brands were not entered, note: [Add any past brand sponsors or wins here]."
    },
    "callToAction": {
      "title": "Call to Action & Next Steps",
      "text": "Low-pressure invitation to align on preferred package or timeline.",
      "suggestedMeetingSlot": "Available for a quick 15-minute sync this Thursday or Friday."
    }
  }
}`;

  return {
    systemInstruction,
    userPrompt: `Creator profile and brand information:\n\n${JSON.stringify(userContext, null, 2)}\n\nGenerate the complete proposal adhering to all rules.\n${expectedSchemaDescription}`
  };
}

function buildSectionRegeneratePrompt({ sectionKey, currentContent, modifier, customPrompt, profile, brandInfo, tone = 'professional' }) {
  const instructions = {
    shorter: "Condense this section to be 40% shorter, punchier, and remove filler while retaining key placeholders and facts.",
    more_persuasive: "Make this section more compelling and ROI-focused for a brand marketing director. Emphasize authentic creator authority.",
    more_casual: "Make this section warmer, more approachable, and conversational.",
    custom: customPrompt || "Refine this section."
  };

  const instructionText = instructions[modifier] || instructions.custom;

  const prompt = `Refine this proposal section:
Section Key: "${sectionKey}"
Brand: "${brandInfo.brandName}"
Creator: "${profile.name || 'Creator'}" (${profile.niche || ''})
Tone: "${tone}"

Current Content:
${JSON.stringify(currentContent, null, 2)}

Refinement Goal:
${instructionText}

IMPORTANT: Never invent specific numbers (follower counts, engagement %, prices). Keep placeholders like [Your follower count] or [Your rate] if no exact number was supplied. Mark assumptions as [AI-suggested, please verify].

Respond ONLY with the updated JSON object for this section.`;

  return prompt;
}

module.exports = {
  detectMissingMetrics,
  buildProposalPrompt,
  buildSectionRegeneratePrompt
};
