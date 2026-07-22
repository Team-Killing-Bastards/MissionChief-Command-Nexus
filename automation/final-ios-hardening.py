#!/usr/bin/env python3

from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label} expected exactly one match; found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


source_path = Path("src/missionchief-command-nexus.user.js")
replace_once(
    source_path,
    """    function isStationOverviewScreen() {
        return getStationOverviewEntries().length > 0;
    }
""",
    """    function isStationOverviewScreen() {
        const entries = getStationOverviewEntries();
        if (!entries.length) return false;

        const hasDesktopStationEntry = entries.some(entry =>
            entry.link?.matches?.(
                'a.lightbox-open.list-group-item.active[href*="/buildings/"]'
            )
        );
        if (hasDesktopStationEntry) return true;

        if (!isIosSafariWebsite()) return false;

        return entries.some(entry =>
            entry.container?.matches?.(
                '.building_list_li, .building_list, [data-building-id], [id^="building_"]'
            )
        );
    }
""",
    "station overview loader guard",
)

readme_path = Path("README.md")
replace_once(
    readme_path,
    """- Responsive station-list markup is recognised without weakening the desktop station-page guard.
- The panel uses Safari safe-area insets and the visual viewport, including address-bar changes and device rotation.
- The header supports touch/pointer dragging while the panel body and reports retain touch scrolling.
- iPad desktop-site mode is recognised through touch-capable `MacIntel` detection.
- Chrome, Firefox, Edge and native iOS webview/app wrappers are not treated as Safari website sessions.
""",
    """- Responsive station-list markup is recognised without weakening the desktop station-page guard.
- Unit Naming, Station Naming, Personnel Assignment and Build Personnel Register all use the same responsive station discovery layer.
- Exactly one Command Nexus administration menu is retained after duplicate injection, Safari bfcache restoration or page-fragment replacement.
- Responsive `Details` links fall back to a hidden same-origin station iframe when MissionChief's desktop lightbox binding is unavailable, preventing navigation away from the Stations tab.
- The panel uses Safari safe-area insets and the visual viewport, including address-bar changes and device rotation.
- The header supports touch/pointer dragging while the panel body and reports retain touch scrolling.
- iPad desktop-site mode is recognised through touch-capable `MacIntel` detection.
- Chrome, Firefox, Edge and native iOS webview/app wrappers are not treated as Safari website sessions.
""",
    "README iOS behaviour list",
)
replace_once(
    readme_path,
    """then initiated, designed, and implemented the v1.0.15 iOS Safari compatibility layer for the shared Unit, Station and Personnel menu.""",
    """then initiated, designed, and implemented the v1.0.15 iOS Safari compatibility layer and the v1.0.16 station-workflow hardening for the shared Unit, Station and Personnel menu.""",
    "README headline contribution attribution",
)
replace_once(
    readme_path,
    """and designed and implemented the scoped v1.0.15 compatibility layer for the shared administration menu""",
    """and designed and implemented the scoped v1.0.15 compatibility layer plus the v1.0.16 station-workflow hardening for the shared administration menu""",
    "README ownership-table contribution attribution",
)

checker_path = Path("scripts/check_repository.py")
replace_once(
    checker_path,
    """    "scripts/validate-userscript.mjs",
    "src/README.md",
""",
    """    "scripts/validate-userscript.mjs",
    "scripts/check-ios-compatibility.mjs",
    "src/README.md",
""",
    "required iOS regression checker",
)

print("Final iOS hardening patch applied.")
