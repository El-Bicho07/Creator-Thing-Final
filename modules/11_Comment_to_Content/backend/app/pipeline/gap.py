import logging
import numpy as np
from typing import List, Dict, Any
from backend.app.pipeline.cluster import compute_embeddings

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.65

def cosine_similarity_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """
    Computes cosine similarity between rows of a and rows of b.
    Assumes a and b are normalized.
    """
    return np.dot(a, b.T)

def perform_gap_analysis(
    ideas: List[Dict[str, Any]],
    raw_comments: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Compares each idea against past post captions from ingested data using embedding similarity.
    Flags ideas as:
    - "already_covered" if cosine similarity >= 0.65
    - "new_opportunity" if cosine similarity < 0.65
    """
    if not ideas:
        return []

    # Extract distinct non-empty post captions
    post_captions = list({
        c.get("post_caption").strip()
        for c in raw_comments
        if c.get("post_caption") and len(c.get("post_caption").strip()) > 5
    })

    if not post_captions:
        # If no past captions are available, all ideas are new opportunities
        for idea in ideas:
            idea["gap_status"] = "new_opportunity"
            idea["gap_similarity"] = 0.0
            idea["gap_matched_post"] = None
        return ideas

    # Embed idea representations and post captions
    idea_texts = [f"{idea.get('title', '')}. {idea.get('hook', '')}. {idea.get('why_now', '')}" for idea in ideas]
    idea_embeddings = compute_embeddings(idea_texts)
    caption_embeddings = compute_embeddings(post_captions)

    sim_matrix = cosine_similarity_matrix(idea_embeddings, caption_embeddings)

    for i, idea in enumerate(ideas):
        similarities = sim_matrix[i]
        best_idx = int(np.argmax(similarities))
        best_sim = float(similarities[best_idx])
        best_caption = post_captions[best_idx]

        if best_sim >= SIMILARITY_THRESHOLD:
            idea["gap_status"] = "already_covered"
            idea["gap_similarity"] = round(best_sim, 2)
            idea["gap_matched_post"] = best_caption
        else:
            idea["gap_status"] = "new_opportunity"
            idea["gap_similarity"] = round(best_sim, 2)
            idea["gap_matched_post"] = best_caption if best_sim >= 0.35 else None

    return ideas
