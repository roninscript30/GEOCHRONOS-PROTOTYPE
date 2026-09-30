from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from ..dependencies import AppContainer, get_container
from ..schemas.raster import (
    RasterCompositeRequest,
    RasterCompositeResponse,
    RasterDifferenceRequest,
    RasterDifferenceResponse,
    FeatureCropRequest,
    FeatureCropResponse,
    VoxelWindowRequest,
    VoxelWindowResponse,
)
from ..services.raster_service import RasterService

router = APIRouter(prefix="/api/raster", tags=["Raster & Evidence Imagery"])


def get_raster_service(container: AppContainer = Depends(get_container)) -> RasterService:
    return RasterService(
        zarr_store=container.zarr_store,
        stac_store=container.stac_store,
        feature_store=container.feature_store,
    )


@router.post("/composite", response_model=RasterCompositeResponse)
def get_raster_composite(
    body: RasterCompositeRequest,
    service: RasterService = Depends(get_raster_service),
) -> RasterCompositeResponse:
    """
    Generate bounded multi-band satellite imagery composite (Natural Color, CIR, SWIR, NDVI, NDMI, NDBI)
    directly from local 4D Zarr datacube with percentile stretch and authoritative STAC observation metadata.
    """
    try:
        return service.get_composite(body)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Raster composite generation failed: {str(exc)}")


@router.post("/difference", response_model=RasterDifferenceResponse)
def get_raster_difference(
    body: RasterDifferenceRequest,
    service: RasterService = Depends(get_raster_service),
) -> RasterDifferenceResponse:
    """
    Compute pixel-level difference between two observation epochs and return colorized change mask
    (Green: appearance/increase, Red: disappearance/decrease) and change statistics.
    """
    try:
        return service.get_difference(body)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Raster difference calculation failed: {str(exc)}")


@router.post("/feature-crop", response_model=FeatureCropResponse)
def get_feature_crop(
    body: FeatureCropRequest,
    service: RasterService = Depends(get_raster_service),
) -> FeatureCropResponse:
    """
    Extract multi-epoch satellite imagery crops for a specific feature across 2011, 2015, 2020, and 2026
    directly bounded around the feature's geometry with authoritative sensor metadata.
    """
    try:
        return service.get_feature_crops(body)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Feature crop extraction failed: {str(exc)}")


@router.post("/voxel-window", response_model=VoxelWindowResponse)
def get_voxel_window(
    body: VoxelWindowRequest,
    service: RasterService = Depends(get_raster_service),
) -> VoxelWindowResponse:
    """
    Extract bounded 3D volumetric array (time x y x for selected band, or band x y x for selected year)
    for the interactive 3D Voxel / Isometric Cube explorer.
    """
    try:
        return service.get_voxel_window(body)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Voxel window slicing failed: {str(exc)}")

