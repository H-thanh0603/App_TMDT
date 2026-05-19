"""Engine OCR abstract."""
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class OCRResult:
    raw_text: str
    confidence: float
    engine: str


class BaseOCREngine(ABC):
    name: str = "base"

    @abstractmethod
    async def parse(self, image_url: str) -> OCRResult:
        ...

    @classmethod
    def is_available(cls) -> bool:
        return True
