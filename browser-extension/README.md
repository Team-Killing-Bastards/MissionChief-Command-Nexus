# Nexus Edge and Chrome extension

This is the source and reproducible build for the Edge and Chrome Store editions. The canonical Tampermonkey edition remains at `src/missionchief-command-nexus.user.js` in the repository root; its release process is independent.

## Release flow

Requested change → versioned GitHub change → pull request checks → main → one verified ZIP → Microsoft and Google submissions → independent store reviews → automatic updates for Store installations.

The workflow runs on changes under this directory or its workflow file. Pull requests use an inert test logger destination. Trusted main builds inject the existing production endpoint from an Actions secret. A manifest version must be increased whenever distributable bytes change. GitHub Releases named `edge-v<version>` keep the exact ZIP and a resumable submission receipt. Their status `submitted` means Microsoft accepted the submission, not that review has finished. Repeating a completed version skips upload; changing its bytes fails and requires a new version.

Only the same product `a6093637-b629-412b-801c-f56498a87d22` is updated. The [existing hidden listing](https://microsoftedge.microsoft.com/addons/detail/kobaiojomaiopnipphnjaefjenmjmgnc) retains its identity. Unpacked developer installations do not gain Store updating merely because this workflow exists; install the Store edition to receive its updates.

## Credentials and maintenance

Required repository Actions secrets:

- `EDGE_API_KEY`: Microsoft Partner Center Publish API key.
- `EDGE_CLIENT_ID`: matching Microsoft client ID.
- `EDGE_LOGGER_ENDPOINT`: existing Google Apps Script upload URL, injected only for production builds. This is a client-visible service URL, not Google account credentials.

Credentials are never included in source or release receipts. The initial Microsoft key expires on **16 November 2026** and must be replaced in GitHub before then. Store metadata and privacy changes still require Partner Center. A pending review may prevent another submission; the workflow preserves its operation receipt and reports failures rather than cancelling a review.

If a POST has an uncertain outcome, automatic repetition stops. Inspect Partner Center and the draft GitHub release receipt before repairing it; do not simply delete the release and retry. Known operation IDs can be polled again by rerunning the workflow. Concurrent releases are serialized. Do not manually edit the product draft while a release workflow is running.

## Local checks

Use Node 24 and pnpm 11.19.0. Check out baseline commit `015044a3627f34769907bc6f77b7d3edeadc71aa` of this repository into `browser-extension/upstream`, then run `pnpm install --frozen-lockfile --ignore-scripts` and `node scripts/verify-all.mjs` from this directory. The smoke test needs Microsoft Edge on Windows; `NEXUS_EDGE_PATH` can select its executable.

From 3.0.43.43, runtime edits belong in `runtime/nexus-runtime.js`; the build copies this reviewed source to generated `extension/nexus-runtime.js`. Standalone feature modules are maintained directly in `extension`. The old .21 builder remains in `scripts/harden-runtime-21.mjs` for comparison and is not used to regenerate .43. `reference/local-43.json` locks the tested .43 hashes and narrowly records the Store branding/configuration changes. A future release must deliberately update this provenance and both runtime/manifest versions. This prevents an old builder silently replacing the tested runtime.

The curated .13 baseline ZIP and `reference/legacy-runtime.txt` remain comparison fixtures. Backend source uses placeholder IDs for contract tests; this workflow never deploys Google Apps Script. Store builds inject the destination only from the trusted existing Actions secret. Local report exports, player data and browser profiles are not release inputs.

Version 3.0.43.43 promotes the tested local series through .43: memory/vehicle loading improvements, native Nexus conveniences replacing the enabled LSS features, credits summaries and charts, mission rewards, dispatch/transport controls, crew/training coverage, requirement ticks and Cars to tow coverage. It consolidates 36 switches and mission/Event Scanner settings in Nexus Tools, retains only Mission on the mission overlay, moves Tools to the top right, and widens Naming to 440px. Existing saved settings and queues are retained. Stop Auto and refresh an already open game tab after the Store update to avoid mixed parent/worker builds.

Release verification includes the existing hardening tests, adapted upstream regressions, manifest/ZIP/provenance validation, an isolated unpacked-Edge smoke test, and the real-extension Settings fixture at desktop and narrow widths. The .43 runtime must remain byte-identical to the tested local runtime. Fixtures use mocked game responses and do not prove overnight live performance.

Version 3.0.43.15 adds the shared personnel register read scheduler, bounded station prefetch and cancellation/backoff improvements. Quick Refresh still reuses eligible complete records; Full Verify still reads every vehicle's assignment page. Tests do not establish live game scan timings.

Version 3.0.43.16 reconnects the exact duplicate-dispatch status to the existing recovery watchdog after mission re-entry. The dispatch claim stays protected, repeated observations do not reset the deadline, and no new dispatch is counted. Persistent heap above 1 GiB after a worker recycle can escalate to a controller refresh at a verified mission transition. Refreshes have a ten-minute cooldown, recheck saved resume state and respect a user Stop. This contains high memory; it does not identify retained objects or establish overnight live performance. Publication was authorized on 6 September 2026. The separate Google Sheets income-capture discrepancy is not fixed by this release.

API reference: [Microsoft automated extension updates](https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/using-addons-api).
