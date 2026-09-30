from __future__ import annotations

from typing import Any, Dict
from shapely.geometry import shape

from geochronos_engine.models import FeatureRecord
from .stac_store import STACCatalogStore
from .zarr_store import ZarrDataStore


class RasterEvidenceResolver:
    def __init__(self, stac_store: STACCatalogStore, zarr_store: ZarrDataStore) -> None:
        self.stac_store = stac_store
        self.zarr_store = zarr_store

    def resolve_source(self, feature: FeatureRecord) -> Dict[str, Any]:
        item = self.stac_store.get_item(feature.source_item_id or feature.observation_id)
        assets = item.get("assets", {})
        bands = {}
        for b in ("blue", "green", "red", "nir", "swir1", "swir2"):
            if b in assets:
                bands[b] = assets[b].get("href")

        return {
            "source_item_id": feature.source_item_id,
            "observation_id": feature.observation_id,
            "datetime": item.get("properties", {}).get("datetime"),
            "platform": item.get("properties", {}).get("platform"),
            "sensor": item.get("properties", {}).get("instruments", ["MSI"])[0] if item.get("properties", {}).get("instruments") else "MSI",
            "available_bands": list(assets.keys()),
            "band_assets": bands,
        }

    def resolve_spatial_evidence(self, feature: FeatureRecord) -> Dict[str, Any]:
        geom = shape(feature.geometry)
        minx, miny, maxx, maxy = geom.bounds
        zarr_window = self.zarr_store.read_spatial_window(feature)

        return {
            "feature_id": feature.feature_id,
            "geometry_type": feature.geometry.get("type", "Polygon"),
            "utm_bounds": {"min_x": minx, "min_y": miny, "max_x": maxx, "max_y": maxy},
            "centroid": {"x": geom.centroid.x, "y": geom.centroid.y},
            "area_m2": feature.attributes.get("area_m2", geom.area),
            "zarr_window": zarr_window,
        }
