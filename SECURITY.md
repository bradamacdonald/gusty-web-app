# Security

## Reporting issues

If you discover a security vulnerability in Gusty, please open a private disclosure via GitHub Security Advisories on this repository, or contact the maintainer directly. Do not open public issues for credential leaks or exploitable bugs.

## Secrets and environment variables

Gusty requires two third-party credentials at build/runtime:

| Variable | Service | Notes |
|----------|---------|-------|
| `VITE_MAPBOX_TOKEN` | Mapbox | Public client token with URL restrictions recommended |
| `VITE_GEONAMES_USERNAME` | GeoNames | Free-tier username |

**Never commit `.env` or real tokens to git.** Copy `.env.example` to `.env` locally and in your hosting provider's dashboard.

## Known historical exposure (public git history)

Prior to the Vite refactor, **Mapbox access tokens** and a **GeoNames username** were hardcoded in `index.html` and `search.html`. These values appear across the repository's git history on `main` (introduced ~March 2026).

**If this repository is or was public, you should:**

1. **Rotate the Mapbox token** at [account.mapbox.com](https://account.mapbox.com/) — revoke the exposed token and create a new one with URL restrictions (`gusty.ca`, `localhost`).
2. **Review GeoNames account** — the username is lower risk but consider whether the account should remain active.
3. **Set environment variables** in Vercel/hosting — do not rely on inline HTML tokens going forward.
4. **Optional: purge git history** — if full removal from history is required, use `git filter-repo` or BFG Repo-Cleaner to strip `pk.eyJ*` strings, then force-push. This rewrites history and affects all clones.

The current working tree loads credentials exclusively from `VITE_*` environment variables via `src/lib/constants.js`. There is no hardcoded token fallback.

## Client-side exposure model

Mapbox tokens in a browser app are always visible in network requests. Mitigate with:

- URL-restricted public tokens (not secret tokens)
- Per-environment tokens (dev vs production)
- Rate limits and usage alerts in the Mapbox dashboard

## What Gusty does not store

- No user accounts or server-side database
- Saved locations and settings remain in browser `localStorage` only
- No PII is collected by the application code (see privacy copy on the landing page regarding Vercel Analytics)
