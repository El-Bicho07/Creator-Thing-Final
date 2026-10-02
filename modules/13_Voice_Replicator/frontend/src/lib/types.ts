export interface Project {
  id: string;
  name: string;
  creator_handle?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  post_count: number;
  has_style_profile: boolean;
}

export interface PostTextFeatures {
  char_count: number;
  word_count: number;
  sentence_count: number;
  paragraph_count: number;
  avg_sentence_length: number;
  avg_word_length: number;
  punctuation_counts: Record<string, number>;
  emoji_count: number;
  emojis: string[];
  hashtag_count: number;
  has_cta: boolean;
  cta_phrase?: string;
  first_person_ratio: number;
  second_person_ratio: number;
  formality_score: number;
  conversational_score: number;
  educational_score: number;
  promotional_score: number;
  storytelling_score: number;
  structure_components: string[];
}

export interface PostVisualFeatures {
  width?: number;
  height?: number;
  aspect_ratio?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  dominant_colors: string[];
  text_area_ratio: number;
  ocr_text?: string;
}

export interface Post {
  id: string;
  project_id: string;
  original_id?: string;
  caption: string;
  hashtags: string[];
  media_path?: string;
  post_type: string;
  published_at?: string;
  created_at: string;
  text_features?: PostTextFeatures;
  visual_features?: PostVisualFeatures;
}

export interface StyleProfile {
  id: string;
  project_id: string;
  tone_scores: {
    formality: number;
    conversational: number;
    educational: number;
    promotional: number;
    storytelling: number;
  };
  caption_stats: {
    average_word_count: number;
    preferred_range: [number, number];
    average_sentence_length: number;
    avg_paragraph_count: number;
  };
  formatting_patterns: {
    short_paragraphs: boolean;
    line_break_frequency: number;
    bullet_list_frequency: number;
    capitalization_style: string;
  };
  emoji_profile: {
    frequency: number;
    avg_count: number;
    top_emojis: string[];
  };
  hashtag_profile: {
    avg_count: number;
    common_hashtags: string[];
  };
  cta_profile: {
    frequency: number;
    common_phrases: string[];
  };
  common_structures: string[][];
  vocabulary_profile: {
    top_keywords: string[];
    frequent_phrases: string[];
  };
  visual_profile: {
    avg_aspect_ratio: number;
    dominant_colors: string[];
    avg_brightness: number;
  };
  created_at: string;
  updated_at: string;
}

export interface GenerationRequest {
  topic: string;
  post_type?: string;
  cta_requirement?: string;
  desired_length?: string;
  custom_instructions?: string;
}

export interface SlideContent {
  title: string;
  body: string;
}

export interface GeneratedDraft {
  id: string;
  project_id: string;
  topic: string;
  post_type: string;
  hook: string;
  caption: string;
  cta?: string;
  hashtags: string[];
  slides?: SlideContent[];
  created_at: string;
}

export interface ValidationResult {
  id: string;
  draft_id: string;
  overall_score: number;
  metrics_breakdown: {
    tone: number;
    length: number;
    structure: number;
    emoji_usage: number;
    hashtag_usage: number;
    cta: number;
  };
  originality_status: "PASS" | "FLAG" | "REJECT";
  max_ngram_overlap: number;
  flagged_phrases: string[];
  retrieved_examples_used: string[];
  created_at: string;
}
