# Nexus 3.0.43.214 Immediate transport stop correction

Fixes the .213 regression reported on Multiple Seizures: the patient-tail check
stopped the worker before the controller observed its running button, so startup
retried twice and reported V2 Auto Mode did not confirm that it started.

The controller now accepts this specific early handoff only from the current
worker document and mission, with a fresh document signal and matching automatic
stop record created after the current start attempt. It uses the existing
guarded recovery/Worker B path before attempting another start click. Stale,
manual, unrelated and mismatched records cannot bypass startup confirmation.
The ordinary two-attempt startup limit is retained for genuine unknown failures.

Retains .213 verified zero-patient cleanup and short transport-only recheck,
.212 Any vehicle ambulance coverage, and previous building upgrades. No new
permissions, extension identity, background scans or Discord setup.

20 controller tests reproduce .213's failure and verify the actual recovery
path, including a patient-context handoff and no-radio-request deferral. The
41 intercepted Edge patient-tail checks also exercise the document signal.
No live game dispatch, transport or cancellation was performed.

Stop Auto Mode, extract the .214 ZIP into a fresh folder, disable the .213 copy,
load this folder with Load unpacked, and refresh every open MissionChief tab.
Existing settings and profiles remain. Confirm the next live run after install.
