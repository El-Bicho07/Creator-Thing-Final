# Final Embedding Benchmark Validation Report

## Benchmark Validity

| Aspect | Status | Details |
|--------|--------|---------|
| **Dataset Size** | 36 documents, 15 queries | Small; not statistically significant for production |
| **Language Coverage** | English: 24 docs / 7 queries, Tamil: 7/3, Hindi: 2/2, Tanglish: 1/1, Hinglish: 2/2 | English-heavy; Tamil/Hindi limited; code-mixed minimal |
| **Code-Mixed Coverage** | **INSUFFICIENT** | Only 3 code-mixed docs, 3 queries; 1.0 recall likely from English token overlap |

---

## Performance (Validated)

### Retrieval Quality

| Metric | intfloat/multilingual-e5-small | all-MiniLM-L6-v2 | BAAI/bge-small-en-v1.5 |
|--------|-------------------------------|------------------|------------------------|
| **Top-3 Recall** | **0.567** | 0.544 | 0.533 |
| **MRR** | **0.933** | 0.822 | 0.900 |
| **English Recall** | 0.50 | 0.48 | 0.45 |
| **Tamil Recall** | **0.67** | 0.50 | 0.50 |
| **Hindi Recall** | 0.50 | 0.50 | 0.50 |
| **Tanglish Recall** | 1.00* | 1.00* | 1.00* |
| **Hinglish Recall** | 0.50 | 0.67 | 0.67 |

\* Code-mixed results unreliable — only 3 queries with heavy English token overlap

### Latency (Controlled Warm Inference, Batch=15)

| Metric | intfloat/multilingual-e5-small | all-MiniLM-L6-v2 | BAAI/bge-small-en-v1.5 |
|--------|-------------------------------|------------------|------------------------|
| **Cold Latency** | 99.9 ms | 62.5 ms | 76.5 ms |
| **Warm Mean** | 79.2 ms | 57.3 ms | 76.0 ms |
| **Warm p50** | 78.7 ms | 57.1 ms | 73.9 ms |
| **Warm p95** | **93.1 ms** | 60.9 ms | 84.8 ms |
| **Warm p99** | 93.1 ms | 60.9 ms | 84.8 ms |
| **Single Mean** | 11.4 ms | 6.9 ms | 5.9 ms |
| **Single p95** | 14.7 ms | 8.5 ms | 6.6 ms |

**LATENCY TARGET (<150ms): MET** — All models' warm p95 < 150ms

### Resource Usage

| Model | CPU (8 vCPU) | Memory | Throughput | Parameters |
|-------|--------------|--------|------------|------------|
| intfloat/multilingual-e5-small | 780% | 1,203 MB | 171 texts/sec | 33.4M |
| all-MiniLM-L6-v2 | 783% | 1,145 MB | 224 texts/sec | 22.7M |
| BAAI/bge-small-en-v1.5 | 785% | 1,130 MB | 174 texts/sec | N/A |

### E5 Convention

- **Prefix behavior**: `query:`/`passage:` prefixes **decrease** similarity (0.898 → 0.854)
- **Convention**: Use model **without manual prefixes** — `sentence-transformers` handles E5 encoding internally

---

## Decision

> **EMBEDDING MODEL VALIDATED — PENDING EXPLICIT APPROVAL**

### Recommended Model: `intfloat/multilingual-e5-small`

**Rationale**:
- Superior multilingual quality: **0.67 Tamil recall** vs 0.50 for alternatives
- Highest MRR (0.933): relevant results at rank 1 most consistently
- Meets latency target: warm p95 = 93ms < 150ms
- Native 100+ language support including Tamil/Hindi
- Local CPU inference, no API keys required

**Trade-offs Accepted**:
- ~30% slower than all-MiniLM-L6-v2 (93ms vs 61ms p95)
- Code-mixed performance **not validated** — requires post-launch monitoring
- Benchmark dataset small (36 docs, 15 queries) — not statistically significant

---

## Phase Status

> **PHASE 2 TECHNICALLY READY — EMBEDDING MODEL VALIDATED — WAITING FOR EXPLICIT USER APPROVAL**

### Remaining Gates Before Phase 2 Execution

1. ✅ **Embedding benchmark completed** — 4 models tested, results validated
2. ✅ **Embedding model decision documented** — ADR-002 with validated findings
3. ✅ **LLM Gateway contract validated** — 14/14 capabilities covered (ADR-003)
4. ✅ **RLS / Multi-tenancy functional** — Cross-user isolation verified
5. ✅ **Feature routers registered** — 6 routers with RLS context
6. ⏳ **EXPLICIT APPROVAL REQUIRED** — Approve `intfloat/multilingual-e5-small` trade-off
7. ⏳ **ACKNOWLEDGE** — Production API keys blocked; mock gateway available for dev

### Not Required for Phase 2 Start
- Production deployment decision (needed before Phase 3)
- Production API keys (mock gateway available)
- Production re-embedding migration (Phase 2 task)

---

## Next Steps

1. **Stakeholder Review**: Approve `intfloat/multilingual-e5-small` (30% slower for 0.67 vs 0.50 Tamil recall)
2. **Authorize Phase 2 Start**: With mock LLM gateway
3. **Async**: Provide production API keys when available
4. **Async**: Decide deployment target before Phase 3