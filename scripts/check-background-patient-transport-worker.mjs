#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);
const fail = message => {
  console.error(`ERROR: ${message}`);
  process.exit(1);
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Missing function ${name}`);
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
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  fail(`Unable to isolate ${name}`);
}

for (const token of [
  "'mf_background_patient_transport_enabled_v1'",
  'Handle patient transports in the background',
  'MF_BACKGROUND_PATIENT_TRANSPORT_MAX_QUEUE = 40',
  'MF_BACKGROUND_PATIENT_TRANSPORT_MAX_ATTEMPTS = 3',
  "data-mf-background-patient-transport-worker",
  'left: \'-20000px\'',
  "width: '1280px'",
  "height: '900px'",
]) {
  expect(source.includes(token), `Missing background transport contract ${token}`);
}
expect(!source.includes("display: 'none'"), 'The same-origin worker must remain renderable for MissionChief/Vue');

const normalise = extractFunction('normaliseBackgroundPatientTransportRequest');
expect(normalise.includes('url.origin !== window.location.origin'), 'Background transport must remain same-origin');
expect(normalise.includes('/^\\/vehicles\\/(\\d+)\\/patient\\/(\\d+)\\/?$/'), 'Background transport must accept only the exact patient route');
expect(!normalise.includes('gefangener'), 'Prisoner routes must not share the patient normaliser');

const requestAnchor = extractFunction('mfIsBackgroundPatientTransportRequestAnchor');
expect(requestAnchor.includes('mfIsExactPatientTransportAnchor(element)'), 'Request detection must reuse the exact green patient-route guard');
expect(requestAnchor.includes('transport\\s+'), 'Request detection must require Transport Patient wording');
expect(requestAnchor.includes('approach'), 'Hospital Approach links must be excluded from request capture');

const capture = extractFunction('captureBackgroundPatientTransportRequests');
expect(capture.includes('isTransportAutomationAllowed()'), 'Background capture must remain Auto Mode owned');
expect(capture.includes('wakeBackgroundPatientTransportWorker(reason)'), 'Captured requests must wake the top-window worker');

const process = extractFunction('processBackgroundPatientTransportEntry');
for (const token of [
  'createBackgroundPatientTransportFrame(entry)',
  'mfChoosePreferredApproachButton(',
  "rowText.includes('free cells')",
  'destination.click()',
  'MF_BACKGROUND_PATIENT_TRANSPORT_CONFIRM_TIMEOUT_MS',
  'getBackgroundPatientTransportSuccessText(',
]) {
  expect(process.includes(token), `Patient transport worker missing ${token}`);
}
expect(process.indexOf('mfChoosePreferredApproachButton(') < process.indexOf('destination.click()'), 'Hospital capacity selection must happen before the hidden click');

const runner = extractFunction('runBackgroundPatientTransportWorker');
expect(runner.includes('MF_BACKGROUND_PATIENT_TRANSPORT_MAX_ATTEMPTS'), 'Worker retry count must be bounded');
expect(runner.includes('latestQueue.splice(index, 1)'), 'Confirmed/failed requests must leave the active queue');
expect(runner.includes('MF_BACKGROUND_PATIENT_TRANSPORT_RETRY_DELAYS_MS'), 'Retries must use bounded backoff');

const foreground = extractFunction('startBruteApproachTransportWatcher');
expect(foreground.includes('captureBackgroundPatientTransportRequests('), 'Foreground watcher must hand patient requests to the worker before clicking');
expect(foreground.indexOf('captureBackgroundPatientTransportRequests(') < foreground.indexOf('mfBruteFindFirstApproachButton()'), 'Background capture must precede the existing foreground Approach path');

const advance = extractFunction('resumeAutoAdvanceAfterDispatch');
expect(advance.includes('backgroundCapture.covered > 0'), 'Post-dispatch continuation must recognise a safely queued patient request');
expect(advance.includes('clickExactNextMissionAfterDispatch('), 'Auto Mode must continue to the exact next mission after queuing transport');
expect(advance.includes('!mfIsPoliceOrPrisonerTransportActive()'), 'Prisoner/cell transport must remain foreground');

const finalDispatch = extractFunction('handleAfterFinalQueueDispatch');
expect(finalDispatch.includes("'after-final-dispatch-background-patient'"), 'Final dispatch must continue into the silent queue after background capture');

const stop = extractFunction('stopAllBackgroundAutomationTimers');
expect(stop.includes('stopBackgroundPatientTransportWorker({'), 'Manual Auto stop must own worker cleanup');
expect(stop.includes('clearQueue: /manual|stopped/i.test('), 'Manual stop must clear delayed patient automation');

console.log('Background patient transport regression passed: default-off setting, exact same-origin routes, hidden capacity-aware worker, bounded retry lifecycle and non-blocking Auto Mode continuation are locked.');
