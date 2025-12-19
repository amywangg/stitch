"""
PDF Pattern Parser Router
Handles uploading and parsing PDF knitting patterns.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Query
from typing import Optional
import uuid
import time

from app.models import ParsedPDFResult, PatternData
from app.services.pdf_service import PDFService
from app.services.pattern_parser import PatternParser

router = APIRouter()
pdf_service = PDFService()
pattern_parser = PatternParser()


@router.post("/upload", response_model=dict)
async def upload_pdf(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Upload a PDF pattern for processing.
    Returns a job ID that can be used to check processing status.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Read file content
    content = await file.read()
    
    # TODO: Save to storage and queue for processing
    # For now, we'll process synchronously
    
    return {
        "job_id": job_id,
        "filename": file.filename,
        "status": "queued",
        "message": "PDF uploaded successfully. Processing will begin shortly."
    }


@router.post("/parse", response_model=ParsedPDFResult)
async def parse_pdf(
    file: UploadFile = File(...), 
    check_cache: bool = Query(True, description="Check for cached patterns before parsing")
):
    """
    Parse a PDF pattern and extract structured data.
    This processes the PDF synchronously and returns the parsed pattern.
    
    If check_cache is True, will first check for an existing cached pattern
    with the same title, designer, and shop name.
    """
    import asyncio
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    content = await file.read()
    start_time = time.time()
    
    # Extract text from PDF
    extraction_result = await pdf_service.extract_text(content)
    
    if not extraction_result["success"]:
        return ParsedPDFResult(
            success=False,
            errors=extraction_result.get("errors", ["Failed to extract text from PDF"]),
            page_count=extraction_result.get("page_count", 0),
            processing_time_seconds=time.time() - start_time
        )
    
    # Quick extraction of title/designer/shop for cache lookup (before full parsing)
    if check_cache:
        try:
            # Extract basic info for cache lookup (fast, minimal AI call)
            quick_info = await pattern_parser.extract_basic_info(extraction_result["text"])
            
            if quick_info and quick_info.get("title"):
                # Check if we have a cached pattern
                cached_pattern = await pattern_parser.find_cached_pattern(
                    title=quick_info.get("title"),
                    designer=quick_info.get("designer"),
                    shop_name=quick_info.get("shop_name")
                )
                
                if cached_pattern:
                    # Return cached pattern instead of re-parsing - saves time and API costs!
                    print(f"[CACHE HIT] Using cached pattern: {quick_info.get('title')}")
                    return ParsedPDFResult(
                        success=True,
                        pattern=cached_pattern,
                        raw_text=extraction_result["text"],
                        page_count=extraction_result.get("page_count", 0),
                        warnings=["Using cached pattern - no re-parsing needed. Pattern was previously parsed and is unedited."],
                        processing_time_seconds=time.time() - start_time
                    )
                else:
                    print(f"[CACHE MISS] No cached pattern found for: {quick_info.get('title')}")
        except Exception as e:
            # If cache lookup fails, continue with normal parsing
            print(f"Cache lookup failed, continuing with normal parse: {e}")
    
    # Parse the extracted text into structured pattern data with timeout
    try:
        # Wrap in asyncio.wait_for to add overall timeout (5 minutes for complex patterns)
        parsed_pattern = await asyncio.wait_for(
            pattern_parser.parse_pattern_text(
                extraction_result["text"],
                extraction_result.get("page_count", 0)
            ),
            timeout=300.0  # 5 minute overall timeout for complex patterns
        )
    except asyncio.TimeoutError:
        return ParsedPDFResult(
            success=False,
            errors=["Parsing timed out after 5 minutes. The PDF might be too large or complex. Try a smaller file or contact support."],
            page_count=extraction_result.get("page_count", 0)
        )
    
    return parsed_pattern


@router.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """
    Check the status of a PDF processing job.
    """
    # TODO: Implement job status tracking
    return {
        "job_id": job_id,
        "status": "completed",  # or "processing", "failed"
        "progress": 100
    }


@router.get("/result/{job_id}", response_model=ParsedPDFResult)
async def get_job_result(job_id: str):
    """
    Get the result of a completed PDF processing job.
    """
    # TODO: Implement result retrieval from database
    raise HTTPException(status_code=404, detail="Job not found")


