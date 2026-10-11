# Nexus 3.0.43.219 Background control startup

Built on .218. Opening a mission centres and reveals its Nexus panel immediately, so the Auto Mode controller no longer waits for two animation callbacks that may pause in an inactive tab. Saved placement, existing ownership, disabled-control and duplicate-dispatch safeguards remain in place.

## Install and check

1. Stop Auto Mode. Extract the ZIP into a fresh folder, disable the previous Nexus copy and load this folder using Load unpacked. Refresh every MissionChief tab.
2. Start Auto Mode, switch to a different browser tab, and check whether its mission counter progresses when you return.
3. If it still hangs, enable Nexus Tools → Settings → Diagnostics → Diagnostic capture and Save. Reproduce the hang, return and export diagnostics before Retry or refresh. Turn capture off and Save afterwards.

## Verification and limits

The held-animation test reproduces the .218 failure to detect the hidden Auto Mode button and verifies that .219 exposes the real connected control without animation or timers. It also checks normal geometry, saved centre coordinates, detached panels and rejection of disabled, hidden and missing controls. Document visibility in that fixture is simulated. It is not a live-game endurance test or proof of the reporting user's exact cause.

Edge can still slow background timers or put inactive tabs to sleep. Keeping MissionChief under Edge Settings → System and performance → Always keep these sites active prevents sleeping tabs for that site. It does not establish a guarantee of foreground-speed timers. The separate .217 duplicate-dispatch queue stall is unchanged by this startup fix.

Optional diagnostics remains off by default, bounded at 200 local records and included in Auto Mode exports when enabled. No new polling, timers, permissions or browser-setting changes were added. No store submission.
