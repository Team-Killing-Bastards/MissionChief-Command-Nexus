#!/usr/bin/env python3
from pathlib import Path

ROOT = Path('.')
SOURCE_PATH = ROOT / 'src/missionchief-command-nexus.user.js'
source = SOURCE_PATH.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


source = replace_once(
    source,
    '// @version      1.0.80',
    '// @version      1.0.81',
    'Command Nexus version'
)
source = replace_once(
    source,
    ' * MODULE 2: MISSION FINDER V10.6.140',
    ' * MODULE 2: MISSION FINDER V10.6.141',
    'Mission Finder version'
)

helper_anchor = '''    function getPreloadedMissionTrainedPersonnelRequirements() {'''
helper_block = '''    function getLiveMissionTrainedPersonnelRequirementsForDisplay() {
        if (
            !hasMissionVehiclesOnSceneForTrainedPersonnelAuthority()
        ) {
            return [];
        }

        let liveRows = [];

        try {
            liveRows = normaliseOperationalRequirementRows(
                readMissionUpdateRows({ silent: true })
            );
        } catch (error) {
            if (mfDebugEnabled) {
                debugLog(
                    'LIVE TRAINED PERSONNEL DISPLAY',
                    `current shortage read failed: ${error?.message || error}`
                );
            }

            return [];
        }

        const requirements = new Map();

        liveRows
            .filter(row => {
                return (
                    row?.isTrainedPersonnelRequirement === true &&
                    Array.isArray(row?.personnelTrainingRequirements)
                );
            })
            .forEach(row => {
                row.personnelTrainingRequirements
                    .forEach(requirement => {
                        const requiredTrainingCodes =
                            Array.isArray(requirement?.requiredTrainingCodes)
                                ? requirement.requiredTrainingCodes
                                    .map(value => String(value || '').trim())
                                    .filter(Boolean)
                                : [];
                        const code =
                            requiredTrainingCodes[0] ||
                            String(requirement?.code || '')
                                .replace(/_vehicle$/i, '')
                                .trim();
                        const missing = Math.max(
                            0,
                            parseInt(
                                requirement?.personnelRequired ??
                                requirement?.required,
                                10
                            ) || 0
                        );

                        if (!code || missing <= 0) return;

                        const existing =
                            requirements.get(code);

                        if (
                            !existing ||
                            missing > existing.missing
                        ) {
                            requirements.set(code, {
                                code,
                                label:
                                    getSelectedTrainingDisplayLabel(code),
                                missing
                            });
                        }
                    });
            });

        return Array.from(requirements.values())
            .sort((left, right) => {
                return left.label.localeCompare(right.label);
            });
    }

'''
if helper_block.strip() in source:
    raise SystemExit('Live trained-personnel display helper already exists')
source = replace_once(
    source,
    helper_anchor,
    helper_block + helper_anchor,
    'Live trained-personnel display helper insertion'
)

panel_state_old = '''        let preloadState = { status: 'idle' };
        let requiredPersonnel = [];
        let missionVehiclesOnSceneForTrainedPersonnel =
            false;

        try {
            missionVehiclesOnSceneForTrainedPersonnel =
                hasMissionVehiclesOnSceneForTrainedPersonnelAuthority();
            preloadState =
                getMissionRequirementPreloadState();
            requiredPersonnel =
                getPreloadedMissionTrainedPersonnelRequirements();'''
panel_state_new = '''        let preloadState = { status: 'idle' };
        let requiredPersonnel = [];
        let liveMissingPersonnel = [];
        let missionVehiclesOnSceneForTrainedPersonnel =
            false;

        try {
            missionVehiclesOnSceneForTrainedPersonnel =
                hasMissionVehiclesOnSceneForTrainedPersonnelAuthority();
            preloadState =
                getMissionRequirementPreloadState();
            requiredPersonnel =
                getPreloadedMissionTrainedPersonnelRequirements();
            liveMissingPersonnel =
                getLiveMissionTrainedPersonnelRequirementsForDisplay();'''
source = replace_once(
    source,
    panel_state_old,
    panel_state_new,
    'Trained Personnel panel live shortage state'
)

required_totals_old = '''        const requiredTotal = requiredPersonnel.reduce(
            (total, requirement) => {
                return total + requirement.required;
            },
            0
        );
        const coveredTotal = requiredPersonnel.reduce(
            (total, requirement) => {
                return total + Math.min(
                    requirement.required,
                    getSelectedTrainedPersonnelCountForCode(
                        selectedVehicles,
                        requirement.code
                    )
                );
            },
            0
        );'''
required_totals_new = '''        const requiredTotal = requiredPersonnel.reduce(
            (total, requirement) => {
                return total + requirement.required;
            },
            0
        );
        const coveredTotal = requiredPersonnel.reduce(
            (total, requirement) => {
                return total + Math.min(
                    requirement.required,
                    getSelectedTrainedPersonnelCountForCode(
                        selectedVehicles,
                        requirement.code
                    )
                );
            },
            0
        );
        const liveMissingTotal = liveMissingPersonnel.reduce(
            (total, requirement) => {
                return total + requirement.missing;
            },
            0
        );'''
source = replace_once(
    source,
    required_totals_old,
    required_totals_new,
    'Trained Personnel panel live shortage total'
)

empty_condition_old = '''        if (
            requiredPersonnel.length === 0 &&
            selectedVehicles.length === 0
        ) {
            if (
                missionVehiclesOnSceneForTrainedPersonnel
            ) {
                summary.textContent =
                    'Vehicles are on scene. Live personnel and course shortages are authoritative.';
                content.innerHTML =
                    '<span class="mf2026-small">Mission Required Personnel is shown only before the first vehicle arrives on scene.</span>';
                return;
            }'''
empty_condition_new = '''        if (
            requiredPersonnel.length === 0 &&
            liveMissingPersonnel.length === 0 &&
            selectedVehicles.length === 0
        ) {
            if (
                missionVehiclesOnSceneForTrainedPersonnel
            ) {
                summary.textContent =
                    'No current trained-personnel shortage is reported.';
                content.innerHTML =
                    '<span class="mf2026-small">Vehicles are on scene. Live personnel and course shortages are authoritative; Mission Required Personnel is shown only before the first vehicle arrives on scene.</span>';
                return;
            }'''
source = replace_once(
    source,
    empty_condition_old,
    empty_condition_new,
    'Trained Personnel panel on-scene empty state'
)

summary_anchor = '''        if (requiredPersonnel.length > 0) {
            summaryParts.push(`
                <div><strong>${requiredPersonnel.length}</strong> required course${requiredPersonnel.length === 1 ? '' : 's'}</div>
                <div><strong>${coveredTotal}</strong> / <strong>${requiredTotal}</strong> required trained-personnel coverage</div>
            `);
        }

        if (selectedVehicles.length > 0) {'''
summary_replacement = '''        if (requiredPersonnel.length > 0) {
            summaryParts.push(`
                <div><strong>${requiredPersonnel.length}</strong> required course${requiredPersonnel.length === 1 ? '' : 's'}</div>
                <div><strong>${coveredTotal}</strong> / <strong>${requiredTotal}</strong> required trained-personnel coverage</div>
            `);
        }

        if (liveMissingPersonnel.length > 0) {
            summaryParts.push(`
                <div><strong>${liveMissingPersonnel.length}</strong> current missing course${liveMissingPersonnel.length === 1 ? '' : 's'}</div>
                <div><strong>${liveMissingTotal}</strong> trained personnel still missing</div>
            `);
        } else if (
            missionVehiclesOnSceneForTrainedPersonnel
        ) {
            summaryParts.push(`
                <div><strong>0</strong> current trained-personnel shortages</div>
            `);
        }

        if (selectedVehicles.length > 0) {'''
source = replace_once(
    source,
    summary_anchor,
    summary_replacement,
    'Trained Personnel panel live shortage summary'
)

markup_anchor = '''        const selectedMarkup = selectedVehicles.map(vehicle => {'''
live_markup = '''        const liveMissingMarkup = liveMissingPersonnel.length > 0
            ? `
                <div class="mf2026-training-vehicle">
                    <div class="mf2026-training-vehicle-name">
                        Current Missing Personnel
                    </div>
                    ${liveMissingPersonnel.map(requirement => {
                        return `
                            <div class="mf2026-training-person">
                                <span class="mf2026-training-person-label">${requirement.missing} missing</span>
                                <span class="mf2026-training-course-list">${escapeHtml(requirement.label)} · current live shortage</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `
            : '';

'''
source = replace_once(
    source,
    markup_anchor,
    live_markup + markup_anchor,
    'Trained Personnel panel live shortage markup'
)

content_old = '''        content.innerHTML =
            requiredMarkup +
            selectedMarkup;'''
content_new = '''        content.innerHTML =
            requiredMarkup +
            liveMissingMarkup +
            selectedMarkup;'''
source = replace_once(
    source,
    content_old,
    content_new,
    'Trained Personnel panel markup order'
)

SOURCE_PATH.write_text(source, encoding='utf-8')

# Advance permanent source-version expectations to the new release baseline.
for check_path in sorted((ROOT / 'scripts').glob('check-*.mjs')):
    text = check_path.read_text(encoding='utf-8')
    text = text.replace(
        '// @version      1.0.80',
        '// @version      1.0.81'
    )
    text = text.replace(
        'MISSION FINDER V10.6.140',
        'MISSION FINDER V10.6.141'
    )
    check_path.write_text(text, encoding='utf-8')

new_check = r'''#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractFunction(name) {
  const pattern = new RegExp(
    `^\\s*(?:async\\s+)?function\\s+${name}\\s*\\(`,
    'm'
  );
  const match = source.match(pattern);
  if (!match || match.index == null) fail(`Unable to find ${name}`);
  const start = match.index;
  const signatureEnd = source.indexOf(') {', start);
  if (signatureEnd < 0) fail(`Unable to find ${name} body`);
  const bodyStart = signatureEnd + 2;
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
      const lineEnd = source.indexOf('\n', index + 2);
      index = lineEnd < 0 ? source.length : lineEnd;
      continue;
    }
    if (character === '/' && next === '*') {
      const blockEnd = source.indexOf('*/', index + 2);
      if (blockEnd < 0) fail(`Unclosed comment in ${name}`);
      index = blockEnd + 1;
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

expect(source.includes('// @version      1.0.81'), 'Expected Command Nexus 1.0.81');
expect(source.includes(' * MODULE 2: MISSION FINDER V10.6.141'), 'Expected Mission Finder V10.6.141');

const helper = extractFunction(
  'getLiveMissionTrainedPersonnelRequirementsForDisplay'
);
for (const token of [
  'hasMissionVehiclesOnSceneForTrainedPersonnelAuthority()',
  'readMissionUpdateRows({ silent: true })',
  'normaliseOperationalRequirementRows(',
  'row?.isTrainedPersonnelRequirement === true',
  'row?.personnelTrainingRequirements',
  'requirement?.personnelRequired ??',
  'requirement?.required',
  'getSelectedTrainingDisplayLabel(code)',
  'missing > existing.missing'
]) {
  expect(helper.includes(token), `Live shortage helper missing ${token}`);
}
for (const forbidden of [
  'fetch(',
  'setInterval(',
  'MutationObserver',
  'scheduleMissionRequiredPersonnelPreload('
]) {
  expect(!helper.includes(forbidden), `Live shortage helper must not use ${forbidden}`);
}

const panel = extractFunction('renderSelectedTrainedPersonnelPanel');
for (const token of [
  'let liveMissingPersonnel = [];',
  'getLiveMissionTrainedPersonnelRequirementsForDisplay()',
  'const liveMissingTotal =',
  'current missing course',
  'trained personnel still missing',
  'Current Missing Personnel',
  '${requirement.missing} missing',
  'current live shortage',
  'requiredMarkup +',
  'liveMissingMarkup +',
  'selectedMarkup'
]) {
  expect(panel.includes(token), `Panel live-shortage display missing ${token}`);
}
expect(
  !panel.includes('requirement.missing -'),
  'MissionChief live shortage must not be reduced by selected checkboxes again'
);
expect(
  panel.includes('getSelectedTrainedPersonnelPanelModel()'),
  'Selected-vehicle training evidence must remain visible'
);
for (const forbidden of [
  'fetch(',
  'setInterval(',
  'MutationObserver',
  'scheduleMissionRequiredPersonnelPreload('
]) {
  expect(!panel.includes(forbidden), `Panel rendering must not use ${forbidden}`);
}

const helperRuntime = Function(
  `"use strict";\n` +
  `function hasMissionVehiclesOnSceneForTrainedPersonnelAuthority() { return true; }\n` +
  `function readMissionUpdateRows() { return [{isTrainedPersonnelRequirement:true, personnelTrainingRequirements:[` +
    `{code:'police_medic',required:4},` +
    `{code:'police_sergeant',required:2},` +
    `{code:'police_medic',required:3}` +
  `]}]; }\n` +
  `function normaliseOperationalRequirementRows(rows) { return rows; }\n` +
  `function getSelectedTrainingDisplayLabel(code) { return code; }\n` +
  `const mfDebugEnabled = false;\n` +
  `function debugLog() {}\n` +
  helper + '\n' +
  `return { getLiveMissionTrainedPersonnelRequirementsForDisplay };`
)();
const rows = helperRuntime
  .getLiveMissionTrainedPersonnelRequirementsForDisplay();
const byCode = new Map(rows.map(row => [row.code, row.missing]));
expect(byCode.get('police_medic') === 4, 'Live duplicate course must retain the maximum current shortage');
expect(byCode.get('police_sergeant') === 2, 'Live Police Sergeant shortage was not preserved');

console.log('Live trained-personnel missing display checks passed.');
'''
(ROOT / 'scripts/check-trained-personnel-live-missing-display-v1081.mjs')\
    .write_text(new_check, encoding='utf-8')

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(
    readme,
    '**Current version:** `1.0.80` · **Mission Finder engine:** `V10.6.140`',
    '**Current version:** `1.0.81` · **Mission Finder engine:** `V10.6.141`',
    'README current baseline'
)
readme_path.write_text(readme, encoding='utf-8')

source_readme_path = ROOT / 'src/README.md'
source_readme = source_readme_path.read_text(encoding='utf-8')
source_readme = replace_once(
    source_readme,
    '| Command Nexus version | `1.0.80` |',
    '| Command Nexus version | `1.0.81` |',
    'Source README Command Nexus baseline'
)
source_readme = replace_once(
    source_readme,
    '| Mission Finder baseline | `V10.6.140` |',
    '| Mission Finder baseline | `V10.6.141` |',
    'Source README Mission Finder baseline'
)
source_readme_path.write_text(source_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
anchor = '## [1.0.80] - 2026-08-01\n'
section = '''## [1.0.81] - 2026-08-01

### Fixed

- After vehicles arrive on scene, the Trained Personnel panel now displays the current live Missing Personnel/course shortages already parsed by Mission Update.
- The panel switches from the fresh-mission **Mission Required Personnel** totals to a **Current Missing Personnel** section with the exact remaining count for each supported course.
- When no live trained-personnel shortage is reported, the panel explicitly shows zero current shortages rather than retaining the new-mission totals.

### Safety and authority

- Before the first vehicle reaches the scene, the existing mission-definition Required Personnel totals and selected/required coverage remain unchanged.
- Live shortage values are already residual MissionChief demand and are not reduced a second time by selected vehicle checkboxes.
- Selected-vehicle Personnel Register evidence remains visible beneath the live shortage section.
- The display reuses `readMissionUpdateRows({ silent: true })`; it adds no fetch, timer, observer, selection or dispatch side effect.
- Vehicle Load, Unit Finder, Mission Update, Auto Mode, memory lifecycle and iOS/iPadOS paths remain unchanged.

### Changed engine baseline

- Mission Finder increased from `V10.6.140` to `V10.6.141`.
- Unit Naming remains `3.3.9`.
- Station Naming remains `1.3.3`.
- Personnel Assignment remains `1.3.8`.

'''
changelog = replace_once(
    changelog,
    anchor,
    section + anchor,
    'Changelog 1.0.81 insertion'
)
changelog_path.write_text(changelog, encoding='utf-8')
