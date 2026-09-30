from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .interfaces import FeatureStore, RasterEvidenceStore, STACStore, VectorStore, ZarrStore
from .models import FeatureRecord
from .utils import cosine_similarity, generate_embedding, normalize_text


@dataclass(slots=True)
class MockEnvironment:
    vector_store: "MockVectorStore"
    feature_store: "MockFeatureStore"
    stac_store: "MockSTACStore"
    zarr_store: "MockZarrStore"
    raster_evidence_store: "MockRasterEvidenceStore"


class MockVectorStore:
    def __init__(self, features: list[FeatureRecord]) -> None:
        self._features = list(features)

    def semantic_search(
        self,
        query_embedding: list[float],
        *,
        top_k: int,
        filters: dict[str, Any] | None = None,
    ) -> list[tuple[FeatureRecord, float]]:
        candidates = self.filter(**(filters or {}))
        scored = [
            (feature, cosine_similarity(query_embedding, generate_embedding(feature.semantic_text or feature.feature_id)))
            for feature in candidates
        ]
        return sorted(scored, key=lambda item: item[1], reverse=True)[:top_k]

    def filter(self, **filters: Any) -> list[FeatureRecord]:
        results = list(self._features)
        for key, value in filters.items():
            if value is None:
                continue
            if key == "feature_class":
                results = [feature for feature in results if feature.feature_class == value]
            elif key == "year":
                results = [feature for feature in results if feature.year == value]
            elif key == "years":
                allowed = set(value)
                results = [feature for feature in results if feature.year in allowed]
            elif key == "observation_id":
                results = [feature for feature in results if feature.observation_id == value]
            elif key == "location":
                needle = normalize_text(str(value))
                results = [
                    feature
                    for feature in results
                    if needle in normalize_text(feature.semantic_text)
                    or needle in normalize_text(str(feature.attributes.get("location", "")))
                ]
            elif key == "feature_id":
                results = [feature for feature in results if feature.feature_id == value]
        return results

    def get_by_feature_id(self, feature_id: str) -> FeatureRecord | None:
        for feature in self._features:
            if feature.feature_id == feature_id:
                return feature
        return None


class MockFeatureStore:
    def __init__(self, features: list[FeatureRecord]) -> None:
        self._features = list(features)

    def get_feature(self, feature_id: str) -> FeatureRecord | None:
        for feature in self._features:
            if feature.feature_id == feature_id:
                return feature
        return None

    def get_features(self, **filters: Any) -> list[FeatureRecord]:
        return MockVectorStore(self._features).filter(**filters)

    def get_features_by_observation(self, observation_id: str) -> list[FeatureRecord]:
        return [feature for feature in self._features if feature.observation_id == observation_id]


class MockSTACStore:
    def __init__(self, observations: dict[str, dict[str, Any]]) -> None:
        self._observations = observations

    def get_item(self, source_item_id: str) -> dict[str, Any]:
        for observation in self._observations.values():
            for item in observation.get("items", []):
                if item["id"] == source_item_id:
                    return item
        return {"id": source_item_id, "assets": {}}

    def get_observation(self, observation_id: str) -> dict[str, Any]:
        return self._observations.get(observation_id, {"id": observation_id, "items": []})

    def resolve_asset(self, source_item_id: str, asset_name: str) -> dict[str, Any]:
        item = self.get_item(source_item_id)
        return item.get("assets", {}).get(asset_name, {"href": f"mock://{source_item_id}/{asset_name}"})


class MockZarrStore:
    def __init__(self, time_indexes: dict[str, int]) -> None:
        self._time_indexes = time_indexes

    def get_time_index(self, observation_id: str) -> int:
        return self._time_indexes[observation_id]

    def read_spatial_window(self, feature: FeatureRecord) -> dict[str, Any]:
        return {"feature_id": feature.feature_id, "geometry": feature.geometry, "shape": "mock-window"}

    def read_feature_window(self, feature: FeatureRecord) -> dict[str, Any]:
        return {"feature_id": feature.feature_id, "bands": feature.attributes.get("bands", {})}

    def read_bands(self, feature: FeatureRecord) -> dict[str, float]:
        return dict(feature.attributes.get("bands", {}))


class MockRasterEvidenceStore:
    def resolve_source(self, feature: FeatureRecord) -> dict[str, Any]:
        return {
            "feature_id": feature.feature_id,
            "source_item_id": feature.source_item_id,
            "raster_href": f"mock://raster/{feature.source_item_id}",
        }

    def resolve_spatial_evidence(self, feature: FeatureRecord) -> dict[str, Any]:
        return {
            "feature_id": feature.feature_id,
            "geometry": feature.geometry,
            "observation_id": feature.observation_id,
        }


def build_mock_environment() -> MockEnvironment:
    features = [
        FeatureRecord(
            feature_id="building_2011_001",
            feature_class="building",
            year=2011,
            geometry={"min_x": 0, "min_y": 0, "max_x": 10, "max_y": 10},
            observation_id="obs-2011-chennai",
            confidence=0.96,
            source_item_id="stac-2011-001",
            cube_time_index=0,
            semantic_text="Chennai building heritage block",
            attributes={
                "location": "Chennai",
                "bands": {"red": 0.21, "green": 0.31, "nir": 0.41},
            },
        ),
        FeatureRecord(
            feature_id="building_2015_001",
            feature_class="building",
            year=2015,
            geometry={"min_x": 0.5, "min_y": 0.5, "max_x": 10.5, "max_y": 10.5},
            observation_id="obs-2015-chennai",
            confidence=0.95,
            source_item_id="stac-2015-001",
            cube_time_index=1,
            semantic_text="Chennai building heritage block expanded",
            attributes={
                "location": "Chennai",
                "bands": {"red": 0.22, "green": 0.32, "nir": 0.43},
            },
        ),
        FeatureRecord(
            feature_id="building_2020_001",
            feature_class="building",
            year=2020,
            geometry={"min_x": 1.0, "min_y": 1.0, "max_x": 11.0, "max_y": 11.0},
            observation_id="obs-2020-chennai",
            confidence=0.94,
            source_item_id="stac-2020-001",
            cube_time_index=2,
            semantic_text="Chennai building mixed use core",
            attributes={
                "location": "Chennai",
                "bands": {"red": 0.24, "green": 0.34, "nir": 0.45},
            },
        ),
        FeatureRecord(
            feature_id="building_2020_002",
            feature_class="building",
            year=2020,
            geometry={"min_x": 20, "min_y": 0, "max_x": 30, "max_y": 10},
            observation_id="obs-2020-chennai",
            confidence=0.91,
            source_item_id="stac-2020-002",
            cube_time_index=2,
            semantic_text="Chennai building industrial block",
            attributes={
                "location": "Chennai",
                "bands": {"red": 0.30, "green": 0.28, "nir": 0.37},
            },
        ),
        FeatureRecord(
            feature_id="building_2026_001",
            feature_class="building",
            year=2026,
            geometry={"min_x": 40, "min_y": 0, "max_x": 50, "max_y": 10},
            observation_id="obs-2026-chennai",
            confidence=0.93,
            source_item_id="stac-2026-001",
            cube_time_index=3,
            semantic_text="Chennai building new transit block",
            attributes={
                "location": "Chennai",
                "bands": {"red": 0.18, "green": 0.27, "nir": 0.51},
            },
        ),
        FeatureRecord(
            feature_id="building_2026_002",
            feature_class="building",
            year=2026,
            geometry={"min_x": 1.5, "min_y": 1.5, "max_x": 12.0, "max_y": 12.0},
            observation_id="obs-2026-chennai",
            confidence=0.92,
            source_item_id="stac-2026-002",
            cube_time_index=3,
            semantic_text="Chennai building mixed use core",
            attributes={
                "location": "Chennai",
                "bands": {"red": 0.25, "green": 0.35, "nir": 0.47},
            },
        ),
    ]
    observations = {
        "obs-2011-chennai": {"id": "obs-2011-chennai", "items": [{"id": "stac-2011-001", "assets": {"raster": {"href": "mock://stac-2011-001/raster"}}}]},
        "obs-2015-chennai": {"id": "obs-2015-chennai", "items": [{"id": "stac-2015-001", "assets": {"raster": {"href": "mock://stac-2015-001/raster"}}}]},
        "obs-2020-chennai": {"id": "obs-2020-chennai", "items": [
            {"id": "stac-2020-001", "assets": {"raster": {"href": "mock://stac-2020-001/raster"}}},
            {"id": "stac-2020-002", "assets": {"raster": {"href": "mock://stac-2020-002/raster"}}},
        ]},
        "obs-2026-chennai": {"id": "obs-2026-chennai", "items": [
            {"id": "stac-2026-001", "assets": {"raster": {"href": "mock://stac-2026-001/raster"}}},
            {"id": "stac-2026-002", "assets": {"raster": {"href": "mock://stac-2026-002/raster"}}},
        ]},
    }
    time_indexes = {
        "obs-2011-chennai": 0,
        "obs-2015-chennai": 1,
        "obs-2020-chennai": 2,
        "obs-2026-chennai": 3,
    }
    return MockEnvironment(
        vector_store=MockVectorStore(features),
        feature_store=MockFeatureStore(features),
        stac_store=MockSTACStore(observations),
        zarr_store=MockZarrStore(time_indexes),
        raster_evidence_store=MockRasterEvidenceStore(),
    )
