from __future__ import annotations

from fastapi import APIRouter, Depends
from ..dependencies import AppContainer, get_container
from ..schemas.health import HealthResponse, DependencyHealth

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check(container: AppContainer = Depends(get_container)) -> HealthResponse:
    # Quick health check
    deps = {}

    # Zarr
    try:
        sizes = container.zarr_store.ds.sizes
        deps["zarr_cube"] = DependencyHealth(status="healthy", details={"dimensions": dict(sizes)})
    except Exception as e:
        deps["zarr_cube"] = DependencyHealth(status="unhealthy", details={"error": str(e)})

    # STAC
    try:
        items = list(container.stac_store.catalog.get_all_items())
        deps["stac_catalog"] = DependencyHealth(status="healthy", details={"items_count": len(items)})
    except Exception as e:
        deps["stac_catalog"] = DependencyHealth(status="unhealthy", details={"error": str(e)})

    # Vector DB
    try:
        col = container.vector_store.client.get_collection(container.vector_store.collection_name)
        deps["vector_database"] = DependencyHealth(
            status="healthy",
            details={"points_count": col.points_count, "collection": container.vector_store.collection_name},
        )
    except Exception as e:
        deps["vector_database"] = DependencyHealth(status="unhealthy", details={"error": str(e)})

    # OmniRoute
    omni_status = container.omniroute_client.check_health()
    if omni_status.get("reachable"):
        deps["omniroute_model_server"] = DependencyHealth(status="healthy", details=omni_status)
    else:
        deps["omniroute_model_server"] = DependencyHealth(status="degraded", details=omni_status)

    overall = "healthy"
    if any(d.status == "unhealthy" for d in deps.values()):
        overall = "degraded"

    return HealthResponse(
        status=overall,
        version="0.1.0",
        project="GeoChronos",
        phase="Phase 3 - Backend Integration",
        dependencies=deps,
    )


@router.get("/health/dependencies")
def health_dependencies(container: AppContainer = Depends(get_container)) -> dict:
    return health_check(container).dependencies
