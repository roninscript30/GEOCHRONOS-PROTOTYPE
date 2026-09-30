from __future__ import annotations

from dataclasses import dataclass

from .adapters import MockEnvironment, build_mock_environment
from .interfaces import FeatureStore, VectorStore
from .models import FeatureSearchResult, SearchHit, StructuredQuery
from .utils import generate_embedding


@dataclass(slots=True)
class RetrievalContext:
    vector_store: VectorStore
    feature_store: FeatureStore


def search_features(
    structured_query: StructuredQuery,
    *,
    vector_store: VectorStore | None = None,
    feature_store: FeatureStore | None = None,
    top_k: int = 8,
) -> FeatureSearchResult:
    environment: MockEnvironment | None = None
    if vector_store is None or feature_store is None:
        environment = build_mock_environment()
        vector_store = vector_store or environment.vector_store
        feature_store = feature_store or environment.feature_store

    search_text = " ".join(
        value
        for value in (
            structured_query.semantic_query,
            structured_query.location,
            structured_query.feature_class,
            structured_query.intent,
        )
        if value
    )
    filters = dict(structured_query.filters)
    if structured_query.feature_class:
        filters.setdefault("feature_class", structured_query.feature_class)
    if structured_query.location:
        filters.setdefault("location", structured_query.location)
    if structured_query.start_year is not None and structured_query.end_year is not None:
        filters.setdefault("years", [structured_query.start_year, structured_query.end_year])
    elif structured_query.reference_year is not None:
        filters.setdefault("year", structured_query.reference_year)

    query_embedding = generate_embedding(search_text)
    hits = vector_store.semantic_search(query_embedding, top_k=top_k if structured_query.limit is None else structured_query.limit, filters=filters)
    return FeatureSearchResult(query=structured_query, hits=[SearchHit(feature=feature, score=score) for feature, score in hits])
