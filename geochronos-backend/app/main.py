from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .api.health import router as health_router
from .api.query import router as query_router
from .api.features import router as features_router
from .api.temporal import router as temporal_router
from .api.map import router as map_router
from .api.cube import router as cube_router
from .api.evidence import router as evidence_router
from .api.raster import router as raster_router
from .middleware.logging import RequestLoggingMiddleware
from .middleware.errors import register_error_handlers

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("spectra.backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("Initializing GeoChronos Backend with settings: host=%s port=%d", settings.host, settings.port)
    logger.info("Zarr cube: %s", settings.zarr_cube_path)
    logger.info("STAC catalog: %s", settings.stac_catalog_path)
    logger.info("Vector DB: %s (collection: %s)", settings.vector_db_path, settings.vector_collection_name)
    logger.info("OmniRoute model server: %s (model: %s)", settings.omniroute_base_url, settings.omniroute_model)
    yield
    logger.info("Shutting down GeoChronos Backend")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="GeoChronos Application API",
        description=(
            "Production-quality local FastAPI backend integrating GeoChronos Data Foundation "
            "and GeoChronos Intelligence Engine for air-gapped Earth Observation analytics (SIH26227)."
        ),
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Logging Middleware
    app.add_middleware(RequestLoggingMiddleware)

    # Register error handlers
    register_error_handlers(app)

    # Register Routers
    app.include_router(health_router)
    app.include_router(query_router)
    app.include_router(features_router)
    app.include_router(temporal_router)
    app.include_router(map_router)
    app.include_router(cube_router)
    app.include_router(evidence_router)
    app.include_router(raster_router)

    return app


app = create_app()
