"""PaddleOCR engine — chỉ chạy khi đã pip install paddleocr."""
import logging
from .base import BaseOCREngine, OCRResult

logger = logging.getLogger(__name__)


def _fetch_image_bytes(url: str) -> bytes:
    """Tải ảnh có giới hạn (SEC-OCR-2): timeout + trần dung lượng, fail-closed."""
    import httpx
    from ..config import settings

    with httpx.Client(timeout=settings.fetch_timeout_s, follow_redirects=False) as client:
        with client.stream("GET", url) as r:
            r.raise_for_status()
            chunks: list[bytes] = []
            total = 0
            for chunk in r.iter_bytes(64 * 1024):
                total += len(chunk)
                if total > settings.max_image_bytes:
                    raise ValueError(
                        f"Ảnh vượt quá giới hạn {settings.max_image_bytes} byte"
                    )
                chunks.append(chunk)
            return b"".join(chunks)


class PaddleOCREngine(BaseOCREngine):
    name = "paddle_ocr"
    _instance = None

    @classmethod
    def is_available(cls) -> bool:
        try:
            import paddleocr  # noqa: F401
            return True
        except ImportError:
            return False

    def __init__(self):
        from paddleocr import PaddleOCR
        if PaddleOCREngine._instance is None:
            PaddleOCREngine._instance = PaddleOCR(
                use_angle_cls=True, lang="vi", show_log=False,
            )
        self.ocr = PaddleOCREngine._instance

    async def parse(self, image_url: str) -> OCRResult:
        from PIL import Image
        from io import BytesIO
        import anyio

        # SEC-OCR-2: không cho Pillow mở ảnh bom — đặt trần pixel trước khi decode.
        try:
            from ..config import settings
            Image.MAX_IMAGE_PIXELS = settings.max_image_pixels
        except Exception:
            pass

        raw = _fetch_image_bytes(image_url)

        def _decode() -> OCRResult:
            img = Image.open(BytesIO(raw))
            img.load()  # ép decode ngay trong guard pixel-limit

            result = self.ocr.ocr(img, cls=True)
            lines = []
            confs = []
            for line in result[0] if result else []:
                text = line[1][0]
                conf = line[1][1]
                lines.append(text)
                confs.append(conf)

            return OCRResult(
                raw_text="\n".join(lines),
                confidence=sum(confs) / len(confs) if confs else 0.0,
                engine=self.name,
            )

        # PaddleOCR chặn luồng → chạy trong thread, không treo event loop.
        return await anyio.to_thread.run_sync(_decode)
