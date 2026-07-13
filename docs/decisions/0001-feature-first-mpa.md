# ADR 0001: Feature-first MPA architecture

**Status:** Accepted  
**Date:** 2026-07-13

## Context

Gusty began as monolithic HTML files (~7,000 lines) with duplicated tokens, navigation, and API logic. A first refactor introduced layered modules (`services/`, `stores/`, `pages/`) under `src/js/`.

A proposed React-style IA (`app/routes`, `features/`, `services/api`, `services/storage`) was evaluated for further alignment with industry conventions and hiring readability.

## Decision

Adopt a **feature-first MPA structure** adapted for vanilla JavaScript:

- `app/routes/` — thin entry points wired from HTML
- `features/` — domain modules with colocated CSS
- `services/api/` and `services/storage/` — separate network from persistence
- `components/shell/` — app chrome (bottom nav)
- `lib/` — constants and pure utilities

Do **not** introduce React, hooks, providers, or a client-side router.

## Consequences

**Positive**
- New contributors can find code by product area (`features/forecast/`) not technical layer alone
- API and storage boundaries are explicit — easier to test and mock
- Route files document the page map in one discoverable folder
- Structure maps cleanly to a future React migration if needed (features → route components)

**Negative**
- Some UI rendering remains inside feature files (hourly strips, charts, map state) — not yet split into `components/ui/`
- No `hooks/` or `types/` folders until a framework/TypeScript adoption
- Slight indirection: HTML → route → feature (one extra hop vs. importing feature directly)

## Alternatives considered

1. **Keep flat `src/js/pages/`** — Simple but poor discoverability as features grow
2. **Full React SPA** — Overkill for a 6-page static app; increases bundle and hosting complexity
3. **Import features directly from HTML** — Fewer files, but loses a clear routing layer for onboarding
