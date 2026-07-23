#!/usr/bin/env python3

from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match; found {count}")
    file_path.write_text(text.replace(old, new, 1), encoding="utf-8", newline="\n")


SOURCE = "src/missionchief-command-nexus.user.js"

replace_once(
    SOURCE,
    "    const UNIT_VERSION = '3.3.7';",
    "    const UNIT_VERSION = '3.3.8';",
    "Unit Naming Tool version",
)

replace_once(
    SOURCE,
    """    let TOOL_LIFECYCLE_CLEANED = false;
""",
    """    let TOOL_LIFECYCLE_CLEANED = false;
    let NAMING_TOOLS_PANEL_GUARD_INSTALLED = false;
""",
    "panel guard singleton state",
)

replace_once(
    SOURCE,
    """    function installSingleNamingToolsPanelGuard(panel) {
        let pending = false;
        const enforce = () => {
            if (pending) return;
            pending = true;
            requestAnimationFrame(() => {
                pending = false;
                ensureSingleNamingToolsPanel(panel?.isConnected ? panel : null);
            });
        };

        const observer = new MutationObserver(records => {
            const panelMutation = records.some(record =>
                [...record.addedNodes].some(node =>
                    node?.nodeType === Node.ELEMENT_NODE && (
                        node.matches?.('#mc-namer-panel') ||
                        node.querySelector?.('#mc-namer-panel')
                    )
                )
            );
            if (panelMutation) enforce();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.addEventListener('pageshow', enforce, { passive: true });

        registerToolLifecycleCleanup(() => {
            observer.disconnect();
            window.removeEventListener('pageshow', enforce);
        });

        enforce();
    }
""",
    """    function syncNamingToolsPanelVisibility(preferredPanel = null) {
        const panel = ensureSingleNamingToolsPanel(
            preferredPanel?.isConnected ? preferredPanel : null
        );
        if (!panel || !isIosSafariWebsite()) return panel;

        const shouldShow = isStationOverviewScreen();
        panel.hidden = !shouldShow;
        panel.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');

        if (shouldShow) {
            panel.style.removeProperty('display');
            requestAnimationFrame(() => {
                if (panel.isConnected && !panel.hidden) {
                    clampToolPanelToViewport(panel);
                }
            });
        } else {
            panel.style.setProperty('display', 'none', 'important');
        }

        return panel;
    }

    function installSingleNamingToolsPanelGuard(panel) {
        if (NAMING_TOOLS_PANEL_GUARD_INSTALLED) {
            syncNamingToolsPanelVisibility(panel);
            return;
        }
        NAMING_TOOLS_PANEL_GUARD_INSTALLED = true;

        let pending = false;
        const enforce = () => {
            if (pending) return;
            pending = true;
            requestAnimationFrame(() => {
                pending = false;
                let activePanel = syncNamingToolsPanelVisibility(
                    panel?.isConnected ? panel : null
                );

                if (
                    !activePanel &&
                    isIosSafariWebsite() &&
                    isStationOverviewScreen()
                ) {
                    init();
                    activePanel = syncNamingToolsPanelVisibility();
                }
            });
        };

        const observer = new MutationObserver(records => {
            const panelMutation = records.some(record =>
                [...record.addedNodes].some(node =>
                    node?.nodeType === Node.ELEMENT_NODE && (
                        node.matches?.('#mc-namer-panel') ||
                        node.querySelector?.('#mc-namer-panel')
                    )
                )
            );
            const pageMutation = isIosSafariWebsite() && records.some(record => {
                const target = record.target?.nodeType === Node.ELEMENT_NODE
                    ? record.target
                    : record.target?.parentElement;
                if (target?.closest?.('#mc-namer-panel')) return false;
                return record.addedNodes.length > 0 || record.removedNodes.length > 0;
            });
            if (panelMutation || pageMutation) enforce();
        });

        const handleNavigationClick = event => {
            const control = event.target?.closest?.('a, button');
            if (!control || control.closest?.('#mc-namer-panel')) return;
            setTimeout(enforce, 0);
            setTimeout(enforce, 250);
        };

        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.addEventListener('pageshow', enforce, { passive: true });
        window.addEventListener('popstate', enforce, { passive: true });
        window.addEventListener('hashchange', enforce, { passive: true });
        document.addEventListener('visibilitychange', enforce, { passive: true });
        document.addEventListener('click', handleNavigationClick, true);

        registerToolLifecycleCleanup(() => {
            observer.disconnect();
            window.removeEventListener('pageshow', enforce);
            window.removeEventListener('popstate', enforce);
            window.removeEventListener('hashchange', enforce);
            document.removeEventListener('visibilitychange', enforce);
            document.removeEventListener('click', handleNavigationClick, true);
            NAMING_TOOLS_PANEL_GUARD_INSTALLED = false;
        });

        enforce();
    }
""",
    "Stations-only singleton panel guard",
)

replace_once(
    SOURCE,
    """        function tryInitialise() {
            if (ensureSingleNamingToolsPanel()) {
                removeReadinessListeners();
                return true;
            }

            if (!isStationOverviewScreen()) return false;

            removeReadinessListeners();
            init();
            return true;
        }
""",
    """        function tryInitialise() {
            const stationOverviewScreen = isStationOverviewScreen();
            const existingPanel = ensureSingleNamingToolsPanel();

            if (existingPanel) {
                if (!isIosSafariWebsite()) {
                    removeReadinessListeners();
                    return true;
                }

                syncNamingToolsPanelVisibility(existingPanel);
                if (!stationOverviewScreen) return false;

                removeReadinessListeners();
                return true;
            }

            if (!stationOverviewScreen) return false;

            removeReadinessListeners();
            init();
            return true;
        }
""",
    "initialisation order and off-page suppression",
)

replace_once(
    SOURCE,
    """        return entries.some(entry =>
            entry.container?.matches?.(
                '.building_list_li, .building_list, [data-building-id], [id^="building_"]'
            )
        );
""",
    """        return entries.some(entry => {
            const container = entry.container;
            if (!container) return false;

            const responsiveList = container.matches?.(
                '.building_list_li, .building_list'
            )
                ? container
                : container.closest?.('.building_list');
            if (!responsiveList) return false;
            if (responsiveList.closest?.('[hidden], [aria-hidden="true"]')) return false;

            const style = window.getComputedStyle(responsiveList);
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                responsiveList.getClientRects().length > 0;
        });
""",
    "visible personal Stations list detection",
)

CHECK = "scripts/check-ios-compatibility.mjs"
check_path = Path(CHECK)
check_text = check_path.read_text(encoding="utf-8")
marker = "requireText(\n  'function createManagedStationIframe(',"
if check_text.count(marker) != 1:
    raise SystemExit("iOS check insertion marker is not unique")
checks = r"""requireText(
  'function syncNamingToolsPanelVisibility(',
  'Stations-only panel visibility synchronisation'
);
requireText(
  'panel.hidden = !shouldShow;',
  'off-page panel suppression'
);
requireText(
  "panel.style.setProperty('display', 'none', 'important');",
  'off-page display enforcement'
);
requireText(
  'NAMING_TOOLS_PANEL_GUARD_INSTALLED',
  'singleton lifecycle guard state'
);
requireText(
  "document.addEventListener('click', handleNavigationClick, true);",
  'responsive navigation lifecycle check'
);
requirePattern(
  /function isStationOverviewScreen\(\)[\s\S]{0,1800}getClientRects\(\)\.length > 0/,
  'visible responsive Stations-list requirement'
);

const stationScreenStart = source.indexOf('function isStationOverviewScreen()');
const stationScreenEnd = source.indexOf('\n    function init()', stationScreenStart);
if (stationScreenStart < 0 || stationScreenEnd <= stationScreenStart) {
  fail('Unable to isolate the Stations-screen detector');
}
const stationScreenBlock = source.slice(stationScreenStart, stationScreenEnd);
if (stationScreenBlock.includes('[data-building-id]') || stationScreenBlock.includes('[id^="building_"]')) {
  fail('Stations-screen detection must not accept generic map building nodes');
}

const initialiseStart = source.indexOf('function tryInitialise()');
const initialiseEnd = source.indexOf('\n        if (tryInitialise()) return;', initialiseStart);
if (initialiseStart < 0 || initialiseEnd <= initialiseStart) {
  fail('Unable to isolate the naming-tools initialiser');
}
const initialiseBlock = source.slice(initialiseStart, initialiseEnd);
if (
  initialiseBlock.indexOf('isStationOverviewScreen()') < 0 ||
  initialiseBlock.indexOf('ensureSingleNamingToolsPanel()') < 0 ||
  initialiseBlock.indexOf('isStationOverviewScreen()') >
    initialiseBlock.indexOf('ensureSingleNamingToolsPanel()')
) {
  fail('Stations-screen state must be evaluated before accepting an existing panel');
}

"""
check_path.write_text(check_text.replace(marker, checks + marker, 1), encoding="utf-8", newline="\n")

replace_once(
    "README.md",
    "- Unit Naming, Station Naming, Personnel Assignment and Build Personnel Register all use the same responsive station discovery layer.\n",
    "- Unit Naming, Station Naming, Personnel Assignment and Build Personnel Register all use the same responsive station discovery layer.\n- The Resource Administration panel is shown only while the visible personal Stations list is active; Map, Missions, Chat and Radio suppress it immediately.\n",
    "README Stations-only lifecycle note",
)

replace_once(
    "src/README.md",
    "The source is merged and installable. Mission Control uses a dedicated iOS Safari-only safe-area layout while the established desktop dimensions, saved positioning and mouse interaction remain unchanged.",
    "The source is merged and installable. The Resource Administration panel is scoped to the visible personal Stations list on iOS Safari, and Mission Control uses a dedicated iOS Safari-only safe-area layout while the established desktop dimensions, saved positioning and mouse interaction remain unchanged.",
    "source README lifecycle model",
)

print("Issue #95 Stations-only panel lifecycle patch applied.")
