from __future__ import annotations

from pathlib import Path
import re


SOURCE_PATH = Path('src/missionchief-command-nexus.user.js')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    print(f'{label}: matches={count}', flush=True)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


def find_function_range(text: str, name: str) -> tuple[int, int]:
    match = re.search(
        rf'(?m)^[ \t]*(?:async[ \t]+)?function[ \t]+{re.escape(name)}[ \t]*\([^)]*\)[ \t]*\{{',
        text,
    )
    if not match:
        raise SystemExit(f'Unable to find function {name}')

    opening = text.rfind('{', match.start(), match.end())
    depth = 0
    state = 'code'
    quote = ''
    escaped = False
    index = opening

    while index < len(text):
        character = text[index]
        following = text[index + 1] if index + 1 < len(text) else ''

        if state == 'line':
            if character == '\n':
                state = 'code'
            index += 1
            continue

        if state == 'block':
            if character == '*' and following == '/':
                state = 'code'
                index += 2
                continue
            index += 1
            continue

        if state in {'string', 'template'}:
            if escaped:
                escaped = False
            elif character == '\\':
                escaped = True
            elif character == quote:
                state = 'code'
                quote = ''
            index += 1
            continue

        if character == '/' and following == '/':
            state = 'line'
            index += 2
            continue
        if character == '/' and following == '*':
            state = 'block'
            index += 2
            continue
        if character in {"'", '"'}:
            state = 'string'
            quote = character
            index += 1
            continue
        if character == '`':
            state = 'template'
            quote = character
            index += 1
            continue
        if character == '{':
            depth += 1
        elif character == '}':
            depth -= 1
            if depth == 0:
                return match.start(), index + 1
        index += 1

    raise SystemExit(f'Unable to close function {name}')


def replace_function(text: str, name: str, replacement: str) -> str:
    start, end = find_function_range(text, name)
    print(f'{name}: structural replacement', flush=True)
    return text[:start] + replacement.rstrip() + text[end:]


def insert_style_override(
    text: str,
    function_name: str,
    css: str,
) -> str:
    start, end = find_function_range(text, function_name)
    function_text = text[start:end]
    marker = '\n        `;\n'
    insertion = function_text.rfind(marker)
    if insertion < 0:
        raise SystemExit(
            f'Unable to find style template terminator in {function_name}'
        )
    function_text = (
        function_text[:insertion]
        + '\n'
        + css.rstrip()
        + function_text[insertion:]
    )
    print(f'{function_name}: visual system CSS inserted', flush=True)
    return text[:start] + function_text + text[end:]


source = SOURCE_PATH.read_text(encoding='utf-8')
source = replace_once(
    source,
    '// @version      1.0.69',
    '// @version      1.0.70',
    'userscript version',
)
source = replace_once(
    source,
    ' * MODULE 2: MISSION FINDER V10.6.132',
    ' * MODULE 2: MISSION FINDER V10.6.133',
    'Mission Finder version',
)
source = replace_once(
    source,
    "    // V10.6.132: Mission Control now uses one integrated MissionChief Nexus",
    "    // V10.6.133: all desktop Command Nexus surfaces now share one low-glare,\n"
    "    // tokenised Nexus visual system with responsive information grids, plain\n"
    "    // operational labels and bounded text/data flow. Existing IDs, handlers,\n"
    "    // data authority and the established iPhone/iOS lifecycle remain unchanged.\n"
    "    // V10.6.132: Mission Control now uses one integrated MissionChief Nexus",
    'V10.6.133 implementation note',
)

# ---------------------------------------------------------------------------
# Unit / Station / Personnel workspace DOM
# ---------------------------------------------------------------------------
source = replace_once(
    source,
    '''            <div id="mc-namer-header">
                <span id="mc-namer-header-title">🚒 Unit Naming Tool v${UNIT_VERSION}</span>
                <button id="mc-namer-collapse" type="button" aria-expanded="true" title="Collapse naming tools">−</button>
            </div>''',
    '''            <div id="mc-namer-header">
                <div class="mc-nexus-brand-block">
                    <span class="mc-nexus-mark" aria-hidden="true">NX</span>
                    <span class="mc-nexus-brand-copy">
                        <span class="mc-nexus-eyebrow">MISSIONCHIEF COMMAND NEXUS</span>
                        <span id="mc-namer-header-title">Unit Naming</span>
                    </span>
                </div>
                <div class="mc-nexus-header-actions">
                    <span id="mc-namer-header-version" class="mc-nexus-version-chip">v${UNIT_VERSION}</span>
                    <button id="mc-namer-collapse" type="button" aria-expanded="true" title="Collapse Nexus tools">−</button>
                </div>
            </div>''',
    'Nexus workspace header',
)
source = replace_once(
    source,
    '''            <div class="mc-namer-tabs" role="tablist" aria-label="Naming tools">
                <button id="mc-tab-unit" class="mc-namer-tab active" type="button" role="tab" aria-selected="true">
                    🚒 Unit Naming Tool
                </button>
                <button id="mc-tab-station" class="mc-namer-tab" type="button" role="tab" aria-selected="false">
                    🏢 Station Naming Tool
                </button>
                <button id="mc-tab-personnel" class="mc-namer-tab" type="button" role="tab" aria-selected="false">
                    👥 Personnel Assignment
                </button>
            </div>''',
    '''            <div class="mc-namer-tabs" role="tablist" aria-label="Command Nexus tools">
                <button id="mc-tab-unit" class="mc-namer-tab active" type="button" role="tab" aria-selected="true">
                    <span class="mc-nexus-tab-index">01</span><span>Unit Naming</span>
                </button>
                <button id="mc-tab-station" class="mc-namer-tab" type="button" role="tab" aria-selected="false">
                    <span class="mc-nexus-tab-index">02</span><span>Station Naming</span>
                </button>
                <button id="mc-tab-personnel" class="mc-namer-tab" type="button" role="tab" aria-selected="false">
                    <span class="mc-nexus-tab-index">03</span><span>Personnel</span>
                </button>
            </div>''',
    'plain Nexus workspace tabs',
)

# Assign semantic layout classes without changing existing IDs or controls.
source = replace_once(
    source,
    '''            <div id="mc-unit-view" class="mc-tool-view">
                <div class="mc-namer-section">''',
    '''            <div id="mc-unit-view" class="mc-tool-view mc-nexus-tool-grid">
                <div class="mc-namer-section mc-nexus-config-card">''',
    'Unit Naming workspace classes',
)
source = replace_once(
    source,
    '''                <div class="mc-namer-buttons">
                    <button id="mc-namer-refresh">''',
    '''                <div class="mc-namer-buttons mc-nexus-action-bar">
                    <button id="mc-namer-refresh">''',
    'Unit Naming action bar',
)
source = replace_once(
    source,
    '''                <div class="mc-namer-section">
                    <div><b>Status:</b> <span id="mc-namer-status">''',
    '''                <div class="mc-namer-section mc-nexus-status-card">
                    <div><b>Status:</b> <span id="mc-namer-status">''',
    'Unit Naming status card',
)
source = replace_once(
    source,
    '<div id="mc-namer-log"></div>',
    '<div id="mc-namer-log" class="mc-nexus-log"></div>',
    'Unit Naming log class',
)

source = replace_once(
    source,
    '''            <div id="mc-station-view" class="mc-tool-view" style="display:none;">
                <div class="mc-namer-section">''',
    '''            <div id="mc-station-view" class="mc-tool-view mc-nexus-tool-grid" style="display:none;">
                <div class="mc-namer-section mc-nexus-config-card">''',
    'Station Naming workspace classes',
)
source = replace_once(
    source,
    '''                <div class="mc-namer-buttons">
                    <button id="mc-station-refresh">''',
    '''                <div class="mc-namer-buttons mc-nexus-action-bar">
                    <button id="mc-station-refresh">''',
    'Station Naming action bar',
)
source = replace_once(
    source,
    '''                <div class="mc-namer-section">
                    <div><b>Status:</b> <span id="mc-station-status">''',
    '''                <div class="mc-namer-section mc-nexus-status-card">
                    <div><b>Status:</b> <span id="mc-station-status">''',
    'Station Naming status card',
)
source = replace_once(
    source,
    '<div id="mc-station-log"></div>',
    '<div id="mc-station-log" class="mc-nexus-log"></div>',
    'Station Naming log class',
)

source = replace_once(
    source,
    '''            <div id="mc-personnel-view" class="mc-tool-view" style="display:none;">
                <div class="mc-namer-section mc-personnel-navigation-section">''',
    '''            <div id="mc-personnel-view" class="mc-tool-view mc-nexus-tool-grid mc-nexus-personnel-grid" style="display:none;">
                <div class="mc-namer-section mc-personnel-navigation-section mc-nexus-config-card">''',
    'Personnel workspace classes',
)
source = replace_once(
    source,
    '''                <div class="mc-namer-buttons">
                    <button id="mc-personnel-refresh">''',
    '''                <div class="mc-namer-buttons mc-nexus-action-bar">
                    <button id="mc-personnel-refresh">''',
    'Personnel action bar',
)
source = replace_once(
    source,
    '''                <div class="mc-namer-section">
                    <div><b>Status:</b> <span id="mc-personnel-status">''',
    '''                <div class="mc-namer-section mc-nexus-status-card">
                    <div><b>Status:</b> <span id="mc-personnel-status">''',
    'Personnel status card',
)
source = replace_once(
    source,
    'class="mc-namer-section mc-personnel-training-shortfall-section"',
    'class="mc-namer-section mc-personnel-training-shortfall-section mc-nexus-alert-card"',
    'Personnel shortfall analysis class',
)
source = replace_once(
    source,
    'class="mc-namer-section mc-personnel-report-options"',
    'class="mc-namer-section mc-personnel-report-options mc-nexus-report-controls"',
    'Personnel report controls class',
)
source = replace_once(
    source,
    'class="mc-namer-section mc-personnel-report-section">\n                    <b>Latest Station After-Action Report</b>',
    'class="mc-namer-section mc-personnel-report-section mc-nexus-station-report">\n                    <b>Latest Station After-Action Report</b>',
    'Personnel station report class',
)
source = replace_once(
    source,
    'class="mc-namer-section mc-personnel-report-section">\n                    <b>Overall Run Report</b>',
    'class="mc-namer-section mc-personnel-report-section mc-nexus-overall-report">\n                    <b>Overall Run Report</b>',
    'Personnel overall report class',
)
source = replace_once(
    source,
    '<div class="mc-personnel-log-heading">Live Activity Log</div>\n                <div id="mc-personnel-log"></div>',
    '<div class="mc-personnel-log-heading mc-nexus-log-heading">Live Activity Log</div>\n                <div id="mc-personnel-log" class="mc-nexus-log"></div>',
    'Personnel log classes',
)

new_switch_tool_tab = r'''    function switchToolTab(tabName, force = false) {
        const targetTab = ['unit', 'station', 'personnel'].includes(tabName)
            ? tabName
            : 'unit';
        const panel = document.querySelector('#mc-namer-panel');
        const unitView = document.querySelector('#mc-unit-view');
        const stationView = document.querySelector('#mc-station-view');
        const personnelView = document.querySelector('#mc-personnel-view');
        const unitTab = document.querySelector('#mc-tab-unit');
        const stationTab = document.querySelector('#mc-tab-station');
        const personnelTab = document.querySelector('#mc-tab-personnel');
        const headerTitle = document.querySelector('#mc-namer-header-title');
        const headerVersion = document.querySelector('#mc-namer-header-version');

        if (
            !panel ||
            !unitView ||
            !stationView ||
            !personnelView ||
            !unitTab ||
            !stationTab ||
            !personnelTab ||
            !headerTitle ||
            !headerVersion
        ) {
            return;
        }

        if (!force && STATE.running && targetTab !== 'unit') {
            log('Stop the Unit Naming Tool before switching tabs.', 'error');
            return;
        }

        if (!force && STATION_STATE.running && targetTab !== 'station') {
            stationLog('Stop the Station Naming Tool before switching tabs.', 'error');
            return;
        }

        if (!force && PERSONNEL_STATE.running && targetTab !== 'personnel') {
            personnelLog('Stop Personnel Assignment before switching tabs.', 'error');
            return;
        }

        const showUnit = targetTab === 'unit';
        const showStation = targetTab === 'station';
        const showPersonnel = targetTab === 'personnel';

        unitView.style.display = showUnit ? 'grid' : 'none';
        stationView.style.display = showStation ? 'grid' : 'none';
        personnelView.style.display = showPersonnel ? 'grid' : 'none';

        unitTab.classList.toggle('active', showUnit);
        stationTab.classList.toggle('active', showStation);
        personnelTab.classList.toggle('active', showPersonnel);
        unitTab.setAttribute('aria-selected', showUnit ? 'true' : 'false');
        stationTab.setAttribute('aria-selected', showStation ? 'true' : 'false');
        personnelTab.setAttribute('aria-selected', showPersonnel ? 'true' : 'false');

        headerTitle.textContent = showUnit
            ? 'Unit Naming'
            : showStation
                ? 'Station Naming'
                : 'Personnel Assignment';
        headerVersion.textContent = showUnit
            ? `v${UNIT_VERSION}`
            : showStation
                ? `v${STATION_VERSION}`
                : `v${PERSONNEL_VERSION}`;
        panel.dataset.activeTool = targetTab;

        try {
            localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, targetTab);
        } catch (_error) {}

        requestAnimationFrame(() => {
            clampToolPanelToViewport(panel);
        });
    }'''
source = replace_function(source, 'switchToolTab', new_switch_tool_tab)

# ---------------------------------------------------------------------------
# Mission dashboard DOM and navigation
# ---------------------------------------------------------------------------
source = replace_once(
    source,
    "        dragHandle.textContent = 'Mission Control';",
    "        dragHandle.textContent = 'Mission';",
    'minimal Mission panel title',
)
source = replace_once(
    source,
    "                <div id=\"mf-load-title\" class=\"mf2026-header\">Vehicle Load List</div>",
    "                <div id=\"mf-load-title\" class=\"mf2026-header\">Vehicle Load</div>",
    'minimal Vehicle panel title',
)

brand_block = r'''

        const dashboardBrand = document.createElement('header');
        dashboardBrand.id = 'mf-dashboard-brand';
        dashboardBrand.innerHTML = `
            <div class="mf-dashboard-brand-copy">
                <span class="mf-dashboard-brand-mark" aria-hidden="true">NX</span>
                <span class="mf-dashboard-brand-text">
                    <span class="mf-dashboard-brand-eyebrow">MISSIONCHIEF COMMAND NEXUS</span>
                    <span class="mf-dashboard-brand-title">Operational command surface</span>
                </span>
            </div>
            <span class="mf-dashboard-brand-state">LIVE MISSION CONTEXT</span>
        `;'''
source = replace_once(
    source,
    "        const dashboardRail = document.createElement('nav');",
    brand_block + "\n\n        const dashboardRail = document.createElement('nav');",
    'Mission dashboard brand header',
)
source = replace_once(
    source,
    '''        dashboardRail.innerHTML = `
            <button type="button" class="mf-dashboard-tab mf-dashboard-tab-active" data-mf-dashboard-tab="mission" aria-pressed="true">
                <span class="mf-dashboard-tab-icon">◎</span>
                <span>Mission</span>
            </button>
            <button type="button" class="mf-dashboard-tab" data-mf-dashboard-tab="settings" aria-pressed="false">
                <span class="mf-dashboard-tab-icon">⚙</span>
                <span>Settings</span>
            </button>
            <button type="button" class="mf-dashboard-tab" data-mf-dashboard-tab="diagnostics" aria-pressed="false">
                <span class="mf-dashboard-tab-icon">⌁</span>
                <span>Diagnostics</span>
            </button>
        `;''',
    '''        dashboardRail.innerHTML = `
            <button type="button" class="mf-dashboard-tab mf-dashboard-tab-active" data-mf-dashboard-tab="mission" aria-pressed="true">
                <span class="mf-dashboard-tab-icon">01</span>
                <span>Mission</span>
            </button>
            <button type="button" class="mf-dashboard-tab" data-mf-dashboard-tab="settings" aria-pressed="false">
                <span class="mf-dashboard-tab-icon">02</span>
                <span>Settings</span>
            </button>
            <button type="button" class="mf-dashboard-tab" data-mf-dashboard-tab="diagnostics" aria-pressed="false">
                <span class="mf-dashboard-tab-icon">03</span>
                <span>Diagnostics</span>
            </button>
        `;''',
    'numbered horizontal Mission dashboard navigation',
)
source = replace_once(
    source,
    "                : '1.0.69';",
    "                : '1.0.70';",
    'Mission dashboard fallback version',
)
source = replace_once(
    source,
    '''        } else {
            wrapper.appendChild(dashboardRail);
            wrapper.appendChild(dashboardUtility);''',
    '''        } else {
            wrapper.appendChild(dashboardBrand);
            wrapper.appendChild(dashboardRail);
            wrapper.appendChild(dashboardUtility);''',
    'Mission dashboard brand append order',
)

# ---------------------------------------------------------------------------
# Shared Nexus visual system — Unit/Station/Personnel tools
# ---------------------------------------------------------------------------
naming_css = r'''

            /* Command Nexus visual system V1.0.70 — desktop naming workspace. */
            #mc-namer-panel:not(.mc-ios-safari) {
                --nx-bg: #080d14;
                --nx-surface: #0d141e;
                --nx-surface-2: #121b27;
                --nx-surface-3: #172230;
                --nx-border: rgba(151, 171, 195, 0.18);
                --nx-border-strong: rgba(95, 195, 228, 0.36);
                --nx-text: #e7edf4;
                --nx-text-2: #b1bfce;
                --nx-muted: #7f8d9c;
                --nx-accent: #5fc3e4;
                --nx-accent-soft: rgba(95, 195, 228, 0.12);
                --nx-success: #62c99a;
                --nx-warning: #d7ad62;
                --nx-danger: #db7d83;
                --nx-radius: 10px;
                --nx-radius-sm: 7px;
                --nx-gap: 8px;
                top: 72px;
                right: 16px;
                width: min(860px, calc(100vw - 32px));
                max-width: calc(100vw - 32px);
                max-height: calc(100vh - 88px);
                border: 1px solid var(--nx-border-strong);
                border-radius: 14px;
                background: var(--nx-bg);
                color: var(--nx-text);
                box-shadow: 0 20px 56px rgba(0, 0, 0, 0.48);
                font-family: Inter, ui-sans-serif, system-ui, -apple-system,
                    BlinkMacSystemFont, "Segoe UI", sans-serif;
                font-size: 12px;
            }

            #mc-namer-panel:not(.mc-ios-safari)[data-active-tool="personnel"] {
                width: min(1080px, calc(100vw - 32px));
            }

            #mc-namer-panel:not(.mc-ios-safari),
            #mc-namer-panel:not(.mc-ios-safari) * {
                box-sizing: border-box;
            }

            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-header {
                min-height: 54px;
                padding: 8px 10px;
                border-bottom: 1px solid var(--nx-border);
                background: var(--nx-surface);
                cursor: move;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-brand-block,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-header-actions {
                display: flex;
                align-items: center;
                min-width: 0;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-brand-block {
                gap: 9px;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-header-actions {
                gap: 7px;
                flex: 0 0 auto;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-mark {
                display: grid;
                place-items: center;
                width: 34px;
                height: 34px;
                flex: 0 0 34px;
                border: 1px solid var(--nx-border-strong);
                border-radius: 9px;
                background: var(--nx-accent-soft);
                color: var(--nx-accent);
                font: 800 12px/1 ui-monospace, SFMono-Regular, Menlo, Consolas,
                    monospace;
                letter-spacing: 0.08em;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-brand-copy {
                display: flex;
                flex-direction: column;
                min-width: 0;
                gap: 2px;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-eyebrow {
                color: var(--nx-muted);
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.13em;
                line-height: 1.1;
            }

            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-header-title {
                color: var(--nx-text);
                font-size: 14px;
                font-weight: 700;
                line-height: 1.2;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-version-chip {
                padding: 4px 7px;
                border: 1px solid var(--nx-border);
                border-radius: 999px;
                background: var(--nx-surface-2);
                color: var(--nx-text-2);
                font: 700 10px/1 ui-monospace, SFMono-Regular, Menlo, Consolas,
                    monospace;
                white-space: nowrap;
            }

            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-collapse {
                width: 30px;
                height: 30px;
                flex-basis: 30px;
                border: 1px solid var(--nx-border);
                border-radius: 8px;
                background: var(--nx-surface-2);
                color: var(--nx-text-2);
                font-size: 16px;
                line-height: 1;
            }

            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-collapse:hover,
            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-collapse:focus-visible {
                border-color: var(--nx-border-strong);
                background: var(--nx-accent-soft);
                color: var(--nx-accent);
                outline: 2px solid transparent;
            }

            #mc-namer-panel:not(.mc-ios-safari).mc-namer-collapsed {
                width: min(340px, calc(100vw - 32px));
            }

            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-body {
                min-height: 0;
                background: var(--nx-bg);
                scrollbar-color: rgba(127, 141, 156, 0.48) transparent;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tabs {
                position: sticky;
                top: 0;
                z-index: 20;
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 4px;
                padding: 6px;
                border-bottom: 1px solid var(--nx-border);
                background: rgba(8, 13, 20, 0.96);
                backdrop-filter: blur(12px);
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tab {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                min-width: 0;
                min-height: 36px;
                padding: 7px 9px;
                border: 1px solid transparent;
                border-radius: 8px;
                background: transparent;
                color: var(--nx-text-2);
                font-size: 11px;
                font-weight: 650;
                line-height: 1.2;
                overflow-wrap: anywhere;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tab-index {
                color: var(--nx-muted);
                font: 700 9px/1 ui-monospace, SFMono-Regular, Menlo, Consolas,
                    monospace;
                letter-spacing: 0.08em;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tab:hover,
            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tab:focus-visible {
                border-color: var(--nx-border);
                background: var(--nx-surface-2);
                color: var(--nx-text);
                outline: none;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tab.active {
                border-color: var(--nx-border-strong);
                background: var(--nx-accent-soft);
                color: var(--nx-text);
                box-shadow: none;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tab.active
            .mc-nexus-tab-index {
                color: var(--nx-accent);
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-tool-view {
                min-width: 0;
                padding: var(--nx-gap);
                background: var(--nx-bg);
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tool-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: var(--nx-gap);
                align-items: start;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-config-card,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-status-card,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-alert-card,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-report-controls,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-report-section {
                min-width: 0;
                padding: 10px;
                border: 1px solid var(--nx-border);
                border-radius: var(--nx-radius);
                background: var(--nx-surface);
                line-height: 1.42;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-config-card {
                grid-column: 1;
                grid-row: 1;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-status-card {
                grid-column: 2;
                grid-row: 1;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
                gap: 6px;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-status-card > div {
                min-width: 0;
                min-height: 56px;
                padding: 8px;
                border: 1px solid rgba(151, 171, 195, 0.12);
                border-radius: var(--nx-radius-sm);
                background: var(--nx-surface-2);
                overflow-wrap: anywhere;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-status-card > div > b {
                display: block;
                margin-bottom: 4px;
                color: var(--nx-muted);
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-status-card > div > span {
                color: var(--nx-text);
                font-variant-numeric: tabular-nums;
                font-weight: 650;
                overflow-wrap: anywhere;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar {
                grid-column: 1 / -1;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(126px, 1fr));
                gap: 6px;
                padding: 0;
                border: 0;
                background: transparent;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar button {
                min-width: 0;
                min-height: 36px;
                padding: 7px 9px;
                border: 1px solid var(--nx-border) !important;
                border-radius: 8px;
                background: var(--nx-surface-2) !important;
                color: var(--nx-text-2) !important;
                font-size: 11px;
                font-weight: 650;
                line-height: 1.2;
                white-space: normal;
                overflow-wrap: anywhere;
                transition: border-color 120ms ease, background 120ms ease,
                    color 120ms ease, transform 120ms ease;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar button:hover,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar button:focus-visible {
                border-color: var(--nx-border-strong) !important;
                background: var(--nx-surface-3) !important;
                color: var(--nx-text) !important;
                outline: none;
                transform: translateY(-1px);
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar
            :is(#mc-namer-start, #mc-station-start, #mc-personnel-start) {
                border-color: rgba(98, 201, 154, 0.42) !important;
                background: rgba(98, 201, 154, 0.11) !important;
                color: #b9ead4 !important;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar
            :is(#mc-namer-pause, #mc-station-pause, #mc-personnel-pause) {
                border-color: rgba(215, 173, 98, 0.42) !important;
                background: rgba(215, 173, 98, 0.10) !important;
                color: #ead4a8 !important;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar
            :is(#mc-namer-stop, #mc-station-stop, #mc-personnel-stop) {
                border-color: rgba(219, 125, 131, 0.42) !important;
                background: rgba(219, 125, 131, 0.10) !important;
                color: #efb9bd !important;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar
            :is(#mc-namer-refresh, #mc-station-refresh, #mc-personnel-refresh,
                #mc-personnel-build-register, #mc-personnel-full-register) {
                border-color: var(--nx-border-strong) !important;
                background: var(--nx-accent-soft) !important;
                color: #bfe8f5 !important;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-log,
            #mc-namer-panel:not(.mc-ios-safari) #mc-personnel-report,
            #mc-namer-panel:not(.mc-ios-safari) #mc-personnel-after-action {
                min-width: 0;
                border: 1px solid var(--nx-border);
                border-radius: var(--nx-radius);
                background: #070b11;
                color: #c7d3df;
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
                    monospace;
                font-size: 10.5px;
                line-height: 1.48;
                overflow-wrap: anywhere;
                scrollbar-color: rgba(127, 141, 156, 0.48) transparent;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-log {
                grid-column: 1 / -1;
                max-height: 240px;
                padding: 9px 10px;
            }

            #mc-namer-panel:not(.mc-ios-safari) label,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-navigation-title,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-log-heading,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-report-section > b,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-report-options > b {
                color: var(--nx-text-2);
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.04em;
            }

            #mc-namer-panel:not(.mc-ios-safari) select,
            #mc-namer-panel:not(.mc-ios-safari) input:not([type="checkbox"]):not([type="file"]) {
                width: 100%;
                min-width: 0;
                min-height: 36px;
                margin-top: 4px;
                padding: 7px 9px;
                border: 1px solid var(--nx-border);
                border-radius: 8px;
                background: var(--nx-surface-2);
                color: var(--nx-text);
                font: 500 12px/1.25 Inter, ui-sans-serif, system-ui,
                    sans-serif;
            }

            #mc-namer-panel:not(.mc-ios-safari) select:focus-visible,
            #mc-namer-panel:not(.mc-ios-safari) input:focus-visible,
            #mc-namer-panel:not(.mc-ios-safari) button:focus-visible {
                outline: 2px solid rgba(95, 195, 228, 0.58);
                outline-offset: 1px;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-profile-banner,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-policy-summary,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-fixed-grid > div,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-report-toggle {
                border-color: var(--nx-border);
                background: var(--nx-surface-2);
                color: var(--nx-text-2);
                box-shadow: none;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-profile-banner.is-live {
                border-color: rgba(98, 201, 154, 0.42);
                background: rgba(98, 201, 154, 0.09);
                color: #b9ead4;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-profile-banner.is-preview {
                border-color: rgba(215, 173, 98, 0.42);
                background: rgba(215, 173, 98, 0.09);
                color: #ead4a8;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-policy-summary {
                border-left: 3px solid var(--nx-accent);
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid {
                grid-template-columns: minmax(290px, 0.85fr) minmax(0, 1.15fr);
                grid-template-areas:
                    "config status"
                    "actions actions"
                    "alert alert"
                    "report-controls report-controls"
                    "station-report overall-report"
                    "log-heading log-heading"
                    "log log";
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-config-card {
                grid-area: config;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-status-card {
                grid-area: status;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-action-bar {
                grid-area: actions;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-alert-card {
                grid-area: alert;
                border-color: rgba(219, 125, 131, 0.38);
                background: rgba(219, 125, 131, 0.07);
                box-shadow: none;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-report-controls {
                grid-area: report-controls;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-station-report {
                grid-area: station-report;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-overall-report {
                grid-area: overall-report;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-log-heading {
                grid-area: log-heading;
                padding: 7px 2px 0;
                border: 0;
                background: transparent;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-log {
                grid-area: log;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-report-toggle-grid,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-fixed-grid {
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-section,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-report-note,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-input-note,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-training-shortfall-note {
                overflow-wrap: anywhere;
            }

            @media (max-width: 1180px) and (min-width: 901px) {
                #mc-namer-panel:not(.mc-ios-safari),
                #mc-namer-panel:not(.mc-ios-safari)[data-active-tool="personnel"] {
                    width: min(780px, calc(100vw - 24px));
                    right: 12px;
                }

                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @media (max-width: 900px) and (min-width: 701px) {
                #mc-namer-panel:not(.mc-ios-safari),
                #mc-namer-panel:not(.mc-ios-safari)[data-active-tool="personnel"] {
                    top: 12px;
                    right: 12px;
                    width: calc(100vw - 24px);
                    max-height: calc(100vh - 24px);
                }

                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tool-grid,
                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid {
                    grid-template-columns: minmax(0, 1fr);
                    grid-template-areas: none;
                }

                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tool-grid > *,
                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid > * {
                    grid-column: 1 !important;
                    grid-row: auto !important;
                    grid-area: auto !important;
                }
            }

            @media (max-width: 700px) {
                #mc-namer-panel:not(.mc-ios-safari),
                #mc-namer-panel:not(.mc-ios-safari)[data-active-tool="personnel"] {
                    top: 8px;
                    right: 8px;
                    width: calc(100vw - 16px);
                    max-width: calc(100vw - 16px);
                    max-height: calc(100vh - 16px);
                }

                #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tabs {
                    grid-template-columns: minmax(0, 1fr);
                }

                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tool-grid,
                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid {
                    grid-template-columns: minmax(0, 1fr);
                    grid-template-areas: none;
                }

                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tool-grid > *,
                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid > * {
                    grid-column: 1 !important;
                    grid-row: auto !important;
                    grid-area: auto !important;
                }
            }
'''
source = insert_style_override(source, 'addPanel', naming_css)

# ---------------------------------------------------------------------------
# Shared Nexus visual system — desktop Mission dashboard
# ---------------------------------------------------------------------------
mission_css = r'''

            /* Command Nexus visual system V1.0.70 — desktop mission surface. */
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) {
                --nx-bg: #080d14;
                --nx-surface: #0d141e;
                --nx-surface-2: #121b27;
                --nx-surface-3: #172230;
                --nx-border: rgba(151, 171, 195, 0.18);
                --nx-border-strong: rgba(95, 195, 228, 0.36);
                --nx-text: #e7edf4;
                --nx-text-2: #b1bfce;
                --nx-muted: #7f8d9c;
                --nx-accent: #5fc3e4;
                --nx-accent-soft: rgba(95, 195, 228, 0.12);
                --nx-success: #62c99a;
                --nx-warning: #d7ad62;
                --nx-danger: #db7d83;
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                grid-template-areas:
                    "brand brand brand"
                    "rail rail rail"
                    "control load trained"
                    "utility utility utility"
                    "footer footer footer";
                align-items: start;
                gap: 8px;
                width: min(1120px, calc(100vw - 32px));
                max-width: calc(100vw - 32px);
                max-height: calc(100vh - 32px);
                padding: 9px;
                overflow: auto;
                border: 1px solid var(--nx-border-strong);
                border-radius: 14px;
                background: var(--nx-bg);
                box-shadow: 0 22px 60px rgba(0, 0, 0, 0.52);
                color: var(--nx-text);
                font-family: Inter, ui-sans-serif, system-ui, -apple-system,
                    BlinkMacSystemFont, "Segoe UI", sans-serif;
                scrollbar-color: rgba(127, 141, 156, 0.48) transparent;
            }

            #mission-finder-wrapper.mf-nexus-dashboard.mf-dashboard-utility-open:not(.mf2026-ios-safari) {
                grid-template-columns: repeat(3, minmax(0, 1fr));
                grid-template-areas:
                    "brand brand brand"
                    "rail rail rail"
                    "control load trained"
                    "utility utility utility"
                    "footer footer footer";
                width: min(1120px, calc(100vw - 32px));
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari),
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) * {
                box-sizing: border-box;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-dashboard-brand {
                grid-area: brand;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                min-width: 0;
                min-height: 48px;
                padding: 7px 9px;
                border: 1px solid var(--nx-border);
                border-radius: 10px;
                background: var(--nx-surface);
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-brand-copy,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-brand-text {
                display: flex;
                min-width: 0;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-brand-copy {
                align-items: center;
                gap: 9px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-brand-text {
                flex-direction: column;
                gap: 2px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-brand-mark {
                display: grid;
                place-items: center;
                width: 34px;
                height: 34px;
                flex: 0 0 34px;
                border: 1px solid var(--nx-border-strong);
                border-radius: 9px;
                background: var(--nx-accent-soft);
                color: var(--nx-accent);
                font: 800 12px/1 ui-monospace, SFMono-Regular, Menlo, Consolas,
                    monospace;
                letter-spacing: 0.08em;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-brand-eyebrow {
                color: var(--nx-muted);
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.13em;
                line-height: 1.1;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-brand-title {
                color: var(--nx-text);
                font-size: 14px;
                font-weight: 700;
                line-height: 1.2;
                overflow-wrap: anywhere;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-brand-state {
                flex: 0 0 auto;
                padding: 5px 8px;
                border: 1px solid rgba(98, 201, 154, 0.34);
                border-radius: 999px;
                background: rgba(98, 201, 154, 0.08);
                color: #b9ead4;
                font: 700 9px/1 ui-monospace, SFMono-Regular, Menlo, Consolas,
                    monospace;
                letter-spacing: 0.08em;
                white-space: nowrap;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-dashboard-rail {
                grid-area: rail;
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: 4px;
                padding: 4px;
                border: 1px solid var(--nx-border);
                border-radius: 9px;
                background: var(--nx-surface);
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-tab {
                display: flex;
                flex: 0 1 160px;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                gap: 7px;
                min-width: 0;
                min-height: 34px;
                padding: 6px 10px;
                border: 1px solid transparent;
                border-radius: 7px;
                background: transparent;
                color: var(--nx-text-2);
                font-size: 11px;
                font-weight: 650;
                line-height: 1.2;
                overflow-wrap: anywhere;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-tab-icon {
                color: var(--nx-muted);
                font: 700 9px/1 ui-monospace, SFMono-Regular, Menlo, Consolas,
                    monospace;
                letter-spacing: 0.08em;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-tab:hover,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-tab:focus-visible {
                border-color: var(--nx-border);
                background: var(--nx-surface-2);
                color: var(--nx-text);
                outline: none;
                box-shadow: none;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-tab.mf-dashboard-tab-active {
                border-color: var(--nx-border-strong);
                background: var(--nx-accent-soft);
                color: var(--nx-text);
                box-shadow: none;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-tab.mf-dashboard-tab-active .mf-dashboard-tab-icon {
                color: var(--nx-accent);
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-panel,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-dashboard-utility {
                min-width: 0;
                width: auto;
                max-height: calc(100vh - 156px);
                border: 1px solid var(--nx-border);
                border-radius: 10px;
                background: var(--nx-surface);
                box-shadow: none;
                overflow: hidden;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #control-panel {
                grid-area: control;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #vehicle-load-list-box {
                grid-area: load;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #trained-personnel-box {
                grid-area: trained;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-dashboard-utility {
                grid-area: utility;
                max-height: min(360px, calc(100vh - 180px));
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-control-header-row,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-load-header-row,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-trained-header-row,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-utility-header {
                min-height: 42px;
                padding: 6px 8px;
                border-bottom: 1px solid var(--nx-border);
                background: var(--nx-surface-2);
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-header,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-dashboard-utility-title {
                min-width: 0;
                padding: 0;
                background: transparent;
                color: var(--nx-text);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.06em;
                text-align: left;
                text-transform: uppercase;
                overflow-wrap: anywhere;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-control-title::before,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-load-title::before,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-trained-title::before {
                content: "";
                width: 5px;
                height: 5px;
                flex: 0 0 5px;
                border-radius: 50%;
                background: var(--nx-accent);
                box-shadow: none;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-trained-title::before {
                background: #b49add;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-control-body,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-load-body,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-trained-body,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-utility-pane {
                min-width: 0;
                min-height: 0;
                padding: 8px;
                gap: 7px;
                overflow-y: auto;
                scrollbar-color: rgba(127, 141, 156, 0.48) transparent;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-box {
                min-width: 0;
                padding: 8px;
                border: 1px solid rgba(151, 171, 195, 0.12);
                border-radius: 8px;
                background: var(--nx-surface-2);
                overflow-wrap: anywhere;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #status-box {
                min-height: 48px;
                background: rgba(95, 195, 228, 0.055);
                color: var(--nx-text-2);
                line-height: 1.42;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-section-title {
                margin-bottom: 5px;
                color: var(--nx-text);
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                overflow-wrap: anywhere;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-small,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-name,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-training-course-list {
                min-width: 0;
                color: var(--nx-text-2);
                line-height: 1.42;
                overflow-wrap: anywhere;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-count,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-log-value,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-stat-grid strong {
                font-variant-numeric: tabular-nums;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-row,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-log-row {
                min-width: 0;
                border-bottom-color: rgba(151, 171, 195, 0.10);
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-primary-actions {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 6px;
                margin-top: auto;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-primary-actions .mf2026-button,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-export-unit-finder-diagnostics,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-control-centre,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-control-minimize,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-load-minimize,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-trained-minimize,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-dashboard-utility-close {
                min-width: 0;
                min-height: 36px;
                padding: 7px 8px;
                border: 1px solid var(--nx-border) !important;
                border-radius: 8px;
                background: var(--nx-surface-2) !important;
                color: var(--nx-text-2) !important;
                font-size: 10.5px;
                font-weight: 650;
                line-height: 1.2;
                white-space: normal;
                overflow-wrap: anywhere;
                box-shadow: none;
                transition: border-color 120ms ease, background 120ms ease,
                    color 120ms ease, transform 120ms ease;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-button:hover,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-button:focus-visible,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-dashboard-utility-close:hover,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-dashboard-utility-close:focus-visible {
                border-color: var(--nx-border-strong) !important;
                background: var(--nx-surface-3) !important;
                color: var(--nx-text) !important;
                filter: none;
                outline: none;
                transform: translateY(-1px);
                box-shadow: none;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            :is(#unit-finder-box, #mission-update-box) {
                border-color: var(--nx-border-strong) !important;
                background: var(--nx-accent-soft) !important;
                color: #c4eaf5 !important;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-ally-steal {
                border-color: rgba(180, 154, 221, 0.36) !important;
                background: rgba(180, 154, 221, 0.09) !important;
                color: #d9c9ef !important;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #dispatch-share-box {
                border-color: rgba(98, 201, 154, 0.42) !important;
                background: rgba(98, 201, 154, 0.10) !important;
                color: #b9ead4 !important;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #auto-mode-box {
                border-color: rgba(180, 154, 221, 0.38) !important;
                background: rgba(180, 154, 221, 0.09) !important;
                color: #d9c9ef !important;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-good {
                color: var(--nx-success);
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-warn {
                color: var(--nx-warning);
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-bad {
                color: var(--nx-danger);
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-progress-wrap {
                height: 7px;
                border-radius: 999px;
                background: #070b11;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-progress-bar {
                height: 7px;
                border-radius: 999px;
                background: var(--nx-success);
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            input,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            select {
                min-width: 0;
                min-height: 36px;
                padding: 7px 9px !important;
                border: 1px solid var(--nx-border) !important;
                border-radius: 8px !important;
                background: var(--nx-surface-2) !important;
                color: var(--nx-text) !important;
                font-size: 12px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            :is(button, input, select):focus-visible {
                outline: 2px solid rgba(95, 195, 228, 0.58);
                outline-offset: 1px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #control-panel.mf2026-control-collapsed,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #vehicle-load-list-box.mf2026-load-collapsed,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #trained-personnel-box.mf2026-trained-collapsed {
                width: auto;
                min-height: 42px;
                padding: 0;
                overflow: hidden;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            :is(#control-panel.mf2026-control-collapsed,
                #vehicle-load-list-box.mf2026-load-collapsed,
                #trained-personnel-box.mf2026-trained-collapsed)
            .mf2026-header {
                min-height: 0;
                padding: 0;
                writing-mode: horizontal-tb;
                text-orientation: mixed;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-dashboard-footer {
                grid-area: footer;
                padding: 2px 4px 0;
                color: var(--nx-muted);
                font: 600 9px/1.3 ui-monospace, SFMono-Regular, Menlo, Consolas,
                    monospace;
                letter-spacing: 0.04em;
                text-align: right;
                overflow-wrap: anywhere;
            }

            @media (max-width: 1180px) and (min-width: 901px) {
                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari),
                #mission-finder-wrapper.mf-nexus-dashboard.mf-dashboard-utility-open:not(.mf2026-ios-safari) {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    grid-template-areas:
                        "brand brand"
                        "rail rail"
                        "control load"
                        "trained trained"
                        "utility utility"
                        "footer footer";
                    width: min(820px, calc(100vw - 24px));
                    max-width: calc(100vw - 24px);
                }

                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
                .mf2026-panel,
                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
                #mf-dashboard-utility {
                    max-height: min(420px, calc(100vh - 170px));
                }
            }

            @media (max-width: 900px) and (min-width: 701px) {
                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari),
                #mission-finder-wrapper.mf-nexus-dashboard.mf-dashboard-utility-open:not(.mf2026-ios-safari) {
                    grid-template-columns: minmax(0, 1fr);
                    grid-template-areas:
                        "brand"
                        "rail"
                        "control"
                        "load"
                        "trained"
                        "utility"
                        "footer";
                    width: min(620px, calc(100vw - 24px));
                    max-width: calc(100vw - 24px);
                    max-height: calc(100vh - 24px);
                }

                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
                .mf2026-panel,
                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
                #mf-dashboard-utility {
                    max-height: none;
                }
            }

            @media (max-width: 700px) {
                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari),
                #mission-finder-wrapper.mf-nexus-dashboard.mf-dashboard-utility-open:not(.mf2026-ios-safari) {
                    grid-template-columns: minmax(0, 1fr);
                    grid-template-areas:
                        "brand"
                        "rail"
                        "control"
                        "load"
                        "trained"
                        "utility"
                        "footer";
                    width: calc(100vw - 16px);
                    max-width: calc(100vw - 16px);
                    max-height: calc(100vh - 16px);
                    padding: 7px;
                }

                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
                #mf-dashboard-brand {
                    align-items: flex-start;
                    flex-direction: column;
                }

                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
                #mf-dashboard-rail {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }

                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
                .mf-dashboard-tab {
                    padding-inline: 5px;
                }
            }
'''
source = insert_style_override(source, 'injectStyles', mission_css)

SOURCE_PATH.write_text(source, encoding='utf-8', newline='\n')

# ---------------------------------------------------------------------------
# Version-pinned checks and release documentation
# ---------------------------------------------------------------------------
for path in Path('scripts').glob('check-*.mjs'):
    text = path.read_text(encoding='utf-8')
    text = text.replace('// @version      1.0.69', '// @version      1.0.70')
    text = text.replace('MISSION FINDER V10.6.132', 'MISSION FINDER V10.6.133')
    text = text.replace('Mission Finder V10.6.132', 'Mission Finder V10.6.133')
    path.write_text(text, encoding='utf-8', newline='\n')

visual_test = r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(value, message) {
  if (!value) fail(message);
}

function extractFunction(name) {
  const match = new RegExp(
    `(?:async\\s+)?function\\s+${name}\\s*\\(`
  ).exec(source);
  if (!match) fail(`Unable to find ${name}`);

  const start = match.index;
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';

    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }

    if (character === '/' && next === '/') {
      const end = source.indexOf('\n', index + 2);
      index = end < 0 ? source.length : end;
      continue;
    }

    if (character === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      if (end < 0) fail(`Unclosed comment in ${name}`);
      index = end + 1;
      continue;
    }

    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  fail(`Unable to extract ${name}`);
}

expect(
  source.includes('// @version      1.0.70'),
  'Command Nexus 1.0.70 metadata missing'
);
expect(
  source.includes('MISSION FINDER V10.6.133'),
  'Mission Finder V10.6.133 header missing'
);

const addPanel = extractFunction('addPanel');
const switchToolTab = extractFunction('switchToolTab');
const createControlPanel = extractFunction('createControlPanel');
const injectStyles = extractFunction('injectStyles');

for (const token of [
  '--nx-bg: #080d14',
  '--nx-surface: #0d141e',
  '--nx-accent: #5fc3e4',
  '--nx-success: #62c99a',
  '--nx-warning: #d7ad62',
  '--nx-danger: #db7d83',
  'font-variant-numeric: tabular-nums',
  'overflow-wrap: anywhere',
  'minmax(0, 1fr)',
  '@media (max-width: 1180px)',
  '@media (max-width: 900px)',
  '@media (max-width: 700px)',
]) {
  expect(source.includes(token), `Shared visual contract missing ${token}`);
}

for (const token of [
  'mc-nexus-brand-block',
  'MISSIONCHIEF COMMAND NEXUS',
  'mc-nexus-version-chip',
  '<span class="mc-nexus-tab-index">01</span><span>Unit Naming</span>',
  '<span class="mc-nexus-tab-index">02</span><span>Station Naming</span>',
  '<span class="mc-nexus-tab-index">03</span><span>Personnel</span>',
  'mc-nexus-config-card',
  'mc-nexus-status-card',
  'mc-nexus-action-bar',
  'mc-nexus-log',
  'mc-nexus-personnel-grid',
]) {
  expect(addPanel.includes(token), `Naming workspace contract missing ${token}`);
}

expect(
  !addPanel.includes('🚒 Unit Naming Tool'),
  'Decorative emoji Unit Naming tab must be removed'
);
expect(
  !addPanel.includes('🏢 Station Naming Tool'),
  'Decorative emoji Station Naming tab must be removed'
);
expect(
  !addPanel.includes('👥 Personnel Assignment'),
  'Decorative emoji Personnel tab must be removed'
);

for (const token of [
  "unitView.style.display = showUnit ? 'grid' : 'none'",
  "stationView.style.display = showStation ? 'grid' : 'none'",
  "personnelView.style.display = showPersonnel ? 'grid' : 'none'",
  "panel.dataset.activeTool = targetTab",
  "? 'Unit Naming'",
  "? 'Station Naming'",
  "'Personnel Assignment'",
  'headerVersion.textContent',
  'clampToolPanelToViewport(panel)',
]) {
  expect(
    switchToolTab.includes(token),
    `Responsive tool-tab contract missing ${token}`
  );
}

for (const token of [
  "dashboardBrand.id = 'mf-dashboard-brand'",
  'Operational command surface',
  'LIVE MISSION CONTEXT',
  '<span class="mf-dashboard-tab-icon">01</span>',
  '<span class="mf-dashboard-tab-icon">02</span>',
  '<span class="mf-dashboard-tab-icon">03</span>',
  'wrapper.appendChild(dashboardBrand)',
  "dragHandle.textContent = 'Mission'",
]) {
  expect(
    createControlPanel.includes(token),
    `Mission dashboard visual contract missing ${token}`
  );
}

for (const token of [
  '#mf-dashboard-brand',
  'grid-template-areas:',
  '"brand brand brand"',
  '"control load trained"',
  'flex-direction: row',
  '#mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)',
]) {
  expect(
    injectStyles.includes(token),
    `Mission dashboard CSS contract missing ${token}`
  );
}

// Operational IDs and event owners must remain unchanged.
for (const token of [
  "unitFinderBtn.id = 'unit-finder-box'",
  "allyStealBtn.id = 'mf-ally-steal'",
  "missionUpdateBtn.id = 'mission-update-box'",
  "dispatchBtn.id = 'dispatch-box'",
  "dispatchShareBtn.id = 'dispatch-share-box'",
  "autoModeBtn.id = 'auto-mode-box'",
  "unitFinderBtn.addEventListener('click'",
  "allyStealBtn.addEventListener('click'",
  "triggerDispatchClick()",
  "triggerDispatchShareClick()",
  "toggleAutoMode()",
  "MF_EVENT_SCANNER_ENABLED_KEY",
  "startMissionEventCollectibleCollector()",
  "stopMissionEventCollectibleCollector()",
]) {
  expect(source.includes(token), `Operational ownership missing ${token}`);
}

expect(
  createControlPanel.includes(
    'wrapper.appendChild(loadPanel);\n        wrapper.appendChild(trainedPanel);\n        document.body.appendChild(wrapper);\n\n        scheduleMissionRequiredPersonnelPreload(0);'
  ),
  'Required Personnel preload mount lifecycle changed'
);

// Shared styling must never absorb the established iOS geometry.
expect(
  source.includes('#mc-namer-panel:not(.mc-ios-safari)'),
  'Naming visual system must exclude iOS Safari geometry'
);
expect(
  injectStyles.includes(
    '#mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)'
  ),
  'Mission visual system must exclude iOS Safari geometry'
);
expect(
  source.includes('#mc-namer-panel.mc-ios-safari'),
  'Existing naming-tool iOS styling was removed'
);
expect(
  source.includes('#mission-finder-wrapper.mf2026-iphone-safari'),
  'Existing iPhone mission styling was removed'
);

console.log(
  'Command Nexus V1.0.70 visual system, responsive layout and ownership checks passed.'
);
'''
Path('scripts/check-nexus-visual-system-v1070.mjs').write_text(
    visual_test,
    encoding='utf-8',
    newline='\n',
)

workflow_path = Path('.github/workflows/validate-userscript.yml')
workflow = workflow_path.read_text(encoding='utf-8')
workflow = replace_once(
    workflow,
    "      - 'scripts/check-mission-dashboard-v1069.mjs'\n",
    "      - 'scripts/check-mission-dashboard-v1069.mjs'\n      - 'scripts/check-nexus-visual-system-v1070.mjs'\n",
    'validation workflow visual-system path 1',
)
workflow = replace_once(
    workflow,
    "      - 'scripts/check-mission-dashboard-v1069.mjs'\n",
    "      - 'scripts/check-mission-dashboard-v1069.mjs'\n      - 'scripts/check-nexus-visual-system-v1070.mjs'\n",
    'validation workflow visual-system path 2',
)
workflow = replace_once(
    workflow,
    '''      - name: Validate integrated MissionChief Nexus dashboard
        run: node scripts/check-mission-dashboard-v1069.mjs
''',
    '''      - name: Validate integrated MissionChief Nexus dashboard
        run: node scripts/check-mission-dashboard-v1069.mjs

      - name: Validate Command Nexus visual system
        run: node scripts/check-nexus-visual-system-v1070.mjs
''',
    'validation workflow visual-system step',
)
workflow_path.write_text(workflow, encoding='utf-8', newline='\n')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
section = '''## [1.0.70] - 2026-07-31

### Redesigned

- Introduced one low-glare, tokenised Nexus visual system across Mission Control, Vehicle Load, Trained Personnel, Unit Naming, Station Naming and Personnel Assignment.
- Replaced the desktop Mission dashboard's vertical utility rail with a compact numbered horizontal Mission, Settings and Diagnostics navigation strip.
- Added a restrained Nexus identity header and responsive three-column, two-column and one-column information layouts.
- Rebuilt the naming and assignment workspace around clear configuration, action, status, analysis, report and log regions while preserving every existing control ID and handler.
- Converted dense operational status text into responsive metric grids with safe wrapping, tabular counts and bounded internal scrolling.
- Removed decorative emoji navigation labels and high-saturation action gradients in favour of precise plain labels and restrained semantic state colour.

### Accessibility and adaptability

- Added visible keyboard focus, consistent disabled states, safe long-label wrapping, `min-width: 0` grid containment and `overflow-wrap: anywhere` across operational surfaces.
- Added responsive layout contracts at 1180px, 900px and 700px while retaining the established iPhone/iOS geometry and lifecycle.
- Collapsed desktop mission cards now remain horizontal compact headers instead of using vertical text.

### Safety

- Mission-definition Required Personnel preload, mission identity validation, Unit Finder, Mission Update, Ally Steal, dispatch, Dispatch & Share, Auto Mode, Event Scanner, Vehicle Load, trained-personnel optimisation and Personnel Register authority remain unchanged.
- Unit Naming, Station Naming and Personnel Assignment execution, storage and lifecycle paths remain unchanged.
- Added permanent visual-system, responsive-layout, iOS-isolation and operational-ownership regression coverage.

### Changed engine baseline

- Mission Finder increased from `V10.6.132` to `V10.6.133`.
- Unit Naming remains `3.3.8`.
- Station Naming remains `1.3.3`.
- Personnel Assignment remains `1.3.8`.


'''
changelog = replace_once(
    changelog,
    '## [1.0.69] - 2026-07-31',
    section + '## [1.0.69] - 2026-07-31',
    'v1.0.70 changelog section',
)
changelog_path.write_text(changelog, encoding='utf-8', newline='\n')

readme_path = Path('README.md')
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(
    readme,
    '**Current version:** `1.0.69` · **Mission Finder engine:** `V10.6.132`',
    '**Current version:** `1.0.70` · **Mission Finder engine:** `V10.6.133`',
    'README version baseline',
)
readme = replace_once(
    readme,
    'MissionChief Nexus dashboard',
    'MissionChief Nexus adaptive command surface',
    'README dashboard terminology',
)
readme_path.write_text(readme, encoding='utf-8', newline='\n')

src_readme_path = Path('src/README.md')
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = src_readme.replace(
    '| Command Nexus version | `1.0.69` |',
    '| Command Nexus version | `1.0.70` |',
)
src_readme = src_readme.replace(
    '| Mission Finder baseline | `V10.6.132` |',
    '| Mission Finder baseline | `V10.6.133` |',
)
source_note = '''

### Nexus visual system

Desktop mission and naming/assignment surfaces share one low-glare tokenised design system. The Mission dashboard uses a numbered horizontal Mission, Settings and Diagnostics strip with responsive three-, two- and one-column layouts. Unit Naming, Station Naming and Personnel Assignment use responsive configuration, action, status, analysis, report and log regions. Existing IDs and handlers remain authoritative. All new desktop selectors explicitly exclude the established iPhone/iOS geometry.
'''
if '### Nexus visual system' not in src_readme:
    src_readme = src_readme.rstrip() + source_note + '\n'
src_readme_path.write_text(src_readme, encoding='utf-8', newline='\n')

print('Command Nexus V1.0.70 visual-system patch applied.')
