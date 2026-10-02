from typing import List, Dict, Any

class ContentAnalyzer:
    @staticmethod
    def classify_post_type(caption: str, text_features: Dict[str, Any]) -> str:
        caption_lower = caption.lower()
        
        # Carousel indicators
        if any(term in caption_lower for term in ["slide", "carousel", "swipe left", "swipe to see", "tap right"]):
            return "carousel"
            
        # Promotional indicators
        if text_features.get("promotional_score", 0) > 0.4 or any(term in caption_lower for term in ["offer", "discount", "sale", "limited time", "buy now", "link in bio"]):
            return "promotional"
            
        # Storytelling indicators
        if text_features.get("storytelling_score", 0) > 0.35 or any(term in caption_lower for term in ["years ago", "my story", "how i started", "remember when", "lesson i learned"]):
            return "storytelling"
            
        # Educational / Tutorial indicators
        if text_features.get("educational_score", 0) > 0.3 or any(term in caption_lower for term in ["how to", "tips", "guide", "tutorial", "step 1", "framework"]):
            return "educational"
            
        # Question / Engagement indicators
        if text_features.get("question_count", 0) >= 2 or caption_lower.endswith("?"):
            return "question"
            
        return "educational"
