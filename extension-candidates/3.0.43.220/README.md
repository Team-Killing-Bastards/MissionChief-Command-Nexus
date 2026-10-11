# Nexus 3.0.43.220 Auto Mode throughput

Built on .219. The supplied visible-tab run with Toolkit enabled recorded seven dispatches in 344 seconds (about 73/hour), 38 extra vehicle pages and approximately 147 seconds in the vehicle loader. Several lists reached 3,600-3,900 rows. No memory-pressure stops or suspended-timer recoveries occurred. The export does not attribute CPU work to Toolkit or prove a leak.

## Changes

- Fresh patient missions can stop loading after proving enough mission units, ambulances and configured support. Ambulance limits are retained; officer and mass-casualty thresholds use uncapped patient demand.
- Complex patient alerts, personnel requirements, attended missions and uncertain coverage retain full loading. The existing partial-selection fallback and final dispatch verification remain active.
- A pending dispatch claim prevents the supervisor and Auto loop from repeating selection. No claim is cleared or renewed; native navigation, transport and existing controller recovery retain ownership of the handoff.
- Exports identify why selective loading required the full list.

## Installation and live check

Stop Auto Mode. Extract the ZIP into a fresh folder, disable the previous Nexus copy and use Load unpacked for this folder. Refresh every MissionChief tab and verify 3.0.43.220.

Run for 15-20 minutes with the same settings, visible tab and Toolkit enabled, then export Auto Mode diagnostics. Compare dispatches/hour, partial/full loads, vehicle pages, loading time and shortages. Keep a similar mission mix: large incidents and unavailable units can dominate a short sample. The 150/hour target means 24 seconds per dispatched mission, not incident completion time.

## Validation limits

The throughput fixture exercises production probe, loader, claim, supervisor and loop functions with a simulated fleet and clock. It reproduces .219's unnecessary full loading and post-dispatch restart. Checks include changing patients, caps with uncapped support thresholds, missing support, live alerts, rule loading/overrides, personnel needs, duplicate IDs, disappearing units, ownership, manual stops and pending claims. Existing patient cleanup, startup, CRV, Any vehicle, queue, memory and Alliance regressions are retained.

Fixture page reductions are not a live-game speed measurement. The 150/hour target and installed behavior with Toolkit require the next live run. No permissions, extension identity, polling rates or store publishing files changed. Local test candidate; no store submission.
