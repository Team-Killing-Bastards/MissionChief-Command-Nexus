#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const SOURCE_PATH = 'src/missionchief-command-nexus.user.js';
const source = await readFile(SOURCE_PATH, 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(text, label) {
  if (!source.includes(text)) {
    fail(`Missing trained-personnel fail-closed contract: ${label}`);
  }
}

function extractFunction(name) {
  const indented = source.indexOf(`    function ${name}(`);
  const compact = source.indexOf(`function ${name}(`);
  const starts = [indented, compact].filter(index => index >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  if (start < 0) fail(`Unable to find ${name}`);

  const bodyStart = source.indexOf('{', start);
  if (bodyStart < 0) fail(`Unable to find ${name} body`);

  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (character === quote) quote = '';
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

requireText(
  'A correct vehicle\n        // type without a fresh, complete Personnel Register entry',
  'fresh complete registry evidence gate'
);
requireText(
  'return requirement.remaining <= 0;',
  'verified qualification satisfaction gate'
);
requireText('runTrainedSelection();', 'trained-only selection phase');
requireText('fallbackVehicles:', 'zero fallback vehicle result');
requireText('blockTrainedPersonnelDispatch(', 'shared Unit Finder and Mission Update block');
requireText('vehicleLoadState.trainedPersonnelBlocked === true', 'Auto Mode block propagation');
requireText('Dispatch was not clicked.', 'Auto Mode no-dispatch stop');

if (source.includes('runSelectionPhase(false);')) {
  fail('Untrained nominal-capacity fallback selection is still present');
}
if (source.includes('compatible units were still selected and can be sent')) {
  fail('The UI still presents unverified trained-personnel coverage as sendable');
}

const runtime = Function(
  `"use strict";\n` +
  `let registry = {vehicles: {}};\n` +
  `let checkboxes = [];\n` +
  `const mfDebugEnabled = false;\n` +
  `function readPersonnelTrainingRegistry() { return registry; }\n` +
  `function getVehicleCheckboxSnapshot() { return checkboxes; }\n` +
  `function sortVehicleCheckboxesByBestArrival(items) { return items.slice(); }\n` +
  `function getRegistryEntryForMissionCheckbox(checkbox, currentRegistry) { return {entry: currentRegistry.vehicles[checkbox.id] || null}; }\n` +
  `function isCheckboxEligibleForTrainingRequirement(_checkbox, _requirement, entry) { return entry?.authoritative === true; }\n` +
  `function getRemainingTrainedPersonnelRequirements(requirements, selected, currentRegistry) {\n` +
  `  const target = requirements[0].personnelRequired;\n` +
  `  let remaining = target;\n` +
  `  let capacityRemaining = target;\n` +
  `  for (const checkbox of selected) {\n` +
  `    const entry = currentRegistry.vehicles[checkbox.id];\n` +
  `    if (entry?.authoritative !== true) continue;\n` +
  `    remaining = Math.max(0, remaining - Number(entry.qualified || 0));\n` +
  `    capacityRemaining = Math.max(0, capacityRemaining - Number(entry.capacity || 0));\n` +
  `  }\n` +
  `  return [{...requirements[0], label: 'Qualified staff', remaining, capacityRemaining}];\n` +
  `}\n` +
  `function getTrainedCandidateMetrics(remaining, _checkbox, entry) {\n` +
  `  const target = remaining[0];\n` +
  `  const trainedUseful = entry?.authoritative === true ? Math.min(target.remaining, Number(entry.qualified || 0)) : 0;\n` +
  `  const capacityUseful = entry?.authoritative === true ? Math.min(target.capacityRemaining, Number(entry.capacity || 0)) : 0;\n` +
  `  return {eligible: entry?.authoritative === true, trainedUseful, capacityUseful, coveredCategories: trainedUseful > 0 ? 1 : 0, physicalCapacity: Number(entry?.capacity || 0), overshoot: Math.max(0, Number(entry?.capacity || 0) - trainedUseful), isPsu: false};\n` +
  `}\n` +
  `function applyTrainingCandidateToRemaining(remaining, _checkbox, entry) {\n` +
  `  return remaining.map(item => ({...item, remaining: Math.max(0, item.remaining - Number(entry?.qualified || 0)), capacityRemaining: Math.max(0, item.capacityRemaining - Number(entry?.capacity || 0))}));\n` +
  `}\n` +
  `function clickVehicleElement(checkbox) { checkbox.checked = true; return true; }\n` +
  `function countSelectedTrainingVehicles(_requirements, currentRegistry) { return checkboxes.filter(checkbox => checkbox.checked && currentRegistry.vehicles[checkbox.id]?.authoritative === true).length; }\n` +
  `function getVehicleDebugName(checkbox) { return checkbox.id; }\n` +
  `function debugLog() {}\n` +
  extractFunction('getTrainedVehicleSelectionScore') + '\n' +
  extractFunction('selectVehiclesForTrainedPersonnelRequirements') + '\n' +
  extractFunction('areTrainedPersonnelRequirementsSatisfied') + '\n' +
  `return {\n` +
  `  run(entry) {\n` +
  `    registry = {vehicles: entry === undefined ? {} : {v1: entry}};\n` +
  `    checkboxes = [{id: 'v1', checked: false, disabled: false}];\n` +
  `    const requirements = [{code: 'qualified', label: 'Qualified staff', personnelRequired: 2}];\n` +
  `    const result = selectVehiclesForTrainedPersonnelRequirements(requirements, 'TEST');\n` +
  `    return {result, checked: checkboxes[0].checked, satisfied: areTrainedPersonnelRequirementsSatisfied(requirements)};\n` +
  `  }\n` +
  `};`
)();

const missing = runtime.run(undefined);
if (missing.checked || missing.result.satisfied || missing.satisfied) {
  fail('Missing Personnel Register evidence must select nothing and fail closed');
}

const stale = runtime.run({authoritative: false, qualified: 2, capacity: 2});
if (stale.checked || stale.result.satisfied || stale.satisfied) {
  fail('Stale Personnel Register evidence must select nothing and fail closed');
}

const partial = runtime.run({authoritative: true, qualified: 1, capacity: 2});
if (!partial.checked || partial.result.satisfied || partial.satisfied) {
  fail('Partial verified training may select useful coverage but must remain dispatch-blocking');
}
if (
  partial.result.trainingRemaining[0].remaining !== 1 ||
  partial.result.capacityRemaining[0].capacityRemaining !== 0
) {
  fail('Partial coverage must distinguish the remaining qualification from nominal capacity');
}

const full = runtime.run({authoritative: true, qualified: 2, capacity: 2});
if (!full.checked || !full.result.satisfied || !full.satisfied) {
  fail('Fresh complete verified training must select and satisfy the requirement');
}

console.log('Trained-personnel fail-closed checks passed for missing, stale, partial and fully verified register evidence.');
