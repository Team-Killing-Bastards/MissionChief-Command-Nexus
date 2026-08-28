#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing ${name}`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Unterminated ${name}`);
}

assert.ok(source.includes('const MF_VEHICLE_NEXT_PAGE_SETTLE_MS = 1200;'), 'Delayed next-page controls need the locked 1.2-second settle');
const loaderStart = source.indexOf('async function ensureVehicleListLoaded(');
const loaderEnd = source.indexOf('function shouldRunBackgroundAutomationWatchers(', loaderStart);
assert.ok(loaderStart >= 0 && loaderEnd > loaderStart, 'Unable to isolate ensureVehicleListLoaded');
const loader = source.slice(loaderStart, loaderEnd);
const pageComplete = loader.indexOf('lastCompletedVehicleSignature =');
const settle = loader.indexOf('await wait(MF_VEHICLE_NEXT_PAGE_SETTLE_MS);', pageComplete);
const invalidate = loader.indexOf('invalidateVehicleListStructureCache();', settle);
const finalControlCheck = loader.indexOf('const remainingLoadControl =', invalidate);
assert.ok(pageComplete >= 0 && pageComplete < settle, 'The settle must follow confirmed page completion');
assert.ok(settle < invalidate && invalidate < finalControlCheck, 'The next-page control must be rediscovered before completion is accepted');

const diagnostic = extractFunction('mfBuildUnitFinderDiagnosticSnapshot');
for (const token of [
  'diagnosticBoxes.length',
  'searchDogType102:',
  'availableSearchDogType102:',
  'loadControlVisible:',
  'loadingIndicatorVisible:',
]) assert.ok(diagnostic.includes(token), `Missing diagnostic evidence: ${token}`);

assert.ok(diagnostic.includes('isSearchDogUnitVehicleCheckbox'), 'Diagnostic type-102 counts must use the dispatch matcher');
assert.ok(source.includes("const MF_SEARCH_DOG_UNIT_TYPE_ID = '102';"), 'Rescue Dog must remain exact type 102');

console.log('PASS: delayed paginated vehicle controls cannot close the full-list barrier early, and Rescue Dog diagnostics expose exact type-102 availability.');
