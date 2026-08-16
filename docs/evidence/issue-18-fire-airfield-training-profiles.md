# Issue #18 Fire/Airfield Personnel Assignment evidence

## Scope

This record fixes the MissionChief UK vehicle, staffing and training-key contracts used by the completed Fire/Airfield Personnel Assignment profiles. It contains no account, alliance, station, vehicle or personnel identifiers.

Evidence was checked on 16 August 2026 against:

- MissionChief's public [training-to-vehicle help article](https://xyrality.helpshift.com/hc/en/23-mission-chief/faq/1603-which-training-is-useful-for-what/?p=webWe).
- The current MissionChief UK vehicle metadata in [LSSM V.4 commit `398ffec`](https://github.com/LSS-Manager/LSSM-V.4/blob/398ffecad11b6f6560e35c8015cec241cf50beca/src/i18n/en_GB/vehicles.ts).
- The matching MissionChief UK academy keys in [LSSM V.4 commit `398ffec`](https://github.com/LSS-Manager/LSSM-V.4/blob/398ffecad11b6f6560e35c8015cec241cf50beca/src/i18n/en_GB/schoolings.ts).
- LSSM's pinned [MissionChief vehicle API type](https://github.com/LSS-Manager/LSSM-V.4/blob/398ffecad11b6f6560e35c8015cec241cf50beca/typings/Vehicle.d.ts) and [building-vehicle endpoint worker](https://github.com/LSS-Manager/LSSM-V.4/blob/398ffecad11b6f6560e35c8015cec241cf50beca/src/workers/stores/api/vehicles.worker.ts), which expose `tractive_vehicle_id`, `tractive_random` and `/api/buildings/{buildingId}/vehicles`.
- A privacy-safe live console export supplied on 16 August 2026. The export deliberately omitted identities and is not committed.

## Exact profile contracts

| Profile | Training key | Exact vehicle type | MissionChief vehicle | Target | Eligible building types |
|---|---|---:|---|---:|---|
| Aircraft Rescue and Firefighting | `arff` | `75` | Major Foam Tender | 4 / 4 | `0`, `18` |
| Aircraft Rescue and Firefighting | `arff` | `76` | RIV | 4 / 4 | `0`, `18` |
| Aircraft Rescue and Firefighting | `arff` | `77` | Airfield Firefighting Command Vehicle | 2 / 2 | `0`, `18` |
| Aircraft Rescue and Firefighting | `arff` | `78` | Rescue Stairs | 2 / 2 | `0`, `18` |
| Co-Responder | `coresponder` | `18` | Co-Responder Vehicle | 1 / 1 | `0`, `18` |
| Fire Drone Operator | `drone` | `90` | Drone Vehicle (Fire Station) | 2 / 2 | `0`, `18` |
| High Volume Pump | `pump` | `40` + companion `50` | Prime Mover linked to HVP pod | 2 / 2 on Prime Mover | `0`, `18` |
| Fire Lifeguard | `gw_wasserrettung` | `73` + companion `74` | Light 4x4 linked to Boat Trailer | 4 / 4 on Light 4x4 | `0`, `18` |

Existing live Fire contracts remain unchanged: type `39` OSU uses six `gw_gefahrgut`, type `15` ICCU uses three `elw2`, and type `107` RRU uses two `railway_fire` personnel.

## Trailer and pod authority

The HVP pod and Boat Trailer do not carry personnel. Before either profile can select a towing vehicle, Command Nexus reads MissionChief's same-origin `/api/buildings/{buildingId}/vehicles` response and resolves the companion record's `tractive_vehicle_id`.

- An explicit exact link is authoritative.
- A single companion and single eligible tractor at the station is a deterministic one-to-one fallback.
- Multiple unlinked possibilities are ambiguous and fail closed with no assignment.
- No neighbouring vehicle type can substitute for the mapped tractor or companion.

## Assignment safety contract

- Every completed Fire/Airfield profile and `Run all Fire / Airfield profiles` is live.
- Preview and Live use the same exact rules and seat targets.
- Existing occupants are preserved; only available personnel holding every required course are considered.
- Live mode re-reads the exact assignment page before changing an underfilled vehicle and rejects an unexpected `vehicle_type_id`.
- Each submitted assignment is verified, followed by a fresh station-wide verification read.
- Training shortfall and assignment shortfall remain separate report fields.
