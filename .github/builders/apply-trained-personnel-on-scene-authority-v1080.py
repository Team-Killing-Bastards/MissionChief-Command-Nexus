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
    '// @version      1.0.79',
    '// @version      1.0.80',
    'Command Nexus version'
)
source = replace_once(
    source,
    ' * MODULE 2: MISSION FINDER V10.6.139',
    ' * MODULE 2: MISSION FINDER V10.6.140',
    'Mission Finder version'
)

preload_anchor = '''    function getPreloadedMissionTrainedPersonnelRequirements() {'''
helper_block = '''    function isMissionDefinitionRequiredPersonnelRequirementRow(row) {
        return !!(
            row?.missionDefinitionRequiredPersonnel ||
            row?.source ===
                'mission-definition-required-personnel'
        );
    }

    function hasMissionVehiclesOnSceneForTrainedPersonnelAuthority() {
        return getMissionAccessibleDocuments().some(
            candidateDocument => {
                try {
                    return !!candidateDocument.querySelector(
                        '#mission_vehicle_at_mission tbody tr[id^="vehicle_row"], ' +
                        '#mission_vehicle_at_mission tr[id^="vehicle_row"]'
                    );
                } catch (_error) {
                    return false;
                }
            }
        );
    }

    function filterMissionDefinitionRequiredPersonnelForScene(
        rows,
        vehiclesOnScene =
            hasMissionVehiclesOnSceneForTrainedPersonnelAuthority()
    ) {
        const safeRows =
            Array.isArray(rows)
                ? rows
                : [];

        if (!vehiclesOnScene) {
            return safeRows;
        }

        return safeRows.filter(row => {
            return !isMissionDefinitionRequiredPersonnelRequirementRow(
                row
            );
        });
    }

'''
if helper_block.strip() in source:
    raise SystemExit('On-scene authority helpers already exist')
source = replace_once(
    source,
    preload_anchor,
    helper_block + preload_anchor,
    'Required Personnel helper insertion'
)

preload_opening_old = '''    function getPreloadedMissionTrainedPersonnelRequirements() {
        const cache =
            getMissionRequirementPreloadState();'''
preload_opening_new = '''    function getPreloadedMissionTrainedPersonnelRequirements() {
        if (
            hasMissionVehiclesOnSceneForTrainedPersonnelAuthority()
        ) {
            return [];
        }

        const cache =
            getMissionRequirementPreloadState();'''
source = replace_once(
    source,
    preload_opening_old,
    preload_opening_new,
    'Required Personnel preload scene guard'
)

process_authority_old = '''        const suppliedHasExplicitCurrentMissingRequirements =
            hasExplicitCurrentMissingRequirementRows(
                requirementRows
            );

        const suppliedHasMissionDefinitionPersonnel =
            (Array.isArray(requirementRows) ? requirementRows : [])
                .some(row => {
                    return !!(
                        row?.missionDefinitionRequiredPersonnel ||
                        row?.source ===
                            'mission-definition-required-personnel'
                    );
                });'''
process_authority_new = '''        const missionVehiclesOnSceneForTrainedPersonnel =
            hasMissionVehiclesOnSceneForTrainedPersonnelAuthority();
        const requirementRowCountBeforeSceneAuthority =
            Array.isArray(requirementRows)
                ? requirementRows.length
                : 0;

        requirementRows =
            filterMissionDefinitionRequiredPersonnelForScene(
                requirementRows,
                missionVehiclesOnSceneForTrainedPersonnel
            );

        if (
            mfDebugEnabled &&
            missionVehiclesOnSceneForTrainedPersonnel &&
            requirementRows.length <
                requirementRowCountBeforeSceneAuthority
        ) {
            debugLog(
                'TRAINED PERSONNEL LIVE AUTHORITY',
                'Vehicles are on scene; mission-definition Required Personnel and course rows were ignored in favour of current live shortages.'
            );
        }

        const suppliedHasExplicitCurrentMissingRequirements =
            hasExplicitCurrentMissingRequirementRows(
                requirementRows
            );

        const suppliedHasMissionDefinitionPersonnel =
            (Array.isArray(requirementRows) ? requirementRows : [])
                .some(
                    isMissionDefinitionRequiredPersonnelRequirementRow
                );'''
source = replace_once(
    source,
    process_authority_old,
    process_authority_new,
    'Initial trained-personnel authority hand-off'
)

panel_state_old = '''        let preloadState = { status: 'idle' };
        let requiredPersonnel = [];

        try {
            preloadState =
                getMissionRequirementPreloadState();
            requiredPersonnel =
                getPreloadedMissionTrainedPersonnelRequirements();'''
panel_state_new = '''        let preloadState = { status: 'idle' };
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
source = replace_once(
    source,
    panel_state_old,
    panel_state_new,
    'Trained Personnel panel scene state'
)

panel_empty_old = '''        if (
            requiredPersonnel.length === 0 &&
            selectedVehicles.length === 0
        ) {
            if (preloadState.status === 'loading') {'''
panel_empty_new = '''        if (
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
            }

            if (preloadState.status === 'loading') {'''
source = replace_once(
    source,
    panel_empty_old,
    panel_empty_new,
    'Trained Personnel panel live-authority message'
)

SOURCE_PATH.write_text(source, encoding='utf-8')

# Advance every permanent regression expectation to the new production baseline.
for check_path in sorted((ROOT / 'scripts').glob('check-*.mjs')):
    text = check_path.read_text(encoding='utf-8')
    text = text.replace(
        '// @version      1.0.79',
        '// @version      1.0.80'
    )
    text = text.replace(
        'MISSION FINDER V10.6.139',
        'MISSION FINDER V10.6.140'
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

expect(
  source.includes('// @version      1.0.80'),
  'Expected Command Nexus 1.0.80'
);
expect(
  source.includes(' * MODULE 2: MISSION FINDER V10.6.140'),
  'Expected Mission Finder V10.6.140'
);

const rowClassifier = extractFunction(
  'isMissionDefinitionRequiredPersonnelRequirementRow'
);
for (const token of [
  'missionDefinitionRequiredPersonnel',
  "'mission-definition-required-personnel'"
]) {
  expect(
    rowClassifier.includes(token),
    `Static Required Personnel classifier missing ${token}`
  );
}

const sceneDetector = extractFunction(
  'hasMissionVehiclesOnSceneForTrainedPersonnelAuthority'
);
for (const token of [
  'getMissionAccessibleDocuments()',
  '#mission_vehicle_at_mission tbody tr[id^="vehicle_row"]',
  '#mission_vehicle_at_mission tr[id^="vehicle_row"]',
  'candidateDocument.querySelector('
]) {
  expect(
    sceneDetector.includes(token),
    `On-scene detector missing ${token}`
  );
}
expect(
  !sceneDetector.includes('#mission_vehicle_driving'),
  'En-route vehicles must not suppress the initial course requirements'
);

const sceneFilter = extractFunction(
  'filterMissionDefinitionRequiredPersonnelForScene'
);
for (const token of [
  'vehiclesOnScene =',
  'hasMissionVehiclesOnSceneForTrainedPersonnelAuthority()',
  'if (!vehiclesOnScene)',
  'isMissionDefinitionRequiredPersonnelRequirementRow('
]) {
  expect(sceneFilter.includes(token), `Scene filter missing ${token}`);
}

const preload = extractFunction(
  'getPreloadedMissionTrainedPersonnelRequirements'
);
const preloadSceneIndex = preload.indexOf(
  'hasMissionVehiclesOnSceneForTrainedPersonnelAuthority()'
);
const preloadCacheIndex = preload.indexOf(
  'getMissionRequirementPreloadState()'
);
expect(
  preloadSceneIndex >= 0 &&
  preloadCacheIndex > preloadSceneIndex &&
  preload.includes('return [];'),
  'Panel preload must stop before reading static Required Personnel when vehicles are on scene'
);

const process = extractFunction('processRequirementRows');
for (const token of [
  'const missionVehiclesOnSceneForTrainedPersonnel =',
  'filterMissionDefinitionRequiredPersonnelForScene(',
  'requirementRowCountBeforeSceneAuthority',
  "'TRAINED PERSONNEL LIVE AUTHORITY'",
  'hasExplicitCurrentMissingRequirementRows(',
  'isMissionDefinitionRequiredPersonnelRequirementRow',
  'requirementRows = readMissionUpdateRows();'
]) {
  expect(process.includes(token), `Initial authority path missing ${token}`);
}
expect(
  process.indexOf('filterMissionDefinitionRequiredPersonnelForScene(') <
    process.indexOf('hasExplicitCurrentMissingRequirementRows('),
  'Static personnel rows must be filtered before the live authority decision'
);
expect(
  process.includes('!suppliedHasMissionDefinitionPersonnel'),
  'No-vehicle static personnel authority must remain available'
);

const panel = extractFunction('renderSelectedTrainedPersonnelPanel');
for (const token of [
  'missionVehiclesOnSceneForTrainedPersonnel',
  'hasMissionVehiclesOnSceneForTrainedPersonnelAuthority()',
  'Vehicles are on scene. Live personnel and course shortages are authoritative.',
  'Mission Required Personnel is shown only before the first vehicle arrives on scene.'
]) {
  expect(panel.includes(token), `Trained Personnel panel missing ${token}`);
}
expect(
  !panel.includes('scheduleMissionRequiredPersonnelPreload('),
  'Panel rendering must remain side-effect free'
);

const filterRuntime = Function(
  `"use strict";\n${rowClassifier}\n` +
  `function hasMissionVehiclesOnSceneForTrainedPersonnelAuthority() { return false; }\n` +
  `${sceneFilter}\n` +
  `return { filterMissionDefinitionRequiredPersonnelForScene };`
)();

const rows = [
  {
    id: 'static-course',
    missionDefinitionRequiredPersonnel: true,
    isTrainedPersonnelRequirement: true
  },
  {
    id: 'static-source',
    source: 'mission-definition-required-personnel'
  },
  {
    id: 'live-course',
    isTrainedPersonnelRequirement: true,
    updateSource: 'Missing Personnel'
  },
  { id: 'ordinary-vehicle' }
];
expect(
  filterRuntime
    .filterMissionDefinitionRequiredPersonnelForScene(rows, false)
    .length === 4,
  'All rows must remain before any vehicle is on scene'
);
const filtered = filterRuntime
  .filterMissionDefinitionRequiredPersonnelForScene(rows, true);
expect(
  filtered.map(row => row.id).join(',') ===
    'live-course,ordinary-vehicle',
  'Only mission-definition personnel/course rows should be removed on scene'
);

console.log(
  'Trained-personnel on-scene authority checks passed.'
);
'''
(ROOT / 'scripts/check-trained-personnel-on-scene-authority-v1080.mjs')\
    .write_text(new_check, encoding='utf-8')

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(
    readme,
    '**Current version:** `1.0.79` · **Mission Finder engine:** `V10.6.139`',
    '**Current version:** `1.0.80` · **Mission Finder engine:** `V10.6.140`',
    'README current baseline'
)
readme_path.write_text(readme, encoding='utf-8')

source_readme_path = ROOT / 'src/README.md'
source_readme = source_readme_path.read_text(encoding='utf-8')
source_readme = replace_once(
    source_readme,
    '| Command Nexus version | `1.0.79` |',
    '| Command Nexus version | `1.0.80` |',
    'Source README Command Nexus baseline'
)
source_readme = replace_once(
    source_readme,
    '| Mission Finder baseline | `V10.6.139` |',
    '| Mission Finder baseline | `V10.6.140` |',
    'Source README Mission Finder baseline'
)
source_readme_path.write_text(source_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
changelog_anchor = '## [1.0.79] - 2026-08-01\n'
changelog_section = '''## [1.0.80] - 2026-08-01

### Fixed

- Mission-definition **Required Personnel** and course totals are now authoritative only while no vehicle has reached the mission scene.
- As soon as `#mission_vehicle_at_mission` contains a real `vehicle_row`, initial Unit Finder filters the static personnel/course rows before choosing its authority source.
- The Trained Personnel panel hides the cached **Mission Required Personnel** totals after the first vehicle arrives and explains that live personnel and course shortages are authoritative.

### Safety and authority

- Vehicles listed only in `#mission_vehicle_driving` remain en route and do not suppress the initial mission-definition requirements.
- Current live Missing Personnel/course rows remain actionable after vehicles arrive on scene.
- Ordinary vehicle requirements, Personnel Register evidence, trained-vehicle optimisation, Mission Update, Auto Mode, Vehicle Load and iOS/iPadOS paths remain unchanged.
- The panel continues to be display-only and adds no fetch, timer or observer.

### Changed engine baseline

- Mission Finder increased from `V10.6.139` to `V10.6.140`.
- Unit Naming remains `3.3.9`.
- Station Naming remains `1.3.3`.
- Personnel Assignment remains `1.3.8`.

'''
if changelog_anchor not in changelog:
    raise SystemExit('Changelog 1.0.79 anchor not found')
changelog_path.write_text(
    changelog.replace(
        changelog_anchor,
        changelog_section + changelog_anchor,
        1
    ),
    encoding='utf-8'
)

workflow_path = ROOT / '.github/workflows/validate-userscript.yml'
workflow = workflow_path.read_text(encoding='utf-8')
workflow = replace_once(
    workflow,
    '# Includes mission-definition trained-personnel, Required Personnel preload,',
    '# Includes mission-definition trained-personnel, on-scene trained-personnel authority, Required Personnel preload,',
    'Validation workflow coverage summary'
)
path_anchor = "      - 'scripts/check-mission-definition-personnel-preload.mjs'\n"
if workflow.count(path_anchor) != 2:
    raise SystemExit(
        'Validation workflow: expected two personnel-preload path anchors'
    )
workflow = workflow.replace(
    path_anchor,
    path_anchor +
    "      - 'scripts/check-trained-personnel-on-scene-authority-v1080.mjs'\n"
)
step_anchor = '''      - name: Validate mission-definition Required Personnel preload
        run: node scripts/check-mission-definition-personnel-preload.mjs
'''
step = '''
      - name: Validate trained-personnel on-scene authority
        run: node scripts/check-trained-personnel-on-scene-authority-v1080.mjs
'''
workflow = replace_once(
    workflow,
    step_anchor,
    step_anchor + step,
    'Validation workflow on-scene authority step'
)
workflow_path.write_text(workflow, encoding='utf-8')

# Remove every one-use inspection/apply artefact before validation and review.
for path_name in (
    '.github/builders/inspect-trained-personnel-authority-v1080.py',
    '.github/diagnostics/trained-personnel-authority-v1080.txt',
    '.github/workflows/inspect-trained-personnel-authority-v1080.yml',
    '.github/builders/apply-trained-personnel-on-scene-authority-v1080.py',
    '.github/workflows/apply-trained-personnel-on-scene-authority-v1080.yml',
):
    (ROOT / path_name).unlink(missing_ok=True)
