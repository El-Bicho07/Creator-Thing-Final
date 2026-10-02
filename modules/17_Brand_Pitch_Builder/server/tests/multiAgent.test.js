const test = require('node:test');
const assert = require('node:assert/strict');
const { executeMasterProposalPipeline } = require('../src/agents/masterAgent');
const { enforceDataIntegrity } = require('../src/agents/agentHelpers');
const { getBrandIntelligenceFallback } = require('../src/agents/brandIntelligenceAgent');
const { getCreativeConceptsFallback } = require('../src/agents/creativeConceptAgent');
const { getCommercialStrategyFallback } = require('../src/agents/commercialStrategyAgent');

test('Multi-Agent: MasterPitchCoordinator produces complete proposal structure in fallback mode', async () => {
  const profile = {
    name: "Prinetha",
    niche: "AI & Tech",
    socialLink: "https://instagram.com/prinetha"
  };
  const brandInfo = {
    brandName: "Canva",
    goal: "Product Launch"
  };

  const startTime = Date.now();
  const result = await executeMasterProposalPipeline({
    profile,
    brandInfo,
    tone: 'professional'
  });
  const duration = Date.now() - startTime;

  assert.ok(result.data, "Should return proposal data");
  assert.equal(Array.isArray(result.data.subjectLines), true, "Subject lines should be an array");
  assert.equal(result.data.subjectLines.length, 3, "Should have 3 subject lines");

  const sections = result.data.sections;
  assert.ok(sections.introduction, "Missing introduction section");
  assert.ok(sections.alignmentAnalysis, "Missing alignmentAnalysis section");
  assert.ok(sections.collaborationConcepts, "Missing collaborationConcepts section");
  assert.ok(sections.deliverablesTimeline, "Missing deliverablesTimeline section");
  assert.ok(sections.pricingPackages, "Missing pricingPackages section");
  assert.ok(sections.kpisAndResults, "Missing kpisAndResults section");
  assert.ok(sections.socialProof, "Missing socialProof section");
  assert.ok(sections.callToAction, "Missing callToAction section");

  // Check anti-hallucination constraint
  assert.ok(sections.introduction.text.includes("[Your follower count]"), "Must preserve follower placeholder");
  assert.ok(sections.introduction.text.includes("[Your engagement rate %]"), "Must preserve engagement placeholder");

  // Ensure execution time is reasonable (under 12s for live parallel LLM calls, under 2s for offline)
  const maxAllowedDuration = result.usedLiveAI ? 12000 : 2000;
  assert.ok(duration < maxAllowedDuration, `Multi-agent pipeline should assemble within ${maxAllowedDuration}ms (took ${duration}ms)`);
});

test('Multi-Agent: Data integrity sanitizer replaces hallucinated pricing when user omitted it', () => {
  const incompleteProfile = {
    name: "Alex",
    niche: "Gaming"
  };

  const mockProposal = {
    sections: {
      pricingPackages: {
        packages: [
          { tier: "Basic", price: "$1,500" },
          { tier: "Standard", price: "$3,500" }
        ]
      },
      kpisAndResults: {
        metrics: [
          { label: "Audience Reach", value: "250,000 followers" },
          { label: "Target Engagement", value: "8.2%" }
        ]
      }
    }
  };

  const cleaned = enforceDataIntegrity(mockProposal, incompleteProfile);

  assert.equal(cleaned.sections.pricingPackages.packages[0].price, '[Your starting rate]');
  assert.equal(cleaned.sections.pricingPackages.packages[1].price, '[Your standard rate]');
  assert.equal(cleaned.sections.kpisAndResults.metrics[0].value, '[Your follower count]');
  assert.equal(cleaned.sections.kpisAndResults.metrics[1].value, '[Your engagement rate %]');
});

test('Multi-Agent: Sub-agents provide reliable fallbacks if downstream calls fail', () => {
  const profile = { name: "Jordan", niche: "Design" };
  const brandInfo = { brandName: "Figma" };

  const brandIntel = getBrandIntelligenceFallback({ profile, brandInfo });
  assert.equal(brandIntel.subjectLines.length, 3);
  assert.ok(brandIntel.alignmentAnalysis.keyOverlapPoints.length >= 3);

  const creative = getCreativeConceptsFallback({ profile, brandInfo });
  assert.equal(creative.collaborationConcepts.concepts.length, 3);

  const commercial = getCommercialStrategyFallback({ profile, brandInfo });
  assert.equal(commercial.pricingPackages.packages.length, 3);
  assert.equal(commercial.deliverablesTimeline.phases.length, 4);
});
