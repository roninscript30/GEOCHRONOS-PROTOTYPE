from fastapi.testclient import TestClient


def test_list_features(client: TestClient):
    response = client.get("/api/features?limit=10&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert len(data["features"]) == 10
    first = data["features"][0]
    assert "feature_id" in first
    assert "feature_class" in first
    assert "year" in first


def test_list_features_filtered(client: TestClient):
    response = client.get("/api/features?feature_class=water_body&year=2011&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["features"]) == 5
    for f in data["features"]:
        assert f["feature_class"] == "water_body"
        assert f["year"] == 2011


def test_get_single_feature(client: TestClient):
    # First get an existing feature id
    list_res = client.get("/api/features?limit=1")
    fid = list_res.json()["features"][0]["feature_id"]

    response = client.get(f"/api/features/{fid}")
    assert response.status_code == 200
    data = response.json()
    assert data["feature_id"] == fid
    assert "geometry_native" in data
    assert "geometry_geojson" in data
    assert "spectral_profile" in data


def test_get_feature_history(client: TestClient):
    list_res = client.get("/api/features?limit=1")
    fid = list_res.json()["features"][0]["feature_id"]

    response = client.get(f"/api/features/{fid}/history")
    assert response.status_code == 200
    data = response.json()
    assert data["feature_id"] == fid
    assert "history" in data
    assert len(data["history"]) > 0
