# Nexus 3.0.43.222: shorter idle dispatch handoff

The .221 export recorded 29 dispatches over 10m54s, about 160/hour or 22.6 seconds each. With one new mission every 20 seconds, 180/hour only keeps pace. The target is below 20 seconds on average, preferably around 18 seconds / 200 per hour. Recorded dispatch throughput does not prove server acceptance, full mission coverage or completion.

Two aircraft missions reloaded and then waited for the generic two-minute watchdog to defer an existing dispatch claim. This candidate defers that narrow state after ten seconds of unchanged, proven inactivity in a later document. It uses the existing five-second sampling cadence and retry cooldown. The claim must predate the current document, and the current worker must still own that mission. Same-document claims, active selection, register startup, pending navigation, transport and uncertain evidence cannot take this shortcut. Missing proof keeps the existing watchdog.

The final dispatch latch, selection, coverage, transport and startup-readiness functions are unchanged. No Dispatch click is replayed, and no extra timer, network request or persistent write is introduced. Retained proof is copied into the controller realm as scalar data so it cannot retain a closed worker frame.

## Install and measure

Stop Auto Mode, extract the ZIP into a fresh folder, disable the previous Nexus copy and load the new extension folder unpacked. Refresh every MissionChief tab and confirm 3.0.43.222. Use normal settings and export after 20-30 minutes, including a normal recycle. Compare recorded dispatch rate, dispatch-claim deferrals and any errors. The export now includes idleRestoredClaimMs on a shortened deferral. A live rate above 180/hour has not yet been established for this candidate.

## Validation

271 production-function safety checks and 15 isolated Edge navigation checks reproduce the old delay and verify the shortened deferral, unchanged claim, owner/document boundaries, active-work exclusions, race checks and queue continuation. Existing checks passed: 58 startup readiness, 11 Edge startup, 156 throughput, 52 control startup, 53 diagnostics, 20 transport handoff, 118 patient-tail, 20 Any vehicle and 17 CRV checks. Queue priority, memory cleanup, unit reservations, Alliance Auto and upgrade checkpoint checks passed. Manifest references, permissions, fixed key and syntax passed. Update-notice lifecycle and desktop/mobile rendering passed and were visually inspected.

All browser fixtures intercept game traffic and do not touch signed-in game tabs. These results are local validation, not a live endurance or throughput claim. No browser-store submission. The supplied export was analysed locally; only a bounded numerical summary is included.
