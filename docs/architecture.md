# Architecture

Gusty is a **Vite-powered multi-page application (MPA)** built with vanilla HTML, CSS, and ES modules. There is no React, router framework, or backend.

This document describes how the repo is organized, how it compares to a typical React feature-app template, and where to put new code.

---

## Comparison with proposed IA

The following template is a common React/TypeScript app structure:

```
gusty/
├── src/
│   ├── app/          routes, providers, App.tsx
│   ├── features/     projects, generation, history, settings
│   ├── components/   ui/, shared/
│   ├── services/     api/, storage/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   └── styles/
├── tests/
└── docs/decisions/
```

### What we adopted

| Proposed | Gusty equivalent | Rationale |
|----------|------------------|-----------|
| `app/routes/` | `src/app/routes/` | Thin route entry files; HTML shells point here |
| `app/providers/` | `src/app/bootstrap.js` | Global init (theme, legacy globals) — no React context needed |
| `features/*` | `src/features/{landing,forecast,search,saved,settings,detail}/` | Domain colocation: each feature owns JS + CSS |
| `components/ui/` | `src/styles/components/` | Shared presentational styles (wordmark, page-header) |
| `components/shared/` | `src/components/shell/` | App chrome (bottom navigation) |
| `services/api/` | `src/services/api/` | Open-Meteo, Mapbox/GeoNames clients |
| `services/storage/` | `src/services/storage/` | localStorage: settings, saved spots |
| `lib/` | `src/lib/` | Constants + pure utilities (wind, coordinates, datetime) |
| `styles/` | `src/styles/` | Global tokens, base, shared imports |
| `tests/` | `tests/` | Placeholder for Vitest (not yet implemented) |
| `docs/decisions/` | `docs/decisions/` | Architecture Decision Records (ADRs) |

### What we deliberately skipped

| Proposed | Why skipped |
|----------|-------------|
| `App.tsx`, `main.tsx` | MPA — each HTML page boots its own route module |
| `hooks/` | No React; state lives in storage services or page-local closures |
| `types/` | Vanilla JS for now; JSDoc on `lib/` and services until a TS migration |
| `features/projects`, `generation`, `history` | Wrong domain names for Gusty; mapped to forecast/search/saved/etc. |

---

## Directory layout

```
src/
├── app/
│   ├── bootstrap.js          # Theme + global setup (every page)
│   └── routes/               # One file per HTML entry (thin importers)
│       ├── index.js          → features/landing
│       ├── forecast.js       → features/forecast
│       ├── search.js         → features/search
│       ├── saved.js          → features/saved
│       ├── settings.js       → features/settings
│       └── detail.js         → features/detail
│
├── features/                 # Domain modules (logic + colocated CSS)
│   ├── landing/
│   ├── forecast/
│   ├── search/
│   ├── saved/
│   ├── settings/
│   └── detail/
│
├── components/
│   └── shell/                # App chrome (bottom-nav)
│
├── services/
│   ├── api/                  # Network: open-meteo, geocoding
│   └── storage/              # Persistence: settings, saved-spots
│
├── lib/                      # Constants + pure helpers
│   ├── constants.js
│   ├── wind.js
│   ├── coordinates.js
│   ├── datetime.js
│   ├── hair-mode.js
│   └── models.js
│
└── styles/                   # Global design system
    ├── tokens.css
    ├── base.css
    ├── shared.css
    └── components/           # Shared layout styles (app-frame, wordmark)
```

Root-level `*.html` files are Vite MPA entry points. `public/` holds static assets.

---

## Layer rules

1. **Routes** import exactly one feature module. No business logic in routes.
2. **Features** may import services, lib, components/shell, and their own `styles.css`. Features must not import other features directly.
3. **Services/api** talk to third-party HTTP APIs only. No DOM access.
4. **Services/storage** own localStorage reads/writes. No DOM access.
5. **Lib** contains pure functions and constants. No DOM, no network, no storage.
6. **Components/shell** construct shared DOM (navigation). May import their own CSS.

---

## Data flow

```
HTML entry
  → app/routes/{page}.js
    → features/{name}/{name}.js
      → services/api/*     (fetch forecast, geocode)
      → services/storage/* (read/write settings, saved spots)
      → lib/*              (format wind, parse coordinates)
      → components/shell/* (mount bottom nav)
```

Cross-page navigation uses standard `<a href="forecast.html?...">` links with query params — no client-side router.

---

## Adding a new feature

1. Create `src/features/{name}/{name}.js` and `styles.css`
2. Add `src/app/routes/{name}.js` that imports the feature
3. Add `{name}.html` at repo root and register it in `vite.config.js`
4. If the feature needs API or persistence, add to `services/api/` or `services/storage/` — not inside the feature file

---

## Related docs

- [ADR 0001: Feature-first MPA](./decisions/0001-feature-first-mpa.md)
- [README](../README.md) — product context and run instructions
- [Guidelines.md](../Guidelines.md) — design tokens
