from __future__ import annotations

from typing import Any, Dict, List, Optional
from ..adapters.zarr_store import ZarrDataStore
from ..schemas.cube import (
    CubeInfoResponse,
    CubeWindowResponse,
    GeoChronoslProfileResponse,
    TemporalProfileResponse,
)
from ..utils.geo import wgs84_bounds_to_utm, Transformer

_transformer_to_32644 = Transformer.from_crs("EPSG:4326", "EPSG:32644", always_xy=True)


class CubeService:
    def __init__(self, zarr_store: ZarrDataStore) -> None:
        self.zarr_store = zarr_store

    def get_info(self) -> CubeInfoResponse:
        data = self.zarr_store.get_info()
        return CubeInfoResponse(**data)

    def get_window(
        self,
        year: int,
        min_x: float,
        min_y: float,
        max_x: float,
        max_y: float,
        crs: str = "EPSG:32644",
        bands: Optional[List[str]] = None,
    ) -> CubeWindowResponse:
        # Convert bounds to UTM if input is in EPSG:4326
        if crs.upper() in ("EPSG:4326", "WGS84"):
            utm_minx, utm_miny, utm_maxx, utm_maxy = wgs84_bounds_to_utm(min_x, min_y, max_x, max_y)
        else:
            utm_minx, utm_miny, utm_maxx, utm_maxy = min_x, min_y, max_x, max_y

        res = self.zarr_store.read_window(
            year=year,
            min_x=utm_minx,
            min_y=utm_miny,
            max_x=utm_maxx,
            max_y=utm_maxy,
            bands=bands,
        )

        return CubeWindowResponse(
            year=res["year"],
            bands=res["bands"],
            shape=res["shape"],
            crs=res["crs"],
            bounds=res["bounds"],
            statistics=res["statistics"],
            data_preview=res["data_preview"],
        )

    def get_spectral_profile(self, x: float, y: float, crs: str = "EPSG:32644", year: int = 2026) -> GeoChronoslProfileResponse:
        utm_x, utm_y = x, y
        if crs.upper() in ("EPSG:4326", "WGS84"):
            utm_x, utm_y = _transformer_to_32644.transform(x, y)

        prof = self.zarr_store.get_spectral_profile(utm_x, utm_y, year=year)
        return GeoChronoslProfileResponse(
            year=year,
            x=x,
            y=y,
            crs=crs,
            spectral_profile=prof,
        )

    def get_temporal_profile(self, x: float, y: float, crs: str = "EPSG:32644", band: str = "nir") -> TemporalProfileResponse:
        utm_x, utm_y = x, y
        if crs.upper() in ("EPSG:4326", "WGS84"):
            utm_x, utm_y = _transformer_to_32644.transform(x, y)

        prof = self.zarr_store.get_temporal_profile(utm_x, utm_y, band=band)
        return TemporalProfileResponse(
            band=band,
            x=x,
            y=y,
            crs=crs,
            temporal_profile=prof,
        )
