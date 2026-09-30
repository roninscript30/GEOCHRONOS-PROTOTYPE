from __future__ import annotations

from typing import Any, Dict, List, Optional
from geochronos_engine.temporal import analyze_temporal_change
from geochronos_engine.models import StructuredQuery

from ..adapters.feature_store import GeoPackageFeatureStore
from ..adapters.stac_store import STACCatalogStore
from ..adapters.zarr_store import ZarrDataStore
from ..adapters.raster_store import RasterEvidenceResolver
from ..schemas.temporal import TemporalAnalysisResponse
from ..schemas.common import GeoJSONFeature, GeoJSONFeatureCollection
from ..utils.geo import utm_to_wgs84_geometry


class TemporalService:
    def __init__(
        self,
        feature_store: GeoPackageFeatureStore,
        stac_store: STACCatalogStore,
        zarr_store: ZarrDataStore,
        raster_store: RasterEvidenceResolver,
    ) -> None:
        self.feature_store = feature_store
        self.stac_store = stac_store
        self.zarr_store = zarr_store
        self.raster_store = raster_store

    def analyze(
        self,
        feature_class: Optional[str] = "water_body",
        from_year: int = 2011,
        to_year: int = 2026,
        intent: str = "feature_change",
        limit: int = 20,
    ) -> TemporalAnalysisResponse:
        structured = StructuredQuery(
            intent=intent,
            feature_class=feature_class,
            start_year=from_year,
            end_year=to_year,
            limit=limit,
        )

        cands_from = self.feature_store.get_features(
            feature_class=feature_class,
            year=from_year,
            limit=limit,
        )
        cands_to = self.feature_store.get_features(
            feature_class=feature_class,
            year=to_year,
            limit=limit,
        )
        candidates = cands_from + cands_to

        analysis = analyze_temporal_change(
            structured,
            candidates,
            feature_store=self.feature_store,
            stac_store=self.stac_store,
            zarr_store=self.zarr_store,
            raster_evidence_store=self.raster_store,
        )

        features_list = []
        raw_items = []
        for item in analysis.results:
            wgs_geom = utm_to_wgs84_geometry(item.geometry)
            raw_items.append({
                "feature_id": item.feature_id,
                "feature_class": item.feature_class,
                "status": item.status,
                "from_year": item.from_year,
                "to_year": item.to_year,
                "confidence": item.confidence,
                "metrics": item.metrics,
            })
            features_list.append(
                GeoJSONFeature(
                    type="Feature",
                    geometry=wgs_geom,
                    properties={
                        "feature_id": item.feature_id,
                        "feature_class": item.feature_class,
                        "status": item.status,
                        "from_year": item.from_year,
                        "to_year": item.to_year,
                        "metrics": item.metrics,
                    },
                    id=item.feature_id,
                )
            )

        geojson = GeoJSONFeatureCollection(
            type="FeatureCollection",
            features=features_list,
            total_features=len(features_list),
        )

        return TemporalAnalysisResponse(
            from_year=from_year,
            to_year=to_year,
            intent=intent,
            summary_statistics=analysis.summary_statistics,
            limitations=analysis.limitations,
            results_count=len(raw_items),
            results=raw_items,
            geojson=geojson,
            provenance=analysis.provenance,
        )

    def compare_classes(
        self,
        from_year: int = 2011,
        to_year: int = 2026,
        feature_classes: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        classes = feature_classes or ["water_body", "vegetation", "urban_area", "building"]
        comparison = {}

        for fc in classes:
            count_from = self.feature_store.count(feature_class=fc, year=from_year)
            count_to = self.feature_store.count(feature_class=fc, year=to_year)
            net_change = count_to - count_from
            pct_change = (net_change / count_from * 100.0) if count_from > 0 else 0.0

            comparison[fc] = {
                f"count_{from_year}": count_from,
                f"count_{to_year}": count_to,
                "net_count_change": net_change,
                "percentage_change": round(pct_change, 2),
            }

        return {
            "from_year": from_year,
            "to_year": to_year,
            "class_transitions": comparison,
        }
