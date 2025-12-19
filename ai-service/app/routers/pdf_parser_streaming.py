"""
Streaming PDF Pattern Parser Router
Handles progressive parsing with streaming results.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
import json
import asyncio
from typing import AsyncGenerator

from app.models import ParsedPDFResult, PatternData
from app.services.pdf_service import PDFService
from app.services.pattern_parser import PatternParser

router = APIRouter()
pdf_service = PDFService()
pattern_parser = PatternParser()


async def stream_parse_results(
    text: str,
    page_count: int
) -> AsyncGenerator[str, None]:
    """
    Stream parsing results as they become available.
    First sends sizes, then sections one by one.
    """
    try:
        # Step 1: Parse sizes first (fast)
        sizes_payload = await pattern_parser._parse_sizes_only(text)
        
        # Send initial result with sizes
        initial_result = {
            "status": "sizes_ready",
            "pattern": {
                "title": sizes_payload.get("pattern_title", "Untitled Pattern"),
                "designer": sizes_payload.get("designer"),
                "sizes": sizes_payload.get("sizes", []),
                "gauge": sizes_payload.get("gauge", {}),
                "craft_type": sizes_payload.get("craft_type", "knitting"),
                "garment_type": sizes_payload.get("garment_type"),
                "difficulty": sizes_payload.get("difficulty"),
                "sections": []  # Will be added progressively
            }
        }
        yield f"data: {json.dumps(initial_result)}\n\n"
        
        # Step 2: Parse instructions for first size (most common use case)
        if sizes_payload.get("sizes"):
            chosen_size = sizes_payload["sizes"][0]
            instructions_payload = await pattern_parser._parse_instructions_for_size(text, chosen_size)
            
            # Convert to sections
            sections = []
            for section_data in instructions_payload.get("sections", []):
                sections.append({
                    "name": section_data.get("section_name", "Section"),
                    "section_type": "other",
                    "display_order": len(sections),
                    "rows": [
                        {
                            "row_number": idx + 1,
                            "row_label": step.get("row_label"),
                            "instruction": step.get("instruction", ""),
                            "stitch_counts": step.get("stitch_counts"),
                            "notes": step.get("notes"),
                            "is_repeat_start": step.get("is_repeat_start", False),
                            "is_repeat_end": step.get("is_repeat_end", False),
                            "repeat_count": step.get("repeat_count"),
                        }
                        for idx, step in enumerate(section_data.get("steps", []))
                    ]
                })
                
                # Send each section as it's ready
                section_update = {
                    "status": "section_ready",
                    "section": sections[-1],
                    "section_index": len(sections) - 1
                }
                yield f"data: {json.dumps(section_update)}\n\n"
            
            # Send completion
            completion = {
                "status": "complete",
                "total_sections": len(sections)
            }
            yield f"data: {json.dumps(completion)}\n\n"
            
    except Exception as e:
        error_result = {
            "status": "error",
            "error": str(e)
        }
        yield f"data: {json.dumps(error_result)}\n\n"


@router.post("/parse-stream")
async def parse_pdf_stream(file: UploadFile = File(...)):
    """
    Parse a PDF pattern with streaming results.
    Returns Server-Sent Events (SSE) stream with progressive updates.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    content = await file.read()
    
    # Extract text from PDF
    extraction_result = await pdf_service.extract_text(content)
    
    if not extraction_result["success"]:
        async def error_stream():
            yield f"data: {json.dumps({'status': 'error', 'error': 'Failed to extract text from PDF'})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")
    
    # Stream parsing results
    return StreamingResponse(
        stream_parse_results(
            extraction_result["text"],
            extraction_result.get("page_count", 0)
        ),
        media_type="text/event-stream"
    )


