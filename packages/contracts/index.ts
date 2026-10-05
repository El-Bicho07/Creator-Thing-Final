// Creator Platform SaaS - Shared TypeScript Contracts
// Auto-generated from FastAPI Pydantic models

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface CreatorProfile {
  id: string;
  user_id: string;
  full_name: string;
  niche: string;
  target_audience: string;
  primary_platform: string;
  content_goals: string[];
  created_at: string;
  updated_at: string;
}

export interface VoiceProfile {
  id: string;
  user_id: string;
  style_name: string;
  pacing_score: number;
  vocabulary_richness: number;
  tone_fingerprint: Record<string, unknown>;
  formatting_rules: string[];
  forbidden_words: string[];
  sample_texts: string[];
  created_at: string;
  updated_at: string;
}

export interface ContentAsset {
  id: string;
  user_id: string;
  title: string;
  source_type: string;
  external_id?: string;
  raw_text: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Chunk {
  id: string;
  user_id: string;
  asset_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  angle?: string;
  target_format?: string;
  status: 'backlog' | 'planned' | 'studio' | 'published';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PlanItem {
  id: string;
  user_id: string;
  plan_date: string;
  idea_id?: string;
  title: string;
  platform: string;
  priority: number;
  estimated_minutes: number;
  completed: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PerformanceRecord {
  id: string;
  user_id: string;
  asset_id?: string;
  platform: string;
  views: number;
  likes: number;
  comments_count: number;
  shares: number;
  published_at?: string;
  recorded_at: string;
  metadata: Record<string, unknown>;
}

export interface Comment {
  id: string;
  user_id: string;
  asset_id?: string;
  comment_text: string;
  author_hash?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  posted_at: string;
  metadata: Record<string, unknown>;
}

export interface CommentInsight {
  id: string;
  user_id: string;
  category?: string;
  summary: string;
  extracted_questions: string[];
  actionable_idea?: string;
  created_at: string;
}

export interface Lesson {
  id: string;
  user_id: string;
  source_feature: string;
  insight_summary: string;
  actionable_rule: string;
  applied_count: number;
  created_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  job_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total: number;
  error_message?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AICall {
  id: string;
  user_id: string;
  feature: string;
  provider: string;
  model: string;
  prompt_version: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  latency_ms: number;
  success: boolean;
  error_message?: string;
  created_at: string;
}

// API Request/Response types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface HealthResponse {
  status: string;
  service: string;
  version?: string;
}

// Feature-specific types
export interface DailyPlan {
  recommended_plan: PlanItemDraft[];
  fallback_ideas: string[];
  total_estimated_minutes: number;
}

export interface PlanItemDraft {
  title: string;
  platform: string;
  priority: 'high' | 'medium' | 'low';
  estimated_minutes: number;
  stages: string[];
  rationale: string;
}

export interface StudioSession {
  id: string;
  title: string;
  status: 'draft' | 'in_progress' | 'completed';
  current_stage: string;
  progress: number;
  platform: string;
  stages: StudioStage[];
  created_at: string;
  updated_at: string;
}

export interface StudioStage {
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  output?: string;
}

export interface VoiceAnalysisResult {
  pacing_score: number;
  vocabulary_richness: number;
  tone_keywords: string[];
  sentence_style: string;
  formatting_habits: string[];
  forbidden_words: string[];
}

export interface MemorySearchResult {
  chunks: Chunk[];
  assets: ContentAsset[];
  query: string;
}

export interface CommentAnalysisResult {
  themes: CommentTheme[];
  sentiment_summary: SentimentSummary;
  actionable_insights: string[];
}

export interface CommentTheme {
  theme: string;
  count: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  examples: string[];
}

export interface SentimentSummary {
  positive: number;
  neutral: number;
  negative: number;
}

export interface ScorecardResult {
  hook_strength: number;
  pacing_flow: number;
  voice_match: number;
  value_delivery: number;
  overall: number;
  feedback: string[];
}

export interface ContentOpportunity {
  title: string;
  source: string;
  potential: 'high' | 'medium' | 'low';
  format: string;
}