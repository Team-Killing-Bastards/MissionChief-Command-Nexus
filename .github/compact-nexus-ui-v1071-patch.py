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


def insert_style_override(text: str, function_name: str, css: str) -> str:
    start, end = find_function_range(text, function_name)
    function_text = text[start:end]
    marker = '\n        `;\n'
    insertion = function_text.rfind(marker)
    if insertion < 0:
        raise SystemExit(f'Unable to find style terminator in {function_name}')
    function_text = (
        function_text[:insertion]
        + '\n'
        + css.rstrip()
        + function_text[insertion:]
    )
    print(f'{function_name}: compact CSS inserted', flush=True)
    return text[:start] + function_text + text[end:]


source = SOURCE_PATH.read_text(encoding='utf-8')
source = replace_once(
    source,
    '// @version      1.0.70',
    '// @version      1.0.71',
    'userscript version',
)
source = replace_once(
    source,
    ' * MODULE 2: MISSION FINDER V10.6.133',
    ' * MODULE 2: MISSION FINDER V10.6.134',
    'Mission Finder version',
)

# Fresh desktop disclosure-state keys intentionally supersede the expansive
# v1.0.70 presentation without changing the established iOS keys.
source = replace_once(
    source,
    ": 'mf_control_collapsed_v9';",
    ": 'mf_control_collapsed_v10';",
    'desktop mission collapse key',
)
source = replace_once(
    source,
    ": 'mf_vehicle_load_collapsed_v9';",
    ": 'mf_vehicle_load_collapsed_v10';",
    'desktop vehicle collapse key',
)
source = replace_once(
    source,
    ": 'mf_trained_personnel_collapsed_v1';",
    ": 'mf_trained_personnel_collapsed_v2';",
    'desktop trained collapse key',
)
source = replace_once(
    source,
    '''    let mfVehicleLoadCollapsed =
        savedVehicleLoadCollapsed == null
            ? isMissionFinderIosSafariWebsite()
            : savedVehicleLoadCollapsed === 'true';''',
    '''    let mfVehicleLoadCollapsed =
        savedVehicleLoadCollapsed == null
            ? true
            : savedVehicleLoadCollapsed === 'true';''',
    'collapsed-by-default vehicle panel',
)
source = replace_once(
    source,
    "                : '1.0.70';",
    "                : '1.0.71';",
    'mission dashboard fallback version',
)

# Compact progressive-disclosure controller for Unit, Station and Personnel.
compact_disclosure_js = r'''

        const compactDisclosureStoragePrefix =
            'mc_compact_disclosure_v1071_';

        function createCompactDisclosure(
            id,
            label,
            targets,
            defaultOpen = false
        ) {
            const nodes = (Array.isArray(targets) ? targets : [targets])
                .filter(node => node?.isConnected);
            if (!nodes.length) return null;

            const details = document.createElement('details');
            details.id = id;
            details.className = 'mc-compact-disclosure';

            const storageKey =
                `${compactDisclosureStoragePrefix}${id}`;
            let savedState = null;
            try {
                savedState = localStorage.getItem(storageKey);
            } catch (_error) {}
            details.open = savedState == null
                ? Boolean(defaultOpen)
                : savedState === 'true';

            const summary = document.createElement('summary');
            summary.className = 'mc-compact-disclosure-summary';
            summary.innerHTML = `
                <span>${label}</span>
                <span class="mc-compact-summary-mark" aria-hidden="true"></span>
            `;

            const body = document.createElement('div');
            body.className = 'mc-compact-disclosure-body';

            nodes[0].parentNode.insertBefore(details, nodes[0]);
            details.appendChild(summary);
            details.appendChild(body);
            nodes.forEach(node => body.appendChild(node));

            details.addEventListener('toggle', () => {
                try {
                    localStorage.setItem(
                        storageKey,
                        String(details.open)
                    );
                } catch (_error) {}
                requestAnimationFrame(() => {
                    clampToolPanelToViewport(panel);
                });
            });

            return details;
        }

        function createCompactActionDisclosure(
            container,
            selectors,
            label,
            id
        ) {
            if (!container) return null;
            const buttons = selectors
                .map(selector => container.querySelector(selector))
                .filter(Boolean);
            if (!buttons.length) return null;

            const details = createCompactDisclosure(
                id,
                label,
                buttons,
                false
            );
            if (!details) return null;
            details.classList.add('mc-compact-action-disclosure');
            container.appendChild(details);
            return details;
        }

        const compactUnitView = panel.querySelector('#mc-unit-view');
        const compactStationView = panel.querySelector('#mc-station-view');
        const compactPersonnelView = panel.querySelector('#mc-personnel-view');

        createCompactActionDisclosure(
            compactUnitView?.querySelector('.mc-nexus-action-bar'),
            ['#mc-namer-debug', '#mc-namer-clear'],
            'More',
            'mc-compact-unit-tools'
        );
        createCompactDisclosure(
            'mc-compact-unit-status',
            'Status',
            compactUnitView?.querySelector('.mc-nexus-status-card'),
            false
        );
        createCompactDisclosure(
            'mc-compact-unit-log',
            'Activity log',
            compactUnitView?.querySelector('#mc-namer-log'),
            false
        );

        createCompactActionDisclosure(
            compactStationView?.querySelector('.mc-nexus-action-bar'),
            ['#mc-station-debug', '#mc-station-clear'],
            'More',
            'mc-compact-station-tools'
        );
        createCompactDisclosure(
            'mc-compact-station-status',
            'Status',
            compactStationView?.querySelector('.mc-nexus-status-card'),
            false
        );
        createCompactDisclosure(
            'mc-compact-station-log',
            'Activity log',
            compactStationView?.querySelector('#mc-station-log'),
            false
        );

        createCompactDisclosure(
            'mc-compact-personnel-profile',
            'Profile details',
            [
                compactPersonnelView?.querySelector('.mc-personnel-fixed-grid'),
                compactPersonnelView?.querySelector('#mc-personnel-policy-summary')
            ],
            false
        );
        createCompactActionDisclosure(
            compactPersonnelView?.querySelector('.mc-nexus-action-bar'),
            [
                '#mc-personnel-build-register',
                '#mc-personnel-full-register',
                '#mc-personnel-export-register',
                '#mc-personnel-import-register',
                '#mc-personnel-view-station-report',
                '#mc-personnel-copy-station',
                '#mc-personnel-copy',
                '#mc-personnel-debug',
                '#mc-personnel-clear'
            ],
            'Tools and reports',
            'mc-compact-personnel-tools'
        );
        createCompactDisclosure(
            'mc-compact-personnel-status',
            'Status',
            compactPersonnelView?.querySelector('.mc-nexus-status-card'),
            false
        );
        createCompactDisclosure(
            'mc-compact-personnel-report-display',
            'Report display',
            compactPersonnelView?.querySelector('.mc-nexus-report-controls'),
            false
        );
        createCompactDisclosure(
            'mc-compact-personnel-station-report',
            'Station report',
            compactPersonnelView?.querySelector('#mc-personnel-after-action-section'),
            false
        );
        createCompactDisclosure(
            'mc-compact-personnel-overall-report',
            'Overall report',
            compactPersonnelView?.querySelector('#mc-personnel-overall-report-section'),
            false
        );
        createCompactDisclosure(
            'mc-compact-personnel-log',
            'Activity log',
            [
                compactPersonnelView?.querySelector('.mc-personnel-log-heading'),
                compactPersonnelView?.querySelector('#mc-personnel-log')
            ],
            false
        );'''
source = replace_once(
    source,
    '''        document.body.appendChild(panel);
        ensureSingleNamingToolsPanel(panel);

        const style = document.createElement('style');''',
    '''        document.body.appendChild(panel);
        ensureSingleNamingToolsPanel(panel);'''
    + compact_disclosure_js
    + '''

        const style = document.createElement('style');''',
    'compact naming disclosure controller',
)

# The whole desktop mission shell follows the Mission Control collapsed state.
source = replace_once(
    source,
    '''            panel.dataset.collapsed =
                String(mfMissionControlCollapsed);

            if (missionFinderIphoneSafari) {''',
    '''            panel.dataset.collapsed =
                String(mfMissionControlCollapsed);

            if (!missionFinderIosSafari) {
                wrapper.classList.toggle(
                    'mf-compact-shell-collapsed',
                    mfMissionControlCollapsed
                );
            }

            if (missionFinderIphoneSafari) {''',
    'compact whole-shell collapse state',
)

naming_css = r'''

            /* Command Nexus compact operations panel V1.0.71. */
            #mc-namer-panel:not(.mc-ios-safari) {
                top: 54px;
                right: 10px;
                width: min(360px, calc(100vw - 20px));
                max-width: calc(100vw - 20px);
                max-height: calc(100vh - 64px);
                border-radius: 9px;
                box-shadow: 0 12px 34px rgba(0, 0, 0, 0.42);
                font-size: 11px;
            }

            #mc-namer-panel:not(.mc-ios-safari)[data-active-tool="personnel"] {
                width: min(390px, calc(100vw - 20px));
            }

            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-header {
                min-height: 34px;
                padding: 4px 5px;
                gap: 5px;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-brand-block {
                gap: 5px;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-mark {
                width: 23px;
                height: 23px;
                flex-basis: 23px;
                border-radius: 6px;
                font-size: 8px;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-eyebrow,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tab-index {
                display: none;
            }

            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-header-title {
                font-size: 11px;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-version-chip {
                padding: 3px 5px;
                font-size: 8px;
            }

            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-collapse {
                width: 25px;
                height: 25px;
                flex-basis: 25px;
                border-radius: 6px;
                font-size: 14px;
            }

            #mc-namer-panel:not(.mc-ios-safari).mc-namer-collapsed {
                width: min(205px, calc(100vw - 20px));
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tabs {
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 2px;
                padding: 3px;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tab {
                min-height: 27px;
                padding: 4px 5px;
                border-radius: 5px;
                font-size: 9.5px;
                line-height: 1.1;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-tool-view,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tool-grid,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid {
                grid-template-columns: minmax(0, 1fr);
                grid-template-areas: none;
                gap: 4px;
                padding: 4px;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tool-grid > *,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid > * {
                grid-column: 1 !important;
                grid-row: auto !important;
                grid-area: auto !important;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-config-card,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-status-card,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-alert-card,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-report-controls,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-report-section {
                padding: 5px;
                border-radius: 6px;
                line-height: 1.3;
            }

            #mc-namer-panel:not(.mc-ios-safari) label[style] {
                margin-top: 3px !important;
            }

            #mc-namer-panel:not(.mc-ios-safari) label,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-navigation-title {
                font-size: 9px;
                letter-spacing: 0.02em;
            }

            #mc-namer-panel:not(.mc-ios-safari) select,
            #mc-namer-panel:not(.mc-ios-safari)
            input:not([type="checkbox"]):not([type="file"]) {
                min-height: 28px;
                margin-top: 2px;
                padding: 4px 6px;
                border-radius: 5px;
                font-size: 11px;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar {
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 3px;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar button {
                min-height: 28px;
                padding: 4px 5px;
                border-radius: 5px;
                font-size: 9.5px;
                line-height: 1.1;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-compact-disclosure {
                min-width: 0;
                margin: 0;
                border: 1px solid var(--nx-border);
                border-radius: 6px;
                background: var(--nx-surface);
                overflow: hidden;
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-disclosure-summary {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 6px;
                min-height: 27px;
                padding: 4px 6px;
                color: var(--nx-text-2);
                font-size: 9.5px;
                font-weight: 700;
                line-height: 1.1;
                cursor: pointer;
                list-style: none;
                user-select: none;
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-disclosure-summary::-webkit-details-marker {
                display: none;
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-summary-mark::before {
                content: "+";
                color: var(--nx-muted);
                font-size: 13px;
                line-height: 1;
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-disclosure[open]
            > .mc-compact-disclosure-summary
            .mc-compact-summary-mark::before {
                content: "−";
                color: var(--nx-accent);
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-disclosure[open]
            > .mc-compact-disclosure-summary {
                border-bottom: 1px solid var(--nx-border);
                color: var(--nx-text);
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-disclosure-body {
                min-width: 0;
                padding: 4px;
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-action-disclosure {
                grid-column: 1 / -1 !important;
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-action-disclosure
            .mc-compact-disclosure-body {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 3px;
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-action-disclosure button {
                width: 100%;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-status-card {
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                gap: 2px;
                padding: 0;
                border: 0;
                background: transparent;
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-nexus-status-card > div {
                display: grid;
                grid-template-columns: minmax(74px, 0.42fr) minmax(0, 1fr);
                gap: 5px;
                align-items: start;
                min-height: 0;
                padding: 3px 4px;
                border: 0;
                border-radius: 4px;
                background: var(--nx-surface-2);
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-nexus-status-card > div > b {
                display: block;
                margin: 0;
                font-size: 8px;
                letter-spacing: 0.04em;
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-nexus-status-card > div > span {
                font-size: 9.5px;
                line-height: 1.2;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-fixed-grid,
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-personnel-report-toggle-grid {
                grid-template-columns: minmax(0, 1fr);
                gap: 3px;
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-personnel-fixed-grid > div,
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-personnel-report-toggle {
                padding: 4px 5px;
                border-radius: 4px;
                text-align: left;
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-personnel-profile-banner,
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-personnel-policy-summary {
                margin: 4px 0;
                padding: 4px 5px;
                font-size: 9.5px;
                line-height: 1.25;
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-personnel-training-shortfall-section {
                padding: 5px;
            }

            #mc-namer-panel:not(.mc-ios-safari)
            .mc-personnel-log-heading {
                display: none;
            }

            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-log,
            #mc-namer-panel:not(.mc-ios-safari) #mc-personnel-report,
            #mc-namer-panel:not(.mc-ios-safari) #mc-personnel-after-action {
                max-height: 170px;
                min-height: 0;
                margin: 0;
                padding: 5px;
                border-radius: 4px;
                font-size: 9px;
                line-height: 1.35;
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
            }
'''
source = insert_style_override(source, 'addPanel', naming_css)

mission_css = r'''

            /* Command Nexus compact mission shell V1.0.71. */
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) {
                grid-template-columns: minmax(0, 1fr);
                grid-template-areas:
                    "rail"
                    "control"
                    "load"
                    "trained"
                    "utility"
                    "footer";
                gap: 4px;
                width: min(390px, calc(100vw - 20px));
                max-width: calc(100vw - 20px);
                max-height: calc(100vh - 20px);
                padding: 5px;
                border-radius: 9px;
                box-shadow: 0 12px 34px rgba(0, 0, 0, 0.44);
            }

            #mission-finder-wrapper.mf-nexus-dashboard.mf-dashboard-utility-open:not(.mf2026-ios-safari) {
                grid-template-columns: minmax(0, 1fr);
                grid-template-areas:
                    "rail"
                    "utility"
                    "footer";
                width: min(390px, calc(100vw - 20px));
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-dashboard-brand {
                display: none !important;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-dashboard-rail {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 2px;
                padding: 3px;
                border-radius: 6px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-tab {
                min-height: 27px;
                padding: 4px 5px;
                border-radius: 5px;
                font-size: 9.5px;
                line-height: 1.1;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-tab-icon {
                display: none;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-panel,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-dashboard-utility {
                max-height: none;
                border-radius: 7px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard.mf-dashboard-utility-open:not(.mf2026-ios-safari)
            :is(#control-panel, #vehicle-load-list-box, #trained-personnel-box) {
                display: none !important;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-control-header-row,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-load-header-row,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-trained-header-row,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-utility-header {
                min-height: 32px;
                padding: 3px 5px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-header,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-dashboard-utility-title {
                font-size: 9.5px;
                letter-spacing: 0.04em;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-control-body,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-load-body,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-trained-body,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-dashboard-utility-pane {
                gap: 4px;
                padding: 5px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-load-body,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-trained-body {
                max-height: min(280px, calc(100vh - 150px));
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-box {
                padding: 5px;
                border-radius: 5px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #status-box {
                min-height: 34px;
                font-size: 10px;
                line-height: 1.3;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-section-title {
                margin-bottom: 3px;
                font-size: 8.5px;
                letter-spacing: 0.04em;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-small,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-name,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-training-course-list {
                font-size: 9.5px;
                line-height: 1.3;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-primary-actions {
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 3px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-primary-actions #dispatch-share-box,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf2026-primary-actions #auto-mode-box {
                grid-column: auto;
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
                min-height: 28px;
                padding: 4px 5px;
                border-radius: 5px;
                font-size: 9px;
                line-height: 1.1;
            }

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
                width: 26px;
                min-width: 26px;
                flex-basis: 26px;
                padding: 0;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            input,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            select {
                min-height: 28px;
                padding: 4px 6px !important;
                border-radius: 5px !important;
                font-size: 10px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #control-panel.mf2026-control-collapsed,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #vehicle-load-list-box.mf2026-load-collapsed,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #trained-personnel-box.mf2026-trained-collapsed {
                min-height: 32px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-dashboard-footer {
                padding: 0 2px;
                font-size: 7.5px;
                line-height: 1.2;
            }

            #mission-finder-wrapper.mf-nexus-dashboard.mf-compact-shell-collapsed:not(.mf2026-ios-safari) {
                width: min(205px, calc(100vw - 20px));
                max-height: 34px;
                padding: 0;
                gap: 0;
                overflow: hidden;
            }

            #mission-finder-wrapper.mf-nexus-dashboard.mf-compact-shell-collapsed:not(.mf2026-ios-safari)
            :is(#mf-dashboard-brand, #mf-dashboard-rail, #vehicle-load-list-box,
                #trained-personnel-box, #mf-dashboard-utility, #mf-dashboard-footer) {
                display: none !important;
            }

            #mission-finder-wrapper.mf-nexus-dashboard.mf-compact-shell-collapsed:not(.mf2026-ios-safari)
            #control-panel {
                display: block !important;
                width: 100%;
                min-height: 32px;
                border: 0;
                border-radius: 7px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard.mf-compact-shell-collapsed:not(.mf2026-ios-safari)
            .mf2026-control-header-row {
                border-bottom: 0;
            }

            @media (max-width: 700px) {
                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari),
                #mission-finder-wrapper.mf-nexus-dashboard.mf-dashboard-utility-open:not(.mf2026-ios-safari) {
                    width: calc(100vw - 16px);
                    max-width: calc(100vw - 16px);
                    max-height: calc(100vh - 16px);
                    padding: 4px;
                }
            }
'''
source = insert_style_override(source, 'injectStyles', mission_css)

SOURCE_PATH.write_text(source, encoding='utf-8', newline='\n')

# Version-pinned permanent checks.
for path in Path('scripts').glob('check-*.mjs'):
    text = path.read_text(encoding='utf-8')
    text = text.replace('// @version      1.0.70', '// @version      1.0.71')
    text = text.replace('MISSION FINDER V10.6.133', 'MISSION FINDER V10.6.134')
    text = text.replace('Mission Finder V10.6.133', 'Mission Finder V10.6.134')
    text = text.replace('mf_control_collapsed_v9', 'mf_control_collapsed_v10')
    text = text.replace('mf_vehicle_load_collapsed_v9', 'mf_vehicle_load_collapsed_v10')
    text = text.replace('mf_trained_personnel_collapsed_v1', 'mf_trained_personnel_collapsed_v2')
    path.write_text(text, encoding='utf-8', newline='\n')

compact_test = r'''#!/usr/bin/env node
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

expect(source.includes('// @version      1.0.71'), 'v1.0.71 metadata missing');
expect(source.includes('MISSION FINDER V10.6.134'), 'V10.6.134 header missing');

const addPanel = extractFunction('addPanel');
const createControlPanel = extractFunction('createControlPanel');
const injectStyles = extractFunction('injectStyles');

for (const token of [
  "'mf_control_collapsed_v10'",
  "'mf_vehicle_load_collapsed_v10'",
  "'mf_trained_personnel_collapsed_v2'",
  'savedVehicleLoadCollapsed == null\n            ? true',
]) {
  expect(source.includes(token), `Compact default contract missing ${token}`);
}

for (const token of [
  'function createCompactDisclosure(',
  'function createCompactActionDisclosure(',
  "'mc-compact-unit-status'",
  "'mc-compact-unit-log'",
  "'mc-compact-station-status'",
  "'mc-compact-station-log'",
  "'mc-compact-personnel-profile'",
  "'mc-compact-personnel-tools'",
  "'mc-compact-personnel-status'",
  "'mc-compact-personnel-station-report'",
  "'mc-compact-personnel-overall-report'",
  "'mc-compact-personnel-log'",
  "'mc_compact_disclosure_v1071_'",
]) {
  expect(addPanel.includes(token), `Disclosure contract missing ${token}`);
}

for (const token of [
  '/* Command Nexus compact operations panel V1.0.71. */',
  'width: min(360px, calc(100vw - 20px))',
  'width: min(390px, calc(100vw - 20px))',
  'grid-template-columns: repeat(4, minmax(0, 1fr))',
  '.mc-compact-disclosure-summary',
  '.mc-compact-action-disclosure',
  'max-height: 170px',
]) {
  expect(addPanel.includes(token), `Compact naming CSS missing ${token}`);
}

for (const token of [
  '/* Command Nexus compact mission shell V1.0.71. */',
  'width: min(390px, calc(100vw - 20px))',
  'grid-template-columns: repeat(3, minmax(0, 1fr))',
  '.mf-dashboard-utility-open:not(.mf2026-ios-safari)',
  ':is(#control-panel, #vehicle-load-list-box, #trained-personnel-box)',
  '.mf-compact-shell-collapsed:not(.mf2026-ios-safari)',
  'width: min(205px, calc(100vw - 20px))',
  '#mf-dashboard-brand {\n                display: none !important;',
]) {
  expect(injectStyles.includes(token), `Compact mission CSS missing ${token}`);
}

expect(
  createControlPanel.includes("'mf-compact-shell-collapsed'"),
  'Whole-shell collapsed state is not owned by Mission Control'
);
expect(
  createControlPanel.includes('scheduleMissionRequiredPersonnelPreload(0);'),
  'Required Personnel preload lifecycle changed'
);

for (const token of [
  "unitFinderBtn.id = 'unit-finder-box'",
  "missionUpdateBtn.id = 'mission-update-box'",
  "allyStealBtn.id = 'mf-ally-steal'",
  'triggerDispatchClick();',
  'triggerDispatchShareClick();',
  'toggleAutoMode();',
  'startMissionEventCollectibleCollector();',
  'stopMissionEventCollectibleCollector();',
]) {
  expect(source.includes(token), `Operational ownership missing ${token}`);
}

expect(
  source.includes('#mc-namer-panel:not(.mc-ios-safari)'),
  'Compact naming CSS must exclude iOS Safari'
);
expect(
  injectStyles.includes(
    '#mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)'
  ),
  'Compact mission CSS must exclude iOS Safari'
);
expect(
  source.includes('#mc-namer-panel.mc-ios-safari'),
  'Existing naming iOS geometry missing'
);
expect(
  source.includes('#mission-finder-wrapper.mf2026-iphone-safari'),
  'Existing iPhone mission geometry missing'
);

console.log(
  'Command Nexus V1.0.71 compact shell and progressive disclosure checks passed.'
);
'''
Path('scripts/check-compact-nexus-ui-v1071.mjs').write_text(
    compact_test,
    encoding='utf-8',
    newline='\n',
)

workflow_path = Path('.github/workflows/validate-userscript.yml')
workflow = workflow_path.read_text(encoding='utf-8')
visual_path = "      - 'scripts/check-nexus-visual-system-v1070.mjs'\n"
compact_path = visual_path + "      - 'scripts/check-compact-nexus-ui-v1071.mjs'\n"
visual_count = workflow.count(visual_path)
if visual_count != 2:
    raise SystemExit(
        f'Expected two visual-system workflow paths, found {visual_count}'
    )
workflow = workflow.replace(visual_path, compact_path)
workflow = replace_once(
    workflow,
    '''      - name: Validate Command Nexus visual system
        run: node scripts/check-nexus-visual-system-v1070.mjs
''',
    '''      - name: Validate Command Nexus visual system
        run: node scripts/check-nexus-visual-system-v1070.mjs

      - name: Validate compact Nexus UI and disclosures
        run: node scripts/check-compact-nexus-ui-v1071.mjs
''',
    'compact workflow validation step',
)
workflow_path.write_text(workflow, encoding='utf-8', newline='\n')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
section = '''## [1.0.71] - 2026-07-31

### Redesigned

- Immediately superseded the expansive `1.0.70` presentation with a narrow compact operations interface.
- Reduced the desktop Mission surface to a single `390px`-class shell instead of a wide multi-column dashboard.
- Removed the visible identity banner and compressed Mission, Settings and Diagnostics navigation into a small three-button strip.
- Kept Mission actions and live status immediately available while Vehicle Load and Trained Personnel now start collapsed.
- Settings and Diagnostics now replace the operational view instead of expanding the shell beside it.
- Collapsing Mission Control reduces the entire desktop shell to a compact `205px` launcher/header.
- Reduced Unit Naming and Station Naming to a `360px` compact panel and Personnel Assignment to a `390px` compact panel.
- Added progressive-disclosure menus for status, activity logs, profile details, register/report tools, report controls and reports.

### Compactness and usability

- Reduced desktop header, tab, input and action heights while retaining clear focus and click targets.
- Replaced large status metric cards with compact label/value rows.
- Limited expanded logs and reports to bounded internal scrolling.
- Retained safe wrapping, tabular values, low-glare surfaces and semantic state colours.

### Safety

- Required Personnel preload, mission identity safety, Unit Finder, Mission Update, Ally Steal, dispatch, sharing, Auto Mode, Event Scanner, Vehicle Load, trained-personnel optimisation and Personnel Register authority remain unchanged.
- Unit Naming, Station Naming and Personnel Assignment handlers, IDs, storage and execution paths remain unchanged.
- Existing iPhone/iOS layouts and safe-area behaviour remain isolated from the desktop compact rebuild.
- Added permanent compact-shell, collapsed-default and progressive-disclosure regression coverage.

### Changed engine baseline

- Mission Finder increased from `V10.6.133` to `V10.6.134`.
- Unit Naming remains `3.3.8`.
- Station Naming remains `1.3.3`.
- Personnel Assignment remains `1.3.8`.


'''
changelog = replace_once(
    changelog,
    '## [1.0.70] - 2026-07-31',
    section + '## [1.0.70] - 2026-07-31',
    'v1.0.71 changelog section',
)
changelog_path.write_text(changelog, encoding='utf-8', newline='\n')

readme_path = Path('README.md')
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(
    readme,
    '**Current version:** `1.0.70` · **Mission Finder engine:** `V10.6.133`',
    '**Current version:** `1.0.71` · **Mission Finder engine:** `V10.6.134`',
    'README version baseline',
)
readme_path.write_text(readme, encoding='utf-8', newline='\n')

src_readme_path = Path('src/README.md')
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = src_readme.replace(
    '| Command Nexus version | `1.0.70` |',
    '| Command Nexus version | `1.0.71` |',
)
src_readme = src_readme.replace(
    '| Mission Finder baseline | `V10.6.133` |',
    '| Mission Finder baseline | `V10.6.134` |',
)
compact_note = '''

### Compact progressive-disclosure interface

Desktop Mission Control is a narrow single-shell interface. Mission actions remain immediately visible; Vehicle Load and Trained Personnel start collapsed; Settings and Diagnostics replace the mission view rather than expanding beside it. Unit Naming, Station Naming and Personnel Assignment use narrow single-column panels with status, tools, reports and logs behind native disclosure controls. The entire Mission shell and naming panel can collapse to compact headers. Existing IDs, handlers, authoritative data paths and iPhone/iOS geometry remain unchanged.
'''
if '### Compact progressive-disclosure interface' not in src_readme:
    src_readme = src_readme.rstrip() + compact_note.rstrip() + '\n'
else:
    src_readme = src_readme.rstrip() + '\n'
src_readme_path.write_text(src_readme, encoding='utf-8', newline='\n')

print('Command Nexus V1.0.71 compact UI patch applied.')
