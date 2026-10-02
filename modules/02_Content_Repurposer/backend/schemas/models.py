from pydantic import BaseModel, Field
from typing import List, Optional

class GenerateRequest(BaseModel):
    content: str
    platforms: List[str]
    tone: Optional[str] = "professional"

class ContentAnalysis(BaseModel):
    topic: str = Field(description="The primary topic or theme of the source text")
    target_audience: str = Field(description="Identified target audience for the content")
    content_type: str = Field(description="Category or style, e.g. insight, guide, reflection, news")
    key_points: List[str] = Field(description="Key insights or bullet points extracted strictly from the content")
    core_message: str = Field(description="The main takeaway or thesis of the content")
    call_to_action: str = Field(description="Relevant call to action derived from the source")

class YouTubeOutput(BaseModel):
    title: str = Field(description="Catchy yet accurate YouTube video title")
    description: str = Field(description="Structured YouTube video description including key takeaways")
    tags: List[str] = Field(description="5 to 10 relevant SEO video tags")
    outline: str = Field(description="Clear numbered video outline from intro to conclusion")
