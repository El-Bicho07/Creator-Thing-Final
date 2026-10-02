export interface KeyFact {
  id: number;
  fact: string;
  why: string;
  source: string;
  dataMetric?: string;
}

export interface ContentAngle {
  id: string;
  angle: string;
  desc: string;
  hook: string;
  saveTrigger: string;
}

export interface ReelConcept {
  id: string;
  title: string;
  formatType: string;
  hook: string;
  pacingSeconds: string;
  points: string[];
  onScreenTextCues: string[];
  cta: string;
  dmKeyword: string;
  audioRecommendation: string;
}

export interface CarouselSlide {
  number: number;
  slideType: string;
  title: string;
  description: string;
  visualNote: string;
}

export interface CarouselConcept {
  id: string;
  title: string;
  formatType: string;
  slides: CarouselSlide[];
}

export interface StoryPrompt {
  id: string;
  type: string;
  prompt: string;
  options?: string[];
  answer?: string;
  stickerStyle: string;
}

export interface CaptionIdea {
  id: string;
  category: string;
  text: string;
  hashtags: string[];
  seoKeywords: string[];
}

export interface HookIdea {
  id: string;
  category: string;
  text: string;
  triggerType: string;
}

export interface SourceItem {
  id: string;
  title: string;
  publisher: string;
  date?: string;
  type: string;
  desc: string;
  url: string;
}

export interface ContentOutline {
  hook: string;
  introduction: string;
  keyPoint1: string;
  keyPoint2: string;
  keyPoint3: string;
  example: string;
  takeaway: string;
  cta: string;
}

export interface TrendingAudioRec {
  title: string;
  artistOrVibe: string;
  tempo: string;
  whyItWorks: string;
}

export interface SocialSeoStrategy {
  primaryKeyword: string;
  onScreenKeywords: string[];
  recommendedTags: string[];
  dmAutomationKeyword: string;
}

export interface ResearchResult {
  topic: string;
  niche: string;
  summary: string;
  takeaways: string[];
  facts: KeyFact[];
  angles: ContentAngle[];
  sources: SourceItem[];
  questionInquiry?: string;
  searchEngineSource?: 'live_web' | 'gemini_grounded' | 'knowledge_base';
  reels?: ReelConcept[];
  carousels?: CarouselConcept[];
  stories?: StoryPrompt[];
  captions?: CaptionIdea[];
  hooks?: HookIdea[];
  outline?: ContentOutline;
  trendingAudio?: TrendingAudioRec[];
  socialSeo?: SocialSeoStrategy;
}
