from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from ..dependencies import AppContainer, get_container
from ..schemas.map import MapBoundsResponse
from ..schemas.common import GeoJSONFeature, GeoJSONFeatureCollection
from ..services.map_service import MapService

router = APIRouter(prefix="/api/map", tags=["Map"])


def get_map_service(container: AppContainer = Depends(get_container)) -> MapService:
    return MapService(
        feature_store=container.feature_store,
        zarr_store=container.zarr_store,
    )


@router.get("/bounds", response_model=MapBoundsResponse)
def get_map_bounds(service: MapService = Depends(get_map_service)) -> MapBoundsResponse:
    return service.get_map_bounds()


@router.get("/features", response_model=GeoJSONFeatureCollection)
def get_map_features(
    feature_class: Optional[str] = Query(None, description="Feature class filter"),
    year: Optional[int] = Query(2026, description="Year (2011, 2015, 2020, 2026)"),
    min_lon: Optional[float] = Query(None, description="Bounding box min longitude (WGS84)"),
    min_lat: Optional[float] = Query(None, description="Bounding box min latitude (WGS84)"),
    max_lon: Optional[float] = Query(None, description="Bounding box max longitude (WGS84)"),
    max_lat: Optional[float] = Query(None, description="Bounding box max latitude (WGS84)"),
    limit: int = Query(200, ge=1, le=1000),
    service: MapService = Depends(get_map_service),
) -> GeoJSONFeatureCollection:
    bbox = None
    if all(v is not None for v in (min_lon, min_lat, max_lon, max_lat)):
        bbox = [min_lon, min_lat, max_lon, max_lat]

    return service.get_features_geojson(
        feature_class=feature_class,
        year=year,
        bbox_wgs84=bbox,
        limit=limit,
    )


@router.get("/feature/{feature_id}", response_model=GeoJSONFeature)
def get_single_feature_geojson(
    feature_id: str,
    service: MapService = Depends(get_map_service),
) -> GeoJSONFeature:
    feat = service.get_feature_geojson(feature_id)
    if not feat:
        raise HTTPException(status_code=404, detail=f"Feature geometry not found: {feature_id}")
    return feat


_cached_base_vectors = None

@router.get("/base-vectors")
def get_base_vectors():
    global _cached_base_vectors
    if _cached_base_vectors is None:
        import json
        from pathlib import Path
        base_path = Path("./data-foundation/vectors/chennai-base-vectors.json")
        if base_path.exists():
            with open(base_path, "r") as f:
                _cached_base_vectors = json.load(f)
        else:
            _cached_base_vectors = {"type": "FeatureCollection", "features": []}
    return _cached_base_vectors

