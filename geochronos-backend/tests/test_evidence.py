from fastapi.testclient import TestClient


def test_evidence_and_provenance(client: TestClient):
    # Retrieve a feature id first
    list_res = client.get("/api/features?limit=1")
    fid = list_res.json()["features"][0]["feature_id"]

    ev_res = client.get(f"/api/evidence/{fid}")
    assert ev_res.status_code == 200
    ev_data = ev_res.json()
    assert ev_data["feature_id"] == fid
    assert "stac_item" in ev_data
    assert "source_raster" in ev_data
    assert "zarr_reference" in ev_data
    assert "spatial_evidence" in ev_data

    prov_res = client.get(f"/api/provenance/{fid}")
    assert prov_res.status_code == 200
    prov_data = prov_res.json()
    assert prov_data["feature_id"] == fid
    assert "pipeline" in prov_data
    assert "source_observation" in prov_data
    assert "datacube_location" in prov_data
    assert "vector_derivation" in prov_data
    assert "embedding_provenance" in prov_data
