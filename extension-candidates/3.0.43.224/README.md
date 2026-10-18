# Nexus 3.0.43.224: police alternative order

Based on the tested .223 package at commit `9fcea98fcc180a68de5459cc45d852e611023052`.

For the combined “Police Cars or Armed Response Vehicles (ARVs)” vehicle requirement, use ATC (25), then ARV (13), then Police Car (8). Prefer the earliest arrival within each type, and combine types only until the required number is covered. Selection, fallback buttons and counters use the same exact-ID pool, including when a saved rule previously selected only ATC for this phrase.

Other saved rules and separate armed-personnel requirements are unchanged. Staffing quarantine, unavailable vehicles, current-mission ownership, rule readiness, live requirement satisfaction and duplicate selection/dispatch guards remain in place. No extra polling, storage or network work is added.

`check-police-alternatives.mjs` executes the production functions for preferred order, mixed fleets, no ATCs, police-only availability, shortages, exact IDs, disabled/quarantined vehicles, existing selections, saved mappings, alternate entry paths and safety guards. It also verifies unchanged trained-personnel coverage and dispatch functions against .223. Local validation does not establish live-game fulfilment. No Chrome or Edge submission is made by preparing this candidate.
