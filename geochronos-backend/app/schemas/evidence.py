from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from .common import GeoJSONFeature


class EvidenceResponse(BaseModel):
    feature_id: str
    feature_class: str
    year: int
    observation_id: str
    confidence: float
    stac_item: Dict[str, Any]
    source_raster: Dict[str, Any]
    zarr_reference: Dict[str, Any]
    spatial_evidence: Dict[str, Any]
    geometry_geojson: Optional[GeoJSONFeature] = None


class ProvenanceResponse(BaseModel):
    feature_id: str
    pipeline: Dict[str, Any]
    source_observation: Dict[str, Any]
    datacube_location: Dict[str, Any]
    vector_derivation: Dict[str, Any]
    embedding_provenance: Dict[str, Any]
