from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from .common import GeoJSONFeatureCollection


class QueryRequest(BaseModel):
    query: str = Field(..., description="Natural language geospatial query", json_schema_extra={"example": "Show water bodies that disappeared between 2011 and 2026"})
    limit: Optional[int] = Field(default=8, ge=1, le=100)
    include_geojson: bool = Field(default=True, description="Whether to include full GeoJSON FeatureCollection in response")
    use_llm: bool = Field(default=True, description="Whether to invoke local OmniRoute interpreter/synthesizer")


class StructuredQuerySchema(BaseModel):
    intent: str
    feature_class: Optional[str] = None
    location: Optional[str] = None
    semantic_query: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    reference_year: Optional[int] = None
    operation: Optional[str] = None
    filters: Dict[str, Any] = Field(default_factory=dict)
    limit: Optional[int] = None


class QueryResponse(BaseModel):
    query: str
    structured_query: StructuredQuerySchema
    answer: str
    synthesis_mode: str = Field(default="deterministic_grounded", description="Synthesis mode: 'llm_generated' or 'deterministic_grounded'")
    llm_generated: bool = Field(default=False, description="True if response text was synthesized via OmniRoute LLM")
    summary_statistics: Dict[str, Any] = Field(default_factory=dict)
    limitations: List[str] = Field(default_factory=list)
    provenance: Dict[str, Any] = Field(default_factory=dict)
    geojson: Optional[GeoJSONFeatureCollection] = None
    results_count: int = 0
