# Deployment runbook - inspection required

This is a conditional procedure. No live configuration has been inspected and nothing has been deployed.

## Before making changes

1. Establish authorised SSH access. Identify the actual compose directory, service names, Caddyfile and docs-visible mounts.
2. Inspect existing routes, global options, authentication and Caddy's adapted handler order privately. Do not publish credentials, upstream private hosts or full environment output.
3. Locate the stats dashboard's real route and source. The root returned JSON Not Found during audit.
4. Record response status, content type and appropriate content assertions for the actual dashboard, known health endpoint and public Realism status/viewport routes. Do not call write endpoints for a documentation test.
5. Back up the exact live Caddyfile and Compose file with timestamped copies, retaining permissions. Record current hashes and symlink targets. Do not overwrite them using a template.
6. Finish publication-checks.json and run node scripts/release-gate.mjs. The gate intentionally fails for the present review.

## Prepare files without altering API services

Build off-server. Assemble dist with HTML, assets and both PDFs together. Do not deploy source, audit files, manual-source.json, build metadata or private QA evidence.

Create a uniquely named release directory under the confirmed docs mount, copy the reviewed static files and verify their hashes. No collector rebuild, Postgres change or database migration is needed.

If Caddy already has a suitable mounted directory, use it. Otherwise a new read-only mount requires recreating Caddy; stop for production-risk approval after preparing the exact diff, downtime expectation and rollback. Do not invent a host path or service name.

## Route integration

Merge Caddy.guide.fragment into the existing site only after inspecting its auth/path handler structure. Keep every existing route and policy. The exact /guide redirect and /guide/* handler avoid capturing /guide-other.

Validate the candidate with the same installed Caddy version, adapter and filesystem context used by production. Confirm the docs directory is readable inside that context. Do not describe offline syntax review as live validation.

Use an atomic current-symlink switch within the docs filesystem after confirming the previous target. Gracefully reload the verified Caddy service if its config changed. Do not restart/recreate the collector or database.

## Verify and roll back

Verify /guide, /guide/getting-started, /guide/profiles, /guide/search.json, both PDFs and one deliberately missing /guide article. Missing paths must be 404. Confirm no unrelated /guide-other capture.

Repeat the SAME dashboard/API baseline requests and assertions. Check collector/container status and logs for new errors without exposing secrets. Do not call write APIs.

If a check fails, restore the saved Caddyfile and previous docs symlink, validate then gracefully reload. Keep the failed release for investigation; do not recursively delete unknown directories.

Only after public /guide URLs pass should the existing dashboard receive the User Guide link. A future separately versioned extension update can activate Help links; the preview in output/help-links is not an installable package.
