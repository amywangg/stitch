# Gauge Calculator

**Status:** Partially complete

## Problem Statement

Gauge (tension) is the foundation of correctly sized knitting. Every knitter's gauge differs based on needle size, yarn, and personal tension. Without a calculator, users must manually convert between measurements and stitch/row counts using math that is tedious and error-prone, especially for pattern adjustments or substituting yarn.

## Solution Overview

Three calculation modes accessible from a single calculator interface: (1) measurement-to-rows converts a target length plus gauge swatch data into estimated row and stitch counts with checkpoints, (2) rows-to-measurement converts a row count plus gauge into estimated centimeters or inches, (3) compare mode takes the pattern's stated gauge and the user's actual gauge and produces adjustment ratios plus needle change advice. All three API routes are already implemented.

## Key Components

### Backend (Next.js API)

| Route / File | Purpose | Status |
|---|---|---|
| `POST /api/v1/gauge/measurement-to-rows` | Target cm + rows_per_10cm = estimated rows + checkpoints | Complete |
| `POST /api/v1/gauge/rows-to-measurement` | Row count + rows_per_10cm = estimated cm/inches | Complete |
| `POST /api/v1/gauge/compare` | Pattern gauge vs user gauge = stitch/row ratios + needle advice | Complete |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `GaugeCalculatorView.swift` | Tab/segmented picker for the three calculation modes | Not started |
| `GaugeCalculatorViewModel.swift` | Input validation, API calls, result formatting | Not started |
| `MeasurementToRowsForm.swift` | Inputs: target cm/inches, rows_per_10cm, stitches_per_10cm | Not started |
| `RowsToMeasurementForm.swift` | Inputs: row count, rows_per_10cm | Not started |
| `GaugeCompareForm.swift` | Inputs: pattern gauge (stitches + rows per 10cm), user gauge | Not started |
| `GaugeResultView.swift` | Displays calculated results with visual formatting | Not started |
| Auto-fill from project gauge | Pre-populate inputs from project_gauge if navigating from a project | Not started |

### Web (Next.js)

| Page / Component | Purpose | Status |
|---|---|---|
| `(app)/tools/gauge/page.tsx` | Gauge calculator page with mode tabs | Not started |
| `GaugeForm` component | Dynamic form that switches based on selected mode | Not started |
| `GaugeResult` component | Formatted result display with copy-friendly values | Not started |

### Database

| Table | Purpose |
|---|---|
| `project_gauge` | Per-project gauge data: stitches_per_10cm, rows_per_10cm, needle_size_mm, yarn_weight |

No new tables required. The calculator is stateless, using existing project_gauge for auto-fill.

## Implementation Checklist

- [x] Database schema (project_gauge table)
- [x] API route: measurement-to-rows
- [x] API route: rows-to-measurement
- [x] API route: compare
- [ ] iOS GaugeCalculatorViewModel
- [ ] iOS GaugeCalculatorView with mode switcher
- [ ] iOS MeasurementToRowsForm
- [ ] iOS RowsToMeasurementForm
- [ ] iOS GaugeCompareForm
- [ ] iOS GaugeResultView
- [ ] iOS auto-fill from project_gauge when opened from a project
- [ ] Web gauge calculator page
- [ ] Web GaugeForm component
- [ ] Web GaugeResult component
- [ ] Web auto-fill from project gauge
- [ ] Unit toggle (cm/inches) in calculator UI
- [ ] Save gauge swatch for reuse (optional, future)

## Dependencies

- Projects (003) for project_gauge data used in auto-fill
- Pattern Library (004) for pattern gauge fields used in compare mode
- Authentication (001) for accessing project_gauge data (calculator itself works unauthenticated)

## Tier Gating

Free for all users. The gauge calculator is a utility tool that benefits all knitters regardless of subscription tier. Keeping it free drives engagement and positions Stitch as a practical daily-use tool.

## Technical Notes

- The measurement-to-rows endpoint returns checkpoints (e.g., "at row 50 you should be at ~12.5 cm") which are useful for in-progress checking. The iOS and web UIs should display these prominently.
- The compare endpoint returns ratios like `stitch_ratio: 1.05` meaning the user knits 5% tighter than the pattern gauge. It also returns needle advice (e.g., "try going up one needle size").
- Auto-fill: when the user navigates to the calculator from a specific project, pass the project ID as a query parameter. The view model should fetch project_gauge and pre-populate the relevant fields.
- All calculations are done server-side in the existing API routes. The client sends inputs and displays results, no client-side math needed.
- For the iOS gauge compare form, provide a visual indicator (green/yellow/red) showing how far the user's gauge deviates from the pattern gauge. Within 5% is green, 5-10% yellow, over 10% red.
- Consider adding a "scan gauge swatch" feature in the future using the device camera and image analysis, but this is out of scope for initial implementation.
