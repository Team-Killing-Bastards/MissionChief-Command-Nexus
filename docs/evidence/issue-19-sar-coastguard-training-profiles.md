# Issue #19 SAR/Coastguard Personnel Assignment evidence

## Scope

This record fixes the MissionChief UK vehicle, staffing, training-key and companion-vehicle contracts used by the completed SAR, Mountain Rescue, Coastguard and Lifeboat Personnel Assignment profiles. It contains no account, alliance, station, vehicle or personnel identifiers.

Evidence was checked on 16 August 2026 against:

- MissionChief's public [training-to-vehicle help article](https://xyrality.helpshift.com/hc/en/23-mission-chief/faq/1603-which-training-is-useful-for-what/?p=webWe).
- The current MissionChief UK [vehicle](https://github.com/LSS-Manager/LSSM-V.4/blob/398ffecad11b6f6560e35c8015cec241cf50beca/src/i18n/en_GB/vehicles.ts), [academy](https://github.com/LSS-Manager/LSSM-V.4/blob/398ffecad11b6f6560e35c8015cec241cf50beca/src/i18n/en_GB/schoolings.ts) and [building](https://github.com/LSS-Manager/LSSM-V.4/blob/398ffecad11b6f6560e35c8015cec241cf50beca/src/i18n/en_GB/buildings.ts) metadata at pinned LSSM V.4 commit `398ffec`.
- The matching [Mission Helper requirement mapping](https://github.com/LSS-Manager/LSSM-V.4/blob/398ffecad11b6f6560e35c8015cec241cf50beca/src/modules/missionHelper/i18n/en_GB.json), including Search Advisor and SAR Commander vehicles.
- LSSM's pinned [MissionChief vehicle API type](https://github.com/LSS-Manager/LSSM-V.4/blob/398ffecad11b6f6560e35c8015cec241cf50beca/typings/Vehicle.d.ts) and [building-vehicle endpoint worker](https://github.com/LSS-Manager/LSSM-V.4/blob/398ffecad11b6f6560e35c8015cec241cf50beca/src/workers/stores/api/vehicles.worker.ts), which expose the native trailer/tractor relationship.
- A privacy-safe live console export supplied on 16 August 2026. The export deliberately omitted identities and is not committed.

## Exact profile contracts

| Profile | Training key | Exact vehicle type(s) | Target per vehicle | Eligible building types |
|---|---|---|---:|---|
| Cave Rescue | `mountain_cave_rescue` | `93`, `99` | 4 | `22`, `31`, `33` |
| Coastal Air Rescue | `coastal_rescue_pilot` | `64`, `65` | 4 | `30` |
| Coastal Command | `coastal_command` | `60` | 5 | `22`, `28` |
| Coastguard Search Advisor | `search_and_rescue` | `86` | 3 | `31` |
| Dog handling | `rescue_dogs` | `101`, `102` | 1 | `22`, `31`, `33` |
| SAR Drone | `drone` | `89` | 2 | `31` |
| Flood First Responder | `flood_equipment` | tractor `57`, `58`, `59`, `60`, `63` or `66` linked to trailer `61` | exact tractor capacity: 5, 5, 5, 5, 8 or 4 | `22`, `27`, `28` |
| Flood First Responder | `flood_equipment` | tractor `85`, `86`, `89` or `94` linked to trailer `88` | exact tractor capacity: 3, 3, 2 or 1 | `31` |
| Hovercraft Commander | `hover_boat_elw` | `72` linked to `71` | 3 | `27` |
| Jet Ski | `jetski` | `66` linked to `70` | 4 | `27` |
| Lifeboat Operations | `ocean_navigation` | `68`, `69` | 4, 7 | `27` |
| Lifeguard | `gw_wasserrettung` | `66` linked to `67` | 4 | `27` |
| Mud Rescue | `coastal_mud_rescue` | `58` | 5 | `28` |
| Rope Rescue | `gw_hoehenrettung` | `59` | 5 | `28` |
| Search Management | `search_and_rescue_command` | `85`, `100` | 3 | `31`, `33` |

Building type `22` is Home Response Location, `27` Lifeboat Station, `28` Coastguard Rescue Station, `30` Coastal Rescue Heliport, `31` Search and Rescue HQ, and `33` Mountain Rescue Station.

## Live-metadata decisions

- The supplied live export reports a 3-seat Hovercraft Transporter override. Command Nexus therefore uses three `hover_boat_elw` personnel rather than the older pinned one-seat default.
- The supplied live export reports four configured seats for both type `93` SAR 4x4 and type `99` Mountain Rescue 4x4. Cave Rescue fills those live seats without replacing existing occupants.
- ILB and ALB use their live configured 4-seat and 7-seat maxima. These values supersede older 3-seat and 5-seat defaults.

## Companion and overlap safety

Trailer profiles use MissionChief's same-origin `/api/buildings/{buildingId}/vehicles` data. The companion record's `tractive_vehicle_id` is authoritative; a unique one-companion/one-tractor station pair is the only permitted fallback. Ambiguous relationships fail closed.

`Run all SAR / Mountain Rescue profiles` builds one effective rule for each actual vehicle. If that vehicle has overlapping duties, every required training key is combined onto the same crew. For example, a Mud Rescue Unit linked to a Flood Rescue trailer receives personnel trained in both Mud Rescue and Flood First Response; the two rules never consume separate seats and block one another.

## Assignment safety contract

- Every listed individual profile and the SAR batch is live.
- Existing occupants are preserved and no unrelated tractor is selected.
- Preview and Live share the exact same resolved rules.
- Live mode checks the exact vehicle type before assignment, verifies each submitted change, then performs a fresh station-wide verification.
- Training shortfall and assignment shortfall remain separate report fields.
