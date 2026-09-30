from fastapi.testclient import TestClient


def test_map_bounds(client: TestClient):
    response = client.get("/api/map/bounds")
    assert response.status_code == 200
    data = response.json()
    assert data["crs_native"] == "EPSG:32644"
    assert data["crs_display"] == "EPSG:4326"
    assert "bounds_display" in data
    assert "center_display" in data
    assert len(data["time_values"]) == 4


def test_map_features_geojson(client: TestClient):
    response = client.get("/api/map/features?feature_class=water_body&year=2026&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) <= 10
    if data["features"]:
        feat = data["features"][0]
        assert feat["type"] == "Feature"
        assert "geometry" in feat
        assert "properties" in feat
        assert "color" in feat["properties"]


def test_map_single_feature_geojson(client: TestClient):
    list_res = client.get("/api/features?limit=1")
    fid = list_res.json()["features"][0]["feature_id"]

    response = client.get(f"/api/map/feature/{fid}")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "Feature"
    assert data["id"] == fid
    assert "geometry" in data
    assert "properties" in data
