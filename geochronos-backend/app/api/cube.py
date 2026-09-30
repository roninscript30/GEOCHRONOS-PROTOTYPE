from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from ..dependencies import AppContainer, get_container
from ..schemas.cube import (
    CubeInfoResponse,
    CubeWindowRequest,
    CubeWindowResponse,
    GeoChronoslProfileRequest,
    GeoChronoslProfileResponse,
    TemporalProfileRequest,
    TemporalProfileResponse,
)
from ..services.cube_service import CubeService

router = APIRouter(prefix="/api/cube", tags=["Data Cube"])


def get_cube_service(container: AppContainer = Depends(get_container)) -> CubeService:
    return CubeService(zarr_store=container.zarr_store)


@router.get("/info", response_model=CubeInfoResponse)
def get_cube_info(service: CubeService = Depends(get_cube_service)) -> CubeInfoResponse:
    try:
        return service.get_info()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read cube info: {str(exc)}")


@router.post("/window", response_model=CubeWindowResponse)
def get_cube_window(
    body: CubeWindowRequest,
    service: CubeService = Depends(get_cube_service),
) -> CubeWindowResponse:
    try:
        return service.get_window(
            year=body.year,
            min_x=body.min_x,
            min_y=body.min_y,
            max_x=body.max_x,
            max_y=body.max_y,
            crs=body.crs,
            bands=body.bands,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Window slicing failed: {str(exc)}")


@router.post("/spectral-profile", response_model=GeoChronoslProfileResponse)
def get_spectral_profile(
    body: GeoChronoslProfileRequest,
    service: CubeService = Depends(get_cube_service),
) -> GeoChronoslProfileResponse:
    try:
        return service.get_spectral_profile(
            x=body.x,
            y=body.y,
            crs=body.crs,
            year=body.year,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to extract spectral profile: {str(exc)}")


@router.post("/temporal-profile", response_model=TemporalProfileResponse)
def get_temporal_profile(
    body: TemporalProfileRequest,
    service: CubeService = Depends(get_cube_service),
) -> TemporalProfileResponse:
    try:
        return service.get_temporal_profile(
            x=body.x,
            y=body.y,
            crs=body.crs,
            band=body.band,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to extract temporal profile: {str(exc)}")
