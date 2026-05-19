"""Mock OCR — trả raw text mẫu cho demo."""
from .base import BaseOCREngine, OCRResult


class MockOCREngine(BaseOCREngine):
    name = "mock"

    async def parse(self, image_url: str) -> OCRResult:
        sample_text = """\
PHIẾU NHẬP HÀNG
Nhà cung cấp: Nhà phân phối ABC
Ngày nhập: 19/05/2026
SĐT: 0901-234-567

STT  Tên sản phẩm                Đvt   SL    Đơn giá    HSD
1    Sữa TH True Milk 220ml      hộp   50    8,000      20/08/2026
2    Mì Hảo Hảo tôm chua cay     gói   100   3,200      10/12/2026
3    Cà phê G7 hộp 18 gói        hộp   20    35,000     15/03/2027
4    Coca Cola lon 330ml         lon   80    7,500      30/11/2026

TỔNG TIỀN: 1,520,000đ
"""
        return OCRResult(raw_text=sample_text, confidence=0.95, engine=self.name)
