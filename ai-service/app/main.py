"""
Stitch AI Service
FastAPI application for PDF pattern parsing, translation, and AI-assisted pattern building.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import pdf_parser, pattern_builder, gauge_calculator
from app.config import settings

app = FastAPI(
    title="Stitch AI Service",
    description="AI-powered pattern parsing and building for knitting applications",
    version="0.1.0",
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "service": "Stitch AI Service",
        "version": "0.1.0",
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Include routers
app.include_router(pdf_parser.router, prefix="/api/pdf", tags=["PDF Parser"])
app.include_router(pattern_builder.router, prefix="/api/pattern", tags=["Pattern Builder"])
app.include_router(gauge_calculator.router, prefix="/api/gauge", tags=["Gauge Calculator"])


