#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };
const metadataVersion = source.match(/^\/\/\s*@version\s+(\S+)\s*$/m)?.[1] || '';

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Unable to find ${name}`);
  const bodyStart = source.indexOf(') {', start);
  const brace = bodyStart >= 0 ? bodyStart + 2 : source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false, regex = false, regexClass = false;
  for (let i = brace; i < source.length; i += 1) {
    const c = source[i], n = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (regex) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === '[') regexClass = true;
      if (c === ']') regexClass = false;
      if (c === '/' && !regexClass) regex = false;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '/' && /[=(,:;!&|?{}\[\]\n]/.test(source[i - 1] || '\n')) { regex = true; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  fail(`Unterminated ${name}`);
}

expect(metadataVersion, 'Userscript metadata version missing');
expect(source.includes(`const VERSION = '${metadataVersion}';`), 'Merged controller version must match userscript metadata');
expect(source.includes(`const MASTER_VERSION = '${metadataVersion}';`), 'Master version must match userscript metadata');
expect(/const MISSION_FINDER_VERSION = '\d+\.\d+\.\d+';/.test(source), 'Embedded Mission Finder version contract missing');
expect(source.includes('const POST_DISPATCH_SOFT_RECOVERY_MS = 8000;'), '8-second soft recovery threshold missing');
expect(source.includes('const POST_DISPATCH_HARD_RECOVERY_MS = 16000;'), '16-second hard recovery threshold missing');
expect(source.includes('const POST_DISPATCH_RECOVERY_WINDOW_MS = 120000;'), 'Two-minute repeated-stall circuit window missing');

const watchdog = extractFunction('maybeRunPostDispatchWatchdog');
expect(!/\.click\s*\(/.test(watchdog), 'Post-dispatch watchdog must never click Dispatch or any other control');
expect(watchdog.includes('preserveFinalDispatch: true'), 'Soft recovery must preserve the final-dispatch duplicate guard');
expect(watchdog.includes("'post-dispatch-watchdog-soft-recovery'"), 'Soft recovery must request embedded runtime reconciliation');
expect(watchdog.includes("recentHardRecoveries.length"), 'Repeated same-mission hard recovery circuit breaker missing');
expect(watchdog.includes('redirectWorkerToPriority(target, watchdog.missionId)'), 'Hard recovery must prefer a verified next-mission handoff');
expect(watchdog.includes('beginMissionRescan();'), 'Completed final mission must wait for a new mission instead of re-dispatching');

const pauseFunction = extractFunction('postDispatchPauseReason');
const elapsedFunction = extractFunction('postDispatchEffectiveElapsed');
const context = {
  state: { transportServiceActive: false, transportKind: '' },
  vehicleIdFromUrl: value => String(value).includes('/vehicles/') ? '99' : '',
  result: null,
};
vm.runInNewContext(
  `${pauseFunction}\n${elapsedFunction}\n` +
  `result = {` +
  ` service: (state.transportServiceActive = true, postDispatchPauseReason('/missions/1', {})),` +
  ` patient: (state.transportServiceActive = false, postDispatchPauseReason('/missions/1', { kind: 'PATIENT' })),` +
  ` prisonerState: (state.transportKind = 'PRISONER', postDispatchPauseReason('/missions/1', {})),` +
  ` vehicle: (state.transportKind = '', postDispatchPauseReason('/vehicles/99', {})),` +
  ` clear: postDispatchPauseReason('/missions/1', {}),` +
  ` elapsed: postDispatchEffectiveElapsed({ startedAt: 1000, pausedMs: 2500, pausedAt: 0 }, 10000),` +
  ` activePauseElapsed: postDispatchEffectiveElapsed({ startedAt: 1000, pausedMs: 1000, pausedAt: 7000 }, 10000)` +
  `};`,
  context
);
expect(context.result.service === 'balanced-personal-transport-service', 'Balanced transport service must pause the watchdog');
expect(context.result.patient === 'patient-transport-context', 'Patient handoff must pause the watchdog');
expect(context.result.prisonerState === 'prisoner-transport-state', 'Prisoner state must pause the watchdog');
expect(context.result.vehicle === 'vehicle-transport-page', 'Vehicle transport page must pause the watchdog');
expect(context.result.clear === '', 'Normal mission processing must not pause the watchdog');
expect(context.result.elapsed === 6500, `Completed pause was not removed from elapsed time: ${context.result.elapsed}`);
expect(context.result.activePauseElapsed === 5000, `Active pause was not removed from elapsed time: ${context.result.activePauseElapsed}`);

expect(source.includes('const PIPELINE_TARGET_ROTATION_GRACE_MS = 6000;'), 'B/C target rotation grace must be six seconds');
expect(source.includes('const PIPELINE_READY_HANDOFF_GRACE_MS = 15000;'), 'Ready B/C handoff retention must be fifteen seconds');
const freezeFunction = extractFunction('pipelineTargetRotationFrozen');
expect(freezeFunction.includes('state.postDispatchWatchdog'), 'B/C target rotation must freeze during post-dispatch recovery');
expect(freezeFunction.includes('state.transportServiceActive'), 'B/C target rotation must freeze during personal transport service');

console.log('PASS: V3 post-dispatch recovery is bounded, transport-aware, duplicate-dispatch-safe, and keeps B/C warm through transient queue churn.');
