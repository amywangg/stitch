/**
 * Decision tree configuration for the AI Pattern Builder.
 * Drives the client questionnaire dynamically — no hardcoded UI per project type.
 * Adding a new project type only requires a config entry here + a math function.
 */

import type { ProjectTypeConfig } from './types'

export const PROJECT_TYPE_CONFIGS: ProjectTypeConfig[] = [
  // ─── Hat ─────────────────────────────────────────────────────────────────
  {
    type: 'hat',
    label: 'Hat',
    description: 'Beanies, slouchy hats, berets, and watch caps',
    size_chart_key: 'hat',
    recommended_yarn_weights: ['dk', 'worsted', 'aran', 'bulky'],
    questions: [
      {
        key: 'hat_style',
        label: 'Hat style',
        type: 'single_select',
        required: true,
        options: [
          { value: 'beanie', label: 'Beanie', description: 'Classic fitted hat', default: true },
          { value: 'slouchy', label: 'Slouchy', description: 'Extra length for a relaxed drape' },
          { value: 'beret', label: 'Beret / Tam', description: 'Wide body that tapers in, worn tilted' },
          { value: 'watch_cap', label: 'Watch cap', description: 'Close-fitting, shorter than a beanie' },
        ],
      },
      {
        key: 'brim_style',
        label: 'Brim',
        type: 'single_select',
        required: true,
        options: [
          { value: 'rib_2x2', label: '2x2 Ribbing', description: 'Classic stretchy brim', default: true },
          { value: 'rib_1x1', label: '1x1 Ribbing', description: 'Finer, more elastic brim' },
          { value: 'folded_rib', label: 'Folded brim', description: 'Double-thick ribbing folded up for warmth' },
          { value: 'rolled_stockinette', label: 'Rolled edge', description: 'Stockinette curls naturally at edge' },
          { value: 'seed', label: 'Seed stitch', description: 'Textured, lies flat' },
          { value: 'garter', label: 'Garter stitch', description: 'Ridged, lies flat' },
          { value: 'picot', label: 'Picot edge', description: 'Folded hem with decorative eyelet fold line' },
          { value: 'no_brim', label: 'No brim', description: 'Body stitch all the way to the edge' },
        ],
      },
      {
        key: 'crown_style',
        label: 'Crown shaping',
        type: 'single_select',
        required: true,
        options: [
          { value: 'wedge_8', label: '8-point crown', description: 'Classic crown with 8 decrease lines', default: true },
          { value: 'wedge_6', label: '6-point crown', description: 'Slightly rounder, subtle spiral' },
          { value: 'wedge_10', label: '10-point crown', description: 'Very round, gradual decreases' },
          { value: 'spiral', label: 'Spiral', description: 'Decreases offset each round for a swirl effect' },
          { value: 'gathered', label: 'Gathered', description: 'Thread yarn through all stitches, pull tight' },
        ],
      },
      {
        key: 'body_stitch',
        label: 'Body stitch pattern',
        type: 'single_select',
        required: true,
        options: [
          { value: 'stockinette', label: 'Stockinette', description: 'Smooth, classic knit fabric', default: true },
          { value: 'seed', label: 'Seed stitch', description: 'Textured, reversible' },
          { value: 'cables', label: 'Simple cables', description: 'Vertical cable panels' },
        ],
      },
      {
        key: 'ear_flaps',
        label: 'Ear flaps',
        type: 'boolean',
        required: true,
        options: [
          { value: 'false', label: 'No ear flaps', default: true },
          { value: 'true', label: 'Add ear flaps', description: 'Triangular flaps with optional ties' },
        ],
      },
      {
        key: 'double_layered',
        label: 'Double layered (extra warm)',
        type: 'boolean',
        required: true,
        options: [
          { value: 'false', label: 'Single layer', default: true },
          { value: 'true', label: 'Double layer' },
        ],
      },
    ],
  },

  // ─── Sweater ─────────────────────────────────────────────────────────────
  {
    type: 'sweater',
    label: 'Sweater',
    description: 'Pullovers and cardigans — raglan, yoke, drop shoulder, set-in sleeve, or seamed',
    size_chart_key: 'sweater',
    recommended_yarn_weights: ['dk', 'worsted', 'aran'],
    questions: [
      {
        key: 'is_cardigan',
        label: 'Pullover or cardigan',
        type: 'single_select',
        required: true,
        options: [
          { value: 'false', label: 'Pullover', description: 'Closed front, pulled on over head', default: true },
          { value: 'true', label: 'Cardigan', description: 'Open front with closure or worn open' },
        ],
      },
      {
        key: 'construction',
        label: 'Construction method',
        type: 'single_select',
        required: true,
        options: [
          { value: 'top_down_raglan', label: 'Top-down raglan', description: 'Seamless with 4 diagonal increase lines from neck to underarm', default: true },
          { value: 'top_down_yoke', label: 'Top-down circular yoke', description: 'Round yoke with evenly distributed increases' },
          { value: 'drop_shoulder', label: 'Drop shoulder', description: 'Rectangular body and sleeves, no armhole shaping — simple and boxy' },
          { value: 'set_in_sleeve', label: 'Set-in sleeve', description: 'Shaped armhole and sleeve cap for a tailored fit' },
          { value: 'bottom_up_seamed', label: 'Bottom-up seamed', description: 'Traditional flat pieces (front, back, sleeves) joined with seams' },
        ],
      },
      {
        key: 'neckline',
        label: 'Neckline',
        type: 'single_select',
        required: true,
        options: [
          { value: 'crew', label: 'Crew neck', description: 'Classic round neckline with ribbed band', default: true },
          { value: 'v_neck', label: 'V-neck', description: 'Angled neckline with picked-up ribbing' },
          { value: 'scoop', label: 'Scoop neck', description: 'Deeper, wider round neckline' },
          { value: 'square', label: 'Square neck', description: 'Rectangular neckline opening' },
          { value: 'boat', label: 'Boat neck', description: 'Wide, shallow neckline nearly shoulder to shoulder' },
          { value: 'henley', label: 'Henley', description: 'Crew neck with a short button placket' },
          { value: 'turtleneck', label: 'Turtleneck', description: 'Tall folded collar, 15-20cm of ribbing' },
          { value: 'mock_turtleneck', label: 'Mock turtleneck', description: 'Shorter stand-up collar, 5-7cm of ribbing' },
          { value: 'cowl_neck', label: 'Cowl neck', description: 'Loose, draped turtleneck that folds over' },
          { value: 'hooded', label: 'Hooded', description: 'Attached hood instead of neckband' },
          { value: 'shawl_collar', label: 'Shawl collar', description: 'Wide collar that wraps the neckline, classic for cardigans' },
          { value: 'no_neckband', label: 'No neckband', description: 'Clean edge, no picked-up collar' },
        ],
      },
      {
        key: 'closure_type',
        label: 'Front closure',
        type: 'single_select',
        required: true,
        depends_on: { key: 'is_cardigan', values: ['true'] },
        options: [
          { value: 'button_band', label: 'Button band', description: 'Picked-up ribbing with buttonholes', default: true },
          { value: 'zipper', label: 'Zipper', description: 'Front edges finished simply, zipper sewn in' },
          { value: 'open_front', label: 'Open front', description: 'No closure, worn open or with a pin/brooch' },
        ],
      },
      {
        key: 'sleeve_style',
        label: 'Sleeve length',
        type: 'single_select',
        required: true,
        options: [
          { value: 'long', label: 'Long sleeves', default: true },
          { value: 'three_quarter', label: 'Three-quarter sleeves', description: 'Ends mid-forearm' },
          { value: 'short', label: 'Short sleeves', description: 'Ends above elbow' },
          { value: 'sleeveless', label: 'Sleeveless / vest', description: 'No sleeves' },
        ],
      },
      {
        key: 'sleeve_shape',
        label: 'Sleeve shape',
        type: 'single_select',
        required: true,
        depends_on: { key: 'sleeve_style', values: ['long', 'three_quarter'] },
        options: [
          { value: 'tapered', label: 'Tapered', description: 'Gradually narrows from shoulder to wrist', default: true },
          { value: 'straight', label: 'Straight', description: 'Same width from underarm to cuff' },
          { value: 'bell', label: 'Bell', description: 'Widens toward the cuff, flared opening' },
        ],
      },
      {
        key: 'body_fit',
        label: 'Fit',
        type: 'single_select',
        required: true,
        options: [
          { value: 'standard', label: 'Standard', description: '+10cm / 4" ease', default: true },
          { value: 'fitted', label: 'Fitted', description: '+5cm / 2" ease' },
          { value: 'relaxed', label: 'Relaxed', description: '+15cm / 6" ease' },
          { value: 'oversized', label: 'Oversized', description: '+25cm / 10" ease' },
        ],
      },
      {
        key: 'body_length',
        label: 'Body length',
        type: 'single_select',
        required: true,
        options: [
          { value: 'regular', label: 'Regular', description: 'Hits at hip', default: true },
          { value: 'cropped', label: 'Cropped', description: 'Ends above natural waist' },
          { value: 'tunic', label: 'Tunic', description: 'Extended length past hip' },
        ],
      },
      {
        key: 'body_shaping',
        label: 'Body shaping',
        type: 'single_select',
        required: true,
        options: [
          { value: 'straight', label: 'Straight', description: 'No waist shaping, same width throughout', default: true },
          { value: 'waist_shaped', label: 'Waist shaped', description: 'Decreases to waist, increases to hip for a fitted silhouette' },
          { value: 'a_line', label: 'A-line', description: 'Gradual flare from underarm to hem' },
        ],
      },
      {
        key: 'hem_style',
        label: 'Hem and cuff treatment',
        type: 'single_select',
        required: true,
        options: [
          { value: 'rib_2x2', label: '2x2 Ribbing', description: 'Classic stretchy edge', default: true },
          { value: 'rib_1x1', label: '1x1 Ribbing', description: 'Finer ribbed edge' },
          { value: 'garter', label: 'Garter stitch', description: 'Ridged edge, lies flat' },
          { value: 'folded_hem', label: 'Folded hem', description: 'Double-layer stockinette turned under' },
          { value: 'rolled', label: 'Rolled edge', description: 'Stockinette curls naturally' },
          { value: 'no_border', label: 'No border', description: 'Clean bind-off edge' },
        ],
      },
    ],
  },

  // ─── Socks ───────────────────────────────────────────────────────────────
  {
    type: 'socks',
    label: 'Socks',
    description: 'Cuff-down or toe-up socks with your choice of heel, toe, and cuff',
    size_chart_key: 'socks',
    recommended_yarn_weights: ['fingering', 'sport'],
    questions: [
      {
        key: 'construction',
        label: 'Construction direction',
        type: 'single_select',
        required: true,
        options: [
          { value: 'cuff_down', label: 'Cuff down', description: 'Start at the cuff, work down through heel and toe', default: true },
          { value: 'toe_up', label: 'Toe up', description: 'Start at the toe, work up through heel to cuff' },
        ],
      },
      {
        key: 'heel_type',
        label: 'Heel type',
        type: 'single_select',
        required: true,
        options: [
          { value: 'heel_flap_gusset', label: 'Heel flap & gusset', description: 'Classic, durable heel with a reinforced flap and triangular gusset shaping', default: true },
          { value: 'short_row', label: 'Short row (German / W&T)', description: 'Smooth cup-shaped heel with no gusset, worked in short rows' },
          { value: 'afterthought', label: 'Afterthought heel', description: 'Knit a plain tube, then go back and add the heel — easy to replace when worn' },
          { value: 'fish_lips_kiss', label: 'Fish Lips Kiss', description: 'Short-row variant with formula based on shoe size, no wraps needed' },
        ],
      },
      {
        key: 'toe_type',
        label: 'Toe shaping',
        type: 'single_select',
        required: true,
        options: [
          { value: 'wedge', label: 'Wedge toe', description: 'Decreases on two sides, creates flat wide toe', default: true },
          { value: 'star', label: 'Star toe', description: 'Decreases distributed evenly around, creates a pointed toe' },
          { value: 'rounded', label: 'Rounded toe', description: '6-8 decrease points for a rounder shape' },
        ],
      },
      {
        key: 'toe_finish',
        label: 'Toe finish',
        type: 'single_select',
        required: true,
        options: [
          { value: 'kitchener', label: 'Kitchener stitch (grafted)', description: 'Invisible seamless join, smooth against foot', default: true },
          { value: 'gathered', label: 'Gathered', description: 'Thread yarn through remaining stitches and pull tight — simpler' },
        ],
      },
      {
        key: 'cuff_style',
        label: 'Cuff style',
        type: 'single_select',
        required: true,
        options: [
          { value: 'rib_2x2', label: '2x2 Ribbing', description: 'Classic stretchy cuff', default: true },
          { value: 'rib_1x1', label: '1x1 Ribbing', description: 'Finer elastic cuff' },
          { value: 'folded', label: 'Folded cuff', description: 'Double-layer turned hem at top' },
          { value: 'picot', label: 'Picot edge', description: 'Folded hem with decorative eyelet fold line' },
          { value: 'rolled', label: 'Rolled edge', description: 'Stockinette rolls naturally at top' },
        ],
      },
      {
        key: 'leg_length',
        label: 'Leg length',
        type: 'single_select',
        required: true,
        options: [
          { value: 'crew', label: 'Crew', description: '~15cm leg', default: true },
          { value: 'no_show', label: 'No-show', description: 'Minimal cuff only, barely visible in shoes' },
          { value: 'ankle', label: 'Ankle', description: '~5cm leg' },
          { value: 'mid_calf', label: 'Mid-calf', description: '~22cm leg' },
          { value: 'knee_high', label: 'Knee high', description: '~30cm+ leg, may include calf shaping' },
        ],
      },
    ],
  },

  // ─── Mittens ─────────────────────────────────────────────────────────────
  {
    type: 'mittens',
    label: 'Mittens',
    description: 'Full mittens, fingerless mitts, or convertible flip-top mittens',
    size_chart_key: 'mittens',
    recommended_yarn_weights: ['dk', 'worsted', 'aran'],
    questions: [
      {
        key: 'style',
        label: 'Style',
        type: 'single_select',
        required: true,
        options: [
          { value: 'full_mitten', label: 'Full mitten', description: 'Closed top, full finger coverage', default: true },
          { value: 'fingerless', label: 'Fingerless mitts', description: 'Open fingers, ends at knuckles' },
          { value: 'convertible', label: 'Convertible / flip-top', description: 'Fingerless base with a fold-over mitten flap' },
        ],
      },
      {
        key: 'thumb_construction',
        label: 'Thumb construction',
        type: 'single_select',
        required: true,
        options: [
          { value: 'gusset', label: 'Thumb gusset', description: 'Shaped triangular gusset for best fit', default: true },
          { value: 'peasant', label: 'Peasant thumb', description: 'Stitches held on waste yarn mid-hand, simpler construction' },
          { value: 'afterthought', label: 'Afterthought thumb', description: 'Knit past thumb, go back and add it later — easiest' },
        ],
      },
      {
        key: 'top_shaping',
        label: 'Top shaping',
        type: 'single_select',
        required: true,
        depends_on: { key: 'style', values: ['full_mitten', 'convertible'] },
        options: [
          { value: 'rounded', label: 'Rounded', description: 'Decreases at 4 points like a hat crown', default: true },
          { value: 'pointed', label: 'Pointed', description: 'Decreases only on 2 sides, creates a mitten point' },
          { value: 'gathered', label: 'Gathered', description: 'Thread through all stitches and pull tight' },
        ],
      },
      {
        key: 'cuff_ribbing',
        label: 'Cuff ribbing',
        type: 'single_select',
        required: true,
        options: [
          { value: 'rib_2x2', label: '2x2 Ribbing', default: true },
          { value: 'rib_1x1', label: '1x1 Ribbing' },
        ],
      },
    ],
  },

  // ─── Scarf / Cowl ────────────────────────────────────────────────────────
  {
    type: 'scarf_cowl',
    label: 'Scarf / Cowl',
    description: 'Flat scarves, bias scarves, circular cowls, and mobius cowls',
    size_chart_key: 'scarf_cowl',
    recommended_yarn_weights: ['dk', 'worsted', 'aran', 'bulky'],
    questions: [
      {
        key: 'form',
        label: 'Form',
        type: 'single_select',
        required: true,
        options: [
          { value: 'scarf', label: 'Scarf', description: 'Flat, worked back and forth', default: true },
          { value: 'cowl', label: 'Cowl', description: 'Circular tube worn around the neck' },
        ],
      },
      // ── Scarf-specific ──
      {
        key: 'scarf_construction',
        label: 'Scarf construction',
        type: 'single_select',
        required: true,
        depends_on: { key: 'form', values: ['scarf'] },
        options: [
          { value: 'flat', label: 'Standard flat', description: 'Cast on width, knit to length', default: true },
          { value: 'bias_diagonal', label: 'Bias / diagonal', description: 'Knit on the diagonal with increases and decreases — creates stretchy, drapey fabric' },
        ],
      },
      {
        key: 'edge_treatment',
        label: 'Edge treatment',
        type: 'single_select',
        required: true,
        depends_on: { key: 'form', values: ['scarf'] },
        options: [
          { value: 'garter_border', label: 'Garter stitch border', description: '3-4 stitches of garter on each side, prevents curl', default: true },
          { value: 'seed_border', label: 'Seed stitch border', description: 'Textured border, lies flat' },
          { value: 'i_cord', label: 'I-cord edge', description: 'Neat rounded edge, adds 3 stitches per side' },
          { value: 'slip_stitch', label: 'Slip-stitch selvedge', description: 'Slip first stitch of every row for a clean chain edge' },
          { value: 'no_border', label: 'No border', description: 'Best with non-curling stitches (garter, rib, seed)' },
        ],
      },
      {
        key: 'fringe',
        label: 'Fringe',
        type: 'boolean',
        required: true,
        depends_on: { key: 'form', values: ['scarf'] },
        options: [
          { value: 'false', label: 'No fringe', default: true },
          { value: 'true', label: 'Add fringe', description: 'Cut yarn lengths knotted through cast-on and bind-off edges' },
        ],
      },
      // ── Cowl-specific ──
      {
        key: 'cowl_construction',
        label: 'Cowl construction',
        type: 'single_select',
        required: true,
        depends_on: { key: 'form', values: ['cowl'] },
        options: [
          { value: 'joined_round', label: 'Joined in the round', description: 'Cast on circumference, knit as a tube', default: true },
          { value: 'mobius', label: 'Mobius', description: 'Half-twist before joining creates an infinity loop' },
          { value: 'flat_seamed', label: 'Flat and seamed', description: 'Knit a rectangle, sew the short ends together' },
        ],
      },
      {
        key: 'cowl_wrap',
        label: 'Cowl size',
        type: 'single_select',
        required: true,
        depends_on: { key: 'form', values: ['cowl'] },
        options: [
          { value: 'single', label: 'Single wrap', description: '~60cm circumference, sits close to neck', default: true },
          { value: 'double', label: 'Double wrap', description: '~120cm circumference, wraps around twice' },
        ],
      },
      // ── Shared ──
      {
        key: 'stitch_pattern',
        label: 'Stitch pattern',
        type: 'single_select',
        required: true,
        options: [
          { value: 'garter', label: 'Garter stitch', description: 'Reversible, lies flat, great for beginners', default: true },
          { value: 'seed', label: 'Seed stitch', description: 'Textured, reversible' },
          { value: 'rib_2x2', label: '2x2 Ribbing', description: 'Stretchy, reversible' },
          { value: 'rib_1x1', label: '1x1 Ribbing', description: 'Fine ribbing' },
          { value: 'stockinette', label: 'Stockinette', description: 'Smooth (curls on scarves without border)' },
          { value: 'moss', label: 'Moss stitch', description: 'Double seed, reversible' },
        ],
      },
      {
        key: 'width_cm',
        label: 'Width (cm)',
        type: 'number_input',
        required: false,
        depends_on: { key: 'form', values: ['scarf'] },
      },
      {
        key: 'length_cm',
        label: 'Length (cm)',
        type: 'number_input',
        required: false,
        depends_on: { key: 'form', values: ['scarf'] },
      },
      {
        key: 'height_cm',
        label: 'Cowl height (cm)',
        type: 'number_input',
        required: false,
        depends_on: { key: 'form', values: ['cowl'] },
      },
      {
        key: 'circumference_cm',
        label: 'Circumference (cm)',
        type: 'number_input',
        required: false,
        depends_on: { key: 'form', values: ['cowl'] },
      },
    ],
  },

  // ─── Blanket ─────────────────────────────────────────────────────────────
  {
    type: 'blanket',
    label: 'Blanket',
    description: 'Baby blankets, throws, and bedspreads — flat, modular, mitered, or log cabin',
    size_chart_key: 'blanket',
    recommended_yarn_weights: ['worsted', 'aran', 'bulky'],
    questions: [
      {
        key: 'construction',
        label: 'Construction method',
        type: 'single_select',
        required: true,
        options: [
          { value: 'single_piece', label: 'Single piece', description: 'Worked flat in one piece on long needles', default: true },
          { value: 'modular_squares', label: 'Modular squares', description: 'Knit individual squares and seam together' },
          { value: 'mitered_squares', label: 'Mitered squares', description: 'Squares with center-line decreases, joined as you go' },
          { value: 'log_cabin', label: 'Log cabin', description: 'Central square with strips picked up and knit around it' },
          { value: 'corner_to_corner', label: 'Corner to corner', description: 'Start at one corner, increase to diagonal, then decrease' },
          { value: 'strips', label: 'Strips', description: 'Knit separate strips and seam or join them' },
        ],
      },
      {
        key: 'stitch_pattern',
        label: 'Stitch pattern',
        type: 'single_select',
        required: true,
        options: [
          { value: 'garter', label: 'Garter stitch', description: 'Reversible, lies flat, great for beginners', default: true },
          { value: 'stockinette', label: 'Stockinette', description: 'Smooth (needs border to prevent curl)' },
          { value: 'seed', label: 'Seed stitch', description: 'Textured, lies flat' },
          { value: 'moss', label: 'Moss stitch', description: 'Double seed, reversible' },
        ],
      },
      {
        key: 'border',
        label: 'Border',
        type: 'single_select',
        required: true,
        options: [
          { value: 'garter', label: 'Garter stitch border', description: 'Built-in garter stitches at edges + rows at top/bottom', default: true },
          { value: 'seed', label: 'Seed stitch border', description: 'Textured border that lies flat' },
          { value: 'i_cord', label: 'I-cord edging', description: 'Applied i-cord around finished blanket for a neat frame' },
          { value: 'no_border', label: 'No border', description: 'Best with non-curling stitches (garter, seed)' },
        ],
      },
      {
        key: 'preset_size',
        label: 'Size preset',
        type: 'single_select',
        required: false,
        options: [
          { value: 'Dishcloth', label: 'Dishcloth (25 × 25 cm)' },
          { value: 'Baby', label: 'Baby (75 × 100 cm)', default: true },
          { value: 'Throw', label: 'Throw (130 × 170 cm)' },
          { value: 'Twin', label: 'Twin (170 × 230 cm)' },
          { value: 'Queen', label: 'Queen (230 × 260 cm)' },
        ],
      },
      {
        key: 'custom_width_cm',
        label: 'Custom width (cm)',
        type: 'number_input',
        required: false,
      },
      {
        key: 'custom_height_cm',
        label: 'Custom height (cm)',
        type: 'number_input',
        required: false,
      },
    ],
  },
]
