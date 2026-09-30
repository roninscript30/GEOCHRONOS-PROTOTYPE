from __future__ import annotations

from typing import Any, Dict, Literal
from pydantic import BaseModel, Field


class DependencyHealth(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"]
    details: Dict[str, Any] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"]
    version: str = "0.1.0"
    project: str = "GeoChronos"
    phase: str = "Phase 3 - Backend Integration"
    dependencies: Dict[str, DependencyHealth] = Field(default_factory=dict)
