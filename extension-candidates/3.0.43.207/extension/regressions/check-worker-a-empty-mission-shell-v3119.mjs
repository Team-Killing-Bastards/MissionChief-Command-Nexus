import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const runtime = fs.readFileSync(path.join(root, 'nexus-runtime.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

function includes(text, message) {
  assert.ok(runtime.includes(text), message);
}

assert.equal(manifest.version, '3.0.43.189', 'manifest must expose the fixed local build');
includes("const MISSION_FINDER_VERSION = '10.6.191';", 'Mission Finder version must include the patient summary fix');
includes('const EMPTY_MISSION_SHELL_RECOVERY_AFTER_MS = 1800;', 'bounded empty-shell detection must exist');
includes('const EMPTY_MISSION_SHELL_SKIP_ADVANCES = 5;', 'empty-shell quarantine base must exist');
includes("'EMPTY_MISSION_SHELL'", 'empty-shell recovery must have a distinct diagnostic category');
includes('function inspectCanonicalMissionShell(doc, href)', 'canonical mission shell inspection must exist');
includes('readyState === \'complete\' && !markers.operational', 'only a completed non-operational mission route may be classified as empty');
includes('function recoverEmptyMissionShellAfterBootstrapRetry(', 'bounded post-retry recovery must exist');
includes("captureBootstrap('empty-mission-shell-after-clean-a-only-retry'", 'the second failure must capture bootstrap evidence');
includes("startTransportOnlyWorker(request, 'empty-mission-shell-recovery')", 'pending personal transport may run at the safe recovery boundary');
includes("enterLowQueuePause('empty-mission-shell-recovery')", 'the existing minimum mission-supply safety rule must be preserved');
includes('emptyMissionShellRecoveries: state.emptyMissionShellRecoveries', 'diagnostic export must expose recovery totals');
includes('emptyMissionShellHistory: state.emptyMissionShellHistory.slice()', 'diagnostic export must expose bounded recovery history');

const waitStart = runtime.indexOf('function waitForNexusAndStart(frame, generation)');
const waitEnd = runtime.indexOf('function startExistingAutoMode(control, frame, generation)', waitStart);
assert.ok(waitStart > 0 && waitEnd > waitStart, 'Worker A discovery block must be locatable');
const waitBlock = runtime.slice(waitStart, waitEnd);
const recoveryAt = waitBlock.indexOf('recoverEmptyMissionShellAfterBootstrapRetry(');
const fatalAt = waitBlock.indexOf("setError(\nstartupError ?");
assert.ok(recoveryAt >= 0, 'empty shell recovery must be invoked from Worker A discovery');
assert.ok(fatalAt > recoveryAt, 'empty shell recovery must run before the generic fatal timeout');
assert.ok(waitBlock.includes('bootstrapRetryAlreadyUsed'), 'mission rotation must occur only after the one clean A-only retry');
assert.ok(waitBlock.includes('emptyMissionShellReady || elapsed >= ACTIVE_BOOTSTRAP_RESCUE_AFTER_MS'), 'empty shells may trigger the clean retry early without weakening the generic timeout');

const missionPageFunction = runtime.match(/function isMissionPage\(\) \{[\s\S]*?\n    \}/)?.[0] || '';
assert.ok(missionPageFunction.includes('MF_OPERATIONAL_MISSION_MARKER_SELECTOR'), 'Mission Finder readiness must use operational DOM markers');
assert.ok(!missionPageFunction.includes('location.pathname'), 'a route alone must never be treated as an operational mission page');
includes('mission-initialize-deferred-no-operational-dom', 'bootstrap diagnostics must identify an empty mission shell');
includes('mission-initialize-skipped-no-operational-dom', 'initialisation diagnostics must identify missing operational DOM');

const createWorkerStart = runtime.indexOf("function createWorker(url, role = 'MISSION_A')");
const createWorkerEnd = runtime.indexOf('function getWorkerDocument(', createWorkerStart);
const createWorkerBlock = runtime.slice(createWorkerStart, createWorkerEnd);
assert.ok(createWorkerBlock.includes('removeWorker(false);'), 'A/B must remain single-owner and serialized in this hotfix');
assert.ok(createWorkerBlock.includes("state.workerRole = transportWorker ? 'TRANSPORT_B' : 'MISSION_A';"), 'the single active worker role must remain explicit');

const handoffStart = runtime.indexOf('function redirectWorkerToTransportService(');
const handoffEnd = runtime.indexOf('function startTransportOnlyWorker(', handoffStart);
const handoffBlock = runtime.slice(handoffStart, handoffEnd);
assert.ok(handoffBlock.includes("log('Released A before starting transport B.'"), 'transport handoff must retain explicit A release');
assert.ok(handoffBlock.indexOf('removeWorker(false);') < handoffBlock.indexOf("startTransportOnlyWorker(liveRequest"), 'Worker A must be removed before Worker B starts');

console.log('PASS: Worker A empty mission-shell recovery and serialized A/B ownership are locked for 3.0.43.151.');
