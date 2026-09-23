"""Cấu hình từ env."""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = os.getenv("ENV", os.getenv("NODE_ENV", "development"))
    default_engine: str = os.getenv("OCR_DEFAULT_ENGINE", "mock")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    port: int = int(os.getenv("PORT", "5001"))

    # SEC-OCR-1: khóa chia sẻ giữa backend và OCR service.
    # Nếu đặt, backend PHẢI gửi header `X-OCR-Key` cho mọi request /ocr/parse.
    api_key: str = os.getenv("OCR_API_KEY", "")

    # SEC-OCR-2: giới hạn ảnh tải về (chống SSRF-biến-thể thành DoS bằng file khổng lồ).
    max_image_bytes: int = int(os.getenv("OCR_MAX_IMAGE_BYTES", str(10 * 1024 * 1024)))
    # SEC-OCR-2: giới hạn pixel khi decode (chống decompression bomb phía OCR).
    max_image_pixels: int = int(os.getenv("OCR_MAX_IMAGE_PIXELS", str(40_000_000)))
    # Timeout tải ảnh (giây).
    fetch_timeout_s: float = float(os.getenv("OCR_FETCH_TIMEOUT_S", "15"))

    class Config:
        env_file = ".env"
        env_prefix = "OCR_"


settings = Settings()
