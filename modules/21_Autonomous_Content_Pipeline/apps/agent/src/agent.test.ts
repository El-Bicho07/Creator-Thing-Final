
import { describe, it, expect } from 'vitest';
import { planCritic } from './graphs/plan/nodes/critic.js';

describe('Agent Graph Tests', () => {
  it('Citation enforcement: uncited claim fails', () => {
    const state = { plan: { claims: [{ text: "No citation", citationIds: [] }] } };
    expect(() => planCritic(state)).toThrow("Citation missing");
  });
  
  it('Citation enforcement: cited claim passes', () => {
    const state = { plan: { claims: [{ text: "Cited", citationIds: ['doc1'] }] } };
    expect(() => planCritic(state)).not.toThrow();
  });
});
