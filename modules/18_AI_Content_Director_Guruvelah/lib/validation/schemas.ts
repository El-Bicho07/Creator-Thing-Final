import { z } from 'zod';

// ============================================================================
// AI MODULE SCHEMAS
// ============================================================================

export const TrendAnalysisSchema = z.object({
  trendTitle: z.string().min(1),
  category: z.string().default('General'),
  explanation: z.string().min(10),
  whyPeopleCare: z.string().min(10),
  audienceRelevance: z.string().min(10),
  lifecycle: z.object({
    stage: z
      .enum(['emerging', 'rising', 'peak', 'declining', 'evergreen', 'unknown'])
      .default('unknown'),
    basis: z.enum(['user', 'source', 'unknown']).default('unknown'),
  }),
  contentOpportunities: z.array(z.string()).min(2).max(4),
  risks: z.array(z.string()).default([]),
  knowledgeConfidence: z.enum(['high', 'medium', 'low']).default('high'),
  assumptions: z.array(z.string()).default([]),
});

export type TrendAnalysis = z.infer<typeof TrendAnalysisSchema>;

export const AngleSchema = z.object({
  genericTrend: z.string(),
  creatorSummary: z.string(),
  audiencePainPoint: z.string().min(5),
  uniquePerspective: z.string().min(5),
  creatorFit: z.string().min(10),
  angle: z.string().min(10).max(250),
  angleReason: z.string().min(10),
  contentConcept: z.string().min(10),
  emotionalTrigger: z.string(),
  recommendedFormat: z.string(),
  ctaDirection: z.string(),
});

export type AngleOutput = z.infer<typeof AngleSchema>;

export const HookItemSchema = z.object({
  type: z.enum([
    'Curiosity',
    'Contrarian',
    'Question',
    'Story',
    'Bold statement',
    'Problem',
    'Transformation',
  ]),
  text: z.string().min(5),
  rationale: z.string().min(5),
  styleTag: z.string().min(2),
});

export const HooksOutputSchema = z.object({
  hooks: z.array(HookItemSchema).length(7),
  topPickIndex: z.number().int().min(0).max(6),
  topPickReason: z.string().min(5),
});

export type HooksOutput = z.infer<typeof HooksOutputSchema>;

export const FormatOutputSchema = z.object({
  recommendedFormat: z.string(),
  secondaryFormat: z.string().nullable().optional(),
  reason: z.string().min(10),
  structure: z.array(z.string()).min(2),
  visualRequirements: z.array(z.string()).default([]),
  alternatives: z.array(z.string()).default([]),
});

export type FormatOutput = z.infer<typeof FormatOutputSchema>;

// DISCRIMINATED UNIONS FOR SCRIPTS
export const VideoScriptSegmentSchema = z.object({
  label: z.enum(['HOOK', 'SETUP', 'VALUE', 'PAYOFF', 'CTA']),
  startSec: z.number(),
  endSec: z.number(),
  voiceover: z.string().min(1),
  onScreenText: z.string(),
  visual: z.string(),
  bRoll: z.string(),
  camera: z.string(),
});

export const VideoScriptSchema = z.object({
  kind: z.literal('video'),
  title: z.string(),
  durationSec: z.number(),
  ctaText: z.string(),
  segments: z.array(VideoScriptSegmentSchema).min(3),
});

export const TextPostSectionSchema = z.object({
  label: z.enum(['HOOK', 'SETUP', 'VALUE', 'PAYOFF', 'CTA']),
  text: z.string().min(1),
});

export const TextPostScriptSchema = z.object({
  kind: z.literal('text_post'),
  title: z.string(),
  ctaText: z.string(),
  sections: z.array(TextPostSectionSchema).min(3),
  assembledPost: z.string().optional(),
  thread: z.array(z.string()).optional(),
});

export const ScriptOutputSchema = z.discriminatedUnion('kind', [
  VideoScriptSchema,
  TextPostScriptSchema,
]);

export type ScriptOutput = z.infer<typeof ScriptOutputSchema>;

export const CaptionOutputSchema = z.object({
  title: z.string().optional(),
  caption: z.string().min(10),
  hashtags: z.array(z.string()),
});

export type CaptionOutput = z.infer<typeof CaptionOutputSchema>;

// ============================================================================
// USER INPUT VALIDATION SCHEMAS
// ============================================================================

export const AnalyzeTrendInputSchema = z.object({
  topic: z.string().min(2, 'Topic must be at least 2 characters').max(300),
  sourceText: z.string().max(4000).optional(),
  lifecycleHint: z.string().optional(),
});

export const GenerateContentInputSchema = z.object({
  trendId: z.string().optional(),
  topic: z.string().min(2).max(300),
  sourceText: z.string().max(4000).optional(),
  lifecycleHint: z.string().optional(),
  platform: z.string().min(1),
  goal: z.string().min(1),
  durationSec: z.number().int().positive().optional(),
});

export const FeedbackInputSchema = z.object({
  generationId: z.string().uuid(),
  rating: z.union([z.literal(1), z.literal(-1)]),
  feedback: z.string().max(1000).optional(),
});
