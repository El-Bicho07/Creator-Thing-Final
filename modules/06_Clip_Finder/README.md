# 🎬 AI Clip Finder — 100% Free / Local Stack

An end-to-end, privacy-focused local web application that converts long-form videos into ranked YouTube Shorts, TikToks, and Instagram Reels clips. 

**Zero Paid APIs. Zero Subscriptions. 100% Free & Open-Source Stack.**

---

## 🌟 Architecture & Tech Stack

```text
Long-Form Video
       ↓
FFmpeg (Audio Extraction & Video Processing)
       ↓
faster-whisper (Local Speech-to-Text with Timestamps)
       ↓
Ollama (Local LLM: llama3.2 — Clip Discovery & Scoring)
       ↓
Streamlit (Interactive MVP Dashboard & Video Player)
       ↓
FFmpeg (Vertical 9:16 or Native Aspect Ratio Clip Cutting)
```

---

## 📋 Requirements

* **Python:** 3.10+
* **FFmpeg:** Installed on PATH
* **Ollama:** Installed and running locally (Default model: `llama3.2`)

---

## 🚀 Quick Start Guide

### 1. Python Environment Setup

```bash
# Clone or navigate to directory
cd shorts-ai

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
# On macOS / Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

---

### 3. Install FFmpeg

FFmpeg handles audio extraction, video metadata retrieval, and clip cutting.

* **macOS (Homebrew):**
  ```bash
  brew install ffmpeg
  ```
* **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt update && sudo apt install -y ffmpeg
  ```
* **Windows (Chocolatey / Scoop / Direct Download):**
  ```powershell
  choco install ffmpeg
  # or download from https://ffmpeg.org/download.html and add bin to PATH
  ```

Verify installation:
```bash
ffmpeg -version
```

---

### 4. Install & Start Ollama

Ollama runs open-source LLMs locally on your machine.

1. **Download Ollama:** Visit [ollama.com](https://ollama.com) and install the desktop app or CLI for your OS.
2. **Download Model:** Pull the `llama3.2` model (or your preferred model):
   ```bash
   ollama pull llama3.2
   ```
3. **Verify Server is Running:**
   ```bash
   ollama serve
   ```
   *(By default, Ollama listens at `http://localhost:11434`)*

---

### 5. Launch the Application

Start the **Clipsmith** Web Application:

```bash
python run.py
```
*or directly with uvicorn:*
```bash
uvicorn app.server:app --port 8008 --reload
```

Open your browser at **`http://localhost:8008`**.

*(If you ever want to run the Streamlit dashboard instead, use: `python run.py --streamlit`)*

---

## 📂 Project Structure

```text
clip-finder/
├── app/
│   ├── main.py                  # Streamlit Web UI & Workflow
│   ├── config.py                # Environment & directory configuration
│   ├── transcription/
│   │   └── whisper_service.py   # faster-whisper speech-to-text & caching
│   ├── analysis/
│   │   ├── ollama_service.py    # Local Ollama HTTP API integration & health checks
│   │   ├── prompts.py           # Structured JSON evaluation prompts
│   │   └── clip_analyzer.py     # JSON parser, scoring logic & heuristic fallback
│   ├── video/
│   │   └── ffmpeg_service.py    # Audio extraction, duration & clip cutting
│   └── models/
│       └── schemas.py           # Pydantic schemas & timestamp utilities
├── data/
│   ├── uploads/                 # Uploaded video files
│   ├── transcripts/             # Cached timestamped transcripts
│   └── clips/                   # Generated output mp4 clips
├── tests/
│   ├── test_timestamp_parser.py
│   ├── test_clip_validation.py
│   ├── test_ollama_parser.py
│   └── run_tests.py             # Unit test runner
├── .env.example                 # Configuration template
├── requirements.txt             # Python dependencies
├── run.py                       # CLI application launcher
└── README.md
```

---

## ⚙️ Environment Variables

Customize configuration via `.env`:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
WHISPER_MODEL=small
MIN_CLIP_DURATION=15
MAX_CLIP_DURATION=90
```

---

## 🧪 Running Unit Tests

Run the included test suite:

```bash
python tests/run_tests.py
```

---

## 🛡️ Privacy & Local Guarantee

No video data, audio data, or transcripts are sent to external cloud APIs. All transcription (`faster-whisper`), AI analysis (`Ollama`), and video cutting (`FFmpeg`) execute 100% locally on your workstation.
