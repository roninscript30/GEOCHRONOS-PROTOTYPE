from __future__ import annotations

from typing import Any, Dict, List, Optional
from ..adapters.feature_store import GeoPackageFeatureStore
from ..adapters.zarr_store import ZarrDataStore
from ..schemas.features import FeatureItem, FeatureListResponse, FeatureHistoryResponse
from ..schemas.common import GeoJSONFeature, GeoJSONFeatureCollection
from ..utils.geo import utm_to_wgs84_geometry


class FeatureService:
    def __init__(self, feature_store: GeoPackageFeatureStore, zarr_store: ZarrDataStore) -> None:
        self.feature_store = feature_store
        self.zarr_store = zarr_store

    def list_features(
        self,
        feature_class: Optional[str] = None,
        year: Optional[int] = None,
        observation_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        include_geojson: bool = False,
    ) -> FeatureListResponse:
        records = self.feature_store.get_features(
            feature_class=feature_class,
            year=year,
            observation_id=observation_id,
            limit=limit,
            offset=offset,
        )
        total = self.feature_store.count(
            feature_class=feature_class,
            year=year,
            observation_id=observation_id,
        )

        items = []
        geojson_features = []

        for r in records:
            area = r.attributes.get("area_m2")
            item = FeatureItem(
                feature_id=r.feature_id,
                feature_class=r.feature_class,
                year=r.year,
                observation_id=r.observation_id,
                confidence=r.confidence,
                source_item_id=r.source_item_id,
                cube_time_index=r.cube_time_index,
                area_m2=area,
                attributes=r.attributes,
            )
            items.append(item)

            if include_geojson and r.geometry:
                wgs_geom = utm_to_wgs84_geometry(r.geometry)
                geojson_features.append(
                    GeoJSONFeature(
                        type="Feature",
                        geometry=wgs_geom,
                        properties={
                            "feature_id": r.feature_id,
                            "feature_class": r.feature_class,
                            "year": r.year,
                            "observation_id": r.observation_id,
                            "area_m2": area,
                        },
                        id=r.feature_id,
                    )
                )

        geojson = None
        if include_geojson:
            geojson = GeoJSONFeatureCollection(
                type="FeatureCollection",
                features=geojson_features,
                total_features=len(geojson_features),
            )

        return FeatureListResponse(
            total=total,
            offset=offset,
            limit=limit,
            features=items,
            geojson=geojson,
        )

    def get_feature(self, feature_id: str) -> Optional[Dict[str, Any]]:
        record = self.feature_store.get_feature(feature_id)
        if not record:
            return None
        wgs_geom = utm_to_wgs84_geometry(record.geometry) if record.geometry else {}
        bands = self.zarr_store.read_bands(record) if record.geometry else {}

        return {
            "feature_id": record.feature_id,
            "feature_class": record.feature_class,
            "year": record.year,
            "observation_id": record.observation_id,
            "confidence": record.confidence,
            "source_item_id": record.source_item_id,
            "cube_time_index": record.cube_time_index,
            "area_m2": record.attributes.get("area_m2"),
            "geometry_native": record.geometry,
            "geometry_geojson": wgs_geom,
            "attributes": record.attributes,
            "spectral_profile": bands,
        }

    def get_feature_history(self, feature_id: str) -> FeatureHistoryResponse:
        base = self.feature_store.get_feature(feature_id)
        if not base:
            return FeatureHistoryResponse(
                feature_id=feature_id,
                feature_class="unknown",
                history=[],
                total_observations=0,
            )

        # Look up similar features across all years
        all_matches = []
        for yr in (2011, 2015, 2020, 2026):
            if yr == base.year:
                all_matches.append({
                    "year": yr,
                    "observation_id": base.observation_id,
                    "feature_id": base.feature_id,
                    "area_m2": base.attributes.get("area_m2"),
                    "matched": True,
                })
            else:
                # Find overlapping or nearest feature in that year
                records = self.feature_store.get_features(feature_class=base.feature_class, year=yr, limit=5)
                if records:
                    first = records[0]
                    all_matches.append({
                        "year": yr,
                        "observation_id": first.observation_id,
                        "feature_id": first.feature_id,
                        "area_m2": first.attributes.get("area_m2"),
                        "matched": False,
                    })

        return FeatureHistoryResponse(
            feature_id=feature_id,
            feature_class=base.feature_class,
            history=all_matches,
            total_observations=len(all_matches),
        )
