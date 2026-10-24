---
{"title":"Troubleshooting and logs","description":"Diagnose using exact status, vehicle evidence and installed version.","sources":["nexus-tools.js","nexus-runtime.js","nexus-account-worker.mjs","nexus-station-profiles-ui.js","collector-client.mjs"]}
---
## What this does

Preserve evidence and distinguish a normal wait from a failed game action.

## Prerequisites

Keep the affected mission/station available. Note time, build and active automation.

## Step by step

1. Stop affected automation before repeating an uncertain operation.
2. Copy exact status and mission/station ID.
3. Check the actual game: en-route vehicles, names, crew or purchases.
4. Open **Nexus Tools → Settings**.
5. With the mission open, use **Export open mission diagnostics** when available.
6. If needed, enable **Diagnostic capture**, save, reproduce once and export again.
7. Review the export before sharing. Remove credentials, tokens and unrelated personal/player data.
8. Give support build, browser, domain, workflow, exact status and sanitised evidence.

**Screenshot pending:** A current capture of this screen is still required. No generated substitute is included.

## Common outcomes

- **Nexus twice:** Disable duplicates and refresh.
- **Open Nexus unavailable:** Use a supported signed-in game page.
- **Unrecognised sign-in installation:** Use the maintainer's intended fixed-ID release.
- **Account service unavailable:** Record its exact error; local data and cloud availability are separate.
- **Vehicle list not stable:** Check normal and extra vehicle-page loading.
- **Specialist shortage:** Check exact type, assigned crew, course and register evidence.
- **Low queue/transport wait:** Read controller status before calling it a crash.
- **Duplicate dispatch blocked:** Inspect en-route units before retrying.
- **Profile uncertain:** Inspect the station before clearing a checkpoint; then perform a fresh review.

## Expected result

One reproducible operation, a concrete outcome and sanitised evidence. Unknown is not reported as success.

## Warnings

> Do not clear all storage as a first fix. Do not repeatedly submit uncertain purchases, removals, renames or dispatches.

## Further support

Use [Discord](https://discord.com/invite/mXnTHuNfvu) or [GitHub issues](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues). State Store versus local test build. Never publish an unsanitised export.
