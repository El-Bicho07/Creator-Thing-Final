# captioncraft (fixed edition)

## Start (Windows)
1. Copy `.env.example` to `.env` (exact name) and paste your Gemini key after `GEMINI_API_KEY=` (no quotes).
2. Double-click `check.bat`. It installs packages, tests Ollama and Gemini separately, and prints exactly what to fix.
3. When it shows [OK], double-click `run.bat` and open http://localhost:5000

Or in a terminal: `pip install -r requirements.txt`, `python check.py`, `python app.py`.

## What is different
- Gemini and Ollama are called directly over HTTP and wrapped as LangChain runnables, so there are no provider packages to break.
- A wrong Gemini model name is fixed automatically (it looks up a current Flash model). Temporary 503s are retried.
- Local models get a shorter prompt (fewer fields), so they answer faster. Set LITE_MODE=0 for the full prompt.
- If the main provider fails, FALLBACK_PROVIDER is tried, and all failure reasons are shown together.
- If a photo can't be read but you typed a description, captions still work.
- .env is read with BOM/quote/space tolerance, and it overrides system variables.

## Where LangChain is used (app.py)
ChatPromptTemplate (PROMPT), LCEL chains (writer_chain, vision_chain), RunnableLambda adapters (model_runnable),
PydanticOutputParser + Pydantic schema (CaptionResult), with_retry on unparseable output.

Never commit `.env`. Keep keys out of the front-end files.
