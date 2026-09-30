# GeoChronos FastAPI Backend Service

Local FastAPI backend exposing the GeoChronos Data Foundation and Intelligence Engine over REST endpoints:

- **`app/api/`**: Endpoints for `/api/query`, `/api/temporal`, `/api/cube`, `/api/raster`, `/api/features`, `/api/evidence`, `/api/map`, and `/api/health`.
- **`app/adapters/`**: Storage adapters for `zarr_store`, `stac_store`, `raster_store`, `feature_store` (GeoPackage), and `vector_store` (Qdrant).
- **`verification/`**: Automated audit snapshots (`backend_audit.json`, `openapi_snapshot.json`, `raster_pipeline_audit.json`, `temporal_visualization_audit.json`, `ui_data_integrity_audit.json`).
- **`tests/`**: Pytest verification suite covering health, STAC/map, feature retrieval, Zarr cube spectral profiles, temporal reconstruction, and evidence endpoints.
