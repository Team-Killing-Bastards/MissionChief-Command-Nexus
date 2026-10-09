# Nexus 3.0.43.215 Zero-patient transport cleanup

Fixes .214 skipping UTI, Multiple Seizures and Smoke Inhalation when an explicit
zero total patient count accompanies a stale Transport is needed warning. The
hidden native prison error placeholder no longer blocks a verified cleanup.

Auto Mode verifies personal ownership and fresh zero-patient evidence, returns
the mission's own assigned units through their native cancellation links, checks
between requests and afterwards, then opens the next mission. Real patients,
patient cards (even hidden), actual transport links and other requirements or
visible warnings still block release. The surplus-ambulance toggle is independent.
After the last unit, the game can remove its patient counter. A final empty-unit
read permits advancing but never permits another cancellation.

Live native Cancel All Units testing returned both ambulances on Multiple
Seizures #263665884. MissionChief still kept that mission and its warning open;
this fix does not promise server-side mission closure. The installed .215 live
Auto Mode path remains to be tested. All automated test game traffic is intercepted.

Stop Auto Mode, extract the ZIP into a fresh folder, disable the old Nexus copy,
load the new folder with Load unpacked, and refresh every MissionChief tab.
Settings, profiles and extension identity are preserved. No store submission.
