import { describe, it, expect } from 'vitest';
import { PlanClaimSchema, ArtifactSchema } from './entities.js';
import * as Mocks from './mocks.js';

describe('Schema Validations', () => {
  it('Plan claim with empty citationIds array fails validation', () => {
    const claim = {
      id: 'claim-1',
      text: 'Some fact',
      citationIds: []
    };
    
    const result = PlanClaimSchema.safeParse(claim);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('empty citationIds array is invalid');
    }
  });

  it('ig-reel duration out of bounds fails validation', () => {
    const artifactBase = {
      id: 'a-1',
      runId: 'r-1',
      hook: 'hook',
      body: 'body',
      hashtags: [],
      tags: [],
      productionToolSuggestions: [],
      provenance: { planClaimIds: [] },
      createdAt: new Date(),
    };

    const tooShort = { ...artifactBase, format: 'ig-reel', durationSeconds: 4, editDirections: '', audioSuggestions: '' };
    expect(ArtifactSchema.safeParse(tooShort).success).toBe(false);

    const tooLong = { ...artifactBase, format: 'ig-reel', durationSeconds: 120, editDirections: '', audioSuggestions: '' };
    expect(ArtifactSchema.safeParse(tooLong).success).toBe(false);

    const valid = { ...artifactBase, format: 'ig-reel', durationSeconds: 30, editDirections: '', audioSuggestions: '' };
    expect(ArtifactSchema.safeParse(valid).success).toBe(true);
  });

  it('Every port has a mock that satisfies the interface', () => {
    // We instantiate them to ensure they implement the types
    const llm: import('./ports.js').LlmPort = new Mocks.MockLlmPort();
    const ledger: import('./ports.js').UsageLedgerPort = new Mocks.MockUsageLedgerPort();
    const cache: import('./ports.js').ResearchCachePort = new Mocks.MockResearchCachePort();
    const registry: import('./ports.js').SkillRegistryPort = new Mocks.MockSkillRegistryPort();
    const publishing: import('./ports.js').PublishingPort = new Mocks.MockPublishingPort();
    const agentClient: import('./ports.js').AgentClientPort = new Mocks.MockAgentClientPort();
    const profileMemory: import('./ports.js').ProfileMemoryPort = new Mocks.MockProfileMemoryPort();
    
    expect(llm).toBeDefined();
    expect(ledger).toBeDefined();
    expect(cache).toBeDefined();
    expect(registry).toBeDefined();
    expect(publishing).toBeDefined();
    expect(agentClient).toBeDefined();
    expect(profileMemory).toBeDefined();
  });
  
  it('Round trip test per entity', () => {
    const claim = {
      id: 'c-1',
      text: 'text',
      citationIds: ['cite-1']
    };
    
    const parsed = PlanClaimSchema.parse(claim);
    const serialized = JSON.parse(JSON.stringify(parsed));
    const roundTripped = PlanClaimSchema.parse(serialized);
    expect(roundTripped).toEqual(parsed);
  });
});
