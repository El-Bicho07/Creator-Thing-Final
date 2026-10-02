import json, re, sys
from concurrent.futures import ThreadPoolExecutor
from .models import WEIGHTS, Clip

SCORE_PROMPT = """You are an expert YouTube Shorts editor. Score each candidate clip 0-10 on:
hook (first 3 seconds grab attention), engagement (curiosity, shareability, retention),
info_value, emotion (humor/surprise/passion), clarity (easy to follow), standalone (zero prior
context needed, clean start, satisfying end). Each clip also has audio_energy (0-10) as a hint.
Be discriminating: most clips 3-6, 8+ is rare. Give a title (<=60 chars, honest) and a one-sentence reason.
Return ONLY JSON: [{"id":0,"hook":..,"engagement":..,"info_value":..,"emotion":..,"clarity":..,"standalone":..,"title":"..","reason":".."}]

CLIPS:
"""
REFINE_PROMPT = """Below are numbered transcript sentences with timestamps around a candidate Shorts clip.
Choose the first and last sentence index (inclusive) giving the best self-contained clip of 15-59
seconds: strongest hook first, ends on the payoff, no dangling references. Return ONLY JSON: {"first":N,"last":N}

"""

def _json(text):
    return json.loads(re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip())

def _ask(client, model, prompt, tokens=3000):
    return _json(client.messages.create(model=model, max_tokens=tokens,
                 messages=[{"role": "user", "content": prompt}]).content[0].text)

def score(clips, model, batch=8, workers=4):
    import anthropic
    client = anthropic.Anthropic()
    def run(chunk):
        body = "\n\n".join(f"[id {k}] ({c.duration:.0f}s, audio_energy {c.energy})\n{c.text}" for k, c in enumerate(chunk))
        try:
            for r in _ask(client, model, SCORE_PROMPT + body):
                c = chunk[int(r["id"])]
                c.scores = {k: max(0.0, min(10.0, float(r[k]))) for k in WEIGHTS}
                c.title, c.reason = r["title"], r["reason"]
        except Exception as e:
            print(f"warn: scoring batch failed ({e}); heuristics kept", file=sys.stderr)
    with ThreadPoolExecutor(workers) as ex:
        list(ex.map(run, [clips[i:i+batch] for i in range(0, len(clips), batch)]))

def refine(clips, sents, model, workers=4):
    """Let the LLM nudge boundaries by up to +-2 sentences."""
    import anthropic
    client = anthropic.Anthropic()
    def run(c):
        lo, hi = max(0, c.i-2), min(len(sents)-1, c.j+2)
        ctx = "\n".join(f"{k}: [{sents[k].start:.1f}s] {sents[k].text}" for k in range(lo, hi+1))
        try:
            r = _ask(client, model, REFINE_PROMPT + ctx, 200)
            i, j = int(r["first"]), int(r["last"])
            if lo <= i <= j <= hi and 15 <= sents[j].end - sents[i].start <= 59:
                c.i, c.j, c.start, c.end = i, j, sents[i].start, sents[j].end
                c.text = " ".join(s.text for s in sents[i:j+1])
        except Exception as e:
            print(f"warn: refine failed ({e})", file=sys.stderr)
    with ThreadPoolExecutor(workers) as ex:
        list(ex.map(run, clips))
