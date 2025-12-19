-- Migration: Add pattern source, purchase links, and shop/store fields
-- This allows patterns to be classified, linked to purchase sources, and grouped by canonical patterns

-- Add new columns to patterns table
ALTER TABLE patterns
    ADD COLUMN IF NOT EXISTS purchase_url TEXT,
    ADD COLUMN IF NOT EXISTS shop_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS store_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS pattern_source VARCHAR(50) DEFAULT 'uploaded', -- 'uploaded', 'created', 'popular'
    ADD COLUMN IF NOT EXISTS canonical_pattern_id UUID REFERENCES patterns(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE, -- Public visibility (based on copyright protection)
    ADD COLUMN IF NOT EXISTS ravelry_pattern_id INTEGER,
    ADD COLUMN IF NOT EXISTS etsy_listing_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS source_platform VARCHAR(50), -- 'ravelry', 'etsy', 'lovecrafts', 'direct', 'other'
    ADD COLUMN IF NOT EXISTS has_copyright_protection BOOLEAN, -- True if pattern has copyright/disclaimer text
    ADD COLUMN IF NOT EXISTS copyright_text TEXT, -- Extracted copyright/disclaimer text
    ADD COLUMN IF NOT EXISTS is_original BOOLEAN DEFAULT FALSE, -- True if this is the original cached parse (not edited)
    ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE, -- True if pattern has been manually edited after parsing
    ADD COLUMN IF NOT EXISTS original_parsed_at TIMESTAMPTZ; -- When the original pattern was first parsed

-- Create index for canonical pattern lookups (to find all instances of the same pattern)
CREATE INDEX IF NOT EXISTS idx_patterns_canonical ON patterns(canonical_pattern_id) WHERE canonical_pattern_id IS NOT NULL;

-- Create index for shop/store lookups
CREATE INDEX IF NOT EXISTS idx_patterns_shop ON patterns(shop_name) WHERE shop_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patterns_store ON patterns(store_name) WHERE store_name IS NOT NULL;

-- Create index for pattern source filtering
CREATE INDEX IF NOT EXISTS idx_patterns_source ON patterns(pattern_source);

-- Create index for Ravelry pattern lookups
CREATE INDEX IF NOT EXISTS idx_patterns_ravelry ON patterns(ravelry_pattern_id) WHERE ravelry_pattern_id IS NOT NULL;

-- Create index for pattern lookup by title + designer + shop (for deduplication)
CREATE INDEX IF NOT EXISTS idx_patterns_lookup ON patterns(title, designer_name, shop_name) 
    WHERE pattern_source = 'uploaded' AND is_original = TRUE AND is_edited = FALSE;

-- Update existing patterns: set is_public to FALSE for all uploaded patterns
UPDATE patterns 
SET is_public = FALSE, pattern_source = 'uploaded'
WHERE pattern_source IS NULL OR pattern_source = 'uploaded';

-- Add comment explaining the fields
COMMENT ON COLUMN patterns.purchase_url IS 'URL where users can purchase the pattern (for paid patterns)';
COMMENT ON COLUMN patterns.shop_name IS 'Name of the shop/store where pattern is sold (e.g., "Ravelry", "Etsy", "LoveCrafts")';
COMMENT ON COLUMN patterns.store_name IS 'Alternative store name or marketplace identifier';
COMMENT ON COLUMN patterns.pattern_source IS 'Source of pattern: uploaded (from PDF), created (made in app), popular (well-known pattern)';
COMMENT ON COLUMN patterns.canonical_pattern_id IS 'Links to the canonical/primary pattern instance for grouping same patterns';
COMMENT ON COLUMN patterns.is_public IS 'Whether pattern can be viewed publicly. Uploaded patterns are public only if no copyright protection is detected.';
COMMENT ON COLUMN patterns.has_copyright_protection IS 'True if pattern contains copyright/disclaimer text indicating it cannot be redistributed';
COMMENT ON COLUMN patterns.copyright_text IS 'Extracted copyright/disclaimer text from the pattern PDF';
COMMENT ON COLUMN patterns.is_original IS 'True if this is the original cached parse (first parse, unedited)';
COMMENT ON COLUMN patterns.is_edited IS 'True if pattern has been manually edited after parsing';
COMMENT ON COLUMN patterns.original_parsed_at IS 'Timestamp when the original pattern was first parsed';
COMMENT ON COLUMN patterns.ravelry_pattern_id IS 'Ravelry pattern ID if pattern is from Ravelry';
COMMENT ON COLUMN patterns.etsy_listing_id IS 'Etsy listing ID if pattern is from Etsy';
COMMENT ON COLUMN patterns.source_platform IS 'Platform where pattern was originally published';

