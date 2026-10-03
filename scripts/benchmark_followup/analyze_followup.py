#!/usr/bin/env python3
"""
analyze_followup.py -- reproduction script for the embedding follow-up evaluation.

Standalone and dependency-free: Python standard library only.
No API keys, tokens, .env contents or credentials.

Recomputes every metric in the follow-up deliverable CSVs from the two machine
artefacts, so running it must reproduce the committed files byte-for-byte:

  inputs : benchmark_followup/raw_retrieval.json     (top-5 per model/condition/query)
           benchmark_followup/normalized_inputs.json  (text + labels)
  outputs: benchmark_followup/normalized_results.csv
           benchmark_followup/cross_script_results.csv
           benchmark_followup/tanglish_12_analysis.csv
           benchmark_followup/statistics.json          (machine-readable stats)

Usage:  python3 scripts/benchmark_followup/analyze_followup.py [--verify]
        --verify  exits non-zero if regenerated CSVs differ from committed ones
"""
import argparse
import csv
import json
import math
import os
import random
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.environ.get("FOLLOWUP_OUTDIR") or os.path.join(
    ROOT, "docs/eval/benchmarks/benchmark_followup")

MODELS = ["bge_m3", "tamil_embed", "e5_base"]
CONDITIONS = ["raw", "norm_q_to_script", "norm_all_to_latin"]

K = (1, 3, 5)
N_BOOT = 10000
BOOT_SEED = 20261003

# ---------------------------------------------------------------- statistics


def _norm_cdf(x):
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def binom_two_sided_p(k, n, p=0.5):
    """Exact two-sided binomial (McNemar) p-value: P(|X-n/2| >= |k-n/2|)."""
    if n == 0:
        return None
    tail = 0.0
    for i in range(n + 1):
        if abs(i - n / 2.0) >= abs(k - n / 2.0) - 1e-12:
            tail += math.comb(n, i) * (p ** i) * ((1 - p) ** (n - i))
    return min(1.0, tail)


def paired_bootstrap_ci(a, b, n_boot=N_BOOT, seed=BOOT_SEED, alpha=0.05):
    """Paired bootstrap over items for mean(b) - mean(a)."""
    if len(a) != len(b) or not a:
        return None, None, None
    rng = random.Random(seed)
    n = len(a)
    obs = sum(b) / n - sum(a) / n
    diffs = []
    idx = range(n)
    for _ in range(n_boot):
        s = 0.0
        for _ in range(n):
            j = rng.choice(idx)
            s += b[j] - a[j]
        diffs.append(s / n)
    diffs.sort()
    lo = diffs[int((alpha / 2) * n_boot)]
    hi = diffs[min(int((1 - alpha / 2) * n_boot), n_boot - 1)]
    return obs, lo, hi


def paired_permutation_p(a, b, n_perm=N_BOOT, seed=BOOT_SEED):
    """Two-sided paired permutation test (sign-flip) on mean(b) - mean(a)."""
    n = len(a)
    if n == 0:
        return None
    obs = sum(b) / n - sum(a) / n
    deltas = [b[i] - a[i] for i in range(n)]
    rng = random.Random(seed)
    count = 0
    for _ in range(n_perm):
        s = sum(d if rng.random() < 0.5 else -d for d in deltas)
        if abs(s / n) >= abs(obs) - 1e-15:
            count += 1
    return (count + 1) / (n_perm + 1)


def metric_val(rank, metric):
    """Value of a rank (None = not in top-5) under a given metric."""
    if rank is None:
        return 0.0
    if metric == "R@5":
        return 1.0
    if metric == "MRR@5":
        return 1.0 / rank
    raise ValueError(metric)


def mcnemar_flips(raw_hits, norm_hits):
    """(b, c) = disagreements for McNemar exact test."""
    b = sum(1 for r, x in zip(raw_hits, norm_hits) if not r and x)
    c = sum(1 for r, x in zip(raw_hits, norm_hits) if r and not x)
    return b, c


# ---------------------------------------------------------------- metric core


def pair_records(cond, cond_data, inputs):
    """Flatten to per-(query, gold_doc) records with rank of that gold in top-5."""
    out = []
    for qid, qinfo in inputs["queries"].items():
        gold = qinfo["relevant"]
        for gid in gold:
            gscript = inputs["documents"][gid]["script_detected"]
            rec = {"query_id": qid, "gold_id": gid,
                   "gold_script": gscript,
                   "query_type": qinfo["query_type"],
                   "query_lang": qinfo["lang"],
                   "query_script_declared": qinfo["script_declared"],
                   "cross_script": (qinfo["script_declared"] == "Latin" and gscript != "Latin")}
            for m in MODELS:
                top = cond_data[cond][m][qid]["top_ids"]
                rec[m] = (top.index(gid) + 1) if gid in top else None
            out.append(rec)
    return out


def q_records(cond, cond_data, inputs):
    """Per-query records: hit if ANY gold in top-k (matches original benchmark)."""
    out = []
    for qid, qinfo in inputs["queries"].items():
        rec = {"query_id": qid, "query_type": qinfo["query_type"],
               "query_lang": qinfo["lang"],
               "query_script": qinfo["script_declared"]}
        golds = qinfo["relevant"]
        gscripts = sorted({inputs["documents"][g]["script_detected"] for g in golds})
        rec["gold_scripts"] = gscripts
        rec["cross_script"] = (rec["query_script"] == "Latin"
                               and any(s != "Latin" for s in gscripts))
        for m in MODELS:
            top = cond_data[cond][m][qid]["top_ids"]
            ranks = [top.index(g) + 1 for g in golds if g in top]
            rec[m] = min(ranks) if ranks else None
        out.append(rec)
    return out


def metrics_from_ranks(ranks):
    """R@1/3/5 and MRR@5 from a list of ranks (None = not in top-5)."""
    n = len(ranks)
    if n == 0:
        return None
    res = {}
    for k in K:
        res["R@%d" % k] = sum(1 for r in ranks if r is not None and r <= k) / n
    res["MRR@5"] = sum((1.0 / r) for r in ranks if r is not None) / n
    res["n"] = n
    return res


def fmt(x, p=4):
    return "" if x is None else ("%." + str(p) + "f") % x


# ---------------------------------------------------------------- slices

# Part D directional pairs. Key -> (query filter, gold script filter)
DIRECTIONS = {
    "Tanglish query -> Tamil document": (lambda r: r["query_type"] == "Tanglish", "Tamil"),
    "Tanglish query -> English document": (lambda r: r["query_type"] == "Tanglish", "Latin"),
    "Tamil query -> Tanglish document": (lambda r: r["query_lang"] == "ta" and r["query_script_declared"] == "Tamil", "Latin"),
    "Tamil query -> Tamil document": (lambda r: r["query_lang"] == "ta" and r["query_script_declared"] == "Tamil", "Tamil"),
    "Hinglish query -> Devanagari document": (lambda r: r["query_type"] == "Hinglish", "Devanagari"),
    "Hinglish query -> English document": (lambda r: r["query_type"] == "Hinglish", "Latin"),
    "Hindi query -> Hinglish document": (lambda r: r["query_lang"] == "hi" and r["query_script_declared"] == "Devanagari", "Latin"),
    "Hindi query -> Hindi document": (lambda r: r["query_lang"] == "hi" and r["query_script_declared"] == "Devanagari", "Devanagari"),
    "English query -> English document": (lambda r: r["query_lang"] == "en", "Latin"),
    "Tamil query -> English document": (lambda r: r["query_lang"] == "ta", "Latin"),
    "Hindi query -> English document": (lambda r: r["query_lang"] == "hi", "Latin"),
}


_VERIFY_DONE = False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify", action="store_true")
    args = ap.parse_args()

    with open(os.path.join(OUT, "raw_retrieval.json"), encoding="utf-8") as fh:
        retrieval = json.load(fh)
    with open(os.path.join(OUT, "normalized_inputs.json"), encoding="utf-8") as fh:
        inputs = json.load(fh)

    cond_data = retrieval["conditions"]
    for m in MODELS:
        g = retrieval["gate"][m]
        if not g["ok"]:
            sys.exit("ABORT: hard gate failed for %s" % m)
    print("[analyze] hard gate: raw reproduces saved benchmark for all 3 models")

    Q = {c: q_records(c, cond_data, inputs) for c in CONDITIONS}
    P = {c: pair_records(c, cond_data, inputs) for c in CONDITIONS}
    by_qid = {c: {r["query_id"]: r for r in Q[c]} for c in CONDITIONS}
    print("[analyze] per-query records=%d, per-(query,gold) records=%d"
          % (len(Q["raw"]), len(P["raw"])))

    # ---------------------------------------------------- normalized_results.csv
    # One row per (condition, model) over ALL 256 query->gold pairs, plus the
    # per-query overall that reproduces the original headline definition.
    rows = []
    for cond in CONDITIONS:
        for m in MODELS:
            pair_m = metrics_from_ranks([r[m] for r in P[cond]])
            query_m = metrics_from_ranks([r[m] for r in Q[cond]])
            rows.append({
                "condition": cond, "model": m,
                "grain": "query_to_gold_pair",
                "n_pairs": pair_m["n"],
                "R@1": fmt(pair_m["R@1"]), "R@3": fmt(pair_m["R@3"]),
                "R@5": fmt(pair_m["R@5"]), "MRR@5": fmt(pair_m["MRR@5"]),
                "n_queries": query_m["n"],
                "R@1_perquery": fmt(query_m["R@1"]), "R@3_perquery": fmt(query_m["R@3"]),
                "R@5_perquery": fmt(query_m["R@5"]), "MRR@5_perquery": fmt(query_m["MRR@5"]),
            })
    with open(os.path.join(OUT, "normalized_results.csv"), "w", encoding="utf-8", newline="") as fh:
        cols = ["condition", "model", "grain", "n_pairs", "R@1", "R@3", "R@5", "MRR@5",
                "n_queries", "R@1_perquery", "R@3_perquery", "R@5_perquery", "MRR@5_perquery"]
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for r in rows:
            w.writerow(r)

    # ---------------------------------------------------- cross_script_results.csv
    slices = [
        ("overall", lambda r: True),
        ("all cross-script", lambda r: r["cross_script"]),
        ("same-script control", lambda r: not r["cross_script"]),
        ("Tanglish -> Tamil", lambda r: r["query_type"] == "Tanglish" and r["gold_script"] == "Tamil"),
        ("Hinglish -> Devanagari", lambda r: r["query_type"] == "Hinglish" and r["gold_script"] == "Devanagari"),
        ("native Latin query -> non-Latin", lambda r: r["query_script_declared"] == "Latin" and r["query_type"] == "native" and r["gold_script"] != "Latin"),
    ]
    # Part D: the 11 required query -> document-script directions.
    for _name, (_qf, _gs) in DIRECTIONS.items():
        slices.append((_name, (lambda qf, gs: (lambda r: qf(r) and r["gold_script"] == gs))(_qf, _gs)))
    cross_rows, stats = [], {"comparisons": []}
    for slice_name, pred in slices:
        for m in MODELS:
            base = {}
            for cond in CONDITIONS:
                sel = [r[m] for r in P[cond] if pred(r)]
                mm = metrics_from_ranks(sel)
                base[cond] = mm
                cross_rows.append({
                    "slice": slice_name, "model": m, "condition": cond,
                    "n_pairs": mm["n"], "n_queries": len({r["query_id"] for r in P[cond] if pred(r)}),
                    "R@1": fmt(mm["R@1"]), "R@3": fmt(mm["R@3"]),
                    "R@5": fmt(mm["R@5"]), "MRR@5": fmt(mm["MRR@5"]),
                })
            for norm in ["norm_q_to_script", "norm_all_to_latin"]:
                a = [r[m] for r in P["raw"] if pred(r)]
                b = [r[m] for r in P[norm] if pred(r)]
                for metric in ["R@5", "MRR@5"]:
                    av = [metric_val(x, metric) for x in a]
                    bv = [metric_val(x, metric) for x in b]
                    d, lo, hi = paired_bootstrap_ci(av, bv)
                    perm = paired_permutation_p(av, bv)
                    ph = [1 if (x is not None and x <= 5) else 0 for x in a]
                    qh = [1 if (x is not None and x <= 5) else 0 for x in b]
                    nb, nc = mcnemar_flips(ph, qh)
                    stats["comparisons"].append({
                        "slice": slice_name, "model": m, "normalized": norm, "metric": metric,
                        "n": len(av),
                        "raw": base["raw"][metric], "normalized_value": base[norm][metric],
                        "difference": d, "ci95_low": lo, "ci95_high": hi,
                        "permutation_p": perm,
                        "mcnemar_b": nb, "mcnemar_c": nc,
                        "mcnemar_exact_p": binom_two_sided_p(nb, nb + nc),
                    })
    with open(os.path.join(OUT, "cross_script_results.csv"), "w", encoding="utf-8", newline="") as fh:
        cols = ["slice", "model", "condition", "n_pairs", "n_queries",
                "R@1", "R@3", "R@5", "MRR@5"]
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for r in cross_rows:
            w.writerow(r)

    # ---------------------------------------------------- tanglish_12_analysis.csv
    tan12 = sorted(q for q, v in inputs["queries"].items()
                   if v["query_type"] == "Tanglish"
                   and any(inputs["documents"][g]["script_detected"] == "Tamil"
                           for g in v["relevant"]))
    # "normalized" == Option A (norm_q_to_script): the production-feasible
    # condition (queries only; stored memories are NOT re-embedded).
    # Strategy B (norm_all_to_latin) is reported alongside as *_all2latin_*.
    tan_cols = ["query_id", "original_query", "normalized_query", "gold_doc_ids", "gold_doc_scripts"]
    for m in MODELS:
        tan_cols += ["%s_raw_top5" % m, "%s_normalized_top5" % m,
                     "%s_raw_hit5" % m, "%s_normalized_hit5" % m]
    tan_cols += ["all2latin_query"]
    for m in MODELS:
        tan_cols += ["%s_all2latin_top5" % m, "%s_all2latin_hit5" % m]
    with open(os.path.join(OUT, "tanglish_12_analysis.csv"), "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(tan_cols)
        for qid in tan12:
            qi = inputs["queries"][qid]
            gold = qi["relevant"]
            gscripts = [inputs["documents"][g]["script_detected"] for g in gold]
            row = [qid, qi["raw"], qi["A_to_script"], "|".join(gold), "|".join(gscripts)]
            for m in MODELS:
                rt = cond_data["raw"][m][qid]["top_ids"]
                nt = cond_data["norm_q_to_script"][m][qid]["top_ids"]
                row += ["|".join(rt), "|".join(nt),
                        int(any(g in rt for g in gold)), int(any(g in nt for g in gold))]
            row.append(qi["B_to_latin"])
            for m in MODELS:
                bt = cond_data["norm_all_to_latin"][m][qid]["top_ids"]
                row += ["|".join(bt), int(any(g in bt for g in gold))]
            w.writerow(row)

    with open(os.path.join(OUT, "statistics.json"), "w", encoding="utf-8") as fh:
        json.dump({"n_boot": N_BOOT, "boot_seed": BOOT_SEED,
                   "directions": sorted(DIRECTIONS),
                   "comparisons": stats["comparisons"]}, fh, indent=1)

    # ---------------------------------------------------- console summary
    print("\n[analyze] overall per-query (must reproduce original headline):")
    for cond in CONDITIONS:
        for m in MODELS:
            mm = metrics_from_ranks([r[m] for r in Q[cond]])
            print("   %-18s %-13s R@3=%.3f MRR@5=%.3f" % (cond, m, mm["R@3"], mm["MRR@5"]))

    print("\n[analyze] headline slices (R@5, pair grain):")
    for slice_name in ["all cross-script", "Tanglish -> Tamil", "Hinglish -> Devanagari", "same-script control"]:
        for m in MODELS:
            cells = []
            for cond in CONDITIONS:
                sel = [r[m] for r in P[cond]
                       if (lambda r: True)(r) and slice_matches(r, slice_name)]
                mm = metrics_from_ranks(sel)
                cells.append("%s=%s" % (cond.replace("norm_", ""), fmt(mm["R@5"])))
            print("   %-22s %-13s %s" % (slice_name, m, "  ".join(cells)))

    global _VERIFY_DONE
    if args.verify and not _VERIFY_DONE:
        _VERIFY_DONE = True
        print("\n[analyze] --verify: regenerating into a clean temp dir and comparing")
        import shutil
        import tempfile
        generated = ["normalized_results.csv", "cross_script_results.csv",
                     "tanglish_12_analysis.csv", "statistics.json"]
        tmp = tempfile.mkdtemp(prefix="followup_verify_")
        committed = {f: open(os.path.join(OUT, f), "rb").read() for f in generated}
        os.environ["FOLLOWUP_OUTDIR"] = tmp
        globals()["OUT"] = tmp
        _saved_argv = sys.argv[:]
        sys.argv = [sys.argv[0]]  # inner run must NOT re-enter verify
        for f in ("normalized_inputs.json", "raw_retrieval.json"):
            shutil.copy(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     "..", "..", "docs", "eval", "benchmarks",
                                     "benchmark_followup", f), tmp)
        main()
        sys.argv = _saved_argv
        ok = True
        for f in generated:
            same = open(os.path.join(tmp, f), "rb").read() == committed[f]
            print("   %-28s %s" % (f, "IDENTICAL" if same else "*** DIFFERS ***"))
            ok = ok and same
        shutil.rmtree(tmp, ignore_errors=True)
        if not ok:
            sys.exit("VERIFY FAILED: regenerated metrics differ from committed files")
        print("[analyze] VERIFY OK: all %d artefacts reproduced byte-for-byte" % len(generated))


def slice_matches(r, name):
    if name == "all cross-script":
        return r["cross_script"]
    if name == "same-script control":
        return not r["cross_script"]
    if name == "Tanglish -> Tamil":
        return r["query_type"] == "Tanglish" and r["gold_script"] == "Tamil"
    if name == "Hinglish -> Devanagari":
        return r["query_type"] == "Hinglish" and r["gold_script"] == "Devanagari"
    return True


if __name__ == "__main__":
    main()