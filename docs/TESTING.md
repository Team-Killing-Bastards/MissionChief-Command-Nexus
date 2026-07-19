# Testing Strategy

Command Nexus combines tools that can rename resources, assign personnel and dispatch vehicles. Testing must therefore cover correctness, safety and long-session stability.

## Test layers

### 1. Static review

- Userscript metadata is complete and internally consistent.
- Version numbers match release documentation.
- No duplicate metadata blocks exist.
- No credentials, private URLs or account data are committed.
- Selectors and storage keys are centralized where practical.

### 2. Isolated module checks

Test requirement parsing, patient calculation, capability matching, naming output and training-registry handling with controlled fixtures before connecting them to write or dispatch actions.

### 3. Preview-mode checks

Bulk administrative actions must first be validated in preview mode:

- Correct station scope.
- Correct proposed names.
- Correct personnel-to-vehicle matching.
- Correct skip reasons.
- No game data changed during preview.

### 4. Live manual checks

Validate each workflow manually on a limited scope before batch testing:

- One station rename.
- One vehicle rename.
- One personnel assignment.
- One simple mission selection.
- One patient mission.
- One trained-personnel mission.
- One mission upgrade.
- One alliance dispatch/share operation.

### 5. Session stability

Run extended sessions and verify:

- Panels are not duplicated.
- Event handlers are not applied repeatedly.
- Observers disconnect when no longer needed.
- Timers stop when operations stop.
- Queue state does not restart unexpectedly.
- Memory and CPU use remain stable enough for ordinary gameplay.

## Compatibility matrix

Record evidence for each tested combination:

| Area | Values to record |
|---|---|
| Domain | MissionChief UK / Police MissionChief UK |
| Browser | Name and version |
| Userscript manager | Name and version |
| Operating system | Desktop or mobile platform |
| Other scripts | Enabled scripts that may interact with the same UI |
| Result | Pass, partial, fail or not tested |

## Release-blocking failures

A release candidate must not ship with known defects that can:

- Dispatch materially incorrect resources without clear warning.
- Ignore patient or required-personnel demand.
- Repeatedly submit the same action.
- Corrupt or destroy saved settings or training data.
- Rename or assign outside the disclosed scope.
- Create uncontrolled observers, timers or interface duplication.

## Evidence

Testing notes should reference the exact commit or release candidate. Screenshots and logs must have private information removed before publication.
