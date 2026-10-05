#!/usr/bin/env python3
"""
Embedding Model Benchmark for Creator Platform SaaS

Evaluates candidate embedding models on:
1. Retrieval quality (Top-3 Recall, MRR)
2. Multilingual support (English, Tamil, Hindi, Code-mixed)
3. Creator-content relevance
4. Runtime characteristics (latency, CPU, memory)

Models tested:
- all-MiniLM-L6-v2 (384d, sentence-transformers)
- all-mpnet-base-v2 (768d, sentence-transformers)  
- multilingual-e5-small (384d, sentence-transformers)
- BAAI/bge-small-en-v1.5 (384d, fastembed) - Module 19 donor
"""

import json
import time
import statistics
import sys
import gc
from typing import List, Dict, Any
from dataclasses import dataclass
import numpy as np

# Candidate models
CANDIDATE_MODELS = {
    "all-MiniLM-L6-v2": {
        "library": "sentence-transformers",
        "model_name": "all-MiniLM-L6-v2",
        "dimensions": 384,
    },
    "all-mpnet-base-v2": {
        "library": "sentence-transformers", 
        "model_name": "all-mpnet-base-v2",
        "dimensions": 768,
    },
    "intfloat/multilingual-e5-small": {
        "library": "sentence-transformers",
        "model_name": "intfloat/multilingual-e5-small",
        "dimensions": 384,
    },
    "BAAI/bge-small-en-v1.5": {
        "library": "fastembed",
        "model_name": "BAAI/bge-small-en-v1.5",
        "dimensions": 384,
    },
}

# ============================================================
# EVALUATION DATASET
# ============================================================

# Creator content corpus - representative of actual platform use
CORPUS = [
    # Creator posts - educational/technical
    {"id": "p1", "text": "Building a SaaS with Next.js and FastAPI: My complete tech stack walkthrough", "language": "en", "type": "post"},
    {"id": "p2", "text": "How I structure React components for maintainability - folder structure and patterns", "language": "en", "type": "post"},
    {"id": "p3", "text": "PostgreSQL indexing strategies that cut query time by 90%", "language": "en", "type": "post"},
    {"id": "p4", "text": "Why I switched from MongoDB to PostgreSQL for my creator platform", "language": "en", "type": "post"},
    
    # Creator posts - personal/behind-the-scenes
    {"id": "p5", "text": "My morning routine as a solo founder: coffee, code, and content", "language": "en", "type": "post"},
    {"id": "p6", "text": "The reality of building in public: wins, losses, and imposter syndrome", "language": "en", "type": "post"},
    {"id": "p7", "text": "How I batch content creation: 30 pieces in 3 hours every Sunday", "language": "en", "type": "post"},
    
    # Creator posts - Tamil
    {"id": "p8", "text": "என் புதிய லாப்டாப் மெக் பூக் ஏர் எம் தெரியுமா? மிகவும் வேகமாக வேலை செய்கிறது!", "language": "ta", "type": "post"},
    {"id": "p9", "text": "டெவலப்பர் கருயராக எப்படி ஆரம்பிக்கலாம் - தமிழில் முழு வழிகாட்டி", "language": "ta", "type": "post"},
    {"id": "p10", "text": "என் மாதாந்திர வருமானம் $5000 ஆகியது - இதை எப்படி அடைந்தேன்", "language": "ta", "type": "post"},
    
    # Creator posts - Hindi
    {"id": "p11", "text": "मेरा नया यूट्यूब चैनल 1 लाख सब्सक्राइबर्स तक पहुंच गया!", "language": "hi", "type": "post"},
    {"id": "p12", "text": "फ्रीलांसिंग से फुल टाइम क्रिएटर बनने का मेरा सफर", "language": "hi", "type": "post"},
    
    # Code-mixed (Tanglish/Hinglish)
    {"id": "p13", "text": "Next.js 14 app router use pannitu SaaS build pannirukken - super fast!", "language": "tanglish", "type": "post"},
    {"id": "p14", "text": "React hooks vs class components - kaun better hai for 2024?", "language": "hinglish", "type": "post"},
    {"id": "p15", "text": "Database indexing strategy - PostgreSQL mein kaise optimize karna", "language": "hinglish", "type": "post"},
    
    # Captions
    {"id": "c1", "text": "POV: You finally fixed that bug after 6 hours 😭 #devlife #coding", "language": "en", "type": "caption"},
    {"id": "c2", "text": "Consistency > intensity. Small daily wins compound. 📈", "language": "en", "type": "caption"},
    {"id": "c3", "text": "நீங்களும் யாராவது மேம்பட விரும்பிறீர்களா? இதோ என் திட்டம் 👇", "language": "ta", "type": "caption"},
    {"id": "c4", "text": "SaaS launch day! 6 months of work finally live 🚀 #buildinpublic", "language": "en", "type": "caption"},
    
    # Hooks
    {"id": "h1", "text": "Most developers make this mistake when scaling PostgreSQL...", "language": "en", "type": "hook"},
    {"id": "h2", "text": "I lost $10k because I didn't know this one React pattern", "language": "en", "type": "hook"},
    {"id": "h3", "text": "Stop using useEffect for data fetching - do this instead", "language": "en", "type": "hook"},
    {"id": "h4", "text": "என் முதல் $1000 வருமானம் எப்படி வந்தது - முழு கதை", "language": "ta", "type": "hook"},
    
    # Scripts
    {"id": "s1", "text": "Hook: Stop using useEffect for data fetching! Body: Here's why it causes bugs... CTA: Comment 'REACT' for my cheat sheet", "language": "en", "type": "script"},
    {"id": "s2", "text": "Scene 1: Show the problem. Scene 2: Reveal the solution. Scene 3: Demo the result. Scene 4: Call to action.", "language": "en", "type": "script"},
    
    # Ideas
    {"id": "i1", "text": "Content idea: Compare Vercel vs Railway vs Render for Next.js hosting", "language": "en", "type": "idea"},
    {"id": "i2", "text": "Content idea: My complete Notion workspace tour for content creators", "language": "en", "type": "idea"},
    {"id": "i3", "text": "வ Sowjetியம்: தமிழ் உருவாக்குனர்களுக்கு AI கருவிகள் எப்படி உதவுகின்றன", "language": "ta", "type": "idea"},
    
    # Personal notes
    {"id": "n1", "text": "Meeting notes: Discussed Q3 content calendar with team. Focus on Shorts and Reels.", "language": "en", "type": "note"},
    {"id": "n2", "text": "Idea: Create a course on 'PostgreSQL for Application Developers'", "language": "en", "type": "note"},
    
    # Content strategy
    {"id": "strat1", "text": "Pillar 1: Technical tutorials (React, Next.js, PostgreSQL). Pillar 2: Creator journey. Pillar 3: Tool reviews.", "language": "en", "type": "strategy"},
    {"id": "strat2", "text": "Post 3x/week: Mon (tutorial), Wed (journey), Fri (tool review). Repurpose to LinkedIn/Twitter.", "language": "en", "type": "strategy"},
    
    # Audience observations
    {"id": "aud1", "text": "Audience asks most about: deployment, database optimization, and React patterns. Least about: CSS.", "language": "en", "type": "audience"},
    {"id": "aud2", "text": "தமிழ் аудиேன்ஸ் அதிகம் கேட்கிறார்கள்: freelancing, remote jobs, AI tools.", "language": "ta", "type": "audience"},
    
    # Performance observations
    {"id": "perf1", "text": "Technical tutorials get 3x more saves than personal posts. Hook-driven content gets 5x more comments.", "language": "en", "type": "performance"},
    {"id": "perf2", "text": "Reels under 30 seconds have 40% higher completion rate. Tamil content gets 2x engagement rate.", "language": "en", "type": "performance"},
]

# Queries for retrieval evaluation
QUERIES = [
    # English queries
    {"id": "q1", "query": "How to optimize PostgreSQL queries and indexing", "language": "en", "expected": ["p3", "p4", "strat1"]},
    {"id": "q2", "query": "React hooks best practices and common mistakes", "language": "en", "expected": ["p2", "h3", "s1"]},
    {"id": "q3", "query": "Building a SaaS with Next.js and FastAPI", "language": "en", "expected": ["p1", "p13", "strat1"]},
    {"id": "q4", "query": "Morning routine and productivity tips for founders", "language": "en", "expected": ["p5", "p7", "c2"]},
    {"id": "q4", "query": "Content batching and scheduling strategy", "language": "en", "expected": ["p7", "strat2", "aud1"]},
    {"id": "q5", "query": "PostgreSQL vs MongoDB for creator platform", "language": "en", "expected": ["p4", "strat1"]},
    {"id": "q6", "query": "How to grow YouTube channel to 100k subscribers", "language": "en", "expected": ["p11", "perf1", "aud1"]},
    
    # Tamil queries
    {"id": "q7", "query": "டெவலப்பர் ஆக வழிகாட்டி தமிழில்", "language": "ta", "expected": ["p9", "aud2"]},
    {"id": "q8", "query": "என் மாதாந்திர வருமானம் எப்படி அதிகரிக்கலாம்", "language": "ta", "expected": ["p10", "i3"]},
    {"id": "q9", "query": "தமிழ் மொழியில் AI கருவிகள் விமர்சனம்", "language": "ta", "expected": ["i3", "aud2"]},
    
    # Hindi queries
    {"id": "q10", "query": "फ्रीलांसिंग से फुल टाइम क्रिएटर बनना", "language": "hi", "expected": ["p12", "aud1"]},
    {"id": "q11", "query": "यूट्यूब चैनल ग्रोथ टिप्स हिंदी में", "language": "hi", "expected": ["p11", "perf1"]},
    
    # Code-mixed queries
    {"id": "q12", "query": "Next.js app router use pannitu SaaS build", "language": "tanglish", "expected": ["p13", "p1"]},
    {"id": "q13", "query": "React hooks vs class components kaun better", "language": "hinglish", "expected": ["p14", "h3", "s1"]},
    {"id": "q14", "query": "PostgreSQL indexing strategy kaise optimize karna", "language": "hinglish", "expected": ["p15", "p3", "strat1"]},
]

# ============================================================
# BENCHMARK UTILITIES
# ============================================================

@dataclass
class BenchmarkResult:
    model_name: str
    library: str
    dimensions: int
    
    # Retrieval metrics
    top3_recall: float
    mrr: float
    relevance_scores: Dict[str, float]
    
    # Runtime metrics
    embedding_latency_ms: float
    retrieval_latency_ms: float
    memory_usage_mb: float
    model_size_mb: float
    
    # Language breakdown
    language_recall: Dict[str, float]
    
    # Metadata
    total_corpus_size: int
    total_queries: int


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


def load_model(model_config: Dict[str, Any]):
    """Load embedding model based on configuration."""
    lib = model_config["library"]
    name = model_config["model_name"]
    
    if lib == "sentence-transformers":
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(name)
        return model
    elif lib == "fastembed":
        from fastembed import TextEmbedding
        model = TextEmbedding(model_name=name)
        return model
    else:
        raise ValueError(f"Unknown library: {lib}")


def embed_texts(model, texts: List[str], model_config: Dict[str, Any]) -> List[np.ndarray]:
    """Generate embeddings for a list of texts."""
    lib = model_config["library"]
    
    if lib == "sentence-transformers":
        embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        return [np.array(e) for e in embeddings]
    elif lib == "fastembed":
        # fastembed returns generator of vectors
        vectors = list(model.embed(texts))
        return [np.array(v) for v in vectors]
    else:
        raise ValueError(f"Unknown library: {lib}")


def evaluate_retrieval(
    model, 
    model_config: Dict[str, Any], 
    corpus: List[Dict], 
    queries: List[Dict],
    top_k: int = 3
) -> Dict[str, Any]:
    """Evaluate retrieval quality using cosine similarity."""
    
    # Embed corpus
    corpus_texts = [item["text"] for item in corpus]
    corpus_embeddings = embed_texts(model, corpus_texts, model_config)
    corpus_ids = [item["id"] for item in corpus]
    
    # Embed queries
    query_texts = [q["query"] for q in queries]
    query_embeddings = embed_texts(model, query_texts, model_config)
    
    # Evaluate each query
    recalls = []
    mrrs = []
    language_recalls = {}
    
    for lang in ["en", "ta", "hi", "tanglish", "hinglish"]:
        language_recalls[lang] = []
    
    for i, (query_emb, query) in enumerate(zip(query_embeddings, queries)):
        # Compute similarities
        similarities = [cosine_similarity(query_emb, ce) for ce in corpus_embeddings]
        
        # Get top-k indices
        top_indices = np.argsort(similarities)[::-1][:top_k]
        top_ids = [corpus_ids[idx] for idx in top_indices]
        
        # Compute recall
        expected = set(query["expected"])
        retrieved = set(top_ids)
        recall = len(expected & retrieved) / len(expected) if expected else 1.0
        recalls.append(recall)
        
        # Compute MRR
        mrr = 0.0
        for rank, doc_id in enumerate(top_ids, 1):
            if doc_id in expected:
                mrr = 1.0 / rank
                break
        mrrs.append(mrr)
        
        # Track by language
        lang = query["language"]
        if lang in language_recalls:
            language_recalls[lang].append(recall)
    
    # Average metrics
    avg_recall = statistics.mean(recalls) if recalls else 0
    avg_mrr = statistics.mean(mrrs) if mrrs else 0
    
    # Language breakdown
    lang_avg = {}
    for lang, vals in language_recalls.items():
        lang_avg[lang] = statistics.mean(vals) if vals else 0
    
    return {
        "top3_recall": avg_recall,
        "mrr": avg_mrr,
        "language_recall": lang_avg,
        "per_query_recall": recalls,
        "per_query_mrr": mrrs,
    }


def measure_latency(model, model_config: Dict[str, Any], texts: List[str], runs: int = 5) -> Dict[str, float]:
    """Measure embedding and retrieval latency."""
    lib = model_config["library"]
    
    # Warmup
    _ = embed_texts(model, texts[:3], model_config)
    
    # Embedding latency
    embed_times = []
    for _ in range(runs):
        gc.collect()
        start = time.perf_counter()
        _ = embed_texts(model, texts, model_config)
        end = time.perf_counter()
        embed_times.append((end - start) * 1000)  # ms
    
    # Retrieval latency (embed + similarity)
    corpus_texts = [item["text"] for item in CORPUS]
    corpus_embeddings = embed_texts(model, corpus_texts, model_config)
    query_texts = [q["query"] for q in QUERIES]
    query_embeddings = embed_texts(model, query_texts, model_config)
    
    retrieve_times = []
    for _ in range(runs):
        gc.collect()
        start = time.perf_counter()
        for q_emb in query_embeddings:
            _ = [cosine_similarity(q_emb, ce) for ce in corpus_embeddings]
        end = time.perf_counter()
        retrieve_times.append((end - start) * 1000)  # ms
    
    return {
        "embedding_latency_ms": statistics.mean(embed_times),
        "embedding_latency_stdev": statistics.stdev(embed_times) if len(embed_times) > 1 else 0,
        "retrieval_latency_ms": statistics.mean(retrieve_times),
        "retrieval_latency_stdev": statistics.stdev(retrieve_times) if len(retrieve_times) > 1 else 0,
    }


def measure_memory(model, model_config: Dict[str, Any]) -> float:
    """Estimate model memory usage in MB."""
    try:
        import psutil
        process = psutil.Process()
        
        # Measure baseline
        gc.collect()
        baseline = process.memory_info().rss / 1024 / 1024
        
        # Model should already be loaded
        # Just measure current process memory
        current = process.memory_info().rss / 1024 / 1024
        
        # Return approximate model memory (current - baseline for python)
        return current
    except ImportError:
        # psutil not available, return 0
        return 0.0
    except Exception:
        return 0.0


def estimate_model_size(model_config: Dict[str, Any]) -> float:
    """Estimate model size on disk in MB."""
    try:
        import os
        from pathlib import Path
        
        if model_config["library"] == "sentence-transformers":
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer(model_config["model_name"])
            # Check cache directory
            cache_dir = Path.home() / ".cache" / "torch" / "sentence_transformers"
            if cache_dir.exists():
                total = 0
                for f in cache_dir.rglob("*"):
                    if f.is_file() and model_config["model_name"] in str(f):
                        total += f.stat().st_size
                return total / 1024 / 1024
        elif model_config["library"] == "fastembed":
            from fastembed import TextEmbedding
            model = TextEmbedding(model_name=model_config["model_name"])
            cache_dir = Path.home() / ".cache" / "fastembed"
            if cache_dir.exists():
                total = 0
                for f in cache_dir.rglob("*"):
                    if f.is_file():
                        total += f.stat().st_size
                return total / 1024 / 1024
        return 0.0
    except Exception:
        return 0.0


def run_benchmark(model_name: str, model_config: Dict[str, Any]) -> BenchmarkResult:
    """Run complete benchmark for a single model."""
    print(f"\n{'='*60}")
    print(f"Benchmarking: {model_name} ({model_config['library']})")
    print(f"{'='*60}")
    
    # Load model
    print("Loading model...")
    load_start = time.perf_counter()
    model = load_model(model_config)
    load_time = time.perf_counter() - load_start
    print(f"Model loaded in {load_time:.2f}s")
    
    # Measure runtime
    print("Measuring latency...")
    corpus_texts = [item["text"] for item in CORPUS]
    latency_metrics = measure_latency(model, model_config, corpus_texts)
    
    # Measure memory
    print("Measuring memory...")
    memory_mb = measure_memory(model, model_config)
    
    # Estimate model size
    model_size_mb = estimate_model_size(model_config)
    
    # Evaluate retrieval
    print("Evaluating retrieval quality...")
    retrieval_metrics = evaluate_retrieval(model, model_config, CORPUS, QUERIES)
    
    # Language breakdown
    lang_recall = retrieval_metrics["language_recall"]
    
    result = BenchmarkResult(
        model_name=model_name,
        library=model_config["library"],
        dimensions=model_config["dimensions"],
        top3_recall=retrieval_metrics["top3_recall"],
        mrr=retrieval_metrics["mrr"],
        relevance_scores={},  # Could add per-query details
        embedding_latency_ms=latency_metrics["embedding_latency_ms"],
        retrieval_latency_ms=latency_metrics["retrieval_latency_ms"],
        memory_usage_mb=memory_mb,
        model_size_mb=model_size_mb,
        language_recall=lang_recall,
        total_corpus_size=len(CORPUS),
        total_queries=len(QUERIES),
    )
    
    print(f"\nResults for {model_name}:")
    print(f"  Top-3 Recall: {result.top3_recall:.4f}")
    print(f"  MRR: {result.mrr:.4f}")
    print(f"  Embedding Latency: {result.embedding_latency_ms:.2f} ms")
    print(f"  Retrieval Latency: {result.retrieval_latency_ms:.2f} ms")
    print(f"  Memory Usage: {result.memory_usage_mb:.1f} MB")
    print(f"  Model Size: {result.model_size_mb:.1f} MB")
    print(f"  Dimensions: {result.dimensions}")
    print(f"  Language Recall:")
    for lang, recall in lang_recall.items():
        print(f"    {lang}: {recall:.4f}")
    
    return result


def main():
    print("Embedding Model Benchmark - Creator Platform SaaS")
    print("=" * 60)
    print(f"Corpus size: {len(CORPUS)} documents")
    print(f"Queries: {len(QUERIES)}")
    print(f"Languages: English, Tamil, Hindi, Tanglish, Hinglish")
    print(f"Content types: posts, captions, hooks, scripts, ideas, notes, strategy, audience, performance")
    
    results = {}
    
    for model_name, config in CANDIDATE_MODELS.items():
        try:
            result = run_benchmark(model_name, config)
            results[model_name] = result
        except Exception as e:
            print(f"ERROR benchmarking {model_name}: {e}")
            import traceback
            traceback.print_exc()
            results[model_name] = None
    
    # Print summary table
    print("\n" + "=" * 80)
    print("BENCHMARK SUMMARY")
    print("=" * 80)
    print(f"{'Model':<30} {'Lib':<12} {'Dim':<4} {'Recall':<8} {'MRR':<8} {'Emb Lat':<10} {'Ret Lat':<10} {'Mem':<8} {'Size':<8}")
    print("-" * 80)
    
    for model_name, result in results.items():
        if result:
            print(f"{model_name:<30} {result.library:<12} {result.dimensions:<4} "
                  f"{result.top3_recall:<8.4f} {result.mrr:<8.4f} "
                  f"{result.embedding_latency_ms:<10.2f} {result.retrieval_latency_ms:<10.2f} "
                  f"{result.memory_usage_mb:<8.1f} {result.model_size_mb:<8.1f}")
        else:
            print(f"{model_name:<30} FAILED")
    
    # Save results
    output = {
        "benchmark_info": {
            "corpus_size": len(CORPUS),
            "queries": len(QUERIES),
            "languages": ["en", "ta", "hi", "tanglish", "hinglish"],
            "content_types": ["post", "caption", "hook", "script", "idea", "note", "strategy", "audience", "performance"],
            "metrics": ["top3_recall", "mrr", "embedding_latency_ms", "retrieval_latency_ms", "memory_usage_mb", "model_size_mb", "dimensions"],
        },
        "results": {}
    }
    
    for model_name, result in results.items():
        if result:
            output["results"][model_name] = {
                "library": result.library,
                "dimensions": result.dimensions,
                "top3_recall": result.top3_recall,
                "mrr": result.mrr,
                "embedding_latency_ms": result.embedding_latency_ms,
                "retrieval_latency_ms": result.retrieval_latency_ms,
                "memory_usage_mb": result.memory_usage_mb,
                "model_size_mb": result.model_size_mb,
                "language_recall": result.language_recall,
            }
    
    with open("/app/docs/eval/embedding_benchmark_results.json", "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"\nResults saved to /app/docs/eval/embedding_benchmark_results.json")
    
    return results


if __name__ == "__main__":
    main()