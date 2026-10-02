import argparse, json, os, sys
from . import transcript, audio, candidates, llm
from .models import overall, suppress, fmt

def main():
    ap = argparse.ArgumentParser(prog="shorts-ai", description="Find and render the best YouTube Shorts from a long video.")
    ap.add_argument("input", help="video/audio file, or .srt/.vtt/.json transcript")
    ap.add_argument("--video", help="video file for audio analysis/rendering when input is a transcript")
    ap.add_argument("--top", type=int, default=8)
    ap.add_argument("--min", type=float, default=20)
    ap.add_argument("--max", type=float, default=59)
    ap.add_argument("--pool", type=int, default=40)
    ap.add_argument("--model", default="claude-sonnet-5")
    ap.add_argument("--no-refine", action="store_true")
    ap.add_argument("--render", metavar="DIR", help="export 9:16 mp4 files (needs ffmpeg + video)")
    ap.add_argument("--no-captions", action="store_true")
    ap.add_argument("--out", default="clips.json")
    a = ap.parse_args()

    video = a.video or (a.input if os.path.splitext(a.input)[1].lower() not in (".srt", ".vtt", ".json") else None)
    sents = transcript.to_sentences(transcript.load(a.input))
    if not sents: sys.exit("Empty transcript.")
    profile = audio.energy_profile(video) if video else None
    clips = candidates.generate(sents, profile, a.min, a.max, a.pool)
    print(f"{len(sents)} sentences -> {len(clips)} candidates (audio {'on' if profile is not None else 'off'})", file=sys.stderr)

    llm_on = bool(os.environ.get("ANTHROPIC_API_KEY"))
    if llm_on: llm.score(clips, a.model)
    for c in clips:
        if not c.title:
            c.title = c.text.split(". ")[0][:57]; c.reason = "Heuristic pick (no LLM): strong hook and clean boundaries."
        c.score = overall(c.scores, c.energy)
    clips.sort(key=lambda c: -c.score)
    top = suppress(clips, 0.3)[:a.top]

    if llm_on and not a.no_refine:
        llm.refine(top, sents, a.model)
        for c in top: c.score = overall(c.scores, c.energy)
        top = suppress(sorted(top, key=lambda c: -c.score), 0.3)

    result = [dict(rank=n, start=fmt(c.start), end=fmt(c.end), duration=round(c.duration, 1), title=c.title,
                   score=c.score, breakdown={**c.scores, "audio_energy": c.energy}, reason=c.reason)
              for n, c in enumerate(top, 1)]
    if a.render:
        if not video: sys.exit("--render needs a video (pass --video).")
        for r, p in zip(result, __import__("shorts_ai.render", fromlist=["render"]).render(video, top, sents, a.render, not a.no_captions)):
            r["file"] = p
    json.dump(result, open(a.out, "w"), indent=2)
    for r in result:
        print(f"#{r['rank']}  {r['start']} -> {r['end']} ({r['duration']}s)  score {r['score']}\n    {r['title']}\n    {r['reason']}\n")

if __name__ == "__main__": main()
