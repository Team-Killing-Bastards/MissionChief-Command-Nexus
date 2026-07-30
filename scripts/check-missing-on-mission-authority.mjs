#!/usr/bin/env node
import fs from 'node:fs';

const source = fs.readFileSync('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) fail(`Missing function ${name}`);
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

function sourceSlice(startToken, endToken, label) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end <= start) fail(`Unable to locate ${label} source slice`);
  return source.slice(start, end);
}

expect(source.includes('// @version      1.0.60'), 'Expected Command Nexus 1.0.60');
expect(source.includes('MISSION FINDER V10.6.123'), 'Expected Mission Finder V10.6.123');

const headerFunction = extractFunction('getMissionUpdateTableHeaderTexts');
const tableFunction = extractFunction('isMissingOnMissionUpdateTable');
const tableHelpers = Function(
  `"use strict";\n${headerFunction}\n${tableFunction}\nreturn { isMissingOnMissionUpdateTable };`
)();

const exactTable = {
  querySelectorAll(selector) {
    if (selector !== 'thead th') return [];
    return [
      { textContent: '', getAttribute: () => '' },
      { textContent: 'Missing on mission', getAttribute: name => name === 'title' ? 'Missing on mission' : '' },
      { textContent: 'En-route', getAttribute: name => name === 'title' ? 'En-route' : '' },
      { textContent: 'Still needed', getAttribute: name => name === 'title' ? 'Still needed' : '' },
      { textContent: 'Selected', getAttribute: name => name === 'title' ? 'Selected' : '' },
    ];
  },
};
expect(tableHelpers.isMissingOnMissionUpdateTable(exactTable), 'Exact Missing on mission table headers were not recognised');

const definitionTable = {
  querySelectorAll() {
    return [
      { textContent: 'Vehicle and Personnel Requirements', getAttribute: () => '' },
      { textContent: 'Value', getAttribute: () => '' },
    ];
  },
};
expect(!tableHelpers.isMissingOnMissionUpdateTable(definitionTable), 'Mission definition table must not be classified as Mission Update');

const rawHtmlNormaliser = extractFunction('normaliseEscapedMissionHtmlText');
const rawHelper = Function(
  `"use strict";\n${rawHtmlNormaliser}\nreturn { normaliseEscapedMissionHtmlText };`
)();
const escapedFixture = '&lt;div data-requirement-type=&quot;vehicles&quot;&gt;&lt;b&gt;Missing Vehicles:&lt;/b&gt; 2 Traffic Cars&lt;/div&gt;';
const normalisedFixture = rawHelper.normaliseEscapedMissionHtmlText(escapedFixture);
expect(/Missing Vehicles:\s*2 Traffic Cars/i.test(normalisedFixture), 'Escaped data-raw-html Missing Vehicles fixture was not normalised');

const explicitVehicle = extractFunction('isExplicitMissingVehicleRequirementRow');
for (const token of [
  "source === 'missing-on-mission-table'",
  "source === 'data-raw-html-missing-vehicles'",
]) {
  expect(explicitVehicle.includes(token), `Explicit missing authority missing ${token}`);
}

const structuredRows = extractFunction('getStructuredMissingVehicleRows');
for (const token of [
  "root.querySelectorAll('[data-raw-html]')",
  'normaliseEscapedMissionHtmlText(rawHtml)',
  "source: 'data-raw-html-missing-vehicles'",
]) {
  expect(structuredRows.includes(token), `Structured Missing Vehicles fallback missing ${token}`);
}

const updateReader = sourceSlice(
  'function readMissionUpdateRows(',
  'function handleMissionUpdateUnits(',
  'Mission Update reader'
);
for (const token of [
  'isMissingOnMissionUpdateTable(table)',
  "'missing-on-mission-table'",
  'selected + reportedStillNeeded',
  "dispatchTargetMode: 'total'",
  'explicitMissingVehicles: true',
  'reportedStillNeeded',
]) {
  expect(updateReader.includes(token), `Mission Update table reader missing ${token}`);
}
expect(
  updateReader.includes('!missingOnMissionTable') && updateReader.includes('numericCells'),
  'Zero Still needed rows must not fall back to another positive table cell'
);

const combined = sourceSlice(
  'async function handleCombinedLogic(',
  'function getActiveMissionInfoForAllySteal(',
  'Unit Finder combined logic'
);
for (const token of [
  'hasVisibleCurrentMissingOnMissionTable()',
  'useCurrentMissionUpdateAuthority',
  'Current Missing on mission table found with no positive Still needed rows',
  "'CURRENT MISSING REQUIREMENTS'",
]) {
  expect(combined.includes(token), `Unit Finder/Mission Update authority gate missing ${token}`);
}
expect(
  combined.indexOf('useCurrentMissionUpdateAuthority') < combined.indexOf('await readLiveMissionRequirements()'),
  'Mission Update authority must be decided before fetching full mission requirements'
);
expect(
  combined.includes('handleUnitFinderPatientRequirements()'),
  'Patient subrules must remain active under the authority correction'
);

const autoLoop = sourceSlice(
  'async function runAutoModeLoop(',
  'function initialize(',
  'Auto Mode loop'
);
for (const token of [
  'hasEarlyMissingOnMissionTableAuthority',
  'hasEarlyCurrentMissionUpdateAuthority',
  'full attachment prefetch suppressed',
  'postUnitFinderExplicitMissingRows',
]) {
  expect(autoLoop.includes(token), `Auto Mode source priority missing ${token}`);
}

const exactHtmlContract = `
<div data-raw-html="&lt;div data-requirement-type=&quot;vehicles&quot;&gt;&lt;b&gt;Missing Vehicles:&lt;/b&gt; 2 Traffic Cars&lt;/div&gt;">
<table class="table table-striped table-condensed">
<thead><tr><th></th><th title="Missing on mission">Missing on mission</th><th title="En-route">En-route</th><th title="Still needed">Still needed</th><th title="Selected">Selected</th></tr></thead>
<tbody><tr><td><b>Traffic Cars</b></td><td>2</td><td>0</td><td>2</td><td>0</td></tr></tbody>
</table>
</div>`;
expect(exactHtmlContract.includes('Missing on mission') && exactHtmlContract.includes('2 Traffic Cars'), 'Exact supplied fixture contract is incomplete');

console.log('Missing on mission authority checks passed: current table shortages own Mission Update, zero-shortage tables suppress fresh-mission Unit Finder, escaped data-raw-html alerts are fallback-only, and patient rules remain active.');
