 # gusty.ca — Design System Guidelines

Always use these values for all generated UI. Do not invent new colors, fonts,
sizes, or spacing values. If a value isn't listed here, use the closest match
from the scales below.

---

## Tone & Aesthetic

- Dark-first UI. The canvas is always deep navy, never pure black.
- Data is the design. No decorative gradients, illustrations, or drop shadows.
- Instrument-grade clarity. Every element should feel precise and trustworthy.
- Prefer space and typography over borders and nested cards.
- Mobile-first. Design for 390px wide iPhone portrait unless told otherwise.

---

## Contrast (WCAG 2.1 AA)

All text and icons must meet AA against the surface they sit on
(`bg`, `surface`, or `surface-elevated`):

- Normal text / icons: **≥ 4.5:1**
- Interactive control borders (`border-field`): **≥ 3:1**

Decorative hairlines (`border`, `border-strong`) are intentionally soft and
are **not** required to meet 3:1 — they structure space, not affordance.

Do not invent new greys for labels, placeholders, or captions — use the
semantic text tokens below. Runtime SSOT: `src/styles/tokens.css`.

---

## Primitive ramps

Semantic tokens alias these primitives. Prefer semantic names in UI CSS;
reach for primitives only when defining new aliases.

### Navy / slate

| Token     | Hex     |
|-----------|---------|
| navy-950  | #0B1120 |
| navy-900  | #111827 |
| navy-800  | #1A2333 |
| navy-700  | #243044 |
| navy-600  | #334155 |
| navy-500  | #4A5C72 |
| navy-400  | #5A6B80 |
| navy-350  | #6B7C90 |
| navy-300  | #8A9BB0 |
| navy-200  | #B8C4D4 |
| navy-100  | #E8ECF1 |
| navy-50   | #F5F7FA |
| navy-25   | #F0F4F8 |

### Cyan (accent)

| Token    | Hex     | Notes                |
|----------|---------|----------------------|
| cyan-400 | #38BDF8 | Dark-mode accent     |
| cyan-500 | #0EA5E9 |                      |
| cyan-600 | #0284C7 |                      |
| cyan-700 | #0369A1 | Light-mode accent    |

### Wind / status pairs (dark → light)

| Family  | Dark hex | Light hex |
|---------|----------|-----------|
| green   | #34D399  | #047857   |
| lime    | #A3E635  | #3F6212   |
| amber   | #FBBF24  | #92400E   |
| orange  | #F97316  | #9A3412   |
| red     | #F05252  | #B91C1C   |
| magenta | #D946EF  | #A21CAF   |

---

## Surfaces

Use these three levels to create depth. Never use pure black. Prefer off-black
navies from the ramp; light `surface` may use white for card lift.

| Token            | Dark      | Light     | Use                              |
|------------------|-----------|-----------|----------------------------------|
| bg               | navy-950  | navy-50   | Page canvas, app background      |
| surface          | navy-900  | #FFFFFF   | Cards, panels, containers        |
| surface-elevated | navy-800  | navy-100  | Raised panels, model comparison  |
| border           | hairline (~12% slate) | hairline (~14%) | Decorative dividers only — keep quiet |
| border-strong    | hairline (~22%) | hairline (~24%) | Slightly stronger, still quiet     |
| border-field     | navy-500  | navy-400  | Inputs / toggles (≥3:1 interactive) |
| accent-border    | accent    | accent    | Focus / selected control border  |

Prefer **space over boxes**. Do not wrap every section in a bordered card.
Use hairline dividers sparingly; never stack nested bordered surfaces.

---

## Text

Never use pure white or pure black for text — use navy-25 / navy-950.

| Token          | Dark      | Light     | Use                          |
|----------------|-----------|-----------|------------------------------|
| text-primary   | navy-25   | navy-950  | Headings, primary values     |
| text-secondary | navy-200  | #3D4F63   | Labels, supporting info      |
| text-muted     | navy-300  | navy-400  | Captions, timestamps, hints  |
| text-inverse   | navy-950  | navy-25   | Text on filled accent        |
| accent         | cyan-400  | cyan-700  | Links, active states, focus  |

---

## Wind Color Ramp

This is the most important color scale in the app. Use it consistently
everywhere wind speed is displayed — hourly strips, model panels, hero values.
Never use other colors for wind data. Values swap automatically in light mode
so wind text stays AA on light surfaces.

| Token    | Dark    | Light   | Range       | Label   |
|----------|---------|---------|-------------|---------|
| calm     | #34D399 | #047857 | 0–15 km/h   | Calm    |
| light    | #A3E635 | #3F6212 | 16–30 km/h  | Light   |
| moderate | #FBBF24 | #92400E | 31–50 km/h  | Moderate|
| strong   | #F97316 | #9A3412 | 51–74 km/h  | Strong  |
| severe   | #F05252 | #B91C1C | 75–100 km/h | Severe  |
| extreme  | #D946EF | #A21CAF | 100+ km/h   | Extreme |

---

## Status Colors

Use only for go/no-go condition indicators. Never repurpose for other meanings.
Light mode uses the darker wind-pair aliases so badge text stays AA.

| Token    | Dark    | Light   | Meaning              |
|----------|---------|---------|----------------------|
| go       | #34D399 | #047857 | Favorable conditions |
| caution  | #FBBF24 | #92400E | Marginal conditions  |
| no-go    | #F05252 | #B91C1C | Unsafe conditions    |

Status badges use 15% opacity background tint + 30% opacity border of the same color.

---

## Precipitation

Used in hourly strip bars only. Displayed as a 3px bar at the bottom of each hour cell.
Fills meet WCAG 1.4.11 (≥3:1) against theme surfaces.

| Token  | Dark                       | Light                      |
|--------|----------------------------|----------------------------|
| none   | transparent                | transparent                |
| trace  | rgba(147,197,253, 0.50)    | rgba(3,105,161, 0.75)      |
| light  | rgba(147,197,253, 0.70)    | rgba(3,105,161, 0.85)      |
| heavy  | rgba(96,165,250, 0.85)     | #0369A1 (cyan-700)         |
| snow   | rgba(226,232,240, 0.70)    | rgba(74,92,114, 0.85)      |

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