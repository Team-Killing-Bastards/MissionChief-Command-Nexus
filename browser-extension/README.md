# Nexus Edge extension

This is the source and reproducible build for the Edge Store edition. The canonical Tampermonkey edition remains at `src/missionchief-command-nexus.user.js` in the repository root; its release process is independent.

## Release flow

Requested change → versioned GitHub change → pull request checks → main → verified ZIP → Microsoft submission → Microsoft review → automatic updates for Store installations.

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

Runtime edits belong in the guarded patches under `scripts`, not generated `extension/nexus-runtime.js`. The curated baseline ZIP contains only original runtime, build metadata and analytics core. The original full ZIP, private backend account IDs and live audit records are deliberately excluded. `reference/legacy-runtime.txt` is a comparison fixture, not an alternate installable userscript. Backend source is retained with placeholder IDs for contract tests; this workflow never deploys Google Apps Script.

Version 3.0.43.15 adds the shared personnel register read scheduler, bounded station prefetch and cancellation/backoff improvements. Quick Refresh still reuses eligible complete records; Full Verify still reads every vehicle's assignment page. Tests do not establish live game scan timings.

Version 3.0.43.16 reconnects the exact duplicate-dispatch status to the existing recovery watchdog after mission re-entry. The dispatch claim stays protected, repeated observations do not reset the deadline, and no new dispatch is counted. Persistent heap above 1 GiB after a worker recycle can escalate to a controller refresh at a verified mission transition. Refreshes have a ten-minute cooldown, recheck saved resume state and respect a user Stop. This contains high memory; it does not identify retained objects or establish overnight live performance. Publication was authorized on 6 September 2026. The separate Google Sheets income-capture discrepancy is not fixed by this release.

API reference: [Microsoft automated extension updates](https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/using-addons-api).
