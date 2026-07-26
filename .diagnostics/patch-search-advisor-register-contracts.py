#!/usr/bin/env python3
from pathlib import Path

ROOT = Path('.')


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


for path in sorted((ROOT / 'scripts').glob('*.mjs')):
    text = path.read_text(encoding='utf-8')
    updated = (
        text
        .replace('1.0.48', '1.0.49')
        .replace('V10.6.112', 'V10.6.113')
        .replace("const PERSONNEL_VERSION = '1.3.5';", "const PERSONNEL_VERSION = '1.3.6';")
        .replace('personnel-register-exact-all-vehicle-scan-v1', 'personnel-register-exact-all-vehicle-scan-v2')
    )
    if updated != text:
        path.write_text(updated, encoding='utf-8')

check = r'''#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(token, label) {
  if (!source.includes(token)) fail(`Missing Police Search Advisor register contract: ${label}`);
}

function extractFunction(name) {
  const pattern = new RegExp(`^\\s*function\\s+${name}\\s*\\(`, 'm');
  const match = pattern.exec(source);
  if (!match) fail(`Unable to locate function ${name}`);
  const start = match.index;
  const rest = source.slice(start + match[0].length);
  const next = /^\s*function\s+[A-Za-z0-9_$]+\s*\(/m.exec(rest);
  if (!next) fail(`Unable to locate end of function ${name}`);
  return source.slice(start, start + match[0].length + next.index);
}

for (const [token, label] of [
  ['// @version      1.0.49', 'v1.0.49 metadata'],
  ["const PERSONNEL_VERSION = '1.3.6';", 'Personnel v1.3.6'],
  [' * MODULE 2: MISSION FINDER V10.6.113', 'Mission Finder V10.6.113'],
  ['personnel-register-exact-all-vehicle-scan-v2', 'second-generation exact register source'],
  ['function parseStationPersonnelAssignmentEvidence(', 'station personnel assignment fallback'],
  ['function getUniquePersonnelVehicleNameIndex(', 'unique vehicle-name fail-closed index'],
  ['function getStationPersonnelRowId(', 'station personnel ID parser'],
  ["input.personal-delete-checkbox[value]", 'MissionChief personnel checkbox ID'],
  ['stationAssignmentEvidence: true', 'station evidence marker'],
  ['Station personnel table supplied', 'fallback diagnostic'],
  ["code: 'search_and_rescue'", 'Search Advisor training code'],
  ['registryAnyVehicle:', 'Search Advisor any-vehicle route'],
  ['trainedOnly:', 'Search Advisor trained-only route'],
]) requireText(token, label);

for (const forbidden of [
  'personnel-register-exact-all-vehicle-scan-v1',
  '"Search Advisor": "Control Van"',
  '"Search Advisors": "Control Van"',
]) {
  if (source.includes(forbidden)) fail(`Forbidden legacy Search Advisor contract remains: ${forbidden}`);
}

const cleanText = value => String(value || '').replace(/\s+/g, ' ').trim();
const getVehicleIdFromHref = href => String(href || '').match(/\/vehicles\/(\d+)/)?.[1] || '';
const bundle = [
  extractFunction('normalizePersonnelVehicleName'),
  extractFunction('parseTrainingCodes'),
  extractFunction('getStationPersonnelRowId'),
  extractFunction('getUniquePersonnelVehicleNameIndex'),
  extractFunction('parseStationPersonnelAssignmentEvidence'),
].join('\n');
const helpers = Function(
  'cleanText',
  'getVehicleIdFromHref',
  `"use strict";\n${bundle}\nreturn { parseTrainingCodes, parseStationPersonnelAssignmentEvidence };`
)(cleanText, getVehicleIdFromHref);

function makeCell(text, link = null) {
  return {
    textContent: text,
    querySelector(selector) {
      if (selector === 'a[href^="/vehicles/"]') return link;
      return null;
    },
  };
}

function makeRow({
  trainingAttribute = '["drone" "search_and_rescue"]',
  assignedName = '🚔🚁 KELTY-PS1-PDV-4',
  assignedHref = '',
  status = 'Available',
  personnelId = '81427610',
} = {}) {
  const deleteCheckbox = {
    value: personnelId,
    getAttribute(name) {
      return name === 'value' ? personnelId : null;
    },
  };
  const assignedLink = assignedHref ? {
    textContent: assignedName,
    getAttribute(name) {
      return name === 'href' ? assignedHref : null;
    },
  } : null;
  const cells = [
    makeCell(''),
    makeCell('Sophie L.'),
    makeCell('Search Advisor, Drone Operator'),
    makeCell(assignedName, assignedLink),
    makeCell(status),
    makeCell(''),
  ];
  return {
    children: cells,
    id: '',
    getAttribute(name) {
      return name === 'data-filterable-by' ? trainingAttribute : null;
    },
    querySelector(selector) {
      if (selector === 'input.personal-delete-checkbox' || selector === 'input.personal-delete-checkbox[value]') {
        return deleteCheckbox;
      }
      return null;
    },
  };
}

const spaceSeparatedCodes = helpers.parseTrainingCodes(makeRow());
if (
  spaceSeparatedCodes.length !== 2 ||
  !spaceSeparatedCodes.includes('drone') ||
  !spaceSeparatedCodes.includes('search_and_rescue')
) {
  fail(`MissionChief space-separated training codes were not parsed independently: ${JSON.stringify(spaceSeparatedCodes)}`);
}

const commaCodes = helpers.parseTrainingCodes(makeRow({
  trainingAttribute: '["drone","search_and_rescue"]',
}));
if (commaCodes.length !== 2 || !commaCodes.includes('search_and_rescue')) {
  fail('Valid JSON training-code arrays regressed');
}

const row = makeRow();
const doc = {
  querySelectorAll(selector) {
    return selector === '#personal_table tbody tr' ? [row] : [];
  },
};
const vehicles = [{
  vehicleId: '7532451',
  name: '🚔🚁 KELTY-PS1-PDV-4',
  vehicleTypeId: '91',
}];
const evidence = helpers.parseStationPersonnelAssignmentEvidence(doc, vehicles);
if (evidence.length !== 1) fail('Police station personnel row did not produce exact assignment evidence');
if (evidence[0].personnelId !== '81427610') fail('Police personnel ID was not read from the delete checkbox');
if (evidence[0].assignedVehicleId !== '7532451') fail('Unique Assigned To vehicle name did not resolve to the exact vehicle ID');
if (!evidence[0].available) fail('Available status must not erase the persistent Assigned To binding');
if (!evidence[0].trainingCodes.includes('search_and_rescue')) fail('Search Advisor training was not preserved in station assignment evidence');

const duplicateVehicles = [
  { vehicleId: '1', name: 'DUPLICATE PDV' },
  { vehicleId: '2', name: 'DUPLICATE PDV' },
];
const ambiguousDoc = {
  querySelectorAll() {
    return [makeRow({ assignedName: 'DUPLICATE PDV' })];
  },
};
if (helpers.parseStationPersonnelAssignmentEvidence(ambiguousDoc, duplicateVehicles).length !== 0) {
  fail('Ambiguous duplicate vehicle names must fail closed');
}

const linkedDoc = {
  querySelectorAll() {
    return [makeRow({
      assignedName: 'DUPLICATE PDV',
      assignedHref: '/vehicles/2',
    })];
  },
};
const linkedEvidence = helpers.parseStationPersonnelAssignmentEvidence(linkedDoc, duplicateVehicles);
if (linkedEvidence.length !== 1 || linkedEvidence[0].assignedVehicleId !== '2') {
  fail('An exact Assigned To vehicle link must override duplicate-name ambiguity');
}

const buildRegister = extractFunction('buildPersonnelTrainingRegisterOneClick');
for (const token of [
  'parseStationPersonnelAssignmentEvidence(',
  'new Map(',
  'person.assignedHere && !existing.assignedHere',
  'personnel-register-exact-all-vehicle-scan-v2',
]) {
  if (!buildRegister.includes(token)) fail(`Build All Register fallback integration missing: ${token}`);
}

const publisher = extractFunction('publishPersonnelVehicleTrainingRegistry');
for (const token of [
  "String(source || '').startsWith('personnel-register-exact-')",
  "String(person?.assignedVehicleId || '') === vehicleId",
  'assignedTrainingProfiles,',
  'trainingProfilesComplete: exactVehicleProfileScan',
]) {
  if (!publisher.includes(token)) fail(`Exact vehicle profile publishing regressed: ${token}`);
}

console.log('Police Search Advisor register contracts passed: MissionChief space-separated training codes are parsed, persistent Assigned To bindings survive Available status, unique names resolve exact vehicle IDs, ambiguous names fail closed and Search Advisor remains trained-only on any exact registered vehicle.');
'''
(ROOT / 'scripts/check-police-search-advisor-register.mjs').write_text(check, encoding='utf-8')

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme = once(
    readme,
    '**Current version:** `1.0.48` · **Mission Finder engine:** `V10.6.112`',
    '**Current version:** `1.0.49` · **Mission Finder engine:** `V10.6.113`',
    'README version'
)
readme = once(
    readme,
    '- Search Advisor demand selects any exact registered vehicle carrying assigned `search_and_rescue`-trained staff; it is no longer tied to Control Vans.',
    '- Search Advisor demand selects any exact registered vehicle carrying assigned `search_and_rescue`-trained staff; Police station personnel rows also preserve the persistent **Assigned To** binding when MissionChief marks the officer Available, while ambiguous vehicle names fail closed.',
    'README Search Advisor rule'
)
readme_path.write_text(readme, encoding='utf-8')

src_readme_path = ROOT / 'src/README.md'
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = once(src_readme, '| Command Nexus version | `1.0.48` |', '| Command Nexus version | `1.0.49` |', 'source README version')
src_readme = once(src_readme, '| Mission Finder baseline | `V10.6.112` |', '| Mission Finder baseline | `V10.6.113` |', 'source README Mission Finder')
src_readme = once(
    src_readme,
    '- Run `node scripts/check-trained-coverage-optimizer.mjs`.',
    '- Run `node scripts/check-trained-coverage-optimizer.mjs`.\n- Run `node scripts/check-police-search-advisor-register.mjs`.',
    'source README regression command'
)
src_readme_path.write_text(src_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = '''## [1.0.49] - 2026-07-26

### Fixed

- Personnel training parsing now supports MissionChief's current space-separated quoted `data-filterable-by` format, so `drone` and `search_and_rescue` are stored as separate qualifications instead of one invalid combined value.
- Build All Register now supplements verified vehicle assignment pages with the station personnel table's persistent **Assigned To** value. This covers Police Search Advisors who are assigned to a Police Drone Vehicle but currently display as **Available**.
- Station-table vehicle-name fallback is accepted only when it resolves to one unique exact vehicle ID; direct `/vehicles/{id}` links remain authoritative and duplicate names fail closed.
- Exact assignment-page evidence still overrides station fallback evidence when both are available.

### Safety

- Search Advisor remains a trained-personnel requirement for `search_and_rescue` and may use any selectable exact registered vehicle carrying the assigned officer.
- Unverified assignments, missing personnel IDs and ambiguous duplicate vehicle names cannot satisfy the requirement.
- The change does not move personnel or broaden automatic Personnel Assignment target vehicles.

### Changed engine baseline

- Mission Finder increased from `V10.6.112` to `V10.6.113`.
- Personnel Assignment increased from `1.3.5` to `1.3.6`.

'''
changelog = once(changelog, '## [1.0.48] - 2026-07-26\n', entry + '## [1.0.48] - 2026-07-26\n', 'changelog entry')
changelog_path.write_text(changelog, encoding='utf-8')
