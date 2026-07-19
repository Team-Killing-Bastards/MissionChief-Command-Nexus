# Migration Plan

This document defines the expected migration path from the two separate MartyBlyth userscripts to MissionChief Command Nexus.

## Existing installations

The source implementations are currently distributed separately:

1. Mission Finder 2026 Trained Personal Update.
2. MissionChief Unit, Station & Personnel Tools.

The unified release must not assume that every user has both scripts installed or that every user has identical saved data.

## Migration objectives

- Preserve valid preferences where their meaning remains unchanged.
- Preserve personnel and training-registry data.
- Avoid running both legacy interfaces after Command Nexus takes control.
- Avoid destructive deletion during the first migration.
- Provide a clear rollback path during pre-release testing.

## Required implementation steps

1. Inventory all legacy storage keys and data shapes.
2. Define a versioned Command Nexus settings schema.
3. Detect each source script independently.
4. Validate legacy values before importing them.
5. Resolve conflicting values with documented precedence.
6. Record migration completion and source versions.
7. Retain a backup copy of legacy data for at least the first stable release cycle.
8. Present migration results or warnings to the user.

## Installation transition

The final migration guide should instruct users to:

1. Export or record important settings where export is supported.
2. Disable both legacy scripts rather than immediately deleting them.
3. Install the Command Nexus release.
4. Confirm imported preferences and training data.
5. Test a small administrative preview and a simple mission.
6. Remove the legacy scripts only after successful validation.

## Rollback

During pre-release testing, rollback should consist of:

- Disabling Command Nexus.
- Re-enabling the original scripts.
- Restoring legacy storage only when necessary and documented.

Command Nexus should not modify legacy storage after migration unless a later, explicit cleanup process is introduced.

## Compatibility warning

Running Command Nexus and either source script simultaneously may create duplicate panels, observers, timers or submissions. The first release must detect or clearly warn about simultaneous activation where practical.
