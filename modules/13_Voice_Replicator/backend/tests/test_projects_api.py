import pytest
from tests.conftest import requires_postgres

def test_tc_proj_001_create_project_valid(client):
    """TC-PROJ-001 — Create a project using valid data"""
    payload = {
        "name": "AI Tech Insights",
        "creator_handle": "@ai_guru",
        "description": "Software engineering & AI agent content"
    }
    res = client.post("/api/projects", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "id" in data
    assert data["name"] == payload["name"]
    assert data["creator_handle"] == payload["creator_handle"]
    assert data["post_count"] == 0

def test_tc_proj_002_create_project_missing_required(client):
    """TC-PROJ-002 — Create project with missing required fields"""
    payload = {
        "creator_handle": "@no_name"
    }
    res = client.post("/api/projects", json=payload)
    assert res.status_code == 422  # Unprocessable Entity validation error

def test_tc_proj_003_get_project_success(client):
    """TC-PROJ-003 — Retrieve an existing project"""
    # Create first
    create_res = client.post("/api/projects", json={"name": "Fetch Test Project"})
    proj_id = create_res.json()["id"]

    # Fetch
    res = client.get(f"/api/projects/{proj_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == proj_id
    assert data["name"] == "Fetch Test Project"

def test_tc_proj_004_get_project_nonexistent(client):
    """TC-PROJ-004 — Retrieve nonexistent project"""
    res = client.get("/api/projects/nonexistent-id-99999")
    assert res.status_code == 444 or res.status_code == 404

def test_tc_proj_005_list_projects(client):
    """TC-PROJ-005 — List projects"""
    client.post("/api/projects", json={"name": "List Project 1"})
    res = client.get("/api/projects")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_tc_proj_006_delete_project(client):
    """TC-PROJ-006 — Delete project"""
    create_res = client.post("/api/projects", json={"name": "Delete Test Project"})
    proj_id = create_res.json()["id"]

    del_res = client.delete(f"/api/projects/{proj_id}")
    assert del_res.status_code == 200

    fetch_res = client.get(f"/api/projects/{proj_id}")
    assert fetch_res.status_code in [404, 444]
