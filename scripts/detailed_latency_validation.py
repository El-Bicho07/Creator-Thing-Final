#!/usr/bin/env python3
"""
Detailed Latency & Resource Validation for Embedding Models
"""

import time
import statistics
import gc
import numpy as np
from typing import List, Dict, Any
import psutil
import os

# Load the models we need to test
from sentence_transformers import SentenceTransformer
from fastembed import TextEmbedding

MODELS = {
    "intfloat/multilingual-e5-small": {
        "library": "sentence-transformers",
        "model_name": "intfloat/multilingual-e5-small",
        "dimensions": 384,
    },
    "all-MiniLM-L6-v2": {
        "library": "sentence-transformers",
        "model_name": "all-MiniLM-L6-v2",
        "dimensions": 384,
    },
    "BAAI/bge-small-en-v1.5": {
        "library": "fastembed",
        "model_name": "BAAI/bge-small-en-v1.5",
        "dimensions": 384,
    },
}

TEST_TEXTS = [
    "Building a SaaS with Next.js and FastAPI: My complete tech stack walkthrough",
    "How I structure React components for maintainability - folder structure and patterns",
    "PostgreSQL indexing strategies that cut query time by 90%",
    "Why I switched from MongoDB to PostgreSQL for my creator platform",
    "My morning routine as a solo founder: coffee, code, and content",
    "The reality of building in public: wins, losses, and imposter syndrome",
    "How I batch content creation: 30 pieces in 3 hours every Sunday",
    "என் புதிய லாப்டாப் மெக் பூக் ஏர் எம் தெரியுமா? மிகவும் வேகமாக வேலை செய்கிறது!",
    "டெவலப்பர் கருயராக எப்படி ஆரம்பிக்கலாம் - தமிழில் முழு வழிகாட்டி",
    "என் மாதாந்திர வருமானம் $5000 ஆகியது - இதை எப்படி அடைந்தேன்",
    "मेरा नया यूट्यूब चैनल 1 लाख सब्सक्राइबर्स तक पहुंच गया!",
    "फ्रीलांसिंग से फुल टाइम क्रिएटर बनने का मेरा सफर",
    "Next.js 14 app router use pannitu SaaS build pannirukken - super fast!",
    "React hooks vs class components - kaun better hai for 2024?",
    "Database indexing strategy - PostgreSQL mein kaise optimize karna",
]

def load_model(config):
    lib = config["library"]
    name = config["model_name"]
    if lib == "sentence-transformers":
        return SentenceTransformer(name)
    elif lib == "fastembed":
        return TextEmbedding(model_name=name)
    raise ValueError(f"Unknown library: {lib}")

def embed_texts(model, texts, config):
    lib = config["library"]
    if lib == "sentence-transformers":
        return model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    elif lib == "fastembed":
        return np.array(list(model.embed(texts)))
    raise ValueError(f"Unknown library: {lib}")

def measure_detailed_latency(model, texts, config, warmup_runs=3, measure_runs=20):
    """Measure detailed latency: cold, warm, p50, p95, p99"""
    lib = config["library"]
    
    # Cold start - first run after model load (no warmup)
    gc.collect()
    start = time.perf_counter()
    _ = embed_texts(model, texts, config)
    cold_latency = (time.perf_counter() - start) * 1000
    
    # Warmup runs
    for _ in range(warmup_runs):
        _ = embed_texts(model, texts[:3], config)
    
    # Warm runs
    warm_times = []
    for _ in range(measure_runs):
        gc.collect()
        start = time.perf_counter()
        _ = embed_texts(model, texts, config)
        end = time.perf_counter()
        warm_times.append((end - start) * 1000)
    
    warm_times.sort()
    n = len(warm_times)
    
    return {
        "cold_latency_ms": cold_latency,
        "warm_mean_ms": statistics.mean(warm_times),
        "warm_stdev_ms": statistics.stdev(warm_times) if len(warm_times) > 1 else 0,
        "warm_p50_ms": warm_times[n // 2],
        "warm_p95_ms": warm_times[int(n * 0.95)],
        "warm_p99_ms": warm_times[int(n * 0.99)],
        "warm_min_ms": warm_times[0],
        "warm_max_ms": warm_times[-1],
        "batch_size": len(texts),
        "runs": measure_runs,
    }

def measure_single_latency(model, texts, config, runs=100):
    """Measure single-text embedding latency"""
    lib = config["library"]
    
    # Warmup
    for _ in range(5):
        _ = embed_texts(model, [texts[0]], config)
    
    single_times = []
    for _ in range(runs):
        gc.collect()
        start = time.perf_counter()
        _ = embed_texts(model, [texts[0]], config)
        end = time.perf_counter()
        single_times.append((end - start) * 1000)
    
    single_times.sort()
    n = len(single_times)
    
    return {
        "mean_ms": statistics.mean(single_times),
        "stdev_ms": statistics.stdev(single_times) if len(single_times) > 1 else 0,
        "p50_ms": single_times[n // 2],
        "p95_ms": single_times[int(n * 0.95)],
        "p99_ms": single_times[int(n * 0.99)],
        "min_ms": single_times[0],
        "max_ms": single_times[-1],
    }

def measure_throughput(model, config, duration_seconds=10):
    """Measure embedding throughput (texts/second)"""
    lib = config["library"]
    
    # Warmup
    _ = embed_texts(model, TEST_TEXTS[:3], config)
    
    start = time.perf_counter()
    count = 0
    while time.perf_counter() - start < duration_seconds:
        _ = embed_texts(model, TEST_TEXTS, config)
        count += len(TEST_TEXTS)
    
    elapsed = time.perf_counter() - start
    return {
        "texts_per_second": count / elapsed,
        "batches_per_second": (count / len(TEST_TEXTS)) / elapsed,
        "total_texts": count,
        "duration_seconds": elapsed,
    }

def measure_cpu_memory(model, config, duration_seconds=5):
    """Measure CPU and memory during embedding"""
    process = psutil.Process()
    
    # Warmup
    _ = embed_texts(model, TEST_TEXTS[:3], config)
    
    cpu_samples = []
    mem_samples = []
    
    start = time.perf_counter()
    while time.perf_counter() - start < duration_seconds:
        _ = embed_texts(model, TEST_TEXTS, config)
        cpu_samples.append(process.cpu_percent())
        mem_samples.append(process.memory_info().rss / 1024 / 1024)
    
    return {
        "cpu_percent_mean": statistics.mean(cpu_samples) if cpu_samples else 0,
        "cpu_percent_max": max(cpu_samples) if cpu_samples else 0,
        "memory_mb_mean": statistics.mean(mem_samples) if mem_samples else 0,
        "memory_mb_max": max(mem_samples) if mem_samples else 0,
        "samples": len(cpu_samples),
    }

def verify_e5_convention(model, config):
    """Verify E5 model usage convention (query prefix)"""
    if "e5" not in config["model_name"].lower():
        return {"note": "Not an E5 model"}
    
    # Test query vs passage encoding difference
    query = "How to optimize PostgreSQL"
    passage = "PostgreSQL indexing strategies that cut query time by 90%"
    
    # E5 expects: "query: " prefix for queries, "passage: " for documents
    # But sentence-transformers handles this automatically for some models
    
    # Test without prefix
    q_emb = embed_texts(model, [query], config)[0]
    p_emb = embed_texts(model, [passage], config)[0]
    sim_no_prefix = np.dot(q_emb, p_emb) / (np.linalg.norm(q_emb) * np.linalg.norm(p_emb))
    
    # Test with E5 prefix convention
    q_emb_prefixed = embed_texts(model, [f"query: {query}"], config)[0]
    p_emb_prefixed = embed_texts(model, [f"passage: {passage}"], config)[0]
    sim_with_prefix = np.dot(q_emb_prefixed, p_emb_prefixed) / (np.linalg.norm(q_emb_prefixed) * np.linalg.norm(p_emb_prefixed))
    
    return {
        "similarity_no_prefix": float(sim_no_prefix),
        "similarity_with_e5_prefix": float(sim_with_prefix),
        "prefix_improves": sim_with_prefix > sim_no_prefix,
        "note": "E5 models typically expect 'query: ' and 'passage: ' prefixes for asymmetric retrieval"
    }

def main():
    print("=" * 70)
    print("DETAILED LATENCY & RESOURCE VALIDATION")
    print("=" * 70)
    
    all_results = {}
    
    for model_name, config in MODELS.items():
        print(f"\n{'='*70}")
        print(f"Testing: {model_name} ({config['library']})")
        print(f"{'='*70}")
        
        try:
            print("Loading model...")
            model = load_model(config)
            print("Model loaded.")
            
            # Detailed batch latency
            print("Measuring detailed batch latency (cold/warm/p50/p95/p99)...")
            batch_latency = measure_detailed_latency(model, TEST_TEXTS, config)
            
            # Single text latency
            print("Measuring single-text latency...")
            single_latency = measure_single_latency(model, TEST_TEXTS, config)
            
            # Throughput
            print("Measuring throughput...")
            throughput = measure_throughput(model, config)
            
            # CPU/Memory
            print("Measuring CPU/Memory...")
            cpu_mem = measure_cpu_memory(model, config)
            
            # E5 convention
            e5_info = verify_e5_convention(model, config)
            
            # Model info
            import torch
            if hasattr(model, '_modules'):
                param_count = sum(p.numel() for p in model.parameters() if p.requires_grad)
            else:
                param_count = "N/A (fastembed)"
            
            result = {
                "model_name": model_name,
                "library": config["library"],
                "dimensions": config["dimensions"],
                "batch_latency": batch_latency,
                "single_latency": single_latency,
                "throughput": throughput,
                "cpu_memory": cpu_mem,
                "e5_convention": e5_info,
                "param_count": param_count,
            }
            all_results[model_name] = result
            
            # Print summary
            print(f"\nResults for {model_name}:")
            print(f"  Cold latency: {batch_latency['cold_latency_ms']:.2f} ms")
            print(f"  Warm mean: {batch_latency['warm_mean_ms']:.2f} ms")
            print(f"  Warm p50: {batch_latency['warm_p50_ms']:.2f} ms")
            print(f"  Warm p95: {batch_latency['warm_p95_ms']:.2f} ms")
            print(f"  Warm p99: {batch_latency['warm_p99_ms']:.2f} ms")
            print(f"  Single mean: {single_latency['mean_ms']:.2f} ms")
            print(f"  Single p95: {single_latency['p95_ms']:.2f} ms")
            print(f"  Throughput: {throughput['texts_per_second']:.1f} texts/sec")
            print(f"  CPU mean: {cpu_mem['cpu_percent_mean']:.1f}%")
            print(f"  Memory: {cpu_mem['memory_mb_mean']:.1f} MB")
            print(f"  E5 convention: {e5_info}")
            
        except Exception as e:
            print(f"ERROR testing {model_name}: {e}")
            import traceback
            traceback.print_exc()
            all_results[model_name] = {"error": str(e)}
    
    # Print summary table
    print("\n" + "=" * 100)
    print("DETAILED LATENCY & RESOURCE SUMMARY")
    print("=" * 100)
    print(f"{'Model':<30} {'Cold':>8} {'Warm':>8} {'p50':>8} {'p95':>8} {'p99':>8} {'Single':>8} {'p95s':>8} {'Throughput':>10} {'CPU%':>6} {'MemMB':>7}")
    print("-" * 100)
    
    for model_name, result in all_results.items():
        if "error" not in result:
            b = result["batch_latency"]
            s = result["single_latency"]
            t = result["throughput"]
            c = result["cpu_memory"]
            print(f"{model_name:<30} {b['cold_latency_ms']:>8.1f} {b['warm_mean_ms']:>8.1f} {b['warm_p50_ms']:>8.1f} {b['warm_p95_ms']:>8.1f} {b['warm_p99_ms']:>8.1f} {s['mean_ms']:>8.1f} {s['p95_ms']:>8.1f} {t['texts_per_second']:>10.1f} {c['cpu_percent_mean']:>6.1f} {c['memory_mb_mean']:>7.1f}")
        else:
            print(f"{model_name:<30} ERROR: {result['error']}")
    
    # Save detailed results
    import json
    output = {}
    for model_name, result in all_results.items():
        if "error" not in result:
            output[model_name] = {
                "batch_latency": result["batch_latency"],
                "single_latency": result["single_latency"],
                "throughput": result["throughput"],
                "cpu_memory": result["cpu_memory"],
                "e5_convention": result["e5_convention"],
                "param_count": str(result["param_count"]),
            }
    
    with open("/app/docs/eval/detailed_latency_results.json", "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"\nDetailed results saved to /app/docs/eval/detailed_latency_results.json")

if __name__ == "__main__":
    main()