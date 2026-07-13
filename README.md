# Gusty — Mountain Wind Forecasts

**gusty.ca** is a mobile-first web app that helps BC backcountry users read mountain wind conditions quickly and decide whether conditions are favorable, marginal, or unsafe.

---

## What is Gusty?

Gusty is a purpose-built wind forecast tool for hikers, skiers, and mountaineers. It surfaces current wind, gusts, direction, hourly strips, precipitation, and multi-model comparisons (**HRDPS**, ECMWF, GFS, GEM, HRRR) in a dark, instrument-grade UI designed for one-handed phone use in the field.

The app has six routes: landing search, map search, forecast, saved spots, per-model detail charts, and settings.

On the forecast page it also stacks backcountry decision context: Avalanche Canada danger ratings (live), a loading/new-snow watch, trailhead→objective plan winds with DEM aspect, and compare-against-saved-spots.

---

## What problem does it solve?

Generic weather apps optimize for city forecasts. Backcountry planning needs something different:

- **Wind is the primary signal** — not temperature or generic “partly cloudy” summaries
- **Location matters** — users search peaks, trailheads, and terrain features, not street addresses
- **Model disagreement matters** — a 15 km/h spread between ECMWF and GFS changes confidence in a go/no-go call
- **Speed matters** — decisions are made on a phone, often offline-adjacent, with minimal friction

Gusty focuses the entire experience on wind readability: color ramps tied to speed tiers, compass direction, model comparison panels, and condition verdicts (Favorable / Marginal / Unfavorable). Optional “Hair Mode” swaps standard labels for memorable wind descriptors — a deliberate UX choice that makes dangerous wind speeds stick in memory.

---

## What did I design and build?

**Product & UX**
- End-to-end mobile flows: search → forecast → save → compare models → drill into charts
- Dark-first design system with documented tokens (`Guidelines.md`, live component reference pages)
- Map-based search with bottom-sheet location preview and reverse geocoding
- Curated BC/Alberta mountain gazetteer (resorts, peaks, passes) ranked above Mapbox/GeoNames
- Forecast decision stack: Avalanche Canada chip, Loading Watch, Plan mode (elev + DEM aspect), Compare Spots
- Saved spots with drag-to-reorder (SortableJS)
- Settings for units (metric/imperial), theme, default model, and Hair Mode

**Engineering**
- Refactored a ~7,000-line copy-paste prototype into a layered Vite MPA with shared modules
- Geocoding pipeline: curated spots + Mapbox Places (western CA) + GeoNames BC/AB terrain
- Open-Meteo multi-model forecasts (HRDPS near-term) with elevation-aware downscaling
- Avalanche Canada public point API for ALP/TLN/BTL context (with offseason handling)
- Open-Meteo elevation DEM sampling for objective aspect / lee–windward hints
- Client-only persistence (localStorage) — no backend, no accounts, no PII collection
- Environment-based API key management for Mapbox and GeoNames

---

## What is technically interesting?

1. **Framework-free architecture with real structure** — Vanilla ES modules, no React/Vue, but with explicit layers (services, stores, utils, components). Demonstrates you can get framework-level organization without framework overhead for a content-light MPA.

2. **Dual-source geocoding** — Mapbox handles POIs and places; GeoNames fills gaps for mountain/terrain features that street-oriented geocoders miss. Search logic includes fallback rules (e.g. when results are all addresses) and smart reverse-geocode name picking for map pin drops.

3. **Multi-model forecast composition** — Forecast fetches HRDPS, ECMWF, GFS, and GEM in parallel, scores model spread, labels each model’s role (near-term vs longer-range), and uses estimated cycle+lag freshness (Open-Meteo does not expose run IDs).

4. **Design tokens as code** — A single `tokens.css` source of truth. UI wind colors stay punchy; detail charts use softer `--chart-*` tokens for WCAG non-text contrast without shouting.

5. **Privacy-by-architecture** — Saved locations and settings never leave the device. Third-party calls go directly from the browser to Open-Meteo, Mapbox, GeoNames, and Avalanche Canada.

---

## How is the system structured?

Vite multi-page application. Each HTML file is a thin shell; `src/app/routes/` boots a feature module in `src/features/`.

```
gusty-web-app/
├── public/
├── src/
│   ├── app/
│   │   ├── bootstrap.js       # Global init (theme, legacy globals)
│   │   └── routes/            # Thin entry points (one per HTML page)
│   ├── features/                # Domain modules (JS + colocated CSS)
│   │   ├── landing/
│   │   ├── forecast/
│   │   ├── search/
│   │   ├── saved/
│   │   ├── settings/
│   │   └── detail/
│   ├── components/shell/        # App chrome (bottom navigation)
│   ├── services/
│   │   ├── api/                 # Open-Meteo, geocoding, Avalanche Canada, terrain
│   │   ├── compare-spots.js     # Multi-location wind snapshots
│   │   └── storage/             # localStorage: settings, saved spots
│   ├── lib/                     # Constants + pure utilities (wind, terrain aspect, models)
│   └── styles/                  # Global tokens, base, shared layout CSS
├── tests/                       # Vitest unit tests
├── docs/
│   ├── architecture.md
│   └── decisions/               # ADRs
├── index.html … detail.html     # Vite MPA entry points
├── CONTRIBUTING.md
└── README.md
```

Full details: [`docs/architecture.md`](docs/architecture.md)

### Layer responsibilities

| Layer | Responsibility | Examples |
|-------|----------------|----------|
| **app/routes** | Wire HTML → feature | `routes/forecast.js` |
| **features** | Domain UI + orchestration | `features/forecast/forecast.js` |
| **services/api** | External HTTP APIs | `fetchLocationForecast()`, `fetchAvalancheForecast()`, `searchPlaces()` |
| **services/storage** | Browser persistence | `getSavedSpots()`, `setHairMode()` |
| **lib** | Constants + pure helpers | `windRampColor()`, `computeSlopeAspect()`, `WEATHER_MODELS` |
| **components/shell** | Shared app chrome | `mountBottomNav()` |

### Data flow

```
HTML → app/routes → features → services/api (forecast, geocode)
                            → services/storage (settings, saved spots)
                            → lib (format, parse)
                            → components/shell (nav)
```

---

## How to run it

**Prerequisites:** Node 18+, Mapbox access token, GeoNames username (free tier works)

```bash
npm install
cp .env.example .env        # add VITE_MAPBOX_TOKEN and VITE_GEONAMES_USERNAME
npm run dev                 # http://localhost:5173
```

**Production build:**

```bash
npm run build               # outputs to dist/
npm run test                # Vitest unit tests (lib utilities)
npm run preview             # serve dist/ locally
```

Deploy `dist/` to any static host (currently Vercel). Set the same env vars in your hosting dashboard.

---

## Current status

| Area | Status |
|------|--------|
| Core forecast (wind hero, hourly/daily strips, model panel) | **Shipped** |
| Map search + geocoding (Mapbox + GeoNames) | **Shipped** |
| Saved spots (persist, reorder, delete) | **Shipped** |
| Settings (units, theme, default model, Hair Mode) | **Shipped** |
| Model detail charts (Chart.js, multi-elevation) | **Shipped** |
| Architecture refactor (feature-first IA) | **Complete** |
| Avalanche conditions card | **Placeholder** — static mock data, not wired to avalanche.ca API |
| Automated tests | **Not started** |
| CI / linting | **Not started** |

The app is a working, deployable product — not a mockup. The recent refactor moved it from monolithic HTML files to a maintainable module structure without changing the user-facing feature set.

---

## Tradeoffs & limitations

**Intentional choices**
- **No framework** — Keeps bundle size minimal and avoids SPA complexity for a 6-page app. Tradeoff: no component templating system; DOM is built imperatively in page modules.
- **No backend** — Zero hosting cost, zero user data liability, instant local saves. Tradeoff: no cross-device sync, no server-side caching of expensive API calls.
- **MPA over SPA** — Each route is a full page load. Tradeoff: no client-side router, but simpler mental model and better alignment with static hosting.
- **CDN dependencies** — Mapbox GL, Chart.js, SortableJS, and Lucide load from CDN at runtime. Tradeoff: offline use is limited; cache behavior depends on CDN availability.

**Known gaps**
- Avalanche card displays hardcoded placeholder content above 1,000 m elevation
- HRRR model uses `ncep_hrrr_conus` — limited utility outside CONUS; included for completeness
- Saved spot list shows hash-derived wind previews when live data isn’t cached on the spot object
- Page modules still own UI rendering logic (hourly strips, chart setup, map state machine) — candidates for future `components/ui/` extraction
- Vitest covers `lib/wind` and `lib/coordinates` only; no browser/integration tests yet
- No accessibility audit yet

**What I’d do next**
- Wire avalanche.ca API or remove the placeholder card until real data exists
- Expand Vitest coverage for services and storage modules
- Extract remaining page UI into render functions or lightweight web components
- Add ESLint + Prettier

---

## Design references

- [`docs/architecture.md`](docs/architecture.md) — folder layout and layer rules
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — where to put new code
- [`Guidelines.md`](Guidelines.md) — canonical design tokens and UI rules
- [`gusty-design-system.html`](gusty-design-system.html) — live component showcase
- [`docs/design-system-frames.html`](docs/design-system-frames.html) — frame-level component catalog

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_MAPBOX_TOKEN` | Yes | Mapbox access token for map + geocoding |
| `VITE_GEONAMES_USERNAME` | Yes | GeoNames username for terrain feature search |

See [`.env.example`](.env.example).

## Security

See [`SECURITY.md`](SECURITY.md) for credential handling, historical git exposure, and token rotation guidance.

## License

MIT — see [`LICENSE`](LICENSE).
