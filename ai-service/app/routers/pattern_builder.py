"""
AI Pattern Builder Router
Handles AI-assisted pattern generation and modification.
"""

import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.config import settings
from app.models import PatternData, PatternSection, PatternSize, SizingChart, SizingChartMeasurement, GaugeInfo

router = APIRouter()

# Initialize OpenAI client
openai_client = None
if settings.openai_api_key:
    try:
        from openai import OpenAI
        openai_client = OpenAI(api_key=settings.openai_api_key)
    except ImportError:
        pass


class PatternRequirements(BaseModel):
    """User requirements for generating a pattern."""
    garment_type: str  # sweater, hat, socks, etc.
    
    # Measurements
    measurements: dict  # e.g., {"bust_cm": 100, "length_cm": 60}
    
    # Preferences
    style: Optional[str] = None  # "fitted", "relaxed", "oversized"
    ease_cm: Optional[float] = None  # Positive or negative ease
    
    # Construction
    construction: Optional[str] = None  # "top-down", "bottom-up", "seamless"
    
    # Yarn info
    yarn_weight: Optional[str] = None  # "fingering", "dk", "worsted"
    gauge_stitches: Optional[float] = None
    gauge_rows: Optional[float] = None
    
    # Features
    features: List[str] = []  # ["cables", "colorwork", "pockets"]
    
    # Skill level
    skill_level: Optional[str] = None  # "beginner", "intermediate", "advanced"


class PatternModification(BaseModel):
    """Request to modify an existing pattern."""
    pattern: PatternData
    modification_request: str  # Natural language description of what to change
    

class PatternChat(BaseModel):
    """Chat message for interactive pattern building."""
    session_id: str
    message: str
    context: Optional[dict] = None


@router.post("/generate", response_model=PatternData)
async def generate_pattern(requirements: PatternRequirements):
    """
    Generate a new pattern based on user requirements.
    Uses AI to create a complete pattern with row-by-row instructions.
    """
    if not openai_client:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY in environment variables."
        )
    
    try:
        # Build prompt for pattern generation
        system_prompt = """You are an expert knitting pattern designer. Generate complete, accurate knitting patterns based on user requirements.

Return a JSON object with this structure:
{
    "title": "Pattern name",
    "description": "Brief description of the pattern",
    "craft_type": "knitting",
    "garment_type": "sweater", "hat", "socks", "mittens", "shawl", etc.,
    "difficulty": "beginner", "easy", "intermediate", "advanced", or "expert",
    "gauge": {
        "stitches_per_10cm": number,
        "rows_per_10cm": number,
        "needle_size_mm": number,
        "yarn_weight": "fingering", "dk", "worsted", etc.
    },
    "sizes": ["XS", "S", "M", "L", "XL"] or appropriate sizes for the garment type,
    "sizingChart": {
        "measurements": [
            {
                "label": "Measurement name with unit (e.g., 'Chest (inches)', 'Foot Length (cm)')",
                "key": "unique_key"
            }
        ],
        "sizes": {
            "XS": {
                "measurement_key": "value",
                "measurement_key_cm": "value in cm"
            },
            ...
        }
    },
    "sections": [
        {
            "name": "Section name",
            "section_type": "yoke", "body", "sleeve", etc.,
            "rows": [
                {
                    "row_number": 1,
                    "row_label": "Row 1",
                    "instruction": "Complete instruction text",
                    "stitch_count": number if applicable,
                    "instruction_type": "counted", "measured", "repeat", or "marker",
                    "target_measurement_cm": number if measured,
                    "is_checkpoint": true if good stopping point
                }
            ]
        }
    ],
    "abbreviations": {"k": "knit", "p": "purl", ...},
    "notes": "Any additional notes or tips"
}

SIZING CHART GENERATION:
- Generate appropriate measurements based on garment type:
  * Sweaters/Cardigans: Chest, Length, Sleeve Length, Yoke Depth
  * Socks: Foot Length, Foot Circumference, Cuff Height
  * Mittens: Hand Length, Palm Width, Thumb Length
  * Shawls: Width, Length, Wingspan
  * Hats: Head Circumference, Crown Height, Brim Width
- Include both inches and cm for all measurements
- Generate values for all sizes provided
- Use realistic measurements based on standard sizing

Generate complete, accurate patterns that a knitter can follow step-by-step.
"""
        
        user_prompt = f"""Generate a {requirements.garment_type} knitting pattern with these requirements:

Measurements provided:
{json.dumps(requirements.measurements, indent=2)}

Style: {requirements.style or 'standard'}
Ease: {requirements.ease_cm or 0}cm
Construction: {requirements.construction or 'standard'}
Yarn Weight: {requirements.yarn_weight or 'worsted'}
Gauge: {requirements.gauge_stitches or 'not specified'} sts × {requirements.gauge_rows or 'not specified'} rows per 10cm
Features: {', '.join(requirements.features) if requirements.features else 'none'}
Skill Level: {requirements.skill_level or 'intermediate'}

Generate a complete pattern with:
1. All necessary sections (cast on, body, finishing, etc.)
2. Row-by-row instructions
3. Complete sizing chart with all relevant measurements
4. Clear abbreviations
5. Helpful notes

Make sure the pattern is accurate and follows standard knitting conventions.
"""
        
        response = openai_client.chat.completions.create(
            model=settings.ai_model,
            temperature=settings.ai_temperature,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Convert to PatternData model
        sizing_chart = None
        if result.get("sizingChart"):
            sc_data = result["sizingChart"]
            measurements = [
                SizingChartMeasurement(**m) for m in sc_data.get("measurements", [])
            ]
            sizing_chart = SizingChart(
                measurements=measurements,
                sizes=sc_data.get("sizes", {})
            )
        
        # Convert sizes
        sizes_list = result.get("sizes", [])
        if sizes_list and isinstance(sizes_list[0], str):
            sizes = [PatternSize(name=s, display_order=i) for i, s in enumerate(sizes_list)]
        else:
            sizes = [PatternSize(**s) if isinstance(s, dict) else PatternSize(name=str(s), display_order=i) for i, s in enumerate(sizes_list)]
        
        # Convert gauge
        gauge = None
        if result.get("gauge"):
            gauge = GaugeInfo(**result["gauge"])
        
        # Convert sections
        from app.services.pattern_parser import PatternParser
        parser = PatternParser()
        sections = [parser._parse_section(s) for s in result.get("sections", [])]
        
        pattern = PatternData(
            title=result.get("title", "Generated Pattern"),
            description=result.get("description"),
            craft_type=result.get("craft_type", "knitting"),
            garment_type=result.get("garment_type"),
            difficulty=result.get("difficulty"),
            gauge=gauge,
            sizes=sizes,
            sizingChart=sizing_chart,
            sections=sections,
            abbreviations=result.get("abbreviations", {}),
            notes=result.get("notes"),
            parsing_confidence=0.9
        )
        
        return pattern
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate pattern: {str(e)}"
        )


@router.post("/modify", response_model=PatternData)
async def modify_pattern(modification: PatternModification):
    """
    Modify an existing pattern based on user request.
    Examples: "add pockets", "make sleeves longer", "resize for larger gauge"
    """
    # TODO: Implement AI pattern modification
    raise HTTPException(
        status_code=501,
        detail="Pattern modification is coming soon!"
    )


@router.post("/resize", response_model=PatternData)
async def resize_pattern(
    pattern: PatternData,
    new_gauge_stitches: float,
    new_gauge_rows: float,
    target_size: Optional[str] = None
):
    """
    Resize a pattern for a different gauge.
    Recalculates stitch counts and row counts based on new gauge.
    """
    # TODO: Implement pattern resizing logic
    raise HTTPException(
        status_code=501,
        detail="Pattern resizing is coming soon!"
    )


@router.post("/chat")
async def pattern_chat(chat: PatternChat):
    """
    Interactive chat for building patterns step by step.
    Allows back-and-forth conversation to refine pattern requirements.
    """
    # TODO: Implement interactive pattern building chat
    return {
        "session_id": chat.session_id,
        "response": "Pattern building chat is coming soon! What kind of project would you like to make?",
        "suggestions": [
            "A cozy sweater",
            "Simple socks",
            "A warm hat",
            "A baby blanket"
        ]
    }


@router.get("/templates")
async def get_pattern_templates():
    """
    Get available pattern templates as starting points.
    """
    return {
        "templates": [
            {
                "id": "basic-sweater",
                "name": "Basic Raglan Sweater",
                "description": "A simple top-down raglan sweater, perfect for beginners",
                "garment_type": "sweater",
                "difficulty": "beginner"
            },
            {
                "id": "simple-socks",
                "name": "Simple Socks",
                "description": "Classic cuff-down socks with heel flap",
                "garment_type": "socks",
                "difficulty": "intermediate"
            },
            {
                "id": "basic-hat",
                "name": "Basic Beanie",
                "description": "A ribbed beanie with decreases at the crown",
                "garment_type": "hat",
                "difficulty": "beginner"
            }
        ]
    }


