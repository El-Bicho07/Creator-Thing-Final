#!/usr/bin/env python3
"""
Build the Part A dataset-validation sample.

Selects 30 (query -> gold document) pairs:
  - 15 "Tamil-related"  : query_language == 'ta' AND query_type == 'native'
  - 15 "Tanglish-related": query_type == 'Tanglish'

Selection is deterministic: random.Random(SEED) over a sorted candidate list.

No PII handling is applied because the corpus is synthetic and self-authored;
this script asserts that rather than assuming it.

Inputs  : docs/eval/benchmarks/2026-10-03_embedding_raw/{documents.csv,per_query_results.csv}
Outputs : docs/eval/benchmarks/benchmark_followup/dataset_validation_sample.csv
          docs/eval/benchmarks/benchmark_followup/validation_seed.txt
"""
import csv
import os
import random
import re
import sys

SEED = 20261003
N_PER_GROUP = 15

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EXPORT = os.path.join(ROOT, "docs/eval/benchmarks/2026-10-03_embedding_raw")
OUTDIR = os.path.join(ROOT, "docs/eval/benchmarks/benchmark_followup")

PII_PATTERNS = [
    ("email", re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")),
    ("url", re.compile(r"(?:https?://|www\.)\S+")),
    ("handle", re.compile(r"(?<![\w.])@[A-Za-z0-9_]{2,}")),
    ("phone", re.compile(r"(?<!\d)(?:\+?\d[\d \-]{8,}\d)(?!\d)")),
    ("long_digits", re.compile(r"(?<!\d)\d{9,}(?!\d)")),
]


def pii_scan(text):
    """Return list of PII categories found in text."""
    hits = []
    for name, pat in PII_PATTERNS:
        if pat.search(text or ""):
            hits.append(name)
    return hits


def main():
    if not os.path.isdir(EXPORT):
        sys.exit("FATAL: source export folder missing: %s" % EXPORT)

    docs = {}
    with open(os.path.join(EXPORT, "documents.csv"), encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            docs[row["doc_id"]] = row

    queries = []
    with open(os.path.join(EXPORT, "per_query_results.csv"), encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            if row["condition"] == "documented_prefixes":
                queries.append(row)

    # Deterministic candidate pools, sorted by query_id.
    tamil = sorted(
        [q for q in queries if q["query_language"] == "ta" and q["query_type"] == "native"],
        key=lambda q: q["query_id"],
    )
    tanglish = sorted(
        [q for q in queries if q["query_type"] == "Tanglish"],
        key=lambda q: q["query_id"],
    )
    print("candidate pools: tamil_native=%d tanglish=%d" % (len(tamil), len(tanglish)))
    if len(tamil) < N_PER_GROUP or len(tanglish) < N_PER_GROUP:
        sys.exit("FATAL: pool smaller than requested sample")

    rng = random.Random(SEED)
    picked = []
    for group, pool in (("tamil_native", tamil), ("tanglish", tanglish)):
        chosen = rng.sample(pool, N_PER_GROUP)
        for q in sorted(chosen, key=lambda r: r["query_id"]):
            gold_ids = [g for g in q["relevant_doc_ids"].split("|") if g]
            if not gold_ids:
                continue
            # One (query -> gold doc) pair per selected query.
            # Deterministic choice: lowest gold doc id (avoids seed-order effects).
            gold_id = sorted(gold_ids)[0]
            picked.append((group, q, gold_id))

    # Verify every referenced doc exists.
    for _, _, gid in picked:
        if gid not in docs:
            sys.exit("FATAL: gold doc %s not in documents.csv" % gid)

    out_path = os.path.join(OUTDIR, "dataset_validation_sample.csv")
    os.makedirs(OUTDIR, exist_ok=True)
    with open(out_path, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow([
            "query_id", "query_text", "query_language", "query_script", "query_type",
            "gold_doc_id", "gold_doc_text", "gold_doc_script",
        ])
        for _, q, gid in picked:
            d = docs[gid]
            w.writerow([
                q["query_id"], q["query_text"], q["query_language"], q["query_script"],
                q["query_type"], gid, d["text"], d["script"],
            ])

    # Empirically re-run the privacy scan over the exported text.
    pii_total = {}
    for _, q, gid in picked:
        for cat in pii_scan(q["query_text"]) + pii_scan(docs[gid]["text"]):
            pii_total[cat] = pii_total.get(cat, 0) + 1

    with open(os.path.join(OUTDIR, "validation_seed.txt"), "w", encoding="utf-8") as fh:
        fh.write(
            "seed=%d\n"
            "python=%s\n"
            "rng=random.Random(seed).sample(sorted_pool, %d)\n"
            "pool_tamil_native=%d\n"
            "pool_tanglish=%d\n"
            "gold_choice=lowest_relevant_doc_id\n"
            "pii_scan_hits=%r\n"
            % (SEED, sys.version.split()[0], N_PER_GROUP, len(tamil), len(tanglish), pii_total)
        )

    print("wrote %s" % out_path)
    print("rows=%d  groups=%d x %d" % (len(picked), 2, N_PER_GROUP))
    print("pii_scan_hits=%r (empty = no PII patterns present)" % (pii_total,))


if __name__ == "__main__":
    main()