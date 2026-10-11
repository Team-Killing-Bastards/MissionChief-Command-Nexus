# Nexus 3.0.43.189 — Lifeguard vehicles

Based on 3.0.43.176, retaining the pending IndexedDB cache memory fix.

Verified against the live UK vehicle market and building selector on 24 September 2026:
- Building 37: Lifeguard Station.
- Vehicle 118: Lifeguard Quadbike, maximum crew 2, Lifeguard Training.
- Vehicle 119: Lifeguard 4x4, maximum crew 4, Lifeguard Training.
- Existing trailer types 67 and 70 are also available in Lifeguard Station profiles.

Updated requirement catalogue and exact-name matching, Coastguard unit filters,
vehicle overview labels, main/station/dispatch-centre naming, station crew data,
building and staging profiles, personnel service rules and schooling filters.
Lifeguard naming codes are LGQ and LG4x4. Lifeguard stations use the Coastguard
station category, with suffix LG.

Personnel Lifeguard profile fills the new vehicles directly. Jet Ski profile
requires an actual linked type-70 trailer and both Lifeguard/Jet Ski training for
the new towing vehicles. Quadbikes target two staff and 4x4s four. Existing
trailer relationships and old type-66 rules remain intact.

Local automated validation and a rendered profile editor check were completed.
No live purchases, renames, staffing changes or dispatches were performed.

Install: stop Auto, extract this ZIP into its own folder, load that folder as
the unpacked extension, then close all MissionChief tabs and reopen the game.
Confirm 3.0.43.189 in Nexus. Closing old tabs also releases old extension contexts.
