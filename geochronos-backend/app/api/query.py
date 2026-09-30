from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from ..dependencies import AppContainer, get_container
from ..schemas.query import QueryRequest, QueryResponse
from ..services.query_service import QueryService

router = APIRouter(prefix="/api/query", tags=["Query"])


def get_query_service(container: AppContainer = Depends(get_container)) -> QueryService:
    return QueryService(
        zarr_store=container.zarr_store,
        stac_store=container.stac_store,
        feature_store=container.feature_store,
        vector_store=container.vector_store,
        raster_store=container.raster_store,
        omniroute_client=container.omniroute_client,
    )


@router.post("", response_model=QueryResponse)
def execute_query(
    body: QueryRequest,
    service: QueryService = Depends(get_query_service),
) -> QueryResponse:
    try:
        return service.execute_query(
            query=body.query,
            limit=body.limit or 8,
            include_geojson=body.include_geojson,
            use_llm=body.use_llm,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(exc)}")
