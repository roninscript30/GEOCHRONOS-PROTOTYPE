from fastapi.testclient import TestClient


def test_cube_info(client: TestClient):
    response = client.get("/api/cube/info")
    assert response.status_code == 200
    data = response.json()
    assert data["dataset_id"] == "geochronos_chennai"
    assert data["crs"] == "EPSG:32644"
    assert data["resolution_m"] == 10.0
    assert data["dimensions"]["time"] == 4
    assert data["dimensions"]["band"] == 6
    assert data["dimensions"]["y"] == 5000
    assert data["dimensions"]["x"] == 3500


def test_cube_window_utm(client: TestClient):
    payload = {
        "year": 2026,
        "min_x": 410000.0,
        "min_y": 1430000.0,
        "max_x": 411000.0,
        "max_y": 1431000.0,
        "crs": "EPSG:32644",
        "bands": ["red", "nir"],
    }
    response = client.post("/api/cube/window", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["year"] == 2026
    assert data["bands"] == ["red", "nir"]
    assert "statistics" in data
    assert "red" in data["statistics"]
    assert "nir" in data["statistics"]


def test_cube_spectral_profile(client: TestClient):
    payload = {
        "x": 415000.0,
        "y": 1445000.0,
        "crs": "EPSG:32644",
        "year": 2026,
    }
    response = client.post("/api/cube/spectral-profile", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "spectral_profile" in data
    profile = data["spectral_profile"]
    for b in ("blue", "green", "red", "nir", "swir1", "swir2"):
        assert b in profile
        assert isinstance(profile[b], (int, float))


def test_cube_temporal_profile(client: TestClient):
    payload = {
        "x": 415000.0,
        "y": 1445000.0,
        "crs": "EPSG:32644",
        "band": "nir",
    }
    response = client.post("/api/cube/temporal-profile", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "temporal_profile" in data
    prof = data["temporal_profile"]
    assert len(prof) == 4
