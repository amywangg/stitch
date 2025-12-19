"""
PDF Service
Handles PDF text extraction and processing.
"""

import io
import time
from typing import Optional
import pdfplumber
from PyPDF2 import PdfReader

from app.config import settings


class PDFService:
    """Service for extracting text and data from PDF files."""
    
    async def extract_text(self, pdf_content: bytes) -> dict:
        """
        Extract text from a PDF file.
        
        Uses pdfplumber for better text extraction, falls back to PyPDF2.
        Can optionally use OCR for scanned PDFs.
        
        Args:
            pdf_content: Raw bytes of the PDF file
            
        Returns:
            Dictionary with extracted text and metadata
        """
        start_time = time.time()
        errors = []
        warnings = []
        
        try:
            # Try pdfplumber first (better for structured text)
            text, page_count = await self._extract_with_pdfplumber(pdf_content)
            
            # If very little text extracted, PDF might be scanned
            if len(text.strip()) < 100:
                warnings.append("Very little text extracted. PDF may be image-based.")
                
                if settings.enable_ocr:
                    # Try OCR extraction
                    ocr_text = await self._extract_with_ocr(pdf_content)
                    if len(ocr_text) > len(text):
                        text = ocr_text
                        warnings.append("Used OCR to extract text from images.")
            
            return {
                "success": True,
                "text": text,
                "page_count": page_count,
                "processing_time": time.time() - start_time,
                "warnings": warnings
            }
            
        except Exception as e:
            errors.append(f"Failed to extract text: {str(e)}")
            
            # Try PyPDF2 as fallback
            try:
                text, page_count = await self._extract_with_pypdf2(pdf_content)
                return {
                    "success": True,
                    "text": text,
                    "page_count": page_count,
                    "processing_time": time.time() - start_time,
                    "warnings": ["Used fallback PDF reader"],
                    "errors": errors
                }
            except Exception as e2:
                errors.append(f"Fallback extraction also failed: {str(e2)}")
                return {
                    "success": False,
                    "text": "",
                    "page_count": 0,
                    "processing_time": time.time() - start_time,
                    "errors": errors
                }
    
    async def _extract_with_pdfplumber(self, pdf_content: bytes) -> tuple[str, int]:
        """Extract text using pdfplumber."""
        text_parts = []
        
        with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
            page_count = len(pdf.pages)
            
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text() or ""
                
                # Also try to extract tables
                tables = page.extract_tables()
                table_text = ""
                for table in tables:
                    for row in table:
                        if row:
                            table_text += " | ".join(str(cell or "") for cell in row) + "\n"
                
                text_parts.append(f"--- Page {i + 1} ---\n{page_text}\n{table_text}")
        
        return "\n".join(text_parts), page_count
    
    async def _extract_with_pypdf2(self, pdf_content: bytes) -> tuple[str, int]:
        """Extract text using PyPDF2 as fallback."""
        reader = PdfReader(io.BytesIO(pdf_content))
        page_count = len(reader.pages)
        
        text_parts = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            text_parts.append(f"--- Page {i + 1} ---\n{page_text}")
        
        return "\n".join(text_parts), page_count
    
    async def _extract_with_ocr(self, pdf_content: bytes) -> str:
        """
        Extract text using OCR for image-based PDFs.
        Requires pdf2image and pytesseract.
        """
        try:
            from pdf2image import convert_from_bytes
            import pytesseract
            
            # Convert PDF pages to images
            images = convert_from_bytes(pdf_content, dpi=300)
            
            text_parts = []
            for i, image in enumerate(images):
                # Run OCR on each page image
                page_text = pytesseract.image_to_string(image)
                text_parts.append(f"--- Page {i + 1} (OCR) ---\n{page_text}")
            
            return "\n".join(text_parts)
            
        except ImportError:
            return ""
        except Exception:
            return ""
    
    async def extract_images(self, pdf_content: bytes) -> list[bytes]:
        """
        Extract images from a PDF file.
        Useful for pattern charts and diagrams.
        """
        images = []
        
        try:
            with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
                for page in pdf.pages:
                    for img in page.images:
                        # Extract image data
                        # This is a simplified version - real implementation
                        # would need to handle different image formats
                        pass
        except Exception:
            pass
        
        return images


