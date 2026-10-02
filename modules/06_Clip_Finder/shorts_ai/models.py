from dataclasses import dataclass, field

WEIGHTS = {"hook": .25, "engagement": .20, "info_value": .15,
           "emotion": .15, "clarity": .10, "standalone": .15}

@dataclass
class Sentence:
    start: float
    end: float
    text: str

@dataclass
class Clip:
    i: int                      # first sentence index
    j: int                      # last sentence index
    start: float
    end: float
    text: str
    scores: dict = field(default_factory=dict)
    energy: float = 0.0         # 0-10 audio excitement
    title: str = ""
    reason: str = ""
    score: float = 0.0

    @property
    def duration(self): return self.end - self.start

def overall(scores: dict, energy: float = 5.0) -> float:
    base = sum(WEIGHTS[k] * scores.get(k, 0) for k in WEIGHTS)
    return round(10 * (0.9 * base + 0.1 * energy), 1)   # audio energy is a 10% nudge

def overlap(a: Clip, b: Clip) -> float:
    inter = max(0, min(a.end, b.end) - max(a.start, b.start))
    return inter / min(a.duration, b.duration)

def suppress(clips, thr):
    kept = []
    for c in clips:
        if all(overlap(c, k) < thr for k in kept):
            kept.append(c)
    return kept

def fmt(t: float) -> str:
    return f"{int(t//3600):02d}:{int(t%3600//60):02d}:{t%60:06.3f}"
