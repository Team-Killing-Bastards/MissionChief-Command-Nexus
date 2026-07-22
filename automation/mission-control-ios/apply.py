#!/usr/bin/env python3

from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match; found {count}")
    file_path.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "README.md",
    "**Current version:** `1.0.18` · **Mission Finder engine:** `V10.6.82`",
    "**Current version:** `1.0.18` · **Mission Finder engine:** `V10.6.83`",
    "README Mission Finder version",
)
replace_once(
    "README.md",
    "then initiated, designed, and implemented the v1.0.15 iOS Safari compatibility layer and the v1.0.16 station-workflow hardening for the shared Unit, Station and Personnel menu.",
    "then initiated, designed, and implemented the v1.0.15 iOS Safari compatibility layer, the v1.0.16 station-workflow hardening for the shared Unit, Station and Personnel menu, and the v1.0.18 iOS Safari Mission Control layout for the dispatch screen.",
    "README contribution summary",
)
replace_once(
    "README.md",
    """### iOS Safari website menu

The shared Unit Naming, Station Naming and Personnel Assignment panel now appears on the MissionChief website in Safari on iPhone and iPad.

- Responsive station-list markup is recognised without weakening the desktop station-page guard.
- Unit Naming, Station Naming, Personnel Assignment and Build Personnel Register all use the same responsive station discovery layer.
- Exactly one Command Nexus administration menu is retained after duplicate injection, Safari bfcache restoration or page-fragment replacement.
- Responsive `Details` links fall back to a hidden same-origin station iframe when MissionChief's desktop lightbox binding is unavailable, preventing navigation away from the Stations tab.
- The panel uses Safari safe-area insets and the visual viewport, including address-bar changes and device rotation.
- The header supports touch/pointer dragging while the panel body and reports retain touch scrolling.
- iPad desktop-site mode is recognised through touch-capable `MacIntel` detection.
- Chrome, Firefox, Edge and native iOS webview/app wrappers are not treated as Safari website sessions.
""",
    """### iOS Safari website menus

The shared Resource Administration panel and the Mission Control dispatch panel now use dedicated layouts on the MissionChief website in Safari on iPhone and iPad.

- Responsive station-list markup is recognised without weakening the desktop station-page guard.
- Unit Naming, Station Naming, Personnel Assignment and Build Personnel Register all use the same responsive station discovery layer.
- Exactly one Command Nexus administration menu is retained after duplicate injection, Safari bfcache restoration or page-fragment replacement.
- Responsive `Details` links fall back to a hidden same-origin station iframe when MissionChief's desktop lightbox binding is unavailable, preventing navigation away from the Stations tab.
- The Resource Administration panel uses Safari safe-area insets, touch scrolling and pointer dragging.
- Mission Control opens at the safe-area top instead of the centre of the dispatch screen, stacks its panels to the mobile viewport width and keeps long content internally scrollable.
- Mission Control has a horizontal chevron collapse control; the Vehicle Load List defaults collapsed on first iOS Safari use and can be expanded independently.
- Mission Control supports pointer dragging and visual-viewport repositioning after Safari address-bar changes, rotation and bfcache restoration.
- Desktop Mission Control dimensions, saved coordinates, centring and mouse dragging remain on the existing desktop code path.
- iPad desktop-site mode is recognised through touch-capable `MacIntel` detection.
- Chrome, Firefox, Edge and native iOS webview/app wrappers are not treated as Safari website sessions.
""",
    "README iOS menu section",
)
replace_once(
    "README.md",
    "The underlying Unit, Station and Personnel system remains Marty's work.",
    "The underlying Unit, Station and Personnel system and Mission Finder engine remain Marty's work.",
    "README iOS ownership note",
)
replace_once(
    "README.md",
    "| **Primary environment** | Desktop remains the principal operating target; the shared Unit, Station and Personnel menu now supports the MissionChief website in Safari on iPhone and iPad |",
    "| **Primary environment** | Desktop remains the principal operating target; the shared administration menu and Mission Control dispatch panel now have dedicated MissionChief website layouts in Safari on iPhone and iPad |",
    "README primary environment row",
)
replace_once(
    "README.md",
    "| **Mobile and Safari** | iOS Safari website support covers the shared Unit Naming, Station Naming and Personnel Assignment menu; broader Mission Finder mobile support is not claimed |",
    "| **Mobile and Safari** | iOS Safari website support covers the shared administration menu and the Mission Control dispatch panel; other Mission Finder surfaces remain desktop-first unless separately documented |",
    "README mobile limitation row",
)
replace_once(
    "README.md",
    "designed and implemented the scoped v1.0.15 compatibility layer plus the v1.0.16 station-workflow hardening for the shared administration menu",
    "designed and implemented the scoped v1.0.15 compatibility layer, the v1.0.16 station-workflow hardening and the v1.0.18 Mission Control iOS Safari layout",
    "README ownership table",
)
replace_once(
    "README.md",
    "Repository infrastructure, documentation, validation, and independently initiated v1.0.15 iOS Safari compatibility by [Conroy1988](https://github.com/Conroy1988), contributed with Marty's permission.",
    "Repository infrastructure, documentation, validation, and the independently initiated v1.0.15-v1.0.18 iOS Safari compatibility work by [Conroy1988](https://github.com/Conroy1988), contributed with Marty's permission.",
    "README footer attribution",
)

replace_once(
    "CHANGELOG.md",
    """### Changed

- BASU, Welfare and HazMat mission wording now shares one exact type-39 Fire OSU; type-86 SAR Operational Support Vans remain separate.
- High Volume Pump, Drone Operator, Co-Responder and Lifeguard remain disabled pending later evidence.
- Personnel Assignment increased to `1.3.2`; Mission Finder increased to `V10.6.82`.
""",
    """### Fixed

- Mission Control now uses an iOS Safari-only safe-area top layout instead of opening as the centred 560px desktop interface over the dispatch screen.
- Added a horizontal chevron collapse control, pointer dragging and visual-viewport recovery for Safari address-bar changes, rotation and bfcache restoration.
- The Vehicle Load List defaults collapsed on first iOS Safari use and uses mobile-specific collapse storage without changing desktop preferences.

### Changed

- BASU, Welfare and HazMat mission wording now shares one exact type-39 Fire OSU; type-86 SAR Operational Support Vans remain separate.
- High Volume Pump, Drone Operator, Co-Responder and Lifeguard remain disabled pending later evidence.
- Desktop Mission Control sizing, saved positioning, centring and mouse dragging remain unchanged.
- Personnel Assignment increased to `1.3.2`; Mission Finder increased to `V10.6.83`.
""",
    "CHANGELOG v1.0.18 details",
)

replace_once(
    "src/README.md",
    "| Mission Finder baseline | `V10.6.82` |",
    "| Mission Finder baseline | `V10.6.83` |",
    "source README Mission Finder version",
)
replace_once(
    "src/README.md",
    "The source is merged and installable, but deeper interface, lifecycle and storage consolidation remains subject to testing and MartyBlyth's technical direction.",
    "The source is merged and installable. Mission Control uses a dedicated iOS Safari-only safe-area layout while the established desktop dimensions, saved positioning and mouse interaction remain unchanged. Deeper interface, lifecycle and storage consolidation remains subject to testing and MartyBlyth's technical direction.",
    "source README implementation model",
)

check_path = Path("scripts/check-ios-compatibility.mjs")
check_text = check_path.read_text(encoding="utf-8")
marker = "console.log('iOS Safari compatibility regression checks passed.');"
if check_text.count(marker) != 1:
    raise SystemExit("iOS regression check insertion marker is not unique")
additions = r"""requireText(
  'function isMissionFinderIosSafariWebsite(',
  'Mission Control iOS Safari detector'
);
requireText(
  'mf2026-ios-safari',
  'Mission Control iOS Safari wrapper class'
);
requireText(
  '#mission-finder-wrapper.mf2026-ios-safari',
  'Mission Control mobile layout'
);
requireText(
  'function getMissionFinderViewportBounds(',
  'Mission Control visual viewport bounds'
);
requireText(
  'function resetMissionFinderIosPosition(',
  'Mission Control safe-area reset'
);
requireText(
  'MF_CONTROL_COLLAPSED_KEY',
  'Mission Control iOS collapse storage isolation'
);
requireText(
  'MF_VEHICLE_LOAD_COLLAPSED_KEY',
  'Vehicle Load List iOS collapse storage isolation'
);
requirePattern(
  /function makePanelDraggable\(panel, dragHandle\)[\s\S]{0,16000}isMissionFinderIosSafariWebsite\(\)[\s\S]{0,16000}pointerdown/,
  'Mission Control pointer dragging'
);
requirePattern(
  /if \(!missionFinderIosSafari\)[\s\S]{0,1200}wrapper\.style\.left/,
  'desktop Mission Control positioning isolation'
);
requirePattern(
  /if \(missionFinderIosSafari\)[\s\S]{0,1000}resetMissionFinderIosPosition/,
  'iOS Mission Control top placement'
);
requireText(
  '#control-panel {\n                width: 260px;',
  'desktop Mission Control width preservation'
);
requireText(
  '#vehicle-load-list-box {\n                width: 300px;',
  'desktop Vehicle Load List width preservation'
);
requireText(
  "!/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(userAgent)",
  'Mission Control non-Safari browser exclusion'
);

"""
check_path.write_text(check_text.replace(marker, additions + marker, 1), encoding="utf-8")

print("Mission Control iOS Safari documentation and regression updates applied.")
