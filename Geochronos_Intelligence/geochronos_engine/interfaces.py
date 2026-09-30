from __future__ import annotations

from typing import Any, Protocol

from .models import FeatureRecord


class VectorStore(Protocol):
    def semantic_search(
        self,
        query_embedding: list[float],
        *,
        top_k: int,
        filters: dict[str, Any] | None = None,
    ) -> list[tuple[FeatureRecord, float]]:
        ...

    def filter(self, **filters: Any) -> list[FeatureRecord]:
        ...

    def get_by_feature_id(self, feature_id: str) -> FeatureRecord | None:
        ...


class FeatureStore(Protocol):
    def get_feature(self, feature_id: str) -> FeatureRecord | None:
        ...

    def get_features(self, **filters: Any) -> list[FeatureRecord]:
        ...

    def get_features_by_observation(self, observation_id: str) -> list[FeatureRecord]:
        ...


class STACStore(Protocol):
    def get_item(self, source_item_id: str) -> dict[str, Any]:
        ...

    def get_observation(self, observation_id: str) -> dict[str, Any]:
        ...

    def resolve_asset(self, source_item_id: str, asset_name: str) -> dict[str, Any]:
        ...


class ZarrStore(Protocol):
    def get_time_index(self, observation_id: str) -> int:
        ...

    def read_spatial_window(self, feature: FeatureRecord) -> dict[str, Any]:
        ...

    def read_feature_window(self, feature: FeatureRecord) -> dict[str, Any]:
        ...

    def read_bands(self, feature: FeatureRecord) -> dict[str, float]:
        ...


class RasterEvidenceStore(Protocol):
    def resolve_source(self, feature: FeatureRecord) -> dict[str, Any]:
        ...

    def resolve_spatial_evidence(self, feature: FeatureRecord) -> dict[str, Any]:
        ...


class QueryInterpreter(Protocol):
    def interpret_query(self, query: str) -> dict[str, Any]:
        ...

    def generate_answer(self, prompt: str) -> str:
        ...
