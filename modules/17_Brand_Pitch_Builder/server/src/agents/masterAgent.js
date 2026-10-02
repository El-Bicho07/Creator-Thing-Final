const { runBrandIntelligenceAgent, getBrandIntelligenceFallback } = require('./brandIntelligenceAgent');
const { runCreativeConceptAgent, getCreativeConceptsFallback } = require('./creativeConceptAgent');
const { runCommercialStrategyAgent, getCommercialStrategyFallback } = require('./commercialStrategyAgent');
const { isGeminiKeyConfigured, enforceDataIntegrity } = require('./agentHelpers');

/**
 * Master Pitch Coordinator Agent
 * Orchestrates the specialized sub-agents concurrently, handles errors gracefully,
 * and synthesizes the final comprehensive proposal with strict data integrity.
 */
async function executeMasterProposalPipeline({ profile, brandInfo, tone = 'professional', format = 'deck', customInstructions = '' }) {
  const startTime = Date.now();
  const hasLiveKey = isGeminiKeyConfigured();

  const creatorName = profile.name || 'Creator';
  const niche = profile.niche || 'Content Creation';
  const socialHandle = profile.socialLink || profile.handle || '[Your social handle]';
  const brandName = brandInfo.brandName || 'Brand';
  const goal = brandInfo.goal || brandInfo.campaignGoals || 'Brand Awareness';
  const reach = profile.metrics?.totalReach || '[Your follower count]';
  const engagement = profile.metrics?.avgEngagementRate || '[Your engagement rate %]';

  // If no Gemini key is set, use deterministic multi-agent fallback engine directly
  if (!hasLiveKey) {
    console.log('[MasterPitchCoordinator] No live API key configured. Executing offline multi-agent generation...');
    const [brandIntel, creativeConcepts, commercialStrategy] = [
      getBrandIntelligenceFallback({ profile, brandInfo, tone }),
      getCreativeConceptsFallback({ profile, brandInfo, tone }),
      getCommercialStrategyFallback({ profile, brandInfo, tone })
    ];

    const proposal = assembleFullProposal({
      profile,
      brandInfo,
      tone,
      brandIntel,
      creativeConcepts,
      commercialStrategy
    });

    const executionTimeMs = Date.now() - startTime;
    return {
      data: enforceDataIntegrity(proposal, profile),
      usedLiveAI: false,
      warning: "Running with preview mode. To use live Google Gemini AI, configure GEMINI_API_KEY in .env.",
      executionTimeMs
    };
  }

  console.log('[MasterPitchCoordinator] Dispatching 3 specialized LangChain sub-agents in parallel...');

  // Run all 3 specialized agents concurrently (Promise.all)
  // Each promise handles its own fallback so that one agent failing never breaks the others
  const [brandIntelResult, creativeConceptsResult, commercialStrategyResult] = await Promise.all([
    runBrandIntelligenceAgent({ profile, brandInfo, tone }).catch(err => {
      console.error('[MasterPitchCoordinator] Brand Intelligence agent crashed, using fallback:', err.message);
      return getBrandIntelligenceFallback({ profile, brandInfo, tone });
    }),
    runCreativeConceptAgent({ profile, brandInfo, tone }).catch(err => {
      console.error('[MasterPitchCoordinator] Creative Concept agent crashed, using fallback:', err.message);
      return getCreativeConceptsFallback({ profile, brandInfo, tone });
    }),
    runCommercialStrategyAgent({ profile, brandInfo, tone }).catch(err => {
      console.error('[MasterPitchCoordinator] Commercial Strategy agent crashed, using fallback:', err.message);
      return getCommercialStrategyFallback({ profile, brandInfo, tone });
    })
  ]);

  console.log('[MasterPitchCoordinator] All sub-agents completed. Performing Master Synthesis & Quality Check...');

  // Master synthesis & structural assembly
  const assembledProposal = assembleFullProposal({
    profile,
    brandInfo,
    tone,
    brandIntel: brandIntelResult,
    creativeConcepts: creativeConceptsResult,
    commercialStrategy: commercialStrategyResult
  });

  // Strict anti-hallucination verification
  const finalProposal = enforceDataIntegrity(assembledProposal, profile);
  const executionTimeMs = Date.now() - startTime;

  console.log(`[MasterPitchCoordinator] Multi-agent proposal assembled in ${(executionTimeMs / 1000).toFixed(2)}s.`);

  return {
    data: finalProposal,
    usedLiveAI: true,
    executionTimeMs
  };
}

/**
 * Assembles the individual sub-agent contributions into the full proposal schema.
 */
function assembleFullProposal({ profile, brandInfo, tone, brandIntel, creativeConcepts, commercialStrategy }) {
  const creatorName = profile.name || 'Creator';
  const niche = profile.niche || 'Content Creation';
  const socialHandle = profile.socialLink || profile.handle || '[Your main social link]';
  const brandName = brandInfo.brandName || 'Brand';
  const goal = brandInfo.goal || brandInfo.campaignGoals || 'Brand Awareness';
  const reach = profile.metrics?.totalReach || '[Your follower count]';
  const engagement = profile.metrics?.avgEngagementRate || '[Your engagement rate %]';

  const introOpening = tone === 'bold'
    ? `In an attention-fragmented digital world, forward-thinking brands need genuine audience trust. That is why this partnership between ${creatorName} (${niche}) and ${brandName} is strategically positioned to outperform typical sponsorship placements.`
    : tone === 'friendly'
    ? `I have been following ${brandName}'s work with great interest. As an active creator in the ${niche} space (${socialHandle}), I know my community deeply values authentic recommendations from brands they can rely on.`
    : tone === 'minimalist'
    ? `${creatorName} proposes a focused collaboration with ${brandName} to drive ${goal.toLowerCase()} across our core ${niche} audience.`
    : `This proposal outlines a targeted collaboration between ${creatorName} (${socialHandle}) and ${brandName}, designed specifically to achieve ${brandName}'s goal of ${goal.toLowerCase()}.`;

  return {
    subjectLines: brandIntel.subjectLines || [],
    alignmentScore: brandIntel.alignmentScore || 90,
    alignmentSummary: brandIntel.alignmentSummary || `Strategic collaboration tailored for ${creatorName} and ${brandName}.`,
    sections: {
      introduction: {
        title: "Executive Summary & Creator Introduction",
        text: `${introOpening}\n\nReaching an audience of ${reach} with an average engagement rate of ${engagement}, this campaign will present ${brandName} seamlessly to an audience primed for ${goal.toLowerCase()} [AI-suggested, please verify].`
      },
      alignmentAnalysis: brandIntel.alignmentAnalysis || {
        title: "Audience & Brand Alignment Analysis",
        text: `Partnership alignment between ${creatorName} and ${brandName}.`,
        keyOverlapPoints: []
      },
      collaborationConcepts: creativeConcepts.collaborationConcepts || {
        title: "Tailored Content Concepts",
        concepts: []
      },
      deliverablesTimeline: commercialStrategy.deliverablesTimeline || {
        title: "Deliverables & Campaign Timeline",
        phases: []
      },
      pricingPackages: commercialStrategy.pricingPackages || {
        title: "Proposed Partnership Packages",
        packages: []
      },
      kpisAndResults: commercialStrategy.kpisAndResults || {
        title: "Expected Results & Key Performance Indicators",
        text: "Performance projections based on verified metrics.",
        metrics: []
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

module.exports = {
  executeMasterProposalPipeline
};
