import json, os, re
from .models import Sentence

def _ts(s):
    p = [float(x) for x in s.replace(",", ".").split(":")]
    while len(p) < 3: p.insert(0, 0.0)
    return p[0]*3600 + p[1]*60 + p[2]

def parse_subs(text):
    out = []
    for block in re.split(r"\n\s*\n", text.replace("\r", "")):
        lines = [l for l in block.split("\n") if l.strip()]
        for k, l in enumerate(lines):
            m = re.match(r"([\d:.,]+)\s*-->\s*([\d:.,]+)", l)
            if m:
                body = re.sub(r"<[^>]+>", "", " ".join(lines[k+1:])).strip()
                if body: out.append(Sentence(_ts(m[1]), _ts(m[2]), body))
                break
    return out

def asr(path, model_size="small"):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise SystemExit("pip install 'shorts-ai[asr]' to transcribe media, or pass .srt/.vtt/.json")
    segs, _ = WhisperModel(model_size, compute_type="int8").transcribe(path, vad_filter=True)
    return [Sentence(s.start, s.end, s.text.strip()) for s in segs]

def load(path):
    cache = path + ".transcript.json"
    ext = os.path.splitext(path)[1].lower()
    if ext in (".srt", ".vtt"): return parse_subs(open(path, encoding="utf-8").read())
    if ext == ".json": return [Sentence(d["start"], d["end"], d["text"]) for d in json.load(open(path))]
    if os.path.exists(cache): return load(cache)            # cached ASR
    cues = asr(path)
    json.dump([c.__dict__ for c in cues], open(cache, "w"))
    return cues

def to_sentences(cues):
    out, buf = [], None
    for c in cues:
        buf = Sentence(c.start, c.end, c.text) if buf is None else Sentence(buf.start, c.end, buf.text + " " + c.text)
        if re.search(r"[.!?]['\")\]]*$", buf.text) or buf.end - buf.start > 15:
            out.append(buf); buf = None
    if buf: out.append(buf)
    return out
