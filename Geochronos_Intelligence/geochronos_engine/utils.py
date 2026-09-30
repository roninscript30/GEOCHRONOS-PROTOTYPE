from __future__ import annotations

import hashlib
import math
import re
from statistics import mean, median
from typing import Any


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", normalize_text(text))


def generate_embedding(text: str, dimensions: int = 16) -> list[float]:
    vector = [0.0] * dimensions
    for token in tokenize(text):
        digest = hashlib.md5(token.encode("utf-8")).hexdigest()
        bucket = int(digest[:8], 16) % dimensions
        vector[bucket] += 1.0
    return vector


def cosine_similarity(left: list[float], right: list[float]) -> float:
    numerator = sum(x * y for x, y in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return 0.0
    return numerator / (left_norm * right_norm)


def geometry_area(geometry: dict[str, Any]) -> float:
    min_x = float(geometry["min_x"])
    min_y = float(geometry["min_y"])
    max_x = float(geometry["max_x"])
    max_y = float(geometry["max_y"])
    if max_x <= min_x or max_y <= min_y:
        raise ValueError("invalid geometry bounds")
    return (max_x - min_x) * (max_y - min_y)


def geometry_centroid(geometry: dict[str, Any]) -> tuple[float, float]:
    return (
        (float(geometry["min_x"]) + float(geometry["max_x"])) / 2.0,
        (float(geometry["min_y"]) + float(geometry["max_y"])) / 2.0,
    )


def intersection_area(left: dict[str, Any], right: dict[str, Any]) -> float:
    min_x = max(float(left["min_x"]), float(right["min_x"]))
    min_y = max(float(left["min_y"]), float(right["min_y"]))
    max_x = min(float(left["max_x"]), float(right["max_x"]))
    max_y = min(float(left["max_y"]), float(right["max_y"]))
    if max_x <= min_x or max_y <= min_y:
        return 0.0
    return (max_x - min_x) * (max_y - min_y)


def bounding_box_iou(left: dict[str, Any], right: dict[str, Any]) -> float:
    intersection = intersection_area(left, right)
    if not intersection:
        return 0.0
    union = geometry_area(left) + geometry_area(right) - intersection
    if not union:
        return 0.0
    return intersection / union


def centroid_distance(left: dict[str, Any], right: dict[str, Any]) -> float:
    left_x, left_y = geometry_centroid(left)
    right_x, right_y = geometry_centroid(right)
    return math.hypot(left_x - right_x, left_y - right_y)


def area_similarity(left: dict[str, Any], right: dict[str, Any]) -> float:
    left_area = geometry_area(left)
    right_area = geometry_area(right)
    if not left_area or not right_area:
        return 0.0
    smaller = min(left_area, right_area)
    larger = max(left_area, right_area)
    return smaller / larger


def safe_mean(values: list[float]) -> float:
    return mean(values) if values else 0.0


def safe_median(values: list[float]) -> float:
    return median(values) if values else 0.0
