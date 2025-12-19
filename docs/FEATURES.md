# Stitch Feature Comparison

## Feature Matrix: Stitch vs Ravelry vs Others

| Feature | Ravelry | KnitCompanion | RowCounter | **Stitch** |
|---------|---------|---------------|------------|------------|
| **Pattern Discovery** |
| Pattern marketplace | ✅ | ❌ | ❌ | ✅ |
| Advanced filters | ✅ | ❌ | ❌ | ✅ |
| Designer profiles | ✅ | ❌ | ❌ | ✅ |
| Pattern previews | ✅ | ✅ | ❌ | ✅ |
| **AI Features** |
| PDF pattern parsing | ❌ | ❌ | ❌ | ✅ |
| Size-filtered instructions | ❌ | ❌ | ❌ | ✅ |
| Voice row navigation | ❌ | ❌ | ❌ | ✅ |
| AI pattern generation | ❌ | ❌ | ❌ | ✅ |
| Smart row estimation | ❌ | ❌ | ❌ | ✅ |
| **Project Tracking** |
| Basic project info | ✅ | ✅ | ✅ | ✅ |
| Progress photos | ✅ | ❌ | ❌ | ✅ |
| Time tracking | ❌ | ✅ | ❌ | ✅ |
| Row counters | ❌ | ✅ | ✅ | ✅ |
| Multiple counters | ❌ | ✅ | ✅ | ✅ |
| Linked counters | ❌ | ✅ | ✅ | ✅ |
| Repeat tracking | ❌ | ✅ | ✅ | ✅ |
| **Yarn & Tools** |
| Yarn database | ✅ | ❌ | ❌ | ✅ |
| Stash management | ✅ | ❌ | ❌ | ✅ |
| Needle inventory | ✅ | ❌ | ❌ | ✅ |
| Yarn tracking per project | ✅ | ❌ | ❌ | ✅ |
| **Social** |
| User profiles | ✅ | ❌ | ❌ | ✅ |
| Following | ✅ | ❌ | ❌ | ✅ |
| Groups | ✅ | ❌ | ❌ | ✅ |
| KALs | ✅ | ❌ | ❌ | ✅ |
| Comments | ✅ | ❌ | ❌ | ✅ |
| **Pattern Reading** |
| PDF viewing | ❌ | ✅ | ❌ | ✅ |
| Highlights | ❌ | ✅ | ❌ | ✅ |
| Annotations | ❌ | ✅ | ❌ | ✅ |
| Split view | ❌ | ✅ | ❌ | ✅ |
| **Designer Tools** |
| Upload patterns | ✅ | ❌ | ❌ | ✅ |
| Sell patterns | ✅ | ❌ | ❌ | ✅ |
| Sales tracking | ✅ | ❌ | ❌ | ✅ |
| Pattern updates | ✅ | ❌ | ❌ | ✅ |
| AI pattern writing | ❌ | ❌ | ❌ | ✅ |
| **Calculators** |
| Needle converter | External | ❌ | ❌ | ✅ |
| Gauge calculator | External | ❌ | ❌ | ✅ |
| Yarn substitution | External | ❌ | ❌ | ✅ |

---

## Database Tables by Feature

### 1. Pattern Discovery & Marketplace

```
patterns                  - Core pattern data
pattern_sizes             - Size options with measurements
pattern_sections          - Pattern parts (body, sleeves, etc.)
pattern_rows              - Row-by-row instructions
pattern_images            - Gallery images
pattern_tags              - Tags for discovery
pattern_favorites         - User bookmarks
pattern_queue             - "Want to make" list
pattern_listings          - Marketplace listings
purchases                 - Purchase records
pattern_reviews           - User reviews
designer_profiles         - Seller profiles
```

### 2. Project Tracking

```
projects                  - Core project data
project_sections          - Sections being worked
project_photos            - Progress photos with context
project_time_sessions     - Time tracking sessions
project_yarns             - Yarn used per project
project_gauge             - Gauge swatch data
project_measurements      - Actual measurements taken
project_notes             - Journal entries
row_counter_history       - Counter history with input type
```

### 3. Pattern Storage & Library

```
user_pattern_library      - Owned/purchased patterns
pattern_annotations       - Highlights, notes, markers
pattern_reading_progress  - Current place in pattern
pattern_pdf_uploads       - Uploaded PDFs for parsing
```

### 4. Yarn Database & Stash

```
yarn_companies            - Yarn brands
yarns                     - Comprehensive yarn database
yarn_colorways            - Color options per yarn
yarn_weights              - Weight categories with gauges
user_stash                - User's yarn stash
stash_photos              - Photos of stashed yarn
```

### 5. Needle/Hook Inventory

```
needle_brands             - Needle manufacturers
user_needles              - User's needle collection
```

### 6. Social Features

```
follows                   - Following relationships
posts                     - Social posts
post_images               - Post images
comments                  - Comments on posts/projects/patterns
likes                     - Likes
groups                    - Community groups
group_members             - Group membership
group_posts               - Group discussions
knit_alongs               - KAL events
kal_participants          - KAL participation
kal_clues                 - Mystery KAL clues
notifications             - User notifications
```

### 7. Pattern Viewing Tools

```
pattern_annotations       - Highlights, notes, markers
pattern_reading_progress  - Reading state
pattern_abbreviations     - Pattern-specific abbreviations
```

### 8. Designer Tools

```
designer_profiles         - Shop settings
pattern_listings          - Listing management
purchases                 - Sales tracking
pattern_reviews           - Customer reviews
```

### 9. Tools & Calculators

```
needle_size_chart         - Size conversions
standard_measurements     - Body measurement standards
yarn_weights              - Gauge ranges by weight
```

### 10. AI Features

```
pattern_pdf_uploads       - PDF processing queue
ai_pattern_sessions       - Pattern generation sessions
pattern_rows              - AI-simplified instructions
patterns                  - ai_parsed_data, ai_confidence_score
```

---

## Unique Stitch Features (No Other Platform Has)

### 1. AI Pattern Parsing
- Upload any PDF pattern
- AI extracts structured data
- Automatically creates row-by-row instructions
- Detects sizes, gauge, yarn requirements

### 2. Size-Filtered Instructions
- Select your size once
- See only relevant stitch counts
- No more mental math or highlighting

### 3. Voice-Controlled Row Counter
- "Next row" - advances counter
- "Go back" - decrements
- "Undo" - reverts last action
- "Where am I?" - reads current row
- "Read instruction" - speaks the current row

### 4. Smart Row Estimation
- Pattern says "knit for 2 inches"
- Enter your gauge
- App calculates ~20 rows (example)
- Reminds you to measure every 10 rows

### 5. AI Pattern Builder
- Describe what you want
- AI generates complete pattern
- Row-by-row instructions
- Multiple sizes

### 6. Cross-WIP Insights
- Total time across all projects
- Estimated completion dates
- "You've knit 50,000 stitches this month!"

---

## Data Model Highlights

### Progress Photos
```sql
project_photos (
    progress_percent,      -- What % done at photo time
    taken_at_row,          -- Row number when taken
    taken_at_section,      -- Which section
    is_finished_photo      -- Mark as FO photo
)
```

### Time Tracking
```sql
project_time_sessions (
    started_at,
    ended_at,
    duration_minutes,
    rows_completed,        -- Rows done this session
    start_row,             -- Where you started
    end_row                -- Where you ended
)

user_stats (
    total_knitting_time_minutes  -- Lifetime hours!
)
```

### Smart Row Tracking
```sql
pattern_rows (
    instruction_type,      -- 'counted', 'measured', 'repeat'
    target_measurement_cm, -- For "knit 2 inches"
    estimated_rows,        -- Calculated from gauge
    measure_every_n_rows,  -- Reminder frequency
    instruction_simplified -- AI-simplified version
)

project_sections (
    current_row,
    total_rows,
    is_estimated_total,    -- True if from measurement
    current_repeat,        -- For repeat tracking
    total_repeats
)
```

### Repeat Tracking
```sql
project_sections (
    current_repeat,
    total_repeats,
    rows_per_repeat        -- Rows in one repeat
)
```

### Pattern Annotations
```sql
pattern_annotations (
    page_number,           -- PDF page
    x_percent, y_percent,  -- Position on page
    annotation_type,       -- 'highlight', 'note', 'marker'
    color,                 -- Highlight color
    content                -- Note text
)
```

### Voice Counter
```sql
row_counter_history (
    input_type,            -- 'click', 'voice', 'gesture'
    voice_transcript       -- What the user said
)

project_sections (
    counter_voice_enabled  -- Enable voice for this section
)
```


