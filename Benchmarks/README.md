# GeoChronos — Benchmark & Validation Evidence (PS-26227)

This directory contains the recorded validation and latency artifacts for the GeoChronos local prototype:

- [`validation_report.json`](./validation_report.json): Functional test pass rates (18/18), live API endpoint checks, and Zarr/GeoPackage/Qdrant validation metrics.
- [`processing_log.json`](./processing_log.json): Stage-by-stage execution model and latency bounds across STAC catalog lookup, spatial filtering, vector retrieval, Zarr slicing, and temporal change analysis.
- [`dataset_manifest.json`](./dataset_manifest.json): Canonical specification of the `EPSG:32644` 10m raster cube (`chennai.zarr`), STAC catalog, GeoPackage (`features.gpkg`), and 384-d Qdrant semantic index (`geochronos_features`).
