from __future__ import annotations

from .adapters import MockEnvironment, build_mock_environment
from .answering import build_complete_response
from .interfaces import FeatureStore, QueryInterpreter, RasterEvidenceStore, STACStore, VectorStore, ZarrStore
from .query_parser import parse_query
from .retrieval import search_features
from .temporal import analyze_temporal_change


def process_query(
    query: str,
    *,
    client: QueryInterpreter | None = None,
    vector_store: VectorStore | None = None,
    feature_store: FeatureStore | None = None,
    stac_store: STACStore | None = None,
    zarr_store: ZarrStore | None = None,
    raster_evidence_store: RasterEvidenceStore | None = None,
) -> object:
    environment: MockEnvironment | None = None
    if vector_store is None or feature_store is None or stac_store is None or zarr_store is None or raster_evidence_store is None:
        environment = build_mock_environment()
        vector_store = vector_store or environment.vector_store
        feature_store = feature_store or environment.feature_store
        stac_store = stac_store or environment.stac_store
        zarr_store = zarr_store or environment.zarr_store
        raster_evidence_store = raster_evidence_store or environment.raster_evidence_store

    structured_query = parse_query(query, client=client)
    search_result = search_features(
        structured_query,
        vector_store=vector_store,
        feature_store=feature_store,
        top_k=structured_query.limit or 8,
    )
    retrieved_features = [hit.feature for hit in search_result.hits]
    analysis_result = analyze_temporal_change(
        structured_query,
        retrieved_features,
        feature_store=feature_store,
        stac_store=stac_store,
        zarr_store=zarr_store,
        raster_evidence_store=raster_evidence_store,
    )
    return build_complete_response(query, structured_query, analysis_result, client=client)
