# Migration Guide

This document covers the transition from the two legacy MartyBlyth userscripts to the merged MissionChief Command Nexus installation.

## Legacy installations

The previous tools were distributed separately:

1. **Mission Finder 2026 Trained Personal Update**
2. **MissionChief Unit, Station & Personnel Tools**

Command Nexus now contains both systems in one `.user.js` file. The supported operating state is one enabled Command Nexus installation, not three scripts running together.

## Before installing Command Nexus

1. Record the versions of both legacy scripts.
2. Export or record important settings where the legacy interface provides an export.
3. Keep a temporary backup of the legacy scripts or their source links.
4. Do not delete browser storage manually.
5. Choose a low-risk MissionChief session for the first test.

## Installation transition

1. Disable both legacy standalone scripts.
2. Install the canonical Command Nexus source:

   ```text
   https://raw.githubusercontent.com/Team-Killing-Bastards/MissionChief-Command-Nexus/main/src/missionchief-command-nexus.user.js
   ```

3. Reload MissionChief.
4. Confirm the Command Nexus administration controls appear only once.
5. Open one simple mission and confirm the Mission Operations controls appear only once.
6. Run an administrative preview on the smallest practical scope.
7. Run Unit Finder on a simple mission without dispatching automatically.
8. Confirm expected settings and training intelligence remain available.
9. Keep the legacy scripts disabled until several normal sessions complete successfully.

> [!WARNING]
> Do not enable Command Nexus alongside either legacy script. Duplicate panels, observers, timers, vehicle selection or submissions may occur.

## Current storage position

The current Command Nexus `3.0.41` source enforces mission-only Worker A and personal patient/prisoner transport-only Worker B at every transport, recovery and observer gate and retains versioned keys from both established engines plus V3 pipeline/session keys for sole-owner dispatch, adaptive page warming, recovery, low-supply pause, continuity and bounded endurance telemetry. Runtime recycling and fatal teardown clear only ephemeral/operational worker state; station, unit, personnel, training and durable setting keys are preserved. A complete formal migration matrix has not yet been proven for every combination of stored data.

Development must therefore distinguish between:

- Legacy settings that remain directly readable.
- Shared training-registry data already used by both engines.
- Conflicting preferences that need explicit precedence rules.
- Unknown or malformed data that must not be deleted silently.

## Migration test matrix

Each row requires evidence before migration coverage can be claimed complete:

| Starting state | Required result | Status |
|---|---|---|
| Mission Finder only | Mission controls and saved preferences remain usable | Not fully evidenced |
| Unit, Station & Personnel Tools only | Administration and training data remain usable | Not fully evidenced |
| Both legacy scripts | One Command Nexus installation replaces both without duplicate behaviour | Not fully evidenced |
| Clean browser profile | Command Nexus initializes with safe defaults | Not fully evidenced |
| Existing shared training registry | Qualification-aware mission selection can consume valid records | Implemented; live matrix pending |
| Malformed or old storage | Script fails safely without deleting unrelated data | Pending |

Test evidence should record the exact Command Nexus commit, legacy versions, domain, browser, userscript manager and outcome.

## Rollback

During migration validation or incident recovery:

1. Stop any active automation or batch process.
2. Disable Command Nexus.
3. Re-enable the previous legacy scripts.
4. Reload MissionChief and confirm each legacy interface appears once.
5. Restore exported settings only when necessary and documented.
6. Preserve the failed Command Nexus version, console output and reproduction steps for investigation.

Command Nexus should not destructively rewrite or remove legacy data merely because the user rolls back.

## Developer requirements for storage changes

Any pull request that changes storage keys, data shape or migration behaviour must include:

- Old and new key names.
- Expected old and new data shapes.
- Validation and fallback behaviour.
- Conflict-resolution precedence.
- Rollback behaviour.
- A version increase.
- Tests for clean, valid legacy, conflicting and malformed states.
- Changelog and migration-document updates.

## Completion gate

Migration cannot be marked complete until all supported starting states have documented evidence and no known path can corrupt settings, lose training intelligence or create duplicate execution.

See [Developer Handoff](DEVELOPER_HANDOFF.md) and [Testing Strategy](TESTING.md).
