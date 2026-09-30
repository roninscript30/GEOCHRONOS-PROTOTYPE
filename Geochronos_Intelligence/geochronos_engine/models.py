from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Protocol


ALLOWED_INTENTS = {
    "feature_search",
    "temporal_feature_search",
    "feature_change",
    "feature_appearance",
    "feature_disappearance",
    "feature_persistence",
    "geometry_change",
    "area_change",
    "spectral_change",
    "spatial_change",
}

ALLOWED_FEATURE_CLASSES = {
    "building",
    "road",
    "river",
    "water_body",
    "vegetation",
    "urban_area",
}

ALLOWED_YEARS = {2011, 2015, 2020, 2026}


class DictLike(Protocol):
    def to_dict(self) -> dict[str, Any]:
        ...


@dataclass(slots=True)
class StructuredQuery:
    intent: str
    feature_class: str | None = None
    location: str | None = None
    geometry: dict[str, Any] | None = None
    semantic_query: str | None = None
    start_year: int | None = None
    end_year: int | None = None
    reference_year: int | None = None
    operation: str | None = None
    filters: dict[str, Any] = field(default_factory=dict)
    limit: int | None = None

    def __post_init__(self) -> None:
        if self.intent not in ALLOWED_INTENTS:
            raise ValueError(f"unsupported intent: {self.intent}")
        if self.feature_class is not None and self.feature_class not in ALLOWED_FEATURE_CLASSES:
            raise ValueError(f"unsupported feature class: {self.feature_class}")
        for field_name in ("start_year", "end_year", "reference_year"):
            value = getattr(self, field_name)
            if value is not None and value not in ALLOWED_YEARS:
                raise ValueError(f"unsupported year: {value}")
        if self.limit is not None and self.limit <= 0:
            raise ValueError("limit must be positive")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class FeatureRecord:
    feature_id: str
    feature_class: str
    year: int
    geometry: dict[str, Any]
    observation_id: str
    confidence: float
    source_item_id: str
    cube_time_index: int
    semantic_text: str = ""
    attributes: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class SearchHit:
    feature: FeatureRecord
    score: float

    def to_dict(self) -> dict[str, Any]:
        return {"feature": self.feature.to_dict(), "score": self.score}


@dataclass(slots=True)
class FeatureSearchResult:
    query: StructuredQuery
    hits: list[SearchHit]

    def to_dict(self) -> dict[str, Any]:
        return {"query": self.query.to_dict(), "hits": [hit.to_dict() for hit in self.hits]}


@dataclass(slots=True)
class FeatureMatchResult:
    feature_a: str
    feature_b: str
    match: bool
    matching_score: float
    matching_reasons: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class EvidenceReference:
    feature: FeatureRecord
    observation: dict[str, Any]
    stac_item: dict[str, Any]
    zarr_reference: dict[str, Any]
    source_raster: dict[str, Any]
    spatial_evidence: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class TemporalAnalysisItem:
    feature_id: str
    feature_class: str
    status: str
    from_year: int
    to_year: int
    metrics: dict[str, Any]
    geometry: dict[str, Any]
    confidence: float
    evidence: dict[str, Any]
    provenance: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class AnalysisResult:
    query: str
    structured_query: StructuredQuery
    results: list[TemporalAnalysisItem]
    summary_statistics: dict[str, Any]
    limitations: list[str]
    provenance: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "query": self.query,
            "structured_query": self.structured_query.to_dict(),
            "results": [item.to_dict() for item in self.results],
            "summary_statistics": self.summary_statistics,
            "limitations": self.limitations,
            "provenance": self.provenance,
        }


@dataclass(slots=True)
class CompleteAnalysisResponse:
    query: str
    structured_query: StructuredQuery
    analysis_result: AnalysisResult
    answer: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "query": self.query,
            "structured_query": self.structured_query.to_dict(),
            "analysis_result": self.analysis_result.to_dict(),
            "answer": self.answer,
        }
