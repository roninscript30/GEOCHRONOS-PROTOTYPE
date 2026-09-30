from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from ..dependencies import AppContainer, get_container
from ..schemas.features import FeatureListResponse, FeatureHistoryResponse
from ..services.feature_service import FeatureService

router = APIRouter(prefix="/api/features", tags=["Features"])


def get_feature_service(container: AppContainer = Depends(get_container)) -> FeatureService:
    return FeatureService(
        feature_store=container.feature_store,
        zarr_store=container.zarr_store,
    )


@router.get("", response_model=FeatureListResponse)
def list_features(
    feature_class: Optional[str] = Query(None, description="Feature class filter"),
    year: Optional[int] = Query(None, description="Year filter (2011, 2015, 2020, 2026)"),
    observation_id: Optional[str] = Query(None, description="Observation ID filter"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    include_geojson: bool = Query(False, description="Whether to include GeoJSON FeatureCollection"),
    service: FeatureService = Depends(get_feature_service),
) -> FeatureListResponse:
    return service.list_features(
        feature_class=feature_class,
        year=year,
        observation_id=observation_id,
        limit=limit,
        offset=offset,
        include_geojson=include_geojson,
    )


@router.get("/{feature_id}")
def get_feature(
    feature_id: str,
    service: FeatureService = Depends(get_feature_service),
) -> dict:
    feature = service.get_feature(feature_id)
    if not feature:
        raise HTTPException(status_code=404, detail=f"Feature not found: {feature_id}")
    return feature


@router.get("/{feature_id}/history", response_model=FeatureHistoryResponse)
def get_feature_history(
    feature_id: str,
    service: FeatureService = Depends(get_feature_service),
) -> FeatureHistoryResponse:
    return service.get_feature_history(feature_id)
