from fastapi.testclient import TestClient


def test_natural_language_query_deterministic(client: TestClient):
    payload = {
        "query": "Show water body change between 2011 and 2026",
        "limit": 5,
        "include_geojson": True,
        "use_llm": False,
    }
    response = client.post("/api/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "structured_query" in data
    assert data["structured_query"]["start_year"] == 2011
    assert data["structured_query"]["end_year"] == 2026
    assert "answer" in data
    assert "summary_statistics" in data
    assert "provenance" in data
    if data["geojson"]:
        assert data["geojson"]["type"] == "FeatureCollection"


def test_natural_language_query_plural(client: TestClient):
    payload = {
        "query": "Find water bodies between 2011 and 2026",
        "limit": 5,
        "include_geojson": True,
        "use_llm": False,
    }
    response = client.post("/api/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["structured_query"]["feature_class"] == "water_body"
