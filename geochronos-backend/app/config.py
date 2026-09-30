from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import List

import yaml
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server Settings
    host: str = "127.0.0.1"
    port: int = 8000
    debug: bool = False
    log_level: str = "INFO"
    cors_origins: List[str] = ["*"]

    # Storage Paths
    data_dir: str = "./data-foundation"
    zarr_cube_path: str = "./data-foundation/cube/chennai.zarr"
    stac_catalog_path: str = "./data-foundation/stac/catalog.json"
    features_gpkg_path: str = "./data-foundation/vectors/features.gpkg"
    vector_db_path: str = "./data-foundation/vector_db"
    vector_collection_name: str = "geochronos_features"
    metadata_dir: str = "./Benchmarks"

    # OmniRoute Settings
    omniroute_base_url: str = "http://127.0.0.1:20128/v1"
    omniroute_model: str = "claude-sonnet-4-6"
    omniroute_api_key: str = "sk-geochronos-local-omniroute"
    omniroute_temperature: float = 0.0
    omniroute_max_tokens: int = 1024
    omniroute_timeout: float = 30.0

    # Analysis Defaults
    iou_threshold: float = 0.55
    centroid_distance_threshold: float = 12.0
    area_similarity_threshold: float = 0.75
    default_top_k: int = 8
    max_window_size: int = 512


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()

    # If settings.yaml exists, apply overrides if not set in environment
    yaml_path = Path(__file__).resolve().parent.parent / "config" / "settings.yaml"
    if yaml_path.is_file():
        try:
            with open(yaml_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}

            server = data.get("server", {})
            storage = data.get("storage", {})
            omniroute = data.get("omniroute", {})
            analysis = data.get("analysis", {})

            if "host" in server and "HOST" not in os.environ:
                settings.host = server["host"]
            if "port" in server and "PORT" not in os.environ:
                settings.port = int(server["port"])
            if "debug" in server and "DEBUG" not in os.environ:
                settings.debug = bool(server["debug"])
            if "log_level" in server and "LOG_LEVEL" not in os.environ:
                settings.log_level = server["log_level"]

            if "zarr_cube_path" in storage and "ZARR_CUBE_PATH" not in os.environ:
                settings.zarr_cube_path = storage["zarr_cube_path"]
            if "stac_catalog_path" in storage and "STAC_CATALOG_PATH" not in os.environ:
                settings.stac_catalog_path = storage["stac_catalog_path"]
            if "features_gpkg_path" in storage and "FEATURES_GPKG_PATH" not in os.environ:
                settings.features_gpkg_path = storage["features_gpkg_path"]
            if "vector_db_path" in storage and "VECTOR_DB_PATH" not in os.environ:
                settings.vector_db_path = storage["vector_db_path"]
            if "vector_collection_name" in storage and "VECTOR_COLLECTION_NAME" not in os.environ:
                settings.vector_collection_name = storage["vector_collection_name"]
            if "metadata_dir" in storage and "METADATA_DIR" not in os.environ:
                settings.metadata_dir = storage["metadata_dir"]

            if "base_url" in omniroute and "OMNIROUTE_BASE_URL" not in os.environ:
                settings.omniroute_base_url = omniroute["base_url"]
            if "model" in omniroute and "OMNIROUTE_MODEL" not in os.environ:
                settings.omniroute_model = omniroute["model"]
            if "api_key" in omniroute and "OMNIROUTE_API_KEY" not in os.environ:
                settings.omniroute_api_key = omniroute["api_key"]
            if "temperature" in omniroute and "OMNIROUTE_TEMPERATURE" not in os.environ:
                settings.omniroute_temperature = float(omniroute["temperature"])
            if "max_tokens" in omniroute and "OMNIROUTE_MAX_TOKENS" not in os.environ:
                settings.omniroute_max_tokens = int(omniroute["max_tokens"])
            if "timeout" in omniroute and "OMNIROUTE_TIMEOUT" not in os.environ:
                settings.omniroute_timeout = float(omniroute["timeout"])

            if "iou_threshold" in analysis:
                settings.iou_threshold = float(analysis["iou_threshold"])
            if "centroid_distance_threshold" in analysis:
                settings.centroid_distance_threshold = float(analysis["centroid_distance_threshold"])
            if "area_similarity_threshold" in analysis:
                settings.area_similarity_threshold = float(analysis["area_similarity_threshold"])
            if "default_top_k" in analysis:
                settings.default_top_k = int(analysis["default_top_k"])
            if "max_window_size" in analysis:
                settings.max_window_size = int(analysis["max_window_size"])
        except Exception:
            pass

    return settings
