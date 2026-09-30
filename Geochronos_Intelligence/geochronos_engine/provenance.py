from __future__ import annotations

from .interfaces import RasterEvidenceStore, STACStore, ZarrStore
from .models import EvidenceReference, FeatureRecord


def resolve_provenance(
    feature: FeatureRecord,
    *,
    stac_store: STACStore,
    zarr_store: ZarrStore,
    raster_evidence_store: RasterEvidenceStore,
) -> EvidenceReference:
    observation = stac_store.get_observation(feature.observation_id)
    stac_item = stac_store.get_item(feature.source_item_id)
    zarr_reference = {
        "observation_id": feature.observation_id,
        "time_index": zarr_store.get_time_index(feature.observation_id),
        "spatial_window": zarr_store.read_spatial_window(feature),
    }
    source_raster = raster_evidence_store.resolve_source(feature)
    spatial_evidence = raster_evidence_store.resolve_spatial_evidence(feature)
    return EvidenceReference(
        feature=feature,
        observation=observation,
        stac_item=stac_item,
        zarr_reference=zarr_reference,
        source_raster=source_raster,
        spatial_evidence=spatial_evidence,
    )
