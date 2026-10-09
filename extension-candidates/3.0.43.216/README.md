# Nexus 3.0.43.216 Native Cancel All patient cleanup

UTI, Multiple Seizures and Smoke Inhalation with a freshly verified total of zero
patients now use MissionChief's native Cancel All Units action once. This includes
missions with no assigned units: .215 advanced without sending that action.

Own mission and execution ownership, zero total patients, no patient cards, actual
transport links, other requirements or unrelated visible warnings are required.
Unknown/foreign assigned units prevent cancellation. A failed or uncertain native
action stops without an automatic retry. Real transport requests keep their units
and use the existing Worker B handoff. The surplus-ambulance setting is independent.

The result is re-read after cancellation. Units returned and mission no longer
available are reported separately; an HTTP success alone does not prove closure.
Diagnostics show ownership blocks, native action submission and verified results.

86 isolated patient-tail checks passed with every game request intercepted. The
installed .216 live Auto Mode path has not yet been verified. No store submission.

Stop Auto Mode, extract the ZIP into a fresh folder, disable the old Nexus copy,
load the new folder with Load unpacked, and refresh every MissionChief tab.
Settings, profiles, permissions and extension identity are preserved.
