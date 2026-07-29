#!/usr/bin/env python3
from pathlib import Path

source_path = Path('src/missionchief-command-nexus.user.js')
source = source_path.read_text(encoding='utf-8')

replacements = [
    ('// @version      1.0.54', '// @version      1.0.55'),
    (' * MODULE 2: MISSION FINDER V10.6.117', ' * MODULE 2: MISSION FINDER V10.6.118'),
]
for old, new in replacements:
    if old not in source:
        raise SystemExit(f'Missing source token: {old}')
    source = source.replace(old, new, 1)

old = '''        const suppliedHasExplicitCurrentMissingRequirements =
            hasExplicitCurrentMissingRequirementRows(
                requirementRows
            );

        if (
            hasAuthoritativeLiveMissionRequirementsPanel() &&
            sourceLabel !== 'live mission requirements' &&
            !suppliedHasExplicitCurrentMissingRequirements
        ) {'''
new = '''        const suppliedHasExplicitCurrentMissingRequirements =
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
                });

        if (
            hasAuthoritativeLiveMissionRequirementsPanel() &&
            sourceLabel !== 'live mission requirements' &&
            !suppliedHasExplicitCurrentMissingRequirements &&
            !suppliedHasMissionDefinitionPersonnel
        ) {'''
if old not in source:
    raise SystemExit('Initial requirement authority block not found')
source = source.replace(old, new, 1)
source_path.write_text(source, encoding='utf-8')

for path_name in ('README.md', 'src/README.md'):
    path = Path(path_name)
    text = path.read_text(encoding='utf-8')
    if '1.0.54' not in text:
        raise SystemExit(f'No 1.0.54 version found in {path_name}')
    path.write_text(text.replace('1.0.54', '1.0.55'), encoding='utf-8')

for path in Path('scripts').glob('check-*.mjs'):
    text = path.read_text(encoding='utf-8')
    updated = text.replace('1.0.54', '1.0.55').replace('V10.6.117', 'V10.6.118')
    if updated != text:
        path.write_text(updated, encoding='utf-8')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
anchor = '## [1.0.54] - 2026-07-29\n'
if anchor not in changelog:
    raise SystemExit('1.0.54 changelog anchor not found')
section = '''## [1.0.55] - 2026-07-29

### Fixed

- Initial Unit Finder and Automatic Unit Finder now preserve mission-definition trained-personnel rows when MissionChief has rendered a live-requirements panel but has not reported an explicit current shortage.
- The generic authority guard applies to every supported mission-definition training type: Level 1 and Level 2 Public Order, Police Sergeant, Police Medic, Police Inspector, Railway Police Officer, Search Advisor and Armed Response Personnel.
- Railway Police and other trained requirements can no longer disappear between successful definition parsing and the trained-profile optimiser. Mission Update continues to use explicit live Missing Personnel and Missing Vehicles shortages.

### Validation

- Added regression coverage for all supported definition-trained codes and for the initial-dispatch authority boundary.

### Changed engine baseline

- Mission Finder increased from `V10.6.117` to `V10.6.118`.
- Personnel Assignment remains `1.3.7`.

'''
changelog_path.write_text(changelog.replace(anchor, section + anchor, 1), encoding='utf-8')

check = r'''#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(token, label) {
  if (!source.includes(token)) fail(`Missing initial trained-personnel contract: ${label}`);
}

requireText('// @version      1.0.55', 'v1.0.55 metadata');
requireText(' * MODULE 2: MISSION FINDER V10.6.118', 'Mission Finder V10.6.118 header');
requireText('const suppliedHasMissionDefinitionPersonnel =', 'definition-personnel authority detector');
requireText("row?.source ===\n                            'mission-definition-required-personnel'", 'definition source fallback');
requireText('!suppliedHasMissionDefinitionPersonnel', 'live-panel replacement exclusion');
requireText('hasExplicitCurrentMissingRequirementRows(', 'explicit current shortage authority');

const processStart = source.indexOf('    async function processRequirementRows(');
const processEnd = source.indexOf('\n    async function processVehicles(', processStart);
if (processStart < 0 || processEnd < 0) fail('Unable to isolate processRequirementRows');
const processBlock = source.slice(processStart, processEnd);

const detectorIndex = processBlock.indexOf('const suppliedHasMissionDefinitionPersonnel =');
const replacementIndex = processBlock.indexOf('requirementRows = readMissionUpdateRows();');
if (detectorIndex < 0 || replacementIndex < 0 || detectorIndex > replacementIndex) {
  fail('Definition personnel must be detected before any live-panel replacement');
}
if (!processBlock.includes('!suppliedHasMissionDefinitionPersonnel')) {
  fail('Live-panel replacement must be blocked for definition-trained rows');
}

const supportedCodes = [
  'level_1_public_order',
  'level_2_public_order',
  'police_sergeant',
  'police_medic',
  'police_inspector',
  'railway_police',
  'search_and_rescue',
  'armed_response_personnel',
];
for (const code of supportedCodes) {
  if (!source.includes(`'${code}'`)) fail(`Missing supported training code ${code}`);
}

const extractorStart = source.indexOf('    function extractLiveMissionRequirementRows(');
const extractorEnd = source.indexOf('\n    function extractTowCarRequirementRows(', extractorStart);
if (extractorStart < 0 || extractorEnd < 0) fail('Unable to isolate mission definition extractor');
const extractor = source.slice(extractorStart, extractorEnd);
for (const token of [
  'getMissionDefinitionTrainedPersonnelRequirements(',
  'missionDefinitionRequiredPersonnel:',
  "'mission-definition-required-personnel'",
]) {
  if (!extractor.includes(token)) fail(`Definition extractor missing ${token}`);
}

console.log('Initial mission-definition trained-personnel authority checks passed.');
'''
Path('scripts/check-initial-trained-personnel-authority.mjs').write_text(check, encoding='utf-8')
Path('.v1055-builder-trigger').unlink(missing_ok=True)
Path('.release-apply-v1055').unlink(missing_ok=True)
Path('scripts/apply-preserve-initial-trained-personnel-v1055.py').unlink(missing_ok=True)
