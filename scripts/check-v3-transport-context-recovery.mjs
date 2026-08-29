#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `function ${name} must exist`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = brace; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`function ${name} is unterminated`);
}

for (const token of [
  'const TRANSPORT_HARD_RECOVERY_MS = 20000;',
  'const TRANSPORT_RECOVERY_LIMIT = 1;',
  'const TRANSPORT_RECOVERY_WINDOW_MS = 2 * 60 * 1000;',
  'const TRANSPORT_ASSIST_DELAY_MS = 8000;',
]) assert.ok(source.includes(token), `missing bounded transport contract: ${token}`);

const identityFunction = extractFunction('transportContextIdentity');
const routePath = value => {
  try { return new URL(value, 'https://www.missionchief.co.uk').pathname; }
  catch { return ''; }
};
const identityContext = vm.createContext({
  state: {
    transportServiceVehicleId: '',
    transportServiceMissionId: '',
    currentMissionId: '9001',
  },
  exactPatientPath(value) {
    const path = routePath(value);
    return /^\/vehicles\/\d+\/patient\/\d+\/?$/i.test(path) ? path : '';
  },
  exactPrisonerPath(value) {
    const path = routePath(value);
    return /^\/vehicles\/\d+\/gefangener\/\d+\/?$/i.test(path) ? path : '';
  },
  vehicleIdFromUrl(value) {
    return routePath(value).match(/^\/vehicles\/(\d+)/)?.[1] || '';
  },
});
vm.runInContext(`${identityFunction}\nthis.identity = transportContextIdentity;`, identityContext);
assert.equal(
  identityContext.identity(
    { kind: 'PATIENT', patientPath: '/vehicles/5141045/patient/111' },
    'https://www.missionchief.co.uk/vehicles/5141045/patient/111'
  ),
  'PATIENT:5141045:111'
);
assert.equal(
  identityContext.identity(
    { kind: 'PATIENT', patientPath: '/vehicles/5005589/patient/222' },
    'https://www.missionchief.co.uk/vehicles/5005589/patient/222'
  ),
  'PATIENT:5005589:222',
  'a new patient vehicle/subject must be treated as a new transport context'
);
assert.equal(
  identityContext.identity(
    { kind: 'PRISONER', prisonerPath: '/vehicles/7007/gefangener/333' },
    'https://www.missionchief.co.uk/vehicles/7007/gefangener/333'
  ),
  'PRISONER:7007:333'
);

const releaseFallbackFunction = extractFunction('isPrisonerReleaseFallbackContext');
const releaseFallbackContext = vm.createContext({ Number, Boolean });
vm.runInContext(
  `${releaseFallbackFunction}\nthis.isReleaseFallback = isPrisonerReleaseFallbackContext;`,
  releaseFallbackContext
);
const noCellReleaseEvidence = {
  kind: 'PRISONER',
  cellSelectionAlerts: 1,
  releaseLinks: 1,
  prisonerPath: '',
  greenPrisonDestinations: 0,
};
assert.equal(
  releaseFallbackContext.isReleaseFallback(noCellReleaseEvidence),
  true,
  'the diagnostic no-cell/release-only screen must be owned by Release Prisoners'
);
assert.equal(
  releaseFallbackContext.isReleaseFallback({
    ...noCellReleaseEvidence,
    prisonerPath: '/vehicles/7007/gefangener/333',
    greenPrisonDestinations: 24,
  }),
  false,
  'an exact usable prisoner destination must remain on the normal transport path'
);

const watcher = extractFunction('watchWorker');
for (const token of [
  'contextIdentity !== state.transportIdentity',
  "'context-identity-changed'",
  'maybeHandleTransportServiceTimeout(radioRequests)',
]) assert.ok(watcher.includes(token), `watcher lost exact transport progression check: ${token}`);

for (const name of [
  'maybeHandleConfirmedPrisonerReleaseSuccess',
  'maybeReturnFromCompletedPrisonerDestination',
  'maybeRecoverStalledTransportContext',
  'maybeRecoverStrandedPrisonerHandoff',
]) {
  const legacy = extractFunction(name);
  assert.match(legacy, /\{\s*return false;\s*\}$/,
    `${name} must be disabled after the Worker A/B split`);
}

const timeout = extractFunction('maybeHandleTransportServiceTimeout');
assert.match(timeout, /state\.workerRole !== 'TRANSPORT_B'/,
  'only transport Worker B may run the bounded transport timeout');
assert.match(timeout, /TRANSPORT_SERVICE_MAX_MS/);
assert.doesNotMatch(timeout, /clickDispatch\s*\(|skip(?:Current)?Mission\s*\(/i,
  'transport timeout must never dispatch or skip a mission');

const wakeRecovery = extractFunction('recoverFromSuspendedTimerGap');
for (const token of [
  'removeWorker(false)',
  'state.radioRequestFirstSeenAt = new Map()',
  'state.transportServiceDeferredUntil = new Map()',
  "startTransportOnlyWorker(preferredRequest, 'wake-recovery-oldest-personal-transport')",
]) assert.ok(wakeRecovery.includes(token), `sleep recovery lost ${token}`);
assert.ok(
  wakeRecovery.indexOf('removeWorker(false)') < wakeRecovery.indexOf('window.setTimeout'),
  'wake recovery must end stale Worker A before scheduling replacement work'
);

const staffingQuarantine = extractFunction('mfQuarantineExactStaffingVehicle');
assert.ok(staffingQuarantine.includes('if (exactIds.length !== 1) return null'));
assert.ok(staffingQuarantine.includes("data-mf-staffing-quarantined"));
assert.doesNotMatch(staffingQuarantine, /localStorage\.(?:clear|removeItem)/);

const staffingLabelContext = vm.createContext({});
vm.runInContext(
  `${extractFunction('mfStaffingAlertVehicleLabel')}\nthis.parseLabel = mfStaffingAlertVehicleLabel;`,
  staffingLabelContext
);
assert.equal(
  staffingLabelContext.parseLabel('UPPER FALLS-AS1-AB-4 has not enough personnel'),
  'UPPER FALLS-AS1-AB-4'
);
assert.equal(
  staffingLabelContext.parseLabel('ICCU has not enough personnel'),
  'ICCU',
  'generic labels remain visible to the unique-match fail-closed gate'
);

const creditContext = vm.createContext({ Number });
vm.runInContext(
  `${extractFunction('parseCreditValueFromText')}\nthis.parseCredits = parseCreditValueFromText;`,
  creditContext
);
assert.equal(creditContext.parseCredits('Average Credits: £12,345'), 12345);
assert.equal(creditContext.parseCredits('Average mission credits ~ 9,876'), 9876);
assert.equal(creditContext.parseCredits('Credits: £1,234,567'), 0, 'the account balance must not be mistaken for mission value');
assert.equal(creditContext.parseCredits('No reward is displayed'), 0);

for (const token of [
  '"Any vehicle": "Ambulance"',
  '"Airfield Operations Supervisors": "Airfield Operations Supervisor"',
  '"Rescue Dog": "Search Dog Unit"',
  '"Maximum amount of cars to tow": "Flatbed Recovery Vehicle"',
  '"Maximum amount of trucks to tow": "HGV Recovery Vehicle"',
]) assert.ok(source.includes(token), `preserved cross-reference missing: ${token}`);

console.log(
  'PASS: exact transport identity, immediate no-cell prisoner release ownership, transport-B-only timeout ownership, sleep recovery, staffing quarantine, credit parsing, and banked vehicle cross-references are preserved.'
);
