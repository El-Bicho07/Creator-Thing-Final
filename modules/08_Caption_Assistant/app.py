"""captioncraft backend (LangChain edition, hardened).

Flow: photo -> VISION model describes it -> TEXT model writes 4 captions as validated JSON.
LangChain pieces: ChatPromptTemplate, LCEL chains (prompt | model | parser), PydanticOutputParser,
RunnableLambda provider adapters and with_retry. Providers (Ollama / Gemini / Anthropic) are plain
HTTP calls wrapped as runnables, so there are no provider-specific LangChain packages to break.
"""
import json, os, re, time
from pathlib import Path
from typing import List, Optional

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from langchain_core.exceptions import OutputParserException
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from pydantic import BaseModel, ConfigDict, Field, field_validator

# utf-8-sig survives the BOM that Windows Notepad adds; override=True makes .env win over system variables
load_dotenv(Path(__file__).parent / ".env", override=True, encoding="utf-8-sig")
app = Flask(__name__, static_folder="static", static_url_path="")


def env(name, default=""):
    """Read a setting, tolerating stray spaces and quotes around the value."""
    return os.getenv(name, default).strip().strip('"').strip("'").strip()


class ProviderError(Exception):
    """An error whose message is already safe and readable for the UI."""


# ---------------------------------------------------------------- schema
class Variant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    label: str = ""
    hook: str = ""
    body: str = ""
    cta: str = ""
    hashtags: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    altText: str = ""
    why: str = ""
    extra: str = ""

    @field_validator("hashtags", "keywords", mode="before")
    @classmethod
    def _list(cls, v):  # small models sometimes return "#a #b" instead of a list
        if v is None:
            return []
        if isinstance(v, str):
            return [t for t in re.split(r"[,\s]+", v) if t]
        return v

    @field_validator("label", "hook", "body", "cta", "altText", "why", "extra", mode="before")
    @classmethod
    def _str(cls, v):
        return "" if v is None else str(v)


class CaptionResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    variants: List[Variant] = Field(default_factory=list)
    recommended: Optional[int] = None
    recommendReason: str = ""

    @field_validator("recommended", mode="before")
    @classmethod
    def _rec(cls, v):
        try:
            return int(v)
        except (TypeError, ValueError):
            return None


PARSER = PydanticOutputParser(pydantic_object=CaptionResult)


def parse_json(text):
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.S)
        if not m:
            raise ValueError("The model did not return JSON.")
        return json.loads(m.group(0))


class EmptyResult(ValueError):
    """The model answered with valid JSON but no usable captions."""


def coerce_shape(data):
    """Small models sometimes rename the key or return a bare list; map those onto {"variants": [...]}."""
    if isinstance(data, list):
        data = {"variants": data}
    if isinstance(data, dict) and not data.get("variants"):
        for k, v in data.items():
            if isinstance(v, list) and v and isinstance(v[0], dict):
                data = {**data, "variants": v}
                break
    return data


def parse_result(text):
    try:
        res = CaptionResult.model_validate(coerce_shape(parse_json(text)))
    except Exception:
        res = PARSER.parse(text)
    if not [v for v in res.variants if v.hook or v.body]:
        print("[captioncraft] unusable model output:", text[:400].replace("\n", " "))
        raise EmptyResult("no usable captions")
    return res


# ---------------------------------------------------------------- providers
def _post(url, tries=3, **kw):
    """POST, retrying only temporary 503 overload errors."""
    wait = float(env("RETRY_WAIT", "2"))
    for i in range(tries):
        r = requests.post(url, **kw)
        if r.status_code != 503 or i == tries - 1:
            return r
        time.sleep(wait * (i + 1))


def _err_text(r):
    try:
        return r.json()["error"]["message"][:220]
    except Exception:
        return r.text[:220]


def _split(messages):
    system = "\n".join(m["content"] for m in messages if m["role"] == "system")
    user = "\n".join(m["content"] for m in messages if m["role"] != "system")
    return system, user


_gemini_model = {}


def _gemini_lookup(base, key):
    """If the configured model is gone (404), find a current Flash model that supports generateContent."""
    r = requests.get(f"{base}/v1beta/models?pageSize=200", headers={"x-goog-api-key": key}, timeout=30)
    if r.status_code != 200:
        return None
    bad = ("image", "tts", "live", "audio", "embedding", "robotics", "computer", "learnlm", "gemma")
    names = [m["name"].split("/")[-1] for m in r.json().get("models", [])
             if "generateContent" in m.get("supportedGenerationMethods", [])
             and "flash" in m["name"] and not any(b in m["name"] for b in bad)]
    return sorted(names, reverse=True)


def call_gemini(messages, image, json_mode, role):
    key = env("GEMINI_API_KEY")
    if not key:
        raise ProviderError("GEMINI_API_KEY is empty in .env")
    base = env("GEMINI_BASE", "https://generativelanguage.googleapis.com")
    system, user = _split(messages)
    parts = [{"text": user}]
    if image:
        parts.append({"inline_data": {"mime_type": image["mime"], "data": image["data"]}})
    cfg = {"temperature": 1.0}
    if json_mode:
        cfg["responseMimeType"] = "application/json"
    body = {"contents": [{"role": "user", "parts": parts}], "generationConfig": cfg}
    if system:
        body["system_instruction"] = {"parts": [{"text": system}]}

    def go(model):
        return _post(f"{base}/v1beta/models/{model}:generateContent", json=body, timeout=90,
                     headers={"x-goog-api-key": key, "Content-Type": "application/json"})

    queue, tried, looked = [_gemini_model.get(key) or env("GEMINI_MODEL", "gemini-3.8-flash")], [], False
    while queue:  # model gone (404) or its quota used up (429): try other Flash models, each has its own quota
        model = queue.pop(0)
        tried.append(model)
        r = go(model)
        if r.status_code in (404, 429):
            if not looked:
                looked = True
                queue += [m for m in (_gemini_lookup(base, key) or []) if m not in tried][:4]
            continue
        break
    if r.status_code < 400:
        _gemini_model[key] = model
    if r.status_code in (401, 403) or (r.status_code == 400 and "API key" in r.text):
        raise ProviderError("Gemini rejected the API key. Create a new key and paste it into .env (no quotes or spaces).")
    if r.status_code == 404:
        raise ProviderError(f"No Gemini model worked for your key (tried {', '.join(tried)}). Set GEMINI_MODEL to a model listed in AI Studio.")
    if r.status_code == 429:
        raise ProviderError(f"Gemini quota used up on every model tried ({', '.join(tried)}). Wait a while, or check AI Studio > Usage.")
    if r.status_code == 503:
        raise ProviderError("Gemini is overloaded right now (503). Try again shortly.")
    if r.status_code >= 400:
        raise ProviderError(f"Gemini error {r.status_code}: {_err_text(r)}")
    cands = r.json().get("candidates") or []
    if not cands:
        raise ProviderError("Gemini returned no text (the request may have been blocked). Try different wording.")
    text = "".join(p.get("text", "") for p in cands[0].get("content", {}).get("parts", []) if not p.get("thought"))
    if not text.strip():
        raise ProviderError("Gemini returned an empty answer. Try again.")
    return text


def call_ollama(messages, image, json_mode, role):
    host = env("OLLAMA_HOST", "http://localhost:11434")
    model = env("OLLAMA_VISION_MODEL", "gemma3:4b") if role == "vision" else env("OLLAMA_MODEL", "gemma3:1b")
    limit = int(env("OLLAMA_TIMEOUT", "240" if role == "vision" else "300"))
    msgs = [dict(m) for m in messages]
    if image:
        msgs[-1]["images"] = [image["data"]]

    def go(use_json, temp, penalty):
        body = {"model": model, "messages": msgs, "stream": False, "keep_alive": env("OLLAMA_KEEP_ALIVE", "30m"),
                "options": {"temperature": temp, "top_p": 0.9, "repeat_penalty": penalty, "num_ctx": 2048,
                            "num_predict": 300 if role == "vision" else int(env("OLLAMA_NUM_PREDICT", "900"))}}
        if use_json:
            body["format"] = "json"
        return requests.post(f"{host}/api/chat", json=body, timeout=(10, limit))

    try:
        r = go(json_mode, 0.7, 1.15)
        if r.status_code == 500 and "repeat" in r.text:  # small model got stuck looping; retry once without JSON mode
            r = go(False, 1.0, 1.25)
    except requests.ConnectTimeout:
        raise ProviderError("Cannot reach Ollama. Open the Ollama app (or run `ollama serve`) and try again.")
    except requests.ReadTimeout:
        raise ProviderError(f"Ollama model '{model}' took longer than {limit}s. On a CPU-only laptop, use Gemini for photos "
                            "or a smaller vision model (ollama pull moondream, then OLLAMA_VISION_MODEL=moondream).")
    except requests.ConnectionError:
        raise ProviderError("Cannot reach Ollama. Open the Ollama app (or run `ollama serve`) and try again.")
    if r.status_code == 404:
        raise ProviderError(f"Ollama model '{model}' is not installed. Run: ollama pull {model}")
    if r.status_code == 400 and image:
        raise ProviderError(f"'{model}' cannot read images. Use a vision model such as gemma3:4b or moondream.")
    if r.status_code >= 400:
        raise ProviderError(f"Ollama error {r.status_code}: {_err_text(r)}")
    return r.json()["message"]["content"]


def call_anthropic(messages, image, json_mode, role):
    key = env("ANTHROPIC_API_KEY")
    if not key:
        raise ProviderError("ANTHROPIC_API_KEY is empty in .env")
    system, user = _split(messages)
    content = ([{"type": "image", "source": {"type": "base64", "media_type": image["mime"], "data": image["data"]}}] if image else [])
    content.append({"type": "text", "text": user})
    body = {"model": env("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"), "max_tokens": 2000,
            "messages": [{"role": "user", "content": content}]}
    if system:
        body["system"] = system
    r = _post("https://api.anthropic.com/v1/messages", timeout=90,
              headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"}, json=body)
    if r.status_code in (401, 403):
        raise ProviderError("Anthropic rejected the API key.")
    if r.status_code >= 400:
        raise ProviderError(f"Anthropic error {r.status_code}: {_err_text(r)}")
    return r.json()["content"][0]["text"]


PROVIDERS = {"gemini": call_gemini, "ollama": call_ollama, "anthropic": call_anthropic}


def model_runnable(provider, role, json_mode):
    """Wrap a provider as a LangChain runnable: (messages, image) -> text."""
    if provider not in PROVIDERS:
        raise ProviderError(f"Unknown provider '{provider}'. Use gemini, ollama or anthropic.")
    return RunnableLambda(lambda x: PROVIDERS[provider](x["messages"], x.get("image"), json_mode, role))


# ---------------------------------------------------------------- prompts and chains
DESCRIBE = ("Describe this photo for an Instagram copywriter in 3-4 sentences: the subject, setting, colours, "
            "mood, notable details and any visible text. Be factual and do not invent anything.")

PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are an expert Instagram copywriter who knows how the 2026 algorithm rewards saves, "
               "DM shares, watch time and caption SEO."),
    ("human", """Write 4 DISTINCT Instagram captions for a {fmt}.

{scene}

Tone: {tone}. Vibe: {vibe}. Hook style: {hook}. Main goal: {goal}. Niche: {niche}. Language: {lang}. Body length: {length}.

Rules: line 1 (the hook) is a real hook under 125 characters, never a plain description of the photo. One idea per caption. Write like a person talks. {seo_rule}{cta_rule}{emoji_rule}{hash_rule}Make the 4 takes differ in angle, not just wording. {extra_rule}
Pick the ONE variant most likely to earn reach for the goal (0-based index) and give a one-sentence reason.

Reply with JSON only, shaped like: {shape}"""),
])


def prompt_vars(desc, image_desc, o, lite):
    fmt = o.get("fmt", "Photo post")
    scene = "\n".join(filter(None, [f"Creator's description: {desc}" if desc else "",
                                    f"What the photo shows: {image_desc}" if image_desc else ""]))
    item = '{"label":"","hook":"","body":"","cta":"","hashtags":[],"keywords":[]' + ('}' if lite else ',"altText":"","why":"","extra":""}')
    extra = {"Reel": 'For "extra" give an on-screen text hook for the first 3 seconds plus a short audio idea.',
             "Carousel": 'For "extra" give a slide-1 headline and a one-line slide order.'}.get(fmt, 'For "extra" give a short posting tip.')
    return {
        "fmt": fmt, "scene": scene or "(no description given)",
        "tone": ", ".join(o.get("tone") or []) or "natural", "vibe": o.get("vibe"), "hook": o.get("hook"),
        "goal": o.get("goal"), "niche": o.get("niche") or "general", "lang": o.get("lang"), "length": o.get("len"),
        "seo_rule": "Work 1-2 plain search keywords into the hook or first sentence. " if o.get("seo") else "",
        "cta_rule": 'End with exactly ONE specific CTA that fits the goal (a direct question beats "thoughts?"). ' if o.get("cta") else "Set cta to an empty string. ",
        "emoji_rule": "Use emojis sparingly (max 3). " if o.get("emo") else "Use no emojis. ",
        "hash_rule": "Give 3-5 relevant hashtags (no # sign). " if o.get("hsh") else "hashtags must be an empty array. ",
        "extra_rule": "" if lite else extra,
        "shape": '{"variants":[' + item + '],"recommended":0,"recommendReason":""} where "variants" is a list holding exactly 4 such objects',
    }


def to_messages(prompt_value):
    return {"messages": [{"role": "system" if m.type == "system" else "user", "content": m.content}
                         for m in prompt_value.to_messages()]}


def writer_chain(provider):
    # prompt | adapter | model | parser; retry only when the model's output could not be parsed
    return (PROMPT | RunnableLambda(to_messages) | model_runnable(provider, "text", True) | RunnableLambda(parse_result)
            ).with_retry(retry_if_exception_type=(OutputParserException, ValueError), stop_after_attempt=2,
                         wait_exponential_jitter=False)


def vision_chain(provider):
    return RunnableLambda(lambda image: {"messages": [{"role": "user", "content": DESCRIBE}], "image": image}) \
        | model_runnable(provider, "vision", False)


def first_success(providers, make_chain, payload):
    """Try providers in order; if all fail, report every reason."""
    errs = []
    for p in providers:
        try:
            return make_chain(p).invoke(payload), p
        except Exception as e:
            errs.append(f"{p}: {friendly(e)}")
    raise ProviderError(" | ".join(errs))


def friendly(e):
    if isinstance(e, ProviderError):
        return str(e)
    if isinstance(e, EmptyResult):
        return "The model returned JSON but no usable captions (small models do this sometimes)."
    if isinstance(e, (OutputParserException, ValueError, json.JSONDecodeError)):
        return "The model's answer was not valid JSON. Try again, or use a larger model."
    if isinstance(e, requests.Timeout):
        return "The model took too long to answer."
    if isinstance(e, requests.ConnectionError):
        return "Could not connect. Check your internet or that Ollama is running."
    return f"{type(e).__name__}: {str(e)[:200]}"


# ---------------------------------------------------------------- normalise + generate
def heuristic_pick(variants):
    def pts(v):
        txt = f"{v['hook']} {v['body']} {v['cta']}".lower()
        return ((0 < len(v["hook"]) <= 125) + bool(v["cta"]) + (1 <= len(v["hashtags"]) <= 5)
                + any(k.lower() in txt for k in v["keywords"])
                + bool(re.search(r"save|share|send|tag|bookmark|for later|dm", txt)))
    return max(range(len(variants)), key=lambda i: (pts(variants[i]), -i))


def normalize(result):
    vs = [v.model_dump() for v in result.variants if v.hook or v.body][:4]
    if not vs:
        raise ProviderError("The model returned no usable captions. Try again.")
    for v in vs:
        v["hashtags"] = [h.lstrip("#") for h in v["hashtags"]][:5]
    rec, reason = result.recommended, result.recommendReason.strip()
    if rec is None or not 0 <= rec < len(vs) or not reason:
        rec = heuristic_pick(vs)
        reason = "It has the strongest mix of a tight hook, a clear CTA, relevant keywords and a save/share trigger for your goal."
    return {"recommended": rec, "recommendReason": reason, "variants": vs}


def generate(desc, opts, image=None):
    writer = env("PROVIDER", "gemini").lower()
    vision = env("VISION_PROVIDER", writer).lower()
    fb = env("FALLBACK_PROVIDER").lower()
    order = lambda p: [p] + ([fb] if fb and fb != p else [])
    lite_setting = env("LITE_MODE", "auto").lower()
    image_desc, note = "", ""
    if image:
        try:
            image_desc, _ = first_success(order(vision), vision_chain, image)
            image_desc = image_desc.strip()
        except ProviderError as e:
            if not desc:
                raise
            note = f"Your photo could not be read ({e}). Captions use your description only."
    result, used = None, None
    errs = []
    for p in order(writer):  # lite prompt for local models: fewer fields, much faster
        lite = (p == "ollama") if lite_setting == "auto" else lite_setting in ("1", "true", "yes", "on")
        try:
            result, used = writer_chain(p).invoke(prompt_vars(desc, image_desc, opts, lite)), p
            break
        except Exception as e:
            errs.append(f"{p}: {friendly(e)}")
    if result is None:
        raise ProviderError(" | ".join(errs))
    out = normalize(result)
    out.update(imageDescription=image_desc, note=note, provider=used)
    return out


@app.post("/api/captions")
def captions():
    data = request.get_json(silent=True) or {}
    desc, opts, image = (data.get("desc") or "").strip(), data.get("opts") or {}, data.get("image")
    if not desc and not image:
        return jsonify(error="Send a description or an image."), 400
    try:
        return jsonify(generate(desc, opts, image))
    except Exception as e:
        return jsonify(error=friendly(e)), 502


@app.get("/")
def home():
    return send_from_directory("static", "index.html")


@app.get("/favicon.ico")
def favicon():
    return "", 204


if __name__ == "__main__":
    print(f"captioncraft | writer: {env('PROVIDER','gemini')} | vision: {env('VISION_PROVIDER', env('PROVIDER','gemini'))}"
          f" | fallback: {env('FALLBACK_PROVIDER') or 'none'}")
    app.run(debug=False, port=int(env("PORT", "5000")), threaded=True)