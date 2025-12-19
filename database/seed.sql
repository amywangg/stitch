-- ============================================================================
-- STITCH SEED DATA
-- Initial data for development and testing
-- ============================================================================

-- ============================================================================
-- YARN WEIGHTS
-- ============================================================================

INSERT INTO yarn_weights (name, category, ply_range, knit_gauge_min, knit_gauge_max, recommended_needle_us_min, recommended_needle_us_max, recommended_needle_mm_min, recommended_needle_mm_max) VALUES
('Lace', 'lace', '2-ply', 32, 40, '000', '1', 1.5, 2.25),
('Light Fingering', 'light_fingering', '3-ply', 30, 32, '0', '2', 2.0, 2.75),
('Fingering', 'fingering', '4-ply', 27, 32, '1', '3', 2.25, 3.25),
('Sport', 'sport', '5-ply', 23, 26, '3', '5', 3.25, 3.75),
('DK', 'dk', '8-ply', 21, 24, '5', '7', 3.75, 4.5),
('Worsted', 'worsted', '10-ply', 16, 20, '7', '9', 4.5, 5.5),
('Aran', 'aran', '10-ply', 16, 18, '8', '9', 5.0, 5.5),
('Bulky', 'bulky', '12-ply', 12, 15, '9', '11', 5.5, 8.0),
('Super Bulky', 'super_bulky', '14-ply', 7, 11, '11', '17', 8.0, 9.9),
('Jumbo', 'jumbo', '16-ply+', 5, 7, '17', '50', 9.9, 9.9);

-- ============================================================================
-- NEEDLE SIZE CHART
-- ============================================================================

INSERT INTO needle_size_chart (size_mm, size_us, size_uk, hook_us, hook_uk) VALUES
(2.0, '0', '14', '-', '14'),
(2.25, '1', '13', 'B/1', '13'),
(2.5, '-', '-', '-', '12'),
(2.75, '2', '12', 'C/2', '-'),
(3.0, '-', '11', '-', '11'),
(3.25, '3', '10', 'D/3', '10'),
(3.5, '4', '-', 'E/4', '9'),
(3.75, '5', '9', 'F/5', '-'),
(4.0, '6', '8', 'G/6', '8'),
(4.5, '7', '7', '7', '7'),
(5.0, '8', '6', 'H/8', '6'),
(5.5, '9', '5', 'I/9', '5'),
(6.0, '10', '4', 'J/10', '4'),
(6.5, '10.5', '3', 'K/10.5', '3'),
(7.0, '-', '2', '-', '2'),
(8.0, '11', '0', 'L/11', '0'),
(9.0, '13', '00', 'M/13', '00'),
(10.0, '15', '000', 'N/15', '000'),
(12.75, '17', '-', 'P/Q', '-'),
(15.0, '19', '-', 'Q', '-'),
(19.0, '35', '-', 'S', '-'),
(25.0, '50', '-', '-', '-');

-- ============================================================================
-- STANDARD MEASUREMENTS
-- ============================================================================

INSERT INTO standard_measurements (measurement_system, size_name, bust_cm, waist_cm, hip_cm, shoulder_width_cm, arm_length_cm) VALUES
('women', 'XS', 76, 61, 84, 37, 58),
('women', 'S', 84, 69, 92, 38, 58),
('women', 'M', 92, 77, 100, 40, 59),
('women', 'L', 102, 87, 110, 42, 59),
('women', 'XL', 112, 97, 120, 44, 60),
('women', '2XL', 122, 107, 130, 46, 60),
('women', '3XL', 132, 117, 140, 48, 61),
('women', '4XL', 142, 127, 150, 50, 61),
('women', '5XL', 152, 137, 160, 52, 62),
('men', 'S', 92, 77, 92, 44, 64),
('men', 'M', 102, 87, 100, 46, 65),
('men', 'L', 112, 97, 108, 48, 66),
('men', 'XL', 122, 107, 116, 50, 67),
('men', '2XL', 132, 117, 124, 52, 68);

-- ============================================================================
-- CHART SYMBOLS
-- ============================================================================

INSERT INTO chart_symbols (symbol, name, abbreviation, description, category, craft_type) VALUES
('k', 'Knit', 'k', 'Knit stitch on RS, purl on WS', 'basic', 'knitting'),
('p', 'Purl', 'p', 'Purl stitch on RS, knit on WS', 'basic', 'knitting'),
('yo', 'Yarn Over', 'yo', 'Wrap yarn around needle', 'increase', 'knitting'),
('k2tog', 'Knit 2 Together', 'k2tog', 'Right-leaning decrease', 'decrease', 'knitting'),
('ssk', 'Slip Slip Knit', 'ssk', 'Left-leaning decrease', 'decrease', 'knitting'),
('sl', 'Slip', 'sl', 'Slip stitch purlwise', 'basic', 'knitting'),
('kfb', 'Knit Front Back', 'kfb', 'Increase by knitting into front and back', 'increase', 'knitting'),
('m1l', 'Make 1 Left', 'm1l', 'Left-leaning increase', 'increase', 'knitting'),
('m1r', 'Make 1 Right', 'm1r', 'Right-leaning increase', 'increase', 'knitting'),
('cdd', 'Central Double Decrease', 'cdd', 'Slip 2, knit 1, pass slipped stitches over', 'decrease', 'knitting'),
('c4f', 'Cable 4 Front', 'c4f', 'Slip 2 to CN, hold front, k2, k2 from CN', 'cable', 'knitting'),
('c4b', 'Cable 4 Back', 'c4b', 'Slip 2 to CN, hold back, k2, k2 from CN', 'cable', 'knitting'),
('ch', 'Chain', 'ch', 'Chain stitch', 'basic', 'crochet'),
('sc', 'Single Crochet', 'sc', 'Single crochet stitch', 'basic', 'crochet'),
('dc', 'Double Crochet', 'dc', 'Double crochet stitch', 'basic', 'crochet'),
('hdc', 'Half Double Crochet', 'hdc', 'Half double crochet stitch', 'basic', 'crochet'),
('tr', 'Treble Crochet', 'tr', 'Treble crochet stitch', 'basic', 'crochet');

-- ============================================================================
-- ACHIEVEMENTS
-- ============================================================================

INSERT INTO achievements (slug, name, description, criteria_type, criteria_value, rarity, points) VALUES
('first_stitch', 'First Stitch', 'Complete your first row', 'rows_knit', 1, 'common', 5),
('getting_started', 'Getting Started', 'Start your first project', 'projects_started', 1, 'common', 5),
('finisher', 'Finisher', 'Complete your first project', 'projects_completed', 1, 'common', 20),
('dedicated', 'Dedicated Knitter', 'Complete 5 projects', 'projects_completed', 5, 'uncommon', 50),
('prolific', 'Prolific Creator', 'Complete 25 projects', 'projects_completed', 25, 'rare', 100),
('master', 'Master Craftsperson', 'Complete 100 projects', 'projects_completed', 100, 'epic', 500),
('streak_week', 'Week Warrior', 'Knit for 7 days in a row', 'streak_days', 7, 'common', 25),
('streak_month', 'Monthly Dedication', 'Knit for 30 days in a row', 'streak_days', 30, 'uncommon', 75),
('streak_100', 'Century Streak', 'Knit for 100 days in a row', 'streak_days', 100, 'rare', 200),
('time_10', 'Ten Hour Club', 'Spend 10 hours knitting', 'time_knit', 600, 'common', 15),
('time_100', 'Hundred Hour Club', 'Spend 100 hours knitting', 'time_knit', 6000, 'uncommon', 100),
('time_1000', 'Thousand Hour Club', 'Spend 1000 hours knitting', 'time_knit', 60000, 'legendary', 1000),
('rows_1k', 'Row by Row', 'Complete 1,000 rows', 'rows_knit', 1000, 'common', 20),
('rows_10k', 'Row Master', 'Complete 10,000 rows', 'rows_knit', 10000, 'uncommon', 75),
('rows_100k', 'Row Legend', 'Complete 100,000 rows', 'rows_knit', 100000, 'epic', 300),
('voice_first', 'Hands Free', 'Use voice commands for the first time', 'voice_commands', 1, 'common', 10),
('pattern_import', 'Pattern Importer', 'Import your first pattern', 'patterns_imported', 1, 'common', 10),
('stash_builder', 'Stash Builder', 'Add 10 yarns to your stash', 'stash_count', 10, 'common', 15),
('social_butterfly', 'Social Butterfly', 'Get 10 followers', 'followers', 10, 'uncommon', 30),
('helpful', 'Helpful Knitter', 'Leave 10 comments', 'comments', 10, 'common', 15);

-- ============================================================================
-- TAGS
-- ============================================================================

INSERT INTO tags (name, slug, category, usage_count) VALUES
('sweater', 'sweater', 'garment', 0),
('cardigan', 'cardigan', 'garment', 0),
('socks', 'socks', 'garment', 0),
('hat', 'hat', 'garment', 0),
('scarf', 'scarf', 'garment', 0),
('shawl', 'shawl', 'garment', 0),
('blanket', 'blanket', 'garment', 0),
('mittens', 'mittens', 'garment', 0),
('cables', 'cables', 'technique', 0),
('lace', 'lace', 'technique', 0),
('colorwork', 'colorwork', 'technique', 0),
('fair-isle', 'fair-isle', 'technique', 0),
('stranded', 'stranded', 'technique', 0),
('intarsia', 'intarsia', 'technique', 0),
('brioche', 'brioche', 'technique', 0),
('mosaic', 'mosaic', 'technique', 0),
('short-rows', 'short-rows', 'technique', 0),
('seamless', 'seamless', 'construction', 0),
('top-down', 'top-down', 'construction', 0),
('bottom-up', 'bottom-up', 'construction', 0),
('raglan', 'raglan', 'construction', 0),
('set-in-sleeves', 'set-in-sleeves', 'construction', 0),
('circular', 'circular', 'construction', 0),
('flat', 'flat', 'construction', 0),
('beginner-friendly', 'beginner-friendly', 'skill', 0),
('quick-knit', 'quick-knit', 'skill', 0),
('one-skein', 'one-skein', 'skill', 0),
('modern', 'modern', 'style', 0),
('vintage', 'vintage', 'style', 0),
('minimalist', 'minimalist', 'style', 0),
('winter', 'winter', 'season', 0),
('summer', 'summer', 'season', 0),
('holiday', 'holiday', 'season', 0),
('gift', 'gift', 'occasion', 0),
('baby', 'baby', 'recipient', 0),
('kids', 'kids', 'recipient', 0),
('mens', 'mens', 'recipient', 0),
('womens', 'womens', 'recipient', 0),
('unisex', 'unisex', 'recipient', 0);

-- ============================================================================
-- YARN COMPANIES
-- ============================================================================

INSERT INTO yarn_companies (id, name, slug, website_url, is_verified, is_active) VALUES
('c1000000-0000-0000-0000-000000000001', 'Malabrigo', 'malabrigo', 'https://malabrigoyarn.com', TRUE, TRUE),
('c2000000-0000-0000-0000-000000000002', 'Madelinetosh', 'madelinetosh', 'https://madelinetosh.com', TRUE, TRUE),
('c3000000-0000-0000-0000-000000000003', 'Cascade Yarns', 'cascade-yarns', 'https://cascadeyarns.com', TRUE, TRUE),
('c4000000-0000-0000-0000-000000000004', 'Lion Brand', 'lion-brand', 'https://lionbrand.com', TRUE, TRUE),
('c5000000-0000-0000-0000-000000000005', 'Drops', 'drops', 'https://garnstudio.com', TRUE, TRUE),
('c6000000-0000-0000-0000-000000000006', 'Rowan', 'rowan', 'https://knitrowan.com', TRUE, TRUE),
('c7000000-0000-0000-0000-000000000007', 'Berroco', 'berroco', 'https://berroco.com', TRUE, TRUE),
('c8000000-0000-0000-0000-000000000008', 'Brooklyn Tweed', 'brooklyn-tweed', 'https://brooklyntweed.com', TRUE, TRUE),
('c9000000-0000-0000-0000-000000000009', 'Hedgehog Fibres', 'hedgehog-fibres', 'https://shop.hedgehogfibres.com', TRUE, TRUE),
('ca000000-0000-0000-0000-00000000000a', 'Spincycle Yarns', 'spincycle-yarns', 'https://spincycleyarns.com', TRUE, TRUE);

-- ============================================================================
-- SAMPLE YARNS
-- ============================================================================

INSERT INTO yarns (id, company_id, name, slug, weight_id, fiber_content, primary_fiber, meters_per_skein, grams_per_skein, gauge_stitches, gauge_rows, recommended_needle_mm, is_verified) VALUES
('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Rios', 'rios', 6, '100% Superwash Merino', 'merino', 192, 100, 18, 24, 5.0, TRUE),
('a2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Sock', 'sock', 3, '100% Superwash Merino', 'merino', 402, 100, 28, 36, 3.0, TRUE),
('a3000000-0000-0000-0000-000000000003', 'c2000000-0000-0000-0000-000000000002', 'Tosh Merino Light', 'tosh-merino-light', 5, '100% Superwash Merino', 'merino', 384, 115, 22, 30, 4.0, TRUE),
('a4000000-0000-0000-0000-000000000004', 'c3000000-0000-0000-0000-000000000003', 'Cascade 220', 'cascade-220', 6, '100% Peruvian Highland Wool', 'wool', 201, 100, 18, 24, 5.0, TRUE),
('a5000000-0000-0000-0000-000000000005', 'c8000000-0000-0000-0000-000000000008', 'Shelter', 'shelter', 6, '100% American Targhee-Columbia Wool', 'wool', 128, 50, 17, 23, 5.0, TRUE);

-- ============================================================================
-- NEEDLE BRANDS
-- ============================================================================

INSERT INTO needle_brands (id, name, website_url, is_verified) VALUES
('b1000000-0000-0000-0000-000000000001', 'ChiaoGoo', 'https://chiaogoo.com', TRUE),
('b2000000-0000-0000-0000-000000000002', 'Addi', 'https://addi.de', TRUE),
('b3000000-0000-0000-0000-000000000003', 'HiyaHiya', 'https://hiyahiya.com', TRUE),
('b4000000-0000-0000-0000-000000000004', 'Knitters Pride', 'https://knitterspride.com', TRUE),
('b5000000-0000-0000-0000-000000000005', 'Clover', 'https://clover-usa.com', TRUE);

-- ============================================================================
-- TEST USERS
-- ============================================================================

-- Password is 'password123' (bcrypt hashed)
INSERT INTO users (id, email, username, password_hash, display_name, bio, role, is_verified, email_verified) VALUES
('a0000000-0000-0000-0000-000000000001', 'test@stitch.app', 'testknitter', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.AVrwGc4pnYG6Iq', 'Test Knitter', 'Just a test account for development! 🧶', 'user', TRUE, TRUE),
('a0000000-0000-0000-0000-000000000002', 'designer@stitch.app', 'creativeknitco', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.AVrwGc4pnYG6Iq', 'Creative Knit Co', 'Independent pattern designer creating modern, size-inclusive knits.', 'designer', TRUE, TRUE),
('a0000000-0000-0000-0000-000000000003', 'admin@stitch.app', 'stitchadmin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.AVrwGc4pnYG6Iq', 'Stitch Admin', 'Platform administrator', 'admin', TRUE, TRUE);

INSERT INTO user_settings (user_id) VALUES 
('a0000000-0000-0000-0000-000000000001'),
('a0000000-0000-0000-0000-000000000002'),
('a0000000-0000-0000-0000-000000000003');

INSERT INTO user_stats (user_id) VALUES 
('a0000000-0000-0000-0000-000000000001'),
('a0000000-0000-0000-0000-000000000002'),
('a0000000-0000-0000-0000-000000000003');

INSERT INTO user_knitting_streaks (user_id) VALUES
('a0000000-0000-0000-0000-000000000001'),
('a0000000-0000-0000-0000-000000000002');

INSERT INTO designer_profiles (user_id, shop_name, shop_slug, shop_description) VALUES
('a0000000-0000-0000-0000-000000000002', 'Creative Knit Co', 'creative-knit-co', 'Modern, size-inclusive knitting patterns for all skill levels. Every pattern tested and tech edited.');

-- ============================================================================
-- SAMPLE PATTERN
-- ============================================================================

INSERT INTO patterns (
    id, author_id, title, slug, description,
    craft_type, garment_type, difficulty,
    is_seamless, is_worked_in_round, is_top_down,
    techniques,
    size_range, is_size_inclusive, fit_type,
    gauge_stitches, gauge_rows, gauge_pattern, gauge_needle_mm, gauge_needle_us, gauge_critical,
    recommended_yarn_id, total_yardage_min, total_yardage_max,
    is_published, published_at, is_free,
    parsing_source
) VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'Everyday Raglan Sweater',
    'everyday-raglan-sweater',
    'A classic top-down raglan sweater with a relaxed fit. Perfect for layering or wearing on its own.',
    'knitting', 'sweater', 'intermediate',
    TRUE, TRUE, TRUE,
    ARRAY['seamless', 'raglan', 'top-down'],
    'XS-5XL', TRUE, 'relaxed',
    18, 24, 'stockinette', 5.0, '8', TRUE,
    'a1000000-0000-0000-0000-000000000001',
    1100, 2200,
    TRUE, NOW(), TRUE,
    'manual'
);

INSERT INTO pattern_sizes (id, pattern_id, name, display_order, bust_cm, finished_bust_cm, finished_length_cm, yardage) VALUES
('f0000001-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'XS', 0, 76, 91, 58, 1100),
('f0000002-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'S', 1, 84, 99, 60, 1250),
('f0000003-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'M', 2, 92, 107, 62, 1400),
('f0000004-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'L', 3, 102, 117, 64, 1550),
('f0000005-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 'XL', 4, 112, 127, 66, 1700),
('f0000006-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000001', '2XL', 5, 122, 137, 68, 1900),
('f0000007-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000001', '3XL', 6, 132, 147, 70, 2050),
('f0000008-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000001', '4XL', 7, 142, 157, 72, 2200),
('f0000009-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000001', '5XL', 8, 152, 167, 74, 2350);

INSERT INTO pattern_sections (id, pattern_id, section_type, name, display_order, instructions) VALUES
('d0000001-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'yoke', 'Yoke', 0, 'The yoke is worked from the top down, starting at the neck.'),
('d0000002-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'body', 'Body', 1, 'After dividing for sleeves, the body is worked in the round.'),
('d0000003-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'sleeve', 'Sleeves', 2, 'Sleeves are worked in the round from the top down.'),
('d0000004-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'collar', 'Neckband', 3, 'A simple ribbed neckband finishes the sweater.');

-- Yoke rows
INSERT INTO pattern_rows (section_id, row_number, row_label, instruction, instruction_type, stitch_count_by_size) VALUES
('d0000001-0000-0000-0000-000000000001', 1, 'Cast On', 'Using long-tail cast on, cast on the following stitches for your size. Place marker and join to work in the round.', 'counted', '{"XS": 72, "S": 76, "M": 80, "L": 84, "XL": 88, "2XL": 92, "3XL": 96, "4XL": 100, "5XL": 104}'),
('d0000001-0000-0000-0000-000000000001', 2, 'Setup', 'K1, pm, k16 (17, 18, 19, 20, 21, 22, 23, 24) for front, pm, k1, pm, k18 (19, 20, 21, 22, 23, 24, 25, 26) for sleeve, pm, k1, pm, k16 (17, 18, 19, 20, 21, 22, 23, 24) for back, pm, k1, pm, k18 (19, 20, 21, 22, 23, 24, 25, 26) for sleeve.', 'counted', '{"XS": 72, "S": 76, "M": 80, "L": 84, "XL": 88, "2XL": 92, "3XL": 96, "4XL": 100, "5XL": 104}'),
('d0000001-0000-0000-0000-000000000001', 3, 'Inc Rnd', '*K to 1 st before marker, kfb, sm, kfb; rep from * 3 more times, k to end. (8 sts inc)', 'counted', NULL),
('d0000001-0000-0000-0000-000000000001', 4, 'Plain Rnd', 'Knit all stitches.', 'counted', NULL);

-- Measurement-based row
INSERT INTO pattern_rows (section_id, row_number, row_label, instruction, instruction_type, target_measurement_cm, estimated_rows, measure_every_n_rows, measurement_notes) VALUES
('d0000001-0000-0000-0000-000000000001', 5, 'Repeat', 'Repeat Rounds 3-4 until yoke measures approximately 22cm from cast on edge.', 'measured', 22, 53, 10, 'Measure from cast on edge straight down');

-- Checkpoint
INSERT INTO pattern_rows (section_id, row_number, row_label, instruction, instruction_type, is_checkpoint, checkpoint_message) VALUES
('d0000001-0000-0000-0000-000000000001', 6, 'Try On', 'Try on your work! The yoke should reach to your underarms comfortably.', 'marker', TRUE, 'Great stopping point! Try on before separating for body and sleeves.');

-- Body rows
INSERT INTO pattern_rows (section_id, row_number, row_label, instruction, instruction_type, stitch_count_by_size) VALUES
('d0000002-0000-0000-0000-000000000002', 1, 'Divide', 'Knit to first sleeve marker, remove marker, place sleeve stitches on hold, CO underarm sts, knit across back, repeat for second sleeve.', 'counted', '{"XS": 164, "S": 178, "M": 196, "L": 214, "XL": 232, "2XL": 250, "3XL": 268, "4XL": 286, "5XL": 304}');

INSERT INTO pattern_rows (section_id, row_number, row_label, instruction, instruction_type, target_measurement_cm, estimated_rows, measure_every_n_rows, measurement_notes) VALUES
('d0000002-0000-0000-0000-000000000002', 2, 'Body Length', 'Knit in stockinette until body measures 35cm from underarm, or 5cm less than desired length.', 'measured', 35, 84, 15, 'Measure from underarm straight down');

INSERT INTO pattern_rows (section_id, row_number, row_label, instruction, instruction_type, target_measurement_cm, estimated_rows) VALUES
('d0000002-0000-0000-0000-000000000002', 3, 'Hem', 'Work in 2x2 rib (k2, p2) for 5cm. Bind off loosely in pattern.', 'measured', 5, 12);

-- ============================================================================
-- SAMPLE PROJECT
-- ============================================================================

INSERT INTO projects (
    id, user_id, pattern_id, size_id,
    title, slug, description,
    status, visibility, progress_percent,
    cast_on_date, started_at, total_time_minutes,
    actual_gauge_stitches, actual_gauge_rows,
    needle_size_mm, needle_size_us, needle_type, notes
) VALUES (
    'ee000001-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'f0000003-0000-0000-0000-000000000003',
    'My Everyday Raglan',
    'my-everyday-raglan',
    'Making this in a gorgeous teal colorway!',
    'in_progress', 'public', 35,
    CURRENT_DATE - INTERVAL '14 days',
    CURRENT_DATE - INTERVAL '14 days',
    480,
    18.0, 24.0,
    5.0, '8', 'circular',
    'Loving this pattern!'
);

INSERT INTO project_sections (
    id, project_id, pattern_section_id, name, section_type, display_order,
    current_row, total_rows, is_estimated_total, target_measurement_cm,
    time_spent_minutes, is_active
) VALUES
('ef000001-0000-0000-0000-000000000001', 'ee000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'Yoke', 'yoke', 0, 48, 55, TRUE, 22.0, 240, TRUE),
('ef000002-0000-0000-0000-000000000002', 'ee000001-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000002', 'Body', 'body', 1, 0, 89, TRUE, 35.0, 0, FALSE),
('ef000003-0000-0000-0000-000000000003', 'ee000001-0000-0000-0000-000000000001', 'd0000003-0000-0000-0000-000000000003', 'Left Sleeve', 'sleeve', 2, 0, 60, FALSE, NULL, 0, FALSE),
('ef000004-0000-0000-0000-000000000004', 'ee000001-0000-0000-0000-000000000001', 'd0000003-0000-0000-0000-000000000003', 'Right Sleeve', 'sleeve', 3, 0, 60, FALSE, NULL, 0, FALSE),
('ef000005-0000-0000-0000-000000000005', 'ee000001-0000-0000-0000-000000000001', 'd0000004-0000-0000-0000-000000000004', 'Neckband', 'collar', 4, 0, 10, FALSE, NULL, 0, FALSE);

INSERT INTO project_gauge (project_id, stitches_per_10cm, rows_per_10cm, swatch_stitches, swatch_rows, swatch_width_cm, swatch_height_cm, needle_mm, blocked) VALUES
('ee000001-0000-0000-0000-000000000001', 18.0, 24.0, 22, 29, 12.2, 12.1, 5.0, TRUE);

INSERT INTO row_counter_history (project_section_id, row_number, action, previous_value, input_type, voice_transcript) VALUES
('ef000001-0000-0000-0000-000000000001', 46, 'increment', 45, 'click', NULL),
('ef000001-0000-0000-0000-000000000001', 47, 'increment', 46, 'voice', 'next row'),
('ef000001-0000-0000-0000-000000000001', 48, 'increment', 47, 'voice', 'done');

INSERT INTO project_time_sessions (project_id, project_section_id, started_at, ended_at, duration_minutes, rows_completed, start_row, end_row) VALUES
('ee000001-0000-0000-0000-000000000001', 'ef000001-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '2 hours', 120, 15, 30, 45),
('ee000001-0000-0000-0000-000000000001', 'ef000001-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '1 hour', 60, 3, 45, 48);

INSERT INTO project_measurements (project_section_id, measured_at_row, measurement_cm, target_cm, notes) VALUES
('ef000001-0000-0000-0000-000000000001', 40, 18.5, 22.0, 'Getting close! About 3.5cm to go.');

-- Update stats
UPDATE user_stats SET project_count = 1, total_knitting_time_minutes = 480, total_rows_knit = 48 WHERE user_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE user_stats SET pattern_count = 1, published_pattern_count = 1 WHERE user_id = 'a0000000-0000-0000-0000-000000000002';
UPDATE patterns SET project_count = 1 WHERE id = 'e0000000-0000-0000-0000-000000000001';
