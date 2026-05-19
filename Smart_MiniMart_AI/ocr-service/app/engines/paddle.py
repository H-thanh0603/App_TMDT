"""PaddleOCR engine — chỉ chạy khi đã pip install paddleocr."""
import logging
from .base import BaseOCREngine, OCRResult

logger = logging.getLogger(__name__)


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
        import httpx
        from PIL import Image
        from io import BytesIO

        async with httpx.AsyncClient() as client:
            r = await client.get(image_url, timeout=30)
            r.raise_for_status()
            img = Image.open(BytesIO(r.content))

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
