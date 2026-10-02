import re
from typing import Dict, Any, List, Tuple
import spacy

# Load spacy model lazily
_nlp = None

def get_nlp():
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
        except Exception:
            _nlp = None
    return _nlp

EMOJI_REGEX = re.compile(
    "["
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F680-\U0001F6FF"  # transport & map symbols
    "\U0001F1E0-\U0001F1FF"  # flags (iOS)
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "]+",
    flags=re.UNICODE,
)

CTA_KEYWORDS = [
    "comment below", "link in bio", "click the link", "share this", "save this post",
    "save for later", "tag a friend", "dm me", "send a message", "drop a", "let me know",
    "what do you think", "follow for more", "swipe left", "tell me in the comments",
    "tap the link", "check out", "join our", "subscribe"
]

FIRST_PERSON_PRONOUNS = {"i", "me", "my", "mine", "myself", "we", "us", "our", "ours", "ourselves"}
SECOND_PERSON_PRONOUNS = {"you", "your", "yours", "yourself", "yourselves"}

EDUCATIONAL_KEYWORDS = {"how", "why", "step", "guide", "tip", "learn", "mistake", "secret", "best", "tool", "framework", "tutorial"}
PROMOTIONAL_KEYWORDS = {"offer", "buy", "sale", "discount", "course", "service", "available", "launch", "limited", "price", "sign up"}
STORYTELLING_KEYWORDS = {"years ago", "when i", "remember", "story", "journey", "learned", "failed", "realized", "turned out"}

class TextAnalyzer:
    @staticmethod
    def extract_features(caption: str, hashtags: List[str] = None) -> Dict[str, Any]:
        if not caption:
            caption = ""
        
        # Normalize text
        lines = [line.strip() for line in caption.split("\n") if line.strip()]
        paragraphs = [p.strip() for p in caption.split("\n\n") if p.strip()]
        
        words = re.findall(r"\b\w+\b", caption.lower())
        sentences = [s.strip() for s in re.split(r"[.!?]+", caption) if s.strip()]
        
        char_count = len(caption)
        word_count = len(words)
        sentence_count = max(1, len(sentences))
        paragraph_count = max(1, len(paragraphs))
        
        avg_sentence_length = round(word_count / sentence_count, 2)
        avg_word_length = round(sum(len(w) for w in words) / max(1, word_count), 2)
        
        # Punctuation counts
        punct_counts = {
            "question_mark": caption.count("?"),
            "exclamation_mark": caption.count("!"),
            "comma": caption.count(","),
            "colon": caption.count(":"),
            "semicolon": caption.count(";"),
            "parentheses": caption.count("(") + caption.count(")"),
            "dash": caption.count("-") + caption.count("—"),
        }
        
        # Formatting
        line_break_count = caption.count("\n")
        has_bullet = 1 if re.search(r"^\s*[\•\-\*]\s+", caption, re.MULTILINE) else 0
        has_numbered = 1 if re.search(r"^\s*\d+[\.\)]\s+", caption, re.MULTILINE) else 0
        
        # Capitalization
        if caption.isupper():
            cap_style = "ALL_CAPS"
        elif caption.islower():
            cap_style = "all_lowercase"
        elif any(line.istitle() for line in lines[:2]):
            cap_style = "title_case"
        else:
            cap_style = "sentence_case"

        # Emojis & Hashtags
        emojis_found = EMOJI_REGEX.findall(caption)
        all_emojis = [char for match in emojis_found for char in match]
        
        caption_hashtags = re.findall(r"#\w+", caption)
        combined_hashtags = list(set((hashtags or []) + caption_hashtags))
        
        # CTA & URL
        has_url = 1 if re.search(r"https?://|www\.", caption) else 0
        has_cta = 0
        found_cta_phrase = None
        for cta in CTA_KEYWORDS:
            if cta in caption.lower():
                has_cta = 1
                found_cta_phrase = cta
                break
        
        # Pronoun & Tone metrics
        nlp = get_nlp()
        if nlp:
            doc = nlp(caption.lower())
            tokens = [token.text for token in doc if not token.is_punct]
        else:
            tokens = words
            
        first_person_count = sum(1 for t in tokens if t in FIRST_PERSON_PRONOUNS)
        second_person_count = sum(1 for t in tokens if t in SECOND_PERSON_PRONOUNS)
        
        first_person_ratio = round(first_person_count / max(1, word_count), 4)
        second_person_ratio = round(second_person_count / max(1, word_count), 4)
        
        # Heuristic Tone Indicator Scores (0.0 to 1.0)
        # Formality: low emojis, low exclamations, longer words & sentences, low first-person
        formality_score = min(1.0, max(0.0, 0.5 + (avg_word_length - 4.5) * 0.1 - len(all_emojis) * 0.05 - punct_counts["exclamation_mark"] * 0.05))
        
        # Conversational: questions, second person, short sentences
        conversational_score = min(1.0, max(0.0, 0.3 + second_person_ratio * 5.0 + punct_counts["question_mark"] * 0.15))
        
        # Educational: how-to/tips keywords, bullet lists, medium sentence length
        edu_matches = sum(1 for w in words if w in EDUCATIONAL_KEYWORDS)
        educational_score = min(1.0, max(0.0, (edu_matches * 0.15) + (0.3 if has_bullet or has_numbered else 0.0)))
        
        # Promotional: cta, promotional keywords, url
        promo_matches = sum(1 for w in words if w in PROMOTIONAL_KEYWORDS)
        promotional_score = min(1.0, max(0.0, (0.4 if has_cta else 0.0) + promo_matches * 0.15 + (0.2 if has_url else 0.0)))
        
        # Storytelling: first person, storytelling keywords
        story_matches = sum(1 for w in words if w in STORYTELLING_KEYWORDS)
        storytelling_score = min(1.0, max(0.0, first_person_ratio * 4.0 + story_matches * 0.2))
        
        # Structure breakdown
        structure = TextAnalyzer._identify_structure(lines, caption, has_cta)

        return {
            "char_count": char_count,
            "word_count": word_count,
            "sentence_count": sentence_count,
            "paragraph_count": paragraph_count,
            "avg_sentence_length": avg_sentence_length,
            "avg_word_length": avg_word_length,
            "punctuation_counts": punct_counts,
            "question_count": punct_counts["question_mark"],
            "exclamation_count": punct_counts["exclamation_mark"],
            "line_break_count": line_break_count,
            "has_bullet_points": has_bullet,
            "has_numbered_list": has_numbered,
            "capitalization_style": cap_style,
            "emoji_count": len(all_emojis),
            "emojis": all_emojis,
            "hashtag_count": len(combined_hashtags),
            "hashtags": combined_hashtags,
            "has_cta": has_cta,
            "cta_phrase": found_cta_phrase,
            "has_url": has_url,
            "first_person_ratio": first_person_ratio,
            "second_person_ratio": second_person_ratio,
            "formality_score": round(formality_score, 2),
            "conversational_score": round(conversational_score, 2),
            "educational_score": round(educational_score, 2),
            "promotional_score": round(promotional_score, 2),
            "storytelling_score": round(storytelling_score, 2),
            "structure_components": structure,
        }

    @staticmethod
    def _identify_structure(lines: List[str], caption: str, has_cta: bool) -> List[str]:
        structure = []
        if not lines:
            return ["body"]
        
        # First line is usually the hook
        structure.append("hook")
        
        # Intermediate parts
        if len(lines) > 1:
            middle_text = " ".join(lines[1:-1]).lower() if len(lines) > 2 else lines[1].lower()
            if any(k in middle_text for k in ["for example", "e.g.", "case study", "instance"]):
                structure.append("example")
            elif any(k in middle_text for k in ["step", "1.", "2.", "first", "second"]):
                structure.append("steps")
            else:
                structure.append("body")
                
            if any(k in middle_text for k in ["takeaway", "lesson", "bottom line", "summary"]):
                structure.append("takeaway")
                
        if has_cta or any(cta in lines[-1].lower() for cta in CTA_KEYWORDS):
            structure.append("cta")
            
        return structure
