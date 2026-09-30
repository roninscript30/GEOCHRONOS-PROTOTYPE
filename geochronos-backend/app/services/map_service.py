from __future__ import annotations

import re
from typing import Any, Dict, List, Optional
from ..adapters.feature_store import GeoPackageFeatureStore
from ..adapters.zarr_store import ZarrDataStore
from ..schemas.map import MapBoundsResponse
from ..schemas.common import GeoJSONFeature, GeoJSONFeatureCollection
from ..utils.geo import utm_bounds_to_wgs84, utm_to_wgs84_geometry, wgs84_bounds_to_utm

CLASS_COLORS = {
    "water_body": "#0077be",
    "vegetation": "#2e7d32",
    "urban_area": "#c2185b",
    "building": "#f57c00",
    "river": "#0288d1",
    "road": "#616161",
}


def _parse_year_from_val(val: Any) -> int:
    m = re.search(r"\b(20\d{2})\b", str(val))
    if m:
        return int(m.group(1))
    try:
        return int(val)
    except Exception:
        return 2026


class MapService:
    def __init__(self, feature_store: GeoPackageFeatureStore, zarr_store: ZarrDataStore) -> None:
        self.feature_store = feature_store
        self.zarr_store = zarr_store

    def get_map_bounds(self) -> MapBoundsResponse:
        info = self.zarr_store.get_info()
        b_native = info["bounds"]
        left = b_native["left"]
        bottom = b_native["bottom"]
        right = b_native["right"]
        top = b_native["top"]

        min_lon, min_lat, max_lon, max_lat = utm_bounds_to_wgs84(left, bottom, right, top)
        center_lon = (min_lon + max_lon) / 2.0
        center_lat = (min_lat + max_lat) / 2.0

        raw_times = info["coordinates"].get("time", [2011, 2015, 2020, 2026])
        time_vals = [_parse_year_from_val(t) for t in raw_times]
        canonical_bands = [str(b) for b in info["coordinates"].get("band", ["blue", "green", "red", "nir", "swir1", "swir2"])]

        return MapBoundsResponse(
            crs_native=info["crs"],
            bounds_native=b_native,
            crs_display="EPSG:4326",
            bounds_display={"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat},
            center_display={"lon": center_lon, "lat": center_lat},
            resolution_m=info["resolution_m"],
            time_values=time_vals,
            canonical_bands=canonical_bands,
        )

    def get_features_geojson(
        self,
        feature_class: Optional[str] = None,
        year: Optional[int] = 2026,
        bbox_wgs84: Optional[List[float]] = None,
        limit: int = 200,
    ) -> GeoJSONFeatureCollection:
        bbox_utm = None
        if bbox_wgs84 and len(bbox_wgs84) == 4:
            bbox_utm = wgs84_bounds_to_utm(*bbox_wgs84)

        records = self.feature_store.get_features(
            feature_class=feature_class,
            year=year,
            bbox=bbox_utm,
            limit=limit,
        )

        geojson_features = []
        for r in records:
            if not r.geometry:
                continue
            wgs_geom = utm_to_wgs84_geometry(r.geometry)
            color = CLASS_COLORS.get(r.feature_class, "#9e9e9e")
            geojson_features.append(
                GeoJSONFeature(
                    type="Feature",
                    geometry=wgs_geom,
                    properties={
                        "feature_id": r.feature_id,
                        "feature_class": r.feature_class,
                        "year": r.year,
                        "observation_id": r.observation_id,
                        "area_m2": r.attributes.get("area_m2"),
                        "confidence": r.confidence,
                        "color": color,
                    },
                    id=r.feature_id,
                )
            )

        return GeoJSONFeatureCollection(
            type="FeatureCollection",
            features=geojson_features,
            total_features=len(geojson_features),
        )

    def get_feature_geojson(self, feature_id: str) -> Optional[GeoJSONFeature]:
        r = self.feature_store.get_feature(feature_id)
        if not r or not r.geometry:
            return None
        wgs_geom = utm_to_wgs84_geometry(r.geometry)
        color = CLASS_COLORS.get(r.feature_class, "#9e9e9e")
        return GeoJSONFeature(
            type="Feature",
            geometry=wgs_geom,
            properties={
                "feature_id": r.feature_id,
                "feature_class": r.feature_class,
                "year": r.year,
                "observation_id": r.observation_id,
                "area_m2": r.attributes.get("area_m2"),
                "confidence": r.confidence,
                "color": color,
            },
            id=r.feature_id,
        )
