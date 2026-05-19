"""FastAPI entry — POST /ocr/parse trả raw text + parsed structured data."""
import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .config import settings
from .engines.base import BaseOCREngine
from .engines.mock import MockOCREngine
from .engines.paddle import PaddleOCREngine
from .parsers.receipt_parser import parse_receipt_text


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


# ========== Schemas ==========

class ParseRequest(BaseModel):
    image_url: str = Field(..., description="URL ảnh phiếu nhập hàng")
    engine: str = Field("mock", description="Engine: mock|paddle_ocr|easy_ocr|tesseract")


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
async def parse(req: ParseRequest):
    engine = get_engine(req.engine)
    logger.info(f"OCR parse with {engine.name}: {req.image_url[:80]}")
    try:
        result = await engine.parse(req.image_url)
    except Exception as e:
        logger.exception("OCR engine error")
        raise HTTPException(500, f"OCR engine '{engine.name}' lỗi: {e}")

    parsed = parse_receipt_text(result.raw_text)
    return ParseResponse(
        raw_text=result.raw_text,
        confidence=result.confidence,
        engine=result.engine,
        parsed=parsed,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=True)
