import logging
import numpy as np
from typing import List, Dict, Any, Tuple
from collections import Counter
from sklearn.cluster import KMeans

from backend.app.config import settings
from backend.app.schemas import ClusterNamingResponse
from backend.app.services.llm import llm_service

logger = logging.getLogger(__name__)

_embedder = None

def get_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME}")
            _embedder = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        except Exception as e:
            logger.warning(f"Failed to load SentenceTransformer ({e}). Falling back to TF-IDF vectorizer.")
            _embedder = "fallback"
    return _embedder

def compute_embeddings(texts: List[str]) -> np.ndarray:
    embedder = get_embedder()
    if embedder != "fallback":
        try:
            return embedder.encode(texts, show_progress_bar=False, normalize_embeddings=True)
        except Exception as e:
            logger.warning(f"SentenceTransformer encoding failed: {e}. Using TF-IDF fallback.")
    
    # TF-IDF + SVD fallback for offline or low-resource scenarios
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.decomposition import TruncatedSVD
    vectorizer = TfidfVectorizer(max_features=500, stop_words="english", ngram_range=(1, 2))
    X = vectorizer.fit_transform(texts)
    n_components = min(32, X.shape[1] - 1) if X.shape[1] > 2 else 2
    svd = TruncatedSVD(n_components=n_components, random_state=42)
    reduced = svd.fit_transform(X)
    norms = np.linalg.norm(reduced, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return reduced / norms

def heuristic_cluster_name(cluster_comments: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Keyword-based cluster namer fallback when Claude API is offline.
    """
    full_text = " ".join([c.get("clean_text") or c.get("text", "") for c in cluster_comments]).lower()
    
    if "langgraph" in full_text or "agent" in full_text or "crewai" in full_text:
        return {
            "name": "AI Agents & Multi-Agent Workflows",
            "description": "Audience wants practical tutorials comparing LangGraph vs CrewAI and building production AI agents."
        }
    if "fastapi" in full_text or "celery" in full_text or "background" in full_text or "websocket" in full_text:
        return {
            "name": "FastAPI & Async Background Architecture",
            "description": "Questions and requests around FastAPI background tasks, Celery queues, and real-time WebSockets."
        }
    if "next.js" in full_text or "server action" in full_text or "jwt" in full_text or "auth" in full_text:
        return {
            "name": "Next.js 15 & Secure Authentication",
            "description": "Audience confusion around Next.js App Router, Server Actions, cookie-based JWT auth, and hydration."
        }
    if "postgres" in full_text or "pgvector" in full_text or "database" in full_text or "index" in full_text or "sqlite" in full_text:
        return {
            "name": "Database Scaling, Indexing & pgvector",
            "description": "Inquiries regarding PostgreSQL optimization, connection pooling, and vector search vs standard SQL."
        }
    if "docker" in full_text or "deploy" in full_text or "vps" in full_text or "coolify" in full_text:
        return {
            "name": "Docker & Production VPS Deployment",
            "description": "Requests for deep dives into Docker multi-stage builds, networking, and self-hosted VPS setups."
        }
    if "salary" in full_text or "interview" in full_text or "sde" in full_text or "system design" in full_text:
        return {
            "name": "System Design & Tech Career Playbook",
            "description": "Questions and requests on SDE-2 interview prep, high-scale system design, and salary negotiation."
        }
    
    # Generic fallback based on most common non-stop words
    from collections import Counter
    import re
    words = re.findall(r"\b[a-z]{4,}\b", full_text)
    stops = {"this", "that", "with", "from", "video", "bhai", "please", "make", "what", "your", "have"}
    filtered = [w for w in words if w not in stops]
    top_words = [w.capitalize() for w, _ in Counter(filtered).most_common(3)]
    title = " ".join(top_words) if top_words else "Core Developer Queries"
    return {
        "name": f"Theme: {title}",
        "description": "Collection of common viewer inquiries and discussions."
    }

def cluster_and_name_comments(comments: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], np.ndarray]:
    """
    Clusters comments into themes using HDBSCAN with KMeans fallback.
    Returns: (list_of_cluster_metadata, embeddings)
    """
    if not comments:
        return [], np.empty((0, 0))

    texts = [c.get("clean_text") or c.get("text", "") for c in comments]
    embeddings = compute_embeddings(texts)

    num_samples = len(comments)
    min_cluster_size = max(3, min(8, num_samples // 15))

    labels = None
    try:
        import hdbscan
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=min_cluster_size,
            min_samples=2,
            metric="euclidean",
            cluster_selection_epsilon=0.25
        )
        labels = clusterer.fit_predict(embeddings)
        
        # Check if HDBSCAN failed to find meaningful clusters (all noise -1 or only 1 cluster)
        unique_labels = set(labels) - {-1}
        noise_ratio = (labels == -1).sum() / num_samples
        if len(unique_labels) < 2 or noise_ratio > 0.60:
            logger.info("HDBSCAN produced excessive noise or too few clusters; switching to KMeans.")
            labels = None
    except Exception as e:
        logger.warning(f"HDBSCAN clustering failed: {e}. Falling back to KMeans.")
        labels = None

    if labels is None:
        # Determine k (between 3 and 7)
        k = max(2, min(6, num_samples // 12))
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(embeddings)

    # Attach cluster label to each comment
    clusters_dict = {}
    for idx, (comment, label) in enumerate(zip(comments, labels)):
        c_label = int(label)
        if c_label == -1:
            # For HDBSCAN noise points, merge into cluster 0 or assign to nearest
            c_label = 0
        comment["cluster_id"] = c_label
        clusters_dict.setdefault(c_label, []).append(comment)

    cluster_summaries = []
    for cluster_id, c_comments in sorted(clusters_dict.items()):
        # Calculate cluster statistics
        unique_users = len(set(c["username"] for c in c_comments))
        total_likes = sum(c.get("likes", 0) for c in c_comments)
        
        # Intent breakdown
        intents = [c.get("intent", "other") for c in c_comments]
        intent_counts = dict(Counter(intents))
        
        # Sort comments by likes and intent priority to find top evidence
        def comment_sort_key(c):
            intent_val = 2 if c.get("intent") in ["request", "question", "pain_point"] else 1
            return (intent_val, c.get("likes", 0))

        sorted_comments = sorted(c_comments, key=comment_sort_key, reverse=True)
        top_ids = [c["comment_id"] for c in sorted_comments[:8]]
        
        sample_texts = [
            f"- [{c.get('username')}] ({c.get('intent')}): {c.get('clean_text') or c.get('text')}"
            for c in sorted_comments[:6]
        ]
        sample_str = "\n".join(sample_texts)

        # Generate cluster name with LLM
        system_prompt = (
            "You are an editorial director for a top tech & programming creator. "
            "Given a cluster of related audience comments, create a concise, punchy theme name (3 to 6 words) "
            "and a 1-2 sentence description explaining what the audience is looking for."
        )
        user_prompt = (
            f"Here are representative comments from a community cluster:\n"
            f"{sample_str}\n\n"
            f"Provide a name and description for this cluster."
        )

        def fallback_fn():
            return heuristic_cluster_name(c_comments)

        try:
            naming_res: ClusterNamingResponse = llm_service.generate_structured(
                task_type="cluster_naming",
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=ClusterNamingResponse,
                fallback_fn=fallback_fn
            )
            theme_name = naming_res.name
            theme_desc = naming_res.description
        except Exception as e:
            logger.warning(f"Cluster naming failed for cluster {cluster_id}: {e}")
            fb = fallback_fn()
            theme_name = fb["name"]
            theme_desc = fb["description"]

        cluster_summaries.append({
            "cluster_id": cluster_id,
            "name": theme_name,
            "description": theme_desc,
            "comment_count": len(c_comments),
            "unique_commenters_count": unique_users,
            "total_likes": total_likes,
            "intent_breakdown": intent_counts,
            "top_comment_ids": top_ids,
            "comments": c_comments
        })

    return cluster_summaries, embeddings
