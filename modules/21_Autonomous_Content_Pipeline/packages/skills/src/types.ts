
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
