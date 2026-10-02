import re
from .models import Clip, suppress
from .audio import energy_score

HOOK = re.compile(r"\b(secret|mistake|truth|nobody|never|biggest|worst|best|why|how|what if|imagine|stop|here's|myth|actually)\b", re.I)
EMO = re.compile(r"\b(love|hate|afraid|fear|amazing|incredible|shocking|crazy|insane|painful|proud|angry|wow|honestly|terrible)\b", re.I)
DEP = re.compile(r"^(and|but|so|because|which|then|also|or|however|it|this|that|they|those|these|he|she)\b", re.I)
REF = re.compile(r"\b(as I said|earlier|previously|next slide|later)\b", re.I)

def _c(v): return round(max(0.0, min(10.0, v)), 1)

def heuristics(first, last, text, dur):
    wps = len(text.split()) / dur
    dep = bool(DEP.match(first.strip()))
    return dict(
        hook=_c(4 + 2.5*("?" in first) + 2*bool(HOOK.search(first)) + bool(re.search(r"\d", first)) - 3*dep),
        engagement=_c(4 + min(3, text.count("?") + text.count("!")) + 2*bool(HOOK.search(text))),
        info_value=_c(3 + min(4, len(re.findall(r"\d+|\b[A-Z][a-z]{3,}", text))/3) + (wps > 2.3)),
        emotion=_c(3 + min(6, 2*len(EMO.findall(text)) + text.count("!"))),
        clarity=_c(6 + (1 if 2.0 <= wps <= 3.2 else -1) - 2*(dur > 50)),
        standalone=_c(7 - 3*dep - (not re.search(r"[.!?]$", last)) - min(3, 2*len(REF.findall(text)))))

def generate(sents, profile, lo=20, hi=59, pool=40):
    out = []
    for i in range(len(sents)):
        for j in range(i, len(sents)):
            dur = sents[j].end - sents[i].start
            if dur > hi: break
            if dur < lo: continue
            text = " ".join(s.text for s in sents[i:j+1])
            gb = sents[i].start - sents[i-1].end if i else 1.0
            ga = sents[j+1].start - sents[j].end if j+1 < len(sents) else 1.0
            c = Clip(i, j, sents[i].start, sents[j].end, text,
                     heuristics(sents[i].text, sents[j].text, text, dur))
            c.energy = energy_score(profile, c.start, c.end)
            c.score = sum(c.scores.values())/6*10 + c.energy + 4*min(gb, 1) + 4*min(ga, 1)  # clean cuts
            out.append(c)
    out.sort(key=lambda c: -c.score)
    return suppress(out, 0.5)[:pool]
