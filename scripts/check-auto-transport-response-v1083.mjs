#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };

function requireText(token, label) {
  if (!source.includes(token)) fail(`Missing faster Auto Mode transport contract: ${label}`);
}

function extractFunction(name) {
  const pattern = new RegExp(`^\\s*(?:async\\s+)?function\\s+${name}\\s*\\(`, 'm');
  const match = pattern.exec(source);
  if (!match) fail(`Unable to locate function ${name}`);
  const start = match.index;
  const rest = source.slice(start + match[0].length);
  const next = /^\s*(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(/m.exec(rest);
  if (!next) fail(`Unable to locate end of function ${name}`);
  return source.slice(start, start + match[0].length + next.index);
}

for (const [token, label] of [
  ['// @version      1.0.93', 'v1.0.83 metadata'],
  ['MISSION FINDER V10.6.144', 'Mission Finder V10.6.143'],
  ['function mfIsExactPatientTransportAnchor(', 'exact patient route guard'],
  ['function mfFindExactPatientTransportAnchorDeep(', 'iframe-aware patient finder'],
  ['const MF_AUTO_PRISONER_CELL_DESTINATION_WAIT_MS = 8000;', 'cell maximum wait retained'],
  ['const MF_AUTO_PRISONER_RELEASE_RESULT_WAIT_MS = 10000;', 'release result maximum wait retained'],
  ['const MF_AUTO_PRISONER_RELEASE_DISMISS_WAIT_MS = 8000;', 'dismiss maximum wait retained'],
  ['const MF_AUTO_PRISONER_RELEASE_DISMISS_CLOSE_WAIT_MS = 8000;', 'dismiss close maximum wait retained'],
  ['const MF_AUTO_PRISONER_CELL_CLICK_RETRY_MS = 4000;', 'cell failed-click retry'],
  ['const MF_AUTO_PRISONER_RELEASE_CLICK_RETRY_MS = 4000;', 'release failed-click retry'],
]) requireText(token, label);

const exactClick = extractFunction('clickExactApproachTransportButton');
const bruteClick = extractFunction('mfBruteClickFirstApproach');
for (const [block, label] of [[exactClick, 'exact patient click'], [bruteClick, 'brute patient click']]) {
  if (!block.includes('Date.now() - mfTransportLastClickAt < 2500')) fail(`${label} does not use the 2.5 second shared guard`);
  if (block.includes('mfTransportLastClickAt < 4000')) fail(`${label} retained the old 4 second guard`);
}
if (!exactClick.includes('now - mfLastTransportClickAt < 2500')) fail('Patient fingerprint guard was not reduced to 2.5 seconds');

const retryMessage = source.indexOf('Approach found but click helper did not click yet; waiting for Vue/iframe update.');
if (retryMessage < 0) fail('Unable to locate patient Vue/iframe retry path');
const retryWindow = source.slice(retryMessage, retryMessage + 500);
if (!retryWindow.includes('await wait(900);')) fail('Patient Vue/iframe retry wait is not 900 ms');
if (retryWindow.includes('await wait(1800);')) fail('Patient Vue/iframe retry retained the old 1800 ms delay');

const cellGate = extractFunction('handleAutoPrisonerCellBeforeUnitFinder');
if (!cellGate.includes('await wait(125);')) fail('Prisoner cell destination polling is not 125 ms');
if (cellGate.includes('await wait(250);')) fail('Prisoner cell destination polling retained 250 ms');

const dismiss = extractFunction('closeAutoPrisonerReleaseDismissAfterClick');
const fastPolls = dismiss.match(/await wait\(100\);/g) || [];
if (fastPolls.length !== 2) fail(`Expected two 100 ms prisoner result polls, found ${fastPolls.length}`);
if (dismiss.includes('await wait(200);')) fail('Prisoner result polling retained 200 ms');
if (!dismiss.includes('await wait(250);')) fail('Prisoner close retry is not 250 ms');
if (dismiss.includes('await wait(480);')) fail('Prisoner close retry retained 480 ms');

for (const token of [
  'getActivePrisonerCellSelectionContext()',
  'getTopmostAutoPrisonerReleaseDismissContext(',
  'resolveAutoPrisonerReleaseDismissContext(',
  'isAutoPrisonerReleaseDismissContextVisible(',
  'realClickForQueueRestart(current.closeButton);',
]) {
  if (!dismiss.includes(token)) fail(`Prisoner dismiss safety contract changed: ${token}`);
}

console.log('Auto Mode transport response contracts passed: patient retries and prisoner UI polling are faster while route identity, ownership, duplicate-click guards and fail-closed timeouts remain intact.');
