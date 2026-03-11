 # gusty.ca — Design System Guidelines

Always use these values for all generated UI. Do not invent new colors, fonts,
sizes, or spacing values. If a value isn't listed here, use the closest match
from the scales below.

---

## Tone & Aesthetic

- Dark-first UI. The canvas is always deep navy, never pure black.
- Data is the design. No decorative gradients, illustrations, or drop shadows.
- Instrument-grade clarity. Every element should feel precise and trustworthy.
- Mobile-first. Design for 390px wide iPhone portrait unless told otherwise.

---

## Surfaces

Use these three levels to create depth. Never use pure black or white.

| Token            | Hex       | Use                              |
|------------------|-----------|----------------------------------|
| bg               | #0B1120   | Page canvas, app background      |
| surface          | #111827   | Cards, panels, containers        |
| surface-elevated | #1A2333   | Raised panels, model comparison  |
| border           | rgba(255,255,255,0.07)  | Default borders     |
| border-strong    | rgba(255,255,255,0.13)  | Emphasized borders  |

---

## Text

Never use pure white. Never use pure black.

| Token          | Hex       | Use                          |
|----------------|-----------|------------------------------|
| text-primary   | #F0F4F8   | Headings, primary values     |
| text-secondary | #8A9BB0   | Labels, supporting info      |
| text-muted     | #4A5C72   | Captions, timestamps, hints  |
| accent         | #38BDF8   | Links, active states, focus  |

---

## Wind Color Ramp

This is the most important color scale in the app. Use it consistently
everywhere wind speed is displayed — hourly strips, model panels, hero values.
Never use other colors for wind data.

| Token    | Hex     | Range      | Label   |
|----------|---------|------------|---------|
| calm     | #34D399 | 0–15 km/h  | Calm    |
| light    | #A3E635 | 16–30 km/h | Light   |
| moderate | #FBBF24 | 31–50 km/h | Moderate|
| strong   | #F97316 | 51–74 km/h | Strong  |
| severe   | #EF4444 | 75–100 km/h| Severe  |
| extreme  | #C026D3 | 100+ km/h  | Extreme |

---

## Status Colors

Use only for go/no-go condition indicators. Never repurpose for other meanings.

| Token    | Hex     | Meaning              |
|----------|---------|----------------------|
| go       | #34D399 | Favorable conditions |
| caution  | #FBBF24 | Marginal conditions  |
| no-go    | #EF4444 | Unsafe conditions    |

Status badges use 15% opacity background tint + 30% opacity border of the same color.

---

## Precipitation

Used in hourly strip bars only. Displayed as a 3px bar at the bottom of each hour cell.

| Token  | Value                      |
|--------|----------------------------|
| none   | transparent                |
| trace  | rgba(147,197,253, 0.25)    |
| light  | rgba(147,197,253, 0.55)    |
| heavy  | rgba(96,165,250, 0.85)     |
| snow   | rgba(226,232,240, 0.70)    |

---

## Typography

Two fonts only. Never substitute.

- **Inter** — all UI text, labels, headings, body
- **DM Mono** — all numeric data values, model names, elevation, coordinates

### Type Scale

| Token | Size | Use                                      |
|-------|------|------------------------------------------|
| xs    | 11px | Captions, timestamps, ALL CAPS labels    |
| sm    | 13px | Secondary labels, metadata, model names  |
| base  | 15px | Body text, primary UI                    |
| lg    | 18px | Section headers, verdict text            |
| xl    | 22px | Location name                            |
| 2xl   | 28px | Large data display (temperature)         |
| 3xl   | 40px | Hero wind value                          |

### Weights
- 400 regular — body, secondary labels
- 500 medium — data values (DM Mono always uses medium)
- 600 semibold — headings, location name, verdict

### ALL CAPS labels
Always: Inter, 11px, weight 500, letter-spacing 0.06em, text-muted color.
Example: "WIND SPEED", "SUMMIT ELEVATION", "MODEL COMPARISON"

---

## Spacing

All spacing must come from this scale. No arbitrary values.

| Token   | Value |
|---------|-------|
| space-1 | 4px   |
| space-2 | 8px   |
| space-3 | 12px  |
| space-4 | 16px  |
| space-5 | 20px  |
| space-6 | 24px  |
| space-8 | 32px  |
| space-10| 40px  |
| space-12| 48px  |
| space-16| 64px  |

Internal component padding must always be less than or equal to the gap between components.

---

## Border Radius

One consistent radius per element type. Never mix.

| Token       | Value  | Use                          |
|-------------|--------|------------------------------|
| radius-sm   | 6px    | Chips, small tags, model tags|
| radius-md   | 10px   | Cards, panels, containers    |
| radius-lg   | 14px   | Bottom sheets, modals        |
| radius-full | 999px  | Pills, badges, elevation chips|

Nested elements always have a smaller radius than their parent.

---

## Key Components

### Wind Hero Display
- Label: Inter, xs, weight 500, ALL CAPS, text-muted — "WIND SPEED"
- Value: DM Mono, 3xl, weight 500, colored by wind ramp
- Unit: DM Mono, lg, text-secondary — "km/h"
- Direction: Inter, sm, text-secondary — arrow glyph + "NE · gusts to 89 km/h"

### Condition Badge
- Pill shape (radius-full), Inter, xs, weight 500
- Filled dot (6px circle) + label text
- Background: 15% tint of status color
- Border: 30% opacity of status color
- Examples: "● Favorable", "● Marginal", "● Unsafe"

### Hourly Strip
- Horizontally scrollable, no visible scrollbar
- Each cell: 52px wide, centered column layout
- Row from top: time (xs, text-muted) → direction arrow (sm, text-secondary) → wind value (sm, DM Mono, wind ramp color) → precip bar (3px, bottom)
- Active/current hour: surface-elevated background, radius-sm

### Model Tag
- surface-elevated background, border, radius-sm
- DM Mono, 10px, weight 500, text-secondary
- Active model: accent color text, accent-dim background

### Elevation Chip
- radius-full pill, DM Mono, xs
- Active: accent text, accent-dim background, accent border
- Inactive: text-secondary, surface-elevated background

---

## Layout Rules

- Mobile canvas: 390px wide
- Page padding: 16px horizontal
- Section gap: 24px between major sections
- Card padding: 16–24px internal
- Touch targets: minimum 44×44px for all interactive elements
- Bottom navigation height: 64px, always surface background with backdrop blur

---

## What to Avoid

- No pure #000000 or #FFFFFF anywhere
- No drop shadows (use lighter surfaces for elevation instead)
- No decorative gradients or illustrations
- No more than 2 typefaces (Inter + DM Mono only)
- No colors outside this system for data visualization
- No centered text (always left-align)
- No hover-only interactions (mobile-first means touch-first)