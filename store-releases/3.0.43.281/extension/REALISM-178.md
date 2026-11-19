# Nexus 3.0.43.189 — Realism build setup

Based on .177, including Lifeguard support and the .176 memory fix.

The Realism Map Build menu now supports:
- Uppercase station names, including the preview and submitted name.
- Desired personnel target; blank keeps the game default.
- Station service status: on or off.
- Extension tick boxes, using credits only.
- The same setup choices across a Multi Build batch.

Setup begins only after the station is verified as newly created. Existing
matching stations are left untouched. Personnel and service are read back
after saving. Each selected extension is checked against the new station's
current controls, purchased once, then checked for construction or built state.
Normal construction duration applies; extensions are not instantly completed.
Unmet requirements or uncertain results are reported as setup incomplete,
separately from successful station creation. There is no background retry queue.

Extension choices are read from an existing station of the same type. If the
account has no example station, extension choices cannot be listed before the
first build. A new station's current availability determines whether purchase
can start. Prices absent from the example are marked as checked at the new station.

Validation: existing regression suite, mocked native edit/service/extension
workflow, and rendered build menu with Multi Build setting preservation.
Live controls were inspected read-only; no real buildings or extensions were bought.

Install: stop Auto, extract and load the new folder, close all MissionChief tabs
and reopen the game. Confirm version 3.0.43.189.
