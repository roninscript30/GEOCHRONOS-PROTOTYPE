from __future__ import annotations

from .models import EvidenceReference, FeatureMatchResult, FeatureRecord


def build_evidence(
    *,
    feature: FeatureRecord,
    counterpart: FeatureRecord | None,
    match_result: FeatureMatchResult | None,
    provenance: EvidenceReference,
    metrics: dict[str, object],
) -> dict[str, object]:
    return {
        "feature_identity": feature.feature_id,
        "feature_class": feature.feature_class,
        "counterpart_feature_id": None if counterpart is None else counterpart.feature_id,
        "match_result": None if match_result is None else match_result.to_dict(),
        "geometry_metrics": metrics,
        "stac_reference": provenance.stac_item,
        "zarr_reference": provenance.zarr_reference,
        "raster_reference": provenance.source_raster,
        "confidence": feature.confidence,
    }
