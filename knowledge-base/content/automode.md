---
{"title":"Automode, workers and queues","description":"Read the managed mission cycle and investigate a pause using its status.","sources":["nexus-runtime.js","nexus-auto-stop-store.js","nexus-settings.js"]}
---
## What this does

Personal Auto Mode manages mission loading, complete vehicle-list loading, selection, readiness checks, dispatch and progression. Worker visibility alone does not prove success.

## Prerequisites

Complete a manual selection/dispatch test and verify specialist crew. Stop Alliance Auto for the initial personal Auto Mode test.

## Step by step

1. Review dispatch preferences while Auto Mode is stopped.
2. Open the personal mission controller.
3. Select **Start Auto Mode**.
4. Observe mission identity, stage and outcome.
5. Verify completed dispatch in the game's en-route units.
6. Select **Stop Auto Mode** before administration changes or on unexpected behaviour.
7. Record exact status and export diagnostics before retrying a block.

## Workers and queues

The retained architecture uses Mission Worker A for mission selection/dispatch and an on-demand Transport Worker B for exact personal patient/prisoner requests. The roles are serialised, not two workers dispatching the same mission simultaneously.

The source contains a low-queue wait/release path. Too little actionable work can release a worker and later start a fresh one. Transport handoffs, trained-crew shortages, unstable vehicle lists and recovery boundaries also affect the visible stage. Read actual status before classifying a pause.

Alliance Auto is a separate setting. Stopping personal Auto Mode does not establish that alliance processing has stopped.

## Expected result

An eligible mission completes a checked cycle, or the controller reports a concrete wait, shortage or stopped condition. Unknown remains unknown until checked.

## Warnings

> Stop on repeated dispatch, wrong missions or unresolved transport. Do not clear all browser storage to force a restart; it can remove durable profiles and evidence.

## Troubleshooting

- **Vehicle list not stable:** Check game and extra-page loading.
- **Zero selected:** Check availability, type mapping and training evidence.
- **Training shortage:** Check assigned trained crew and verify the scope.
- **Duplicate dispatch blocked:** Check en-route vehicles before retrying.
- **No worker:** Read queue/wait and transport state first.

**Screenshot status:** Live controller, handoff and successful Auto Mode screenshots remain pending.
