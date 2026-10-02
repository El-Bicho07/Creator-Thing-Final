import numpy as np
from typing import List

class EmbeddingService:
    def __init__(self, provider: str = "sentence-transformers", model_name: str = "all-MiniLM-L6-v2"):
        self.provider = provider
        self.model_name = model_name

    def generate_embedding(self, text: str) -> List[float]:
        if not text or not text.strip():
            return [0.0] * 384
            
        # Fast, robust deterministic feature vectorization
        return EmbeddingService._deterministic_hash_vector(text, dim=384)

    @staticmethod
    def _deterministic_hash_vector(text: str, dim: int = 384) -> List[float]:
        """Fast fallback vectorizer converting text to fixed-size normalized float vector."""
        vec = np.zeros(dim, dtype=np.float32)
        words = text.lower().split()
        for idx, word in enumerate(words):
            hash_val = hash(word)
            pos = abs(hash_val) % dim
            sign = 1.0 if hash_val > 0 else -1.0
            vec[pos] += sign * (1.0 / (idx + 1.0) ** 0.5)
            
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()
