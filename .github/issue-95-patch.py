#!/usr/bin/env python3

from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    print(f'{label}: exact matches={count}', flush=True)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


def sub_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(
        pattern,
        lambda _match: replacement,
        text,
        count=1,
        flags=re.DOTALL,
    )
    print(f'{label}: structural matches={count}', flush=True)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 structural match, found {count}')
    return updated


source_path = Path('src/missionchief-command-nexus.user.js')
source = source_path.read_text(encoding='utf-8')

source = replace_once(
    source,
    '// @version      1.0.20',
    '// @version      1.0.21',
    'userscript version',
)
source = replace_once(
    source,
    "    const UNIT_VERSION = '3.3.7';",
    "    const UNIT_VERSION = '3.3.8';",
    'Unit Naming version',
)
source = replace_once(
    source,
    """    const TOOL_UI_ELEMENT_CACHE = new Map();
    const PERSONNEL_ASSIGNMENT_INDEX_CACHE = new WeakMap();""",
    """    const TOOL_UI_ELEMENT_CACHE = new Map();
    const TOOL_PANEL_VIEWPORT_CLEANUPS = new WeakMap();
    const PERSONNEL_ASSIGNMENT_INDEX_CACHE = new WeakMap();""",
    'panel viewport cleanup registry',
)
source = replace_once(
    source,
    """    let TOOL_LIFECYCLE_CLEANED = false;
    let PERSONNEL_TRAINING_REGISTRY_CACHE = null;""",
    """    let TOOL_LIFECYCLE_CLEANED = false;
    let NAMING_TOOLS_PANEL_GUARD_INSTALLED = false;
    let PERSONNEL_TRAINING_REGISTRY_CACHE = null;""",
    'persistent panel guard state',
)

lifecycle_block = """    function removeNamingToolsPanelElement(panel) {
        if (!panel) return false;

        const viewportCleanup =
            TOOL_PANEL_VIEWPORT_CLEANUPS.get(panel);
        if (typeof viewportCleanup === 'function') {
            viewportCleanup();
        }
        TOOL_PANEL_VIEWPORT_CLEANUPS.delete(panel);

        for (const [logBox, frameId] of [...TOOL_LOG_SCROLL_FRAMES.entries()]) {
            if (!panel.contains(logBox)) continue;
            try {
                cancelAnimationFrame(frameId);
            } catch (_error) {}
            TOOL_LOG_SCROLL_FRAMES.delete(logBox);
        }

        TOOL_UI_ELEMENT_CACHE.clear();
        panel.remove();
        return true;
    }

    function ensureSingleNamingToolsPanel(preferredPanel = null) {
        const panels = [...document.querySelectorAll('#mc-namer-panel')];
        const keeper = preferredPanel?.isConnected
            ? preferredPanel
            : panels[0] || null;

        panels.forEach(panel => {
            if (panel !== keeper) removeNamingToolsPanelElement(panel);
        });

        const styles = [...document.querySelectorAll('style[data-mc-namer-style="true"]')];
        styles.forEach((style, index) => {
            if (index > 0) style.remove();
        });

        return keeper;
    }

    function removeNamingToolsPanelFromOffPage() {
        document.querySelectorAll('#mc-namer-panel').forEach(panel => {
            removeNamingToolsPanelElement(panel);
        });
        document.querySelectorAll('style[data-mc-namer-style="true"]').forEach(style => {
            style.remove();
        });
        return document.querySelector('#mc-namer-panel') == null;
    }

    function decideNamingToolsPanelLifecycle(
        iosSafari,
        stationOverview,
        hasPanel
    ) {
        if (!iosSafari) return 'dedupe';
        if (!stationOverview) return 'remove';
        return hasPanel ? 'dedupe' : 'create';
    }

    function reconcileNamingToolsPanelLifecycle() {
        const iosSafari = isIosSafariWebsite();
        const panel = ensureSingleNamingToolsPanel();
        if (!iosSafari) return panel;

        const action = decideNamingToolsPanelLifecycle(
            iosSafari,
            isStationOverviewScreen(),
            Boolean(panel)
        );

        if (action === 'remove') {
            removeNamingToolsPanelFromOffPage();
            return null;
        }

        if (action === 'create') {
            init();
            return ensureSingleNamingToolsPanel();
        }

        return panel;
    }

    function installSingleNamingToolsPanelGuard() {
        if (NAMING_TOOLS_PANEL_GUARD_INSTALLED) return;
        NAMING_TOOLS_PANEL_GUARD_INSTALLED = true;

        const iosSafari = isIosSafariWebsite();
        let pendingFrame = null;
        const enforce = () => {
            if (pendingFrame != null) return;
            pendingFrame = requestAnimationFrame(() => {
                pendingFrame = null;
                reconcileNamingToolsPanelLifecycle();
            });
        };
        const handleVisibilityChange = () => {
            if (!document.hidden) enforce();
        };

        const observer = new MutationObserver(records => {
            const relevantMutation = iosSafari
                ? records.some(record => {
                    const targetElement =
                        record.target?.nodeType === Node.ELEMENT_NODE
                            ? record.target
                            : record.target?.parentElement;
                    return !targetElement?.closest?.('#mc-namer-panel');
                })
                : records.some(record =>
                    [...record.addedNodes].some(node =>
                        node?.nodeType === Node.ELEMENT_NODE && (
                            node.matches?.('#mc-namer-panel') ||
                            node.querySelector?.('#mc-namer-panel')
                        )
                    )
                );
            if (relevantMutation) enforce();
        });
        observer.observe(
            document.documentElement,
            iosSafari
                ? {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: [
                        'class',
                        'style',
                        'hidden',
                        'aria-hidden'
                    ]
                }
                : {
                    childList: true,
                    subtree: true
                }
        );
        window.addEventListener('pageshow', enforce, { passive: true });
        document.addEventListener(
            'visibilitychange',
            handleVisibilityChange,
            { passive: true }
        );

        const cleanup = () => {
            if (pendingFrame != null) {
                cancelAnimationFrame(pendingFrame);
                pendingFrame = null;
            }
            observer.disconnect();
            window.removeEventListener('pageshow', enforce);
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange
            );
            NAMING_TOOLS_PANEL_GUARD_INSTALLED = false;
            TOOL_LIFECYCLE_CLEANUPS.delete(cleanup);
        };

        registerToolLifecycleCleanup(cleanup);
        enforce();
    }

"""
source = sub_once(
    source,
    r"    function ensureSingleNamingToolsPanel\([\s\S]*?(?=    function getToolViewportBounds\(\))",
    lifecycle_block,
    'Resource Administration lifecycle block',
)

viewport_block = """    function installToolViewportGuard(panel) {
        let pendingFrame = null;
        let cleaned = false;

        const requestClamp = () => {
            if (pendingFrame != null) return;
            pendingFrame = requestAnimationFrame(() => {
                pendingFrame = null;
                clampToolPanelToViewport(panel);
            });
        };

        const resetIosPosition = () => {
            if (panel.classList.contains('mc-ios-safari')) {
                panel.style.left = '';
                panel.style.top = '';
                panel.style.right = '';
                panel.style.width = '';
            }
            requestClamp();
        };

        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            if (pendingFrame != null) {
                cancelAnimationFrame(pendingFrame);
                pendingFrame = null;
            }
            window.removeEventListener('resize', requestClamp);
            window.removeEventListener('orientationchange', resetIosPosition);
            window.removeEventListener('pageshow', requestClamp);
            window.visualViewport?.removeEventListener('resize', requestClamp);
            window.visualViewport?.removeEventListener('scroll', requestClamp);
            TOOL_PANEL_VIEWPORT_CLEANUPS.delete(panel);
            TOOL_LIFECYCLE_CLEANUPS.delete(cleanup);
        };

        window.addEventListener('resize', requestClamp, { passive: true });
        window.addEventListener('orientationchange', resetIosPosition, { passive: true });
        window.addEventListener('pageshow', requestClamp, { passive: true });
        window.visualViewport?.addEventListener('resize', requestClamp, { passive: true });
        window.visualViewport?.addEventListener('scroll', requestClamp, { passive: true });

        registerToolLifecycleCleanup(cleanup);
        requestClamp();
        return cleanup;
    }

"""
source = sub_once(
    source,
    r"    function installToolViewportGuard\(panel\) \{[\s\S]*?(?=    function initWhenReady\(\))",
    viewport_block,
    'per-panel viewport cleanup',
)

initialiser_block = """    function initWhenReady() {
        installSingleNamingToolsPanelGuard();
        if (isIosSafariWebsite()) return;

        let tries = 0;
        let timer = null;
        const maximumTries = 40;

        const removeReadinessListeners = () => {
            if (timer != null) {
                clearInterval(timer);
                timer = null;
            }
            TOOL_LIFECYCLE_CLEANUPS.delete(removeReadinessListeners);
        };

        function tryInitialise() {
            if (ensureSingleNamingToolsPanel()) {
                removeReadinessListeners();
                return true;
            }

            if (!isStationOverviewScreen()) return false;

            removeReadinessListeners();
            init();
            return true;
        }

        if (tryInitialise()) return;

        timer = setInterval(() => {
            tries++;
            if (tryInitialise()) return;
            if (tries >= maximumTries) {
                clearInterval(timer);
                timer = null;
            }
        }, 500);

        registerToolLifecycleCleanup(removeReadinessListeners);
    }


"""
source = sub_once(
    source,
    r"    function initWhenReady\(\) \{[\s\S]*?(?=    function isStationOverviewScreen\(\))",
    initialiser_block,
    'persistent iOS initialisation path',
)

station_screen_block = """    function isRenderedStationOverviewEntry(entry) {
        const candidates = [
            entry?.container,
            entry?.link
        ].filter(Boolean);

        return candidates.some(node => {
            if (!node.isConnected) return false;
            if (node.closest?.('[hidden], [aria-hidden="true"]')) return false;

            const style = window.getComputedStyle?.(node);
            if (
                style && (
                    style.display === 'none' ||
                    style.visibility === 'hidden' ||
                    style.visibility === 'collapse'
                )
            ) {
                return false;
            }

            const rectangles = node.getClientRects?.();
            return !rectangles || rectangles.length > 0;
        });
    }

    function isStationOverviewScreen() {
        const entries = getStationOverviewEntries();
        if (!entries.length) return false;

        const desktopStationSelector =
            'a.lightbox-open.list-group-item.active[href*="/buildings/"]';
        if (!isIosSafariWebsite()) {
            return entries.some(entry =>
                entry.link?.matches?.(desktopStationSelector)
            );
        }

        return entries.some(entry =>
            isRenderedStationOverviewEntry(entry) && (
                entry.link?.matches?.(desktopStationSelector) ||
                entry.container?.matches?.(
                    '.building_list_li, .building_list, [data-building-id], [id^="building_"]'
                )
            )
        );
    }


"""
source = sub_once(
    source,
    r"    function isStationOverviewScreen\(\) \{[\s\S]*?(?=    function init\(\))",
    station_screen_block,
    'rendered Stations-view gate',
)

source = replace_once(
    source,
    """        makePanelDraggable(panel, document.querySelector('#mc-namer-header'));
        installToolViewportGuard(panel);
        installSingleNamingToolsPanelGuard(panel);""",
    """        makePanelDraggable(panel, document.querySelector('#mc-namer-header'));
        TOOL_PANEL_VIEWPORT_CLEANUPS.set(
            panel,
            installToolViewportGuard(panel)
        );""",
    'panel-specific viewport guard registration',
)
source_path.write_text(source, encoding='utf-8', newline='\n')

checks_path = Path('scripts/check-ios-compatibility.mjs')
checks = checks_path.read_text(encoding='utf-8')
lifecycle_checks_anchor = """requireText(
  "style.dataset.mcNamerStyle = 'true';",
  'single style-instance marker'
);
"""
lifecycle_checks = lifecycle_checks_anchor + """
requireText(
  'function isRenderedStationOverviewEntry(',
  'rendered Stations-view detection'
);
requireText(
  'function removeNamingToolsPanelFromOffPage(',
  'off-page Resource Administration removal'
);
requireText(
  'function decideNamingToolsPanelLifecycle(',
  'panel lifecycle decision contract'
);
requireText(
  'function reconcileNamingToolsPanelLifecycle(',
  'persistent panel lifecycle reconciliation'
);
requireText(
  'TOOL_PANEL_VIEWPORT_CLEANUPS',
  'removed-panel viewport cleanup isolation'
);
requirePattern(
  /function isStationOverviewScreen\(\)[\s\S]{0,2200}isIosSafariWebsite\(\)[\s\S]{0,2200}isRenderedStationOverviewEntry\(/,
  'iOS rendered Stations-view visibility gate'
);
requirePattern(
  /function reconcileNamingToolsPanelLifecycle\(\)[\s\S]{0,2200}removeNamingToolsPanelFromOffPage\(\)[\s\S]{0,2200}init\(\)/,
  'off-page removal and Stations-view recreation'
);
requirePattern(
  /function initWhenReady\(\)\s*\{[\s\S]{0,500}installSingleNamingToolsPanelGuard\(\);[\s\S]{0,500}if \(isIosSafariWebsite\(\)\) return;/,
  'persistent iOS lifecycle guard installation'
);
requirePattern(
  /function installSingleNamingToolsPanelGuard\(\)[\s\S]{0,6500}observer\.observe\([\s\S]{0,1800}attributes:\s*true[\s\S]{0,1800}aria-hidden/,
  'responsive navigation DOM and visibility observation'
);
if (source.includes('installSingleNamingToolsPanelGuard(panel)')) {
  fail('Panel recreation must not install another global lifecycle guard');
}
"""
checks = replace_once(
    checks,
    lifecycle_checks_anchor,
    lifecycle_checks,
    'iOS lifecycle static checks',
)

mission_control_anchor = """requireText(
  'function isMissionFinderIosSafariWebsite(',
  'Mission Control iOS Safari detector'
);
"""
lifecycle_behaviour = """const lifecycleFunctionMatch = source.match(
  /function decideNamingToolsPanelLifecycle\([^)]*\)\s*\{[\s\S]*?\n    \}/
);
if (!lifecycleFunctionMatch) {
  fail('Unable to extract the panel lifecycle decision function');
}

let decideNamingToolsPanelLifecycle;
try {
  decideNamingToolsPanelLifecycle = Function(
    `"use strict"; ${lifecycleFunctionMatch[0]}; return decideNamingToolsPanelLifecycle;`
  )();
} catch (error) {
  fail(`Unable to evaluate the panel lifecycle decision function: ${error.message}`);
}

const lifecycleCases = [
  { input: [false, false, false], expected: 'dedupe', label: 'desktop outside Stations' },
  { input: [false, true, false], expected: 'dedupe', label: 'desktop Stations without panel' },
  { input: [true, false, false], expected: 'remove', label: 'iOS outside Stations without panel' },
  { input: [true, false, true], expected: 'remove', label: 'iOS outside Stations with panel' },
  { input: [true, true, false], expected: 'create', label: 'iOS Stations without panel' },
  { input: [true, true, true], expected: 'dedupe', label: 'iOS Stations with panel' }
];

for (const testCase of lifecycleCases) {
  const actual = decideNamingToolsPanelLifecycle(...testCase.input);
  if (actual !== testCase.expected) {
    fail(
      `Panel lifecycle ${testCase.label} expected ${testCase.expected}; found ${actual}`
    );
  }
}

""" + mission_control_anchor
checks = replace_once(
    checks,
    mission_control_anchor,
    lifecycle_behaviour,
    'iOS lifecycle behaviour checks',
)
checks_path.write_text(checks, encoding='utf-8', newline='\n')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
release = """## [1.0.21] - 2026-07-23

### Fixed

- The Resource Administration panel on iOS Safari now exists only while a rendered personal Stations list is active.
- Switching to Map, Missions, Chat, Radio or another responsive view removes the stale panel; returning to Stations recreates exactly one instance.
- Persistent DOM, visibility and bfcache reconciliation now survives repeated responsive navigation without accumulating detached panel viewport listeners.

### Changed

- Unit Naming increased from `3.3.7` to `3.3.8`; desktop Resource Administration and Mission Control behaviour remain unchanged.

"""
changelog = replace_once(
    changelog,
    '## [1.0.20] - 2026-07-23',
    release + '## [1.0.20] - 2026-07-23',
    'v1.0.21 changelog entry',
)
changelog_path.write_text(changelog, encoding='utf-8', newline='\n')

readme_path = Path('README.md')
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(
    readme,
    '**Current version:** `1.0.20` · **Mission Finder engine:** `V10.6.85`',
    '**Current version:** `1.0.21` · **Mission Finder engine:** `V10.6.85`',
    'README current version',
)
readme = replace_once(
    readme,
    '[**v1.0.20**](#current-v1020-behaviour)',
    '[**v1.0.21**](#current-v1021-behaviour)',
    'README version navigation',
)
readme = replace_once(
    readme,
    '## Current v1.0.20 behaviour',
    '## Current v1.0.21 behaviour',
    'README current behaviour heading',
)
readme = replace_once(
    readme,
    '- Exactly one Command Nexus administration menu is retained after duplicate injection, Safari bfcache restoration or page-fragment replacement.\n',
    '- Exactly one Command Nexus administration menu is retained after duplicate injection, Safari bfcache restoration or page-fragment replacement.\n'
    '- On iOS Safari, Resource Administration exists only while a rendered personal Stations list is active; Map, Missions, Chat, Radio and other views remove it, and returning to Stations recreates one instance.\n',
    'README Stations-view lifecycle',
)
readme_path.write_text(readme, encoding='utf-8', newline='\n')

source_readme_path = Path('src/README.md')
source_readme = source_readme_path.read_text(encoding='utf-8')
source_readme = replace_once(
    source_readme,
    '| Command Nexus version | `1.0.20` |',
    '| Command Nexus version | `1.0.21` |',
    'source README version',
)
source_readme = replace_once(
    source_readme,
    "The source is merged and installable. Mission Control uses a dedicated iOS Safari-only safe-area layout while the established desktop dimensions, saved positioning and mouse interaction remain unchanged. Deeper interface, lifecycle and storage consolidation remains subject to testing and MartyBlyth's technical direction.",
    "The source is merged and installable. On iOS Safari, Resource Administration is reconciled against the rendered personal Stations view, removes itself from other responsive views and recreates exactly once when Stations returns. Mission Control uses a dedicated iOS Safari-only safe-area layout while the established desktop dimensions, saved positioning and mouse interaction remain unchanged. Deeper interface, lifecycle and storage consolidation remains subject to testing and MartyBlyth's technical direction.",
    'source README lifecycle model',
)
source_readme_path.write_text(source_readme, encoding='utf-8', newline='\n')

print('Issue #95 structural patch completed.', flush=True)
