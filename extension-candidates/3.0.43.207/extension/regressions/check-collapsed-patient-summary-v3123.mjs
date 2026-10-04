import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const runtime = fs.readFileSync(path.join(root, 'nexus-runtime.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

assert.equal(manifest.version, '3.0.43.189', 'manifest must expose the collapsed-patient-summary test build');
assert.ok(runtime.includes("const MISSION_FINDER_VERSION = '10.6.191';"), 'Mission Finder must increase for the patient-counting change');
assert.ok(runtime.includes("const UNIT_VERSION = '3.3.29';"), 'Community First Responder Unit Naming must remain present');

const helperStart = runtime.indexOf('function parsePatientSummaryUntreatedCount(text)');
const computeStart = runtime.indexOf('function computePatientCountNow()', helperStart);
assert.ok(helperStart > 0 && computeStart > helperStart, 'collapsed patient summary helpers must be locatable');
const helperSource = runtime.slice(helperStart, computeStart);
assert.ok(helperSource.includes("scope.querySelectorAll('#patient_button_text')"), 'the exact MissionChief patient summary element must be read');
assert.ok(helperSource.includes('#mission_vehicle_at_mission'), 'the summary fallback must be disabled after a real vehicle reaches the mission');
assert.ok(!helperSource.includes('.alert-danger'), 'the narrow summary fix must not restore broad alert scanning');
assert.ok(!helperSource.includes('[role="alert"]'), 'the narrow summary fix must not scan generic role=alert elements');

const context = vm.createContext({
  isMissionElementVisible: element => element?.visible !== false,
  Array,
  String,
  Number,
  Math,
  parseInt,
});
vm.runInContext(`${helperSource}\nglobalThis.__parseSummary = parsePatientSummaryUntreatedCount;\nglobalThis.__readSummary = getFreshMissionPatientSummaryCount;`, context);

assert.equal(context.__parseSummary('14 Patient - 14 Untreated patients'), 14);
assert.equal(context.__parseSummary('1 Patient - 1 Untreated patient'), 1);
assert.equal(context.__parseSummary('1,234 Patient - 1,234 Untreated patients'), 1234);
assert.equal(context.__parseSummary('14 Patient - 0 Untreated patients'), 0);
assert.equal(context.__parseSummary('14 Patient'), 0, 'the total-patient label alone must not be treated as untreated demand');

function makeSummary(text, visible = true) {
  return { textContent: text, innerText: text, visible };
}
function makeScope({ onScene = false, summaries = [] } = {}) {
  return {
    querySelector(selector) {
      return selector.includes('#mission_vehicle_at_mission') && onScene ? { id: 'vehicle_row_1' } : null;
    },
    querySelectorAll(selector) {
      return selector === '#patient_button_text' ? summaries : [];
    },
  };
}

assert.equal(
  context.__readSummary([
    makeScope({ summaries: [makeSummary('62 Patient - 62 Untreated patients')] }),
  ]),
  62,
  'collapsed cards on a fresh mission must use the untreated summary count',
);
assert.equal(
  context.__readSummary([
    makeScope({ onScene: true, summaries: [makeSummary('62 Patient - 62 Untreated patients')] }),
  ]),
  0,
  'the total summary must not become update authority once a vehicle is on scene',
);
assert.equal(
  context.__readSummary([
    makeScope({ summaries: [makeSummary('62 Patient - 62 Untreated patients', false)] }),
  ]),
  0,
  'a hidden/stale summary must not be accepted',
);

const computeEnd = runtime.indexOf('function triggerAmbulanceOfficerClick()', computeStart);
const computeBlock = runtime.slice(computeStart, computeEnd);
const visibleCardsReturn = computeBlock.indexOf('if (patientCards.length > 0) return patientCards.length;');
const summaryFallback = computeBlock.indexOf('return getFreshMissionPatientSummaryCount(scopes);');
assert.ok(visibleCardsReturn >= 0, 'existing visible patient cards must remain supported');
assert.ok(summaryFallback > visibleCardsReturn, 'the summary must be fallback-only after visible cards');

const selectorStart = runtime.indexOf('function handlePatientSelector()');
const selectorEnd = runtime.indexOf('function getActiveMissionScopesForPatients()', selectorStart);
const selectorBlock = runtime.slice(selectorStart, selectorEnd);
assert.ok(selectorBlock.includes('const nexusPatientUpgrade = nexusHasAttendedPatientUpgrade'), 'existing fresh-vs-upgrade authority check must remain');
assert.ok(selectorBlock.includes('if (patientCount > 0 && !nexusPatientUpgrade)'), 'summary-derived totals must only trigger the existing fresh-mission ambulance route');

console.log('PASS: fresh missions read collapsed #patient_button_text untreated totals without changing live update authority in 3.0.43.151.');
