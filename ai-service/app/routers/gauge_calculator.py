"""
Gauge Calculator Router
Handles gauge-related calculations including measurement-to-row conversions.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

from app.models import MeasurementConversion

router = APIRouter()


class GaugeInput(BaseModel):
    """Input for gauge calculations."""
    stitches_per_10cm: float
    rows_per_10cm: float


class MeasurementToRowsRequest(BaseModel):
    """Request to convert a measurement to estimated rows."""
    target_cm: float
    rows_per_10cm: float
    instruction: Optional[str] = None
    check_interval_cm: float = 2.0  # How often to suggest measuring


class RowsToMeasurementRequest(BaseModel):
    """Request to convert rows to estimated measurement."""
    row_count: int
    rows_per_10cm: float


class GaugeComparisonRequest(BaseModel):
    """Compare pattern gauge to user's gauge."""
    pattern_stitches: float
    pattern_rows: float
    user_stitches: float
    user_rows: float


@router.post("/measurement-to-rows", response_model=MeasurementConversion)
async def measurement_to_rows(request: MeasurementToRowsRequest):
    """
    Convert a measurement (e.g., "knit for 2cm") to estimated row count.
    
    This is used when patterns specify length in measurements rather than row counts.
    Returns the estimated rows and checkpoints for when to measure.
    """
    conversion = MeasurementConversion.from_gauge(
        instruction=request.instruction or f"Knit for {request.target_cm}cm",
        target_cm=request.target_cm,
        rows_per_10cm=request.rows_per_10cm,
        check_interval_cm=request.check_interval_cm
    )
    return conversion


@router.post("/rows-to-measurement")
async def rows_to_measurement(request: RowsToMeasurementRequest):
    """
    Convert a row count to estimated measurement.
    """
    rows_per_cm = request.rows_per_10cm / 10
    estimated_cm = request.row_count / rows_per_cm
    
    return {
        "row_count": request.row_count,
        "estimated_cm": round(estimated_cm, 1),
        "estimated_inches": round(estimated_cm / 2.54, 1),
        "rows_per_cm": round(rows_per_cm, 2)
    }


@router.post("/compare-gauge")
async def compare_gauge(request: GaugeComparisonRequest):
    """
    Compare pattern gauge to user's gauge and calculate adjustments.
    """
    stitch_ratio = request.user_stitches / request.pattern_stitches
    row_ratio = request.user_rows / request.pattern_rows
    
    # Calculate needle size suggestions
    needs_larger_needle = stitch_ratio > 1.05  # User has more stitches = too tight
    needs_smaller_needle = stitch_ratio < 0.95  # User has fewer stitches = too loose
    
    return {
        "stitch_difference_percent": round((stitch_ratio - 1) * 100, 1),
        "row_difference_percent": round((row_ratio - 1) * 100, 1),
        "gauge_matches": abs(stitch_ratio - 1) < 0.05 and abs(row_ratio - 1) < 0.05,
        "recommendation": (
            "Try larger needles" if needs_larger_needle else
            "Try smaller needles" if needs_smaller_needle else
            "Gauge matches well!"
        ),
        "notes": (
            "Row gauge is often less critical than stitch gauge. "
            "Focus on matching stitch gauge first."
            if abs(row_ratio - 1) > abs(stitch_ratio - 1)
            else None
        )
    }


@router.post("/calculate-adjustments")
async def calculate_adjustments(
    pattern_gauge: GaugeInput,
    user_gauge: GaugeInput,
    pattern_stitches: int,
    pattern_rows: int
):
    """
    Calculate adjusted stitch and row counts for user's gauge.
    
    This is useful when a user can't match the pattern gauge and needs
    to know how to adjust the pattern.
    """
    stitch_ratio = user_gauge.stitches_per_10cm / pattern_gauge.stitches_per_10cm
    row_ratio = user_gauge.rows_per_10cm / pattern_gauge.rows_per_10cm
    
    adjusted_stitches = round(pattern_stitches * stitch_ratio)
    adjusted_rows = round(pattern_rows * row_ratio)
    
    return {
        "original_stitches": pattern_stitches,
        "adjusted_stitches": adjusted_stitches,
        "stitch_change": adjusted_stitches - pattern_stitches,
        "original_rows": pattern_rows,
        "adjusted_rows": adjusted_rows,
        "row_change": adjusted_rows - pattern_rows,
        "notes": (
            f"With your gauge, you'll need {adjusted_stitches} stitches "
            f"(instead of {pattern_stitches}) to achieve the same width."
        )
    }


@router.get("/standard-gauges")
async def get_standard_gauges():
    """
    Get standard gauge ranges for different yarn weights.
    Useful for estimating gauge when no swatch info is available.
    """
    return {
        "gauges": [
            {
                "weight": "Lace",
                "stitches_range": [32, 40],
                "rows_range": [40, 52],
                "needle_mm_range": [1.5, 2.25]
            },
            {
                "weight": "Fingering",
                "stitches_range": [27, 32],
                "rows_range": [36, 44],
                "needle_mm_range": [2.25, 3.25]
            },
            {
                "weight": "Sport",
                "stitches_range": [23, 26],
                "rows_range": [30, 38],
                "needle_mm_range": [3.25, 3.75]
            },
            {
                "weight": "DK",
                "stitches_range": [21, 24],
                "rows_range": [28, 34],
                "needle_mm_range": [3.75, 4.5]
            },
            {
                "weight": "Worsted",
                "stitches_range": [16, 20],
                "rows_range": [22, 28],
                "needle_mm_range": [4.5, 5.5]
            },
            {
                "weight": "Bulky",
                "stitches_range": [12, 15],
                "rows_range": [16, 22],
                "needle_mm_range": [5.5, 8.0]
            },
            {
                "weight": "Super Bulky",
                "stitches_range": [7, 11],
                "rows_range": [10, 16],
                "needle_mm_range": [8.0, 12.75]
            }
        ],
        "note": "These are typical ranges. Always swatch to confirm your gauge!"
    }


