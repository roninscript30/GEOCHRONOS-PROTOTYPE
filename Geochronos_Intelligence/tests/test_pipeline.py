from __future__ import annotations

import unittest

from geochronos_engine.analysis import process_query
from geochronos_engine.query_parser import parse_query
from geochronos_engine.retrieval import search_features
from geochronos_engine.temporal import analyze_temporal_change


class QueryPipelineTests(unittest.TestCase):
    def test_parse_query_extracts_expected_fields(self) -> None:
        structured = parse_query("Which buildings appeared in Chennai between 2020 and 2026?")
        self.assertEqual(structured.intent, "feature_appearance")
        self.assertEqual(structured.feature_class, "building")
        self.assertEqual(structured.location, "Chennai")
        self.assertEqual(structured.start_year, 2020)
        self.assertEqual(structured.end_year, 2026)

    def test_search_features_returns_chennai_buildings(self) -> None:
        structured = parse_query("Which buildings appeared in Chennai between 2020 and 2026?")
        result = search_features(structured)
        self.assertGreaterEqual(len(result.hits), 2)
        self.assertTrue(all(hit.feature.feature_class == "building" for hit in result.hits))

    def test_temporal_analysis_detects_appearance(self) -> None:
        structured = parse_query("Which buildings appeared in Chennai between 2020 and 2026?")
        search_result = search_features(structured)
        analysis = analyze_temporal_change(structured, [hit.feature for hit in search_result.hits])
        self.assertTrue(any(item.status == "appeared" for item in analysis.results))
        self.assertGreaterEqual(analysis.summary_statistics["appearances"], 1)

    def test_process_query_returns_grounded_answer(self) -> None:
        response = process_query("Which buildings appeared in Chennai between 2020 and 2026?")
        self.assertIn("answer", response.to_dict())
        self.assertGreaterEqual(len(response.analysis_result.results), 1)
        self.assertIn("grounded", response.answer.lower())


if __name__ == "__main__":
    unittest.main()
