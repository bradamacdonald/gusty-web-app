# Gusty — Mountain Wind Forecasts

**[gusty.ca](https://gusty.ca)** helps BC and Alberta backcountry users read **mountain wind** quickly — current conditions, model agreement, and decision context that city weather apps ignore.

Mobile-first. Client-only. No accounts.

---

## Features

- **Wind-first forecast** — hero speed, gusts, direction, hourly + daily strips, precipitation
- **Multi-model comparison** — HRDPS (near-term), ECMWF, GFS, GEM, with role labels and estimated freshness
- **BC/AB mountain search** — curated resorts/peaks/passes, plus Mapbox and GeoNames
- **Saved spots** — live wind previews on open; drag to reorder
- **Avalanche Canada** — live ALP / TLN / BTL danger context (seasonal notices in summer)
- **Loading Watch** — new snow, max wind, direction, freezing level for the next 24h
- **Elevations (optional)** — trailhead vs objective winds, freezing level, DEM aspect / lee–windward hint
- **Settings** — metric/imperial, dark/light, default model, Hair Mode

Gusty shows weather and published hazard context. It does **not** assess avalanche risk or tell you whether to go.

---

## Quick start

Node 18+, Mapbox token, GeoNames username.

```bash
npm install
cp .env.example .env   # set VITE_MAPBOX_TOKEN and VITE_GEONAMES_USERNAME
npm run dev            # http://localhost:5173
```

```bash
npm run test
npm run build
npm run preview
```

Deploy `dist/` to any static host (e.g. Vercel). Set the same env vars in the host dashboard.

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_MAPBOX_TOKEN` | Yes | Map + place search |
| `VITE_GEONAMES_USERNAME` | Yes | Terrain / place search |

See [`.env.example`](.env.example) and [`SECURITY.md`](SECURITY.md).

---

## How it’s built

Vite multi-page app: thin HTML shells, features in `src/features/`, APIs in `src/services/api/`, storage in `src/services/storage/`, pure helpers in `src/lib/`.

```
src/
├── app/           # Bootstrap + route entry points
├── features/      # landing, search, forecast, saved, settings, detail
├── components/    # Shared shell (bottom nav)
├── services/      # APIs + localStorage
├── lib/           # Wind, models, terrain aspect, coordinates
└── styles/        # Design tokens + shared CSS
```

Details: [`docs/architecture.md`](docs/architecture.md) · contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md)

**Design:** [`Guidelines.md`](Guidelines.md) · [`gusty-design-system.html`](gusty-design-system.html)

---

## Status

| Area | Status |
|------|--------|
| Forecast, models, detail charts | Shipped |
| Map + curated BC/AB search | Shipped |
| Saved spots with live wind | Shipped |
| Avalanche Canada point API | Shipped |
| Loading Watch + optional Elevations | Shipped |
| Unit tests (Vitest) | Expanding coverage |
| CI (GitHub Actions) | Test + build |

**Parked for now:** Compare Spots (side-by-side saved alternates on the forecast page).

---

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md).

---

## Limitations

- No backend — settings and saves stay on device; no cross-device sync
- Offline depends on CDN + browser cache for Mapbox / Chart.js / etc.
- HRRR is CONUS-oriented; kept for completeness
- Model run times are **estimated** (Open-Meteo does not expose run IDs)

---

## License

MIT — see [`LICENSE`](LICENSE).
