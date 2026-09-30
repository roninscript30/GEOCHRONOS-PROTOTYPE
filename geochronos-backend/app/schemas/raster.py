from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RasterCompositeRequest(BaseModel):
    year: int = Field(default=2026, description="Observation epoch (2011, 2015, 2020, 2026)")
    min_x: float = Field(..., description="Min X (UTM Easting or Lon if crs=EPSG:4326)")
    min_y: float = Field(..., description="Min Y (UTM Northing or Lat if crs=EPSG:4326)")
    max_x: float = Field(..., description="Max X (UTM Easting or Lon if crs=EPSG:4326)")
    max_y: float = Field(..., description="Max Y (UTM Northing or Lat if crs=EPSG:4326)")
    crs: str = Field(default="EPSG:32644", description="Input CRS ('EPSG:32644' or 'EPSG:4326')")
    mode: str = Field(
        default="natural_color",
        description="Composite mode: natural_color (RGB), cir (Color Infrared), swir (SWIR composite), single (Single Band), ndvi, ndmi, ndbi"
    )
    band: Optional[str] = Field(default="nir", description="Target band if mode is 'single'")
    min_percentile: float = Field(default=2.0, ge=0.0, le=50.0)
    max_percentile: float = Field(default=98.0, ge=50.0, le=100.0)
    gamma: float = Field(default=1.0, ge=0.1, le=3.0)
    max_dim: int = Field(default=512, ge=32, le=1024)


class RasterCompositeResponse(BaseModel):
    year: int
    mode: str
    bounds_utm: Dict[str, float]
    bounds_wgs84: Dict[str, float]
    crs: str
    shape: List[int]
    image_base64: str
    statistics: Dict[str, Dict[str, float]]
    observation: Dict[str, Any]


class RasterDifferenceRequest(BaseModel):
    from_year: int = Field(default=2011)
    to_year: int = Field(default=2026)
    min_x: float
    min_y: float
    max_x: float
    max_y: float
    crs: str = Field(default="EPSG:32644")
    mode: str = Field(default="ndvi_diff", description="Difference mode: 'ndvi_diff', 'nir_diff', 'band_diff'")
    band: Optional[str] = Field(default="nir")
    threshold: float = Field(default=0.1, ge=0.01, le=1.0)
    max_dim: int = Field(default=512, ge=32, le=1024)


class RasterDifferenceResponse(BaseModel):
    from_year: int
    to_year: int
    mode: str
    bounds_utm: Dict[str, float]
    bounds_wgs84: Dict[str, float]
    crs: str
    shape: List[int]
    image_base64: str
    change_statistics: Dict[str, Any]
    from_observation: Dict[str, Any]
    to_observation: Dict[str, Any]


class FeatureCropRequest(BaseModel):
    feature_id: str
    padding_meters: float = Field(default=150.0, ge=20.0, le=1000.0)
    mode: str = Field(default="natural_color")
    max_dim: int = Field(default=256, ge=32, le=512)


class EpochCropItem(BaseModel):
    year: int
    observation: Dict[str, Any]
    image_base64: str
    bounds_utm: Dict[str, float]
    bounds_wgs84: Dict[str, float]
    statistics: Dict[str, Any]


class FeatureCropResponse(BaseModel):
    feature_id: str
    feature_class: str
    area_m2: Optional[float] = None
    confidence: Optional[float] = None
    crops: Dict[str, EpochCropItem]
    geometry_wgs84: Optional[Dict[str, Any]] = None


class VoxelWindowRequest(BaseModel):
    axis_mode: str = Field(default="time_y_x", description="'time_y_x' (Z is time) or 'band_y_x' (Z is band)")
    selected_band: str = Field(default="nir")
    selected_year: int = Field(default=2026)
    min_x: float
    min_y: float
    max_x: float
    max_y: float
    crs: str = Field(default="EPSG:32644")
    spatial_dim: int = Field(default=48, ge=16, le=128)


class VoxelWindowResponse(BaseModel):
    axis_mode: str
    fixed_value: str
    z_labels: List[str]
    shape: List[int]
    bounds_utm: Dict[str, float]
    bounds_wgs84: Dict[str, float]
    voxel_data: List[List[List[float]]]
    min_val: float
    max_val: float
    mean_val: float

