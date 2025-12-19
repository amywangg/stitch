-- ============================================================================
-- STITCH DATABASE SCHEMA
-- Comprehensive schema for the Stitch knitting application
-- PostgreSQL 15+
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('user', 'designer', 'admin', 'moderator');
CREATE TYPE project_status AS ENUM ('planned', 'in_progress', 'frogged', 'completed', 'hibernating');
CREATE TYPE section_type AS ENUM ('body', 'sleeve', 'collar', 'cuff', 'hem', 'yoke', 'pocket', 'hood', 'front', 'back', 'border', 'other');
CREATE TYPE visibility AS ENUM ('private', 'followers', 'public');
CREATE TYPE pattern_difficulty AS ENUM ('beginner', 'easy', 'intermediate', 'advanced', 'expert');
CREATE TYPE craft_type AS ENUM ('knitting', 'crochet', 'both');
CREATE TYPE garment_type AS ENUM (
    'sweater', 'cardigan', 'vest', 'hat', 'beanie', 'beret', 'scarf', 'cowl', 'shawl', 
    'socks', 'mittens', 'gloves', 'fingerless_gloves', 'blanket', 'afghan', 'throw',
    'toy', 'amigurumi', 'bag', 'tote', 'accessory', 'wrap', 'poncho', 'cape',
    'dress', 'skirt', 'top', 'tank', 'tee', 'sleeves', 'collar', 'cushion',
    'coaster', 'dishcloth', 'washcloth', 'ornament', 'garland', 'baby_item', 'pet_item', 'other'
);
CREATE TYPE unit_system AS ENUM ('metric', 'imperial');
CREATE TYPE listing_status AS ENUM ('draft', 'pending_review', 'active', 'paused', 'archived', 'rejected');
CREATE TYPE purchase_status AS ENUM ('pending', 'completed', 'refunded', 'disputed');
CREATE TYPE notification_type AS ENUM (
    'follow', 'like', 'comment', 'mention', 'pattern_update', 
    'purchase', 'sale', 'kal_update', 'group_post', 'achievement', 'system'
);
CREATE TYPE row_instruction_type AS ENUM ('counted', 'measured', 'repeat', 'marker', 'note');
CREATE TYPE counter_input_type AS ENUM ('click', 'voice', 'gesture', 'auto');
CREATE TYPE needle_type AS ENUM ('straight', 'circular', 'dpn', 'interchangeable', 'cable', 'crochet_hook');
CREATE TYPE fiber_type AS ENUM (
    'wool', 'merino', 'alpaca', 'cashmere', 'mohair', 'angora', 'silk',
    'cotton', 'linen', 'bamboo', 'hemp', 'acrylic', 'nylon', 'polyester',
    'blend', 'other'
);
CREATE TYPE yarn_weight_category AS ENUM (
    'lace', 'light_fingering', 'fingering', 'sport', 'dk', 'worsted', 
    'aran', 'bulky', 'super_bulky', 'jumbo'
);
CREATE TYPE content_type AS ENUM ('post', 'discussion', 'question', 'kal_update', 'photo', 'wip_update');
CREATE TYPE upload_type AS ENUM ('pdf', 'image', 'url', 'manual', 'ai_builder');
CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    cover_image_url TEXT,
    website_url VARCHAR(255),
    ravelry_username VARCHAR(100),
    instagram_handle VARCHAR(100),
    -- OAuth provider IDs
    google_id VARCHAR(255) UNIQUE,
    apple_id VARCHAR(255) UNIQUE,
    location VARCHAR(100),
    country_code VARCHAR(2),
    timezone VARCHAR(50),
    role user_role DEFAULT 'user',
    preferred_unit unit_system DEFAULT 'metric',
    preferred_currency VARCHAR(3) DEFAULT 'USD',
    is_verified BOOLEAN DEFAULT FALSE,
    is_designer BOOLEAN DEFAULT FALSE,
    is_pro BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_location ON users(location);

CREATE TABLE user_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    -- Notifications
    email_notifications BOOLEAN DEFAULT TRUE,
    email_pattern_updates BOOLEAN DEFAULT TRUE,
    email_kal_updates BOOLEAN DEFAULT TRUE,
    email_comments BOOLEAN DEFAULT TRUE,
    email_newsletter BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    -- Privacy
    show_online_status BOOLEAN DEFAULT TRUE,
    show_projects_count BOOLEAN DEFAULT TRUE,
    show_stash BOOLEAN DEFAULT TRUE,
    allow_messages_from VARCHAR(20) DEFAULT 'everyone',
    -- Defaults
    default_project_visibility visibility DEFAULT 'public',
    default_pattern_notes_visibility visibility DEFAULT 'private',
    -- UI Preferences
    theme VARCHAR(20) DEFAULT 'system',
    compact_view BOOLEAN DEFAULT FALSE,
    show_metric_and_imperial BOOLEAN DEFAULT TRUE,
    -- Voice settings
    voice_enabled BOOLEAN DEFAULT FALSE,
    voice_language VARCHAR(10) DEFAULT 'en-US',
    voice_speed DECIMAL(2,1) DEFAULT 1.0,
    voice_auto_advance BOOLEAN DEFAULT FALSE,
    voice_confirmation_sound BOOLEAN DEFAULT TRUE,
    -- Counter settings
    default_haptic_feedback BOOLEAN DEFAULT TRUE,
    default_sound_enabled BOOLEAN DEFAULT TRUE,
    -- Knitting preferences
    knitting_style VARCHAR(20) DEFAULT 'continental', -- 'continental', 'english', 'russian', 'portuguese', 'combination'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    project_count INTEGER DEFAULT 0,
    finished_project_count INTEGER DEFAULT 0,
    pattern_count INTEGER DEFAULT 0,
    published_pattern_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    stash_yarn_count INTEGER DEFAULT 0,
    total_knitting_time_minutes INTEGER DEFAULT 0,
    total_rows_knit INTEGER DEFAULT 0,
    -- Gamification
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    achievements_count INTEGER DEFAULT 0,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User devices for multi-device sync
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(50),
    push_token TEXT,
    last_sync_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    app_version VARCHAR(20),
    os_version VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_user_devices ON user_devices(user_id);

-- Sync queue for offline changes
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    change_data JSONB NOT NULL,
    is_synced BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,
    conflict_detected BOOLEAN DEFAULT FALSE,
    conflict_resolution TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_queue_user ON sync_queue(user_id, is_synced);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ============================================================================
-- SOCIAL: FOLLOWS
-- ============================================================================

CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================================================
-- SOCIAL: FRIENDSHIPS (bi-directional, requires acceptance)
-- ============================================================================

CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');

CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status friendship_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(requester_id, addressee_id),
    CHECK (requester_id != addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- View to get all friends for a user (accepted friendships in either direction)
CREATE OR REPLACE VIEW user_friends AS
SELECT 
    f.id as friendship_id,
    CASE 
        WHEN f.requester_id = u.id THEN f.addressee_id 
        ELSE f.requester_id 
    END as friend_id,
    u.id as user_id,
    f.accepted_at as friends_since
FROM friendships f
CROSS JOIN users u
WHERE f.status = 'accepted'
AND (f.requester_id = u.id OR f.addressee_id = u.id);

-- ============================================================================
-- SOCIAL: ACTIVITY FEED
-- (Moved after projects/patterns/posts tables are created)
-- ============================================================================

CREATE TYPE activity_type AS ENUM (
    'project_created', 'project_updated', 'project_completed',
    'post_created', 'photo_added',
    'pattern_purchased', 'pattern_favorited',
    'achievement_earned', 'milestone_reached',
    'friend_added', 'joined_group', 'joined_kal'
);

-- Note: activity_feed table creation moved to after projects/patterns/posts tables

-- ============================================================================
-- YARN DATABASE
-- ============================================================================

CREATE TABLE yarn_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    website_url VARCHAR(255),
    logo_url TEXT,
    description TEXT,
    country_code VARCHAR(2),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    yarn_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_yarn_companies_name ON yarn_companies(name);

CREATE TABLE yarn_weights (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    category yarn_weight_category NOT NULL,
    ply_range VARCHAR(20),
    wraps_per_inch_min INTEGER,
    wraps_per_inch_max INTEGER,
    knit_gauge_min DECIMAL(4,1),
    knit_gauge_max DECIMAL(4,1),
    recommended_needle_us_min VARCHAR(10),
    recommended_needle_us_max VARCHAR(10),
    recommended_needle_mm_min DECIMAL(3,2),
    recommended_needle_mm_max DECIMAL(3,2),
    crochet_gauge_min DECIMAL(4,1),
    crochet_gauge_max DECIMAL(4,1),
    recommended_hook_mm_min DECIMAL(3,2),
    recommended_hook_mm_max DECIMAL(3,2)
);

CREATE TABLE yarns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES yarn_companies(id),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    weight_id INTEGER REFERENCES yarn_weights(id),
    fiber_content TEXT,
    primary_fiber fiber_type,
    is_organic BOOLEAN DEFAULT FALSE,
    is_hand_dyed BOOLEAN DEFAULT FALSE,
    is_self_striping BOOLEAN DEFAULT FALSE,
    is_variegated BOOLEAN DEFAULT FALSE,
    meters_per_skein INTEGER,
    yards_per_skein INTEGER,
    grams_per_skein INTEGER,
    ounces_per_skein DECIMAL(4,2),
    number_of_plies INTEGER,
    gauge_stitches DECIMAL(4,1),
    gauge_rows DECIMAL(4,1),
    gauge_size_inches DECIMAL(3,1) DEFAULT 4,
    recommended_needle_mm DECIMAL(3,2),
    recommended_needle_us VARCHAR(10),
    recommended_hook_mm DECIMAL(3,2),
    recommended_hook_us VARCHAR(10),
    machine_washable BOOLEAN,
    tumble_dry BOOLEAN,
    care_instructions TEXT,
    is_discontinued BOOLEAN DEFAULT FALSE,
    discontinued_date DATE,
    project_count INTEGER DEFAULT 0,
    stash_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    rating_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, slug)
);

CREATE INDEX idx_yarns_company ON yarns(company_id);
CREATE INDEX idx_yarns_weight ON yarns(weight_id);
CREATE INDEX idx_yarns_search ON yarns USING GIN (to_tsvector('english', name || ' ' || COALESCE(fiber_content, '')));

CREATE TABLE yarn_colorways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    yarn_id UUID NOT NULL REFERENCES yarns(id) ON DELETE CASCADE,
    name VARCHAR(150),
    color_code VARCHAR(50),
    hex_color VARCHAR(7),
    image_url TEXT,
    is_discontinued BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_yarn_colorways_yarn ON yarn_colorways(yarn_id);

CREATE TABLE user_stash (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    yarn_id UUID REFERENCES yarns(id),
    colorway_id UUID REFERENCES yarn_colorways(id),
    custom_yarn_name VARCHAR(200),
    custom_company_name VARCHAR(150),
    custom_colorway VARCHAR(100),
    custom_weight yarn_weight_category,
    custom_fiber_content TEXT,
    skeins_total DECIMAL(6,2),
    skeins_used DECIMAL(6,2) DEFAULT 0,
    grams_total INTEGER,
    grams_used INTEGER DEFAULT 0,
    meters_total INTEGER,
    meters_used INTEGER DEFAULT 0,
    dye_lot VARCHAR(50),
    color_hex VARCHAR(7),
    acquired_from VARCHAR(255),
    acquired_date DATE,
    acquired_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    location VARCHAR(100),
    notes TEXT,
    tags TEXT[],
    is_handspun BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    is_trade_or_sell BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_stash_user ON user_stash(user_id);
CREATE INDEX idx_user_stash_yarn ON user_stash(yarn_id);

CREATE TABLE stash_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stash_id UUID NOT NULL REFERENCES user_stash(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NEEDLE & HOOK INVENTORY
-- ============================================================================

CREATE TABLE needle_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    website_url VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE user_needles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES needle_brands(id),
    custom_brand_name VARCHAR(100),
    needle_type needle_type NOT NULL,
    size_mm DECIMAL(4,2),
    size_us VARCHAR(10),
    length_cm INTEGER,
    length_inches DECIMAL(4,1),
    is_interchangeable BOOLEAN DEFAULT FALSE,
    interchangeable_set_name VARCHAR(100),
    tip_length_cm INTEGER,
    cable_length_cm INTEGER,
    material VARCHAR(50),
    notes TEXT,
    quantity INTEGER DEFAULT 1,
    current_project_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_needles_user ON user_needles(user_id);
CREATE INDEX idx_user_needles_size ON user_needles(size_mm);

-- Needle size conversion chart
CREATE TABLE needle_size_chart (
    id SERIAL PRIMARY KEY,
    size_mm DECIMAL(4,2) NOT NULL,
    size_us VARCHAR(10),
    size_uk VARCHAR(10),
    size_jp VARCHAR(10),
    hook_us VARCHAR(10),
    hook_uk VARCHAR(10)
);

-- Standard body measurements
CREATE TABLE standard_measurements (
    id SERIAL PRIMARY KEY,
    measurement_system VARCHAR(20),
    size_name VARCHAR(20),
    bust_cm DECIMAL(5,1),
    waist_cm DECIMAL(5,1),
    hip_cm DECIMAL(5,1),
    shoulder_width_cm DECIMAL(5,1),
    arm_length_cm DECIMAL(5,1),
    torso_length_cm DECIMAL(5,1),
    head_circumference_cm DECIMAL(5,1),
    foot_length_cm DECIMAL(5,1)
);

-- ============================================================================
-- PATTERNS
-- ============================================================================

CREATE TABLE patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    notes TEXT,
    craft_type craft_type DEFAULT 'knitting',
    garment_type garment_type,
    difficulty pattern_difficulty,
    is_seamless BOOLEAN,
    is_worked_flat BOOLEAN,
    is_worked_in_round BOOLEAN,
    is_top_down BOOLEAN,
    is_bottom_up BOOLEAN,
    construction_notes TEXT,
    techniques TEXT[],
    size_range VARCHAR(100),
    is_size_inclusive BOOLEAN DEFAULT FALSE,
    fit_type VARCHAR(50),
    -- Gauge
    gauge_stitches DECIMAL(4,1),
    gauge_rows DECIMAL(4,1),
    gauge_pattern VARCHAR(100),
    gauge_size_inches DECIMAL(3,1) DEFAULT 4,
    gauge_needle_mm DECIMAL(3,2),
    gauge_needle_us VARCHAR(10),
    gauge_hook_mm DECIMAL(3,2),
    gauge_hook_us VARCHAR(10),
    gauge_notes TEXT,
    gauge_critical BOOLEAN DEFAULT TRUE,
    -- Yarn
    recommended_yarn_id UUID REFERENCES yarns(id),
    recommended_yarn_weight_id INTEGER REFERENCES yarn_weights(id),
    yarn_weight_description VARCHAR(100),
    total_yardage_min INTEGER,
    total_yardage_max INTEGER,
    total_meters_min INTEGER,
    total_meters_max INTEGER,
    number_of_colors INTEGER DEFAULT 1,
    -- Needles
    primary_needle_mm DECIMAL(3,2),
    primary_needle_us VARCHAR(10),
    secondary_needle_mm DECIMAL(3,2),
    secondary_needle_us VARCHAR(10),
    needle_notes TEXT,
    -- Publishing
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    is_free BOOLEAN DEFAULT TRUE,
    requires_purchase BOOLEAN DEFAULT FALSE,
    -- PDF
    pdf_url TEXT,
    pdf_page_count INTEGER,
    pdf_version VARCHAR(20),
    last_updated_at TIMESTAMPTZ,
    update_notes TEXT,
    -- Languages
    language VARCHAR(10) DEFAULT 'en',
    available_languages TEXT[],
    cover_image_url TEXT,
    -- Designer/Creator (original pattern designer, not the uploader)
    designer_name VARCHAR(150),
    designer_url VARCHAR(255),
    -- AI Parsing (for imported patterns)
    parsing_source upload_type,
    original_text TEXT,
    cleaned_instructions TEXT,
    detected_abbreviations JSONB,
    detected_repeats JSONB,
    ai_parsed_data JSONB,
    ai_confidence_score DECIMAL(3,2),
    ai_rewrite_version INTEGER DEFAULT 0,
    -- Stats
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    queue_count INTEGER DEFAULT 0,
    project_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    rating_count INTEGER DEFAULT 0,
    meta_description VARCHAR(300),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(author_id, slug)
);

CREATE INDEX idx_patterns_author ON patterns(author_id);
CREATE INDEX idx_patterns_craft ON patterns(craft_type);
CREATE INDEX idx_patterns_garment ON patterns(garment_type);
CREATE INDEX idx_patterns_difficulty ON patterns(difficulty);
CREATE INDEX idx_patterns_published ON patterns(is_published, published_at DESC);
CREATE INDEX idx_patterns_free ON patterns(is_free) WHERE is_published = TRUE;
CREATE INDEX idx_patterns_search ON patterns USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_patterns_techniques ON patterns USING GIN (techniques);

-- Pattern uploads (PDF and image)
CREATE TABLE pattern_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_id UUID REFERENCES patterns(id) ON DELETE SET NULL,
    upload_type upload_type NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size_bytes INTEGER,
    page_count INTEGER,
    width_px INTEGER,
    height_px INTEGER,
    -- Processing
    processing_status processing_status DEFAULT 'pending',
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processing_error TEXT,
    -- Extracted data
    extracted_text TEXT,
    ocr_text TEXT,
    ocr_confidence DECIMAL(3,2),
    extracted_data JSONB,
    detected_sizes TEXT[],
    detected_gauge JSONB,
    detected_yarn_weight VARCHAR(50),
    detected_sections TEXT[],
    detected_abbreviations JSONB,
    ai_confidence_score DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pattern_uploads_user ON pattern_uploads(user_id);
CREATE INDEX idx_pattern_uploads_status ON pattern_uploads(processing_status);

CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50),
    usage_count INTEGER DEFAULT 0
);

CREATE TABLE pattern_tags (
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (pattern_id, tag_id)
);

CREATE TABLE pattern_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    is_cover BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pattern_sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    display_order INTEGER DEFAULT 0,
    bust_cm DECIMAL(5,1),
    bust_inches DECIMAL(5,1),
    waist_cm DECIMAL(5,1),
    waist_inches DECIMAL(5,1),
    hip_cm DECIMAL(5,1),
    hip_inches DECIMAL(5,1),
    finished_bust_cm DECIMAL(5,1),
    finished_bust_inches DECIMAL(5,1),
    finished_length_cm DECIMAL(5,1),
    finished_length_inches DECIMAL(5,1),
    finished_sleeve_cm DECIMAL(5,1),
    finished_sleeve_inches DECIMAL(5,1),
    finished_armhole_depth_cm DECIMAL(5,1),
    finished_yoke_depth_cm DECIMAL(5,1),
    finished_shoulder_width_cm DECIMAL(5,1),
    head_circumference_cm DECIMAL(5,1),
    foot_circumference_cm DECIMAL(5,1),
    foot_length_cm DECIMAL(5,1),
    hand_circumference_cm DECIMAL(5,1),
    yardage INTEGER,
    meters INTEGER,
    cast_on_stitches INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pattern_sizes_pattern ON pattern_sizes(pattern_id);

CREATE TABLE pattern_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    section_type section_type,
    name VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0,
    instructions TEXT,
    notes TEXT,
    chart_image_url TEXT,
    chart_rows INTEGER,
    chart_stitches INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pattern_sections_pattern ON pattern_sections(pattern_id);

-- Pattern repeats (for structured repeat tracking)
CREATE TABLE pattern_repeats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    section_id UUID REFERENCES pattern_sections(id) ON DELETE CASCADE,
    name VARCHAR(100),
    start_row INTEGER NOT NULL,
    end_row INTEGER NOT NULL,
    repeat_type VARCHAR(50),
    repeat_count INTEGER,
    repeat_until_cm DECIMAL(5,2),
    repeat_until_stitches INTEGER,
    repeat_until_condition TEXT,
    stitches_increased_per_repeat INTEGER DEFAULT 0,
    stitches_decreased_per_repeat INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pattern_repeats_pattern ON pattern_repeats(pattern_id);

CREATE TABLE pattern_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES pattern_sections(id) ON DELETE CASCADE,
    size_id UUID REFERENCES pattern_sizes(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    row_label VARCHAR(50),
    row_side VARCHAR(10),
    instruction TEXT NOT NULL,
    instruction_simplified TEXT,
    stitch_count INTEGER,
    stitch_count_by_size JSONB,
    notes TEXT,
    tips TEXT,
    instruction_type row_instruction_type DEFAULT 'counted',
    target_measurement_cm DECIMAL(5,2),
    target_measurement_inches DECIMAL(5,2),
    estimated_rows INTEGER,
    measure_every_n_rows INTEGER,
    measurement_notes TEXT,
    repeat_from_row INTEGER,
    repeat_until_condition TEXT,
    repeat_count INTEGER,
    is_checkpoint BOOLEAN DEFAULT FALSE,
    checkpoint_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pattern_rows_section ON pattern_rows(section_id);
CREATE INDEX idx_pattern_rows_size ON pattern_rows(size_id);

-- Size-specific instruction variants
CREATE TABLE pattern_row_size_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    row_id UUID NOT NULL REFERENCES pattern_rows(id) ON DELETE CASCADE,
    size_id UUID NOT NULL REFERENCES pattern_sizes(id) ON DELETE CASCADE,
    instruction TEXT NOT NULL,
    instruction_simplified TEXT,
    stitch_count INTEGER,
    measurement_target_cm DECIMAL(5,2),
    estimated_rows INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(row_id, size_id)
);

CREATE INDEX idx_pattern_row_size_variants ON pattern_row_size_variants(row_id, size_id);

-- Pre-generated audio for voice reading
CREATE TABLE pattern_row_audio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    row_id UUID NOT NULL REFERENCES pattern_rows(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'en-US',
    voice_id VARCHAR(50),
    audio_url TEXT,
    audio_duration_seconds DECIMAL(6,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(row_id, language, voice_id)
);

CREATE TABLE pattern_abbreviations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    abbreviation VARCHAR(20) NOT NULL,
    meaning VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0
);

CREATE TABLE pattern_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    requirement_type VARCHAR(50),
    description TEXT NOT NULL,
    is_optional BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0
);

-- Charts
CREATE TABLE pattern_charts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    section_id UUID REFERENCES pattern_sections(id) ON DELETE CASCADE,
    name VARCHAR(100),
    description TEXT,
    width_stitches INTEGER NOT NULL,
    height_rows INTEGER NOT NULL,
    chart_data JSONB NOT NULL,
    symbol_legend JSONB,
    image_url TEXT,
    read_rs_right_to_left BOOLEAN DEFAULT TRUE,
    read_ws_right_to_left BOOLEAN DEFAULT FALSE,
    first_row_number INTEGER DEFAULT 1,
    row_numbering_side VARCHAR(10) DEFAULT 'right',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pattern_charts_pattern ON pattern_charts(pattern_id);

CREATE TABLE chart_symbols (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    name VARCHAR(50) NOT NULL,
    abbreviation VARCHAR(20),
    description TEXT,
    svg_path TEXT,
    unicode_char VARCHAR(10),
    category VARCHAR(50),
    craft_type craft_type DEFAULT 'both',
    UNIQUE(symbol, craft_type)
);

-- Chart conversion jobs
CREATE TABLE chart_conversion_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_id UUID REFERENCES patterns(id) ON DELETE SET NULL,
    written_instructions TEXT NOT NULL,
    stitch_count INTEGER,
    row_count INTEGER,
    generated_chart_id UUID REFERENCES pattern_charts(id),
    status processing_status DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- User's pattern library
CREATE TABLE user_pattern_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_id UUID REFERENCES patterns(id) ON DELETE SET NULL,
    custom_pattern_name VARCHAR(255),
    custom_designer VARCHAR(150),
    custom_source VARCHAR(255),
    custom_pdf_url TEXT,
    personal_notes TEXT,
    tags TEXT[],
    purchased_at TIMESTAMPTZ,
    purchase_price DECIMAL(10,2),
    currency VARCHAR(3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, pattern_id)
);

CREATE INDEX idx_user_pattern_library_user ON user_pattern_library(user_id);

CREATE TABLE pattern_favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, pattern_id)
);

CREATE TABLE pattern_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    size_id UUID REFERENCES pattern_sizes(id),
    priority INTEGER DEFAULT 0,
    notes TEXT,
    planned_yarn_id UUID REFERENCES user_stash(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, pattern_id)
);

-- Pattern reading/viewing state
CREATE TABLE pattern_reading_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    project_id UUID,
    current_page INTEGER,
    current_section_id UUID REFERENCES pattern_sections(id),
    current_row_id UUID REFERENCES pattern_rows(id),
    selected_size_id UUID REFERENCES pattern_sizes(id),
    show_only_selected_size BOOLEAN DEFAULT TRUE,
    highlight_size_instructions BOOLEAN DEFAULT TRUE,
    zoom_level INTEGER DEFAULT 100,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, pattern_id, project_id)
);

-- Pattern annotations
CREATE TABLE pattern_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    page_number INTEGER,
    section_id UUID REFERENCES pattern_sections(id),
    row_id UUID REFERENCES pattern_rows(id),
    x_percent DECIMAL(5,2),
    y_percent DECIMAL(5,2),
    annotation_type VARCHAR(50),
    color VARCHAR(7),
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pattern_annotations ON pattern_annotations(user_id, pattern_id);

-- ============================================================================
-- PROJECTS
-- ============================================================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_id UUID REFERENCES patterns(id),
    size_id UUID REFERENCES pattern_sizes(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    status project_status DEFAULT 'planned',
    visibility visibility DEFAULT 'public',
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    cast_on_date DATE,
    started_at DATE,
    finished_at DATE,
    total_time_minutes INTEGER DEFAULT 0,
    estimated_time_minutes INTEGER,
    estimated_completion_date DATE,
    estimated_remaining_minutes INTEGER,
    rows_per_hour_avg DECIMAL(5,1),
    personal_rating INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 5),
    made_for VARCHAR(100),
    made_for_size VARCHAR(50),
    modifications_made TEXT,
    would_make_again BOOLEAN,
    is_custom BOOLEAN DEFAULT FALSE,
    custom_pattern_source TEXT,
    actual_gauge_stitches DECIMAL(4,1),
    actual_gauge_rows DECIMAL(4,1),
    gauge_swatch_washed BOOLEAN,
    gauge_notes TEXT,
    needle_size_mm DECIMAL(3,2),
    needle_size_us VARCHAR(10),
    needle_type needle_type,
    needle_notes TEXT,
    notes TEXT,
    cover_image_url TEXT,
    happiness_rating INTEGER CHECK (happiness_rating >= 1 AND happiness_rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(user_id, slug)
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_pattern ON projects(pattern_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_started ON projects(started_at DESC);
CREATE INDEX idx_projects_finished ON projects(finished_at DESC);

-- Now add FK for user_needles.current_project_id
ALTER TABLE user_needles ADD CONSTRAINT fk_user_needles_project 
    FOREIGN KEY (current_project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- Also for pattern_reading_progress.project_id
ALTER TABLE pattern_reading_progress ADD CONSTRAINT fk_reading_progress_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

CREATE TABLE project_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    progress_percent INTEGER,
    taken_at_row INTEGER,
    taken_at_section VARCHAR(100),
    is_cover BOOLEAN DEFAULT FALSE,
    is_finished_photo BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    taken_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_photos_project ON project_photos(project_id);

CREATE TABLE project_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    pattern_section_id UUID REFERENCES pattern_sections(id),
    name VARCHAR(100) NOT NULL,
    section_type section_type,
    display_order INTEGER DEFAULT 0,
    current_row INTEGER DEFAULT 0,
    total_rows INTEGER,
    is_estimated_total BOOLEAN DEFAULT FALSE,
    target_measurement_cm DECIMAL(5,2),
    current_measurement_cm DECIMAL(5,2),
    last_measured_at_row INTEGER,
    next_measure_at_row INTEGER,
    current_repeat INTEGER DEFAULT 0,
    total_repeats INTEGER,
    rows_per_repeat INTEGER,
    is_active BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    time_spent_minutes INTEGER DEFAULT 0,
    counter_haptic_feedback BOOLEAN DEFAULT TRUE,
    counter_sound_enabled BOOLEAN DEFAULT TRUE,
    counter_voice_enabled BOOLEAN DEFAULT FALSE,
    counter_auto_advance BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_sections_project ON project_sections(project_id);

-- Row completion tracking (checklist)
CREATE TABLE project_row_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_section_id UUID NOT NULL REFERENCES project_sections(id) ON DELETE CASCADE,
    pattern_row_id UUID REFERENCES pattern_rows(id) ON DELETE SET NULL,
    row_number INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    repeat_number INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_section_id, row_number, repeat_number)
);

CREATE INDEX idx_project_row_completions ON project_row_completions(project_section_id);

-- Repeat progress tracking
CREATE TABLE project_repeat_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_section_id UUID NOT NULL REFERENCES project_sections(id) ON DELETE CASCADE,
    pattern_repeat_id UUID REFERENCES pattern_repeats(id),
    current_repeat INTEGER DEFAULT 0,
    total_repeats INTEGER,
    is_completed BOOLEAN DEFAULT FALSE,
    current_row_in_repeat INTEGER DEFAULT 1,
    total_rows_in_repeat INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE row_counter_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_section_id UUID NOT NULL REFERENCES project_sections(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    previous_value INTEGER,
    input_type counter_input_type DEFAULT 'click',
    voice_transcript TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_row_counter_history_section ON row_counter_history(project_section_id);
CREATE INDEX idx_row_counter_history_created ON row_counter_history(created_at DESC);

CREATE TABLE project_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_section_id UUID NOT NULL REFERENCES project_sections(id) ON DELETE CASCADE,
    measured_at_row INTEGER NOT NULL,
    measurement_cm DECIMAL(5,2) NOT NULL,
    measurement_inches DECIMAL(5,2),
    target_cm DECIMAL(5,2),
    notes TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_gauge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    stitches_per_10cm DECIMAL(4,1),
    stitches_per_4in DECIMAL(4,1),
    rows_per_10cm DECIMAL(4,1),
    rows_per_4in DECIMAL(4,1),
    swatch_width_cm DECIMAL(5,2),
    swatch_height_cm DECIMAL(5,2),
    swatch_stitches INTEGER,
    swatch_rows INTEGER,
    needle_mm DECIMAL(3,2),
    needle_us VARCHAR(10),
    hook_mm DECIMAL(3,2),
    hook_us VARCHAR(10),
    blocked BOOLEAN DEFAULT FALSE,
    blocked_stitches_per_10cm DECIMAL(4,1),
    blocked_rows_per_10cm DECIMAL(4,1),
    notes TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_yarns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stash_id UUID REFERENCES user_stash(id),
    yarn_id UUID REFERENCES yarns(id),
    custom_yarn_name VARCHAR(200),
    custom_colorway VARCHAR(100),
    color_hex VARCHAR(7),
    skeins_used DECIMAL(5,2),
    grams_used INTEGER,
    meters_used INTEGER,
    yards_used INTEGER,
    estimated_total_meters INTEGER,
    meters_per_row DECIMAL(4,2),
    color_role VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_yarns_project ON project_yarns(project_id);

CREATE TABLE project_time_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_section_id UUID REFERENCES project_sections(id),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    rows_completed INTEGER,
    start_row INTEGER,
    end_row INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_time_sessions_project ON project_time_sessions(project_id);
CREATE INDEX idx_project_time_sessions_date ON project_time_sessions(started_at DESC);

CREATE TABLE project_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    at_row INTEGER,
    at_section_id UUID REFERENCES project_sections(id),
    visibility visibility DEFAULT 'private',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project analytics
CREATE TABLE project_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    avg_rows_per_session DECIMAL(5,1),
    avg_session_duration_minutes DECIMAL(6,1),
    fastest_row_seconds INTEGER,
    slowest_row_seconds INTEGER,
    predicted_yarn_usage_meters INTEGER,
    predicted_yarn_usage_grams INTEGER,
    predicted_completion_date DATE,
    predicted_remaining_hours DECIMAL(6,1),
    progress_by_day JSONB,
    rows_by_day JSONB,
    time_by_day JSONB,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SOCIAL
-- ============================================================================

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    content_type content_type DEFAULT 'post',
    content TEXT,
    visibility visibility DEFAULT 'public',
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    progress_percent INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_project ON posts(project_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

CREATE TABLE post_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    pattern_id UUID REFERENCES patterns(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_project ON comments(project_id);
CREATE INDEX idx_comments_pattern ON comments(pattern_id);

CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    pattern_id UUID REFERENCES patterns(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, post_id),
    UNIQUE(user_id, project_id),
    UNIQUE(user_id, pattern_id),
    UNIQUE(user_id, comment_id)
);

CREATE INDEX idx_likes_user ON likes(user_id);

-- ============================================================================
-- GROUPS & COMMUNITIES
-- ============================================================================

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    rules TEXT,
    cover_image_url TEXT,
    icon_url TEXT,
    visibility visibility DEFAULT 'public',
    requires_approval BOOLEAN DEFAULT FALSE,
    posting_permission VARCHAR(20) DEFAULT 'members',
    member_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_slug ON groups(slug);

CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);

CREATE TABLE group_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    content TEXT NOT NULL,
    content_type content_type DEFAULT 'discussion',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_group_posts_group ON group_posts(group_id);

-- ============================================================================
-- KNIT-ALONGS (KALs)
-- ============================================================================

CREATE TABLE knit_alongs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    rules TEXT,
    pattern_ids UUID[],
    start_date DATE,
    end_date DATE,
    sign_up_deadline DATE,
    has_mystery_clues BOOLEAN DEFAULT FALSE,
    has_prizes BOOLEAN DEFAULT FALSE,
    prize_description TEXT,
    host_id UUID NOT NULL REFERENCES users(id),
    host_group_id UUID REFERENCES groups(id),
    visibility visibility DEFAULT 'public',
    participant_count INTEGER DEFAULT 0,
    finished_count INTEGER DEFAULT 0,
    cover_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kal_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kal_id UUID NOT NULL REFERENCES knit_alongs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    UNIQUE(kal_id, user_id)
);

CREATE TABLE kal_clues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kal_id UUID NOT NULL REFERENCES knit_alongs(id) ON DELETE CASCADE,
    clue_number INTEGER NOT NULL,
    title VARCHAR(200),
    description TEXT,
    instructions TEXT,
    release_date TIMESTAMPTZ,
    is_released BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MARKETPLACE
-- ============================================================================

CREATE TABLE designer_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    shop_name VARCHAR(100),
    shop_slug VARCHAR(100) UNIQUE,
    shop_description TEXT,
    shop_policies TEXT,
    refund_policy TEXT,
    banner_url TEXT,
    logo_url TEXT,
    support_email VARCHAR(255),
    stripe_account_id VARCHAR(255),
    stripe_onboarded BOOLEAN DEFAULT FALSE,
    paypal_email VARCHAR(255),
    tax_id VARCHAR(100),
    total_sales INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    average_rating DECIMAL(3,2),
    review_count INTEGER DEFAULT 0,
    vacation_mode BOOLEAN DEFAULT FALSE,
    vacation_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pattern_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL UNIQUE REFERENCES patterns(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    sale_price DECIMAL(10,2),
    sale_start TIMESTAMPTZ,
    sale_end TIMESTAMPTZ,
    status listing_status DEFAULT 'draft',
    sales_count INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    preview_pages INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_id UUID NOT NULL REFERENCES patterns(id),
    listing_id UUID NOT NULL REFERENCES pattern_listings(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255),
    paypal_transaction_id VARCHAR(255),
    status purchase_status DEFAULT 'pending',
    seller_id UUID NOT NULL REFERENCES users(id),
    seller_amount DECIMAL(10,2),
    platform_fee DECIMAL(10,2),
    download_count INTEGER DEFAULT 0,
    last_download_at TIMESTAMPTZ,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    refunded_at TIMESTAMPTZ
);

CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_seller ON purchases(seller_id);

CREATE TABLE pattern_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id),
    purchase_id UUID REFERENCES purchases(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,
    clarity_rating INTEGER CHECK (clarity_rating >= 1 AND clarity_rating <= 5),
    accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    photo_urls TEXT[],
    helpful_count INTEGER DEFAULT 0,
    designer_response TEXT,
    designer_responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pattern_id, user_id)
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    pattern_id UUID REFERENCES patterns(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    kal_id UUID REFERENCES knit_alongs(id) ON DELETE CASCADE,
    achievement_id INTEGER,
    title VARCHAR(255),
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- ANALYTICS & GAMIFICATION
-- ============================================================================

CREATE TABLE user_knitting_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    last_knitting_date DATE,
    streak_start_date DATE,
    days_knit_this_week INTEGER DEFAULT 0,
    time_this_week_minutes INTEGER DEFAULT 0,
    rows_this_week INTEGER DEFAULT 0,
    days_knit_this_month INTEGER DEFAULT 0,
    time_this_month_minutes INTEGER DEFAULT 0,
    rows_this_month INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_daily_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    time_spent_minutes INTEGER DEFAULT 0,
    rows_completed INTEGER DEFAULT 0,
    projects_worked_on INTEGER DEFAULT 0,
    achievements_earned TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, activity_date)
);

CREATE INDEX idx_user_daily_activity ON user_daily_activity(user_id, activity_date);

CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    criteria_type VARCHAR(50),
    criteria_value INTEGER,
    rarity VARCHAR(20) DEFAULT 'common',
    points INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    project_id UUID REFERENCES projects(id),
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements ON user_achievements(user_id);

-- Voice command log (for analytics)
CREATE TABLE voice_command_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    transcript TEXT NOT NULL,
    detected_command VARCHAR(50),
    confidence DECIMAL(3,2),
    was_successful BOOLEAN,
    action_taken VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_command_log_user ON voice_command_log(user_id);

-- ============================================================================
-- SEARCH & DISCOVERY
-- ============================================================================

CREATE TABLE user_search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    search_type VARCHAR(50),
    filters_used JSONB,
    results_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_search_history ON user_search_history(user_id, created_at DESC);

CREATE TABLE user_recently_viewed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX idx_user_recently_viewed ON user_recently_viewed(user_id, viewed_at DESC);

-- ============================================================================
-- AI PROCESSING
-- ============================================================================

CREATE TABLE ai_pattern_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_id UUID REFERENCES patterns(id) ON DELETE SET NULL,
    session_type VARCHAR(50),
    input_parameters JSONB,
    conversation_history JSONB,
    generated_pattern JSONB,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_yarn_companies_updated_at BEFORE UPDATE ON yarn_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_yarns_updated_at BEFORE UPDATE ON yarns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_stash_updated_at BEFORE UPDATE ON user_stash FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_needles_updated_at BEFORE UPDATE ON user_needles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patterns_updated_at BEFORE UPDATE ON patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pattern_sections_updated_at BEFORE UPDATE ON pattern_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pattern_charts_updated_at BEFORE UPDATE ON pattern_charts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pattern_annotations_updated_at BEFORE UPDATE ON pattern_annotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_pattern_library_updated_at BEFORE UPDATE ON user_pattern_library FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_sections_updated_at BEFORE UPDATE ON project_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_repeat_progress_updated_at BEFORE UPDATE ON project_repeat_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_gauge_updated_at BEFORE UPDATE ON project_gauge FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_notes_updated_at BEFORE UPDATE ON project_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_group_posts_updated_at BEFORE UPDATE ON group_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knit_alongs_updated_at BEFORE UPDATE ON knit_alongs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_designer_profiles_updated_at BEFORE UPDATE ON designer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pattern_listings_updated_at BEFORE UPDATE ON pattern_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pattern_reviews_updated_at BEFORE UPDATE ON pattern_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_pattern_sessions_updated_at BEFORE UPDATE ON ai_pattern_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE VIEW popular_patterns AS
SELECT 
    p.*,
    u.username as author_username,
    u.display_name as author_display_name,
    u.avatar_url as author_avatar_url,
    COALESCE(pl.price, 0) as price,
    pl.currency,
    pl.sale_price,
    CASE WHEN pl.id IS NOT NULL AND pl.status = 'active' THEN TRUE ELSE FALSE END as is_for_sale
FROM patterns p
JOIN users u ON p.author_id = u.id
LEFT JOIN pattern_listings pl ON p.id = pl.pattern_id
WHERE p.is_published = TRUE AND p.deleted_at IS NULL
ORDER BY p.favorite_count DESC, p.project_count DESC;

CREATE VIEW active_projects AS
SELECT 
    p.*,
    u.username,
    u.display_name,
    u.avatar_url,
    pat.title as pattern_title,
    pat.slug as pattern_slug
FROM projects p
JOIN users u ON p.user_id = u.id
LEFT JOIN patterns pat ON p.pattern_id = pat.id
WHERE p.status = 'in_progress' AND p.visibility = 'public' AND p.deleted_at IS NULL
ORDER BY p.updated_at DESC;

-- ============================================================================
-- SOCIAL: ACTIVITY FEED (created after projects/patterns/posts)
-- ============================================================================

CREATE TABLE activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type activity_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    -- Polymorphic references
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    pattern_id UUID REFERENCES patterns(id) ON DELETE SET NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    -- Additional data as JSON
    metadata JSONB DEFAULT '{}',
    -- Visibility
    is_public BOOLEAN DEFAULT TRUE,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_feed_user ON activity_feed(user_id);
CREATE INDEX idx_activity_feed_created ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_type ON activity_feed(activity_type);
CREATE INDEX idx_activity_feed_public ON activity_feed(is_public) WHERE is_public = TRUE;
