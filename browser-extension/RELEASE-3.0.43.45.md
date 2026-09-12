# Local 3.0.43.45 — Help menu and phone layout

Nexus Tools now appears in the native **?** dropdown between **FAQ** and **Contact Support**, with white separators. The navbar's existing spacing is retained. A standalone page without the native Help menu keeps a fallback wrench; it hides while Tools is open so it cannot cover Close. A replaced or late-rendered Help menu is handled when navigation is focused or opened, without observing the mission list.

Phone mode is selected by available width and the short screen dimension on touch devices, so landscape rotation retains the phone layout. The visual viewport supplies dimensions and offsets for keyboard/browser chrome changes. Safe-area insets are respected. Tools has a scrollable body, reachable close/tabs/save, larger touch targets and 16px input text. Tablet touch controls and the naming, mission-share, crew and building panels also adapt to narrower screens. Desktop Tools retains its 850px width.

The user confirmed Orion on iPhone with Request Desktop Website enabled. A wide desktop-site viewport on a touch phone receives Nexus-only scale compensation, so a roughly 980px desktop layout does not shrink Nexus's text and controls onto a 390px phone. The game's viewport metadata and zoom remain unchanged. Scale is anchored to layout width and physical rotation, not keyboard height or pinch zoom. Tests include a desktop user agent, a wide layout viewport and a phone-sized touch screen. Orion itself is not available on this Windows test host.

The new `nexus-responsive.js` only manages manual UI layout. It reads no fleet, performs no requests, starts no polling timers and installs no DOM observers. Viewport events are coalesced into an animation frame; unchanged values do not mutate the DOM. Listeners are released on pagehide and restored on pageshow. Auto workers, preloads, retired workers and their nested frames are excluded.

This release continues from local .44 at `31a1085c` and includes its five permanent vehicle-rule defaults. The Auto runtime is byte-identical to .44 after normalizing only the build version. The .43 release files and existing store submissions are unchanged. Do not push this branch or submit .45 without a release request.

## Verification

Run `node scripts/verify-all.mjs` in `browser-extension`. The ten required stages include the existing automated tests, adapted upstream regressions, package/provenance checks, real unpacked Edge smoke tests, Settings integration and `tests/ui/responsive-45.mjs`.

The responsive test covers desktop, tablet and an iPhone-sized touch viewport; native menu insertion/replacement and focus; scrolling and Settings save; rotation; controlled keyboard viewport events in the extension's actual isolated world; building/naming/mission dialogs; and worker exclusion. Network requests use fixtures, and no user game session is manipulated. Results and screenshots are under `audit/`. These are browser-emulated checks, not a physical iPhone acceptance result.

Verification records for 12 September 2026 are in `audit/verification-summary.json` and `audit/responsive-45-results.json`. The suite includes 125 automated tests, 133 adapted upstream checks, package verification, unpacked Edge smoke, 13 Settings integration groups and the desktop/tablet/phone/desktop-site-phone checks. Rendered phone portrait, landscape, keyboard, naming, building and menu screenshots are inspected before local delivery. No physical iPhone has been connected for acceptance testing.

The manual-delivery builder is `native-navigation/build-responsive-45.mjs` in the outer workspace. It requires all verification stages to pass, preserves the already-verified public .43 reporting destination, verifies every delivered ZIP/folder file hash, and writes `audit/local-delivery.json`. It does not publish anything.
