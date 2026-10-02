from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv

from src.agent import ReelScriptAgent

load_dotenv()

app = FastAPI(title="Reel Script Builder")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = ReelScriptAgent()


class ScriptRequest(BaseModel):
    topic: str
    tone: str = "engaging"


@app.post("/api/generate")
async def generate_reel_script(request: ScriptRequest):
    return agent.generate_script(request.topic, request.tone)


# Inline SVG favicon so there are zero 404s
FAVICON_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
    '<rect width="32" height="32" rx="6" fill="#1d1d1f"/>'
    '<text x="16" y="23" font-size="20" text-anchor="middle" fill="#fff" font-family="system-ui">R</text>'
    '</svg>'
)


@app.get("/favicon.ico")
async def favicon():
    return Response(content=FAVICON_SVG, media_type="image/svg+xml")


# Serve frontend static assets (CSS, JS, images)
app.mount("/static", StaticFiles(directory="frontend"), name="static")


@app.get("/")
async def root():
    return FileResponse("frontend/index.html")
