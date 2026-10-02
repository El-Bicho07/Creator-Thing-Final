import os
import json
import re
from typing import Dict, Any, Optional
import httpx
from app.config import settings

class LLMProvider:
    def generate(self, prompt: str) -> Dict[str, Any]:
        raise NotImplementedError

class GeminiLLMProvider(LLMProvider):
    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or settings.LLM_API_KEY
        self.model = model or settings.LLM_MODEL or "gemini-2.5-flash"

    def generate(self, prompt: str) -> Dict[str, Any]:
        if not self.api_key or self.api_key == "your_gemini_api_key_here":
            return self._generate_fallback(prompt)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "responseMimeType": "application/json"
            }
        }

        try:
            with httpx.Client(timeout=45.0) as client:
                res = client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()
                
                text_out = data["candidates"][0]["content"]["parts"][0]["text"]
                return self._parse_json_response(text_out)
        except Exception as e:
            # Fall back to structured generation
            return self._generate_fallback(prompt)

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        try:
            # Clean possible markdown code fences
            cleaned = re.sub(r"^```json\s*", "", text, flags=re.MULTILINE)
            cleaned = re.sub(r"```$", "", cleaned, flags=re.MULTILINE).strip()
            return json.loads(cleaned)
        except Exception:
            return {
                "hook": "5 game-changing insights you need to know today 🚀",
                "caption": text,
                "cta": "Save this post for later and comment your thoughts below!",
                "hashtags": ["#instagram", "#contentcreator", "#growth"],
                "slides": []
            }

    def _generate_fallback(self, prompt: str) -> Dict[str, Any]:
        # Extract topic from prompt heuristic
        topic_match = re.search(r"- Topic:\s*(.+)", prompt)
        topic_str = topic_match.group(1).strip() if topic_match else "AI & Technology"
        
        post_type_match = re.search(r"- Requested Post Type:\s*(.+)", prompt)
        post_type = post_type_match.group(1).strip() if post_type_match else "educational"

        return {
            "hook": f"Here is what nobody tells you about {topic_str} 🚀",
            "caption": (
                f"Here is what nobody tells you about {topic_str} 🚀\n\n"
                f"Most creators focus on surface-level tactics, but the real secret to {topic_str} comes down to 3 core principles:\n\n"
                f"1. Consistency over intensity\n"
                f"2. Leveraging historical data & analytics\n"
                f"3. Building authentic engagement\n\n"
                f"When you master these, everything changes."
            ),
            "cta": f"What's your biggest takeaway on {topic_str}? Drop a comment below! 👇",
            "hashtags": ["#contentstrategy", "#ai", "#creator", "#growth", "#productivity"],
            "slides": [
                {"title": f"Understanding {topic_str}", "body": "Why standard approaches fail and how to optimize."},
                {"title": "The 3 Principles", "body": "1. Consistency\n2. Analytical feedback\n3. Value first"},
                {"title": "Action Plan", "body": "Apply these insights today to see immediate results."}
            ] if post_type == "carousel" else []
        }

class LLMService:
    @staticmethod
    def get_provider() -> LLMProvider:
        provider_name = settings.LLM_PROVIDER.lower()
        if provider_name == "gemini":
            return GeminiLLMProvider()
        return GeminiLLMProvider()
