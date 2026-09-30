from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from .common import GeoJSONFeature, GeoJSONFeatureCollection


class FeatureItem(BaseModel):
    feature_id: str
    feature_class: str
    year: int
    observation_id: str
    confidence: float
    source_item_id: str
    cube_time_index: int
    area_m2: Optional[float] = None
    attributes: Dict[str, Any] = Field(default_factory=dict)


class FeatureListResponse(BaseModel):
    total: int
    offset: int
    limit: int
    features: List[FeatureItem]
    geojson: Optional[GeoJSONFeatureCollection] = None


class FeatureHistoryResponse(BaseModel):
    feature_id: str
    feature_class: str
    history: List[Dict[str, Any]]
    total_observations: int
