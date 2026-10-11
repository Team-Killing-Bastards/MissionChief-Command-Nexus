# Nexus 3.0.43.218 Optional startup diagnostics

Built on .217, preserving its CRV aliases, verified empty transport cleanup and all existing safeguards. Adds optional local startup capture; does not repair or claim a cause for the .205 startup report. No store submission.

## Install and collect evidence

1. Stop Auto Mode. Extract the ZIP into a fresh folder, disable the previous Nexus copy and load the new folder with Load unpacked. Refresh all MissionChief tabs.
2. Open Nexus Tools → Settings → Diagnostics. Turn Diagnostic capture on, then Save settings. The state reads Capture is ON. The switch also applies during a run.
3. Run Auto Mode and reproduce the startup problem.
4. Export diagnostics from the Auto Mode panel **before Retry or refreshing the game**. The JSON includes startupDiagnostics with enabled state, limits and records. Failure/removal evidence survives disposal of the worker.
5. Turn Diagnostic capture off and Save settings. Earlier bounded evidence remains exportable in this tab until refresh. Capture is off by default on other browsers; its preference and evidence are not cloud-synced or uploaded.

## Boundaries

At most 200 scalar records, no retained DOM/window/frame references, no capture polling/timers/storage writes. Off returns before DOM/style work. Turning off removes the dedicated collection listeners; cheap setting-change listeners remain. Existing standard diagnostics remain available.

Validation and performance measurements: diagnostic-validation.json. Fixture measurements are not a whole-game throughput or endurance benchmark. The held-animation test is a conditional reproduction, not proof of the user's root cause. This diagnostic-only candidate retains the separate .217 queue-stall issue reported in the preceding export; dispatch/recovery behaviour is unchanged.
