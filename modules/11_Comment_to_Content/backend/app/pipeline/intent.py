import logging
import re
from typing import List, Dict, Any
from backend.app.schemas import (
    BatchIntentClassificationResponse,
    CommentIntentClassification
)
from backend.app.services.llm import llm_service

logger = logging.getLogger(__name__)

VALID_INTENTS = {
    "question", "request", "confusion", "pain_point",
    "criticism", "praise", "more_of_this", "other"
}

# Instagram-specific request patterns
REQUEST_PATTERNS = [
    r"\bpart\s*2\b",
    r"\btutorial\b",
    r"\bkaise\s+kiya\b",
    r"\bnext\s+video\s+(?:mein|me)\b",
    r"\blink\??",
    r"\bwhich\s+app\??",
    r"\bvideo\s+banao\b",
    r"\bbanao\s+na\b",
    r"\brepo\s+link\b",
    r"\bsource\s+code\b",
    r"\bgithub\s+link\b",
    r"\bplease\s+make\b",
    r"\bcan\s+you\s+(?:do|make)\b",
    r"\broadmap\b",
    r"\bcomparison\s+video\b"
]

# Instagram emoji intent patterns
CONFUSION_EMOJIS = {"🤔", "❓", "🤯", "🧐", "🤷", "😭", "🤦", "🤷‍♂️", "🤦‍♂️"}
PRAISE_EMOJIS = {"🔥", "❤️", "👏", "🙌", "🚀", "💯", "⭐"}

def heuristic_classify_single(text: str) -> Dict[str, Any]:
    """
    High-accuracy rule-based classifier for Instagram tech comments (English & Hinglish)
    interpreting request cues ('part 2', 'kaise kiya', 'link?'), friend @mentions, and emoji patterns.
    """
    lower = text.lower()

    # 1. Instagram Request cues
    for pat in REQUEST_PATTERNS:
        if re.search(pat, lower):
            return {
                "intent": "request",
                "confidence": 0.96,
                "explanation": "Explicit Instagram request for follow-up content, tutorial, or resource."
            }

    # 2. Confusion cues (text & emojis)
    confusion_phrases = [
        "confuse", "samajh nahi aaya", "confused", "wait, why", "wait why",
        "getting cors error", "did i do wrong", "why do we need", "what did i do wrong",
        "does not make sense", "hydration mismatch", "blocked the event loop"
    ]
    if any(p in lower for p in confusion_phrases) or any(e in text for e in CONFUSION_EMOJIS):
        if "?" in text or any(lower.startswith(w) for w in ["why", "how", "what", "is ", "can "]):
            # Questions with confusion
            if "samajh nahi aaya" in lower or "cors error" in lower or "hydration" in lower or "😭" in text or "🤦" in text:
                return {
                    "intent": "confusion",
                    "confidence": 0.93,
                    "explanation": "Expresses developer confusion or error while implementing tutorial."
                }
            return {
                "intent": "question",
                "confidence": 0.91,
                "explanation": "Technical question seeking architectural clarification."
            }
        return {
            "intent": "confusion",
            "confidence": 0.91,
            "explanation": "Viewer expressing confusion or roadblock."
        }

    # 3. Pain points
    pain_cues = [
        "struggling with", "terrify", "nightmare", "driving me crazy",
        "mess", "completely stuck", "killing our database", "killing the db",
        "no one explains", "takes 25 minutes", "junior devs keep"
    ]
    if any(cue in lower for cue in pain_cues):
        return {
            "intent": "pain_point",
            "confidence": 0.92,
            "explanation": "Describes a frustrating production pain point or workflow bottleneck."
        }

    # 4. More of this
    more_cues = [
        "more of this", "more backend", "make this a full series", "can't wait",
        "do more", "keep doing these"
    ]
    if any(cue in lower for cue in more_cues):
        return {
            "intent": "more_of_this",
            "confidence": 0.93,
            "explanation": "Audience requesting continuation of existing format."
        }

    # 5. Criticism / Constructive Feedback
    crit_cues = [
        "audio was too low", "will not scale", "too fast", "misleading",
        "skipped the most important", "too tiny to read", "fix your mic"
    ]
    if any(cue in lower for cue in crit_cues):
        return {
            "intent": "criticism",
            "confidence": 0.91,
            "explanation": "Constructive production feedback regarding pacing, audio, or scope."
        }

    # 6. Praise & Appreciation (text & emojis)
    praise_cues = [
        "best explanation", "cracked my sde", "teaching style is top",
        "lifesaver", "crisp, clear", "more value than paid", "loved the explanation",
        "top notch", "thanks a ton", "subscribed"
    ]
    if any(cue in lower for cue in praise_cues) or (any(e in text for e in PRAISE_EMOJIS) and "?" not in text):
        return {
            "intent": "praise",
            "confidence": 0.95,
            "explanation": "Positive creator appreciation and validation."
        }

    # 7. Standard Question
    if "?" in text or any(lower.startswith(w) for w in ["how", "why", "what", "is ", "can ", "does ", "kya "]):
        return {
            "intent": "question",
            "confidence": 0.90,
            "explanation": "Direct technical question."
        }

    return {
        "intent": "other",
        "confidence": 0.70,
        "explanation": "General community comment."
    }


def classify_intents(comments: List[Dict[str, Any]], batch_size: int = 25) -> List[Dict[str, Any]]:
    """
    Classifies intent of comments in batches using Claude LLM,
    with schema validation, Instagram pattern triggers, and heuristic fallback.
    """
    results = []

    for i in range(0, len(comments), batch_size):
        batch = comments[i:i + batch_size]
        items_payload = [
            {
                "comment_id": c["comment_id"],
                "text": c.get("clean_text") or c.get("text", ""),
                "post_format": c.get("post_format", "reel")
            }
            for c in batch
        ]

        def fallback_fn():
            classifications = []
            for item in items_payload:
                res = heuristic_classify_single(item["text"])
                has_mention = "@" in item["text"]
                classifications.append({
                    "comment_id": item["comment_id"],
                    "intent": res["intent"],
                    "confidence": res["confidence"],
                    "has_share_mention": has_mention,
                    "explanation": res["explanation"]
                })
            return {"classifications": classifications}

        system_prompt = (
            "You are an Instagram-first social media intelligence classifier for tech creators. "
            "Classify each comment into exactly ONE category: "
            "question, request, confusion, pain_point, criticism, praise, more_of_this, other.\n\n"
            "Instagram signals to look for:\n"
            "- Requests: 'part 2', 'tutorial', 'kaise kiya', 'next video mein', 'link?', 'which app?', 'bhai video banao'\n"
            "- Emoji confusion: 🤔, ❓, 🤯, 🧐, 🤷, 😭, 🤦 -> confusion or question\n"
            "- Emoji praise: 🔥, ❤️, 👏, 🙌, 🚀, 💯 -> praise\n"
            "- Hinglish comments (Hindi in Latin script) must be understood seamlessly.\n"
            "- Identify if the comment mentions a friend (@username) to share content."
        )

        user_prompt = (
            f"Classify the following {len(items_payload)} Instagram comments:\n"
            f"{items_payload}"
        )

        try:
            parsed: BatchIntentClassificationResponse = llm_service.generate_structured(
                task_type="intent_classification",
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=BatchIntentClassificationResponse,
                fallback_fn=fallback_fn
            )
            id_to_item = {c.comment_id: c for c in parsed.classifications}
            for original in batch:
                cid = original["comment_id"]
                if cid in id_to_item:
                    cls_item = id_to_item[cid]
                    results.append({
                        **original,
                        "intent": cls_item.intent if cls_item.intent in VALID_INTENTS else "other",
                        "confidence": cls_item.confidence,
                        "has_share_mention": cls_item.has_share_mention or ("@" in (original.get("clean_text") or "")),
                        "intent_explanation": cls_item.explanation
                    })
                else:
                    h = heuristic_classify_single(original.get("clean_text") or original.get("text", ""))
                    results.append({
                        **original,
                        "intent": h["intent"],
                        "confidence": h["confidence"],
                        "has_share_mention": "@" in (original.get("clean_text") or ""),
                        "intent_explanation": h["explanation"]
                    })
        except Exception as e:
            logger.error(f"Error classifying batch starting at {i}: {e}. Falling back to heuristics.")
            for original in batch:
                h = heuristic_classify_single(original.get("clean_text") or original.get("text", ""))
                results.append({
                    **original,
                    "intent": h["intent"],
                    "confidence": h["confidence"],
                    "has_share_mention": "@" in (original.get("clean_text") or ""),
                    "intent_explanation": h["explanation"]
                })

    return results
