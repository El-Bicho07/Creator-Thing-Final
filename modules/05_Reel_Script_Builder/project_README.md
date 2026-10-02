# Reel Script Builder

An agentic AI application that turns any topic into a structured 30-60 second short-form video script, broken into Hook, Body, and CTA.

Built for **Protosem 05** by **PRAVEEN.A**.

---

## Problem Statement

Short-form creators struggle to structure 30-60 second videos. This tool automates the process by taking an idea and producing a ready-to-use script with a clear hook, body, and call to action.

---

## Architecture

```
frontend/index.html   <-- Single-page UI (vanilla HTML/CSS/JS, macOS-native styling)
app.py                <-- FastAPI backend, serves UI and API
src/agent.py          <-- Agentic script generator (Gemini LLM + local fallback)
```

The backend runs an **agent loop**: it analyzes the request, plans the script structure, calls the Gemini model for generation, parses the structured output, and returns it to the frontend. The frontend streams the agent's reasoning trace in real time before revealing the final script blocks.

When no API key is configured, the agent falls back to high-quality local templates so the app is always functional.

---

## Tech Stack

- **Backend**: Python, FastAPI, Uvicorn
- **AI Model**: Google Gemini 2.0 Flash (via `google-genai` SDK)
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Design**: Native macOS aesthetics (system fonts, Apple-style controls)

---

## Setup

### 1. Clone and checkout

```bash
git clone https://github.com/<YOUR_USERNAME>/ASADI_Protosem01.git
cd ASADI_Protosem01
git checkout 05_Reel_Script_Builder
```

### 2. Create a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate   # macOS / Linux
# venv\Scripts\activate    # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```
GEMINI_API_KEY=your_actual_key_here
```

If you skip this step, the app will still work using local fallback templates.

### 5. Run the application

```bash
uvicorn app:app --port 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## Usage

1. Enter a topic (e.g. "3 productivity hacks for developers")
2. Select a tone (Engaging, Educational, Storytelling, Funny, Controversial)
3. Click **Generate Script**
4. Watch the agent's reasoning trace stream in
5. Read your structured script: Hook, Body, CTA
