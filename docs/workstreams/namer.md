# Namer

## 1.3.4 — 15 November 2026

Release .277 shares the Renamer vehicle type map, icons, codes, base-name cleanup and caption formatter through `nexus-unit-naming.js`. The Home Response builder uses that same formatter after verified purchases, without launching the Renamer UI or scanning other stations. Existing vehicle codes and icons are retained; General Practitioner (GP) and Community Midwife (MID) gain explicit rules so all supported Home Response roles can be named.

For Home Response building type 22, a matching trailing role suffix is removed before adding the vehicle code and number. `KIRKCALDY-FO` therefore produces `🧑‍🚒 KIRKCALDY-FO-1` in both entry points. Normal station formatting is unchanged. Unit Naming reports 3.3.30; Station Naming and personnel assignment are unchanged.

## 1.3.3 — 8 November 2026

Extension .261 recognises HART base building type 25, adds HART to the station-type choices, and places it under the Ambulance service. Station naming uses the existing verified location and sequenced uppercase suffix, for example `TOOME-HART1`. Existing sequence allocation, preview, nearest-town fallback and native save verification remain unchanged. The Station Naming panel reports its internal version as 1.3.24. Auto Mode remains 1.0.5 from .260.

## 1.3.2 — 1 November 2026

Extension .250 removes the floating Unit Naming panel from the dispatch-centre station overview and embedded station views. The Renamer tab in Nexus Tools owns the panel and creates it on demand. A station or vehicle naming link opens the corresponding tab. Naming diagnostics and the Personnel tab remain accessible in the same window.

## 1.3.1 — 31 October 2026

Extension .249 addresses station naming becoming slow after Start. The old post-save label update rebuilt every station entry from the visible game list, including label reads and layout checks. It now updates only links for the station just saved. In an isolated fixture with 1,500 station rows, eight updates dropped from roughly 310 ms to 2 ms; this measures the label-update step, not live end-to-end naming throughput.

Start performs one fresh building-inventory pre-check, validates the queued station identities and types, and prepares name sequences in chunks of 100 with a browser yield between chunks. Checked API coordinates avoid an otherwise unnecessary full station-page download. Missing coordinates retain the original verified station-page fallback. Naming remains sequential, keeps its existing pacing, uses native edit forms and verifies each save. An interrupted save response is checked without resubmitting the save.

Station request timeouts now cover the response body, with a 6 MB response limit and abortable body reads. Temporary sequence data is cleared after a run. A docked naming panel no longer processes station-list mutation records. Station Naming → More → Download Renamer diagnostics provides bounded counters, current stage, last failure and an optional approximate whole-page heap reading. Debug remains off by default; enabling it retains at most 80 timing records. No full heap snapshot, game-page HTML or secret values are exported.

Tests cover pre-check cancellation and changed stations, sequential verified saves, unchanged preview behaviour, interrupted and oversized response bodies, bounded diagnostic output, large inventories and the original naming fallbacks. Profiles, vehicle renaming, personnel-assignment functions, Training and Auto Mode remain unchanged. Live-game verification is still required.

## 1.3.0 — 31 October 2026

Extension .248 makes Nexus Tools → Renamer available on the main game page and other top-level game pages, without opening the map or dispatch station list. The naming module is packaged separately from the mission runtime and its controls initialize when Renamer is opened. Station and dispatch-centre choices come from one shared, authenticated building-inventory request. Legacy dispatch-overview access remains available.

Station names and Vehicle names links select the existing controls in place; copied links retain the current game page. Late loading is handled by a bounded startup request with a visible retry. Failed inventory reads clear both naming lists and prevent starting with stale choices. Accounts without a dispatch centre can still use All or Unassigned. No recurring naming scan is added. Normal top-level pages make no naming-inventory request until the controls are opened.

Rename calculations, nearby-town lookup, native form actions, save verification and personnel assignment functions are retained. Refresh is blocked while a naming operation runs. Auto Mode and Training code are unchanged. Tests cover API-only inventory with no station-list DOM, opening from a station page without navigation, late module startup, failed refreshes, empty dispatch-centre lists, links and layouts. Live game renames have not been performed for this release.

## 1.2.0 — 31 October 2026

Extension .247 moves the existing Station Naming and Unit Naming controls into Nexus Tools → Renamer. The same controls are docked in the Tools window using a light-DOM slot, preserving their existing document selectors, event handlers, filters, logs and running state. The existing Personnel subtab remains accessible. Switching Tools views or closing Tools hides the controls without cancelling a running operation; use the existing Stop button to stop it.

Direct `/#nexus-renamer=station` and `/#nexus-renamer=unit` links open the correct naming view on the game map. When the naming module is unavailable on a station or vehicle page, the tab provides these map links. Late naming initialization attaches once without duplicate panels. Station-level and dispatch-centre Rename vehicles actions and profile naming remain available and unchanged.

Only panel placement, tab routing and docked layout change in the naming runtime. Rename calculations, game links, form submissions, save verification, nearby-town lookup and Auto Mode remain unchanged. Isolated browser checks use the actual naming module, test both tab routes and confirm navigation sends no rename requests. Live game renames have not been performed for this release.

## 1.1.0 — 31 October 2026

Extension .245 retains the normal MissionChief address naming path and adds a coordinate-based nearby-town/village fallback when the address has no usable area after its postcode. Station naming retains town-only Home Response and existing type suffixes/sequences. Preview reports the source and fallback distance. Invalid coordinates, unsupported coverage and lookup failures leave names unchanged for review.

Unit Naming, station vehicle naming, dispatch-centre vehicle naming and profile naming also resolve generic station placeholders before creating unit captions. Trailing opaque bracketed IDs are removed from the naming base; meaningful custom names stay intact. Unit naming does not itself rename the station.

The existing VPS Realism API was inspected read-only and has no settlement endpoint. The fallback uses a packaged GeoNames country extract, spatially indexed and loaded only upon a naming request in the extension background service. There are 40,629 mapped populated places in GB, IE, IM, JE and GG, with a 25 km maximum fallback distance. No external geocoding calls or periodic naming work are added. Dataset attribution and build provenance are included. The shared runtime changes are restricted to five naming functions; Auto Mode, Training and profile purchases are unchanged.

Isolated tests exercise actual naming and native save verification, no live renames. New separate modules: `nexus-naming.js`, `nexus-naming-bridge.js`, `nexus-naming-worker.mjs`, `nexus-naming-places.json`.

## 1.0.0 — 31 October 2026

Initial independent version baseline, carried forward from extension 3.0.43.240. This does not claim the feature is newly introduced.

Source: Logical workstream within `nexus-runtime.js`; extraction into a separate module remains future work.
