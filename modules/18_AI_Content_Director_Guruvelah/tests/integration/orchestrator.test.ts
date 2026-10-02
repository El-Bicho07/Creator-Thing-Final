import { describe, it, expect } from 'vitest';
import { generateContentPackage } from '@/lib/ai/orchestrator';
import { AIProvider } from '@/lib/ai/provider';

// Fake AI Provider for integration tests
class FakeAIProvider implements AIProvider {
  async generateStructuredJSON<T>(
    prompt: string,
    validator: (data: unknown) => T
  ): Promise<{ data: T; meta: any }> {
    let mockData: any = {};

    if (prompt.includes('Analyze the following trend')) {
      mockData = {
        trendTitle: 'AI Coding Agents',
        category: 'Technology',
        explanation: 'AI agents are changing developer workflows rapidly.',
        whyPeopleCare: 'Developers want productivity without dependency.',
        audienceRelevance: 'High for computer science students.',
        lifecycle: { stage: 'rising', basis: 'user' },
        contentOpportunities: ['How to use AI without getting lazy', 'Top 3 AI coding CLI tools'],
        risks: [],
        knowledgeConfidence: 'high',
        assumptions: [],
      };
    } else if (prompt.includes('CREATOR NICHE')) {
      mockData = {
        genericTrend: 'AI coding agents are fast.',
        creatorSummary: 'College CSE student sharing real coding tips.',
        audiencePainPoint: 'Fear of becoming dependent on AI for coding assignments.',
        uniquePerspective: 'How college developers can use AI agents without losing core problem solving.',
        creatorFit: 'Matches student developer persona.',
        angle: 'How college developers can use AI coding agents without becoming dependent on them.',
        angleReason: 'Hits student pain point directly with practical advice.',
        contentConcept: 'Talking Head + Screen Recording breakdown',
        emotionalTrigger: 'Empowerment & Relatability',
        recommendedFormat: 'Talking Head',
        ctaDirection: 'Ask students their favorite AI tool in comments.',
      };
    } else if (prompt.includes('viral hooks') || prompt.includes('topPickIndex')) {
      mockData = {
        hooks: [
          { type: 'Curiosity', text: 'Are AI coding agents making CS students worse programmers?', rationale: 'High curiosity', styleTag: 'curiosity' },
          { type: 'Contrarian', text: 'Stop using AI coding tools until you master this one rule.', rationale: 'Pattern interrupt', styleTag: 'contrarian' },
          { type: 'Question', text: 'Will AI coding agents replace junior software developers by 2026?', rationale: 'Direct question', styleTag: 'question' },
          { type: 'Story', text: 'I let an AI coding agent build my entire semester project.', rationale: 'Personal story', styleTag: 'story' },
          { type: 'Bold statement', text: 'Using AI coding agents is not cheating—here is how to win.', rationale: 'Bold statement', styleTag: 'bold' },
          { type: 'Problem', text: 'If you use AI agents to copy paste code, you will fail interviews.', rationale: 'Problem focused', styleTag: 'problem' },
          { type: 'Transformation', text: 'How I doubled my coding speed with AI without losing logic.', rationale: 'Transformation', styleTag: 'transformation' },
        ],
        topPickIndex: 0,
        topPickReason: 'Highest curiosity hook for reach.',
      };
    } else if (prompt.includes('ALLOWED FORMATS')) {
      mockData = {
        recommendedFormat: 'Talking Head',
        secondaryFormat: 'Screen Recording',
        reason: 'Allows personal connection + showing screen proof.',
        structure: ['Hook', 'Setup', 'Value 1', 'Value 2', 'CTA'],
        visualRequirements: ['Camera on speaker', 'VS Code screen recording'],
        alternatives: ['Explainer'],
      };
    } else if (prompt.includes('VideoScript')) {
      mockData = {
        kind: 'video',
        title: 'How CS Students Should Use AI Coding Agents',
        durationSec: 30,
        ctaText: 'Comment below: Are you using AI for your coding assignments?',
        segments: [
          { label: 'HOOK', startSec: 0, endSec: 3, voiceover: 'Are AI coding agents making CS students worse programmers?', onScreenText: 'AI Coding Agents', visual: 'Speaker on camera', bRoll: 'None', camera: 'MCU' },
          { label: 'SETUP', startSec: 3, endSec: 8, voiceover: 'Everyone is using AI tools, but copying code blindly will destroy your technical interview skills.', onScreenText: 'Don’t Copy Blindly', visual: 'Screen recording VS Code', bRoll: 'Terminal', camera: 'Screen' },
          { label: 'VALUE', startSec: 8, endSec: 22, voiceover: 'Instead, use AI to explain error stack traces and write tests, while you write the core logic yourself.', onScreenText: 'Use AI For Debugging', visual: 'Split screen', bRoll: 'Code diff', camera: 'Medium' },
          { label: 'PAYOFF', startSec: 22, endSec: 27, voiceover: 'That way you get 2x speed without becoming dependent on the machine.', onScreenText: '2x Speed', visual: 'Speaker on camera', bRoll: 'None', camera: 'MCU' },
          { label: 'CTA', startSec: 27, endSec: 30, voiceover: 'Comment below: Are you using AI for your coding assignments?', onScreenText: 'Comment Below!', visual: 'End card', bRoll: 'None', camera: 'CU' },
        ],
      };
    } else if (prompt.includes('caption') || prompt.includes('Hashtags')) {
      mockData = {
        title: 'How CS Students Should Use AI Coding Agents',
        caption: 'AI coding agents are exploding right now! Here is how college developers can leverage AI without losing their core problem-solving logic. What AI tools do you use in your workflow?',
        hashtags: ['#AICoding', '#DeveloperTools', '#ComputerScience', '#LearnToCode', '#SoftwareEngineering'],
      };
    }

    const data = validator(mockData);
    return {
      data,
      meta: { text: JSON.stringify(mockData), model: 'fake-model', latencyMs: 50 },
    };
  }
}

describe('Orchestrator Integration Test', () => {
  it('runs full content pipeline end-to-end and matches expected sample scenario output', async () => {
    const provider = new FakeAIProvider();
    const profile = {
      niche: 'Technology',
      sub_niche: 'Fullstack Web Dev',
      target_audience: 'College students learning to code',
      platform: 'Instagram Reels',
      tone: ['Casual', 'Educational'],
      experience_level: 'Intermediate',
      creator_description: 'College CSE student sharing real coding tips.',
    };

    const packageResult = await generateContentPackage(
      {
        topic: 'AI coding agents',
        profile,
        platform: 'Instagram Reels',
        goal: 'Increase Reach',
        durationSec: 30,
      },
      { provider }
    );

    expect(packageResult.trendAnalysis.trendTitle).toBe('AI Coding Agents');
    expect(packageResult.creatorAngle).toContain('college developers can use AI coding agents');
    expect(packageResult.hooks.hooks).toHaveLength(7);
    expect(packageResult.format).toBe('Talking Head');
    expect(packageResult.script.kind).toBe('video');

    if (packageResult.script.kind === 'video') {
      expect(packageResult.script.segments).toHaveLength(5);
    }
    expect(packageResult.shotList).toHaveLength(5);
    expect(packageResult.cta).toContain('Comment below');
    expect(packageResult.hashtags).toContain('#AICoding');
  });
});
