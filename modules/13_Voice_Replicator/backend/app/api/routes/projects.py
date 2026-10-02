from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.project import Project
from app.models.post import Post
from app.models.style_profile import StyleProfile
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("", response_model=ProjectResponse)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        name=project_in.name,
        creator_handle=project_in.creator_handle,
        description=project_in.description
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectResponse(
        id=project.id,
        name=project.name,
        creator_handle=project.creator_handle,
        description=project.description,
        created_at=project.created_at,
        updated_at=project.updated_at,
        post_count=0,
        has_style_profile=False
    )

@router.get("", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    res = []
    for p in projects:
        p_count = db.query(Post).filter(Post.project_id == p.id).count()
        has_sp = db.query(StyleProfile).filter(StyleProfile.project_id == p.id).first() is not None
        res.append(ProjectResponse(
            id=p.id,
            name=p.name,
            creator_handle=p.creator_handle,
            description=p.description,
            created_at=p.created_at,
            updated_at=p.updated_at,
            post_count=p_count,
            has_style_profile=has_sp
        ))
    return res

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=444, detail="Project not found")
    p_count = db.query(Post).filter(Post.project_id == p.id).count()
    has_sp = db.query(StyleProfile).filter(StyleProfile.project_id == p.id).first() is not None
    return ProjectResponse(
        id=p.id,
        name=p.name,
        creator_handle=p.creator_handle,
        description=p.description,
        created_at=p.created_at,
        updated_at=p.updated_at,
        post_count=p_count,
        has_style_profile=has_sp
    )

@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(p)
    db.commit()
    return {"message": "Project deleted successfully"}
