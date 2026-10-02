import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv

from schemas.models import GenerateRequest
from chains.orchestrator import repurpose_content

load_dotenv()

app = FastAPI(title="Content Repurposer API", version="2.0.0")

# Enable CORS so the React frontend can communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

@app.post('/generate')
async def generate_content(request_data: GenerateRequest):
    # Verify API key presence
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_actual_api_key_here":
        return JSONResponse(
            status_code=500,
            content={"error": "Gemini API key is missing or invalid. Please check your backend .env file."}
        )

    content = request_data.content.strip()
    platforms = request_data.platforms
    tone = (request_data.tone or "professional").strip().lower()

    if not content:
        return JSONResponse(
            status_code=400,
            content={"error": "Content cannot be empty."}
        )

    if not platforms:
        return JSONResponse(
            status_code=400,
            content={"error": "At least one platform must be selected."}
        )

    valid_platforms = {"linkedin", "instagram", "x", "youtube"}
    selected_valid = [p.lower() for p in platforms if p.lower() in valid_platforms]
    
    if not selected_valid:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid platform selections."}
        )

    try:
        # Orchestrate the generation through LangChain components
        result = await repurpose_content(
            content=content,
            platforms=selected_valid,
            tone=tone,
            api_key=GEMINI_API_KEY
        )
        return JSONResponse(status_code=200, content=result)

    except Exception as e:
        error_msg = str(e)
        # Avoid leaking raw API keys or internal stack traces in client response
        if GEMINI_API_KEY and GEMINI_API_KEY in error_msg:
            error_msg = error_msg.replace(GEMINI_API_KEY, "[REDACTED]")
            
        return JSONResponse(
            status_code=500,
            content={"error": f"An error occurred during AI generation: {error_msg}"}
        )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={"error": "Invalid JSON payload or missing fields."}
    )

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=5000, reload=True)
