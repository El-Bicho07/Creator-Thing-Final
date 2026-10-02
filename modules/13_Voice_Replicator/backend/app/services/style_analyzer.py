from typing import List, Dict, Any
from collections import Counter
import numpy as np

class StyleAnalyzer:
    @staticmethod
    def aggregate_style_profile(posts_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not posts_data:
            return StyleAnalyzer._get_empty_profile()

        total_posts = len(posts_data)
        
        # Collect metric lists
        word_counts = []
        sentence_lengths = []
        paragraph_counts = []
        
        formality_scores = []
        conversational_scores = []
        educational_scores = []
        promotional_scores = []
        storytelling_scores = []
        
        emoji_counts = []
        all_emojis = []
        
        hashtag_counts = []
        all_hashtags = []
        
        cta_counts = 0
        cta_phrases = []
        
        line_breaks = []
        bullet_count = 0
        
        structures = []
        vocabulary = Counter()
        
        aspect_ratios = []
        brightnesses = []
        all_colors = []

        for post in posts_data:
            tf = post.get("text_features") or {}
            vf = post.get("visual_features") or {}
            
            w_count = tf.get("word_count", 0)
            if w_count > 0:
                word_counts.append(w_count)
                
            s_len = tf.get("avg_sentence_length", 0)
            if s_len > 0:
                sentence_lengths.append(s_len)
                
            p_count = tf.get("paragraph_count", 0)
            if p_count > 0:
                paragraph_counts.append(p_count)
                
            formality_scores.append(tf.get("formality_score", 0.5))
            conversational_scores.append(tf.get("conversational_score", 0.5))
            educational_scores.append(tf.get("educational_score", 0.5))
            promotional_scores.append(tf.get("promotional_score", 0.2))
            storytelling_scores.append(tf.get("storytelling_score", 0.3))
            
            e_count = tf.get("emoji_count", 0)
            emoji_counts.append(e_count)
            all_emojis.extend(tf.get("emojis", []))
            
            h_count = tf.get("hashtag_count", 0)
            hashtag_counts.append(h_count)
            all_hashtags.extend(tf.get("hashtags", []))
            
            if tf.get("has_cta"):
                cta_counts += 1
                if tf.get("cta_phrase"):
                    cta_phrases.append(tf.get("cta_phrase"))
                    
            line_breaks.append(tf.get("line_break_count", 0))
            if tf.get("has_bullet_points"):
                bullet_count += 1
                
            struct = tf.get("structure_components", [])
            if struct:
                structures.append(tuple(struct))
                
            # Words / Keywords
            caption_words = post.get("caption", "").lower().split()
            for w in caption_words:
                cleaned = "".join(c for c in w if c.isalnum())
                if len(cleaned) > 4 and cleaned not in {"about", "there", "their", "would", "could", "should", "where", "these", "other"}:
                    vocabulary[cleaned] += 1
                    
            if vf.get("aspect_ratio"):
                aspect_ratios.append(vf.get("aspect_ratio"))
            if vf.get("brightness"):
                brightnesses.append(vf.get("brightness"))
            all_colors.extend(vf.get("dominant_colors", []))

        # Calculate averages & ranges
        avg_words = int(np.mean(word_counts)) if word_counts else 120
        min_words = int(np.percentile(word_counts, 25)) if word_counts else 80
        max_words = int(np.percentile(word_counts, 75)) if word_counts else 160
        
        avg_sentence = round(float(np.mean(sentence_lengths)), 1) if sentence_lengths else 14.0
        avg_paragraphs = round(float(np.mean(paragraph_counts)), 1) if paragraph_counts else 3.0

        top_emojis = [e for e, _ in Counter(all_emojis).most_common(5)]
        top_hashtags = [h for h, _ in Counter(all_hashtags).most_common(6)]
        top_cta_phrases = [c for c, _ in Counter(cta_phrases).most_common(4)]
        top_keywords = [k for k, _ in vocabulary.most_common(10)]

        common_struct_tuples = [list(st) for st, _ in Counter(structures).most_common(3)]
        if not common_struct_tuples:
            common_struct_tuples = [["hook", "body", "takeaway", "cta"]]

        top_colors = [col for col, _ in Counter(all_colors).most_common(4)]

        return {
            "tone_scores": {
                "formality": round(float(np.mean(formality_scores)), 2),
                "conversational": round(float(np.mean(conversational_scores)), 2),
                "educational": round(float(np.mean(educational_scores)), 2),
                "promotional": round(float(np.mean(promotional_scores)), 2),
                "storytelling": round(float(np.mean(storytelling_scores)), 2),
            },
            "caption_stats": {
                "average_word_count": avg_words,
                "preferred_range": [min_words, max_words],
                "average_sentence_length": avg_sentence,
                "avg_paragraph_count": avg_paragraphs,
            },
            "formatting_patterns": {
                "short_paragraphs": avg_paragraphs >= 2.5,
                "line_break_frequency": round(float(np.mean(line_breaks)) / max(1, avg_paragraphs), 2),
                "bullet_list_frequency": round(bullet_count / max(1, total_posts), 2),
                "capitalization_style": "sentence_case",
            },
            "emoji_profile": {
                "frequency": round(float(np.mean(emoji_counts)) / max(1, avg_words) * 10, 2),
                "avg_count": round(float(np.mean(emoji_counts)), 1),
                "top_emojis": top_emojis,
            },
            "hashtag_profile": {
                "avg_count": round(float(np.mean(hashtag_counts)), 1),
                "common_hashtags": top_hashtags,
            },
            "cta_profile": {
                "frequency": round(cta_counts / max(1, total_posts), 2),
                "common_phrases": top_cta_phrases,
            },
            "common_structures": common_struct_tuples,
            "vocabulary_profile": {
                "top_keywords": top_keywords,
                "frequent_phrases": [],
            },
            "visual_profile": {
                "avg_aspect_ratio": round(float(np.mean(aspect_ratios)), 2) if aspect_ratios else 1.0,
                "dominant_colors": top_colors if top_colors else ["#4F46E5", "#1E1B4B"],
                "avg_brightness": round(float(np.mean(brightnesses)), 2) if brightnesses else 0.6,
            }
        }

    @staticmethod
    def _get_empty_profile() -> Dict[str, Any]:
        return {
            "tone_scores": {"formality": 0.5, "conversational": 0.5, "educational": 0.5, "promotional": 0.2, "storytelling": 0.3},
            "caption_stats": {"average_word_count": 120, "preferred_range": [80, 160], "average_sentence_length": 14.0, "avg_paragraph_count": 3.0},
            "formatting_patterns": {"short_paragraphs": True, "line_break_frequency": 0.7, "bullet_list_frequency": 0.3, "capitalization_style": "sentence_case"},
            "emoji_profile": {"frequency": 0.3, "avg_count": 2.0, "top_emojis": ["🚀", "💡"]},
            "hashtag_profile": {"avg_count": 5.0, "common_hashtags": ["#instagram", "#content"]},
            "cta_profile": {"frequency": 0.6, "common_phrases": ["Comment below"]},
            "common_structures": [["hook", "body", "takeaway", "cta"]],
            "vocabulary_profile": {"top_keywords": [], "frequent_phrases": []},
            "visual_profile": {"avg_aspect_ratio": 1.0, "dominant_colors": ["#4F46E5", "#1E1B4B"], "avg_brightness": 0.6},
        }
