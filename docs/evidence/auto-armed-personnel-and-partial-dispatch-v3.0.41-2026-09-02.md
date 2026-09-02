# Auto Armed Response false shortage and partial dispatch — v3.0.41

## Source

Owner report and MissionChief requirement-table screenshot supplied on 2 September 2026.

## Observed behaviour

The representative Police mission required six Police Cars, one Dog Support Unit and six Armed Response Personnel in armed vehicles. Auto Mode reported insufficient Armed Response personnel, while an immediate manual Unit Finder run found the required units.

The owner also reported a wider increase in missions being only partly dispatched and then requiring a manual top-up.

## Code finding

The shared trained-personnel path performed a single live assignment-page pass before failing closed. A transient failed or incomplete assignment-page response therefore required another Unit Finder run to retry the unverified vehicles.

Separately, the Auto Mode final gate deliberately dispatched any non-zero partial selection when `vehicleLoadState.ready` was false, using the partial dispatch as a way to move past the mission. That directly explains missions being sent short and later requesting top-ups.

## Correction

Command Nexus 3.0.42 / Mission Finder 10.6.179 gives trained-personnel selection one bounded final refresh and selector pass. It also removes partial skip dispatch entirely: incomplete missions stop without sending any checked vehicles, allowing the controller to quarantine and retry them normally.

The established Armed Response safety rule is unchanged: only exact type-25 Armed Traffic Cars count, and counted occupants must hold both Roads Policing and Firearms qualifications.

## Live acceptance

1. Run the representative six-person Armed Response mission in Auto Mode and confirm it completes without needing a second manual Unit Finder click when sufficient eligible staff are genuinely available.
2. Exercise an intentionally under-covered mission and confirm Auto Mode sends zero vehicles, records a recoverable shortage and advances through the normal controller skip path.
3. Confirm genuine trained-personnel shortages still block Dispatch.
