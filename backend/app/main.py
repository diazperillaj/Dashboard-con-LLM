"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import chatbot, dashboard
from app.core.config import Settings, setup_logging, settings
from app.services.analytics_service import AnalyticsService
from app.services.chatbot_service import ChatbotService
from app.services.data_service import DataService

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler — initialise all services at startup."""
    setup_logging(settings.log_level)

    logger.info("=" * 60)
    logger.info("  %s  v%s", settings.app_name, settings.app_version)
    logger.info("=" * 60)

    # ---- Data layer ----
    data_service = DataService(settings.csv_path)
    data_service.load()

    start_ts, end_ts = data_service.date_range
    logger.info("Records loaded : %d", data_service.record_count)
    logger.info("Date range     : %s  →  %s", start_ts, end_ts)

    # ---- Analytics layer ----
    analytics_service = AnalyticsService(data_service)
    logger.info("AnalyticsService  — ready")

    # ---- Chatbot layer ----
    chatbot_service = ChatbotService(analytics_service)
    logger.info(
        "ChatbotService    — ready  (%d tools: %s)",
        len(chatbot_service.tool_names),
        ", ".join(chatbot_service.tool_names),
    )

    # ---- Store in app state for dependency injection ----
    app.state.data_service = data_service
    app.state.analytics_service = analytics_service
    app.state.chatbot_service = chatbot_service

    logger.info("=" * 60)
    logger.info("  Application ready — http://localhost:8000/docs")
    logger.info("=" * 60)

    yield  # Application runs here

    logger.info("Application shutting down.")


def create_app(config: Settings = settings) -> FastAPI:
    """Construct and configure the FastAPI application.

    Args:
        config: Settings instance (defaults to the global singleton).

    Returns:
        Configured FastAPI application.
    """
    app = FastAPI(
        title=config.app_name,
        version=config.app_version,
        description=(
            "Analytics API for the Dashboard Analitico project. "
            "Loads ~67k availability readings from a CSV into memory and exposes "
            "analytics endpoints plus an LLM chatbot powered by tool calling."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ---- CORS ----
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_credentials=True,
        allow_methods=config.cors_allow_methods,
        allow_headers=config.cors_allow_headers,
    )

    # ---- Routers ----
    app.include_router(dashboard.router)
    app.include_router(chatbot.router)

    # ---- Utility endpoints ----
    @app.get("/health", tags=["Health"], summary="Health check")
    def health_check() -> dict:
        """Returns service status and version."""
        return {"status": "ok", "version": config.app_version}

    return app


app = create_app()
