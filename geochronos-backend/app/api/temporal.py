from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from ..dependencies import AppContainer, get_container
from ..schemas.temporal import (
    TemporalAnalysisRequest,
    TemporalAnalysisResponse,
    TemporalCompareRequest,
)
from ..services.temporal_service import TemporalService

router = APIRouter(prefix="/api/temporal", tags=["Temporal Analysis"])


def get_temporal_service(container: AppContainer = Depends(get_container)) -> TemporalService:
    return TemporalService(
        feature_store=container.feature_store,
        stac_store=container.stac_store,
        zarr_store=container.zarr_store,
        raster_store=container.raster_store,
    )


@router.post("/analyze", response_model=TemporalAnalysisResponse)
def analyze_temporal(
    body: TemporalAnalysisRequest,
    service: TemporalService = Depends(get_temporal_service),
) -> TemporalAnalysisResponse:
    try:
        return service.analyze(
            feature_class=body.feature_class,
            from_year=body.from_year,
            to_year=body.to_year,
            intent=body.intent or "feature_change",
            limit=body.limit,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Temporal analysis failed: {str(exc)}")


@router.post("/compare")
def compare_temporal(
    body: TemporalCompareRequest,
    service: TemporalService = Depends(get_temporal_service),
) -> dict:
    return service.compare_classes(
        from_year=body.from_year,
        to_year=body.to_year,
        feature_classes=body.feature_classes,
    )
