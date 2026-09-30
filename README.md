# GeoChronos — Spatiotemporal Earth Observation Intelligence Platform

**Problem Statement:** PS-26227 — *Semantic Retrieval and Multi-Temporal Change Analysis of Satellite Imagery*

GeoChronos is an air-gapped, multi-temporal Earth Observation (EO) investigation platform that enables analysts to query satellite archives in natural language, retrieve candidate sites across multi-epoch vector and raster indexes, reconstruct historical site states, and verify physical change events with full provenance.

---

## Repository Structure

| Directory | Component | Description |
| :--- | :--- | :--- |
| [`src/`](./src) & [`public/`](./public) | **Analyst Investigation UI** | Next.js 16 + MapLibre GL 3D interactive investigation canvas implementing the 18-stage analyst workflow (`Query → Intent → Spatial Discovery → Temporal Reconstruction → Change Verification → Provenance → Dossier`). |
| [`geochronos-backend/`](./geochronos-backend) | **FastAPI Backend Service** | Local REST API integrating STAC catalog discovery, Zarr datacube slicing, GeoPackage/Qdrant vector retrieval, and audit verification suites. |
| [`Geochronos_Intelligence/`](./Geochronos_Intelligence) | **GeoChronos Intelligence Engine** | Python package (`geochronos_engine`) for natural-language query decomposition, hybrid spatial-semantic retrieval, multi-epoch IoU/spectral change detection, and provenance graph generation. |
| [`data-foundation/`](./data-foundation) | **EO Data Foundation** | Multi-epoch satellite dataset (`2011`, `2015`, `2020`, `2026` in `EPSG:32644` at 10m resolution), including raw Sentinel-2/Landsat bands, radiometrically standardized & normalized GeoTIFFs, consolidated Zarr datacube (`chennai.zarr`), STAC catalog, GeoPackage (`features.gpkg`), and Qdrant vector index (`geochronos_features`). |
| [`Benchmarks/`](./Benchmarks) | **Validation & Benchmarks** | Recorded validation snapshot (`validation_report.json`), pipeline latency benchmarks (`processing_log.json`), and dataset footprint manifest (`dataset_manifest.json`). |

---

## Quick Start (Analyst UI)

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to launch the interactive geospatial investigation canvas.
