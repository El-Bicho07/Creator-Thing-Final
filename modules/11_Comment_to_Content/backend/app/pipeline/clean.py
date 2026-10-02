import re
from typing import List, Dict, Tuple, Any

# Regex patterns for spam and promotion bots
SPAM_PATTERNS = [
    r"check (?:my )?bio",
    r"dm (?:me|us) (?:for|to|on)",
    r"boost followers",
    r"earn \$\d+",
    r"crypto (?:trading|signals|roi)",
    r"whatsapp \+?\d+",
    r"free (?:iphone|followers|giveaway)",
    r"binary signals",
    r"guaranteed \d+% roi",
    r"invest_crypto",
    r"promo_hub",
    r"work from home earning",
]

# Unicode emoji range regex to detect emoji-only strings
EMOJI_REGEX = re.compile(
    "["
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F680-\U0001F6FF"  # transport & map
    "\U0001F1E0-\U0001F1FF"  # flags
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "\U0001F900-\U0001F9FF"  # supplemental symbols
    "\U0001FA70-\U0001FAFF"
    "]+",
    flags=re.UNICODE
)

MENTION_REGEX = re.compile(r"@([A-Za-z0-9_]+)")

def is_spam(text: str) -> bool:
    lower = text.lower()
    for pattern in SPAM_PATTERNS:
        if re.search(pattern, lower):
            return True
    return False

def is_emoji_only(text: str) -> bool:
    # Remove all emojis and whitespace; if nothing left, it's emoji-only
    stripped = EMOJI_REGEX.sub("", text).strip()
    return len(stripped) == 0

def normalize_text(text: str) -> str:
    # Collapse multiple whitespace, preserve case, Hinglish, emojis, and @mentions
    cleaned = re.sub(r"\s+", " ", text).strip()
    return cleaned

def clean_comments(raw_comments: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Cleans raw Instagram comments while extracting Instagram signals:
    1. Removes spam & bot promotions
    2. Removes emoji-only comments
    3. Removes comments with < 3 characters
    4. Removes exact duplicate comment texts
    5. Normalizes text while preserving Hinglish and emojis
    6. Identifies friend @mentions for shareability analysis
    
    Returns: (cleaned_comments, removed_comments)
    """
    cleaned = []
    removed = []
    seen_texts = set()

    for item in raw_comments:
        raw_text = item.get("text", "")
        norm = normalize_text(raw_text)
        
        # Check mentions
        mentions = MENTION_REGEX.findall(norm)
        has_share_mention = len(mentions) > 0
        mentions_count = len(mentions)

        norm_lower = norm.lower()
        user = item.get("username", "")
        dup_key = (norm_lower, user)
        if dup_key in seen_texts:
            removed.append({
                **item,
                "is_cleaned": False,
                "is_removed": True,
                "removal_reason": "duplicate",
                "has_share_mention": has_share_mention,
                "mentions_count": mentions_count
            })
            continue
        seen_texts.add(dup_key)

        # Check under 3 characters
        if len(norm) < 3:
            removed.append({
                **item,
                "is_cleaned": False,
                "is_removed": True,
                "removal_reason": "too_short",
                "has_share_mention": has_share_mention,
                "mentions_count": mentions_count
            })
            continue

        # Check emoji-only
        if is_emoji_only(norm):
            removed.append({
                **item,
                "is_cleaned": False,
                "is_removed": True,
                "removal_reason": "emoji_only",
                "has_share_mention": has_share_mention,
                "mentions_count": mentions_count
            })
            continue

        # Check spam
        if is_spam(norm):
            removed.append({
                **item,
                "is_cleaned": False,
                "is_removed": True,
                "removal_reason": "spam",
                "has_share_mention": has_share_mention,
                "mentions_count": mentions_count
            })
            continue

        cleaned.append({
            **item,
            "is_cleaned": True,
            "clean_text": norm,
            "is_removed": False,
            "removal_reason": None,
            "has_share_mention": has_share_mention,
            "mentions_count": mentions_count
        })

    return cleaned, removed
