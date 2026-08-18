#!/usr/bin/env node

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
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Missing function ${name}`);
  const parameterStart = source.indexOf('(', start);
  let parameterDepth = 0;
  let quote = '';
  let escaped = false;
  let brace = -1;
  for (let index = parameterStart; index < source.length; index += 1) {
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
    if (character === '(') parameterDepth += 1;
    if (character === ')') {
      parameterDepth -= 1;
      if (parameterDepth === 0) {
        brace = source.indexOf('{', index);
        break;
      }
    }
  }
  if (brace < 0) fail(`Missing body for ${name}`);

  let depth = 0;
  quote = '';
  escaped = false;
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
  fail(`Unable to isolate function ${name}`);
}

const prepare = extractFunction('prepareMissionLoggerDispatchSnapshot');
for (const token of [
  'getMissionLoggerSelectedUnits(',
  'selectedUnits.length === 0',
  'createMissionLoggerDispatchFingerprint(',
  "createMissionLoggerEvent(\n            'dispatch'",
  'dispatchCaptureSource:',
  'selectedUnitCount:',
]) {
  expect(prepare.includes(token), `Prepared dispatch snapshot missing ${token}`);
}

const programmatic = extractFunction('clickMissionLoggerDispatchControl');
for (const token of [
  'prepareMissionLoggerDispatchSnapshot(',
  'mfMissionLoggerPendingProgrammaticDispatch',
  'control.click()',
  'fallbackClick() === true',
  'recordPreparedMissionLoggerDispatch(prepared)',
  "'nexus-programmatic-dispatch'",
]) {
  expect(programmatic.includes(token), `Programmatic dispatch wrapper missing ${token}`);
}
expect(
  programmatic.indexOf('prepareMissionLoggerDispatchSnapshot(') <
    programmatic.indexOf('control.click()'),
  'Programmatic dispatch must snapshot selected units before MissionChief clears the selection'
);
expect(
  programmatic.indexOf('control.click()') <
    programmatic.lastIndexOf('recordPreparedMissionLoggerDispatch(prepared)'),
  'Prepared dispatch data must only be committed after the dispatch control was invoked'
);

const listener = extractFunction('installMissionLoggerDispatchCapture');
expect(listener.includes("document.addEventListener(\n            'click'"), 'Manual native dispatch listener must remain installed');
expect(listener.includes('pending?.control === control'), 'Programmatic context must flow through the native listener');
expect(listener.includes('event.isTrusted'), 'Native and synthetic click provenance must remain visible');

const clickOnly = extractFunction('clickDispatchOnly');
expect(
  clickOnly.split('clickMissionLoggerDispatchControl(').length - 1 === 2,
  'Dispatch & Next and final Dispatch must both use the logger-aware wrapper'
);
expect(clickOnly.includes('realClickForQueueRestart('), 'Existing real-click fallback must remain supported');

const clickShare = extractFunction('clickDispatchAndShareOnly');
expect(clickShare.includes('clickMissionLoggerDispatchControl('), 'Dispatch & Share must use the logger-aware wrapper');
expect(clickShare.includes('shared: true'), 'Dispatch & Share must keep explicit shared evidence');

const autoValue = extractFunction('clickMissionDispatchByValue');
for (const token of [
  "dispatchMode: 'auto-share'",
  "? 'auto'",
  ": 'auto-not-ready'",
  'autoMode: true',
]) {
  expect(autoValue.includes(token), `Auto Mode value dispatch missing ${token}`);
}

const autoLoop = extractFunction('runAutoModeLoop');
expect(autoLoop.includes("dispatchMode: 'auto-not-ready'"), 'Auto skip dispatch must be explicitly logged');
expect(autoLoop.includes("reason: 'Nexus Auto Mode skip dispatch'"), 'Auto skip dispatch must retain an auditable route');

const ally = extractFunction('handleAllySteal');
expect(ally.includes("dispatchMode: 'ally-steal'"), 'Ally Steal must use the logger-aware wrapper');
expect(ally.includes('clickMissionLoggerDispatchControl('), 'Ally Steal must not rely on the document click listener alone');

const upgrade = extractFunction('clickAutoMissionDispatchForUpgradeCheck');
expect(upgrade.includes("dispatchMode: 'auto-share'"), 'Initial high-value upgrade pass must log auto-share');
expect(upgrade.includes("dispatchMode: 'auto'"), 'Upgrade re-dispatch must log auto');
expect(upgrade.includes('clickMissionLoggerDispatchControl('), 'Upgrade dispatch must use the logger-aware wrapper');

for (const directClick of [
  'dispatchButton.click()',
  'dispatchNextButton.click()',
  'finalDispatchButton.click()',
  'dispatchShareButton.click()',
]) {
  expect(!source.includes(directClick), `Unwrapped programmatic dispatch remains: ${directClick}`);
}

console.log(
  'Mission dispatch-path logger regression passed: manual, Auto Mode, auto-share, auto-not-ready, Ally Steal and upgrade dispatches are snapshotted before click, committed after invocation and deduped across listener/fallback paths.'
);
