from __future__ import annotations

from pathlib import Path
import re
from typing import Any, Dict, List, Optional
import numpy as np
from shapely.geometry import shape
import xarray as xr

from geochronos_engine.models import FeatureRecord

YEAR_TO_INDEX = {2011: 0, 2015: 1, 2020: 2, 2026: 3}
OBSERVATION_TO_INDEX = {
    "chennai_2011": 0,
    "chennai_2015": 1,
    "chennai_2020": 2,
    "chennai_2026": 3,
}


def _parse_year_from_val(val: Any) -> int:
    m = re.search(r"\b(20\d{2})\b", str(val))
    if m:
        return int(m.group(1))
    try:
        return int(val)
    except Exception:
        return 2026


class ZarrDataStore:
    def __init__(self, zarr_path: str | Path) -> None:
        self.zarr_path = Path(zarr_path)
        if not self.zarr_path.exists():
            raise FileNotFoundError(f"Zarr cube not found at: {self.zarr_path}")
        self._ds: Optional[xr.Dataset] = None

    @property
    def ds(self) -> xr.Dataset:
        if self._ds is None:
            self._ds = xr.open_zarr(str(self.zarr_path), consolidated=False)
        return self._ds

    def get_time_index(self, observation_id: str) -> int:
        if observation_id in OBSERVATION_TO_INDEX:
            return OBSERVATION_TO_INDEX[observation_id]
        for year, idx in YEAR_TO_INDEX.items():
            if str(year) in observation_id:
                return idx
        return 0

    def get_info(self) -> Dict[str, Any]:
        attrs = dict(self.ds.attrs)
        dimensions = {str(k): int(v) for k, v in self.ds.sizes.items()}
        coordinates = {}
        for k in self.ds.coords:
            if k == "time":
                coordinates["time"] = [_parse_year_from_val(v) for v in self.ds.coords[k].values]
            else:
                coordinates[str(k)] = [
                    float(v) if isinstance(v, (np.floating, float)) else str(v)
                    for v in self.ds.coords[k].values
                ]

        variables = {
            str(k): {
                "dims": [str(d) for d in self.ds[k].dims],
                "shape": list(self.ds[k].shape),
                "dtype": str(self.ds[k].dtype),
            }
            for k in self.ds.data_vars
        }
        bounds = {
            "left": float(attrs.get("bounds_left", 400000.0)),
            "bottom": float(attrs.get("bounds_bottom", 1420000.0)),
            "right": float(attrs.get("bounds_right", 435000.0)),
            "top": float(attrs.get("bounds_top", 1470000.0)),
        }
        return {
            "dataset_id": str(attrs.get("dataset_id", "geochronos_chennai")),
            "project": str(attrs.get("project", "GeoChronos")),
            "study_area": str(attrs.get("study_area", "Chennai")),
            "crs": str(attrs.get("crs", "EPSG:32644")),
            "resolution_m": float(attrs.get("resolution_m", 10.0)),
            "dimensions": dimensions,
            "coordinates": coordinates,
            "variables": variables,
            "bounds": bounds,
            "attributes": attrs,
        }

    def read_spatial_window(self, feature: FeatureRecord) -> Dict[str, Any]:
        """Lazy reading of spatial window around feature geometry."""
        geom = shape(feature.geometry)
        minx, miny, maxx, maxy = geom.bounds
        pad = 20.0
        time_idx = feature.cube_time_index

        sub = self.ds["reflectance"].isel(time=time_idx).sel(
            x=slice(minx - pad, maxx + pad),
            y=slice(maxy + pad, miny - pad),
        )
        bands = [str(b) for b in self.ds.coords["band"].values]
        stats = {}
        for b in bands:
            try:
                b_sub = sub.sel(band=b).values
                stats[b] = {
                    "mean": float(np.nanmean(b_sub)) if b_sub.size > 0 else 0.0,
                    "min": float(np.nanmin(b_sub)) if b_sub.size > 0 else 0.0,
                    "max": float(np.nanmax(b_sub)) if b_sub.size > 0 else 0.0,
                }
            except Exception:
                stats[b] = {"mean": 0.0, "min": 0.0, "max": 0.0}

        return {
            "feature_id": feature.feature_id,
            "time_index": time_idx,
            "window_bounds": {"min_x": minx, "min_y": miny, "max_x": maxx, "max_y": maxy},
            "shape": list(sub.shape),
            "band_statistics": stats,
        }

    def read_feature_window(self, feature: FeatureRecord) -> Dict[str, Any]:
        return self.read_spatial_window(feature)

    def read_bands(self, feature: FeatureRecord) -> Dict[str, float]:
        """Extract centroid spectral reflectance profile."""
        geom = shape(feature.geometry)
        cx, cy = geom.centroid.x, geom.centroid.y
        time_idx = feature.cube_time_index

        point_data = self.ds["reflectance"].isel(time=time_idx).sel(x=cx, y=cy, method="nearest")
        bands = [str(b) for b in self.ds.coords["band"].values]
        values = point_data.values
        return {b: float(v) for b, v in zip(bands, values)}

    def get_spectral_profile(self, x: float, y: float, year: int = 2026) -> Dict[str, float]:
        time_idx = YEAR_TO_INDEX.get(year, 3)
        pt = self.ds["reflectance"].isel(time=time_idx).sel(x=x, y=y, method="nearest")
        bands = [str(b) for b in self.ds.coords["band"].values]
        return {b: float(v) for b, v in zip(bands, pt.values)}

    def get_temporal_profile(self, x: float, y: float, band: str = "nir") -> Dict[int, float]:
        pt = self.ds["reflectance"].sel(band=band).sel(x=x, y=y, method="nearest")
        times = [_parse_year_from_val(t) for t in self.ds.coords["time"].values]
        return {t: float(v) for t, v in zip(times, pt.values)}

    def read_window(
        self,
        year: int,
        min_x: float,
        min_y: float,
        max_x: float,
        max_y: float,
        bands: Optional[List[str]] = None,
        max_preview_dim: int = 64,
    ) -> Dict[str, Any]:
        time_idx = YEAR_TO_INDEX.get(year, 3)
        canonical_bands = [str(b) for b in self.ds.coords["band"].values]
        query_bands = bands or canonical_bands

        # Slice Y descending, X ascending (UTM grid convention)
        sub = self.ds["reflectance"].isel(time=time_idx).sel(
            band=query_bands,
            x=slice(min_x, max_x),
            y=slice(max_y, min_y),
        )
        shape_out = list(sub.shape)
        stats = {}
        preview = {}

        for b in query_bands:
            b_arr = sub.sel(band=b).values
            if b_arr.size > 0:
                stats[b] = {
                    "mean": float(np.nanmean(b_arr)),
                    "min": float(np.nanmin(b_arr)),
                    "max": float(np.nanmax(b_arr)),
                    "std": float(np.nanstd(b_arr)),
                }
                if b_arr.ndim == 2:
                    step_y = max(1, b_arr.shape[0] // max_preview_dim)
                    step_x = max(1, b_arr.shape[1] // max_preview_dim)
                    downsampled = b_arr[::step_y, ::step_x]
                    preview[b] = np.nan_to_num(downsampled).tolist()
            else:
                stats[b] = {"mean": 0.0, "min": 0.0, "max": 0.0, "std": 0.0}

        return {
            "year": year,
            "bands": query_bands,
            "shape": shape_out,
            "crs": "EPSG:32644",
            "bounds": {"min_x": min_x, "min_y": min_y, "max_x": max_x, "max_y": max_y},
            "statistics": stats,
            "data_preview": preview,
        }
