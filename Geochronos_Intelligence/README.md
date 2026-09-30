# GeoChronos Intelligence Engine (`geochronos_engine`)

Standalone Python intelligence engine for **PS-26227** implementing:

- **`query_parser.py`**: Deterministic + LLM-assisted decomposition of natural-language analyst queries into spatial, temporal, and feature constraints.
- **`retrieval.py` & `matching.py`**: Hybrid spatial-semantic candidate retrieval and cross-epoch polygon correspondence (IoU, centroid displacement, and area ratio matching).
- **`temporal.py` & `analysis.py`**: Multi-epoch change classification (`appearance`, `disappearance`, `expansion`, `persistence`) and 6-band spectral delta verification.
- **`evidence.py` & `provenance.py`**: Automated construction of verifiable evidence dossiers and end-to-end lineage graphs from STAC items and Zarr slices.
