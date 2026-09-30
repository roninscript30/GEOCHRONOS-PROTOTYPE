from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CubeInfoResponse(BaseModel):
    dataset_id: str
    project: str
    study_area: str
    crs: str
    resolution_m: float
    dimensions: Dict[str, int]
    coordinates: Dict[str, List[Any]]
    variables: Dict[str, Dict[str, Any]]
    bounds: Dict[str, float]
    attributes: Dict[str, Any]


class CubeWindowRequest(BaseModel):
    year: int = Field(default=2026, description="Observation year (2011, 2015, 2020, 2026)")
    bands: Optional[List[str]] = Field(default=None, description="Bands to extract. Default: all canonical bands")
    min_x: float = Field(..., description="Min X (UTM Easting in meters or Lon if crs=EPSG:4326)")
    min_y: float = Field(..., description="Min Y (UTM Northing in meters or Lat if crs=EPSG:4326)")
    max_x: float = Field(..., description="Max X (UTM Easting in meters or Lon if crs=EPSG:4326)")
    max_y: float = Field(..., description="Max Y (UTM Northing in meters or Lat if crs=EPSG:4326)")
    crs: str = Field(default="EPSG:32644", description="CRS of input bounds ('EPSG:32644' or 'EPSG:4326')")


class CubeWindowResponse(BaseModel):
    year: int
    bands: List[str]
    shape: List[int]
    crs: str
    bounds: Dict[str, float]
    statistics: Dict[str, Dict[str, float]]
    data_preview: Optional[Dict[str, List[List[float]]]] = None


class GeoChronoslProfileRequest(BaseModel):
    x: float = Field(..., description="X coordinate (UTM Easting or Lon)")
    y: float = Field(..., description="Y coordinate (UTM Northing or Lat)")
    crs: str = Field(default="EPSG:32644")
    year: int = Field(default=2026)


class GeoChronoslProfileResponse(BaseModel):
    year: int
    x: float
    y: float
    crs: str
    spectral_profile: Dict[str, float]


class TemporalProfileRequest(BaseModel):
    x: float = Field(..., description="X coordinate (UTM Easting or Lon)")
    y: float = Field(..., description="Y coordinate (UTM Northing or Lat)")
    crs: str = Field(default="EPSG:32644")
    band: str = Field(default="nir")


class TemporalProfileResponse(BaseModel):
    band: str
    x: float
    y: float
    crs: str
    temporal_profile: Dict[int, float]
