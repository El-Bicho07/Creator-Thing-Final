"""Run `python check.py` (or double-click check.bat). It tests each piece and says exactly what to fix."""
import base64, struct, sys, time, zlib
import requests
from dotenv import find_dotenv
import app
from app import env

ok = lambda m: print("  [OK]   " + m)
bad = lambda m: print("  [FAIL] " + m)

print("1) Settings")
f = find_dotenv(str(app.Path(__file__).parent / ".env"))
print("  .env file:", f or "NOT FOUND. It must be named exactly .env and sit next to app.py")
writer = env("PROVIDER", "gemini").lower()
vision = env("VISION_PROVIDER", writer).lower()
fb = env("FALLBACK_PROVIDER").lower()
print(f"  writer={writer}  vision={vision}  fallback={fb or 'none'}")
key = env("GEMINI_API_KEY")
print("  GEMINI_API_KEY:", ("set, ends with ..." + key[-4:]) if key else "empty")

uses = {writer, vision, fb}
if "ollama" in uses:
    print("\n2) Ollama")
    host = env("OLLAMA_HOST", "http://localhost:11434")
    try:
        tags = requests.get(host + "/api/tags", timeout=5).json().get("models", [])
        names = [m["name"] for m in tags]
        ok("Ollama is running. Installed models: " + (", ".join(names) or "none"))
        need = [env("OLLAMA_MODEL", "gemma3:1b")] + ([env("OLLAMA_VISION_MODEL", "gemma3:4b")] if "ollama" in (vision, fb) else [])
        for n in need:
            have = any(x == n or x == n + ":latest" for x in names)
            (ok if have else bad)(f"model {n} " + ("installed" if have else f"NOT installed -> run: ollama pull {n}"))
        t = time.time()
        app.call_ollama([{"role": "user", "content": "Say hi in 5 words."}], None, False, "text")
        ok(f"text model answered in {time.time() - t:.1f}s")
    except requests.ConnectionError:
        bad("Cannot reach Ollama. Open the Ollama app or run `ollama serve`.")
    except Exception as e:
        bad(app.friendly(e))

if "gemini" in uses:
    print("\n3) Gemini")
    try:
        t = time.time()
        app.call_gemini([{"role": "user", "content": "Reply with the single word ok"}], None, False, "text")
        ok(f"Gemini answered in {time.time() - t:.1f}s (model: {app._gemini_model.get(key) or env('GEMINI_MODEL', 'gemini-3.8-flash')})")
    except Exception as e:
        bad(app.friendly(e))

def tiny_png(w=96, h=96):  # a plain orange square, so the vision test needs no photo
    raw = b"".join(b"\x00" + bytes([230, 120, 90]) * w for _ in range(h))
    ch = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw)) + ch(b"IEND", b"")


print("\n4) Photo reading (vision). Tip: run `python check.py yourphoto.jpg` to test a real photo")
if len(sys.argv) > 1:
    data = open(sys.argv[1], "rb").read()
    mime = "image/png" if sys.argv[1].lower().endswith("png") else "image/jpeg"
else:
    data, mime = tiny_png(), "image/png"
img = {"mime": mime, "data": base64.b64encode(data).decode()}
for p in [vision] + ([fb] if fb and fb != vision else []):
    try:
        t = time.time()
        text = app.vision_chain(p).invoke(img).strip().replace("\n", " ")
        ok(f"{p} read the image in {time.time() - t:.0f}s: {text[:90]}")
    except Exception as e:
        bad(f"{p}: {app.friendly(e)}")

print("\n5) Full caption test (same code the website uses)")
try:
    t = time.time()
    o = {"fmt": "Photo post", "tone": ["Witty"], "vibe": "Cozy", "hook": "Question", "goal": "Saves", "niche": "",
         "lang": "English", "len": "A hook plus one short line", "emo": True, "hsh": True, "seo": True, "cta": True}
    r = app.generate("Sunset chai on my terrace after a long week", o)
    ok(f"{len(r['variants'])} captions in {time.time() - t:.0f}s, written by {r['provider']}, recommended #{r['recommended'] + 1}")
    for v in r["variants"]:
        print("     -", v["hook"])
except Exception as e:
    bad(app.friendly(e))
print("\nDone. Fix any [FAIL] line above, then run python app.py")