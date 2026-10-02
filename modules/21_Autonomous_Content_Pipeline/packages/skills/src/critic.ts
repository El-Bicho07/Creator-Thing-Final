
import { Skill } from './types.js';
import { LlmPort } from '@contentyou/schemas';

export async function scoreArtifact(llm: LlmPort, skill: Skill<any>, artifact: any) {
  // Mock critic that just passes it
  return {
    passed: true,
    weaknesses: []
  };
}
