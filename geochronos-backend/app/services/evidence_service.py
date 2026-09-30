from __future__ import annotations

from typing import Any, Dict, Optional
from ..adapters.feature_store import GeoPackageFeatureStore
from ..adapters.stac_store import STACCatalogStore
from ..adapters.zarr_store import ZarrDataStore
from ..adapters.raster_store import RasterEvidenceResolver
from ..schemas.evidence import EvidenceResponse, ProvenanceResponse
from ..schemas.common import GeoJSONFeature
from ..utils.geo import utm_to_wgs84_geometry


class EvidenceService:
    def __init__(
        self,
        feature_store: GeoPackageFeatureStore,
        stac_store: STACCatalogStore,
        zarr_store: ZarrDataStore,
        raster_store: RasterEvidenceResolver,
    ) -> None:
        self.feature_store = feature_store
        self.stac_store = stac_store
        self.zarr_store = zarr_store
        self.raster_store = raster_store

    def get_evidence(self, feature_id: str) -> Optional[EvidenceResponse]:
        feature = self.feature_store.get_feature(feature_id)
        if not feature:
            return None

        source_info = self.raster_store.resolve_source(feature)
        spatial_ev = self.raster_store.resolve_spatial_evidence(feature)
        stac_item = self.stac_store.get_item(feature.source_item_id or feature.observation_id)
        zarr_ref = {
            "cube_path": str(self.zarr_store.zarr_path),
            "time_index": feature.cube_time_index,
            "crs": "EPSG:32644",
        }

        geojson_feat = None
        if feature.geometry:
            wgs_geom = utm_to_wgs84_geometry(feature.geometry)
            geojson_feat = GeoJSONFeature(
                type="Feature",
                geometry=wgs_geom,
                properties={"feature_id": feature.feature_id, "confidence": feature.confidence},
                id=feature.feature_id,
            )

        return EvidenceResponse(
            feature_id=feature.feature_id,
            feature_class=feature.feature_class,
            year=feature.year,
            observation_id=feature.observation_id,
            confidence=feature.confidence,
            stac_item=stac_item,
            source_raster=source_info,
            zarr_reference=zarr_ref,
            spatial_evidence=spatial_ev,
            geometry_geojson=geojson_feat,
        )

    def get_provenance(self, feature_id: str) -> Optional[ProvenanceResponse]:
        feature = self.feature_store.get_feature(feature_id)
        if not feature:
            return None

        stac_item = self.stac_store.get_item(feature.source_item_id or feature.observation_id)
        props = stac_item.get("properties", {})

        pipeline_info = {
            "project": "GeoChronos",
            "phase": "Phase 1 Data Foundation -> Phase 3 Backend",
            "problem_statement": "SIH26227",
            "resolution": "10m",
            "crs": "EPSG:32644",
        }

        source_obs = {
            "observation_id": feature.observation_id,
            "source_item_id": feature.source_item_id,
            "platform": props.get("platform", "Sentinel-2 / Landsat"),
            "sensor": props.get("instruments", ["MSI"])[0] if props.get("instruments") else "MSI",
            "datetime": props.get("datetime"),
        }

        datacube_loc = {
            "cube": str(self.zarr_store.zarr_path),
            "time_index": feature.cube_time_index,
            "variable": "reflectance",
        }

        vector_deriv = {
            "gpkg_layer": "features",
            "extraction_method": "salient spectral-spatial segmentation",
            "confidence": feature.confidence,
            "area_m2": feature.attributes.get("area_m2"),
        }

        embed_prov = {
            "model": "BAAI/bge-small-en-v1.5",
            "dimensions": 384,
            "vector_store": "Qdrant",
            "collection": "geochronos_features",
        }

        return ProvenanceResponse(
            feature_id=feature.feature_id,
            pipeline=pipeline_info,
            source_observation=source_obs,
            datacube_location=datacube_loc,
            vector_derivation=vector_deriv,
            embedding_provenance=embed_prov,
        )
