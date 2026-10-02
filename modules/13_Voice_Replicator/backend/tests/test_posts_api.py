import os
import json
import pytest

def test_tc_post_001_import_valid_dataset(client):
    """TC-POST-001 — Import valid historical dataset"""
    proj_res = client.post("/api/projects", json={"name": "Post Import Project"})
    proj_id = proj_res.json()["id"]

    dataset_path = os.path.join(os.path.dirname(__file__), "..", "sample_datasets", "tech_creator.json")
    with open(dataset_path) as f:
        dataset = json.load(f)

    res = client.post(f"/api/projects/{proj_id}/posts/import", json=dataset)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["count"] == 5

def test_tc_post_002_import_empty_dataset(client):
    """TC-POST-002 — Import empty dataset"""
    proj_res = client.post("/api/projects", json={"name": "Empty Dataset Project"})
    proj_id = proj_res.json()["id"]

    res = client.post(f"/api/projects/{proj_id}/posts/import", json={"posts": []})
    assert res.status_code == 200
    assert res.json()["count"] == 0

def test_tc_post_003_import_malformed_post(client):
    """TC-POST-003 — Import malformed post"""
    proj_res = client.post("/api/projects", json={"name": "Malformed Post Project"})
    proj_id = proj_res.json()["id"]

    res = client.post(f"/api/projects/{proj_id}/posts/import", json={"posts": [{"hashtags": ["#ai"]}]})
    assert res.status_code == 422  # Missing required 'caption' field

def test_tc_post_004_retrieve_imported_posts(client):
    """TC-POST-004 — Retrieve imported posts"""
    proj_res = client.post("/api/projects", json={"name": "Fetch Posts Project"})
    proj_id = proj_res.json()["id"]

    dataset_path = os.path.join(os.path.dirname(__file__), "..", "sample_datasets", "tech_creator.json")
    with open(dataset_path) as f:
        dataset = json.load(f)

    client.post(f"/api/projects/{proj_id}/posts/import", json=dataset)

    res = client.get(f"/api/projects/{proj_id}/posts")
    assert res.status_code == 200
    posts = res.json()
    assert len(posts) == 5
    assert "text_features" in posts[0]

def test_tc_post_007_duplicate_import_handling(client):
    """TC-POST-007 — Duplicate post import handling"""
    proj_res = client.post("/api/projects", json={"name": "Duplicate Import Project"})
    proj_id = proj_res.json()["id"]

    single_dataset = {
        "posts": [
            {
                "id": "dup-001",
                "caption": "Duplicate caption test post",
                "hashtags": ["#test"]
            }
        ]
    }

    res1 = client.post(f"/api/projects/{proj_id}/posts/import", json=single_dataset)
    assert res1.status_code == 200

    res2 = client.post(f"/api/projects/{proj_id}/posts/import", json=single_dataset)
    assert res2.status_code == 200

    posts = client.get(f"/api/projects/{proj_id}/posts").json()
    assert len(posts) >= 1
