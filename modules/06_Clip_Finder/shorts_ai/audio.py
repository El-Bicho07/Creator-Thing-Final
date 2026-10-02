"""Audio excitement profile from RMS loudness + variation, decoded with ffmpeg."""
import subprocess
import numpy as np

HOP = 0.5
def energy_profile(path):
    try:
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-vn", "-ac", "1", "-ar", "16000",
                              "-f", "s16le", "-"], capture_output=True, check=True).stdout
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None                                            # transcript-only input or no ffmpeg
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    n = int(16000 * HOP)
    x = x[: len(x)//n*n].reshape(-1, n)
    return np.sqrt((x**2).mean(1) + 1e-10)

def energy_score(profile, start, end):
    """0-10: loud relative to the whole video, with dynamic range (emphasis) rewarded."""
    if profile is None: return 5.0
    seg = profile[int(start/HOP): int(end/HOP)+1]
    if len(seg) < 2: return 5.0
    loud = np.searchsorted(np.sort(profile), seg.mean()) / len(profile)   # percentile 0-1
    dyn = min(1.0, seg.std() / (seg.mean() + 1e-9))
    return round(10 * (0.7 * loud + 0.3 * dyn), 1)
