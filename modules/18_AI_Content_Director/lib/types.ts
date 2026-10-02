export type Platform = 'instagram' | 'youtube' | 'shorts' | 'tiktok' | 'linkedin' | 'podcast';

export type Tone = 'casual' | 'professional' | 'funny' | 'cinematic' | 'educational' | 'inspirational';

export interface ProjectMetadata {
  id: string;
  title: string;
  topic: string;
  platform: Platform;
  targetDuration: string;
  targetAudience: string;
  tone: Tone | string;
  language: string;
  createdAt: string;
  updatedAt: string;
  currentStage: number; // 1 to 7
  completedStages: number[]; // e.g. [1, 2]
}

// Stage 1: Research
export interface SourceItem {
  title: string;
  url: string;
  snippet: string;
}

export interface ResearchData {
  topicOverview: string;
  keyFacts: string[];
  statistics: {
    stat: string;
    context: string;
    source?: string;
  }[];
  trends: string[];
  commonQuestions: string[];
  audiencePainPoints: string[];
  sources: SourceItem[];
}

// Stage 2: Angles
export interface AngleItem {
  id: string;
  title: string;
  hook: string;
  targetEmotion: string;
  difficultyScore: number; // 1-10
  uniquenessScore: number; // 1-10
  description: string;
  targetAudienceFit: string;
}

export interface AnglesData {
  angles: AngleItem[];
  selectedAngleId?: string;
}

// Stage 3: Narrative
export interface StoryBeat {
  act: string; // e.g. "Act 1: The Inciting Reality"
  beatTitle: string;
  timing: string; // e.g. "0:00 - 0:45"
  goal: string;
  emotionalArc: string;
  keyPoint: string;
}

export interface NarrativeData {
  framework: string; // e.g., "Problem-Agitate-Solve", "Hero's Journey", "Myth-Busting", "Listicle"
  coreTheme: string;
  targetPacing: string;
  estimatedTotalMinutes: number;
  beats: StoryBeat[];
}

// Stage 4: Script
export interface ScriptSection {
  id: string;
  sectionType: 'hook' | 'intro' | 'body' | 'cta';
  title: string;
  spokenText: string;
  durationSec: number;
  deliveryNotes: string;
}

export interface ScriptData {
  tone: Tone | string;
  totalWordCount: number;
  estimatedDurationSec: number;
  estimatedDurationFormatted: string;
  sections: ScriptSection[];
}

export interface TamilComedyMeme {
  comedian: string; // e.g. "Vadivelu", "Santhanam", "Goundamani", "Vivek", "Yogi Babu"
  movieRef: string; // e.g. "Winner", "Chandramukhi", "Boss Engira Bhaskaran"
  iconicDialogue: string; // e.g. "Venaam... Valikidhu... Azhudhuduven!", "Building strong-u, basement weak-u!"
  memeContext: string; // how to use this comedy cutaway in the video
  imageUrl?: string;
  situation?: string;
}

export interface MemeTemplate {
  id: string;
  name: string;
  character: string;
  category: "tamil" | "universal";
  movieOrOrigin: string;
  defaultTopText: string;
  defaultBottomText: string;
  iconicDialogue: string;
  imageUrl: string;
  situations: string[];
  vibe: string;
}

export type TopicCategory =
  | "food"
  | "tech"
  | "education"
  | "fitness"
  | "finance"
  | "entertainment"
  | "travel"
  | "fashion"
  | "general";

// Stage 5: Visuals & B-roll
export interface VisualSectionItem {
  sectionId: string;
  sectionTitle: string;
  onScreenVisuals: string;
  imageUrl?: string;
  videoPreviewBadge?: string;
  bRollIdeas: string[];
  stockKeywords: string[];
  graphicsOverlays: string[];
  musicMood: string;
  tamilComedyMeme?: TamilComedyMeme;
}

export interface VisualsData {
  overallMood: string;
  colorPaletteSuggestion: string;
  musicPacing: string;
  items: VisualSectionItem[];
}

// Stage 6: Shot List
export interface ShotItem {
  id: string;
  shotNumber: number;
  scene: string;
  shotType: 'Extreme Wide' | 'Wide' | 'Medium Shot' | 'Close-Up' | 'Extreme Close-Up' | 'Over-the-Shoulder' | 'Point-of-View' | 'Screen Share';
  cameraMovement: 'Static' | 'Pan' | 'Tilt' | 'Slow Push-in' | 'Pull-out' | 'Handheld' | 'Tracking' | 'Drone/Crane';
  locationSetup: string;
  dialogueVo: string;
  duration: string;
  notes: string;
  isCompleted?: boolean;
}

export interface ShotListData {
  totalShots: number;
  estimatedShootHours: string;
  locationSummary: string[];
  shots: ShotItem[];
}

// Stage 7: Publishing Copy
export interface ThumbnailConcept {
  mainText: string;
  visualConcept: string;
  colorContrast: string;
}

export interface ReferenceVideoItem {
  id: string;
  title: string;
  channel: string;
  url: string;
  views: string;
  whyItWorks: string;
  thumbnailUrl: string;
  tag: string;
}

export interface PlatformCaptions {
  youtube: {
    title: string;
    description: string;
    tags: string[];
  };
  instagramReels: {
    caption: string;
    hashtags: string[];
  };
  tiktok: {
    caption: string;
    soundIdea: string;
    hashtags: string[];
  };
  linkedin: {
    hook: string;
    postBody: string;
    callToDiscussion: string;
  };
  x: {
    thread: string[];
  };
}

export interface PublishingData {
  titleOptions: string[];
  seoDescription: string;
  hashtags: string[];
  tags: string[];
  thumbnailIdeas: ThumbnailConcept[];
  captions: PlatformCaptions;
  referenceVideos?: ReferenceVideoItem[];
  sampleVideoSummary?: string;
}

// Full Pipeline Project
export interface Project extends ProjectMetadata {
  research?: ResearchData;
  angles?: AnglesData;
  narrative?: NarrativeData;
  script?: ScriptData;
  visuals?: VisualsData;
  shotList?: ShotListData;
  publishing?: PublishingData;
}

export type StageKey = 'research' | 'angles' | 'narrative' | 'script' | 'visuals' | 'shotList' | 'publishing';

export interface StageInfo {
  number: number;
  key: StageKey;
  title: string;
  shortDesc: string;
  icon: string;
  directorTip: string;
}
