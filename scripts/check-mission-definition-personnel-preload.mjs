#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(token, label) {
  if (!source.includes(token)) fail(`Missing Required Personnel preload contract: ${label}`);
}

function extractFunction(name, asyncFunction = false) {
  const signature = asyncFunction
    ? `    async function ${name}(`
    : `    function ${name}(`;
  const start = source.indexOf(signature);
  if (start < 0) fail(`Unable to find ${name}`);
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

requireText('// @version      1.0.108', 'Command Nexus version');
requireText(' * MODULE 2: MISSION FINDER V10.6.153', 'Mission Finder version');
requireText('function scheduleMissionRequiredPersonnelPreload(', 'mission-load scheduler');
requireText('function preloadMissionRequiredPersonnel(', 'authoritative preload runner');
requireText('function getPreloadedMissionTrainedPersonnelRequirements(', 'required-course panel model');
requireText('function extractMissionDefinitionRequiredPersonnelRows(', 'cross-table Required Personnel extractor');
requireText('rawMissionDefinitionRequiredPersonnelRows', 'cross-table raw-row evidence');
requireText('function getCachedMissionRequirementRows(', 'mission requirement cache reader');
requireText('function setCachedMissionRequirementRows(', 'mission requirement cache writer');
requireText('Mission Required Personnel', 'visible Required Personnel panel label');
requireText('still needed', 'visible trained-personnel shortfall');

const readRequirements = extractFunction('readLiveMissionRequirements', true);
for (const token of [
  'options = {}',
  'allowCached',
  'getCachedMissionRequirementRows(',
  'mfMissionRequirementPreloadPromise',
  'setCachedMissionRequirementRows(',
  'missionKeyAtFetchStart',
]) {
  if (!readRequirements.includes(token)) fail(`Requirement reader missing ${token}`);
}

const panel = extractFunction('renderSelectedTrainedPersonnelPanel');
for (const token of [
  'getPreloadedMissionTrainedPersonnelRequirements()',
  'getSelectedTrainedPersonnelCountForCode(',
  'Mission Required Personnel',
  'still needed',
]) {
  if (!panel.includes(token)) fail(`Trained-personnel panel missing ${token}`);
}
if (panel.includes('scheduleMissionRequiredPersonnelPreload(')) {
  fail('Trained-personnel rendering must not start another preload cycle');
}
if (!panel.includes('panel cache read failed')) {
  fail('Trained-personnel rendering must isolate preload-cache failures');
}

const mountStart = source.indexOf('        wrapper.appendChild(loadPanel);');
const mountEnd = source.indexOf(
  '        function syncVehicleLoadCollapseState() {',
  mountStart
);
if (mountStart < 0 || mountEnd < 0) {
  fail('Unable to isolate the mission-panel mount lifecycle');
}
const mountLifecycle = source.slice(mountStart, mountEnd);
for (const token of [
  'wrapper.appendChild(trainedPanel);',
  'document.body.appendChild(wrapper);',
  'scheduleMissionRequiredPersonnelPreload(0);',
]) {
  if (!mountLifecycle.includes(token)) {
    fail(`Mission-panel mount lifecycle missing ${token}`);
  }
}
if (
  mountLifecycle.indexOf('scheduleMissionRequiredPersonnelPreload(0);') <
  mountLifecycle.indexOf('document.body.appendChild(wrapper);')
) {
  fail('Required Personnel preload must start after the mission panels mount');
}

const fixture = `
<tr>
  <td>Required Personnel</td>
  <td>
    12x Level 2 Public Order Officer<br>
    2x Police Medic<br>
    1x Police Sergeant<br>
  </td>
</tr>`;
const label = fixture.match(/<td>\s*([^<]+?)\s*<\/td>/i)?.[1]?.trim();
const valueCell = fixture.match(/<td>\s*12x[\s\S]*?<\/td>/i)?.[0] || '';
const value = valueCell
  .replace(/<br\s*\/?\s*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .trim();

if (label !== 'Required Personnel') fail(`Fixture row label was ${label}`);
const expected = new Map([
  ['Level 2 Public Order Officer', 12],
  ['Police Medic', 2],
  ['Police Sergeant', 1],
]);
for (const [course, amount] of expected) {
  const match = value.match(new RegExp(`(?:^|\\n)\\s*(\\d+)x\\s+${course}(?:s)?\\s*(?:$|\\n)`, 'i'));
  if (Number(match?.[1]) !== amount) {
    fail(`Fixture did not preserve ${amount}x ${course}`);
  }
}

const definitionCheck = extractFunction('getMissionDefinitionTrainedPersonnelRequirements');
if (!definitionCheck.includes('/^Personnel')) {
  fail('Required Personnel classifier no longer excludes Required Personnel Available');
}


const crossTableExtractor = extractFunction(
  'extractMissionDefinitionRequiredPersonnelRows'
);
for (const token of [
  "doc.querySelectorAll(",
  "'table tbody tr, table tr'",
  'excludedTable.contains(tr)',
  'getMissionDefinitionTrainedPersonnelRequirements(',
  'getMissionDefinitionSarPersonnelVehicleRequirements(',
  'missionDefinitionRequiredPersonnelFound',
  'rawMissionDefinitionRequiredPersonnelRows',
]) {
  if (!crossTableExtractor.includes(token)) {
    fail(`Cross-table Required Personnel extractor missing ${token}`);
  }
}

const liveExtractor = extractFunction('extractLiveMissionRequirementRows');
for (const token of [
  'extractMissionDefinitionRequiredPersonnelRows(',
  'const supplementalPersonnelRows =',
  '.rawMissionDefinitionRequiredPersonnelRows',
  '.missionDefinitionRequiredPersonnelFound',
]) {
  if (!liveExtractor.includes(token)) {
    fail(`Live mission extractor missing cross-table contract ${token}`);
  }
}

const crossTableFixture = `
<table>
  <thead><tr><th>Reward and Precondition</th><th>Value</th></tr></thead>
  <tbody><tr><td>Required Personnel Available</td><td>60x Level 2 Public Order Officer 15x Police Medic</td></tr></tbody>
</table>
<table>
  <thead><tr><th>Vehicle and Personnel Requirements</th><th>Value</th></tr></thead>
  <tbody><tr><td>Required Police Cars</td><td>6</td></tr></tbody>
</table>
<table>
  <thead><tr><th>Other information</th><th>Value</th></tr></thead>
  <tbody><tr><td>Required Personnel</td><td>27x Level 2 Public Order Officer<br>6x Police Medic<br>6x Police Sergeant<br>3x Police Inspector</td></tr></tbody>
</table>`;

const fixtureRows = Array.from(
  crossTableFixture.matchAll(/<tr>[\s\S]*?<td>([\s\S]*?)<\/td>[\s\S]*?<td>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi)
).map(match => ({
  label: match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  value: match[2].replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').trim(),
}));

const exactRequiredRows = fixtureRows.filter(row => {
  return /^Required Personnel(?:\s*\(\s*\d+\s*%\s*\))?$/i.test(row.label);
});
if (exactRequiredRows.length !== 1) {
  fail(`Expected one exact Other information Required Personnel row, found ${exactRequiredRows.length}`);
}
if (fixtureRows.some(row => row.label === 'Required Personnel Available' && exactRequiredRows.includes(row))) {
  fail('Required Personnel Available entered the exact operational row fixture');
}
for (const token of [
  '27x Level 2 Public Order Officer',
  '6x Police Medic',
  '6x Police Sergeant',
  '3x Police Inspector',
]) {
  if (!exactRequiredRows[0].value.includes(token)) {
    fail(`Cross-table Required Personnel fixture lost ${token}`);
  }
}

console.log('Mission Required Personnel preload checks passed.');
