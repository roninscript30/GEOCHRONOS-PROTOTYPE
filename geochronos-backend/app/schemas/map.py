from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from .common import GeoJSONFeatureCollection


class MapBoundsResponse(BaseModel):
    crs_native: str = "EPSG:32644"
    bounds_native: Dict[str, float]
    crs_display: str = "EPSG:4326"
    bounds_display: Dict[str, float]
    center_display: Dict[str, float]
    resolution_m: float
    time_values: List[int]
    canonical_bands: List[str]
