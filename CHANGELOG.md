# Changelog

All notable changes to MissionChief Command Nexus are documented here.

The project uses Semantic Versioning for the unified userscript release line.

## [Unreleased]

### Added

- Current-state developer handoff for resuming source work.
- Evidence-driven roadmap, architecture, migration and testing documentation.
- Expanded repository integrity checks for required development and release files.

### Changed

- Replaced planning-era documentation with the actual merged v1.0.1 baseline.
- Rebuilt the repository README and Command Nexus hero presentation.
- Clarified the difference between implemented code and fully validated release readiness.

### Pending

- Complete live regression testing across both supported MissionChief UK domains.
- Complete migration evidence for each legacy installation state.
- Complete long-session lifecycle and stability evidence.
- Consolidate the two retained control surfaces into one coherent interface.
- Create the first formal tagged GitHub release after MartyBlyth approval.

## [1.0.9] - 2026-07-20

### Fixed

- Fixed urgent issue #57: Level 1 Public Order, Level 2 Public Order and Police Sergeant requirements are now matched independently instead of being collapsed into one mandatory combined profile bundle.
- Sergeant-only, Level 1-only, Level 2-only and Police Medic-only personnel now qualify for missions requesting their exact training profile.
- Multi-trained personnel continue to qualify for every requested profile they actually hold without unrelated training becoming a prerequisite.
- Preserved exact type-8 IRV verification, two trained personnel per selected IRV, capacity controls and genuine missing-training shortfall warnings across Unit Finder, Mission Update and Auto Mode.

### Changed

- Mission Finder increased from `V10.6.74` to `V10.6.75`.

## [1.0.8] - 2026-07-20

### Fixed

- Fixed Unit Naming long runs retaining the full original station document while navigating through every vehicle edit page.
- Replaced Unit Naming iframe navigation history entries instead of continually appending edit-page history.
- Closed the modal associated with the active Unit Naming iframe rather than the first close control in the document.
- Cleared hidden or reused station iframes after each station so old station and vehicle documents can be garbage collected.
- Released edit-document and form-control references before each post-save delay and guaranteed iframe cleanup after stop, error or page exit.

### Changed

- Unit Naming increased from `3.3.3` to `3.3.4`; naming rules, vehicle order, numbering and save behaviour are unchanged.

## [1.0.7] - 2026-07-20

### Fixed

- Fixed Mission Update treating bounded unresolved requirement ranges such as `0-3` and `0-1` as zero by reading only the first number.
- Mission Update now uses the upper bound of an explicit range, allowing Fire Engine, ICCU/ACU, Police Car, PRV and SRV shortages from the live panel to reach the normal selector.
- Kept the existing safety behaviour for a completely unknown naked `?`, so unsupported unresolved rows still cannot resend an entire original mission load.
- Applied the corrected live-range interpretation to manual Mission Update and the shared Auto Mode update path.

### Changed

- Mission Finder baseline increased from `V10.6.73` to `V10.6.74`.

## [1.0.6] - 2026-07-20

### Added

- Added exact Armed Response mission matching for `Required Armed Response Personnel (In Armed Vehicles)`, using type-25 Armed Traffic Cars with two personnel who each hold both Roads Policing and Firearms.
- Expanded the one-click Personnel Register builder to every station type and every discovered vehicle, reading each vehicle's own assignment page before recording trained personnel.
- Added strict Seagoing Vessel matching for ALB/ABL and All-weather Lifeboat display variants.

### Changed

- Changed the Medical Critical Care assignment target from two trained personnel to one trained person per normal Ambulance, including Preview, Live, target planning, shortfall and reporting calculations.
- Police Officer mission-upgrade rows now convert at two officers per normal Police IRV before Unit Finder, Mission Update or Auto Mode selects vehicles.
- Mission Finder baseline increased from `V10.6.72` to `V10.6.73`; Personnel Assignment increased from `1.2.8` to `1.2.9`.

### Fixed

- Fixed issue #42 by stopping the Personnel Assignment Tool from planning or assigning a second unnecessary Critical Care-trained person to each Ambulance.
- Fixed issue #30 by restoring Armed Response Personnel selection through dual-trained Armed Traffic Cars without excluding officers who also hold Firearms training.
- Fixed live upgrade rows such as `Police Officers x8` selecting eight IRVs instead of four.
- Fixed Seagoing Vessel upgrade rows falling through generic text matching instead of selecting an exact ALB/ABL vehicle.
- Fixed the register builder copying a single vehicle-page snapshot across a station instead of recording exact vehicle assignments.

## [1.0.5] - 2026-07-20

### Added

- Added a one-click **Build Personnel Register** action that scans Police, Police Aviation and EOD stations without changing staffing assignments or requiring profile, mode, action or start-point setup.
- Added exact trained-IRV mission selection for **Police Medic** and **Railway Police Officer**, using two correctly trained personnel per IRV.

### Changed

- Ordinary Police Car attendance now accepts a freshly verified exact IRV with zero protected specialist qualifications even when no personnel are permanently bound to that vehicle.
- Mission Finder baseline increased from `V10.6.71` to `V10.6.72`; Personnel Assignment increased from `1.2.7` to `1.2.8`.

### Fixed

- Fixed ordinary Police Cars being rejected by Unit Finder, Mission Update and Auto Mode solely because their assignment page reported zero permanent bindings.
- Fixed issue #16 by mapping Police Medic requirement rows and Missing Personnel text to exact IRVs containing two `police_medic`-trained personnel.
- Added Railway Police Officer parsing for both table and alert layouts, selecting exact type-8 IRVs containing two `railway_police`-trained personnel.
- Added an authoritative type-30 ATV Carrier matcher, including `ATV Carrier`, `ATV` and `ATC Carrier` display aliases without matching Police Armed Traffic Cars.
- Prevented incomplete or structurally invalid assignment-page scans from overwriting or authorising specialist-training decisions.

## [1.0.4] - 2026-07-20

### Changed

- Auto Mode now activates every visible MissionChief `missing_vehicles_load` control before Unit Finder begins selecting vehicles.
- Increased the unified userscript version from `1.0.3` to `1.0.4` and the Mission Finder baseline from `V10.6.70` to `V10.6.71`.

### Fixed

- Fixed Auto Mode waiting on the `Vehicle display limited! Load more vehicles!` bar without clicking it.
- Added sequential `offset_page` loading so every additional vehicle page is requested, not only the first page.
- Added per-page progress checks using the vehicle ID and row-count signature, control replacement and loading-indicator state.
- Unit selection now starts only after the final load control has disappeared and the complete vehicle list remains stable.
- Loading fails closed when the mission changes, the control cannot be clicked, no progress occurs or the bounded timeout is reached.

## [1.0.3] - 2026-07-20

### Changed

- Normal Police Car and Police Officer attendance now uses only exact-ID IRVs live-verified with assigned staff and no protected specialist Police training.
- Auto Mode and the manual Unit Finder/Mission Update paths now wait for a complete, non-zero, ID-stable vehicle list after loading finishes before selecting units.
- Increased the unified userscript version from `1.0.2` to `1.0.3`.

### Fixed

- Prevented Level 1, Level 2, Sergeant, Medic, Inspector and other specialist-trained Police IRVs from satisfying ordinary Police attendance requirements.
- Prevented an ordinary Police group-button fallback from bypassing exact vehicle training protection.
- Prevented Auto Mode from continuing to selection or dispatch when the vehicle list times out, remains empty or is still changing.

## [1.0.2] - 2026-07-19

### Changed

- Adds verified GitHub, Greasy Fork and Discord deployment notifications. This release tests the complete automated publication and validation process without changing MissionChief runtime behaviour.
- Increased the unified userscript version from `1.0.1` to `1.0.2`.

## [1.0.1] - 2026-07-19

### Changed

- Increased the unified userscript version from `1.0.0` to `1.0.1` without functional changes.
- Confirmed the canonical `main`-branch source synchronization path used for external distribution.

## [1.0.0] - 2026-07-19

### Added

- First canonical MissionChief Command Nexus userscript.
- One standardized userscript metadata block naming MartyBlyth as author.
- Mission Finder `V10.6.69` baseline.
- Unit, Station & Personnel Tools `V4.2.8` baseline.
- One combined installation guard with retained module startup isolation.
- Unit and station naming workflows.
- Personnel assignment, verification and reporting workflows.
- Shared vehicle-training registry.
- Mission requirement, patient and specialist-resource handling.
- Qualification-aware vehicle selection.
- Unit Finder, Mission Update, dispatch and Auto Mode workflows.
- Queue continuation and transport handling.
- JavaScript, metadata, file-size and version-increase validation.
- Tag-driven GitHub Release packaging with a userscript asset and SHA-256 checksum.
- Greasy Fork synchronization, rollback and troubleshooting guidance.
- Contribution, support, security and community policies.

## Release format

Future entries use:

```text
## [x.y.z] - YYYY-MM-DD
### Added
### Changed
### Fixed
### Removed
### Security
```

Release notes should describe user-visible behaviour, migration impact, tested environments and known limitations rather than commit history alone.
