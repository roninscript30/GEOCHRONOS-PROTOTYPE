from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from .common import GeoJSONFeatureCollection


class TemporalAnalysisRequest(BaseModel):
    feature_class: Optional[str] = Field(default=None, description="Class of feature, e.g. water_body, vegetation, urban_area")
    from_year: int = Field(default=2011, description="Base comparison year")
    to_year: int = Field(default=2026, description="Target comparison year")
    location: Optional[str] = Field(default=None, description="Optional spatial area or locality")
    intent: Optional[str] = Field(default="feature_change", description="Change intent (e.g. feature_change, feature_disappearance, feature_appearance)")
    limit: int = Field(default=20, ge=1, le=500)


class TemporalCompareRequest(BaseModel):
    from_year: int = Field(default=2011)
    to_year: int = Field(default=2026)
    feature_classes: Optional[List[str]] = Field(default=None)


class TemporalAnalysisResponse(BaseModel):
    from_year: int
    to_year: int
    intent: str
    summary_statistics: Dict[str, Any]
    limitations: List[str]
    results_count: int
    results: List[Dict[str, Any]]
    geojson: Optional[GeoJSONFeatureCollection] = None
    provenance: Dict[str, Any]
