from __future__ import annotations

from functools import lru_cache
from typing import Optional
from fastapi import Depends

from .config import Settings, get_settings
from .adapters.zarr_store import ZarrDataStore
from .adapters.stac_store import STACCatalogStore
from .adapters.feature_store import GeoPackageFeatureStore
from .adapters.vector_store import QdrantVectorStore
from .adapters.raster_store import RasterEvidenceResolver
from .adapters.omniroute_client import LocalOmniRouteClient


class AppContainer:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

        # Data Foundation Adapters
        self.zarr_store = ZarrDataStore(settings.zarr_cube_path)
        self.stac_store = STACCatalogStore(settings.stac_catalog_path)
        self.feature_store = GeoPackageFeatureStore(settings.features_gpkg_path)
        self.vector_store = QdrantVectorStore(
            db_path=settings.vector_db_path,
            collection_name=settings.vector_collection_name,
            feature_store=self.feature_store,
        )
        self.raster_store = RasterEvidenceResolver(
            stac_store=self.stac_store,
            zarr_store=self.zarr_store,
        )

        # Intelligence Adapters
        self.omniroute_client = LocalOmniRouteClient(
            base_url=settings.omniroute_base_url,
            model=settings.omniroute_model,
            api_key=settings.omniroute_api_key,
            temperature=settings.omniroute_temperature,
            max_tokens=settings.omniroute_max_tokens,
            timeout=settings.omniroute_timeout,
        )


_container: Optional[AppContainer] = None


def get_container(settings: Settings = Depends(get_settings)) -> AppContainer:
    global _container
    if _container is None:
        _container = AppContainer(settings)
    return _container


def get_zarr_store(container: AppContainer = Depends(get_container)) -> ZarrDataStore:
    return container.zarr_store


def get_stac_store(container: AppContainer = Depends(get_container)) -> STACCatalogStore:
    return container.stac_store


def get_feature_store(container: AppContainer = Depends(get_container)) -> GeoPackageFeatureStore:
    return container.feature_store


def get_vector_store(container: AppContainer = Depends(get_container)) -> QdrantVectorStore:
    return container.vector_store


def get_raster_store(container: AppContainer = Depends(get_container)) -> RasterEvidenceResolver:
    return container.raster_store


def get_omniroute_client(container: AppContainer = Depends(get_container)) -> LocalOmniRouteClient:
    return container.omniroute_client
