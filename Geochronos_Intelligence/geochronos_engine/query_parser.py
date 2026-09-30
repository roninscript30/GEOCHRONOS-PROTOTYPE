from __future__ import annotations

import json
import re
from typing import Any

from .interfaces import QueryInterpreter
from .models import ALLOWED_FEATURE_CLASSES, ALLOWED_INTENTS, StructuredQuery


FEATURE_CLASS_PATTERNS = {
    "building": r"\bbuilding(s)?\b",
    "road": r"\broad(s)?\b",
    "river": r"\briver(s)?\b",
    "water_body": r"\bwater body|lake|pond|reservoir\b",
    "vegetation": r"\bvegetation|forest|tree(s)?\b",
    "urban_area": r"\burban area|city|settlement\b",
}


def parse_query(query: str, *, client: QueryInterpreter | None = None) -> StructuredQuery:
    if client is not None:
        parsed = client.interpret_query(query)
        return StructuredQuery(**_coerce_structured_query_dict(parsed, query))
    return _heuristic_parse(query)


def _coerce_structured_query_dict(payload: dict[str, Any], original_query: str) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("OmniRoute output must be a JSON object")
    payload = dict(payload)
    payload.setdefault("semantic_query", original_query)
    payload.setdefault("filters", {})
    if "intent" not in payload:
        raise ValueError("OmniRoute output missing intent")
    return payload


def _heuristic_parse(query: str) -> StructuredQuery:
    normalized = query.lower()
    intent = "feature_search"
    if any(word in normalized for word in ("appeared", "appearance", "appears")):
        intent = "feature_appearance"
    elif any(word in normalized for word in ("disappeared", "disappearance", "vanished")):
        intent = "feature_disappearance"
    elif "persist" in normalized:
        intent = "feature_persistence"
    elif "spectral" in normalized:
        intent = "spectral_change"
    elif "area" in normalized and "change" in normalized:
        intent = "area_change"
    elif "geometry" in normalized or "shape" in normalized:
        intent = "geometry_change"
    elif any(word in normalized for word in ("change", "compare", "differences")):
        intent = "feature_change"

    feature_class = None
    for candidate, pattern in FEATURE_CLASS_PATTERNS.items():
        if re.search(pattern, normalized):
            feature_class = candidate
            break

    years = [int(year) for year in re.findall(r"\b(20\d{2})\b", query)]
    start_year = years[0] if years else None
    end_year = years[1] if len(years) > 1 else None
    reference_year = years[0] if len(years) == 1 else None
    if "between" in normalized and len(years) >= 2:
        start_year, end_year = years[0], years[1]

    location = None
    location_match = re.search(r"\bin\s+([a-zA-Z\s]+?)(?:\s+between|\s+from|\s+in\s+|\?|\.|$)", query, re.IGNORECASE)
    if location_match:
        candidate_location = location_match.group(1).strip()
        if candidate_location and candidate_location.lower() not in {"the", "a", "an"}:
            location = candidate_location

    filters: dict[str, Any] = {}
    if feature_class:
        filters["feature_class"] = feature_class
    if location:
        filters["location"] = location
    if start_year is not None or end_year is not None:
        filters["years"] = [year for year in (start_year, end_year, reference_year) if year is not None]

    limit = 10 if intent == "feature_search" else 5
    structured = StructuredQuery(
        intent=intent if intent in ALLOWED_INTENTS else "feature_search",
        feature_class=feature_class if feature_class in ALLOWED_FEATURE_CLASSES else None,
        location=location,
        semantic_query=query,
        start_year=start_year,
        end_year=end_year,
        reference_year=reference_year,
        filters=filters,
        limit=limit,
    )
    return structured


def structured_query_from_json(payload: str) -> StructuredQuery:
    data = json.loads(payload)
    if not isinstance(data, dict):
        raise ValueError("structured query JSON must describe an object")
    return StructuredQuery(**data)
