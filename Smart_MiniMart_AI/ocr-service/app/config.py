"""Cấu hình từ env."""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    default_engine: str = os.getenv("OCR_DEFAULT_ENGINE", "mock")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    port: int = int(os.getenv("PORT", "5001"))

    class Config:
        env_file = ".env"
        env_prefix = "OCR_"


settings = Settings()
