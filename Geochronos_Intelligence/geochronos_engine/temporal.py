from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Any

from .adapters import MockEnvironment, build_mock_environment
from .evidence import build_evidence
from .interfaces import FeatureStore, RasterEvidenceStore, STACStore, ZarrStore
from .matching import MatchingConfig, match_features
from .models import AnalysisResult, FeatureRecord, StructuredQuery, TemporalAnalysisItem
from .provenance import resolve_provenance
from .utils import area_similarity, bounding_box_iou, centroid_distance, geometry_area


@dataclass(slots=True)
class TemporalContext:
    feature_store: FeatureStore
    stac_store: STACStore
    zarr_store: ZarrStore
    raster_evidence_store: RasterEvidenceStore


def analyze_temporal_change(
    structured_query: StructuredQuery,
    retrieved_features: list[FeatureRecord],
    *,
    feature_store: FeatureStore | None = None,
    stac_store: STACStore | None = None,
    zarr_store: ZarrStore | None = None,
    raster_evidence_store: RasterEvidenceStore | None = None,
    matching_config: MatchingConfig | None = None,
) -> AnalysisResult:
    environment: MockEnvironment | None = None
    if feature_store is None or stac_store is None or zarr_store is None or raster_evidence_store is None:
        environment = build_mock_environment()
        feature_store = feature_store or environment.feature_store
        stac_store = stac_store or environment.stac_store
        zarr_store = zarr_store or environment.zarr_store
        raster_evidence_store = raster_evidence_store or environment.raster_evidence_store

    result_items: list[TemporalAnalysisItem] = []
    limitations: list[str] = []
    summary = {"total_features": len(retrieved_features), "matched_pairs": 0, "appearances": 0, "disappearances": 0, "persistence": 0}

    years = sorted({feature.year for feature in retrieved_features})
    if structured_query.start_year is not None and structured_query.end_year is not None:
        start_year = structured_query.start_year
        end_year = structured_query.end_year
    elif len(years) >= 2:
        start_year, end_year = years[0], years[-1]
    else:
        start_year = end_year = structured_query.reference_year or (years[0] if years else 2026)

    earlier = [feature for feature in retrieved_features if feature.year == start_year]
    later = [feature for feature in retrieved_features if feature.year == end_year]
    matches = match_features(earlier, later, config=matching_config)
    match_by_left = {match.feature_a: match for match in matches if match.match}
    match_by_right = {match.feature_b: match for match in matches if match.match}
    summary["matched_pairs"] = len(match_by_left)

    if structured_query.intent in {"feature_appearance", "feature_search", "temporal_feature_search", "feature_change", "geometry_change", "area_change", "spectral_change", "spatial_change"}:
        for feature in later:
            match_result = match_by_right.get(feature.feature_id)
            if match_result is None:
                provenance = resolve_provenance(
                    feature,
                    stac_store=stac_store,
                    zarr_store=zarr_store,
                    raster_evidence_store=raster_evidence_store,
                )
                evidence = build_evidence(feature=feature, counterpart=None, match_result=None, provenance=provenance, metrics={"reason": "no_valid_match_in_earlier_observation"})
                result_items.append(
                    TemporalAnalysisItem(
                        feature_id=feature.feature_id,
                        feature_class=feature.feature_class,
                        status="appeared",
                        from_year=start_year,
                        to_year=end_year,
                        metrics={"confidence": feature.confidence},
                        geometry=feature.geometry,
                        confidence=feature.confidence,
                        evidence=evidence,
                        provenance=provenance.to_dict(),
                    )
                )
                summary["appearances"] += 1

    if structured_query.intent == "feature_disappearance":
        for feature in earlier:
            match_result = match_by_left.get(feature.feature_id)
            if match_result is None:
                provenance = resolve_provenance(
                    feature,
                    stac_store=stac_store,
                    zarr_store=zarr_store,
                    raster_evidence_store=raster_evidence_store,
                )
                evidence = build_evidence(feature=feature, counterpart=None, match_result=None, provenance=provenance, metrics={"reason": "no_valid_match_in_later_observation"})
                result_items.append(
                    TemporalAnalysisItem(
                        feature_id=feature.feature_id,
                        feature_class=feature.feature_class,
                        status="disappeared",
                        from_year=start_year,
                        to_year=end_year,
                        metrics={"confidence": feature.confidence},
                        geometry=feature.geometry,
                        confidence=feature.confidence,
                        evidence=evidence,
                        provenance=provenance.to_dict(),
                    )
                )
                summary["disappearances"] += 1

    if structured_query.intent in {"feature_persistence", "feature_change", "geometry_change", "area_change", "spectral_change", "spatial_change"}:
        for feature in earlier:
            match_result = match_by_left.get(feature.feature_id)
            if match_result is None:
                continue
            counterpart = next((candidate for candidate in later if candidate.feature_id == match_result.feature_b), None)
            if counterpart is None:
                continue
            provenance = resolve_provenance(
                feature,
                stac_store=stac_store,
                zarr_store=zarr_store,
                raster_evidence_store=raster_evidence_store,
            )
            geometry_metrics = _geometry_metrics(feature.geometry, counterpart.geometry)
            metrics = dict(geometry_metrics)
            if structured_query.intent == "area_change":
                metrics["area_change_percentage"] = _area_change_percentage(feature.geometry, counterpart.geometry)
            if structured_query.intent == "feature_persistence":
                status = "persistent"
            elif structured_query.intent == "geometry_change":
                status = "geometry_changed" if geometry_metrics["geometry_similarity"] < 1.0 else "persistent"
            elif structured_query.intent == "area_change":
                status = "area_changed"
            else:
                status = "changed"
            result_items.append(
                TemporalAnalysisItem(
                    feature_id=feature.feature_id,
                    feature_class=feature.feature_class,
                    status=status,
                    from_year=start_year,
                    to_year=end_year,
                    metrics=metrics,
                    geometry={"from": feature.geometry, "to": counterpart.geometry},
                    confidence=round(mean([feature.confidence, counterpart.confidence, match_result.matching_score]), 4),
                    evidence=build_evidence(feature=feature, counterpart=counterpart, match_result=match_result, provenance=provenance, metrics=metrics),
                    provenance=provenance.to_dict(),
                )
            )
            summary["persistence"] += 1

    if not result_items and structured_query.intent == "feature_search":
        limitations.append("No temporal operation was requested; returned retrieval-only context.")

    if not result_items and not retrieved_features:
        limitations.append("No matching features were found in the mock environment.")

    provenance = {
        "resolved": bool(result_items),
        "years": [start_year, end_year],
        "observations": sorted({feature.observation_id for feature in retrieved_features}),
    }
    return AnalysisResult(
        query=structured_query.semantic_query or "",
        structured_query=structured_query,
        results=result_items,
        summary_statistics=summary,
        limitations=limitations,
        provenance=provenance,
    )


def _geometry_metrics(left: dict[str, Any], right: dict[str, Any]) -> dict[str, float]:
    left_area = geometry_area(left)
    right_area = geometry_area(right)
    return {
        "intersection_over_union": round(bounding_box_iou(left, right), 4),
        "area_before": round(left_area, 4),
        "area_after": round(right_area, 4),
        "area_difference": round(right_area - left_area, 4),
        "area_similarity": round(area_similarity(left, right), 4),
        "centroid_shift": round(centroid_distance(left, right), 4),
        "geometry_similarity": round(area_similarity(left, right) * bounding_box_iou(left, right), 4),
    }


def _area_change_percentage(left: dict[str, Any], right: dict[str, Any]) -> float:
    left_area = geometry_area(left)
    right_area = geometry_area(right)
    if not left_area:
        return 0.0
    return round(((right_area - left_area) / left_area) * 100.0, 4)
