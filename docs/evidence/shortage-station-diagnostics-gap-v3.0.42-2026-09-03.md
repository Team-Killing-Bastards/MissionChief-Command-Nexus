# Shortage station diagnostics gap — v3.0.42

## Source

Two owner-supplied Command Nexus `3.0.42` exports from 3 September 2026.

## Confirmed gap

The runs correctly retained requirement-level shortages such as EOD Response Vehicle, Coastguard Commander, Control Van, PRV/SRV and Armed Response trained personnel. However, the new resource/trained-personnel fail-closed paths did not retain the full matched candidate vehicle trail. `staffingFailures.stationSummary` remained limited to older staffing events, so the exports could not reliably name the station behind these newer shortages.

## v3.0.43 diagnostic correction

The canonical Unit Finder matcher is reused in diagnostic mode to include disabled/busy candidates without changing normal selection. Failure snapshots retain exact candidate vehicle identity, station/building evidence where available, selected/disabled/available state, training-verification status and rejection reason. Controller exports aggregate these into station and vehicle issue summaries.

No selection, dispatch, Worker A/B, transport, trained-personnel qualification or shortage policy is changed by this release.

## Live acceptance

Run Auto Mode normally and export diagnostics after several skips or a trained-personnel stop. `run.failureDiagnostics.stationIssueSummary`, `vehicleIssueSummary`, and each unresolved mission's candidate evidence should identify the stations/vehicles repeatedly unavailable or rejected. If a station remains unknown, the export must still provide the exact vehicle ID/name and rejection reason for follow-up.
