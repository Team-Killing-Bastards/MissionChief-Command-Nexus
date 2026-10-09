# Nexus 3.0.43.213 Patient mission recovery

Based on .212. Keeps the Any vehicle ambulance fix and building upgrades.

The supplied .212 export's UTI, Multiple Seizures and secondary Smoke Inhalation
skips explicitly retain Transport is needed, so withdrawing ambulances from
those states would be incorrect. These missions now avoid loading the full
vehicle list, use a distinct transport-only state and hand a live radio request
to the existing Worker B path. Without a live request, the controller rotates
the mission for one advance instead of treating it as a 20-advance shortage.

The separate cleanup handles only those named patient-only missions when
confirmed personal ownership and fresh native responses prove zero total
patients and no transport, alerts or requirements. It releases native assigned
vehicle links, verifies between and after requests, and advances without a
dispatch count. Unknown evidence, changed missions, new patients, unusable
links, failed requests or uncertain results prevent further cancellation.
Exact-route 404 is recorded as no longer available and allows advancement
without another release. This is independent of the surplus-ambulance toggle.

41 intercepted Edge/VM checks cover the reported cases and guarded cleanup.
No live game cancellation, transport or dispatch was performed. Confirm the
next real run after installation; source and fixture results do not prove the
game will close the mission or accept a hospital transport.

Stop Auto Mode, extract the local ZIP to a fresh folder, load that folder using
Developer mode > Load unpacked, disable the old Nexus copy, then refresh every
open MissionChief tab. Existing settings, profiles and Discord setup remain.
