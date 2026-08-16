# Testing Strategy

MissionChief Command Nexus can rename resources, assign personnel and dispatch vehicles. Testing must therefore protect user data, operational correctness and long-session stability—not merely JavaScript syntax.

## Automated validation

The repository currently provides two permanent validation paths.

### Repository integrity

```bash
python3 scripts/check_repository.py
```

This checks required repository files, attribution, local documentation links, README anchors and presentation contracts, userscript metadata, canonical source presence and README/source version parity.

### Userscript validation

```bash
node --check src/missionchief-command-nexus.user.js
node scripts/validate-userscript.mjs
for check in scripts/check-*.mjs; do node "$check"; done
```

`validate-userscript.mjs` is the single owner of canonical release and component-version checks. It validates metadata, semantic versions, exactly one Resource Administration and Mission Finder header, Greasy Fork size limits and prohibited update/download metadata. Pull requests that change the canonical userscript must increase `@version` above the base branch.

Every permanent behavioral regression is named `scripts/check-*.mjs`. The workflow discovers and runs the complete set automatically. Those checks assert behavior, selectors, types, calculations and lifecycle contracts without pinning current release or component versions. `check-version-agnostic-regressions.mjs` fails if a behavioral check reintroduces a pinned version.

When a defect is fixed, add a focused executable regression to this set. Do not add a one-use builder, trigger file, self-modifying repair workflow or version-specific validation job to permanent automation.

Automated checks are necessary but cannot prove live MissionChief behaviour.

## Live test layers

### 1. Baseline observation

Before changing behaviour, record how the current canonical version behaves in the same environment. The baseline must include:

- Command Nexus version and commit.
- MissionChief domain.
- Browser and version.
- Userscript manager and version.
- Operating system or device.
- Other enabled userscripts.
- Relevant settings and stored-data starting state.

### 2. Isolated logic checks

Where practical, protect deterministic logic with fixtures or focused harnesses before connecting it to live writes or dispatch:

- Requirement normalization.
- Patient and specialist-demand conversion.
- Vehicle and trained-personnel capability matching.
- Public-order and specialist profile calculations.
- Naming output.
- Storage validation and migration.
- Training-registry pruning and persistence.

### 3. Preview and bounded administration

Administrative changes must be tested in increasing scope:

1. Preview only.
2. One station or one vehicle.
3. One personnel assignment.
4. Verification of the resulting live state.
5. A small multi-item batch.
6. Pause, resume and stop where supported.

Confirm:

- Correct station and vehicle scope.
- Correct proposed names or assignments.
- No writes during preview.
- Accurate before/after output.
- Clear skip and failure reasons.
- No repeated save or assignment action.

### 4. Manual mission workflow

Test assisted controls before Auto Mode:

- Unit Finder on a simple mission.
- Mission Update after a live requirement change.
- A patient mission where ambulance demand is explicit.
- A patient mission where ambulance demand is not listed as a vehicle requirement.
- A specialist medical mission.
- A trained-personnel Police mission.
- A mission upgrade after initial selection.
- Dispatch and Dispatch & Share.
- A mission requiring transport continuation.
- End-of-queue continuation.

For each mission, record required, selected, responding, still-needed and dispatched capability where available.

### 5. Auto Mode

Auto Mode requires separate evidence because it combines selection, updates, dispatch and continuation.

Confirm:

- The current mission instance owns the execution cycle.
- Stale panels cannot dispatch.
- Zero-selection failure stops safely.
- Staffing or qualification shortages are surfaced.
- A mission is not submitted twice.
- Mission changes restart selection rather than reusing stale state.
- Queue continuation opens the intended next mission.
- Manual stop prevents later continuation.

### 6. Long-session stability

Run extended sessions and observe:

- Duplicate launchers or panels.
- Repeated event handlers.
- Observer growth.
- Interval and timeout cleanup.
- Registry size and persistence behaviour.
- Repeated DOM scans.
- CPU and memory trend.
- Queue restarts after manual stop.
- Cross-mission stale state.

A long-session test should record approximate duration, missions processed, administration operations performed and any interacting userscripts.

## Compatibility matrix

Use one row per tested environment:

| Command Nexus | Commit | Domain | Browser | Userscript manager | OS/device | Other scripts | Test scope | Result | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| _current `@version`_ | _SHA_ | MissionChief UK | _Name/version_ | _Name/version_ | _Platform_ | _List_ | _Workflows_ | Pass / Partial / Fail | _Issue, log or notes_ |

Do not convert an untested environment into a compatibility claim.

## Release-blocking failures

A release candidate must not ship with a known defect that can:

- Dispatch materially incorrect resources without clear warning.
- Ignore patient or required-personnel demand.
- Repeatedly submit the same mission action.
- Select capability from a previous mission instance.
- Corrupt or destroy settings or training data.
- Rename or assign outside the disclosed scope.
- Bypass preview unexpectedly.
- Create uncontrolled observers, timers or interface duplication.
- Continue automation after the user stops it.

## Evidence handling

Testing notes must reference the exact commit or release candidate. Remove account IDs, webhook URLs, tokens, private alliance information and personal data from screenshots or logs before publication.

Use GitHub Issues for reproducible failures. Attach sanitized evidence and link the affected source change or pull request.

See [Developer Handoff](DEVELOPER_HANDOFF.md), [Migration Guide](MIGRATION.md) and [Release Process](RELEASE_PROCESS.md).
