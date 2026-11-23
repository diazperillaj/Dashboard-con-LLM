"""Application configuration loaded from environment variables or .env file."""

import logging
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings object — override any field via environment variable or .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "Dashboard Analitico API"
    app_version: str = "1.0.0"
    debug: bool = False

    # Data
    csv_path: str = "app/data/availability.csv"

    # CORS — accept a JSON-encoded list so it works in .env files
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    cors_allow_methods: List[str] = ["GET", "POST", "OPTIONS"]
    cors_allow_headers: List[str] = ["*"]

    # OpenRouter / LLM
    openrouter_api_key: str = ""
    openrouter_model: str = "openai/gpt-4o-mini"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # Logging
    log_level: str = "INFO"


def setup_logging(log_level: str) -> None:
    """Configure root logger with a structured, timestamp-prefixed format."""
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=numeric_level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        force=True,
    )


settings = Settings()
