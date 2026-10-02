import numpy as np
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.post import Post
from app.models.embedding import Embedding
from app.services.embedding_service import EmbeddingService

class RetrievalService:
    def __init__(self, db: Session):
        self.db = db
        self.embedding_service = EmbeddingService()

    def retrieve_relevant_posts(
        self,
        project_id: str,
        query_text: str,
        top_k: int = 5,
        post_type_filter: str = None
    ) -> List[Dict[str, Any]]:
        # 1. Generate embedding vector for query
        query_vec = np.array(self.embedding_service.generate_embedding(query_text), dtype=np.float32)
        
        # 2. Fetch all posts with embeddings for the project
        query = self.db.query(Post).join(Embedding).filter(Post.project_id == project_id)
        if post_type_filter:
            query = query.filter(Post.post_type == post_type_filter)
            
        posts = query.all()
        if not posts:
            # Fall back to any posts in project without post_type_filter
            posts = self.db.query(Post).filter(Post.project_id == project_id).all()
            
        if not posts:
            return []

        scored_posts = []
        for post in posts:
            if not post.embedding or not post.embedding.vector:
                similarity = 0.1
            else:
                post_vec = np.array(post.embedding.vector, dtype=np.float32)
                # Compute cosine similarity
                dot = np.dot(query_vec, post_vec)
                norm_q = np.linalg.norm(query_vec)
                norm_p = np.linalg.norm(post_vec)
                similarity = float(dot / (norm_q * norm_p)) if (norm_q > 0 and norm_p > 0) else 0.0
                
            scored_posts.append({
                "id": post.id,
                "caption": post.caption,
                "hashtags": post.hashtags or [],
                "post_type": post.post_type,
                "published_at": post.published_at.strftime("%Y-%m-%d") if post.published_at else None,
                "similarity_score": round(similarity, 4),
                "structure": post.text_features.structure_components if post.text_features else ["hook", "body", "cta"]
            })

        # Sort by highest similarity score
        scored_posts.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored_posts[:top_k]
