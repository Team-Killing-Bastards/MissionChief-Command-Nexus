# Release reconciliation

MissionChief Command Nexus treats a release as complete only when all of the following are true for the current userscript version on `main`:

- the matching immutable GitHub tag and Release exist;
- the versioned `.user.js` asset and SHA-256 asset are present and verified;
- Greasy Fork serves the exact canonical userscript source; and
- the canonical Discord LIVE announcement has a durable delivery-receipt asset.

Every normal owner-authored push to `main` runs the permanent repository-quality workflow. Incomplete publication is retried through the canonical `publish-release` workflow, while the receipt guard prevents duplicate Discord announcements.

Workflow-generated pushes do not recursively start another GitHub Actions run, so release-control maintenance must finish with a normal owner-authored `main` push when a fresh reconciliation is required.
