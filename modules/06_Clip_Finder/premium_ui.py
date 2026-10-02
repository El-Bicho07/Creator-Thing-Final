"""Premium UI layer for Streamlit. Usage:
    import premium_ui as ui
    ui.inject_css(); ui.hero("AI Clip Finder", "Turn long videos into Shorts"); ...
"""
import html
import streamlit as st

CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');
:root{--bg:#07070C;--panel:rgba(255,255,255,.035);--line:rgba(255,255,255,.08);--txt:#ECECF4;--mut:#8C8CA1;
--a1:#8B5CF6;--a2:#22D3EE;--ok:#34D399;--warn:#FBBF24;--bad:#F87171;--grad:linear-gradient(135deg,#8B5CF6,#22D3EE)}
html,body,[class*="css"],.stApp{font-family:'Inter',sans-serif!important}
.stApp{background:radial-gradient(900px 500px at 12% -8%,rgba(139,92,246,.16),transparent 60%),
radial-gradient(800px 500px at 100% 0%,rgba(34,211,238,.10),transparent 55%),var(--bg)}
header[data-testid="stHeader"],footer,#MainMenu,[data-testid="stToolbar"]{display:none!important}
.block-container{max-width:1180px;padding:2.2rem 2rem 5rem}
h1,h2,h3{letter-spacing:-.02em;font-weight:700}
h2{font-size:1.35rem!important;margin-top:2.2rem!important}

/* sidebar */
section[data-testid="stSidebar"]{background:rgba(10,10,18,.85);backdrop-filter:blur(18px);border-right:1px solid var(--line)}
section[data-testid="stSidebar"] h2{font-size:1.05rem!important;color:var(--txt)}
[data-baseweb="select"]>div,[data-baseweb="input"],.stTextInput input,.stNumberInput input{
background:rgba(255,255,255,.04)!important;border:1px solid var(--line)!important;border-radius:12px!important;color:#fff!important}
[data-baseweb="select"]>div:hover,.stTextInput input:focus{border-color:var(--a1)!important;box-shadow:0 0 0 3px rgba(139,92,246,.18)!important}
.stSlider [role="slider"]{background:var(--grad)!important;box-shadow:0 0 0 5px rgba(139,92,246,.22)!important}
.stCheckbox label span{color:var(--txt)}

/* buttons */
.stButton>button,.stDownloadButton>button{border:0;border-radius:12px;padding:.7rem 1.4rem;font-weight:600;color:#fff;
background:var(--grad);box-shadow:0 8px 24px -8px rgba(139,92,246,.6);transition:.2s}
.stButton>button:hover,.stDownloadButton>button:hover{transform:translateY(-2px);box-shadow:0 14px 30px -8px rgba(34,211,238,.5);color:#fff}
.stButton>button[kind="secondary"]{background:var(--panel);border:1px solid var(--line);box-shadow:none}

/* uploader */
[data-testid="stFileUploaderDropzone"]{background:var(--panel);border:1.5px dashed rgba(139,92,246,.45);border-radius:18px;padding:2rem;transition:.25s}
[data-testid="stFileUploaderDropzone"]:hover{background:rgba(139,92,246,.07);border-color:var(--a2);box-shadow:0 0 40px -10px rgba(34,211,238,.4)}
[data-testid="stFileUploaderDropzone"] button{background:var(--panel);border:1px solid var(--line);color:var(--txt);box-shadow:none}

/* misc widgets */
details{background:var(--panel)!important;border:1px solid var(--line)!important;border-radius:14px!important;padding: 10px 14px;}
[data-testid="stMetric"]{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:1rem 1.2rem}
[data-testid="stMetricValue"]{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:800}
.stProgress>div>div>div{background:var(--grad)}
[data-testid="stAlert"]{border-radius:14px;border:1px solid var(--line)}
video{border-radius:16px;border:1px solid var(--line);margin: 10px 0;}
hr{border-color:var(--line)!important}

/* components */
.hero{padding:2.4rem 0 1.2rem}
.hero .badge{display:inline-flex;gap:.5rem;align-items:center;font-size:.75rem;font-weight:600;color:var(--a2);
background:rgba(34,211,238,.09);border:1px solid rgba(34,211,238,.25);padding:.35rem .8rem;border-radius:99px}
.hero h1{font-size:3.4rem;line-height:1.05;margin:1rem 0 .6rem;font-weight:800;
background:linear-gradient(135deg,#fff 30%,#a78bfa 70%,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{color:var(--mut);font-size:1.1rem;max-width:640px;margin:0}
.pills{display:flex;flex-wrap:wrap;gap:.7rem;margin:1.4rem 0}
.pill{display:flex;align-items:center;gap:.6rem;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:.6rem 1rem;font-size:.85rem;backdrop-filter:blur(10px)}
.pill i{width:9px;height:9px;border-radius:50%;background:var(--ok);box-shadow:0 0 12px var(--ok)}
.pill.warn i{background:var(--warn);box-shadow:0 0 12px var(--warn)}
.pill.bad i{background:var(--bad);box-shadow:0 0 12px var(--bad)}
.pill b{font-weight:600;color:var(--txt)}.pill span{color:var(--mut)}
.steps{display:flex;gap:.6rem;margin:1.6rem 0}
.step{flex:1;padding:.9rem 1rem;border-radius:14px;background:var(--panel);border:1px solid var(--line);color:var(--mut);font-size:.85rem;font-weight:500}
.step em{font-style:normal;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;margin-right:.5rem;background:rgba(255,255,255,.08);font-size:.72rem}
.step.done{color:var(--txt)}.step.done em{background:var(--ok);color:#04130c}
.step.on{color:#fff;border-color:rgba(139,92,246,.6);background:rgba(139,92,246,.12);box-shadow:0 0 30px -10px var(--a1)}
.step.on em{background:var(--grad);color:#fff}
.card{display:flex;gap:1.4rem;align-items:flex-start;padding:1.4rem 1.5rem;margin:1rem 0;border-radius:20px;
background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));border:1px solid var(--line);transition:.25s}
.card:hover{transform:translateY(-3px);border-color:rgba(139,92,246,.5);box-shadow:0 20px 50px -20px rgba(139,92,246,.5)}
.ring{--p:0;flex:none;width:78px;height:78px;border-radius:50%;display:grid;place-items:center;
background:conic-gradient(var(--a2) calc(var(--p)*1%),rgba(255,255,255,.08) 0)}
.ring div{width:62px;height:62px;border-radius:50%;background:#0d0d16;display:grid;place-items:center;font-weight:800;font-size:1.2rem;color:#fff}
.card .body{flex:1;min-width:0}
.card .top{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-bottom:.35rem}
.rank{font-size:.72rem;font-weight:700;color:#fff;background:var(--grad);padding:.2rem .6rem;border-radius:8px}
.time{font-family:'JetBrains Mono',monospace;font-size:.78rem;color:var(--a2);background:rgba(34,211,238,.08);padding:.2rem .6rem;border-radius:8px}
.dur{font-size:.78rem;color:var(--mut)}
.card h3{margin:.2rem 0 .3rem;font-size:1.2rem;color:#fff}
.card p{margin:0 0 .9rem;color:var(--mut);font-size:.92rem;line-height:1.55}
.bars{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.55rem 1.2rem}
.bar label{display:flex;justify-content:space-between;font-size:.7rem;color:var(--mut);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.25rem}
.bar div{height:5px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden}
.bar div i{display:block;height:100%;background:var(--grad);border-radius:9px}
</style>
"""

def inject_css():
    st.markdown(CSS, unsafe_allow_html=True)

def hero(title, subtitle, badge="100% Free · Local · Private"):
    st.markdown(f'<div class="hero"><span class="badge">✦ {html.escape(badge)}</span>'
                f'<h1>{html.escape(title)}</h1><p>{html.escape(subtitle)}</p></div>', unsafe_allow_html=True)

def status_row(items):
    """items: [(label, state 'ok'|'warn'|'bad', detail)]"""
    pills = "".join(f'<div class="pill {"" if s == "ok" else s}"><i></i><b>{html.escape(l)}</b>'
                    f'<span>{html.escape(d)}</span></div>' for l, s, d in items)
    st.markdown(f'<div class="pills">{pills}</div>', unsafe_allow_html=True)

def stepper(active, steps=("Upload", "Transcribe", "Analyze", "Clips")):
    out = ""
    for n, s in enumerate(steps):
        cls = "done" if n < active else "on" if n == active else ""
        out += f'<div class="step {cls}"><em>{"✓" if n < active else n + 1}</em>{html.escape(s)}</div>'
    st.markdown(f'<div class="steps">{out}</div>', unsafe_allow_html=True)

def clip_card(rank, title, start, end, score, reason, breakdown=None, duration=None):
    bars = "".join(f'<div class="bar"><label><span>{html.escape(k.replace("_", " "))}</span><span>{v:.0f}</span></label>'
                   f'<div><i style="width:{min(100, v * 10):.0f}%"></i></div></div>' for k, v in (breakdown or {}).items())
    dur = f'<span class="dur">{duration:.0f}s</span>' if duration else ""
    st.markdown(f'<div class="card"><div class="ring" style="--p:{min(100, score):.0f}"><div>{score:.0f}</div></div>'
                f'<div class="body"><div class="top"><span class="rank">#{rank}</span>'
                f'<span class="time">{html.escape(start)} → {html.escape(end)}</span>{dur}</div>'
                f'<h3>{html.escape(title)}</h3><p>{html.escape(reason)}</p><div class="bars">{bars}</div></div></div>',
                unsafe_allow_html=True)
