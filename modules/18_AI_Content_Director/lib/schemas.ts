import { z } from "zod";

// Stage 1: Research Schema
export const SourceItemSchema = z.object({
  title: z.string().default("Reference Link"),
  url: z.string().default("#"),
  snippet: z.string().default(""),
});

export const ResearchDataSchema = z.object({
  topicOverview: z.string().min(1, "Topic overview is required"),
  keyFacts: z.array(z.string()).min(1, "At least one key fact required"),
  statistics: z.array(
    z.object({
      stat: z.string(),
      context: z.string(),
      source: z.string().optional(),
    })
  ),
  trends: z.array(z.string()),
  commonQuestions: z.array(z.string()),
  audiencePainPoints: z.array(z.string()),
  sources: z.array(SourceItemSchema).default([]),
});

// Stage 2: Angles Schema
export const AngleItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  hook: z.string(),
  targetEmotion: z.string(),
  difficultyScore: z.number().min(1).max(10),
  uniquenessScore: z.number().min(1).max(10),
  description: z.string(),
  targetAudienceFit: z.string(),
});

export const AnglesDataSchema = z.object({
  angles: z.array(AngleItemSchema).min(3, "At least 3 content angles required"),
  selectedAngleId: z.string().optional(),
});

// Stage 3: Narrative Schema
export const StoryBeatSchema = z.object({
  act: z.string(),
  beatTitle: z.string(),
  timing: z.string(),
  goal: z.string(),
  emotionalArc: z.string(),
  keyPoint: z.string(),
});

export const NarrativeDataSchema = z.object({
  framework: z.string(),
  coreTheme: z.string(),
  targetPacing: z.string(),
  estimatedTotalMinutes: z.number().default(5),
  beats: z.array(StoryBeatSchema).min(2, "At least 2 beats required"),
});

// Stage 4: Script Schema
export const ScriptSectionSchema = z.object({
  id: z.string(),
  sectionType: z.enum(["hook", "intro", "body", "cta"]),
  title: z.string(),
  spokenText: z.string(),
  durationSec: z.number(),
  deliveryNotes: z.string(),
});

export const ScriptDataSchema = z.object({
  tone: z.string(),
  totalWordCount: z.number(),
  estimatedDurationSec: z.number(),
  estimatedDurationFormatted: z.string(),
  sections: z.array(ScriptSectionSchema).min(2, "At least 2 script sections required"),
});

// Stage 5: Visuals & B-roll Schema
export const VisualSectionItemSchema = z.object({
  sectionId: z.string(),
  sectionTitle: z.string(),
  onScreenVisuals: z.string(),
  imageUrl: z.string().optional(),
  videoPreviewBadge: z.string().optional(),
  bRollIdeas: z.array(z.string()),
  stockKeywords: z.array(z.string()),
  graphicsOverlays: z.array(z.string()),
  musicMood: z.string(),
  tamilComedyMeme: z
    .object({
      comedian: z.string(),
      movieRef: z.string(),
      iconicDialogue: z.string(),
      memeContext: z.string(),
    })
    .optional(),
});

export const VisualsDataSchema = z.object({
  overallMood: z.string(),
  colorPaletteSuggestion: z.string(),
  musicPacing: z.string(),
  items: z.array(VisualSectionItemSchema).min(1, "At least one visual section required"),
});

// Stage 6: Shot List Schema
export const ShotItemSchema = z.object({
  id: z.string(),
  shotNumber: z.number(),
  scene: z.string(),
  shotType: z.enum([
    "Extreme Wide",
    "Wide",
    "Medium Shot",
    "Close-Up",
    "Extreme Close-Up",
    "Over-the-Shoulder",
    "Point-of-View",
    "Screen Share",
  ]),
  cameraMovement: z.enum([
    "Static",
    "Pan",
    "Tilt",
    "Slow Push-in",
    "Pull-out",
    "Handheld",
    "Tracking",
    "Drone/Crane",
  ]),
  locationSetup: z.string(),
  dialogueVo: z.string(),
  duration: z.string(),
  notes: z.string(),
  isCompleted: z.boolean().optional().default(false),
});

export const ShotListDataSchema = z.object({
  totalShots: z.number(),
  estimatedShootHours: z.string(),
  locationSummary: z.array(z.string()),
  shots: z.array(ShotItemSchema).min(1, "At least one shot is required"),
});

// Stage 7: Publishing Copy Schema
export const ThumbnailConceptSchema = z.object({
  mainText: z.string(),
  visualConcept: z.string(),
  colorContrast: z.string(),
});

export const PlatformCaptionsSchema = z.object({
  youtube: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
  }),
  instagramReels: z.object({
    caption: z.string(),
    hashtags: z.array(z.string()),
  }),
  tiktok: z.object({
    caption: z.string(),
    soundIdea: z.string(),
    hashtags: z.array(z.string()),
  }),
  linkedin: z.object({
    hook: z.string(),
    postBody: z.string(),
    callToDiscussion: z.string(),
  }),
  x: z.object({
    thread: z.array(z.string()),
  }),
});

export const PublishingDataSchema = z.object({
  titleOptions: z.array(z.string()).min(3),
  seoDescription: z.string(),
  hashtags: z.array(z.string()),
  tags: z.array(z.string()),
  thumbnailIdeas: z.array(ThumbnailConceptSchema),
  captions: PlatformCaptionsSchema,
  referenceVideos: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        channel: z.string(),
        url: z.string(),
        views: z.string(),
        whyItWorks: z.string(),
        thumbnailUrl: z.string(),
        tag: z.string(),
      })
    )
    .optional(),
  sampleVideoSummary: z.string().optional(),
});

// Pipeline Request API Schema
export const GenerateStageRequestSchema = z.object({
  stageNumber: z.number().min(1).max(7),
  projectMetadata: z.object({
    id: z.string(),
    title: z.string(),
    topic: z.string().min(3, "Topic must be at least 3 characters"),
    platform: z.enum(["instagram", "youtube", "shorts", "tiktok", "linkedin", "podcast"]),
    targetDuration: z.string(),
    targetAudience: z.string(),
    tone: z.string(),
    language: z.string().default("English"),
  }),
  previousStages: z.object({
    research: ResearchDataSchema.optional(),
    angles: AnglesDataSchema.optional(),
    narrative: NarrativeDataSchema.optional(),
    script: ScriptDataSchema.optional(),
    visuals: VisualsDataSchema.optional(),
    shotList: ShotListDataSchema.optional(),
  }).optional(),
  userGuidance: z.string().optional(),
});

export type GenerateStageRequest = z.infer<typeof GenerateStageRequestSchema>;
