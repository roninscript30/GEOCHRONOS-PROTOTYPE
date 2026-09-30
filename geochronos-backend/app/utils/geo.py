from __future__ import annotations

from typing import Any, Dict, List, Tuple
from pyproj import Transformer
from shapely.geometry import mapping, shape
from shapely.ops import transform

# Transformer from EPSG:32644 (UTM 44N) to EPSG:4326 (WGS84 lat/lon)
_transformer_to_4326 = Transformer.from_crs("EPSG:32644", "EPSG:4326", always_xy=True)
_transformer_to_32644 = Transformer.from_crs("EPSG:4326", "EPSG:32644", always_xy=True)


def utm_to_wgs84_geometry(geom_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a GeoJSON-like geometry dict from EPSG:32644 to EPSG:4326."""
    try:
        s = shape(geom_dict)
        transformed = transform(_transformer_to_4326.transform, s)
        return mapping(transformed)
    except Exception:
        return geom_dict


def wgs84_to_utm_geometry(geom_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a GeoJSON-like geometry dict from EPSG:4326 to EPSG:32644."""
    try:
        s = shape(geom_dict)
        transformed = transform(_transformer_to_32644.transform, s)
        return mapping(transformed)
    except Exception:
        return geom_dict


def utm_bounds_to_wgs84(left: float, bottom: float, right: float, top: float) -> Tuple[float, float, float, float]:
    """Convert bounding box coordinates from EPSG:32644 to EPSG:4326 (min_lon, min_lat, max_lon, max_lat)."""
    min_lon, min_lat = _transformer_to_4326.transform(left, bottom)
    max_lon, max_lat = _transformer_to_4326.transform(right, top)
    return min_lon, min_lat, max_lon, max_lat


def wgs84_bounds_to_utm(min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> Tuple[float, float, float, float]:
    """Convert bounding box coordinates from EPSG:4326 to EPSG:32644 (left, bottom, right, top)."""
    left, bottom = _transformer_to_32644.transform(min_lon, min_lat)
    right, top = _transformer_to_32644.transform(max_lon, max_lat)
    return left, bottom, right, top
