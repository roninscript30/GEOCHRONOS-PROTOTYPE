from fastapi.testclient import TestClient


def test_temporal_analyze(client: TestClient):
    payload = {
        "feature_class": "water_body",
        "from_year": 2011,
        "to_year": 2026,
        "intent": "feature_change",
        "limit": 5,
    }
    response = client.post("/api/temporal/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["from_year"] == 2011
    assert data["to_year"] == 2026
    assert "summary_statistics" in data
    assert "provenance" in data
    assert "geojson" in data
    assert data["geojson"]["type"] == "FeatureCollection"


def test_temporal_compare(client: TestClient):
    payload = {
        "from_year": 2011,
        "to_year": 2026,
        "feature_classes": ["water_body", "vegetation", "urban_area"],
    }
    response = client.post("/api/temporal/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "class_transitions" in data
    transitions = data["class_transitions"]
    assert "water_body" in transitions
    assert "vegetation" in transitions
    assert "urban_area" in transitions
