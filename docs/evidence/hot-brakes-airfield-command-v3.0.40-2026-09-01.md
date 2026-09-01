# Hot Brakes standalone Airfield command mapping failure — v3.0.40

## Source

User-supplied Command Nexus `3.0.40` diagnostic exported on 1 September 2026 plus the MissionChief **Hot Brakes - Code D** requirement table screenshot.

## Confirmed evidence

Mission `259758977` exposed the standalone requirement `Airfield Firefighting Command Vehicles` with a required count of one. The diagnostic retained the same text as its `mappedName`, selected zero and recorded a shortfall of one. This proves the plural standalone wording missed the existing singular cross-reference rather than proving the account owned no valid vehicle.

The same mission definition also contains `Fire Officers or Airfield Firefighting Command Vehicles`. That combined alternative already maps to `Fire Officer` and must remain separate from the explicit command-vehicle requirement.

A later Hot Brakes mission stopped for `Police Inspector Trained Police IRV: 1 trained personnel short`. That is an independent fail-closed personnel issue and is not resolved by the command-vehicle alias.

## Correction

Command Nexus `3.0.41` / Mission Finder `10.6.178` maps both standalone singular and plural Airfield Firefighting Command Vehicle requirements to `Airfield FF Command Vehicle`, while preserving the Fire Officer alternative unchanged.

## Live acceptance

Open or process Hot Brakes - Code D and verify that the standalone command-vehicle row selects one eligible Airfield FF Command Vehicle. A genuine Police Inspector shortage may still block Dispatch independently.
