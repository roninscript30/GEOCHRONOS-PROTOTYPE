from __future__ import annotations

from typing import Any, Dict, List, Optional
from geochronos_engine.analysis import process_query
from geochronos_engine.models import CompleteAnalysisResponse

from ..adapters.zarr_store import ZarrDataStore
from ..adapters.stac_store import STACCatalogStore
from ..adapters.feature_store import GeoPackageFeatureStore
from ..adapters.vector_store import QdrantVectorStore
from ..adapters.raster_store import RasterEvidenceResolver
from ..adapters.omniroute_client import LocalOmniRouteClient
from ..schemas.query import QueryResponse, StructuredQuerySchema
from ..schemas.common import GeoJSONFeature, GeoJSONFeatureCollection
from ..utils.geo import utm_to_wgs84_geometry


class QueryService:
    def __init__(
        self,
        zarr_store: ZarrDataStore,
        stac_store: STACCatalogStore,
        feature_store: GeoPackageFeatureStore,
        vector_store: QdrantVectorStore,
        raster_store: RasterEvidenceResolver,
        omniroute_client: LocalOmniRouteClient,
    ) -> None:
        self.zarr_store = zarr_store
        self.stac_store = stac_store
        self.feature_store = feature_store
        self.vector_store = vector_store
        self.raster_store = raster_store
        self.omniroute_client = omniroute_client

    def execute_query(
        self,
        query: str,
        limit: int = 8,
        include_geojson: bool = True,
        use_llm: bool = True,
    ) -> QueryResponse:
        import re
        client = self.omniroute_client if use_llm else None
        normalized_q = re.sub(r"\bwater bodies\b", "water body", query, flags=re.IGNORECASE)
        normalized_q = re.sub(r"\burban areas\b", "urban area", normalized_q, flags=re.IGNORECASE)

        response: CompleteAnalysisResponse = process_query(
            query=normalized_q,
            client=client,
            vector_store=self.vector_store,
            feature_store=self.feature_store,
            stac_store=self.stac_store,
            zarr_store=self.zarr_store,
            raster_evidence_store=self.raster_store,
        )

        analysis = response.analysis_result
        structured = response.structured_query

        # Construct GeoJSON if requested
        geojson = None
        answer_text = response.answer
        results_count = len(analysis.results)

        if structured.intent == "feature_search" and not analysis.results:
            search_filters = {}
            if structured.feature_class:
                search_filters["feature_class"] = structured.feature_class
            if structured.reference_year:
                search_filters["year"] = structured.reference_year
            elif structured.start_year:
                search_filters["year"] = structured.start_year

            search_records = self.feature_store.get_features(limit=limit, **search_filters)
            if search_records:
                results_count = len(search_records)
                fclass_name = (structured.feature_class or "feature").replace("_", " ").title()
                year_info = f" ({structured.reference_year or structured.start_year})" if (structured.reference_year or structured.start_year) else ""
                answer_text = f"Found {len(search_records)} {fclass_name} feature(s){year_info} in Chennai from high-resolution satellite observation catalog."
                if include_geojson:
                    features_list = []
                    for rec in search_records:
                        wgs_geom = utm_to_wgs84_geometry(rec.geometry)
                        features_list.append(
                            GeoJSONFeature(
                                type="Feature",
                                geometry=wgs_geom,
                                properties={
                                    "feature_id": rec.feature_id,
                                    "feature_class": rec.feature_class,
                                    "year": rec.year,
                                    "observation_id": rec.observation_id,
                                    "confidence": rec.confidence,
                                    "area_m2": rec.attributes.get("area_m2"),
                                },
                                id=rec.feature_id,
                            )
                        )
                    geojson = GeoJSONFeatureCollection(
                        type="FeatureCollection",
                        features=features_list,
                        total_features=len(features_list),
                    )
        elif include_geojson:
            features_list: List[GeoJSONFeature] = []
            for item in analysis.results:
                wgs_geom = utm_to_wgs84_geometry(item.geometry)
                feat = GeoJSONFeature(
                    type="Feature",
                    geometry=wgs_geom,
                    properties={
                        "feature_id": item.feature_id,
                        "feature_class": item.feature_class,
                        "status": item.status,
                        "from_year": item.from_year,
                        "to_year": item.to_year,
                        "confidence": item.confidence,
                        "metrics": item.metrics,
                    },
                    id=item.feature_id,
                )
                features_list.append(feat)

            geojson = GeoJSONFeatureCollection(
                type="FeatureCollection",
                features=features_list,
                total_features=len(features_list),
            )

        structured_schema = StructuredQuerySchema(
            intent=structured.intent,
            feature_class=structured.feature_class,
            location=structured.location,
            semantic_query=structured.semantic_query,
            start_year=structured.start_year,
            end_year=structured.end_year,
            reference_year=structured.reference_year,
            operation=structured.operation,
            filters=structured.filters,
            limit=structured.limit,
        )

        llm_gen = getattr(self.omniroute_client, "last_synthesis_llm", False) if use_llm else False
        synthesis_mode = "llm_generated" if llm_gen else "deterministic_grounded"

        return QueryResponse(
            query=query,
            structured_query=structured_schema,
            answer=answer_text,
            synthesis_mode=synthesis_mode,
            llm_generated=llm_gen,
            summary_statistics=analysis.summary_statistics,
            limitations=analysis.limitations,
            provenance=analysis.provenance,
            geojson=geojson,
            results_count=results_count,
        )
