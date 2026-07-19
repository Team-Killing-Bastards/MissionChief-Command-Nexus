# Architecture Direction

This document defines the intended structure of MissionChief Command Nexus before the two source userscripts are merged.

> The final implementation is controlled by **MartyBlyth**, the project developer. This document is a repository-planning aid and does not override his technical decisions.

## Primary objective

Combine mission dispatch intelligence and resource administration into one userscript without simply concatenating two independent scripts.

The unified runtime should provide:

- One userscript metadata block.
- One initialization entry point.
- One shared configuration layer.
- One controlled lifecycle for observers, timers and event listeners.
- One coherent interface.
- Shared capability and training data between administrative and dispatch modules.

## Proposed module boundaries

```text
src/
├── CommandNexus.user.js          # distributable userscript entry
├── core/
│   ├── bootstrap.js              # startup, page detection and shutdown
│   ├── lifecycle.js              # observers, listeners, timers and cleanup
│   ├── storage.js                # versioned settings and migration
│   ├── logger.js                 # controlled diagnostics
│   └── constants.js              # stable keys and selectors
├── mission/
│   ├── requirements.js           # mission and live requirement parsing
│   ├── patients.js               # patient and ambulance demand
│   ├── capabilities.js           # vehicle/personnel capability mapping
│   ├── selector.js               # candidate selection
│   ├── dispatch.js               # dispatch/share submission
│   └── automation.js             # queue, upgrades and continuation
├── resources/
│   ├── stations.js               # station scanning and naming
│   ├── vehicles.js               # vehicle scanning and naming
│   ├── personnel.js              # assignment and verification
│   └── training-registry.js      # shared qualification intelligence
├── ui/
│   ├── shell.js                  # unified navigation and panel container
│   ├── mission-panel.js
│   ├── resource-panel.js
│   ├── progress.js
│   └── notifications.js
└── reporting/
    ├── run-report.js
    └── diagnostics.js
```

The actual repository may retain a single-file userscript for distribution while keeping the source logically separated during development.

## Shared state

Shared state should be explicit rather than distributed through unrelated globals.

Recommended domains:

- Runtime state: current page, active operation and cancellation state.
- User settings: preferences, naming rules and automation options.
- Mission state: requirements, selected units, patients and dispatch status.
- Resource state: station, vehicle, personnel and training information.
- UI state: active panel, progress and transient notifications.

## Lifecycle rules

Every module that registers an observer, timer or event listener should also provide deterministic cleanup.

Required safeguards:

- Prevent duplicate initialization after partial page updates.
- Disconnect observers when their target is removed or the operation ends.
- Clear intervals and timeouts on cancellation.
- Namespace or centrally register event listeners.
- Avoid repeated full-page DOM scans when scoped observation is possible.
- Debounce high-frequency mutation handling.

## Storage and migration

Existing users may have settings or training-registry data saved under keys from either source script.

The unified script should:

1. Detect legacy storage keys.
2. Validate their shape.
3. Migrate once into versioned Command Nexus storage.
4. Preserve unknown data until migration is confirmed.
5. Record the completed migration version.
6. Avoid destructive deletion in the first release.

## Mission selection model

Mission selection should evaluate capability, not only vehicle labels.

A candidate vehicle may need to satisfy:

- Required vehicle type or accepted substitute.
- Availability and current status.
- Distance or configured selection order.
- Required trained personnel.
- Required equipment or specialist capability.
- Patient transport or critical-care demand.
- Existing selected and en-route counts.

## Administrative safety

Bulk station naming, unit naming and personnel assignment must retain:

- Preview mode.
- Clear scope disclosure.
- Progress reporting.
- Pause, resume and stop controls where applicable.
- Per-item success, skip and failure records.
- Final verification after write operations.

## Distribution

The published userscript should have:

- Stable `@name`, `@namespace`, `@version`, `@description` and `@license` metadata.
- Explicit MissionChief domain matches.
- Controlled update and download URLs.
- A reproducible release artefact matching the tagged source.
- A checksum recorded in the release notes where practical.
