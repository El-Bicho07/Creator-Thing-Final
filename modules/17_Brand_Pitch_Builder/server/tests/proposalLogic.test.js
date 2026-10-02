const test = require('node:test');
const assert = require('node:assert/strict');
const { detectMissingMetrics, buildProposalPrompt } = require('../src/services/promptBuilder');
const {
  cleanAndParseJSON,
  generateSmartProposalFallback,
  regenerateSectionFallback,
  isGeminiKeyConfigured
} = require('../src/services/llmService');
const config = require('../src/config');

test('Data Integrity: detectMissingMetrics detects incomplete creator profile', () => {
  const emptyProfile = { name: "Test Creator" };
  const missing = detectMissingMetrics(emptyProfile);

  assert.ok(missing.length > 0, "Should detect missing follower/engagement/pricing metrics");
});

test('Prompt Builder: buildProposalPrompt includes anti-hallucination rule and placeholders', () => {
  const creator = { name: "Alex Rivera", niche: "Tech", socialLink: "https://instagram.com/alex" };
  const brand = { brandName: "Notion", goal: "Awareness" };

  const { systemInstruction, userPrompt } = buildProposalPrompt({
    profile: creator,
    brandInfo: brand,
    tone: 'bold',
    format: 'deck'
  });

  assert.ok(systemInstruction.includes("NEVER INVENT NUMBERS"), "Must include anti-hallucination directive");
  assert.ok(systemInstruction.includes("[Your follower count]"), "Must specify bracketed placeholders");
  assert.ok(systemInstruction.includes("[AI-suggested, please verify]"), "Must specify AI assumption tag");
  assert.ok(userPrompt.includes(creator.name), "Must include creator name");
  assert.ok(userPrompt.includes(brand.brandName), "Must include brand name");
});

test('JSON Parser: cleanAndParseJSON handles markdown fences and raw objects', () => {
  const validObj = { hello: "world", count: 42 };
  const parsed1 = cleanAndParseJSON(JSON.stringify(validObj));
  assert.deepEqual(parsed1, validObj);

  const markdownWrapped = "```json\n" + JSON.stringify(validObj) + "\n```";
  const parsed2 = cleanAndParseJSON(markdownWrapped);
  assert.deepEqual(parsed2, validObj);
});

test('Proposal Generator: generateSmartProposalFallback uses placeholders when numbers are missing', () => {
  const minimalCreator = {
    name: "Alex",
    niche: "Fitness",
    socialLink: "@alexfit"
  };
  const minimalBrand = {
    brandName: "Gymshark",
    goal: "Product Launch"
  };

  const proposal = generateSmartProposalFallback({
    profile: minimalCreator,
    brandInfo: minimalBrand,
    tone: 'professional'
  });

  // Verify Subject Lines
  assert.ok(Array.isArray(proposal.subjectLines), "Subject lines must be an array");
  assert.equal(proposal.subjectLines.length, 3, "Must have exactly 3 subject line variants");

  // Verify placeholders
  const intro = proposal.sections.introduction.text;
  assert.ok(intro.includes("[Your follower count]"), "Must use placeholder for missing follower count");
  assert.ok(intro.includes("[Your engagement rate %]"), "Must use placeholder for missing engagement rate");

  // Verify all 8 Sections
  const sections = proposal.sections;
  assert.ok(sections.introduction, "Section 1: Introduction missing");
  assert.ok(sections.alignmentAnalysis, "Section 2: Alignment Analysis missing");
  assert.ok(sections.collaborationConcepts, "Section 3: Collaboration Concepts missing");
  assert.ok(sections.deliverablesTimeline, "Section 4: Deliverables Timeline missing");
  assert.ok(sections.pricingPackages, "Section 5: Pricing Packages missing");
  assert.ok(sections.kpisAndResults, "Section 6: KPIs & Results missing");
  assert.ok(sections.socialProof, "Section 7: Social Proof missing");
  assert.ok(sections.callToAction, "Section 8: Call to Action missing");
});

test('Section Refinement: regenerateSectionFallback applies modifiers', () => {
  const creator = { name: "Maya", niche: "Wellness", socialLink: "@maya" };
  const brand = { brandName: "AG1", goal: "Sales" };
  const initialIntro = {
    title: "Executive Summary",
    text: "Long introductory text."
  };

  const shorter = regenerateSectionFallback({
    sectionKey: 'introduction',
    currentContent: initialIntro,
    modifier: 'shorter',
    profile: creator,
    brandInfo: brand
  });

  assert.ok(shorter.text.includes(creator.name), "Must retain creator reference");

  const persuasive = regenerateSectionFallback({
    sectionKey: 'introduction',
    currentContent: initialIntro,
    modifier: 'more_persuasive',
    profile: creator,
    brandInfo: brand
  });

  assert.ok(persuasive.text.includes("ROI"), "Persuasive text should emphasize ROI");
});

test('Gemini Key Validator: recognizes placeholder and real keys accurately', () => {
  const originalKey = config.geminiApiKey;
  try {
    config.geminiApiKey = 'PASTE_YOUR_KEY_HERE';
    assert.equal(isGeminiKeyConfigured(), false, "Placeholder PASTE_YOUR_KEY_HERE should not be treated as configured");

    config.geminiApiKey = '';
    assert.equal(isGeminiKeyConfigured(), false, "Empty key should not be treated as configured");

    config.geminiApiKey = 'AIzaSyTestValidKey123456';
    assert.equal(isGeminiKeyConfigured(), true, "Valid key should be recognized as configured");
  } finally {
    config.geminiApiKey = originalKey;
  }
});
