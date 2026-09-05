# ADR-0007: Independent verified Edge Store delivery

**Status:** accepted
Date: 2026-09-05

The owner requested automatic chat-to-GitHub-to-Edge updates after the existing extension became live. The Store edition now has its own build source under `browser-extension`, four-part manifest version and `edge-v` release tags. The canonical Tampermonkey userscript and its existing release version remain independent.

Main changes run the complete extension test/package gate and submit the same verified ZIP to the existing Microsoft product. Pull requests cannot run the publishing job. Credentials are GitHub Actions secrets. Production logger configuration is injected during trusted builds; private server account configuration is excluded from GitHub. Microsoft review remains mandatory and submission success is not called live publication.

The generated runtime preserves the supplied extension baseline through guarded patches. Function parity, adapted upstream regressions, behavioral tests, package identity and an isolated Edge smoke test protect the build. CI uses a pinned baseline checkout for the inherited tests. Future changes should update this provenance explicitly rather than silently testing a moving baseline.

Submission receipts are durable GitHub release records. Known operations resume; uncertain writes fail closed, preventing blind duplicate submissions. Store draft editing must not overlap a running release. Different package bytes require a new manifest version.

Evidence: `browser-extension/scripts/verify-all.mjs`, `browser-extension/tests/edge-api.test.mjs`, and `.github/workflows/edge-extension.yml`. Local gates passed during setup; GitHub execution and credential activation are recorded separately in release receipts.
