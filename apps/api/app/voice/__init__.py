"""Creator Voice Engine.

A shared platform capability adapted from Module 13. Uses `EmbeddingService` and
`LLMGateway`; owns neither a vector store, an LLM client nor an auth path.
"""
from app.voice.engine import (
    VoiceEngine,
    VoiceFeatures,
    VoiceMatch,
    VoiceProfile,
    aggregate_profile,
    extract_features,
    get_voice_engine,
    validate_voice_match,
)

__all__ = [
    "VoiceEngine",
    "VoiceProfile",
    "VoiceFeatures",
    "VoiceMatch",
    "extract_features",
    "aggregate_profile",
    "validate_voice_match",
    "get_voice_engine",
]
