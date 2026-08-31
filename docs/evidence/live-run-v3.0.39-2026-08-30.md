# Strong v3.0.39 live run and memory-risk baseline — 2026-08-30

## Status

Sanitised historical evidence. This file supports issue [#396](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/396) and `MEMORY-001`; it does not replace current project state.

## Source

A Command Nexus diagnostic export generated at `2026-08-30T21:50:13.338Z` from Microsoft Edge on MissionChief UK. The raw export remains external project evidence because it contains a large quantity of mission and vehicle identifiers.

## Functional result

- Runtime: approximately **2 hours 14 minutes 21 seconds**.
- Unique missions handled: **288**.
- Successful dispatches: **301**.
- Overall completed-dispatch rate: **134.4 per hour**.
- Median Dispatch & Next timing: approximately **7.8 seconds**.
- Median complete mission cycle: approximately **11.7 seconds**.
- Worker B transport attempts: **115**.
- Worker B transports confirmed cleared: **114**.
- Fatal controller errors: **0**.
- Manual retries: **0**.
- Recorded stalled transports: **0**.
- Recorded transport hard recoveries: **0**.
- A live prisoner-release terminal result was handled and the run continued for roughly another 33 minutes.

This is strong evidence that mission dispatch, serialized A/B transport ownership, prisoner-release continuation and recovery can remain fast and stable under sustained load.

## Memory result

- Reported JavaScript heap at export: approximately **2.12 GiB**.
- Recorded peak: approximately **2.17 GiB**.
- Scheduled runtime recycles: **55**.
- Managed runtime disposals: **268**.
- RAM protection remained active at the hard ceiling and recorded no release before export.

The visible controller caches were small compared with the heap. The export cannot identify the exact retaining object, but it strongly supports investigating detached iframe documents, observer/timer callbacks, event listeners and retained Window/Document/DOM references. A logical disposal count is not proof that a browser realm became unreachable.

A separate later run peaked around **1.14 GiB** and returned to roughly **222 MiB**, showing that substantial reclamation is possible and the problem is inconsistent rather than an unavoidable cost of fast dispatch.

## Telemetry limitation

Credit capture missed all 301 successful dispatches. This did not affect automation, but mission-value and value-per-hour figures were unusable.

## Supported conclusion

The next optimisation should preserve the hot mission path and improve physical cleanup at safe boundaries. The target is a repeatable memory sawtooth, not slower polling across every mission.

## Not supported by this evidence

The export does not prove which exact third-party or Nexus object retained each old realm. Heap readings are browser-provided and should be treated as trend evidence rather than a universal absolute measurement.
