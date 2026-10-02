from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ProjectBase(BaseModel):
    name: str = Field(..., example="Tech Insights Creator")
    creator_handle: Optional[str] = Field(None, example="@tech_guru")
    description: Optional[str] = Field(None, example="AI & Software engineering content")

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    creator_handle: Optional[str] = None
    description: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: str
    created_at: datetime
    updated_at: datetime
    post_count: int = 0
    has_style_profile: bool = False

    class Config:
        from_attributes = True
