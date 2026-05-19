# OCR Service

Microservice OCR cho Smart MiniMart AI. Cấu trúc:
- `app/main.py` — FastAPI entrypoint
- `app/engines/` — OCR engine adapters (mock, paddleocr, easyocr, tesseract)
- `app/parsers/` — Logic chuyển raw text -> structured items (fallback nếu LLM lỗi)
- `samples/` — Ảnh phiếu nhập hàng mẫu cho demo

## Run

```bash
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r requirements.txt
uvicorn app.main:app --port 5001 --reload
```

## API

- `POST /ocr/parse` — body `{image_url, engine}` → `{raw_text, items[], confidence, engine}`
- `GET /health` — health check
- `GET /engines` — list engines available

## Engines

| Engine        | Status | Notes                                    |
|---------------|--------|------------------------------------------|
| mock          | always | trả ảnh mẫu fixed cho demo               |
| paddle_ocr    | optional | bỏ comment trong requirements.txt      |
| easy_ocr      | optional |                                       |
| tesseract     | optional | cần cài Tesseract binary               |
| google_vision | future |                                         |
| llm_vision    | future | qua AI Gateway                          |
