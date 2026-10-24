# Validation - 24 October 2026

## Completed

- Built 14 static article routes and search index from shared Markdown.
- Resolved article links and both PDF download targets.
- Verified source version and 83 evidence files, including all manifest script references.
- Six Node checks passed; none failed.
- One HTTP preview check was explicitly skipped after the environment rejected loopback connections with EACCES.
- Generated both PDFs from dist/manual-source.json, with internal contents links, external links, bookmarks, revision and local-test version.
- Rendered every PDF page and reviewed contact sheets; reviewed final pagination after revision.
- Prepared extension popup and Nexus Tools Help-link previews without changing the installable extension.
- Reviewed routing fragment for exact /guide scope, deep-link file resolution and 404 boundaries. This is not Caddy runtime validation.
- Publication gate intentionally rejects this review while evidence and approvals are incomplete.

## Not completed

- Current Store listing/installed-build comparison.
- Live Caddy/Compose/mount and dashboard-source audit.
- Production baseline/post-deployment health comparison.
- HTTP preview assertions (environment blocks connections).
- Interactive desktop/tablet/mobile, keyboard and screen-reader checks (browser unavailable).
- Current screenshots and live game workflow verification.
- Exhaustive advanced-feature walkthroughs.
- Clean npm install and lockfile generation.

No deployment, production health verification, Store publication or complete-live-manual claim is made.
