# Changelog

Notable product changes for Gusty. Routine UI polish is folded into thematic entries — not listed commit-by-commit.

## 2026-07

### Decision stack
- Avalanche Canada live point forecasts (ALP / TLN / BTL), with seasonal / offseason handling
- HRDPS on the forecast panel with near-term role labels; estimated model freshness
- Loading Watch (24h new snow, max wind, direction, freezing level)
- Optional Elevations: trailhead vs objective winds, freezing level vs objective, DEM aspect / lee–windward
- Elevation-aware Open-Meteo downscaling when spot elevation is known

### Search & saved
- Curated BC / Alberta mountain gazetteer ranked above Mapbox / GeoNames
- Saved spots show real wind snapshots (no invented hash previews)
- Session cache for faster forecast revisits; Plan elevations remembered per spot

### Design
- Quieter visual language: soft hairline tokens, fewer boxes, optional Elevations disclosure
- Softened Search / Settings chrome; clearer forecast error state
- Light mode revamp: cooler canvas, vivid mid-step wind/accent tokens (same hue family as dark, still WCAG AA)

### Fixes
- Search elevation now resolves from DEM at the selected lat/lng (no Garibaldi `1580 m` default for city places)
- Restored forecast card surfaces and qualitative descriptor chips (stripped in quieter polish)

### Removed
- **Compare Spots** — multi-spot alternate comparison on the forecast page (parked)

## Earlier

- Vite MPA architecture (features / services / lib)
- Map search, saved spots, settings, Hair Mode, multi-model detail charts
- WCAG-oriented chart tokens and design system docs
- Security cleanup for API credentials; Vitest + GitHub Actions CI
