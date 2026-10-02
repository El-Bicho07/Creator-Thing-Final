import { z } from 'zod';

export const IdeaSchema = z.object({
  id: z.string(),
  userId: z.string(),
  text: z.string(),
  refinementAnswers: z.object({
    targetAudience: z.string().optional(),
    inspirationLinks: z.array(z.string()).optional(),
  }).optional(),
  createdAt: z.date(),
});
export type Idea = z.infer<typeof IdeaSchema>;

export const CreatorProfileSchema = z.object({
  userId: z.string(),
  niche: z.string(),
  goals: z.array(z.string()),
  audience: z.string(),
  voice: z.string(),
  workstyle: z.string(),
  learnedPreferences: z.record(z.string(), z.any()),
});
export type CreatorProfile = z.infer<typeof CreatorProfileSchema>;

export const SocialPlatformSchema = z.enum(['instagram', 'youtube', 'linkedin', 'x']);
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;

export const SocialAccountSchema = z.object({
  userId: z.string(),
  platform: SocialPlatformSchema,
  encryptedToken: z.string(),
  iv: z.string(),
  authTag: z.string(),
  keyVersion: z.number(),
  scopes: z.array(z.string()),
  expiresAt: z.date().optional(),
});
export type SocialAccount = z.infer<typeof SocialAccountSchema>;

export const PipelineRunStatusSchema = z.enum([
  'queued', 'running', 'awaiting_review', 'completed', 'failed', 'cancelled'
]);

export const PipelineRunSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: PipelineRunStatusSchema,
  threadId: z.string(),
  claimedAt: z.date().optional(),
  workerId: z.string().optional(),
  timings: z.object({
    startedAt: z.date().optional(),
    completedAt: z.date().optional(),
  }),
  costSummary: z.object({
    tokens: z.number().default(0),
    estimatedUsd: z.number().default(0),
    quotaUnits: z.number().default(0),
  }),
  createdAt: z.date(),
});
export type PipelineRun = z.infer<typeof PipelineRunSchema>;

export const RunEventBaseSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  runId: z.string(),
  seq: z.number(),
  timestamp: z.date(),
});

export const RunEventSchema = z.discriminatedUnion('type', [
  RunEventBaseSchema.extend({ type: z.literal('info'), message: z.string() }),
  RunEventBaseSchema.extend({ type: z.literal('research_doc_found'), citationId: z.string(), url: z.string() }),
  RunEventBaseSchema.extend({ type: z.literal('plan_ready'), planId: z.string() }),
  RunEventBaseSchema.extend({ type: z.literal('artifact_generated'), format: z.string(), artifactId: z.string() }),
  RunEventBaseSchema.extend({ type: z.literal('error'), error: z.string() }),
]);
export type RunEvent = z.infer<typeof RunEventSchema>;

export const ResearchDocSchema = z.object({
  id: z.string(),
  runId: z.string(),
  url: z.string(),
  title: z.string(),
  snippet: z.string(),
  citationId: z.string(),
  retrievedAt: z.date(),
});
export type ResearchDoc = z.infer<typeof ResearchDocSchema>;

export const PlanClaimSchema = z.object({
  id: z.string(),
  text: z.string(),
  citationIds: z.array(z.string()).refine(val => val.length > 0, {
    message: "A Plan claim with an empty citationIds array is invalid."
  }),
});
export type PlanClaim = z.infer<typeof PlanClaimSchema>;

export const PlanSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  claims: z.array(PlanClaimSchema),
});
export type PlanSection = z.infer<typeof PlanSectionSchema>;

export const PlanSchema = z.object({
  id: z.string(),
  runId: z.string(),
  version: z.number(),
  sections: z.array(PlanSectionSchema),
  createdAt: z.date(),
});
export type Plan = z.infer<typeof PlanSchema>;

export const ArtifactBaseSchema = z.object({
  id: z.string(),
  runId: z.string(),
  hook: z.string(),
  body: z.string(),
  hashtags: z.array(z.string()),
  tags: z.array(z.string()),
  suggestedPostTime: z.date().optional(),
  productionToolSuggestions: z.array(z.string()),
  provenance: z.object({
    planClaimIds: z.array(z.string()),
  }),
  createdAt: z.date(),
});

export const ArtifactYtLongSchema = ArtifactBaseSchema.extend({
  format: z.literal('yt-long'),
  thumbnailDirections: z.string(),
});
export const ArtifactYtShortsSchema = ArtifactBaseSchema.extend({
  format: z.literal('yt-shorts'),
  audioSuggestions: z.string(),
});
export const ArtifactIgReelSchema = ArtifactBaseSchema.extend({
  format: z.literal('ig-reel'),
  durationSeconds: z.number().min(5).max(90),
  editDirections: z.string(),
  audioSuggestions: z.string(),
});
export const ArtifactLinkedinSchema = ArtifactBaseSchema.extend({
  format: z.literal('linkedin'),
});
export const ArtifactXThreadSchema = ArtifactBaseSchema.extend({
  format: z.literal('x-thread'),
  tweets: z.array(z.string()),
});
export const ArtifactCaptionsSchema = ArtifactBaseSchema.extend({
  format: z.literal('captions'),
});

export const ArtifactSchema = z.discriminatedUnion('format', [
  ArtifactYtLongSchema,
  ArtifactYtShortsSchema,
  ArtifactIgReelSchema,
  ArtifactLinkedinSchema,
  ArtifactXThreadSchema,
  ArtifactCaptionsSchema,
]);
export type Artifact = z.infer<typeof ArtifactSchema>;
export type ArtifactFormat = Artifact['format'];

export const ScheduleEntryStatusSchema = z.enum(['pending', 'published', 'failed']);

export const ScheduleEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  artifactId: z.string(),
  platform: SocialPlatformSchema,
  scheduledFor: z.date(),
  status: ScheduleEntryStatusSchema,
  calendarEventId: z.string().optional(),
});
export type ScheduleEntry = z.infer<typeof ScheduleEntrySchema>;

export const PublicationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  artifactId: z.string(),
  platform: SocialPlatformSchema,
  publishedAt: z.date(),
  engagementSamples: z.array(z.object({
    sampledAt: z.date(),
    views: z.number().default(0),
    likes: z.number().default(0),
    comments: z.number().default(0),
    shares: z.number().default(0),
  })),
});
export type Publication = z.infer<typeof PublicationSchema>;

export const FeedbackEventBaseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.date(),
});

export const FeedbackEventSchema = z.discriminatedUnion('type', [
  FeedbackEventBaseSchema.extend({ type: z.literal('explicit_edit'), artifactId: z.string(), original: z.string(), edited: z.string() }),
  FeedbackEventBaseSchema.extend({ type: z.literal('explicit_rating'), artifactId: z.string(), rating: z.number() }),
  FeedbackEventBaseSchema.extend({ type: z.literal('implicit_engagement'), publicationId: z.string(), performanceScore: z.number() }),
]);
export type FeedbackEvent = z.infer<typeof FeedbackEventSchema>;

export const UsageRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  day: z.string(),
  tokens: z.number().default(0),
  estimatedUsd: z.number().default(0),
  quotaUnits: z.number().default(0),
});
export type UsageRecord = z.infer<typeof UsageRecordSchema>;
