import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractFunction(name) {
  const pattern = new RegExp(
    `(?:async\\s+)?function\\s+${name}\\s*\\(`
  );
  const match = pattern.exec(source);
  if (!match) fail(`Unable to find function ${name}`);

  let index = source.indexOf('(', match.index);
  let parenDepth = 0;
  let quote = '';
  let escaped = false;
  for (; index < source.length; index += 1) {
    const character = source[index];
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
    if (character === '(') parenDepth += 1;
    if (character === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) break;
    }
  }

  const bodyStart = source.indexOf('{', index);
  let depth = 0;
  quote = '';
  escaped = false;
  for (index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '/' && next === '/') {
      const lineEnd = source.indexOf('\n', index + 2);
      index = lineEnd < 0 ? source.length : lineEnd;
      continue;
    }
    if (character === '/' && next === '*') {
      const blockEnd = source.indexOf('*/', index + 2);
      index = blockEnd < 0 ? source.length : blockEnd + 1;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, index + 1);
    }
  }
  fail(`Unable to extract function ${name}`);
}

expect(source.includes('// @version      1.0.90'), 'Expected Command Nexus 1.0.82');
expect(source.includes('MISSION FINDER V10.6.144'), 'Expected Mission Finder V10.6.143');

for (const token of [
  'const MF_ALLY_SELECTION_CLEAR_SETTLE_MS = 150;',
  'const MF_ALLY_SELECTION_SETTLE_MS = 225;',
  'const MF_ALLY_PRE_DISPATCH_SETTLE_MS = 225;',
  'const MF_ALLY_RESUME_MIN_CLICK_AGE_MS = 1200;',
  'const MF_ALLY_SAME_DOCUMENT_FALLBACK_MS = 1400;',
  'const MF_ALLY_CLOSE_RETRY_MS = 150;',
  'const MF_ALLY_CLOSE_VERIFY_MS = 250;'
]) {
  expect(source.includes(token), `Missing Ally Steal timing contract: ${token}`);
}

const handle = extractFunction('handleAllySteal');
for (const token of [
  'clearSelectionGuards();',
  'await ensureVehicleListLoaded();',
  'await wait(MF_ALLY_SELECTION_CLEAR_SETTLE_MS);',
  'await wait(MF_ALLY_SELECTION_SETTLE_MS);',
  'await wait(MF_ALLY_PRE_DISPATCH_SETTLE_MS);',
  'await getAllyStealNormalDispatchButton();',
  'writeAllyStealPendingState(',
  'dispatchButton.click();',
  'MF_ALLY_SAME_DOCUMENT_FALLBACK_MS'
]) {
  expect(handle.includes(token), `Ally Steal dispatch path missing ${token}`);
}
expect(
  handle.indexOf('writeAllyStealPendingState(') < handle.indexOf('dispatchButton.click();'),
  'Pending state must be written before dispatch is clicked'
);

const resume = extractFunction('resumeAllyStealAfterDispatchRefresh');
for (const token of [
  'elapsed < MF_ALLY_RESUME_MIN_CLICK_AGE_MS',
  'MF_ALLY_RESUME_MIN_CLICK_AGE_MS - elapsed',
  'await waitForAllyStealDispatchSuccess(',
  '15000',
  'await clickAllyStealParentMissionClose();'
]) {
  expect(resume.includes(token), `Ally Steal resume path missing ${token}`);
}

const success = extractFunction('waitForAllyStealDispatchSuccess');
for (const token of [
  'timeoutMs = 8000',
  'existingAlertIds.has(',
  'allyStealSuccessAlertMatchesVehicle(',
  'isAllyStealElementVisible(',
  'await wait(150);'
]) {
  expect(success.includes(token), `Ally Steal success safety missing ${token}`);
}

const close = extractFunction('clickAllyStealParentMissionClose');
for (const token of [
  'attempt <= 12',
  'await wait(MF_ALLY_CLOSE_RETRY_MS);',
  'clearAllyStealPendingState(',
  'closeButton.click();',
  'await wait(MF_ALLY_CLOSE_VERIFY_MS);',
  '!closeButton.isConnected',
  '!isAllyStealElementVisible('
]) {
  expect(close.includes(token), `Ally Steal close safety missing ${token}`);
}

const dispatchLookup = extractFunction('getAllyStealNormalDispatchButton');
expect(dispatchLookup.includes('timeoutMs = 4000'), 'Dispatch lookup timeout must remain four seconds');
expect(dispatchLookup.includes('await wait(100);'), 'Dispatch lookup polling cadence must remain unchanged');

const oldPreparationMs = 250 + 350 + 400;
const newPreparationMs = 150 + 225 + 225;
expect(newPreparationMs === 600, 'Expected bounded 600 ms preparation waits');
expect(oldPreparationMs - newPreparationMs === 400, 'Expected a modest 400 ms preparation reduction');

console.log('Ally Steal response timing and safety contracts passed.');
