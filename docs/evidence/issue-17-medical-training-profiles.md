# Issue #17 medical Personnel Assignment evidence

## Scope

This record fixes the MissionChief UK vehicle, staffing and training-key contracts used by the remaining live Medical profiles in Personnel Assignment. It contains no account, alliance, station, vehicle or personnel identifiers.

Evidence was checked on 16 August 2026 against:

- MissionChief's public [training-to-vehicle help article](https://xyrality.helpshift.com/hc/en/23-mission-chief/faq/1603-which-training-is-useful-for-what/?p=webWe).
- The current MissionChief UK vehicle metadata in [LSSM V.4 commit `398ffec`](https://github.com/LSS-Manager/LSSM-V.4/blob/398ffecad11b6f6560e35c8015cec241cf50beca/src/i18n/en_GB/vehicles.ts).
- The matching MissionChief UK academy keys in [LSSM V.4 commit `398ffec`](https://github.com/LSS-Manager/LSSM-V.4/blob/398ffecad11b6f6560e35c8015cec241cf50beca/src/i18n/en_GB/schoolings.ts).

The linked LSSM snapshot was current on 15 August 2026 and records each vehicle's native `vehicle_type_id`, personnel maximum and required academy key.

## Exact profile contracts

| Profile | Training key | Exact vehicle type | MissionChief vehicle | Target | Eligible building types |
|---|---|---:|---|---:|---|
| Ambulance Officer | `ems_mobile_command` | `34` | Ambulance Officer | 1 / 1 | `2`, `20`, `22`, `25` |
| HART | `hazard_response_ems` | `27` | PRV | 2 / 2 | `25` |
| HART | `hazard_response_ems` | `28` | SRV | 2 / 2 | `25` |
| HART | `hazard_response_ems` | `30` | ATV Carrier | 2 / 2 | `25` |
| Tactical Command | `elw2_ems` | `31` | Ambulance Control Unit | 2 / 2 | `2`, `20`, `21`, `25` |
| SORT | `special_operation_response` | `32` | CBRN Vehicle | 2 / 2 | `2`, `20`, `21`, `25` |
| SORT | `special_operation_response` | `33` | Mass Casualty Equipment | 2 / 2 | `2`, `20`, `25` |
| Midwifery | `midwife` | `95` | Community Midwife | 2 / 2 | `2`, `20`, `21`, `22`, `32` |
| Specialist Paramedic | `paramedic_advanced` | `96` | Specialist Paramedic RRV | 2 / 2 | `2`, `20`, `21`, `22`, `32` |
| Critical Care batch tail | `critical_care` | `5` | Ambulance | 1 trained member | Existing Critical Care station scope |

Relevant building labels are type `2` Ambulance Station, `20` Small Ambulance Station, `21` Urgent Treatment Center, `22` Home Response Location, `25` HART Base and `32` GP Surgery. Individual specialist profiles scan only the building types that can house their mapped vehicles. The Medical batch scans the union of those types.

## ATV discrepancy resolution

The older MissionChief help article associates ATV Carrier with Tactical Command. The current vehicle metadata instead marks exact type `30` with `hazard_response_ems` for every staff seat, while exact type `31` Ambulance Control Unit carries `elw2_ems`. Command Nexus follows the newer per-vehicle data:

- ATV Carrier is HART.
- Ambulance Control Unit is Tactical Command.
- Neither profile substitutes the other vehicle.

This choice is guarded by the permanent issue-17 regression so the stale association cannot return silently.

## Assignment safety contract

- Preview and Live use the same exact rules and target quantities.
- Existing assignments are preserved; only available qualified personnel are considered.
- Live mode re-reads the exact assignment page before changing an underfilled vehicle and rejects an unexpected `vehicle_type_id`.
- Each submitted assignment is checked with a fresh vehicle page; the station receives one final fresh verification read.
- Training shortfall and assignment shortfall remain separate report fields.
- `Run all Medical profiles` reserves and processes specialist profiles before the exact type-5 Critical Care rule.

