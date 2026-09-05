# GOO-JOBB

Production-oriented Cloudflare job-search platform.

## Included
- D1 job database with FTS5 search index
- KV caching with stale-friendly HTTP cache headers
- Public RSS/JSON source ingestion with timeouts and deduplication
- Greenhouse/Ashby/Lever adapter registry for board-specific expansion
- Dynamic `/jobs/:slug` pages and JobPosting JSON-LD
- Chunked sitemap generation
- AI endpoint using Cloudflare Workers AI with deterministic fallback
- Browser PWA shell/offline cache
- Saves, alerts, application tracking and first-party events
- Rate limiting, CSP, HSTS and input validation
- Cron sync plus GitHub Actions deployment/sync

## Deployment
1. Put the repository on GitHub.
2. Create the Cloudflare Pages project `goo-jobb`.
3. Ensure D1/KV IDs in `wrangler.toml` are the intended resources.
4. Configure `SYNC_TOKEN` as a Worker/Pages secret if using the protected `/api/sync` endpoint.
5. Configure `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `SYNC_URL`, and `SYNC_TOKEN` GitHub secrets for Actions.
6. Apply the D1 schema with Wrangler.

Important: public feeds can disappear, change format, rate-limit, or prohibit automated access. The source adapter intentionally syncs only declared public endpoints; ATS templates require board/company identifiers and are not falsely treated as universal feeds.
