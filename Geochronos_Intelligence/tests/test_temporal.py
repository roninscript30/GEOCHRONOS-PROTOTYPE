from __future__ import annotations

import unittest

from geochronos_engine.query_parser import parse_query
from geochronos_engine.retrieval import search_features
from geochronos_engine.temporal import analyze_temporal_change


class TemporalBehaviorTests(unittest.TestCase):
    def test_geometry_change_metrics_are_deterministic(self) -> None:
        structured = parse_query("Compare the geometry of buildings in Chennai from 2020 to 2026")
        structured.intent = "geometry_change"
        search_result = search_features(structured)
        analysis = analyze_temporal_change(structured, [hit.feature for hit in search_result.hits])
        geometry_items = [item for item in analysis.results if item.status in {"geometry_changed", "changed", "persistent"}]
        self.assertTrue(geometry_items)
        self.assertTrue(any("intersection_over_union" in item.metrics for item in geometry_items))


if __name__ == "__main__":
    unittest.main()
