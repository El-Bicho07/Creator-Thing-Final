import json
from typing import Dict, Any, List

class PromptBuilder:
    @staticmethod
    def build_generation_prompt(
        style_profile: Dict[str, Any],
        relevant_examples: List[Dict[str, Any]],
        topic: str,
        post_type: str = "educational",
        cta_requirement: str = None,
        desired_length: str = "medium",
        custom_instructions: str = None
    ) -> str:
        
        caption_stats = style_profile.get("caption_stats", {})
        preferred_word_count = caption_stats.get("average_word_count", 120)
        
        emoji_prof = style_profile.get("emoji_profile", {})
        hashtag_prof = style_profile.get("hashtag_profile", {})
        cta_prof = style_profile.get("cta_profile", {})
        tone_scores = style_profile.get("tone_scores", {})
        common_structures = style_profile.get("common_structures", [["hook", "body", "cta"]])

        # Format retrieved historical examples
        formatted_examples = []
        for i, ex in enumerate(relevant_examples, 1):
            formatted_examples.append(
                f"--- EXAMPLE {i} (Similarity: {ex.get('similarity_score', 0.8):.2f}) ---\n"
                f"Type: {ex.get('post_type')}\n"
                f"Caption:\n{ex.get('caption')}\n"
                f"Hashtags: {' '.join(ex.get('hashtags', []))}\n"
            )
        examples_str = "\n".join(formatted_examples) if formatted_examples else "No historical examples available."

        prompt = f"""You are an expert Instagram Content Assistant generating a new Instagram post for a specific creator.

Your goal is to adopt the creator's exact WRITING VOICE, TONE, STRUCTURAL PATTERNS, and FORMATTING preferences based on their established Style Profile and Historical Examples.

=== CREATOR STYLE PROFILE ===
- Primary Tone Scores: Formality={tone_scores.get('formality', 0.5)}, Conversational={tone_scores.get('conversational', 0.5)}, Educational={tone_scores.get('educational', 0.5)}, Promotional={tone_scores.get('promotional', 0.2)}, Storytelling={tone_scores.get('storytelling', 0.3)}
- Target Word Count: ~{preferred_word_count} words (Range: {caption_stats.get('preferred_range', [80, 160])[0]}-{caption_stats.get('preferred_range', [80, 160])[1]} words)
- Avg Sentence Length: {caption_stats.get('average_sentence_length', 14)} words
- Formatting: Short paragraphs={style_profile.get('formatting_patterns', {}).get('short_paragraphs', True)}, Line break frequency={style_profile.get('formatting_patterns', {}).get('line_break_frequency', 0.7)}
- Emoji Usage: Avg {emoji_prof.get('avg_count', 2)} per post. Common emojis: {', '.join(emoji_prof.get('top_emojis', ['🚀', '💡']))}
- Hashtag Behavior: Avg {hashtag_prof.get('avg_count', 5)} per post. Common hashtags: {', '.join(hashtag_prof.get('common_hashtags', []))}
- Typical Structure Template: {" -> ".join(common_structures[0] if common_structures else ['hook', 'body', 'cta'])}

=== TOPIC & USER CONSTRAINTS ===
- Topic: {topic}
- Requested Post Type: {post_type}
- Target Length: {desired_length}
- CTA Requirement: {cta_requirement or 'Follow creator typical CTA style'}
- Additional Instructions: {custom_instructions or 'None'}

=== RELEVANT HISTORICAL EXAMPLES FROM THIS CREATOR ===
{examples_str}

=== STRICT ORIGINALITY CONSTRAINTS ===
1. Emulate the creator's structural flow, tone, and formatting habits.
2. DO NOT COPY sentences or verbatim phrasing from the historical examples above.
3. Generate ORIGINAL wording and fresh insights for the new topic.
4. Avoid repetitive cliches not used by the creator.

=== OUTPUT FORMAT REQUIREMENT ===
Return ONLY a valid JSON object with the following schema:
{{
  "hook": "Attention-grabbing opening line",
  "caption": "Full caption text formatted with paragraph breaks and emojis matching the style profile",
  "cta": "Clear call to action line",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "slides": [
    {{"title": "Slide 1 Title", "body": "Slide 1 Content"}}
  ]
}}
"""
        return prompt
