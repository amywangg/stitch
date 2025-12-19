"""
Pattern Parser Service
Uses AI to parse extracted PDF text into structured pattern data.
Uses a two-step approach: first extract sizes, then generate size-specific instructions.
"""

import json
import re
import time
import uuid
from typing import Optional, Dict, Any, List

from app.config import settings
from app.models import (
    ParsedPDFResult,
    PatternData,
    PatternSection,
    PatternRow,
    PatternSize,
    GaugeInfo,
    RowInstructionType,
    MeasurementConversion,
    SizingChart,
    SizingChartMeasurement,
)


# Common knitting abbreviations
KNITTING_ABBREVIATIONS = {
    "k": "knit",
    "p": "purl",
    "st": "stitch",
    "sts": "stitches",
    "yo": "yarn over",
    "k2tog": "knit 2 together",
    "ssk": "slip slip knit",
    "sl": "slip",
    "pm": "place marker",
    "sm": "slip marker",
    "co": "cast on",
    "bo": "bind off",
    "rs": "right side",
    "ws": "wrong side",
    "inc": "increase",
    "dec": "decrease",
    "rep": "repeat",
    "rnd": "round",
    "rnds": "rounds",
    "kfb": "knit front and back",
    "pfb": "purl front and back",
    "m1l": "make 1 left",
    "m1r": "make 1 right",
}


def _strip_code_fences(content: str) -> str:
    """Remove markdown code fences like ```json ... ``` if the model adds them."""
    content = content.strip()
    if content.startswith("```"):
        content = content.strip("`").strip()
        if content.lower().startswith("json"):
            content = content[4:].strip()
    return content


def _call_llm_json_with_retries(
    client,
    system_prompt: str,
    user_prompt: str,
    model: str,
    max_retries: int = 2,
) -> Dict[str, Any]:
    """
    Call the LLM and get back valid JSON with retries.
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    last_raw_response: Optional[str] = None

    for attempt in range(max_retries):
        try:
            # Add timeout to prevent hanging (90 seconds total)
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.1,
                response_format={"type": "json_object"},
                timeout=90.0  # 90 seconds timeout
            )
            content = response.choices[0].message.content
            last_raw_response = content
            content = _strip_code_fences(content)

            try:
                data = json.loads(content)
                return data
            except json.JSONDecodeError as e:
                if attempt == max_retries - 1:
                    print(f"ERROR: Could not parse JSON after {max_retries} retries")
                    raise e

                # Ask the model to fix its JSON
                messages.append({"role": "assistant", "content": last_raw_response})
                messages.append({
                    "role": "user",
                    "content": (
                        "Your previous reply was not valid JSON. "
                        "Please respond again with ONLY a valid JSON object (no code fences, no commentary)."
                    ),
                })
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            continue

    raise RuntimeError("Unexpected JSON parsing loop exit")


class PatternParser:
    """Service for parsing pattern text into structured data using two-step LLM approach."""
    
    def __init__(self):
        self.openai_client = None
        self.db_pool = None
        if settings.openai_api_key:
            try:
                from openai import OpenAI
                # Initialize with timeout settings
                self.openai_client = OpenAI(
                    api_key=settings.openai_api_key,
                    timeout=90.0,  # 90 second timeout for all requests
                    max_retries=2
                )
            except ImportError:
                pass
        
        # Initialize database connection for cache lookups
        try:
            import asyncpg
            # Will be initialized lazily when needed
            self._db_pool = None
        except ImportError:
            pass
    
    async def _get_db_pool(self):
        """Lazy initialization of database connection pool."""
        if self._db_pool is None:
            try:
                import asyncpg
                database_url = getattr(settings, 'database_url', 'postgresql://stitch:stitch_dev_password@localhost:5432/stitch')
                # asyncpg uses postgresql:// directly, but we need to parse it
                # Format: postgresql://user:password@host:port/database
                self._db_pool = await asyncpg.create_pool(database_url, min_size=1, max_size=5)
            except Exception as e:
                print(f"Failed to create database pool: {e}")
                return None
        return self._db_pool
    
    async def extract_basic_info(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Quick extraction of title, designer, and shop name for cache lookup.
        Uses a minimal prompt to extract just these fields.
        """
        if not self.openai_client:
            return None
        
        # Limit text for speed (first 10k chars should have title/designer)
        text_snippet = text[:10000]
        
        prompt = """Extract ONLY the pattern title, designer name, and shop name from this knitting pattern text.

Return JSON:
{
  "title": string | null,
  "designer": string | null,
  "shop_name": string | null
}

Text:
""" + text_snippet
        
        try:
            response = self.openai_client.chat.completions.create(
                model=settings.ai_model,
                messages=[
                    {"role": "system", "content": "You are a knitting pattern metadata extractor. Extract only title, designer, and shop name."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
                timeout=30.0
            )
            import json
            result = json.loads(response.choices[0].message.content)
            return result
        except Exception as e:
            print(f"Basic info extraction failed: {e}")
            return None
    
    async def find_cached_pattern(
        self,
        title: Optional[str],
        designer: Optional[str],
        shop_name: Optional[str]
    ) -> Optional[PatternData]:
        """
        Find a cached pattern by title, designer, and shop name.
        Returns the pattern if found and it's original/unedited.
        Uses the backend API instead of direct database access for better separation.
        """
        if not title:
            return None
        
        try:
            import httpx
            backend_url = getattr(settings, 'backend_url', 'http://localhost:3001')
            
            params = {'title': title}
            if designer:
                params['designer'] = designer
            if shop_name:
                params['shopName'] = shop_name
            
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{backend_url}/api/patterns/check-existing",
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and data.get('data', {}).get('exists'):
                        pattern_info = data.get('data', {}).get('pattern')
                        if pattern_info and pattern_info.get('aiParsedData'):
                            # Found cached pattern with parsed data - reconstruct PatternData
                            import json
                            parsed_data = pattern_info['aiParsedData']
                            if isinstance(parsed_data, str):
                                parsed_data = json.loads(parsed_data)
                            
                            try:
                                # Convert stored JSON back to PatternData
                                cached_pattern = PatternData(**parsed_data)
                                print(f"Found cached pattern: {pattern_info.get('id')} - using cached data")
                                return cached_pattern
                            except Exception as e:
                                print(f"Failed to reconstruct cached pattern: {e}")
                                return None
                        else:
                            print(f"Found existing pattern but no cached data: {pattern_info.get('id') if pattern_info else 'unknown'}")
                            return None
        except Exception as e:
            print(f"Cache lookup via API failed: {e}")
        
        return None
    
    async def parse_pattern_text(
        self,
        text: str,
        page_count: int
    ) -> ParsedPDFResult:
        """
        Parse pattern text into structured data using two-step approach:
        1. Extract sizes and measurements
        2. Generate size-specific instructions for all sizes
        """
        start_time = time.time()
        errors = []
        warnings = []
        
        # Truncate text if too long (keep first 40k chars for now)
        MAX_CHARS = 40000
        if len(text) > MAX_CHARS:
            warnings.append(f"Pattern text truncated from {len(text)} to {MAX_CHARS} characters")
            text = text[:MAX_CHARS]
        
        # Try AI parsing first if available
        if self.openai_client:
            try:
                pattern = await self._parse_with_two_step_ai(text)
                if pattern:
                    return ParsedPDFResult(
                        success=True,
                        pattern=pattern,
                        raw_text=text,
                        page_count=page_count,
                        processing_time_seconds=time.time() - start_time,
                        warnings=warnings
                    )
            except Exception as e:
                warnings.append(f"AI parsing failed: {str(e)}")
                print(f"AI parsing error: {e}")
        
        # Fallback to single-step parsing
        try:
            pattern = await self._parse_with_ai(text)
            if pattern:
                return ParsedPDFResult(
                    success=True,
                    pattern=pattern,
                    raw_text=text,
                    page_count=page_count,
                    warnings=warnings,
                    processing_time_seconds=time.time() - start_time
                )
        except Exception as e:
            warnings.append(f"Fallback parsing failed: {str(e)}")
        
        # Final fallback to regex
        try:
            pattern = await self._parse_with_regex(text)
            return ParsedPDFResult(
                success=True,
                pattern=pattern,
                raw_text=text,
                page_count=page_count,
                warnings=warnings,
                processing_time_seconds=time.time() - start_time
            )
        except Exception as e:
            errors.append(f"Pattern parsing failed: {str(e)}")
            return ParsedPDFResult(
                success=False,
                raw_text=text,
                page_count=page_count,
                errors=errors,
                warnings=warnings,
                processing_time_seconds=time.time() - start_time
            )
    
    async def _parse_sizes_only(self, text: str) -> Dict[str, Any]:
        """Parse only sizes and basic info (fast first step)."""
        if not self.openai_client:
            return {}
        
        sizes_system_prompt = """You are an expert knitting pattern parser.

You will receive the FULL TEXT of a knitting pattern, including:
- Size information and measurements (e.g., Bust, Length, Sleeve, Foot, etc.).
- Gauge, yarn requirements, needle sizes, etc.
- Instructions, charts, abbreviations, etc.

Your task in THIS STEP is ONLY to extract SIZE & MEASUREMENT information.

Return a JSON object with this structure:

{
  "pattern_title": string | null,
  "designer": string | null,  // Pattern designer/creator name (e.g., "petiteknits", "Tin Can Knits")
  "sizes": [
    {
      "id": string,        // concise ID, e.g. "XS", "S", "M", "L", "XL", or "Size 1"
      "label": string,     // human-readable label, e.g. "Size S (34\\" bust)"
      "measurements": [
        {
          "name": string,  // e.g. "Bust", "Chest", "Length", "Foot circumference"
          "value": string, // e.g. "34 in", "86 cm", "10.5\\""
          "notes": string | null
        }
      ]
    }
  ],
  "gauge": {
    "stitches_per_10cm": number | null,
    "rows_per_10cm": number | null,
    "needle_size_mm": number | null,
    "yarn_weight": string | null
  },
  "craft_type": "knitting" | "crochet",
  "garment_type": string | null,
  "difficulty": string | null,
  "notes": [string]
}

Important:
- Extract the pattern designer/creator name if mentioned (usually at the top of the pattern, in the title area, or in copyright/credit sections).
- Look for purchase URLs, shop names, or platform identifiers (Ravelry, Etsy, LoveCrafts, etc.) in the PDF - these are often in headers, footers, or copyright sections.
- Extract Ravelry pattern IDs if visible (usually numeric IDs in URLs or pattern references like "Ravelry #123456").
- Extract Etsy listing IDs if visible.
- Identify the source platform from URLs or shop mentions (e.g., "ravelry.com" → "ravelry", "etsy.com" → "etsy", "lovecrafts.com" → "lovecrafts").
- **CRITICAL: Detect copyright protection/disclaimer text**. Look for phrases like:
  * "personal use only"
  * "non-commercial use only"
  * "may not be copied"
  * "may not be resold"
  * "may not be redistributed"
  * "copyright"
  * "all rights reserved"
  * "do not share"
  * "do not redistribute"
  * Any text indicating the pattern cannot be shared or redistributed
- If copyright/disclaimer text is found, set "has_copyright_protection" to true and include the text in "copyright_text".
- If NO copyright/disclaimer text is found, set "has_copyright_protection" to false.
- Focus on garment sizes intended for the knitter to choose from (not needle sizes, gauge, etc.).
- Try to capture common measurement names (Bust, Hip, Length, Sleeve length, etc.) even if the wording varies.
- Extract gauge information if available.
- Do NOT include any non-JSON commentary.
"""

        sizes_user_prompt = f"""Here is the full text of a knitting pattern PDF:

<<<KNITTING_PATTERN_TEXT>>>
{text[:30000]}  # Limit to first 30k chars for speed
<<<END_PATTERN_TEXT>>>

Please output ONLY the JSON object described in the system prompt, with no extra commentary."""

        print("[FAST PARSE] Extracting sizes and basic info...")
        # Use faster model for sizes extraction
        fast_model = getattr(settings, 'ai_model', 'gpt-4o-mini')
        return _call_llm_json_with_retries(
            self.openai_client,
            sizes_system_prompt,
            sizes_user_prompt,
            fast_model
        )
    
    async def _parse_instructions_for_size(self, text: str, chosen_size: Dict[str, Any]) -> Dict[str, Any]:
        """Parse instructions for a specific size (can be called separately)."""
        if not self.openai_client:
            return {}
        
        instructions_system_prompt = """You are an expert knitting pattern interpreter.

You will receive:
- The full text of a knitting pattern.
- A JSON snippet describing one chosen size (id, label, measurements).
- You MUST generate clear, size-specific instructions for that size ONLY.

Return a JSON object with this structure:

{
  "pattern_title": string | null,
  "size_id": string,
  "size_label": string | null,
  "sections": [
    {
      "section_name": string,  // e.g. "Body", "Yoke", "Sleeves", "Leg", "Heel flap"
      "steps": [
        {
          "row_label": string,          // e.g. "Cast on", "Row 1", "Row 2", "Rnd 3", "Next row"
          "instruction": string,        // full plain-language instruction specific to this size
          "stitch_counts": string | null, // e.g. "You should have 64 sts."
          "notes": string | null,        // any helpful clarifications
          "is_repeat_start": boolean,     // true if this row starts a repeat group
          "is_repeat_end": boolean,       // true if this row ends a repeat group
          "repeat_count": number | null   // number of times to repeat (e.g., 8 for "repeat 8 times")
        }
      ]
    }
  ],
  "global_notes": [string]
}

CRITICAL INSTRUCTIONS - FOLLOW THESE EXACTLY:

1. MULTI-SIZE PATTERN EXTRACTION:
   - When you see "Cast on (60) 62 (64) sts" for sizes S (M, L), extract ONLY the number for the chosen size
   - Example: If chosen size is S (first in parentheses), output: "Cast on 60 stitches"
   - Apply this to ALL multi-size instructions

2. MEASUREMENT-TO-ROW CONVERSION:
   - When you see "Work 10 cm in the round", convert to row-based instructions
   - Format: "k1, p1 in the round for 10 cm (approximately 40 rows)"

3. ROW SPLITTING:
   - Split each distinct instruction into its own step/row

4. REPEAT PATTERNS - CRITICAL: DETECT VISUAL GROUPINGS:
   - **VISUAL GROUPINGS IN PDF**: Even if rows are labeled separately (e.g., "Round 1", "Round 2"), if they appear visually grouped together in the PDF with a repeat instruction, they MUST be marked as a single repeat group.
   - **PATTERN 1: Header with repeat count followed by multiple rows**
     * Example: "Thumb and Top Section Round 1 (repeat 10x)" followed by:
       - Round 1: [instruction]
       - Round 2: [instruction]
     * ALL rows listed under this header are part of the SAME repeat group:
       * Round 1: { "is_repeat_start": true, "repeat_count": 10, ... }
       * Round 2: { "is_repeat_end": true, "repeat_count": 10, ... }
   - **PATTERN 2: "Every Nth round" instructions**
     * Example: "Work increases every 4th round, as follows:" followed by:
       - Round 1: [instruction]
       - Round 2: [instruction]
       - Round 3: [instruction]
       - Round 4: [instruction]
     * ALL rows listed are part of the SAME repeat group
   - **CRITICAL RULE**: If you see a header like "Section Name Round 1 (repeat 10x)" and then see "Round 1:" and "Round 2:" listed below it, BOTH rounds are part of the SAME repeat group. Do NOT treat them as separate, non-repeating rows.

Do NOT include any non-JSON commentary.
"""

        chosen_size_json = json.dumps(chosen_size, ensure_ascii=False, indent=2)
        
        instructions_user_prompt = f"""Here is the full text of the knitting pattern:

<<<KNITTING_PATTERN_TEXT>>>
{text}
<<<END_PATTERN_TEXT>>>

Here is the size object that was chosen:

<<<CHOSEN_SIZE_JSON>>>
{chosen_size_json}
<<<END_CHOSEN_SIZE_JSON>>>

IMPORTANT: 
- Extract ONLY the value for the chosen size from multi-size patterns
- Split each distinct instruction into its own step/row
- Convert measurement-based instructions to row estimates with gauge calculations
- **CRITICAL: Detect visual groupings** - If you see a header like "Section (repeat Nx)" followed by multiple rows (Round 1, Round 2, etc.), ALL those rows are part of the SAME repeat group. Mark them with is_repeat_start on the first, is_repeat_end on the last, and the same repeat_count and repeat_group_id for all.
- Look for patterns like "every Nth round" followed by a list of rows - those rows form a repeat group

Please generate the size-specific instructions JSON exactly as described in the system prompt, FOR THIS SIZE ONLY."""

        print(f"[PARSE] Generating instructions for size {chosen_size.get('id', 'unknown')}...")
        return _call_llm_json_with_retries(
            self.openai_client,
            instructions_system_prompt,
            instructions_user_prompt,
            settings.ai_model
        )

    async def _parse_with_two_step_ai(self, text: str) -> Optional[PatternData]:
        """
        Two-step parsing approach:
        Step 1: Extract sizes and measurements
        Step 2: Generate instructions for each size
        """
        if not self.openai_client:
            return None
        
        # ===== STEP 1: Parse sizes and measurements =====
        sizes_system_prompt = """You are an expert knitting pattern parser.

You will receive the FULL TEXT of a knitting pattern, including:
- Size information and measurements (e.g., Bust, Length, Sleeve, Foot, etc.).
- Gauge, yarn requirements, needle sizes, etc.
- Instructions, charts, abbreviations, etc.

Your task in THIS STEP is ONLY to extract SIZE & MEASUREMENT information.

Return a JSON object with this structure:

{
  "pattern_title": string | null,
  "designer": string | null,  // Pattern designer/creator name (e.g., "petiteknits", "Tin Can Knits")
  "sizes": [
    {
      "id": string,        // concise ID, e.g. "XS", "S", "M", "L", "XL", or "Size 1"
      "label": string,     // human-readable label, e.g. "Size S (34\\" bust)"
      "measurements": [
        {
          "name": string,  // e.g. "Bust", "Chest", "Length", "Foot circumference"
          "value": string, // e.g. "34 in", "86 cm", "10.5\\""
          "notes": string | null
        }
      ]
    }
  ],
  "gauge": {
    "stitches_per_10cm": number | null,
    "rows_per_10cm": number | null,
    "needle_size_mm": number | null,
    "yarn_weight": string | null
  },
  "craft_type": "knitting" | "crochet",
  "garment_type": string | null,
  "difficulty": string | null,
  "notes": [string]
}

Important:
- Extract the pattern designer/creator name if mentioned (usually at the top of the pattern, in the title area, or in copyright/credit sections).
- Focus on garment sizes intended for the knitter to choose from (not needle sizes, gauge, etc.).
- Try to capture common measurement names (Bust, Hip, Length, Sleeve length, etc.) even if the wording varies.
- Extract gauge information if available.
- Do NOT include any non-JSON commentary.
"""

        # Limit text for faster processing (sizes are usually at the top)
        text_for_sizes = text[:30000] if len(text) > 30000 else text
        
        sizes_user_prompt = f"""Here is the full text of a knitting pattern PDF:

<<<KNITTING_PATTERN_TEXT>>>
{text_for_sizes}
<<<END_PATTERN_TEXT>>>

Please output ONLY the JSON object described in the system prompt, with no extra commentary."""

        print("[STEP 1] Parsing sizes and measurements...")
        # Use faster method if available, otherwise use full method
        if hasattr(self, '_parse_sizes_only'):
            sizes_payload = await self._parse_sizes_only(text)
        else:
            sizes_payload = _call_llm_json_with_retries(
                self.openai_client,
                sizes_system_prompt,
                sizes_user_prompt,
                settings.ai_model
            )
        
        if not sizes_payload.get("sizes"):
            print("WARNING: No sizes detected in pattern")
            return None
        
        # ===== STEP 2: Generate instructions for each size =====
        instructions_system_prompt = """You are an expert knitting pattern interpreter.

You will receive:
- The full text of a knitting pattern.
- A JSON snippet describing one chosen size (id, label, measurements).
- You MUST generate clear, size-specific instructions for that size ONLY.

Return a JSON object with this structure:

{
  "pattern_title": string | null,
  "size_id": string,
  "size_label": string | null,
  "sections": [
    {
      "section_name": string,  // e.g. "Body", "Yoke", "Sleeves", "Leg", "Heel flap"
      "steps": [
        {
          "row_label": string,          // e.g. "Cast on", "Row 1", "Row 2", "Rnd 3", "Next row"
          "instruction": string,        // full plain-language instruction specific to this size
          "stitch_counts": string | null, // e.g. "You should have 64 sts."
          "notes": string | null,        // any helpful clarifications
          "is_repeat_start": boolean,     // true if this row starts a repeat group
          "is_repeat_end": boolean,       // true if this row ends a repeat group
          "repeat_count": number | null   // number of times to repeat (e.g., 8 for "repeat 8 times")
        }
      ]
    }
  ],
  "global_notes": [string]
}

CRITICAL INSTRUCTIONS - FOLLOW THESE EXACTLY:

1. MULTI-SIZE PATTERN EXTRACTION:
   - Patterns often show multiple sizes like: "Cast on (60) 62 (64) sts" for sizes S (M, L)
   - You MUST extract ONLY the value for the chosen size
   - Determine which position the chosen size is in the pattern:
     * First size = first number in parentheses or before first parentheses
     * Second size = middle number (between parentheses)
     * Third size = last number (after last parentheses)
   - Examples:
     * Pattern: "Cast on (60) 62 (64) sts" for S (M, L)
     * If chosen size is S (first): "Cast on 60 stitches"
     * If chosen size is M (middle): "Cast on 62 stitches"  
     * If chosen size is L (last): "Cast on 64 stitches"
   - Apply this to ALL multi-size instructions: cast on, increases, decreases, stitch counts, lengths, etc.

2. MEASUREMENT-TO-ROW CONVERSION:
   - When you see instructions like "Work 10 cm in the round" or "Knit for 2 inches":
     * Extract the measurement (e.g., 10 cm, 2 inches)
     * Extract the stitch pattern (e.g., "k1, p1", "stockinette", "rib")
     * Calculate approximate rows using gauge if available:
       - If gauge says "28 rows = 10cm", then 10cm = 28 rows
       - If gauge says "26 rows = 4 inches", convert: 2 inches = 13 rows
     * Format: "k1, p1 in the round for 10 cm (approximately 28 rows)"
   - If gauge is not provided, estimate based on standard gauge or note:
     * "k1, p1 in the round for 10 cm (approximately 30-35 rows, gauge needed for accuracy)"

3. ROW SPLITTING - EACH INSTRUCTION IS ITS OWN ROW:
   - Split EVERY distinct instruction into its own separate step/row
   - Examples:
     * "Cast on 60 sts. Join in the round." → TWO rows:
       - Row 1: "Cast on 60 stitches"
       - Row 2: "Join in the round"
     * "Row 1: K2, P2. Row 2: K2, P2." → TWO rows:
       - Row 1: "K2, P2"
       - Row 2: "K2, P2"
     * "Cast on 60 sts. Work in rib for 10 cm." → TWO rows:
       - Row 1: "Cast on 60 stitches"
       - Row 2: "Work k1, p1 rib for 10 cm (approximately 28 rows)"

4. REPEAT PATTERNS - CRITICAL: DETECT VISUAL GROUPINGS:
   - **VISUAL GROUPINGS IN PDF**: Even if rows are labeled separately (e.g., "Round 1", "Round 2"), if they appear visually grouped together in the PDF with a repeat instruction, they MUST be marked as a single repeat group.
   
   - **PATTERN 1: Header with repeat count followed by multiple rows**
     * Example: "Thumb and Top Section Round 1 (repeat 10x)" followed by:
       - Round 1: [instruction]
       - Round 2: [instruction]
     * ALL rows listed under this header are part of the SAME repeat group:
       * Round 1: { "is_repeat_start": true, "repeat_count": 10, ... }
       * Round 2: { "is_repeat_end": true, "repeat_count": 10, ... }
     * Both rows get the SAME repeat_group_id
   
   - **PATTERN 2: "Every Nth round" instructions**
     * Example: "Work increases every 4th round, as follows:" followed by:
       - Round 1: [instruction]
       - Round 2: [instruction]
       - Round 3: [instruction]
       - Round 4: [instruction]
     * ALL rows listed are part of the SAME repeat group:
       * Round 1: { "is_repeat_start": true, "repeat_count": (calculate from pattern), ... }
       * Round 2: { "is_repeat_start": false, "repeat_count": (same), ... }
       * Round 3: { "is_repeat_start": false, "repeat_count": (same), ... }
       * Round 4: { "is_repeat_end": true, "repeat_count": (same), ... }
     * All rows get the SAME repeat_group_id
   
   - **PATTERN 3: Explicit "Repeat rows X-Y, N times"**
     * Example: "Repeat rows 1-2, 8 times" or "Do this 8 times":
       * Mark the FIRST row with: "is_repeat_start": true, "repeat_count": 8
       * Mark the LAST row with: "is_repeat_end": true, "repeat_count": 8
       * All rows in between get the same repeat_group_id
   
   - **PATTERN 4: Inline repeat instructions**
     * Example: "Row 1: K to marker, m1r, k to marker, m1l. Row 2: K across. Repeat 8 times."
       * Row 1: { "is_repeat_start": true, "repeat_count": 8, ... }
       * Row 2: { "is_repeat_end": true, "repeat_count": 8, ... }
   
   - **KEY INDICATORS TO LOOK FOR**:
     * Headers ending with "(repeat Nx)" or "(repeat N times)" followed by multiple rows
     * Phrases like "every Nth round" or "every Nth row" followed by a list of rows
     * Instructions that say "as follows:" followed by multiple rows
     * Visual grouping in the PDF where multiple rows appear under one instruction header
     * Patterns where rows are clearly meant to be repeated together as a unit
   
   - **CRITICAL RULE**: If you see a header like "Section Name Round 1 (repeat 10x)" and then see "Round 1:" and "Round 2:" listed below it, BOTH rounds are part of the SAME repeat group. Do NOT treat them as separate, non-repeating rows. They must share the same repeat_group_id and repeat_count.

5. ROW LABELS:
   - Use specific, descriptive labels:
     * "Cast on" (not "Setup" or "Begin")
     * "Row 1", "Row 2", "Row 3", etc.
     * "Rnd 1", "Rnd 2", etc. (for in-the-round)
     * "Join in the round"
     * "Bind off"
   - Number rows sequentially: 1, 2, 3, 4...
   - Avoid generic labels like "Next row" or "Continue" - be specific

6. SECTIONS:
   - Break into clear, logical sections:
     * "Cast On" - initial setup
     * "Ribbing" - ribbed sections
     * "Body" - main body section
     * "Yoke" - yoke section
     * "Sleeves" - sleeve sections
     * "Finishing" - bind off, seaming, etc.
   - Each section should have a distinct purpose

Do NOT include any non-JSON commentary.
"""

        # Generate instructions for the first size (we'll extend this later to support all sizes)
        chosen_size = sizes_payload["sizes"][0]
        chosen_size_json = json.dumps(chosen_size, ensure_ascii=False, indent=2)
        
        instructions_user_prompt = f"""Here is the full text of the knitting pattern:

<<<KNITTING_PATTERN_TEXT>>>
{text}
<<<END_PATTERN_TEXT>>>

Here is the size object that was chosen:

<<<CHOSEN_SIZE_JSON>>>
{chosen_size_json}
<<<END_CHOSEN_SIZE_JSON>>>

IMPORTANT: 
- Extract ONLY the value for the chosen size from multi-size patterns
- If you see "Cast on (60) 62 (64) sts" for sizes S (M, L), and the chosen size is S (first), output "Cast on 60 stitches"
- Split each distinct instruction into its own step/row
- Convert measurement-based instructions to row estimates with gauge calculations
- **CRITICAL: Detect visual groupings** - If you see a header like "Section (repeat Nx)" followed by multiple rows (Round 1, Round 2, etc.), ALL those rows are part of the SAME repeat group. Mark them with is_repeat_start on the first, is_repeat_end on the last, and the same repeat_count and repeat_group_id for all.
- Look for patterns like "every Nth round" followed by a list of rows - those rows form a repeat group

Please generate the size-specific instructions JSON exactly as described in the system prompt, FOR THIS SIZE ONLY."""

        print(f"[STEP 2] Generating instructions for size {chosen_size.get('id', 'unknown')}...")
        instructions_payload = _call_llm_json_with_retries(
            self.openai_client,
            instructions_system_prompt,
            instructions_user_prompt,
            settings.ai_model
        )
        
        # ===== Convert to PatternData structure =====
        # Build sizing chart from sizes payload
        sizing_chart = self._build_sizing_chart(sizes_payload["sizes"])
        
        # Convert sizes to PatternSize objects
        pattern_sizes = []
        for idx, size_data in enumerate(sizes_payload["sizes"]):
            measurements_dict = {}
            for m in size_data.get("measurements", []):
                key = m.get("name", "").lower().replace(" ", "_")
                measurements_dict[key] = m.get("value", "")
            
            pattern_sizes.append(PatternSize(
                name=size_data.get("id", f"Size {idx}"),
                display_order=idx,
                measurements=measurements_dict
            ))
        
        # Convert instructions sections to PatternSection objects
        sections = []
        for section_data in instructions_payload.get("sections", []):
            rows = []
            current_repeat_group_id = None  # Track current repeat group
            
            for step_idx, step in enumerate(section_data.get("steps", [])):
                # Generate repeat_group_id if this is a repeat start
                if step.get("is_repeat_start", False):
                    current_repeat_group_id = str(uuid.uuid4())
                elif step.get("is_repeat_end", False):
                    # Keep using the current group ID for this row, then clear it
                    # (will be cleared after assigning to the row)
                    pass
                
                # Assign repeat_group_id to the row (all rows in a group share the same ID)
                row_repeat_group_id = current_repeat_group_id if current_repeat_group_id else None
                
                # Clear the repeat group ID after the end row
                if step.get("is_repeat_end", False):
                    current_repeat_group_id = None
                
                # Convert step to PatternRow - using consistent structure
                row = PatternRow(
                    row_number=step_idx + 1,  # Sequential numbering within section
                    row_label=step.get("row_label") or f"Row {step_idx + 1}",
                    instruction=step.get("instruction", ""),
                    stitch_counts=step.get("stitch_counts"),  # Keep as string for flexibility
                    notes=step.get("notes"),  # Helpful clarifications
                    is_repeat_start=step.get("is_repeat_start", False),
                    is_repeat_end=step.get("is_repeat_end", False),
                    repeat_count=step.get("repeat_count"),
                    repeat_group_id=row_repeat_group_id,
                    instruction_type=RowInstructionType.COUNTED
                )
                rows.append(row)
            
            sections.append(PatternSection(
                name=section_data.get("section_name", "Section"),
                section_type=self._infer_section_type(section_data.get("section_name", "")),
                display_order=len(sections),
                rows=rows,
                notes=None
            ))
        
        # Build PatternData
        gauge_data = sizes_payload.get("gauge", {})
        gauge = None
        if gauge_data:
            gauge = GaugeInfo(
                stitches_per_10cm=gauge_data.get("stitches_per_10cm"),
                rows_per_10cm=gauge_data.get("rows_per_10cm"),
                needle_size_mm=gauge_data.get("needle_size_mm"),
                yarn_weight=gauge_data.get("yarn_weight")
            )
        
        # Extract source information from sizes_payload
        purchase_url = sizes_payload.get("purchase_url")
        shop_name = sizes_payload.get("shop_name")
        store_name = sizes_payload.get("store_name")
        source_platform = sizes_payload.get("source_platform")
        ravelry_pattern_id = sizes_payload.get("ravelry_pattern_id")
        etsy_listing_id = sizes_payload.get("etsy_listing_id")
        has_copyright_protection = sizes_payload.get("has_copyright_protection")
        copyright_text = sizes_payload.get("copyright_text")
        
        pattern = PatternData(
            title=instructions_payload.get("pattern_title") or sizes_payload.get("pattern_title") or "Untitled Pattern",
            description=None,
            designer=sizes_payload.get("designer"),
            purchase_url=purchase_url,
            shop_name=shop_name,
            store_name=store_name,
            source_platform=source_platform,
            ravelry_pattern_id=ravelry_pattern_id,
            etsy_listing_id=etsy_listing_id,
            has_copyright_protection=has_copyright_protection,
            copyright_text=copyright_text,
            craft_type=sizes_payload.get("craft_type", "knitting"),
            garment_type=sizes_payload.get("garment_type"),
            difficulty=sizes_payload.get("difficulty"),
            gauge=gauge,
            sizes=pattern_sizes,
            sizingChart=sizing_chart,
            sections=sections,
            abbreviations=KNITTING_ABBREVIATIONS,
            notes="\n".join(instructions_payload.get("global_notes", [])),
            parsing_confidence=0.9,  # High confidence for two-step approach
            parsing_notes="Parsed using two-step LLM approach"
        )
        
        return pattern
    
    def _build_sizing_chart(self, sizes: List[Dict[str, Any]]) -> Optional[SizingChart]:
        """Build a SizingChart from the sizes payload."""
        if not sizes:
            return None
        
        # Collect all unique measurement names
        all_measurement_names = set()
        for size in sizes:
            for m in size.get("measurements", []):
                name = m.get("name", "").strip()
                if name:
                    all_measurement_names.add(name)
        
        if not all_measurement_names:
            return None
        
        # Build measurements list
        measurements = []
        measurement_keys = {}
        for name in sorted(all_measurement_names):
            key = name.lower().replace(" ", "_").replace("(", "").replace(")", "")
            measurements.append(SizingChartMeasurement(label=name, key=key))
            measurement_keys[name] = key
        
        # Build sizes dict
        sizes_dict = {}
        for size in sizes:
            size_id = size.get("id", "unknown")
            size_measurements = {}
            for m in size.get("measurements", []):
                name = m.get("name", "").strip()
                value = m.get("value", "")
                if name and name in measurement_keys:
                    key = measurement_keys[name]
                    size_measurements[key] = value
            sizes_dict[size_id] = size_measurements
        
        return SizingChart(measurements=measurements, sizes=sizes_dict)
    
    def _infer_section_type(self, section_name: str) -> str:
        """Infer section type from section name."""
        name_lower = section_name.lower()
        if "yoke" in name_lower:
            return "yoke"
        elif "body" in name_lower:
            return "body"
        elif "sleeve" in name_lower:
            return "sleeve"
        elif "collar" in name_lower or "neck" in name_lower:
            return "collar"
        elif "cuff" in name_lower:
            return "cuff"
        elif "hem" in name_lower:
            return "hem"
        elif "leg" in name_lower:
            return "leg"
        elif "heel" in name_lower:
            return "heel"
        elif "toe" in name_lower:
            return "toe"
        else:
            return "other"
    
    async def _parse_with_ai(self, text: str) -> Optional[PatternData]:
        """Fallback single-step AI parsing (original approach)."""
        # Keep original implementation as fallback
        # ... (keeping the original _parse_with_ai code for now)
        return None
    
    async def _parse_with_regex(self, text: str) -> PatternData:
        """Fallback regex-based parsing for basic extraction."""
        title_match = re.search(r'^([A-Z][^.\n]{5,50})', text, re.MULTILINE)
        title = title_match.group(1) if title_match else "Untitled Pattern"
        
        gauge = self._extract_gauge(text)
        sizes = self._extract_sizes(text)
        sections = self._extract_sections(text)
        
        return PatternData(
            title=title.strip(),
            gauge=gauge,
            sizes=sizes,
            sections=sections,
            abbreviations=KNITTING_ABBREVIATIONS,
            parsing_confidence=0.4,
            parsing_notes="Parsed using basic text extraction. Some details may be missing."
        )
    
    def _extract_gauge(self, text: str) -> Optional[GaugeInfo]:
        """Extract gauge information using regex."""
        gauge_pattern = r'(\d+\.?\d*)\s*(?:sts?|stitches?)\s*(?:and|x|×)\s*(\d+\.?\d*)\s*rows?\s*(?:=|per|\/)\s*(?:4\s*(?:in|inches?|"|″)|10\s*cm)'
        match = re.search(gauge_pattern, text, re.IGNORECASE)
        
        if match:
            stitches = float(match.group(1))
            rows = float(match.group(2))
            return GaugeInfo(stitches_per_10cm=stitches, rows_per_10cm=rows)
        
        return None
    
    def _extract_sizes(self, text: str) -> list[PatternSize]:
        """Extract size information using regex."""
        sizes = []
        size_names = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']
        
        for i, name in enumerate(size_names):
            if re.search(rf'\b{name}\b', text):
                sizes.append(PatternSize(name=name, display_order=i))
        
        if not sizes:
            bust_pattern = r'Bust:\s*(\d+)-(\d+)\s*(?:cm|in)'
            matches = re.findall(bust_pattern, text, re.IGNORECASE)
            for i, (start, end) in enumerate(matches):
                sizes.append(PatternSize(
                    name=f"Size {i+1}",
                    display_order=i,
                    measurements={"bust": start}
                ))
        
        return sizes
    
    def _extract_sections(self, text: str) -> list[PatternSection]:
        """Extract pattern sections using regex."""
        sections = []
        section_patterns = [
            (r'\b(YOKE|Yoke)\b', 'yoke'),
            (r'\b(BODY|Body)\b', 'body'),
            (r'\b(SLEEVE|Sleeve)S?\b', 'sleeve'),
            (r'\b(COLLAR|Collar|NECKBAND|Neckband)\b', 'collar'),
            (r'\b(CUFF|Cuff)S?\b', 'cuff'),
            (r'\b(HEM|Hem)\b', 'hem'),
        ]
        
        for pattern, section_type in section_patterns:
            if re.search(pattern, text):
                sections.append(PatternSection(
                    name=section_type.title(),
                    section_type=section_type,
                    display_order=len(sections)
                ))
        
        if not sections:
            sections.append(PatternSection(
                name="Instructions",
                section_type="other",
                display_order=0
            ))
        
        return sections
