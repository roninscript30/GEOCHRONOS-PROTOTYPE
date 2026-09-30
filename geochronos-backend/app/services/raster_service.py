from __future__ import annotations

import io
import base64
import json
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from PIL import Image
from shapely.geometry import shape

from ..adapters.zarr_store import ZarrDataStore, YEAR_TO_INDEX
from ..adapters.stac_store import STACCatalogStore
from ..adapters.feature_store import GeoPackageFeatureStore
from ..schemas.raster import (
    RasterCompositeRequest,
    RasterCompositeResponse,
    RasterDifferenceRequest,
    RasterDifferenceResponse,
    FeatureCropRequest,
    FeatureCropResponse,
    EpochCropItem,
    VoxelWindowRequest,
    VoxelWindowResponse,
)
from ..utils.geo import wgs84_bounds_to_utm, utm_bounds_to_wgs84, Transformer

_transformer_to_32644 = Transformer.from_crs("EPSG:4326", "EPSG:32644", always_xy=True)
_transformer_to_4326 = Transformer.from_crs("EPSG:32644", "EPSG:4326", always_xy=True)


def _stretch_channel(arr: np.ndarray, p_min: float = 2.0, p_max: float = 98.0, gamma: float = 1.0) -> np.ndarray:
    """Percentile contrast stretch with optional gamma correction."""
    valid = arr[np.isfinite(arr)]
    if valid.size == 0:
        return np.zeros_like(arr, dtype=np.uint8)

    v_min, v_max = np.percentile(valid, (p_min, p_max))
    if v_max <= v_min:
        return np.zeros_like(arr, dtype=np.uint8)

    norm = np.clip((arr - v_min) / (v_max - v_min), 0.0, 1.0)
    if gamma != 1.0 and gamma > 0:
        norm = np.power(norm, 1.0 / gamma)

    return (norm * 255.0).astype(np.uint8)


def _colormap_index(arr: np.ndarray, v_min: float = -1.0, v_max: float = 1.0) -> np.ndarray:
    """Colorize an index like NDVI from Crimson (-1) -> Amber (0) -> Emerald (+1)."""
    norm = np.clip((arr - v_min) / (v_max - v_min), 0.0, 1.0)
    # 0.0 -> Red (220, 38, 38)
    # 0.5 -> Amber (245, 158, 11)
    # 1.0 -> Emerald (16, 185, 129)
    h, w = arr.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)

    mask_low = norm < 0.5
    f_low = norm[mask_low] * 2.0
    rgb[mask_low, 0] = (220 + f_low * (245 - 220)).astype(np.uint8)
    rgb[mask_low, 1] = (38 + f_low * (158 - 38)).astype(np.uint8)
    rgb[mask_low, 2] = (38 + f_low * (11 - 38)).astype(np.uint8)

    mask_high = ~mask_low
    f_high = (norm[mask_high] - 0.5) * 2.0
    rgb[mask_high, 0] = (245 + f_high * (16 - 245)).astype(np.uint8)
    rgb[mask_high, 1] = (158 + f_high * (185 - 158)).astype(np.uint8)
    rgb[mask_high, 2] = (11 + f_high * (129 - 11)).astype(np.uint8)

    return rgb


def _encode_png_base64(img_array: np.ndarray, max_dim: int = 1024, min_dim: int = 384) -> str:
    """Encode image array to PNG base64 string, preserving razor-sharp 10m pixel clarity."""
    img = Image.fromarray(img_array)
    w, h = img.size

    # Downsample only if exceeds max_dim
    if max(w, h) > max_dim:
        scale = max_dim / float(max(w, h))
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))
        img = img.resize((new_w, new_h), Image.Resampling.BILINEAR)
    # Upscale small crops using NEAREST NEIGHBOR integer factor so 10m pixels are sharp and never blurred
    elif max(w, h) < min_dim and max(w, h) > 0:
        multiplier = max(1, int(np.ceil(min_dim / float(max(w, h)))))
        img = img.resize((w * multiplier, h * multiplier), Image.Resampling.NEAREST)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"


class RasterService:
    def __init__(
        self,
        zarr_store: ZarrDataStore,
        stac_store: STACCatalogStore,
        feature_store: GeoPackageFeatureStore,
    ) -> None:
        self.zarr = zarr_store
        self.stac = stac_store
        self.features = feature_store

    def _get_stac_meta(self, year: int) -> Dict[str, Any]:
        """Fetch authoritative STAC metadata for the given year."""
        obs_id = f"chennai_{year}"
        item = self.stac.get_item(obs_id)
        if item:
            props = item.get("properties", {})
            return {
                "observation_id": obs_id,
                "year": year,
                "source_platform": props.get("source_platform") or props.get("platform", "Unknown"),
                "sensor": props.get("sensor", "MSI"),
                "product": props.get("product", "L2A"),
                "scene_id": props.get("scene_id", ""),
                "acquisition_date": props.get("acquisition_date") or props.get("datetime", f"{year}-01-01"),
                "resolution_m": props.get("resolution_m", 10.0),
            }
        # Fallback accurate metadata if STAC item lookup is missing
        fallbacks = {
            2011: {"source_platform": "Landsat-5", "sensor": "Landsat-5 TM", "acquisition_date": "2011-03-09"},
            2015: {"source_platform": "Sentinel-2A", "sensor": "Sentinel-2A MSI", "acquisition_date": "2015-12-28"},
            2020: {"source_platform": "Sentinel-2A", "sensor": "Sentinel-2A MSI", "acquisition_date": "2020-02-15"},
            2026: {"source_platform": "Sentinel-2C", "sensor": "Sentinel-2C MSI", "acquisition_date": "2026-03-05"},
        }
        fb = fallbacks.get(year, {"source_platform": "Sentinel-2", "sensor": "MSI", "acquisition_date": f"{year}-01-01"})
        return {
            "observation_id": obs_id,
            "year": year,
            **fb,
            "product": "Surface Reflectance",
            "resolution_m": 10.0,
        }

    def _convert_bounds(self, min_x: float, min_y: float, max_x: float, max_y: float, crs: str) -> Tuple[Dict[str, float], Dict[str, float]]:
        if crs.upper() in ("EPSG:4326", "WGS84"):
            utm_minx, utm_miny, utm_maxx, utm_maxy = wgs84_bounds_to_utm(min_x, min_y, max_x, max_y)
            wgs_minx, wgs_miny, wgs_maxx, wgs_maxy = min_x, min_y, max_x, max_y
        else:
            utm_minx, utm_miny, utm_maxx, utm_maxy = min_x, min_y, max_x, max_y
            wgs_minx, wgs_miny, wgs_maxx, wgs_maxy = utm_bounds_to_wgs84(min_x, min_y, max_x, max_y)

        bounds_utm = {"min_x": utm_minx, "min_y": utm_miny, "max_x": utm_maxx, "max_y": utm_maxy}
        bounds_wgs84 = {"min_lon": wgs_minx, "min_lat": wgs_miny, "max_lon": wgs_maxx, "max_lat": wgs_maxy}
        return bounds_utm, bounds_wgs84

    def get_composite(self, req: RasterCompositeRequest) -> RasterCompositeResponse:
        time_idx = YEAR_TO_INDEX.get(req.year, 3)
        bounds_utm, bounds_wgs84 = self._convert_bounds(req.min_x, req.min_y, req.max_x, req.max_y, req.crs)

        sub = self.zarr.ds["reflectance"].isel(time=time_idx).sel(
            x=slice(bounds_utm["min_x"], bounds_utm["max_x"]),
            y=slice(bounds_utm["max_y"], bounds_utm["min_y"]),
        )

        total_y = max(1, int(abs(bounds_utm["max_y"] - bounds_utm["min_y"]) / 10.0))
        total_x = max(1, int(abs(bounds_utm["max_x"] - bounds_utm["min_x"]) / 10.0))
        max_requested = req.max_dim or 1024
        step = max(1, int(max(total_y, total_x) / max_requested))
        if step > 1:
            sub = sub.isel(y=slice(None, None, step), x=slice(None, None, step))

        stats: Dict[str, Dict[str, float]] = {}
        shape_out = [0, 0, 0]

        if req.mode == "cir":
            # Color Infrared: NIR -> Red, Red -> Green, Green -> Blue
            r = sub.sel(band="nir").values
            g = sub.sel(band="red").values
            b = sub.sel(band="green").values
            channels = [("nir", r), ("red", g), ("green", b)]
        elif req.mode == "swir":
            # SWIR composite: SWIR-1 -> Red, NIR -> Green, Red -> Blue
            r = sub.sel(band="swir1").values
            g = sub.sel(band="nir").values
            b = sub.sel(band="red").values
            channels = [("swir1", r), ("nir", g), ("red", b)]
        elif req.mode.startswith("custom:"):
            # Custom 3-Band Mapping: "custom:R_BAND,G_BAND,B_BAND"
            parts = req.mode.split(":")[1].split(",") if ":" in req.mode else ["red", "green", "blue"]
            b_r = parts[0].strip() if len(parts) > 0 and parts[0].strip() else "red"
            b_g = parts[1].strip() if len(parts) > 1 and parts[1].strip() else "green"
            b_b = parts[2].strip() if len(parts) > 2 and parts[2].strip() else "blue"
            r = sub.sel(band=b_r).values
            g = sub.sel(band=b_g).values
            b = sub.sel(band=b_b).values
            channels = [(b_r, r), (b_g, g), (b_b, b)]
        elif req.mode in ("ndvi", "ndmi", "ndbi"):
            # Analytical Index calculation
            if req.mode == "ndvi":
                b1 = sub.sel(band="nir").values
                b2 = sub.sel(band="red").values
            elif req.mode == "ndmi":
                b1 = sub.sel(band="nir").values
                b2 = sub.sel(band="swir1").values
            else: # ndbi
                b1 = sub.sel(band="swir1").values
                b2 = sub.sel(band="nir").values

            idx_arr = np.nan_to_num((b1 - b2) / (b1 + b2 + 1e-6))
            stats[req.mode] = {
                "mean": float(np.nanmean(idx_arr)),
                "min": float(np.nanmin(idx_arr)),
                "max": float(np.nanmax(idx_arr)),
                "std": float(np.nanstd(idx_arr)),
            }
            colored = _colormap_index(idx_arr, -0.2, 0.8 if req.mode == "ndvi" else 0.5)
            shape_out = [colored.shape[0], colored.shape[1], 3]
            img_b64 = _encode_png_base64(colored, max_dim=req.max_dim)
            return RasterCompositeResponse(
                year=req.year,
                mode=req.mode,
                bounds_utm=bounds_utm,
                bounds_wgs84=bounds_wgs84,
                crs="EPSG:32644",
                shape=shape_out,
                image_base64=img_b64,
                statistics=stats,
                observation=self._get_stac_meta(req.year),
            )
        elif req.mode == "single":
            band_name = req.band or "nir"
            b_arr = sub.sel(band=band_name).values
            stretched = _stretch_channel(b_arr, req.min_percentile, req.max_percentile, req.gamma)
            rgb = np.stack([stretched, stretched, stretched], axis=-1)
            stats[band_name] = {
                "mean": float(np.nanmean(b_arr)),
                "min": float(np.nanmin(b_arr)),
                "max": float(np.nanmax(b_arr)),
                "std": float(np.nanstd(b_arr)),
            }
            shape_out = [rgb.shape[0], rgb.shape[1], 1]
            img_b64 = _encode_png_base64(rgb, max_dim=req.max_dim)
            return RasterCompositeResponse(
                year=req.year,
                mode=req.mode,
                bounds_utm=bounds_utm,
                bounds_wgs84=bounds_wgs84,
                crs="EPSG:32644",
                shape=shape_out,
                image_base64=img_b64,
                statistics=stats,
                observation=self._get_stac_meta(req.year),
            )
        else:
            # Default: Natural Color (Red, Green, Blue)
            r = sub.sel(band="red").values
            g = sub.sel(band="green").values
            b = sub.sel(band="blue").values
            channels = [("red", r), ("green", g), ("blue", b)]

        stretched_channels = []
        for name, arr in channels:
            stats[name] = {
                "mean": float(np.nanmean(arr)),
                "min": float(np.nanmin(arr)),
                "max": float(np.nanmax(arr)),
                "std": float(np.nanstd(arr)),
            }
            stretched_channels.append(_stretch_channel(arr, req.min_percentile, req.max_percentile, req.gamma))

        rgb = np.stack(stretched_channels, axis=-1)
        shape_out = [rgb.shape[0], rgb.shape[1], 3]
        img_b64 = _encode_png_base64(rgb, max_dim=req.max_dim)

        return RasterCompositeResponse(
            year=req.year,
            mode=req.mode,
            bounds_utm=bounds_utm,
            bounds_wgs84=bounds_wgs84,
            crs="EPSG:32644",
            shape=shape_out,
            image_base64=img_b64,
            statistics=stats,
            observation=self._get_stac_meta(req.year),
        )

    def get_difference(self, req: RasterDifferenceRequest) -> RasterDifferenceResponse:
        from_idx = YEAR_TO_INDEX.get(req.from_year, 0)
        to_idx = YEAR_TO_INDEX.get(req.to_year, 3)
        bounds_utm, bounds_wgs84 = self._convert_bounds(req.min_x, req.min_y, req.max_x, req.max_y, req.crs)

        sub_from = self.zarr.ds["reflectance"].isel(time=from_idx).sel(
            x=slice(bounds_utm["min_x"], bounds_utm["max_x"]),
            y=slice(bounds_utm["max_y"], bounds_utm["min_y"]),
        )
        sub_to = self.zarr.ds["reflectance"].isel(time=to_idx).sel(
            x=slice(bounds_utm["min_x"], bounds_utm["max_x"]),
            y=slice(bounds_utm["max_y"], bounds_utm["min_y"]),
        )

        if req.mode == "ndvi_diff":
            ndvi_from = (sub_from.sel(band="nir").values - sub_from.sel(band="red").values) / (
                sub_from.sel(band="nir").values + sub_from.sel(band="red").values + 1e-6
            )
            ndvi_to = (sub_to.sel(band="nir").values - sub_to.sel(band="red").values) / (
                sub_to.sel(band="nir").values + sub_to.sel(band="red").values + 1e-6
            )
            diff = ndvi_to - ndvi_from
        else:
            band_name = req.band or "nir"
            diff = sub_to.sel(band=band_name).values - sub_from.sel(band=band_name).values

        diff = np.nan_to_num(diff)
        h, w = diff.shape
        rgb = np.full((h, w, 3), 18, dtype=np.uint8) # Dark carbon background

        # Significant changes beyond threshold
        pos_mask = diff > req.threshold
        neg_mask = diff < -req.threshold

        # Positive increase -> Emerald Green (16, 185, 129)
        rgb[pos_mask, 0] = 16
        rgb[pos_mask, 1] = 185
        rgb[pos_mask, 2] = 129

        # Negative decrease -> Crimson Rose (244, 63, 94)
        rgb[neg_mask, 0] = 244
        rgb[neg_mask, 1] = 63
        rgb[neg_mask, 2] = 94

        total_pixels = max(1, h * w)
        pos_percent = float(np.sum(pos_mask) / total_pixels * 100.0)
        neg_percent = float(np.sum(neg_mask) / total_pixels * 100.0)

        change_stats = {
            "mean_diff": float(np.mean(diff)),
            "min_diff": float(np.min(diff)),
            "max_diff": float(np.max(diff)),
            "std_diff": float(np.std(diff)),
            "positive_change_percent": round(pos_percent, 2),
            "negative_change_percent": round(neg_percent, 2),
            "stable_percent": round(100.0 - pos_percent - neg_percent, 2),
            "threshold": req.threshold,
        }

        img_b64 = _encode_png_base64(rgb, max_dim=req.max_dim)

        return RasterDifferenceResponse(
            from_year=req.from_year,
            to_year=req.to_year,
            mode=req.mode,
            bounds_utm=bounds_utm,
            bounds_wgs84=bounds_wgs84,
            crs="EPSG:32644",
            shape=[h, w, 3],
            image_base64=img_b64,
            change_statistics=change_stats,
            from_observation=self._get_stac_meta(req.from_year),
            to_observation=self._get_stac_meta(req.to_year),
        )

    def get_feature_crops(self, req: FeatureCropRequest) -> FeatureCropResponse:
        feat = self.features.get_feature(req.feature_id)
        if not feat:
            raise ValueError(f"Feature not found: {req.feature_id}")

        geom = shape(feat.geometry)
        minx, miny, maxx, maxy = geom.bounds
        pad = req.padding_meters

        crop_bounds_utm = {
            "min_x": minx - pad,
            "min_y": miny - pad,
            "max_x": maxx + pad,
            "max_y": maxy + pad,
        }

        crops_dict: Dict[str, EpochCropItem] = {}
        crop_max_dim = max(req.max_dim or 512, 512)
        for yr in [2011, 2015, 2020, 2026]:
            sub_comp = self.get_composite(
                RasterCompositeRequest(
                    year=yr,
                    min_x=crop_bounds_utm["min_x"],
                    min_y=crop_bounds_utm["min_y"],
                    max_x=crop_bounds_utm["max_x"],
                    max_y=crop_bounds_utm["max_y"],
                    crs="EPSG:32644",
                    mode=req.mode,
                    max_dim=crop_max_dim,
                )
            )
            crops_dict[str(yr)] = EpochCropItem(
                year=yr,
                observation=sub_comp.observation,
                image_base64=sub_comp.image_base64,
                bounds_utm=sub_comp.bounds_utm,
                bounds_wgs84=sub_comp.bounds_wgs84,
                statistics=sub_comp.statistics,
            )

        # Convert geometry to WGS84 for client map overlay
        geo_wgs84 = None
        try:
            from shapely.ops import transform
            geom_4326 = transform(_transformer_to_4326.transform, geom)
            geo_wgs84 = json.loads(json.dumps(geom_4326.__geo_interface__))
        except Exception:
            pass

        return FeatureCropResponse(
            feature_id=feat.feature_id,
            feature_class=feat.feature_class,
            area_m2=float(feat.attributes.get("area_m2", 0.0)),
            confidence=feat.confidence,
            crops=crops_dict,
            geometry_wgs84=geo_wgs84,
        )

    def get_voxel_window(self, req: VoxelWindowRequest) -> VoxelWindowResponse:
        bounds_utm, bounds_wgs84 = self._convert_bounds(req.min_x, req.min_y, req.max_x, req.max_y, req.crs)
        dim = req.spatial_dim

        if req.axis_mode == "band_y_x":
            # Z axis is 6 bands for a fixed year
            time_idx = YEAR_TO_INDEX.get(req.selected_year, 3)
            sub = self.zarr.ds["reflectance"].isel(time=time_idx).sel(
                x=slice(bounds_utm["min_x"], bounds_utm["max_x"]),
                y=slice(bounds_utm["max_y"], bounds_utm["min_y"]),
            )
            z_labels = [str(b) for b in self.zarr.ds.coords["band"].values]
            fixed_val = str(req.selected_year)
            # sub has shape [6, Y, X]
            arr = sub.values
        else:
            # Z axis is 4 temporal epochs for a fixed band
            band_name = req.selected_band or "nir"
            sub = self.zarr.ds["reflectance"].sel(band=band_name).sel(
                x=slice(bounds_utm["min_x"], bounds_utm["max_x"]),
                y=slice(bounds_utm["max_y"], bounds_utm["min_y"]),
            )
            z_labels = ["2011", "2015", "2020", "2026"]
            fixed_val = band_name
            # sub has shape [4, Y, X]
            arr = sub.values

        arr = np.nan_to_num(arr)
        z_len, y_len, x_len = arr.shape

        # Downsample spatially if larger than dim
        step_y = max(1, y_len // dim)
        step_x = max(1, x_len // dim)
        downsampled = arr[:, ::step_y, ::step_x]

        min_v = float(np.min(downsampled)) if downsampled.size > 0 else 0.0
        max_v = float(np.max(downsampled)) if downsampled.size > 0 else 1.0
        mean_v = float(np.mean(downsampled)) if downsampled.size > 0 else 0.0

        return VoxelWindowResponse(
            axis_mode=req.axis_mode,
            fixed_value=fixed_val,
            z_labels=z_labels,
            shape=list(downsampled.shape),
            bounds_utm=bounds_utm,
            bounds_wgs84=bounds_wgs84,
            voxel_data=downsampled.tolist(),
            min_val=round(min_v, 4),
            max_val=round(max_v, 4),
            mean_val=round(mean_v, 4),
        )
