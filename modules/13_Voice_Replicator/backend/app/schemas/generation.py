from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class GenerationRequest(BaseModel):
    topic: str = Field(..., example="5 essential tools for modern AI developers")
    post_type: Optional[str] = Field("educational", example="educational")
    cta_requirement: Optional[str] = Field(None, example="Ask followers to comment their favorite tool")
    desired_length: Optional[str] = Field("medium", example="medium") # short, medium, long
    custom_instructions: Optional[str] = Field(None, example="Include a tip about python environment setup")

class SlideContent(BaseModel):
    title: str
    body: str

class GenerationResponse(BaseModel):
    id: str
    project_id: str
    topic: str
    post_type: str
    hook: str
    caption: str
    cta: Optional[str]
    hashtags: List[str]
    slides: Optional[List[SlideContent]] = []
    created_at: datetime

    class Config:
        from_attributes = True
