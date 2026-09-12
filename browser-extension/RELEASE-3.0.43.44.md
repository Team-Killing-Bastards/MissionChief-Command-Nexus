# Local 3.0.43.44: permanent vehicle requirement defaults

The five rules in the user's 3.0.43.43 export are now part of the installed
runtime, so fresh installations do not need the export imported again:

| Requirement | Vehicle | Type ID |
| --- | --- | --- |
| Coastguard Commander(s) | Coastguard Commander | 60 |
| Drone(s) | Drone Vehicle SAR HQ | 89 |
| Hovercraft(s) (Trailer) | Hovercraft Trailer | 71 |
| Any vehicle(s) | Ambulance | 5 |
| Car(s) to tow | Flatbed Recovery Vehicle | 105 |

Matching handles case, whitespace, Required prefixes and leading quantities.
Explicit wording aliases avoid affecting Police Drones, helicopters, HGVs or
unrelated training requirements. Type 105 keeps the exact ID supplied in the
export; its catalogue label now agrees with the existing flatbed dispatcher.
Existing mission quantities and towing capacity calculations are unchanged.

Defaults are separate from saved custom rules. An enabled exact custom rule
still takes priority; disabling it falls back to the built-in behavior. No
default seeding or version-dependent storage reset is introduced. The existing
storage key, cross-context lock and selection-time rule snapshot remain.
Updating the same Store installation retains custom rules. A different
unpacked folder, browser profile, or a fresh reinstall has separate extension
storage; the five defaults work there without importing.

Validation includes permanent-default and exact-selector tests, explicit
wording exclusions, override/disabled-state preservation, stale cache and
selection locking, worker update/restart persistence, the actual extension's
rule editor and bridge, plus existing hardening and regression checks. Browser
fixtures use mocked game responses. This change is local; .43 already submitted
to the stores is not modified or resubmitted.
