"""FastAPI entry — POST /ocr/parse trả raw text + parsed structured data."""
import hmac
import logging
from contextlib import asynccontextmanager
from typing import Any, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from .config import settings
from .engines.base import BaseOCREngine
from .engines.mock import MockOCREngine
from .engines.paddle import PaddleOCREngine
from .parsers.receipt_parser import parse_receipt_text
from .security import is_public_http_url


logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


# ========== Engine registry ==========

_engines: dict[str, BaseOCREngine] = {}


def get_engine(name: str) -> BaseOCREngine:
    name = name.lower()
    if name not in _engines:
        raise HTTPException(400, f"Engine '{name}' không khả dụng. "
                                 f"Có sẵn: {list(_engines.keys())}")
    return _engines[name]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Mock luôn có
    _engines["mock"] = MockOCREngine()

    if PaddleOCREngine.is_available():
        try:
            _engines["paddle_ocr"] = PaddleOCREngine()
            logger.info("PaddleOCR engine ready")
        except Exception as e:
            logger.warning(f"PaddleOCR init failed: {e}")

    logger.info(f"OCR service ready. Engines: {list(_engines.keys())}")
    yield


app = FastAPI(
    title="Smart MiniMart OCR Service",
    description="Microservice OCR cho hệ thống Smart MiniMart AI",
    version="0.1.0",
    lifespan=lifespan,
)


def require_api_key(x_ocr_key: Optional[str] = Header(default=None, alias="X-OCR-Key")) -> None:
    """SEC-OCR-1: xác thực backend bằng khóa chia sẻ (so sánh timing-safe).

    Fail-closed trên production (ENV=production): thiếu key = 503, không bao giờ
    mở /ocr/parse không xác thực. Dev giữ fail-open để khỏi vỡ môi trường local.
    """
    if not settings.api_key:
        if settings.env == "production":
            raise HTTPException(503, "OCR service chưa cấu hình khóa (OCR_API_KEY)")
        logger.warning("OCR_API_KEY chưa đặt — /ocr/parse đang mở không xác thực (chỉ dùng cho dev)")
        return
    if not x_ocr_key or not hmac.compare_digest(x_ocr_key, settings.api_key):
        raise HTTPException(401, "Thiếu hoặc sai khóa OCR (X-OCR-Key)")


# ========== Schemas ==========

class ParseRequest(BaseModel):
    image_url: str = Field(..., max_length=2048, description="URL ảnh phiếu nhập hàng")
    engine: str = Field("mock", max_length=32, description="Engine: mock|paddle_ocr|easy_ocr|tesseract")


class ParseResponse(BaseModel):
    raw_text: str
    confidence: float
    engine: str
    parsed: dict[str, Any]


# ========== Routes ==========

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "smart-minimart-ocr",
        "version": "0.1.0",
        "engines": list(_engines.keys()),
    }


@app.get("/engines")
async def list_engines():
    return {
        "available": list(_engines.keys()),
        "default": settings.default_engine,
    }


@app.post("/ocr/parse", response_model=ParseResponse)
async def parse(req: ParseRequest, _auth: None = Depends(require_api_key)):
    # SEC-OCR-2: kiểm tra URL TRƯỚC khi chọn engine — chặn SSRF ngay tại cổng vào,
    # kể cả khi attacker gửi engine không tồn tại để dò service.
    if not is_public_http_url(req.image_url):
        raise HTTPException(400, "image_url phải là URL http/https công khai")
    engine = get_engine(req.engine)
    # Q64: không log URL/token/PII — chỉ log engine + độ dài URL để debug.
    logger.info(f"OCR parse engine={engine.name} url_len={len(req.image_url)}")
    try:
        result = await engine.parse(req.image_url)
    except Exception:
        # SEC-OCR-3: không lộ chi tiết nội bộ (đường dẫn, traceback, URL) ra client.
        logger.exception("OCR engine error")
        raise HTTPException(500, f"OCR engine '{engine.name}' lỗi. Xem log phía server.")

    parsed = parse_receipt_text(result.raw_text)
    return ParseResponse(
        raw_text=result.raw_text,
        confidence=result.confidence,
        engine=result.engine,
        parsed=parsed,
    )


if __name__ == "__main__":
    import uvicorn
    # reload chỉ dùng cho dev local; KHÔNG bật trong container/production (xem Dockerfile)
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=False)
