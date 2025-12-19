"""
Pydantic models for pattern data structures.
These models define the structured format that PDF patterns are converted into.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class RowInstructionType(str, Enum):
    """Type of row instruction for smart UI display."""
    COUNTED = "counted"      # Specific row count
    MEASURED = "measured"    # Measurement-based (e.g., "knit for 2cm")
    REPEAT = "repeat"        # Repeat instruction
    MARKER = "marker"        # Checkpoint/reminder


class SectionType(str, Enum):
    """Types of garment sections."""
    BODY = "body"
    SLEEVE = "sleeve"
    COLLAR = "collar"
    CUFF = "cuff"
    HEM = "hem"
    YOKE = "yoke"
    POCKET = "pocket"
    HOOD = "hood"
    OTHER = "other"


class GaugeInfo(BaseModel):
    """Gauge/tension information from a pattern."""
    stitches_per_10cm: Optional[float] = None
    rows_per_10cm: Optional[float] = None
    needle_size_mm: Optional[float] = None
    hook_size_mm: Optional[float] = None
    yarn_weight: Optional[str] = None
    notes: Optional[str] = None


class PatternRow(BaseModel):
    """A single row instruction from a pattern - consistent structure across all parses."""
    row_number: int
    row_label: Optional[str] = None  # e.g. "Cast on", "Rows 1-10", "Rnd 3", "Next row"
    instruction: str  # Full plain-language instruction specific to the size
    stitch_counts: Optional[str] = None  # e.g. "You should have 64 sts." (as string for flexibility)
    notes: Optional[str] = None  # Any helpful clarifications, e.g. "work even in stockinette"
    
    # Repeat/recurring pattern support
    is_repeat_start: bool = False  # True if this row starts a repeat group
    is_repeat_end: bool = False  # True if this row ends a repeat group
    repeat_count: Optional[int] = None  # Number of times to repeat (e.g., 8 for "repeat 8 times")
    repeat_group_id: Optional[str] = None  # Unique ID for grouping repeated rows together
    
    # Legacy fields for backward compatibility
    stitch_count: Optional[int] = None  # Deprecated: use stitch_counts instead
    
    # Instruction type for smart display
    instruction_type: RowInstructionType = RowInstructionType.COUNTED
    
    # For measurement-based instructions
    target_measurement_cm: Optional[float] = None
    estimated_rows: Optional[int] = None
    measure_every_n_rows: Optional[int] = None
    measurement_notes: Optional[str] = None
    
    # For repeat instructions (legacy)
    repeat_from_row: Optional[int] = None
    repeat_until_condition: Optional[str] = None
    
    # Checkpoints
    is_checkpoint: bool = False
    checkpoint_message: Optional[str] = None


class PatternSection(BaseModel):
    """A section of the pattern (e.g., body, sleeves)."""
    name: str
    section_type: SectionType = SectionType.OTHER
    display_order: int = 0
    instructions: Optional[str] = None  # General instructions for this section
    rows: List[PatternRow] = []
    notes: Optional[str] = None


class PatternSize(BaseModel):
    """Size information for a pattern."""
    name: str  # "XS", "S", "M", etc.
    display_order: int = 0
    
    # Body measurements (cm)
    bust_cm: Optional[float] = None
    waist_cm: Optional[float] = None
    hip_cm: Optional[float] = None
    
    # Finished measurements (cm)
    finished_bust_cm: Optional[float] = None
    finished_length_cm: Optional[float] = None
    finished_sleeve_cm: Optional[float] = None
    
    # Yarn required
    yarn_meters: Optional[int] = None


class SizingChartMeasurement(BaseModel):
    """A measurement type in a sizing chart."""
    label: str  # e.g., "Chest (inches)", "Foot Length (cm)"
    key: str    # e.g., "chest", "footLength"


class SizingChart(BaseModel):
    """Sizing chart with flexible measurements for any item type."""
    measurements: List[SizingChartMeasurement] = []
    sizes: dict = {}  # { "XS": {"chest": "32", "chestCm": "81", ...}, ... }


class PatternData(BaseModel):
    """Complete parsed pattern data."""
    title: str
    description: Optional[str] = None
    designer: Optional[str] = None  # Original pattern designer/creator (e.g., "petiteknits")
    
    # Source and purchase information
    purchase_url: Optional[str] = None  # URL where users can buy the pattern
    shop_name: Optional[str] = None  # e.g., "Ravelry", "Etsy", "LoveCrafts"
    store_name: Optional[str] = None  # Alternative store identifier
    source_platform: Optional[str] = None  # 'ravelry', 'etsy', 'lovecrafts', 'direct', 'other'
    ravelry_pattern_id: Optional[int] = None  # Ravelry pattern ID if available
    etsy_listing_id: Optional[str] = None  # Etsy listing ID if available
    
    # Copyright and redistribution rights
    has_copyright_protection: Optional[bool] = None  # True if pattern has copyright/disclaimer text
    copyright_text: Optional[str] = None  # Extracted copyright/disclaimer text
    
    # Pattern metadata
    craft_type: str = "knitting"  # "knitting" or "crochet"
    garment_type: Optional[str] = None
    difficulty: Optional[str] = None
    
    # Gauge
    gauge: Optional[GaugeInfo] = None
    
    # Sizes
    sizes: List[PatternSize] = []
    
    # Sizing chart (flexible measurements for any item type)
    sizingChart: Optional[SizingChart] = None
    
    # Sections with row-by-row instructions
    sections: List[PatternSection] = []
    
    # General notes
    abbreviations: Optional[dict] = None
    notes: Optional[str] = None
    
    # AI parsing metadata
    parsing_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    parsing_notes: Optional[str] = None


class ParsedPDFResult(BaseModel):
    """Result of parsing a PDF pattern."""
    success: bool
    pattern: Optional[PatternData] = None
    raw_text: Optional[str] = None
    page_count: int = 0
    errors: List[str] = []
    warnings: List[str] = []
    processing_time_seconds: float = 0.0


class MeasurementConversion(BaseModel):
    """
    Conversion of a measurement-based instruction to row counts.
    Used when pattern says "knit for 2cm" and we need to calculate rows.
    """
    original_instruction: str
    target_measurement_cm: float
    
    # Calculated based on gauge
    estimated_rows: int
    rows_per_cm: float
    
    # Measurement checkpoints
    measure_at_rows: List[int] = []
    
    # Confidence and notes
    confidence: float = 0.8
    notes: Optional[str] = None
    
    @classmethod
    def from_gauge(
        cls,
        instruction: str,
        target_cm: float,
        rows_per_10cm: float,
        check_interval_cm: float = 2.0
    ) -> "MeasurementConversion":
        """
        Create a measurement conversion from gauge information.
        
        Args:
            instruction: Original pattern instruction
            target_cm: Target measurement in centimeters
            rows_per_10cm: Gauge rows per 10cm
            check_interval_cm: How often to suggest measuring (default 2cm)
        
        Returns:
            MeasurementConversion with calculated row estimates
        """
        rows_per_cm = rows_per_10cm / 10
        estimated_rows = round(target_cm * rows_per_cm)
        
        # Calculate measurement checkpoints
        rows_per_check = round(check_interval_cm * rows_per_cm)
        checkpoints = []
        for row in range(rows_per_check, estimated_rows, rows_per_check):
            checkpoints.append(row)
        
        # Add checkpoint at 80% if not already included
        near_end = round(estimated_rows * 0.8)
        if near_end not in checkpoints and near_end < estimated_rows:
            checkpoints.append(near_end)
            checkpoints.sort()
        
        return cls(
            original_instruction=instruction,
            target_measurement_cm=target_cm,
            estimated_rows=estimated_rows,
            rows_per_cm=rows_per_cm,
            measure_at_rows=checkpoints,
            notes=f"Based on gauge of {rows_per_10cm} rows/10cm. Measure every ~{check_interval_cm}cm ({rows_per_check} rows)."
        )


