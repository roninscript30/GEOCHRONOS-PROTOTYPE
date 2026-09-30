from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from ..dependencies import AppContainer, get_container
from ..schemas.evidence import EvidenceResponse, ProvenanceResponse
from ..services.evidence_service import EvidenceService

router = APIRouter(prefix="/api", tags=["Evidence & Provenance"])


def get_evidence_service(container: AppContainer = Depends(get_container)) -> EvidenceService:
    return EvidenceService(
        feature_store=container.feature_store,
        stac_store=container.stac_store,
        zarr_store=container.zarr_store,
        raster_store=container.raster_store,
    )


@router.get("/evidence/{feature_id}", response_model=EvidenceResponse)
def get_feature_evidence(
    feature_id: str,
    service: EvidenceService = Depends(get_evidence_service),
) -> EvidenceResponse:
    ev = service.get_evidence(feature_id)
    if not ev:
        raise HTTPException(status_code=404, detail=f"Evidence not found for feature: {feature_id}")
    return ev


@router.get("/provenance/{feature_id}", response_model=ProvenanceResponse)
def get_feature_provenance(
    feature_id: str,
    service: EvidenceService = Depends(get_evidence_service),
) -> ProvenanceResponse:
    prov = service.get_provenance(feature_id)
    if not prov:
        raise HTTPException(status_code=404, detail=f"Provenance not found for feature: {feature_id}")
    return prov
