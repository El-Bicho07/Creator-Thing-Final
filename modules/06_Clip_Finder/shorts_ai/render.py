"""Cut clips with ffmpeg: center-crop to 9:16, 1080x1920, burned-in captions."""
import os, subprocess, tempfile
from .models import fmt

def _srt(sents, c):
    lines = []
    for n, s in enumerate(sents[c.i:c.j+1], 1):
        a, b = s.start - c.start, s.end - c.start
        f = lambda t: fmt(t).replace(".", ",")
        lines.append(f"{n}\n{f(a)} --> {f(b)}\n{s.text}\n")
    return "\n".join(lines)

def render(video, clips, sents, outdir, captions=True):
    os.makedirs(outdir, exist_ok=True)
    paths = []
    for n, c in enumerate(clips, 1):
        out = os.path.join(outdir, f"short_{n:02d}.mp4")
        vf = "crop=ih*9/16:ih,scale=1080:1920"
        with tempfile.NamedTemporaryFile("w", suffix=".srt", delete=False) as f:
            f.write(_srt(sents, c))
        if captions:
            vf += f",subtitles={f.name}:force_style='FontSize=14,Alignment=2,MarginV=120,Outline=2'"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{c.start:.3f}", "-to", f"{c.end:.3f}",
                        "-i", video, "-vf", vf, "-c:v", "libx264", "-crf", "20", "-c:a", "aac", out], check=True)
        os.unlink(f.name)
        paths.append(out)
    return paths
