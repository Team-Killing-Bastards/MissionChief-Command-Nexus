#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

// Permanent regression for Auto Mode, EOD subtype separation and composite personnel.
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
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  fail(`Unterminated function ${name}`);
}

expect(source.includes('// @version      1.0.64'), 'Expected current Command Nexus version');
expect(source.includes('MISSION FINDER V10.6.127'), 'Expected current Mission Finder version');

const autoLoop = extractFunction('runAutoModeLoop');
expect(
  /getExplicitCurrentMissingRequirementRows\s*\(\s*postUnitFinderUpdateRows\s*\)/s.test(autoLoop),
  'Auto Mode must filter the post-Unit Finder snapshot to explicit missing rows'
);
expect(
  /postUnitFinderExplicitMissingRows\.length\s*>\s*0/s.test(autoLoop),
  'Auto Mode must skip its update pass when there is no explicit shortage'
);
expect(
  /handleMissionUpdateUnits\s*\(\s*false\s*,\s*postUnitFinderExplicitMissingRows\s*\)/s.test(autoLoop),
  'Auto Mode must pass only explicit missing rows to Mission Update'
);
expect(
  !/handleMissionUpdateUnits\s*\(\s*false\s*,\s*postUnitFinderUpdateRows\s*\)/s.test(autoLoop),
  'Auto Mode must not reprocess the full post-Unit Finder table'
);
expect(
  /shouldRunPostSelectionMissionUpdate\s*\(\s*autoSelectionRunState\s*\)/s.test(autoLoop),
  'Auto Mode must suppress the post-selection pass when current Mission Update authority was already processed'
);

const eodMode = vm.runInNewContext(`(${extractFunction('getEodResponseRequirementMode')})`, {
  normaliseVehicleText: value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim(),
  Set,
});
expect(eodMode('EOD Response Vehicles', 'EOD Response Vehicles') === 'normal',
  'Normal EOD requirement mode was not recognised');
expect(eodMode('Marine EOD Response Vehicles', 'Marine EOD Response Vehicles') === 'marine',
  'Marine EOD requirement mode was not recognised');
expect(source.includes("typeIds.includes('110')"), 'Normal EOD must use exact type 110');
expect(source.includes("typeIds.includes('113')"), 'Marine EOD must use exact type 113');

const compositeSar = vm.runInNewContext(
  `(${extractFunction('getMissionDefinitionSarPersonnelVehicleRequirements')})`,
  {
    cleanRequirementName: value => String(value || '').replace(/^Required\s+/i, '').trim(),
    getSarPersonnelVehicleRequirement: (name, required) => ({
      unitName: name === 'SAR Commander' ? 'Control Van' : 'SARTEC',
      stillNeeded: Math.ceil(required / (name === 'SAR Commander' ? 2 : 4)),
      personnelRequirement: `${required} ${name}${required === 1 ? '' : 's'}`,
    }),
    String,
    Math,
    Number,
    parseInt,
  }
);

const composite = compositeSar(
  'Required Personnel',
  '1x Search Advisor 2x SAR Commander 4x Search Technicians'
);
expect(composite.length === 2, 'Expected SAR Commander and Search Technician conversions');
expect(composite.some(item => item.unitName === 'Control Van' && item.stillNeeded === 1),
  '2 SAR Commanders must require one Control Van');
expect(composite.some(item => item.unitName === 'SARTEC' && item.stillNeeded === 1),
  '4 Search Technicians must require one SARTEC');
expect(compositeSar('Required Personnel Available', '2x SAR Commander').length === 0,
  'Required Personnel Available must remain a precondition only');
expect(source.includes("code:\n                    'search_and_rescue'"),
  'Search Advisor must remain in trained-profile parsing');
expect(source.includes('missionDefinitionRequiredPersonnel:\n                                    true'),
  'Composite SAR rows must retain mission-definition authority');
expect(source.includes('const MF_UNIT_FINDER_DIAGNOSTICS_LIMIT = 24;'),
  'Diagnostic history limit must be 24');
expect(source.includes('emptyMissionUpdateSnapshot'),
  'Empty Mission Update diagnostic snapshots must be suppressed');

console.log('Auto single-pass, EOD separation and Required Personnel regression passed.');
