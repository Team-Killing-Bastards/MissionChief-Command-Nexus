# Issue #295 Police Unit Naming ID evidence

## Capture record

| Item | Evidence |
|---|---|
| Capture date | 13 August 2026 |
| Game | MissionChief UK |
| Source | Signed-in Police vehicle purchase page DOM |
| Route shape | `/buildings/<redacted>/vehicles/new` |
| Extraction point | Vehicle purchase link path segment containing the native `vehicle_type_id` |

The capture read each credits purchase link using the native route shape
`/buildings/<redacted>/vehicle/<redacted>/<vehicle_type_id>/credits` and paired
that value with the canonical visible purchase label. Account, building and
vehicle instance identifiers were excluded.

## Verified mappings

| Native `vehicle_type_id` | Canonical visible label | Owner-approved naming code |
|---:|---|---|
| `13` | Armed Response Vehicle | `ARV` |
| `19` | Joint Response Unit | `JRU` |
| `24` | Traffic Car | `TC` |
| `52` | Firearms Personnel Carrier | `FPC` |

The four mappings were captured together from the current purchase page. The
console result contained only the type IDs, visible vehicle descriptions and
public purchase information; it contained no account-specific data.
