"""EmbeddingService tests.

Covers the contract in task §16: query/document embedding, batching, dimension,
prefixing, normalisation, empty/oversized input, deterministic configuration,
model loading, model failure, invalid configuration, and service unavailability.
"""
import numpy as np
import pytest

from app.ai.embedding import EmbeddingError, E5EmbeddingService, get_embedding_service
from app.core.config import settings

pytestmark = pytest.mark.filterwarnings("ignore::UserWarning")


@pytest.fixture(scope="module")
def service() -> E5EmbeddingService:
    return E5EmbeddingService()


# --------------------------------------------------------------------------- #
# Dimension / normalisation
# --------------------------------------------------------------------------- #

def test_get_dimension_is_768(service):
    assert service.get_dimension() == 768


def test_embed_query_returns_768_dims(service):
    vector = service.embed_query("what is my creator voice")
    assert len(vector) == 768


def test_embed_document_returns_768_dims(service):
    vector = service.embed_document("I batch on Sundays to avoid weekday burnout.")
    assert len(vector) == 768


def test_vectors_are_l2_normalised(service):
    """pgvector vector_cosine_ops assumes unit-norm vectors."""
    for vector in (service.embed_query("normalisation check"),
                   service.embed_document("normalisation check")):
        assert np.linalg.norm(np.asarray(vector)) == pytest.approx(1.0, abs=1e-5)


def test_batch_embedding_returns_one_vector_per_input(service):
    texts = ["first document", "second document", "third document", "fourth document"]
    vectors = service.embed_documents(texts)
    assert len(vectors) == len(texts)
    assert all(len(v) == 768 for v in vectors)


def test_batch_queries_match_dimension(service):
    vectors = service.embed_queries(["one query", "two queries"])
    assert len(vectors) == 2 and all(len(v) == 768 for v in vectors)


# --------------------------------------------------------------------------- #
# E5 prefix convention (mandatory)
# --------------------------------------------------------------------------- #

def test_query_prefix_applied(service):
    formatted = service._format_query("hello")
    assert formatted == "query: hello"
    assert formatted.startswith("query:")


def test_document_prefix_applied(service):
    formatted = service._format_document("hello")
    assert formatted == "passage: hello"
    assert formatted.startswith("passage:")


def test_prefixes_change_the_vector(service):
    """A prefixed query must differ from the unprefixed text.

    If these matched, the prefix would be inert and the E5 convention would be
    silently not applied.
    """
    raw = service._encode(["who built the second brain"])[0]
    prefixed = service.embed_query("who built the second brain")
    cosine = float(np.dot(np.asarray(raw), np.asarray(prefixed)))
    assert cosine < 0.9999


def test_query_and_document_prefixes_differ(service):
    text = "identical text"
    q = service.embed_query(text)
    d = service.embed_document(text)
    assert q != d


# --------------------------------------------------------------------------- #
# Edge cases
# --------------------------------------------------------------------------- #

def test_empty_batch_returns_empty_list(service):
    assert service.embed_documents([]) == []
    assert service.embed_queries([]) == []


def test_empty_string_is_handled(service):
    vector = service.embed_document("")
    assert len(vector) == 768


def test_none_input_rejected(service):
    with pytest.raises(EmbeddingError):
        service.embed_document(None)


def test_non_string_input_rejected(service):
    with pytest.raises(EmbeddingError):
        service.embed_document(123)  # type: ignore[arg-type]


def test_oversized_input_is_truncated_not_rejected(service):
    """E5 truncates at max_seq_length; it must not raise or silently drop rows."""
    huge = "word " * 20000
    vector = service.embed_document(huge)
    assert len(vector) == 768
    assert np.linalg.norm(np.asarray(vector)) == pytest.approx(1.0, abs=1e-5)


def test_unicode_and_tamil_input(service):
    vector = service.embed_document("தமிழ் குருத்துக் கதை மிகவும் அழகானது")
    assert len(vector) == 768


# --------------------------------------------------------------------------- #
# Determinism
# --------------------------------------------------------------------------- #

def test_embedding_is_deterministic(service):
    a = service.embed_query("determinism check please")
    b = service.embed_query("determinism check please")
    assert a == b


def test_model_metadata_is_complete(service):
    meta = service.get_model_metadata()
    assert meta["model"] == "intfloat/multilingual-e5-base"
    assert meta["dimension"] == 768
    assert meta["query_prefix"] == "query: "
    assert meta["document_prefix"] == "passage: "
    assert meta["normalization"] == "L2"
    assert meta["similarity"] == "cosine"
    assert meta["max_seq_length"] == settings.embedding_max_seq_length
    assert meta["dtype"] == "float32"


def test_singleton_returns_same_instance():
    assert get_embedding_service() is get_embedding_service()


# --------------------------------------------------------------------------- #
# Failure modes
# --------------------------------------------------------------------------- #

def test_wrong_dimension_config_rejected():
    with pytest.raises(EmbeddingError, match="768"):
        E5EmbeddingService(model_name="intfloat/multilingual-e5-base")._dimension = 384 or None
        # Simulate a misconfigured dimension directly.
        svc = E5EmbeddingService()
        svc._dimension = 384
        svc._validate_configuration()


def test_wrong_model_rejected():
    """Only the ADR-002 selection is permitted in Phase 2."""
    with pytest.raises(EmbeddingError, match="multilingual-e5-base"):
        E5EmbeddingService(model_name="BAAI/bge-m3")


def test_removed_models_are_rejected():
    """bge-m3 and tamil-embed are out of Phase 2 scope."""
    for model in ("BAAI/bge-m3", "Tamil-ai/tamil-embed-base",
                  "all-MiniLM-L6-v2", "intfloat/multilingual-e5-small"):
        with pytest.raises(EmbeddingError):
            E5EmbeddingService(model_name=model)


def test_missing_prefix_rejected(monkeypatch):
    monkeypatch.setattr(settings, "embedding_query_prefix", "")
    with pytest.raises(EmbeddingError, match="query prefix"):
        E5EmbeddingService()


def test_disabling_normalisation_rejected(monkeypatch):
    monkeypatch.setattr(settings, "embedding_normalize", False)
    with pytest.raises(EmbeddingError, match="L2-normalised"):
        E5EmbeddingService()


def test_unavailable_model_raises_embedding_error(monkeypatch):
    """A missing model must surface as EmbeddingError, not a raw SDK error."""
    svc = E5EmbeddingService(model_name="intfloat/multilingual-e5-base",
                             revision="0" * 40)
    with pytest.raises(EmbeddingError):
        svc.embed_query("this should fail to load")


def test_encode_failure_is_wrapped(monkeypatch, service):
    service._load()
    monkeypatch.setattr(
        service._model, "encode",
        lambda *a, **k: (_ for _ in ()).throw(RuntimeError("boom")),
    )
    with pytest.raises(EmbeddingError, match="Embedding failed"):
        service.embed_query("trigger failure")


def test_unload_releases_model(service):
    service.embed_query("load me")
    assert service.is_loaded()
    service.unload()
    assert not service.is_loaded()
    # still functional afterwards (lazy reload)
    assert len(service.embed_query("reload me")) == 768


def test_token_length_uses_tokenizer(service):
    short = service.token_length("hello world")
    long = service.token_length("hello world " * 50)
    assert 0 < short < long