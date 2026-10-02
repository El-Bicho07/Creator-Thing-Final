import math
from datetime import datetime, timezone
from typing import List, Dict, Any

INTENT_WEIGHTS = {
    "request": 2.6,
    "pain_point": 2.3,
    "question": 2.1,
    "confusion": 1.8,
    "more_of_this": 1.5,
    "criticism": 1.0,
    "praise": 0.5,
    "other": 0.3
}

def parse_iso_datetime(ts_str: str) -> datetime:
    try:
        if ts_str.endswith("Z"):
            ts_str = ts_str[:-1] + "+00:00"
        return datetime.fromisoformat(ts_str)
    except Exception:
        return datetime.now(timezone.utc)

def compute_cluster_scores(clusters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Computes a normalized demand score (0-100) per cluster from Instagram-native signals:
    1. Number of UNIQUE commenters (not raw comment count)
    2. Total comment likes (log-dampened)
    3. Comment reply_count (discussion threads indicating viral curiosity)
    4. Friend @mentions (shareability multiplier)
    5. Intent weight (requests & questions prioritized over praise)
    6. Recency decay (14-day half life)
    """
    if not clusters:
        return []

    now = datetime.now(timezone.utc)
    raw_scores = []

    for cluster in clusters:
        comments = cluster.get("comments", [])
        unique_users = cluster.get("unique_commenters_count", len(set(c["username"] for c in comments)))
        total_replies = sum(c.get("reply_count", 0) for c in comments)
        cluster["total_replies"] = total_replies

        weighted_comment_sum = 0.0
        for c in comments:
            # 1. Likes & Reply Count signals
            likes = c.get("likes", 0)
            reply_count = c.get("reply_count", 0)
            engagement_factor = 1.0 + (math.log1p(likes) * 0.35) + (math.log1p(reply_count) * 0.45)

            # 2. Shareability signal: friend @mentions
            has_mention = c.get("has_share_mention", False) or ("@" in (c.get("clean_text") or c.get("text", "")))
            share_multiplier = 1.30 if has_mention else 1.0

            # 3. Intent weight
            intent = c.get("intent", "other")
            i_weight = INTENT_WEIGHTS.get(intent, 0.5)

            # 4. Recency decay
            ts = parse_iso_datetime(c.get("timestamp", ""))
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            age_days = max(0.0, (now - ts).total_seconds() / 86400.0)
            decay = math.exp(-age_days / 14.0)

            c_score = engagement_factor * share_multiplier * i_weight * decay
            weighted_comment_sum += c_score

        # Unique commenters multiplier
        cluster_raw = (unique_users ** 0.85) * (weighted_comment_sum + 1.0)
        raw_scores.append(cluster_raw)

    min_raw = min(raw_scores)
    max_raw = max(raw_scores)

    scored_clusters = []
    for cluster, raw in zip(clusters, raw_scores):
        if max_raw == min_raw:
            norm_score = 85.0
        else:
            norm_score = 45.0 + ((raw - min_raw) / (max_raw - min_raw)) * 54.0

        cluster_copy = dict(cluster)
        cluster_copy["demand_score"] = round(norm_score, 1)
        scored_clusters.append(cluster_copy)

    scored_clusters.sort(key=lambda x: x["demand_score"], reverse=True)
    return scored_clusters
