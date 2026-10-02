import os
import json
import pytest

def test_tc_draft_001_to_006_drafts_api_pipeline(client):
    """TC-DRAFT-001 through 006 — Draft Management & Validation Retrieval APIs"""
    proj_res = client.post("/api/projects", json={"name": "Draft API Project"})
    proj_id = proj_res.json()["id"]

    dataset_path = os.path.join(os.path.dirname(__file__), "..", "sample_datasets", "tech_creator.json")
    with open(dataset_path) as f:
        dataset = json.load(f)

    client.post(f"/api/projects/{proj_id}/posts/import", json=dataset)
    client.post(f"/api/projects/{proj_id}/analyze")

    # Generate draft
    gen_res = client.post(f"/api/projects/{proj_id}/generate", json={
        "topic": "Draft Management Test",
        "post_type": "educational"
    })
    assert gen_res.status_code == 200
    draft = gen_res.json()
    draft_id = draft["id"]

    # TC-DRAFT-003: List drafts
    list_res = client.get(f"/api/projects/{proj_id}/drafts")
    assert list_res.status_code == 200
    drafts_list = list_res.json()
    assert len(drafts_list) >= 1

    # TC-DRAFT-002: Retrieve individual draft
    get_res = client.get(f"/api/projects/{proj_id}/drafts/{draft_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == draft_id

    # TC-DRAFT-006: Retrieve validation report for draft
    val_res = client.get(f"/api/drafts/{draft_id}/validation")
    assert val_res.status_code == 200
    assert "overall_score" in val_res.json()

    # TC-DRAFT-005: Delete draft
    del_res = client.delete(f"/api/projects/{proj_id}/drafts/{draft_id}")
    assert del_res.status_code == 200

    # Verify deleted
    get_after = client.get(f"/api/projects/{proj_id}/drafts/{draft_id}")
    assert get_after.status_code in [404, 444]
