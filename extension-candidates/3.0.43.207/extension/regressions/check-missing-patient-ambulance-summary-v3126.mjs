import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const runtime = fs.readFileSync(path.join(root, 'nexus-runtime.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

assert.equal(manifest.version, '3.0.43.189', 'manifest must expose the additive patient Ambulance fallback build');
assert.ok(runtime.includes("const MISSION_FINDER_VERSION = '10.6.191';"), 'Mission Finder must increase for the additive patient transport rule');
assert.ok(runtime.includes("const UNIT_VERSION = '3.3.29';"), 'Community First Responder naming must remain present');

const helperStart = runtime.indexOf('function hasRealVehicleOnSceneInMissionRoot(root)');
const helperEnd = runtime.indexOf('function getLinkedVisiblePatientContainer(', helperStart);
assert.ok(helperStart > 0 && helperEnd > helperStart, 'attended patient Ambulance summary helpers must be locatable');
const helperSource = runtime.slice(helperStart, helperEnd);

assert.ok(
  helperSource.includes('#nx-patients [data-nexus-comfort="1"].nx-inline-list > '),
  'the exact Nexus Patient Summary inline-list must be read',
);
assert.ok(
  helperSource.includes('[data-nexus-comfort="1"].nx-badge'),
  'the exact Nexus comfort badges must be read',
);
assert.ok(
  helperSource.includes('/^Ambulance\\s*:\\s*([\\d,]+)$/i'),
  'the exact Ambulance: N badge must be parsed',
);
assert.ok(
  helperSource.includes('/^Critical\\s+Care\\s*:\\s*([\\d,]+)$/i'),
  'the exact Critical Care: N badge must be parsed',
);
assert.ok(
  helperSource.includes('rootAmbulanceCount + rootCriticalCareCount'),
  'Ambulance and Critical Care counts must be additive within the current mission summary',
);
assert.ok(
  helperSource.includes("requirements.includes('ambulance')"),
  'Worker A must reproduce Ambulance tokens from hidden patient cards',
);
assert.ok(
  helperSource.includes("requirements.includes('critical care')"),
  'Worker A must convert Critical Care tokens to ordinary Ambulance demand too',
);
assert.ok(
  helperSource.includes("requirements.includes('critical care team')"),
  'Critical Care Team wording must follow the same ordinary Ambulance fallback',
);

const context = vm.createContext({
  Array,
  String,
  Number,
  Math,
  parseInt,
  normaliseMissionAlertText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  },
  isMissionElementVisible(element) {
    return element?.visible !== false;
  },
});
vm.runInContext(
  `${helperSource}\n` +
  'globalThis.__parseAmb = parseNexusComfortAmbulanceBadgeCount;\n' +
  'globalThis.__parseCC = parseNexusComfortCriticalCareBadgeCount;\n' +
  'globalThis.__readSummary = getAttendedPatientAmbulanceSummary;',
  context,
);

function badge(text, visible = true) {
  return { textContent: text, innerText: text, visible };
}
function alert(text) {
  return { textContent: text, innerText: text };
}
function patient(alertTexts = []) {
  const alerts = alertTexts.map(alert);
  return {
    querySelectorAll(selector) {
      return selector === '.alert.alert-danger' ? alerts : [];
    },
  };
}
function missionRoot({ onScene = true, badges = [], patients = [] } = {}) {
  return {
    querySelectorAll(selector) {
      if (selector === '#mission_vehicle_at_mission tr[id^="vehicle_row"]') {
        return onScene ? [{ id: 'vehicle_row_123', isConnected: true }] : [];
      }
      if (selector.startsWith('#nx-patients ')) return badges;
      if (selector === '.mission_patient') return patients;
      return [];
    },
  };
}

assert.equal(context.__parseAmb('Ambulance: 1'), 1);
assert.equal(context.__parseAmb('Ambulance: 1,234'), 1234);
assert.equal(context.__parseAmb('Critical Care: 2'), 0);
assert.equal(context.__parseCC('Critical Care: 2'), 2);
assert.equal(context.__parseCC('Critical Care: 1,234'), 1234);
assert.equal(context.__parseCC('Ambulance: 2'), 0);

assert.deepEqual(
  { ...context.__readSummary([
    missionRoot({ badges: [badge('Critical Care: 2'), badge('Ambulance: 1')] }),
  ]) },
  { count: 3, source: 'nexus-comfort-patient-summary-additive' },
  'Critical Care: 2 plus Ambulance: 1 must request three ordinary Ambulances',
);

assert.deepEqual(
  { ...context.__readSummary([
    missionRoot({ badges: [badge('Critical Care: 2')] }),
  ]) },
  { count: 2, source: 'nexus-comfort-patient-summary-additive' },
  'Critical Care-only summary must request the same count of ordinary Ambulances',
);

assert.deepEqual(
  { ...context.__readSummary([
    missionRoot({ badges: [badge('Ambulance: 4')] }),
  ]) },
  { count: 4, source: 'nexus-comfort-patient-summary-additive' },
  'Ambulance-only summary must keep its exact ordinary Ambulance count',
);

assert.deepEqual(
  { ...context.__readSummary([
    missionRoot({ badges: [
      badge('Critical Care: 2'), badge('Critical Care: 2'),
      badge('Ambulance: 1'), badge('Ambulance: 1'),
    ] }),
  ]) },
  { count: 3, source: 'nexus-comfort-patient-summary-additive' },
  'duplicate comfort badges must be deduplicated by per-label maximum, not summed',
);

assert.deepEqual(
  { ...context.__readSummary([
    missionRoot({ badges: [badge('Critical Care: 2'), badge('Ambulance: 1')] }),
    missionRoot({ badges: [badge('Critical Care: 2'), badge('Ambulance: 1')] }),
  ]) },
  { count: 3, source: 'nexus-comfort-patient-summary-additive' },
  'duplicate mission roots must use the highest derived total rather than double-counting',
);

assert.deepEqual(
  { ...context.__readSummary([
    missionRoot({ onScene: false, badges: [badge('Critical Care: 2'), badge('Ambulance: 1')] }),
  ]) },
  { count: 0, source: '' },
  'attended-mission summary fallback must remain disabled on a fresh mission',
);

assert.deepEqual(
  { ...context.__readSummary([
    missionRoot({
      badges: [],
      patients: [
        patient(['We need: Critical Care, Ambulance']),
        patient(['We need: Ambulance']),
        patient(['We need: Critical Care']),
        patient(['We need: Ambulance Officer']),
      ],
    }),
  ]) },
  { count: 4, source: 'hidden-patient-card-equivalent-additive' },
  'Worker A hidden-card equivalent must apply the same additive Ambulance + Critical Care rule',
);

const integrationStart = runtime.indexOf('const existingAmbulanceAuthority =');
const integrationEnd = runtime.indexOf('if (ambulanceRequired > 0) {', integrationStart);
assert.ok(integrationStart > 0 && integrationEnd > integrationStart, 'summary integration block must be locatable');
const integration = runtime.slice(integrationStart, integrationEnd);
assert.ok(integration.includes("livePatientRequirementStates.has(\n                'ambulance'"), 'confirmed live Ambulance authority must suppress the fallback');
assert.ok(integration.includes("?.type === 'ambulance'"), 'an explicit existing Ambulance row must suppress the fallback');
assert.ok(integration.includes('ambulanceRequired = Math.max('), 'summary transport demand must merge by max with other fallback Ambulance demand');
assert.ok(integration.includes('patientCappedAmbulanceRequired'), 'normal patient-card demand must retain the existing patient-count cap');
assert.ok(
  integration.includes('Math.max(\n                        patientCappedAmbulanceRequired,\n                        attendedAmbulanceSummary.count'),
  'the explicit additive summary count must survive the generic patient-count cap',
);

console.log('PASS: 3.0.43.151 converts Nexus Patient Summary Critical Care + Ambulance badges into additive ordinary Ambulance demand while deduplicating repeated summaries and retaining explicit live Ambulance authority.');
