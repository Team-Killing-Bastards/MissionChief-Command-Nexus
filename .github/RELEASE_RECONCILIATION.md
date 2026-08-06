# Release reconciliation

MissionChief Command Nexus treats a release as complete only when all of the following are true for the current userscript version on `main`:

- the matching immutable GitHub tag and Release exist;
- the versioned `.user.js` asset and SHA-256 asset are present and verified;
- Greasy Fork serves the exact canonical userscript source; and
- the canonical Discord LIVE announcement has a durable delivery-receipt asset.

A merged pull request is the primary trusted publication hinge because its `pull_request_target` close event runs against the reviewed workflow on `main` with release secrets available. Normal owner-authored `main` pushes and manual dispatch remain recovery paths.

Incomplete publication is retried through the canonical `publish-release` workflow, while the receipt guard prevents duplicate Discord announcements. Workflow-generated pushes do not recursively start another GitHub Actions run, so release-control maintenance must finish with a trusted repository event when fresh reconciliation is required.
