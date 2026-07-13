# Contributing to Gusty

## Prerequisites

- Node 18+
- Mapbox token and GeoNames username (see `.env.example`)

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Where to put code

| You're building… | Put it in… |
|------------------|------------|
| A new page / user flow | `src/features/{name}/` + `src/app/routes/{name}.js` |
| A third-party API client | `src/services/api/` |
| localStorage read/write | `src/services/storage/` |
| Pure formatting/helpers | `src/lib/` |
| Shared app chrome (nav, shell) | `src/components/shell/` |
| Global design tokens | `src/styles/tokens.css` |
| Shared layout styles | `src/styles/components/` |

Read [docs/architecture.md](./docs/architecture.md) before adding new modules.

## Conventions

- **ES modules** — all source uses `import`/`export`; no window globals
- **No cross-feature imports** — `features/forecast/` must not import from `features/search/`
- **Services stay pure** — no `document.*` or `localStorage` in `services/api/`; storage only in `services/storage/`
- **CSS** — feature styles import `../../styles/shared.css`; do not duplicate tokens
- **Env secrets** — never commit `.env`; use `VITE_*` prefixed vars

## Scripts

```bash
npm run dev       # local dev server
npm run build     # production build → dist/
npm run preview   # serve dist/ locally
```

## Pull requests

1. Keep changes scoped to one feature or layer
2. Run `npm run build` before submitting
3. Update `docs/architecture.md` if you add a new top-level folder or change layer rules

## Tests

`tests/` is reserved for Vitest. Not yet required, but new pure functions in `lib/` and `services/` should be written with testability in mind.
