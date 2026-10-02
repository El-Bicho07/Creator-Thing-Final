export type IntentType = 
  | 'question'
  | 'request'
  | 'confusion'
  | 'pain_point'
  | 'criticism'
  | 'praise'
  | 'more_of_this'
  | 'other';

export type IdeaStatus = 'new' | 'saved' | 'planned' | 'posted';
export type GapStatus = 'new_opportunity' | 'already_covered';
export type FormatType = 'reel' | 'carousel' | 'story' | 'Reel' | 'Carousel' | 'Story';

export interface EvidenceComment {
  comment_id: string;
  username: string;
  text: string;
  clean_text?: string;
  likes: number;
  reply_count: number;
  timestamp: string;
  post_id?: string;
  post_format?: string;
  has_share_mention?: boolean;
  intent?: string;
}

export interface SlideItem {
  slide_number: number;
  title: string;
  visual: string;
  content: string;
}

export interface StoryValidation {
  type: 'poll' | 'question';
  prompt: string;
  options?: string[];
  sticker_preview: string;
}

export interface ReplyDraft {
  id: string;
  idea_id: string;
  comment_id: string;
  username: string;
  reply_text: string;
  created_at?: string;
}

export interface Idea {
  id: string;
  job_id: string;
  cluster_id: number;
  cluster_name?: string;
  title: string;
  hook: string;
  format: string; // reel, carousel, story
  caption_draft: string;
  why_now: string;
  demand_score: number;
  status: IdeaStatus;
  gap_status: GapStatus;
  gap_similarity: number;
  gap_matched_post?: string;
  
  // Instagram-Native Granular Fields
  suggested_length?: string;
  on_screen_text?: string;
  slide_outline?: SlideItem[];
  story_validation?: StoryValidation;
  hashtags?: string[];
  story_mention_caption?: string;
  
  // Evidence & Responses
  supporting_comment_ids: string[];
  evidence_comments: EvidenceComment[];
  replies: ReplyDraft[];
  created_at?: string;
}

export interface Cluster {
  id: number;
  cluster_id: number;
  job_id: string;
  name: string;
  description?: string;
  comment_count: number;
  unique_commenters_count: number;
  total_likes: number;
  total_replies: number;
  demand_score: number;
  intent_breakdown: Record<string, number>;
  top_comment_ids: string[];
}

export interface IntentDistributionItem {
  intent: string;
  count: number;
  percentage: number;
  color?: string;
}

export interface TopThemeItem {
  cluster_id: number;
  name: string;
  demand_score: number;
  comment_count: number;
  unique_commenters: number;
  total_likes: number;
  total_replies: number;
}

export interface TimelinePoint {
  date: string;
  comment_count: number;
  likes_count: number;
}

export interface FormatIntentMatrixItem {
  format: string;
  total_comments: number;
  intent_counts: Record<string, number>;
  top_intent: string;
  share_mentions: number;
}

export interface InsightsResponse {
  total_raw_comments: number;
  total_cleaned_comments: number;
  spam_filtered_count: number;
  intent_distribution: IntentDistributionItem[];
  top_themes: TopThemeItem[];
  timeline: TimelinePoint[];
  opportunity_stats: {
    new_opportunity: number;
    already_covered: number;
  };
  format_intent_matrix?: FormatIntentMatrixItem[];
  format_takeaways?: string[];
}

export interface CalendarEvent {
  id: string;
  idea_id: string;
  scheduled_date: string;
  notes?: string;
  created_at?: string;
  idea?: Idea;
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  error_message?: string;
  stats?: {
    total_raw?: number;
    total_cleaned?: number;
    spam_filtered?: number;
    clusters_count?: number;
    ideas_count?: number;
    replies_count?: number;
    new_opportunities?: number;
    already_covered?: number;
  };
}

export interface FullReplyDraftItem {
  id: string;
  idea_id: string;
  idea_title: string;
  idea_format: string;
  idea_status: string;
  comment_id: string;
  username: string;
  original_comment_text: string;
  reply_text: string;
}
