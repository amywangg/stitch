# User Measurements and Size Selection

**Status:** Partially complete

## Problem Statement

Choosing the right pattern size is one of the most error-prone steps in knitting. Users must manually compare their body measurements against a pattern's size chart, accounting for ease preferences. Mistakes lead to ill-fitting garments and wasted yarn, time, and motivation.

## Solution Overview

Users optionally enter body measurements once, stored in centimeters internally and displayed in their preferred unit (cm or inches). When starting a project from a pattern that includes size data (via pattern_sizes), the app compares the user's measurements to the size chart, factors in ease preferences, and recommends the best-fit size. This eliminates guesswork and reduces sizing errors.

## Key Components

### Backend (Next.js API)

| Route / File | Purpose | Status |
|---|---|---|
| `GET /api/v1/measurements` | Get current user's measurements | Not started |
| `PUT /api/v1/measurements` | Create or update measurements (upsert) | Not started |
| `POST /api/v1/measurements/recommend-size` | Given a pattern_id and optional ease, return recommended size | Not started |

### iOS (SwiftUI)

| Screen / Component | Purpose | Status |
|---|---|---|
| `MeasurementsView.swift` | Form with measurement fields grouped by body area | Not started |
| `MeasurementsViewModel.swift` | Load, save measurements, handle unit conversion | Not started |
| Unit toggle (cm/inches) | Switch display units, store always in cm | Not started |
| `SizeRecommendationSheet.swift` | Shows recommended size when starting a project | Not started |
| `SizeComparisonView.swift` | Visual comparison of user measurements vs pattern sizes | Not started |

### Web (Next.js)

| Page / Component | Purpose | Status |
|---|---|---|
| `(app)/settings/measurements/page.tsx` | Measurements form within settings | Not started |
| `MeasurementInput` component | Input with unit label and conversion | Not started |
| `SizeRecommendation` component | Modal showing recommended size during project creation | Not started |

### Database

| Table | Purpose |
|---|---|
| `user_measurements` | One row per user. Fields: bust_cm, waist_cm, hip_cm, shoulder_width_cm, back_length_cm, arm_length_cm, upper_arm_cm, wrist_cm, head_circumference_cm, inseam_cm, foot_length_cm, foot_circumference_cm, height_cm, unit_preference, notes |
| `pattern_sizes` | Size chart per pattern: name, finished_bust_cm, finished_length_cm, yardage |

## Implementation Checklist

- [x] Database schema (user_measurements table, all fields optional)
- [x] Database schema (pattern_sizes table for size charts)
- [ ] API route: get measurements
- [ ] API route: upsert measurements
- [ ] API route: recommend size (compare user measurements to pattern_sizes)
- [ ] Size recommendation algorithm (bust-first matching with ease adjustment)
- [ ] iOS MeasurementsViewModel (load, save, unit conversion)
- [ ] iOS MeasurementsView (grouped form: upper body, head, lower body, feet)
- [ ] iOS unit toggle (cm/inches) with live conversion
- [ ] iOS SizeRecommendationSheet (triggered during project creation)
- [ ] iOS SizeComparisonView (table comparing user vs each size)
- [ ] Web measurements form in settings
- [ ] Web MeasurementInput component with unit label
- [ ] Web size recommendation modal for project creation
- [ ] Integration into project creation flow ("Based on your measurements, we recommend size M")
- [ ] Handle patterns without size data gracefully (skip recommendation)

## Dependencies

- Authentication (001) for user identification
- Pattern Library (004) for pattern_sizes data
- Projects (003) for the project creation flow where size recommendation appears

## Tier Gating

Free for all users. Measurements and size recommendations are not Pro-gated. Accurate sizing benefits all users and reduces frustration, which improves retention at every tier.

## Technical Notes

- All measurements are stored in centimeters. Conversion factor: 1 inch = 2.54 cm. The `unit_preference` field controls display only.
- The upsert endpoint (PUT) should create the record if it does not exist and update if it does, since user_measurements has a unique constraint on user_id.
- Size recommendation algorithm: compare the user's bust measurement (primary) to each pattern_size's `finished_bust_cm`. Account for ease: positive ease (garment larger than body) is typical. Default ease assumption: +5 cm for standard fit. Allow the user to specify ease preference (negative, zero, standard, oversized).
- If a pattern has no pattern_sizes entries, the recommendation endpoint should return a clear "no size data available" response rather than an error.
- Measurement fields are all optional. The recommendation should work with whatever measurements are available, falling back to fewer comparison points if some fields are missing.
- Group measurements in the UI by body area for clarity: Upper Body (bust, waist, hip, shoulder width, back length, arm length, upper arm, wrist), Head (head circumference), Lower Body (inseam), Feet (foot length, foot circumference), General (height).
- The iOS form should use numeric keyboards with decimal support. Validate that values are within reasonable ranges (e.g., bust 50-200 cm) to catch unit entry errors.
