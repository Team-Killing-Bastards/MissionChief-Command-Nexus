# Personnel register & crew

## 1.2.0 — explicit whole cloud register replacement

Personnel Register now reviews and confirms replacing the entire online vehicle register from the current PC. Full details and compatibility requirements are in [3.0.43.265](../extension-changelog.md#v3-0-43-265-replace-cloud-register). The scan, qualifications and crew-evidence rules retain .264 behaviour.

## 1.1.5 — 10 November 2026

The manual register builder uses changed-record commits and a start-of-scan fleet precheck. Buildings without vehicles or saved records can be skipped, while saved empty stations retain native verification before local pruning. Full verification and quick-refresh authority are unchanged. The view shows elapsed time and read count, updates progress within stations, and retains up to 30,000 loaded records. Request limits, backoff, pause/stop, failed-save retention and newer-record protection remain in place.

## 1.1.4 — 8 November 2026

Small register merges read only their affected database records, then update the in-memory cache after transaction commit. Newer assignments, deletion markers, player isolation and cross-tab reloads remain protected. Large merges, full replacement, migration and cloud reconciliation retain their existing paths.

## 1.1.3 — 1 November 2026

The register looks up all 42 known course names in its own runtime. Fire qualifications such as HazMat Unit, Level 1 Incident Commander Training and Railway Fire keep their English names even when a separate label script is unavailable. During verification the register shows the vehicle’s callsign and readable vehicle type together. Its display table covers all 119 types in the packaged UK catalogue.

## 1.1.2 — 1 November 2026

Extension .253 fixes the empty qualification overview after a successful register refresh. The register loads its course names with its own screen, so it can display existing verified records whenever the station-page personnel reader is unavailable. If the summary encounters another error, the qualification section shows the reason.

## 1.1.1 — 1 November 2026

The register screen includes a compact **Registered crew by qualification** overview. It groups verified, saved crew assignments by course for the selected dispatch centre, unassigned stations or all centres. A crew member qualified in both HART and Critical Care counts once in each. The overview identifies incomplete vehicle records awaiting verification.

## 1.1.0 — 1 November 2026

Open **Nexus Tools → Personnel Register**, beside Renamer, to build the first register, refresh changed records or verify every vehicle in a selected area. The same screen shows saved vehicle count, last update, current station, progress and results. Pause, resume, stop, backup export and import are available there. Switching tabs keeps an active run and its progress available when you return.

The builder reads the current building inventory for a single dispatch centre, unassigned buildings and all centres. Exact assignment reads, qualification records and the existing player database are shared with the previous builder. Renamer’s Personnel controls continue to handle crew assignment.

## 1.0.0 — 31 October 2026

Initial independent version baseline, carried forward from extension 3.0.43.240. This does not claim the feature is newly introduced.

Source: `nexus-personnel-reader.js`, `nexus-personnel-store.js`, `nexus-assign-crew.js`, `nexus-crew-register.js`
