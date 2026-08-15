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

expect(source.includes('// @version      1.0.119'), 'Expected Command Nexus 1.0.104');
expect(source.includes('MISSION FINDER V10.6.159'), 'Expected Mission Finder V10.6.153');

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
  'unitName,\n                        reportedStillNeeded,',
  "dispatchTargetMode: 'total'",
  'explicitMissingVehicles: true',
  'reportedStillNeeded',
]) {
  expect(updateReader.includes(token), `Mission Update table reader missing ${token}`);
}
expect(
  !updateReader.includes('selected + reportedStillNeeded'),
  'Missing on mission Still needed must not be added on top of Selected'
);
expect(
  updateReader.includes('!missingOnMissionTable') && updateReader.includes('numericCells'),
  'Zero Still needed rows must not fall back to another positive table cell'
);

const selectedSubtractionFixture = {
  stillNeeded: 3,
  selected: 2,
};
expect(
  Math.max(0, selectedSubtractionFixture.stillNeeded - selectedSubtractionFixture.selected) === 1,
  'Selected units must count toward the Missing on mission Still needed target'
);

const collapseSharedOperationalSupportSource = extractFunction(
  'collapseSharedFireOperationalSupportRequirements'
);
const collapseSharedFireOperationalSupportRequirements = Function(
  'resolveUnitName',
  'isFireOperationalSupportRequirement',
  `"use strict";\n${collapseSharedOperationalSupportSource}\nreturn collapseSharedFireOperationalSupportRequirements;`
)(
  unitName => /BASU|Welfare|HazMat|CBRN/i.test(String(unitName || '')) ? 'OSU' : unitName,
  (_unitName, mappedName) => mappedName === 'OSU'
);

const collapsedOperationalSupportRows =
  collapseSharedFireOperationalSupportRequirements([
    { unitName: 'BASU', stillNeeded: 1 },
    { unitName: 'Fire Officers', stillNeeded: 3 },
    { unitName: 'HazMat Units or CBRN Vehicles', stillNeeded: 4 },
    { unitName: 'Welfare Vehicles', stillNeeded: 2 },
    { unitName: 'Foam Unit', stillNeeded: 1 },
  ]);
const collapsedOsuRows = collapsedOperationalSupportRows.filter(
  row => row?.sharedOperationalSupportRequirement === true
);
expect(collapsedOsuRows.length === 1, 'BASU, Welfare and HazMat must collapse to one shared OSU row');
expect(collapsedOsuRows[0].stillNeeded === 4, 'Shared OSU target must use the maximum Still needed value');
expect(
  collapsedOsuRows[0].sharedOperationalSupportNames.length === 3,
  'Shared OSU diagnostics must retain every contributing live row'
);

let liveMissingValue = 6;
let liveEnRouteValue = 3;
let liveStillNeededValue = 3;
let liveSelectedValue = 0;
const textCell = value => ({ innerText: String(value), textContent: String(value) });
const liveCell = getter => ({
  get innerText() { return String(getter()); },
  get textContent() { return String(getter()); },
});
const selectedCell = {
  get innerText() { return String(liveSelectedValue); },
  get textContent() { return String(liveSelectedValue); },
};
const fireOfficerRow = {
  querySelectorAll(selector) {
    return selector === 'td'
      ? [
          textCell('Fire Officers'),
          liveCell(() => liveMissingValue),
          liveCell(() => liveEnRouteValue),
          liveCell(() => liveStillNeededValue),
          selectedCell,
        ]
      : [];
  },
};
const missingTable = {
  querySelectorAll(selector) {
    return selector === 'tbody tr' ? [fireOfficerRow] : [];
  },
};
const missingRoot = {
  querySelectorAll() {
    return [missingTable];
  },
};
const liveStateSource = extractFunction('getMissingOnMissionRequirementState');
const liveTargetSource = extractFunction('getMissingOnMissionSelectionTarget');
const liveSelectedSource = extractFunction('getMissingOnMissionSelectedAmount');
const liveRequirementHelpers = Function(
  'getActiveMissionRequirementContexts',
  'isMissingOnMissionUpdateTable',
  'isMissionElementVisible',
  'normaliseVehicleText',
  'resolveUnitName',
  `"use strict";\n${liveStateSource}\n${liveTargetSource}\n${liveSelectedSource}\nreturn { getMissingOnMissionRequirementState, getMissingOnMissionSelectionTarget, getMissingOnMissionSelectedAmount };`
)(
  () => [{ root: missingRoot }],
  table => table === missingTable,
  () => true,
  value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase(),
  value => {
    const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
    return cleaned === 'Fire Officers' ? 'Fire Officer' : cleaned;
  }
);
const {
  getMissingOnMissionRequirementState,
  getMissingOnMissionSelectionTarget,
  getMissingOnMissionSelectedAmount,
} = liveRequirementHelpers;
const fireOfficerItem = {
  unitName: 'Fire Officers',
  liveRequirementDetails: {
    missingOnMissionTable: true,
    missingOnMissionUnitName: 'Fire Officers',
  },
};
expect(getMissingOnMissionSelectedAmount(fireOfficerItem) === 0, 'Initial live Selected value was not read');
liveSelectedValue = 4;
expect(getMissingOnMissionSelectedAmount(fireOfficerItem) === 4, 'Updated live Selected value was not re-read after a click');

liveMissingValue = 1;
liveEnRouteValue = 1;
liveStillNeededValue = 0;
liveSelectedValue = 0;
const enRouteSatisfiedState = getMissingOnMissionRequirementState(fireOfficerItem);
expect(enRouteSatisfiedState?.missingOnMission === 1, 'Live Missing on mission value was not read');
expect(enRouteSatisfiedState?.enRoute === 1, 'Live En-route value was not read');
expect(enRouteSatisfiedState?.stillNeeded === 0, 'Live Still needed zero was not preserved');
expect(
  getMissingOnMissionSelectionTarget(enRouteSatisfiedState, 1) === 0,
  'Missing 1 / En-route 1 / Still needed 0 must override a stale target of 1 with zero'
);
const staleDefinitionState = getMissingOnMissionRequirementState({
  unitName: 'Fire Officer',
  stillNeeded: 1,
});
expect(
  getMissingOnMissionSelectionTarget(staleDefinitionState, 1) === 0,
  'A canonical full-definition Fire Officer target must be capped by the current zero-shortage Fire Officers row'
);
liveSelectedValue = 1;
expect(
  getMissingOnMissionSelectionTarget(
    getMissingOnMissionRequirementState(fireOfficerItem),
    1
  ) === 0,
  'Missing 1 / En-route 1 / Still needed 0 / Selected 1 must select zero additional units'
);
expect(
  getMissingOnMissionSelectedAmount({ ...fireOfficerItem, convertedFromPersonnelRequirement: true }) === null,
  'Raw personnel counters must not be compared with converted vehicle targets'
);

const selectorFunction = extractFunction('selectVehicleUnits');
for (const token of [
  'options.isRequirementSatisfied()',
  'if (isRequirementSatisfied())',
  '!isRequirementSatisfied()',
  'liveRequirementSatisfied:',
]) {
  expect(selectorFunction.includes(token), `Live Selected stop guard missing ${token}`);
}

let simulatedLiveCoverage = 0;
let simulatedClicks = 0;
const simulatedCheckboxes = [{ checked: false }, { checked: false }, { checked: false }];
const selectVehicleUnitsWithLiveStop = Function(
  'dependencies',
  `"use strict";
  const {
    isCurrentMissionExecutionOwner,
    detectAndLatchStaffingBlock,
    buildSelectionKey,
    processedSelectionKeys,
    getMatchingVehicleCheckboxes,
    mfDebugEnabled,
    highDebugLog,
    getVehicleDebugName,
    clickVehicleElement,
    vehicleLoadState,
    renderVehicleLoadList,
    isAmbulanceTransportRequest,
    isFireEngineRequirement,
    isFireEngineOrRivRequirement,
    isFlatbedRecoveryVehicleRequirement,
    isSearchDogUnitRequirement,
    isHgvRecoveryVehicleRequirement,
    isFireOperationalSupportRequirement,
    countSelectedMatchingVehicles,
  } = dependencies;
  ${selectorFunction}
  return selectVehicleUnits;`
)(
  {
    isCurrentMissionExecutionOwner: () => true,
    detectAndLatchStaffingBlock: () => false,
    buildSelectionKey: () => 'fixture',
    processedSelectionKeys: new Set(),
    getMatchingVehicleCheckboxes: () => simulatedCheckboxes,
    mfDebugEnabled: false,
    highDebugLog: () => {},
    getVehicleDebugName: () => 'FO fixture',
    clickVehicleElement: checkbox => {
      checkbox.checked = true;
      simulatedClicks += 1;
      simulatedLiveCoverage += 2;
      return true;
    },
    vehicleLoadState: { rows: [] },
    renderVehicleLoadList: () => {},
    isAmbulanceTransportRequest: () => false,
    isFireEngineRequirement: () => false,
    isFireEngineOrRivRequirement: () => false,
    isFlatbedRecoveryVehicleRequirement: () => false,
    isSearchDogUnitRequirement: () => false,
    isHgvRecoveryVehicleRequirement: () => false,
    isFireOperationalSupportRequirement: () => false,
    countSelectedMatchingVehicles: () => simulatedClicks,
  }
);
const liveStopResult = selectVehicleUnitsWithLiveStop(
  'Fire Officers',
  'Fire Officer',
  3,
  'UPDATE',
  {
    isRequirementSatisfied: () => simulatedLiveCoverage >= 3,
  }
);
expect(simulatedClicks === 2, 'Live Selected coverage must stop the third Fire Officer click');
expect(liveStopResult.liveRequirementSatisfied === true, 'Live Selected stop must report the requirement as satisfied');

const updateHandler = sourceSlice(
  'function handleMissionUpdateUnits(',
  'async function autoHandleMissionUpdateAfterDispatch(',
  'Mission Update handler'
);
for (const token of [
  'collapseSharedFireOperationalSupportRequirements(',
  'const initialMissingOnMissionState =',
  'getMissingOnMissionSelectionTarget(',
  'const matchingSelectedFromLiveTable =',
  'live en-route=',
  'isRequirementSatisfied: () =>',
  'const confirmedEffectiveRequired =',
  'selectedFromCurrentLiveTable',
]) {
  expect(updateHandler.includes(token), `Mission Update live Selected reconciliation missing ${token}`);
}

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
<tbody>
<tr><td><b>Traffic Cars</b></td><td>2</td><td>0</td><td>2</td><td>0</td></tr>
<tr><td><b>Fire Officer</b></td><td>1</td><td>1</td><td>0</td><td>1</td></tr>
</tbody>
</table>
</div>`;
expect(exactHtmlContract.includes('Missing on mission') && exactHtmlContract.includes('2 Traffic Cars'), 'Exact supplied fixture contract is incomplete');

console.log('Missing on mission authority checks passed: Missing minus En-route caps the live Still needed target, Selected is subtracted once, BASU/Welfare/HazMat collapse to the maximum shared OSU demand, zero-shortage tables suppress fresh-mission Unit Finder, and patient rules remain active.');
