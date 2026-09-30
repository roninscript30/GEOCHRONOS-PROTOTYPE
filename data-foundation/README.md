# GeoChronos — Earth Observation Data Foundation

Multi-temporal Earth Observation data assets staged for local, air-gapped spatio-temporal retrieval and change analysis (`EPSG:32644`, 10m spatial resolution, epochs `2011`, `2015`, `2020`, `2026`):

- **`raw/`**: Multi-spectral band scenes (`B01`–`B12`, `B8A`) and acquisition metadata across 2011, 2015, 2020, and 2026.
- **`standardized/`**: Radiometrically standardized and min-max normalized 6-band (`blue`, `green`, `red`, `nir`, `swir1`, `swir2`) GeoTIFF rasters with provenance records (`standardization_record.json`, `normalization_record.json`).
- **`cube/chennai.zarr/`**: Consolidated 4D Zarr reflectance datacube (`time × band × y × x`) for sub-second spatial-temporal window slicing.
- **`stac/`**: SpatioTemporal Asset Catalog (`catalog.json`, `geochronos_chennai_observations/collection.json`, and per-epoch STAC items).
- **`vectors/`**: Extracted multi-epoch building and hydrological footprints (`features.gpkg`, `chennai-base-vectors.json`) and 384-dimensional feature embeddings (`embeddings.npy`, `embedding_index.json`).
- **`vector_db/`**: Local Qdrant SQLite collection (`geochronos_features`) for semantic similarity retrieval.
