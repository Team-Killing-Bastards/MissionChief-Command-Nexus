#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / 'src' / 'missionchief-command-nexus.user.js'
source = SOURCE_PATH.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


source = replace_once(
    source,
    '// @version      1.0.61',
    '// @version      1.0.62',
    'userscript version'
)
source = replace_once(
    source,
    ' * MODULE 2: MISSION FINDER V10.6.124',
    ' * MODULE 2: MISSION FINDER V10.6.125',
    'Mission Finder version'
)

# Independent collapse state. The new desktop panel starts collapsed so it does
# not widen the existing Mission Control layout until the user opens it.
collapse_key_anchor = """    const MF_IPHONE_ADVANCED_EXPANDED_KEY =
        'mf_iphone_advanced_expanded_v2';
"""
collapse_key_replacement = """    const MF_TRAINED_PERSONNEL_COLLAPSED_KEY =
        isMissionFinderIosSafariWebsite()
            ? 'mf_trained_personnel_collapsed_ios_v1'
            : 'mf_trained_personnel_collapsed_v1';
    const MF_IPHONE_ADVANCED_EXPANDED_KEY =
        'mf_iphone_advanced_expanded_v2';
"""
source = replace_once(
    source,
    collapse_key_anchor,
    collapse_key_replacement,
    'trained panel collapse key'
)

saved_state_anchor = """    const savedMissionControlCollapsed =
        localStorage.getItem(
            MF_CONTROL_COLLAPSED_KEY
        );
"""
saved_state_replacement = """    const savedTrainedPersonnelCollapsed =
        localStorage.getItem(
            MF_TRAINED_PERSONNEL_COLLAPSED_KEY
        );
    const savedMissionControlCollapsed =
        localStorage.getItem(
            MF_CONTROL_COLLAPSED_KEY
        );
"""
source = replace_once(
    source,
    saved_state_anchor,
    saved_state_replacement,
    'trained panel saved state'
)

state_anchor = """    let mfMissionControlCollapsed =
        savedMissionControlCollapsed == null
            ? isMissionFinderIphoneSafariWebsite()
            : savedMissionControlCollapsed === 'true';
"""
state_replacement = """    let mfTrainedPersonnelCollapsed =
        savedTrainedPersonnelCollapsed == null
            ? true
            : savedTrainedPersonnelCollapsed === 'true';
    let mfMissionControlCollapsed =
        savedMissionControlCollapsed == null
            ? isMissionFinderIphoneSafariWebsite()
            : savedMissionControlCollapsed === 'true';
"""
source = replace_once(
    source,
    state_anchor,
    state_replacement,
    'trained panel collapse state'
)

# Keep the visual panel current when the Personnel Register is refreshed.
registry_handler_anchor = """        mfPersonnelRegistryUpdatedHandler = () => {
            mfLiveTrainingVerifyCache.clear();
        };
"""
registry_handler_replacement = """        mfPersonnelRegistryUpdatedHandler = () => {
            mfLiveTrainingVerifyCache.clear();
            renderSelectedTrainedPersonnelPanel();
        };
"""
source = replace_once(
    source,
    registry_handler_anchor,
    registry_handler_replacement,
    'trained panel registry refresh'
)

# Selected trained-personnel view model and renderer. This is display-only and
# reads exact vehicle-ID registry evidence already used by the selector.
renderer_anchor = """    function renderVehicleLoadListNow() {
"""
renderer_code = r'''    const MF_SELECTED_TRAINING_LABEL_OVERRIDES =
        Object.freeze({
            critical_care: 'Critical Care',
            traffic_police: 'Roads Policing',
            swat: 'Firearms',
            police_horse: 'Mounted Officer',
            k9: 'Dog Handler',
            drone: 'Drone Operator',
            polizeihubschrauber: 'Police Aviation',
            railway_police_command: 'Mobile Operations Management',
            bomb_disposal_command: 'EOD Commander',
            bomb_disposal: 'Bomb Disposal',
            bomb_disposal_diver: 'Marine Bomb Disposal',
            elw2: 'Level 1 Incident Commander',
            gw_gefahrgut: 'HazMat',
            railway_fire: 'Railway Fire'
        });


    function getSelectedTrainingDisplayLabel(trainingCode) {
        const code = String(trainingCode || '').trim();
        if (!code) return 'Unknown training';

        const supportedDefinition =
            MF_TRAINED_PERSONNEL_PATTERNS.find(definition => {
                return String(definition?.code || '') === code;
            });

        if (supportedDefinition?.label) {
            return supportedDefinition.label;
        }

        if (MF_SELECTED_TRAINING_LABEL_OVERRIDES[code]) {
            return MF_SELECTED_TRAINING_LABEL_OVERRIDES[code];
        }

        return code
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, character => character.toUpperCase());
    }


    function getSelectedTrainedPersonnelPanelModel() {
        let registry = { vehicles: {} };

        try {
            registry = readPersonnelTrainingRegistry();
        } catch (_error) {}

        return getVehicleCheckboxSnapshot(true)
            .filter(input => input?.checked)
            .map(input => {
                let registryMatch = null;

                try {
                    registryMatch = getRegistryEntryForMissionCheckbox(
                        input,
                        registry
                    );
                } catch (_error) {}

                const entry = registryMatch?.entry || null;
                if (!entry) return null;

                const profiles = (
                    Array.isArray(entry.assignedTrainingProfiles)
                        ? entry.assignedTrainingProfiles
                        : []
                ).map(profile => {
                    return Array.from(new Set(
                        (Array.isArray(profile) ? profile : [])
                            .map(value => String(value || '').trim())
                            .filter(Boolean)
                    ));
                }).filter(profile => profile.length > 0);

                const trainingCounts = Object.entries(
                    entry.trainingCounts &&
                    typeof entry.trainingCounts === 'object'
                        ? entry.trainingCounts
                        : {}
                ).map(([code, value]) => {
                    return {
                        code: String(code || ''),
                        label: getSelectedTrainingDisplayLabel(code),
                        count: Math.max(0, parseInt(value, 10) || 0)
                    };
                }).filter(item => item.code && item.count > 0)
                    .sort((left, right) => {
                        return left.label.localeCompare(right.label);
                    });

                if (profiles.length === 0 && trainingCounts.length === 0) {
                    return null;
                }

                return {
                    vehicleId: getMissionVehicleId(input),
                    vehicleName: getVehicleDebugName(input),
                    profiles,
                    profilesComplete:
                        entry.trainingProfilesComplete === true,
                    trainingCounts
                };
            })
            .filter(Boolean)
            .sort((left, right) => {
                return String(left.vehicleName || '')
                    .localeCompare(String(right.vehicleName || ''));
            });
    }


    function renderSelectedTrainedPersonnelPanel() {
        const summary =
            document.getElementById('trained-personnel-summary');
        const content =
            document.getElementById('trained-personnel-content');

        if (!summary || !content) return;

        const selectedVehicles =
            getSelectedTrainedPersonnelPanelModel();
        const completeProfiles = selectedVehicles.reduce(
            (total, vehicle) => {
                return total + (
                    vehicle.profilesComplete
                        ? vehicle.profiles.length
                        : 0
                );
            },
            0
        );
        const aggregateOnlyVehicles = selectedVehicles.filter(vehicle => {
            return !vehicle.profilesComplete;
        }).length;

        if (selectedVehicles.length === 0) {
            summary.textContent =
                'No selected vehicle has trained-personnel register evidence.';
            content.innerHTML =
                '<span class="mf2026-small">Selected trained personnel will appear here.</span>';
            return;
        }

        summary.innerHTML = `
            <div><strong>${selectedVehicles.length}</strong> selected trained vehicle${selectedVehicles.length === 1 ? '' : 's'}</div>
            <div><strong>${completeProfiles}</strong> trained personnel profile${completeProfiles === 1 ? '' : 's'}${aggregateOnlyVehicles ? ` · ${aggregateOnlyVehicles} aggregate-only` : ''}</div>
        `;

        content.innerHTML = selectedVehicles.map(vehicle => {
            const vehicleName =
                vehicle.vehicleName ||
                (vehicle.vehicleId
                    ? `Vehicle ${vehicle.vehicleId}`
                    : 'Selected vehicle');
            const profileMarkup =
                vehicle.profilesComplete &&
                vehicle.profiles.length > 0
                    ? vehicle.profiles.map((profile, index) => {
                        const labels = profile
                            .map(getSelectedTrainingDisplayLabel)
                            .sort((left, right) => left.localeCompare(right));

                        return `
                            <div class="mf2026-training-person">
                                <span class="mf2026-training-person-label">Person ${index + 1}</span>
                                <span class="mf2026-training-course-list">${labels.map(escapeHtml).join(', ')}</span>
                            </div>
                        `;
                    }).join('')
                    : vehicle.trainingCounts.map(item => {
                        return `
                            <div class="mf2026-training-person">
                                <span class="mf2026-training-person-label">${item.count}×</span>
                                <span class="mf2026-training-course-list">${escapeHtml(item.label)}</span>
                            </div>
                        `;
                    }).join('');

            return `
                <div class="mf2026-training-vehicle">
                    <div class="mf2026-training-vehicle-name">
                        ${escapeHtml(vehicleName)}
                        ${vehicle.vehicleId ? `<span class="mf2026-small"> #${escapeHtml(vehicle.vehicleId)}</span>` : ''}
                    </div>
                    ${profileMarkup}
                </div>
            `;
        }).join('');
    }


    function renderVehicleLoadListNow() {
'''
source = replace_once(
    source,
    renderer_anchor,
    renderer_code,
    'trained panel renderer'
)

patient_render_anchor = """        patientContent.innerHTML = `
            <div class="mf2026-row">
                <div>Patients found</div>
                <div class="mf2026-count">${vehicleLoadState.patients}</div>
            </div>
            <div class="mf2026-row">
                <div>Ambulances selected</div>
                <div class="mf2026-count">${vehicleLoadState.ambulances}</div>
            </div>
            <div class="mf2026-row">
                <div>Ambulance Officer</div>
                <div class="mf2026-count mf2026-warn">Live requirements only</div>
            </div>
        `;
"""
patient_render_replacement = patient_render_anchor + """

        renderSelectedTrainedPersonnelPanel();
"""
source = replace_once(
    source,
    patient_render_anchor,
    patient_render_replacement,
    'trained panel render hook'
)

# Desktop/iPad panel styling and a hard iPhone hide to preserve the existing
# two-button compact launcher without introducing overlap.
content_style_anchor = """            #vehicle-load-list-content {
                max-height: 210px;
                overflow-y: auto;
                padding-right: 4px;
            }
"""
content_style_replacement = content_style_anchor + """

            #trained-personnel-content {
                max-height: 280px;
                overflow-y: auto;
                padding-right: 4px;
            }

            .mf2026-training-vehicle {
                padding: 7px 0;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .mf2026-training-vehicle:last-child {
                border-bottom: none;
            }

            .mf2026-training-vehicle-name {
                margin-bottom: 5px;
                color: #fff;
                font-weight: bold;
            }

            .mf2026-training-person {
                display: grid;
                grid-template-columns: auto minmax(0, 1fr);
                gap: 8px;
                align-items: start;
                padding: 3px 0;
            }

            .mf2026-training-person-label {
                color: #42ff75;
                font-weight: bold;
                white-space: nowrap;
            }

            .mf2026-training-course-list {
                color: #ddd;
                text-align: right;
                overflow-wrap: anywhere;
            }
"""
source = replace_once(
    source,
    content_style_anchor,
    content_style_replacement,
    'trained panel content styles'
)

panel_width_anchor = """            #vehicle-load-list-box {
                width: 300px;
            }
"""
panel_width_replacement = panel_width_anchor + """

            #trained-personnel-box {
                width: 300px;
            }
"""
source = replace_once(
    source,
    panel_width_anchor,
    panel_width_replacement,
    'trained panel width'
)

load_collapse_end_anchor = """            #mf-load-minimize {
                width: 34px;
                padding: 6px 0;
                background: #6c757d;
                color: white;
            }
"""
trained_collapse_styles = load_collapse_end_anchor + """

            #trained-personnel-box.mf2026-trained-collapsed {
                width: 44px;
                min-height: 0;
                padding: 6px;
                overflow: hidden;
            }

            #trained-personnel-box.mf2026-trained-collapsed .mf-trained-body {
                display: none;
            }

            #trained-personnel-box.mf2026-trained-collapsed .mf2026-header {
                writing-mode: vertical-rl;
                text-orientation: mixed;
                min-height: 145px;
                padding: 8px 4px;
                cursor: pointer;
            }

            .mf2026-trained-header-row {
                display: flex;
                gap: 6px;
                align-items: center;
            }

            .mf2026-trained-header-row .mf2026-header {
                flex: 1;
            }

            #mf-trained-minimize {
                width: 34px;
                padding: 6px 0;
                background: #6c757d;
                color: white;
            }
"""
source = replace_once(
    source,
    load_collapse_end_anchor,
    trained_collapse_styles,
    'trained panel collapse styles'
)

# Add the panel to the regular iOS stacked layout.
ios_width_anchor = """            #mission-finder-wrapper.mf2026-ios-safari .mf2026-panel,
            #mission-finder-wrapper.mf2026-ios-safari #control-panel,
            #mission-finder-wrapper.mf2026-ios-safari #vehicle-load-list-box {
"""
ios_width_replacement = """            #mission-finder-wrapper.mf2026-ios-safari .mf2026-panel,
            #mission-finder-wrapper.mf2026-ios-safari #control-panel,
            #mission-finder-wrapper.mf2026-ios-safari #vehicle-load-list-box,
            #mission-finder-wrapper.mf2026-ios-safari #trained-personnel-box {
"""
source = replace_once(
    source,
    ios_width_anchor,
    ios_width_replacement,
    'trained panel iOS width'
)

ios_scroll_anchor = """            #mission-finder-wrapper.mf2026-ios-safari .mf-control-body,
            #mission-finder-wrapper.mf2026-ios-safari .mf-load-body,
            #mission-finder-wrapper.mf2026-ios-safari #vehicle-load-list-content,
            #mission-finder-wrapper.mf2026-ios-safari #session-panel-content {
"""
ios_scroll_replacement = """            #mission-finder-wrapper.mf2026-ios-safari .mf-control-body,
            #mission-finder-wrapper.mf2026-ios-safari .mf-load-body,
            #mission-finder-wrapper.mf2026-ios-safari .mf-trained-body,
            #mission-finder-wrapper.mf2026-ios-safari #vehicle-load-list-content,
            #mission-finder-wrapper.mf2026-ios-safari #trained-personnel-content,
            #mission-finder-wrapper.mf2026-ios-safari #session-panel-content {
"""
source = replace_once(
    source,
    ios_scroll_anchor,
    ios_scroll_replacement,
    'trained panel iOS scrolling'
)

ios_trained_anchor = """            /* iPhone Safari only. iPad remains on the established iOS layout. */
"""
ios_trained_styles = """            #mission-finder-wrapper.mf2026-ios-safari
            #trained-personnel-box.mf2026-trained-collapsed {
                width: 100%;
                min-height: 0;
                padding: 6px;
                overflow: hidden;
            }

            #mission-finder-wrapper.mf2026-ios-safari
            #trained-personnel-box.mf2026-trained-collapsed
            .mf2026-header {
                writing-mode: horizontal-tb;
                text-orientation: mixed;
                min-height: 42px;
                padding: 8px 10px;
                justify-content: flex-start;
                text-align: left;
            }

            /* iPhone Safari only. iPad remains on the established iOS layout. */
"""
source = replace_once(
    source,
    ios_trained_anchor,
    ios_trained_styles,
    'trained panel iOS collapsed layout'
)

iphone_hide_anchor = """            #mission-finder-wrapper.mf2026-iphone-safari
            #control-panel.mf2026-control-collapsed,
"""
iphone_hide_replacement = """            #mission-finder-wrapper.mf2026-iphone-safari
            #trained-personnel-box {
                display: none !important;
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            #control-panel.mf2026-control-collapsed,
"""
source = replace_once(
    source,
    iphone_hide_anchor,
    iphone_hide_replacement,
    'trained panel iPhone isolation'
)

# Build and append the sibling panel to the right of Vehicle Load List.
trained_panel_anchor = """        if (missionFinderIphoneSafari) {
            wrapper.appendChild(iphoneLauncher);
        }
"""
trained_panel_markup = """        const trainedPanel = document.createElement('div');
        trainedPanel.id = 'trained-personnel-box';
        trainedPanel.className = `mf2026-panel ${mfTrainedPersonnelCollapsed ? 'mf2026-trained-collapsed' : ''}`;
        trainedPanel.innerHTML = `
            <div class="mf2026-trained-header-row">
                <div id="mf-trained-title" class="mf2026-header">Trained Personnel</div>
                <button id="mf-trained-minimize" type="button" class="mf2026-button" title="Minimize / expand trained personnel">${mfTrainedPersonnelCollapsed ? '+' : '−'}</button>
            </div>

            <div id="mf-trained-body" class="mf-trained-body">
                <div class="mf2026-box">
                    <div class="mf2026-section-title">Selected Training Coverage</div>
                    <div id="trained-personnel-summary" class="mf2026-small">
                        No selected trained personnel yet.
                    </div>
                </div>

                <div class="mf2026-box">
                    <div class="mf2026-section-title">Personnel and Courses</div>
                    <div id="trained-personnel-content" class="mf2026-small">
                        Selected trained personnel will appear here.
                    </div>
                </div>
            </div>
        `;

        if (missionFinderIphoneSafari) {
            wrapper.appendChild(iphoneLauncher);
        }
"""
source = replace_once(
    source,
    trained_panel_anchor,
    trained_panel_markup,
    'trained panel markup'
)

append_anchor = """        wrapper.appendChild(panel);
        wrapper.appendChild(loadPanel);
        document.body.appendChild(wrapper);
"""
append_replacement = """        wrapper.appendChild(panel);
        wrapper.appendChild(loadPanel);
        wrapper.appendChild(trainedPanel);
        document.body.appendChild(wrapper);
"""
source = replace_once(
    source,
    append_anchor,
    append_replacement,
    'trained panel append order'
)

# Independent minimise/expand controls. The title expands a collapsed panel,
# matching the Vehicle Load List interaction without sharing its state.
trained_controls_anchor = """        function persistIphoneLauncherPanelState() {
"""
trained_controls = """        function syncTrainedPersonnelCollapseState() {
            const expanded = !mfTrainedPersonnelCollapsed;
            trainedPanel.classList.toggle(
                'mf2026-trained-collapsed',
                mfTrainedPersonnelCollapsed
            );

            const minimizeButton =
                trainedPanel.querySelector('#mf-trained-minimize');
            const title =
                trainedPanel.querySelector('#mf-trained-title');

            if (minimizeButton) {
                minimizeButton.textContent = expanded ? '−' : '+';
                minimizeButton.title = expanded
                    ? 'Collapse Trained Personnel'
                    : 'Expand Trained Personnel';
                minimizeButton.setAttribute(
                    'aria-label',
                    minimizeButton.title
                );
                minimizeButton.setAttribute(
                    'aria-controls',
                    'mf-trained-body'
                );
                minimizeButton.setAttribute(
                    'aria-expanded',
                    String(expanded)
                );
            }

            if (title) {
                title.setAttribute(
                    'aria-controls',
                    'mf-trained-body'
                );
                title.setAttribute(
                    'aria-expanded',
                    String(expanded)
                );
            }

            trainedPanel.dataset.collapsed =
                String(mfTrainedPersonnelCollapsed);
        }

        function toggleTrainedPersonnelCollapsed() {
            mfTrainedPersonnelCollapsed =
                !mfTrainedPersonnelCollapsed;
            localStorage.setItem(
                MF_TRAINED_PERSONNEL_COLLAPSED_KEY,
                String(mfTrainedPersonnelCollapsed)
            );
            syncTrainedPersonnelCollapseState();
            renderSelectedTrainedPersonnelPanel();

            requestAnimationFrame(() => {
                keepMissionFinderWindowOnScreen(wrapper);
            });
        }

        const trainedMinimizeButton =
            trainedPanel.querySelector('#mf-trained-minimize');
        const trainedTitle =
            trainedPanel.querySelector('#mf-trained-title');

        syncTrainedPersonnelCollapseState();

        if (trainedMinimizeButton) {
            trainedMinimizeButton.addEventListener(
                'click',
                function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleTrainedPersonnelCollapsed();
                }
            );
        }

        if (trainedTitle) {
            trainedTitle.addEventListener('click', function() {
                if (mfTrainedPersonnelCollapsed) {
                    toggleTrainedPersonnelCollapsed();
                }
            });
        }

        function persistIphoneLauncherPanelState() {
"""
source = replace_once(
    source,
    trained_controls_anchor,
    trained_controls,
    'trained panel controls'
)

# Release documentation.
changelog = ROOT / 'CHANGELOG.md'
changelog_text = changelog.read_text(encoding='utf-8')
entry = '''## [1.0.62] - 2026-07-30

### Added

- Added an independently minimisable **Trained Personnel** panel to the right of Vehicle Load List on desktop and the stacked iPad layout.
- The panel shows only personnel training attached to currently selected vehicles, using exact vehicle-ID Personnel Register evidence.
- Complete register evidence is shown as numbered personnel profiles with their courses; summary-only evidence falls back to per-course counts.
- The compact iPhone two-button layout is unchanged and the additional sibling panel is hidden there to prevent overlap.

### Changed engine baseline

- Mission Finder increased from `V10.6.124` to `V10.6.125`.
- Personnel Assignment remains `1.3.7`.

'''
if '## [1.0.62]' not in changelog_text:
    changelog_text = changelog_text.replace(
        '## [1.0.61]',
        entry + '## [1.0.61]',
        1
    )
changelog.write_text(changelog_text, encoding='utf-8')

for path in [ROOT / 'README.md', ROOT / 'src' / 'README.md']:
    text = path.read_text(encoding='utf-8')
    text = text.replace('`1.0.61`', '`1.0.62`')
    text = text.replace('`V10.6.124`', '`V10.6.125`')
    path.write_text(text, encoding='utf-8')

# Keep permanent version-sensitive regressions aligned.
for path in (ROOT / 'scripts').glob('*.mjs'):
    text = path.read_text(encoding='utf-8')
    updated = text.replace(
        '// @version      1.0.61',
        '// @version      1.0.62'
    )
    updated = updated.replace(
        'MISSION FINDER V10.6.124',
        'MISSION FINDER V10.6.125'
    )
    updated = updated.replace(
        ' * MODULE 2: MISSION FINDER V10.6.124',
        ' * MODULE 2: MISSION FINDER V10.6.125'
    )
    if updated != text:
        path.write_text(updated, encoding='utf-8')

SOURCE_PATH.write_text(source, encoding='utf-8')
print('Applied v1.0.62 selected trained-personnel panel.')
