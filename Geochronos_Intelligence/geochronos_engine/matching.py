from __future__ import annotations

from dataclasses import dataclass

from .models import FeatureMatchResult, FeatureRecord
from .utils import area_similarity, bounding_box_iou, centroid_distance


@dataclass(slots=True)
class MatchingConfig:
    iou_threshold: float = 0.55
    centroid_distance_threshold: float = 12.0
    area_similarity_threshold: float = 0.75


def match_features(
    features_a: list[FeatureRecord],
    features_b: list[FeatureRecord],
    *,
    config: MatchingConfig | None = None,
) -> list[FeatureMatchResult]:
    config = config or MatchingConfig()
    matches: list[FeatureMatchResult] = []
    for left in features_a:
        best_match: FeatureMatchResult | None = None
        for right in features_b:
            if left.feature_class != right.feature_class:
                continue
            iou = bounding_box_iou(left.geometry, right.geometry)
            distance = centroid_distance(left.geometry, right.geometry)
            similarity = area_similarity(left.geometry, right.geometry)
            score = (iou * 0.5) + (max(0.0, 1.0 - min(distance, config.centroid_distance_threshold) / config.centroid_distance_threshold) * 0.25) + (similarity * 0.25)
            reasons = [
                f"iou={iou:.3f}",
                f"centroid_distance={distance:.3f}",
                f"area_similarity={similarity:.3f}",
            ]
            is_match = iou >= config.iou_threshold and distance <= config.centroid_distance_threshold and similarity >= config.area_similarity_threshold
            candidate = FeatureMatchResult(
                feature_a=left.feature_id,
                feature_b=right.feature_id,
                match=is_match,
                matching_score=round(score, 4),
                matching_reasons=reasons,
            )
            if best_match is None or candidate.matching_score > best_match.matching_score:
                best_match = candidate
        if best_match is not None:
            matches.append(best_match)
    return matches
