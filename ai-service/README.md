# Stitch AI Service

Python-based AI service for PDF pattern parsing and AI-assisted pattern building.

## Features

- **PDF Pattern Parsing**: Extract structured pattern data from PDF files
- **Measurement Conversion**: Convert "knit for 2cm" to row counts based on gauge
- **Gauge Calculator**: Compare gauges and calculate adjustments
- **Pattern Builder**: (Coming soon) AI-assisted pattern generation

## Setup

### 1. Create Virtual Environment

```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Create a `.env` file with the following variables:

```
# Required for AI features
OPENAI_API_KEY=sk-your-key-here

# Database
DATABASE_URL=postgresql://stitch:stitch_dev_password@localhost:5432/stitch

# Optional
AI_MODEL=gpt-4-turbo-preview
ENABLE_OCR=true
```

### 4. Run the Service

```bash
uvicorn app.main:app --reload --port 8001
```

The API will be available at `http://localhost:8001`

## API Endpoints

### PDF Parser

- `POST /api/pdf/upload` - Upload a PDF for processing
- `POST /api/pdf/parse` - Parse a PDF and return structured data
- `GET /api/pdf/status/{job_id}` - Check processing status
- `GET /api/pdf/result/{job_id}` - Get processing result

### Gauge Calculator

- `POST /api/gauge/measurement-to-rows` - Convert measurement to row count
- `POST /api/gauge/rows-to-measurement` - Convert rows to measurement
- `POST /api/gauge/compare-gauge` - Compare pattern vs user gauge
- `POST /api/gauge/calculate-adjustments` - Calculate stitch/row adjustments
- `GET /api/gauge/standard-gauges` - Get standard gauge ranges

### Pattern Builder

- `POST /api/pattern/generate` - Generate a new pattern (coming soon)
- `POST /api/pattern/modify` - Modify existing pattern (coming soon)
- `POST /api/pattern/resize` - Resize pattern for different gauge
- `POST /api/pattern/chat` - Interactive pattern building
- `GET /api/pattern/templates` - Get available templates

## Development

### Running Tests

```bash
pytest
```

### API Documentation

When running, visit:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`


