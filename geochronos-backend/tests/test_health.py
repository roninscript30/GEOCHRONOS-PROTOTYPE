from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "GeoChronos"
    assert data["status"] in ("healthy", "degraded")
    assert "dependencies" in data
    assert "zarr_cube" in data["dependencies"]
    assert "stac_catalog" in data["dependencies"]
    assert "vector_database" in data["dependencies"]


def test_health_dependencies(client: TestClient):
    response = client.get("/health/dependencies")
    assert response.status_code == 200
    deps = response.json()
    assert "zarr_cube" in deps
    assert deps["zarr_cube"]["status"] == "healthy"
