from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class EngineConfig:
    omniroute_base_url: str | None = os.getenv("OMNIROUTE_BASE_URL")
    omniroute_model: str | None = os.getenv("OMNIROUTE_MODEL")
    omniroute_api_key: str | None = os.getenv("OMNIROUTE_API_KEY")
    omniroute_temperature: float = float(os.getenv("OMNIROUTE_TEMPERATURE", "0"))
    omniroute_max_tokens: int = int(os.getenv("OMNIROUTE_MAX_TOKENS", "1024"))
    omniroute_timeout: float = float(os.getenv("OMNIROUTE_TIMEOUT", "30"))
    iou_threshold: float = 0.55
    centroid_distance_threshold: float = 12.0
    area_similarity_threshold: float = 0.75
    top_k: int = 8
