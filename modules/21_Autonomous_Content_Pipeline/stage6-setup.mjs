import fs from 'fs';
import path from 'path';

const out = (p, content) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
};

const pkgPath = 'packages/skills/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.dependencies = {
  ...pkg.dependencies,
  "@contentyou/schemas": "workspace:*",
  "@contentyou/ai": "workspace:*"
};
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

out('packages/skills/src/types.ts', `
import { z } from 'zod';
import { ArtifactFormat } from '@contentyou/schemas';

export interface SkillContext {
  plan: any;
  research: any[];
}

export interface RubricCriterion {
  id: string;
  description: string;
}

export interface Validator {
  id: string;
  validate(output: any): string | null;
}

export interface Skill<TArtifact> {
  id: string;
  format: ArtifactFormat;
  systemPrompt: string;
  outputSchema: z.ZodSchema<TArtifact>;
  exemplars: any[];
  rubric: RubricCriterion[];
  validators: Validator[];
  buildPrompt(ctx: SkillContext): string;
}
`);

out('packages/skills/src/validators/index.ts', `
import { Validator } from '../types.js';

export const reelDurationValidator: Validator = {
  id: 'reel-duration',
  validate(output: any) {
    if (output.durationSeconds < 5 || output.durationSeconds > 90) {
      return "Reel duration must be between 5 and 90 seconds.";
    }
    return null;
  }
};

export const fabricatedStatisticValidator: Validator = {
  id: 'fabricated-stat',
  validate(output: any) {
    const text = JSON.stringify(output);
    const hasNumbers = /\\d+%/.test(text);
    if (hasNumbers && (!output.provenance || output.provenance.planClaimIds.length === 0)) {
      return "Found numeric claims without backing planClaimIds.";
    }
    return null;
  }
};
`);

out('packages/skills/src/critic.ts', `
import { Skill } from './types.js';
import { LlmPort } from '@contentyou/schemas';

export async function scoreArtifact(llm: LlmPort, skill: Skill<any>, artifact: any) {
  // Mock critic that just passes it
  return {
    passed: true,
    weaknesses: []
  };
}
`);

out('packages/skills/src/executor.ts', `
import { Skill } from './types.js';
import { LlmPort } from '@contentyou/schemas';

export async function executeSkillsSerially(
  llm: LlmPort, 
  skills: Skill<any>[], 
  context: any, 
  onProgress?: (info: any) => void
) {
  const results = [];
  for (const skill of skills) {
    try {
      const result = await llm.generatePlan('system', context.plan); // mock call for now
      if (onProgress) onProgress({ skillId: skill.id, status: 'success' });
      results.push({ format: skill.format, data: result });
    } catch (err) {
      if (onProgress) onProgress({ skillId: skill.id, status: 'failed', error: err });
      results.push({ format: skill.format, error: err });
    }
  }
  return results;
}
`);

out('packages/skills/src/registry.ts', `
import { Skill } from './types.js';
import { SkillRegistryPort } from '@contentyou/schemas';

export class SkillRegistry implements SkillRegistryPort {
  private skills: Map<string, Skill<any>> = new Map();

  register(skill: Skill<any>) {
    this.skills.set(skill.format, skill);
  }

  getSkill(format: string): any {
    return this.skills.get(format);
  }

  getAll() {
    return Array.from(this.skills.values());
  }
}
`);

out('packages/skills/src/skills.test.ts', `
import { describe, it, expect } from 'vitest';
import { reelDurationValidator, fabricatedStatisticValidator } from './validators/index.js';

describe('Skill Validators', () => {
  it('Reel duration validator rejects 3s and 120s, accepts 30s', () => {
    expect(reelDurationValidator.validate({ durationSeconds: 3 })).not.toBeNull();
    expect(reelDurationValidator.validate({ durationSeconds: 120 })).not.toBeNull();
    expect(reelDurationValidator.validate({ durationSeconds: 30 })).toBeNull();
  });

  it('Fabricated-statistic guard catches % without provenance', () => {
    expect(fabricatedStatisticValidator.validate({ content: "Engagement rose 340%", provenance: { planClaimIds: [] } })).not.toBeNull();
    expect(fabricatedStatisticValidator.validate({ content: "Engagement rose 340%", provenance: { planClaimIds: ['123'] } })).toBeNull();
  });
});
`);

console.log('Stage 6 setup complete.');
