from pathlib import Path

SOURCE = Path('src/missionchief-command-nexus.user.js')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


def function_span(text: str, name: str, start_at: int = 0) -> tuple[int, int]:
    start = text.find(f'function {name}(', start_at)
    if start < 0:
        raise SystemExit(f'Function not found: {name}')
    brace = text.find('{', start)
    if brace < 0:
        raise SystemExit(f'Opening brace not found: {name}')
    depth = 0
    quote = ''
    escaped = False
    line_comment = False
    block_comment = False
    index = brace
    while index < len(text):
        char = text[index]
        nxt = text[index + 1] if index + 1 < len(text) else ''
        if line_comment:
            if char == '\n':
                line_comment = False
            index += 1
            continue
        if block_comment:
            if char == '*' and nxt == '/':
                block_comment = False
                index += 2
                continue
            index += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == quote:
                quote = ''
            index += 1
            continue
        if char == '/' and nxt == '/':
            line_comment = True
            index += 2
            continue
        if char == '/' and nxt == '*':
            block_comment = True
            index += 2
            continue
        if char in ("'", '"', '`'):
            quote = char
            index += 1
            continue
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return start, index + 1
        index += 1
    raise SystemExit(f'Function is unterminated: {name}')


def patch_function(text: str, name: str, patcher) -> str:
    start, end = function_span(text, name)
    body = text[start:end]
    updated = patcher(body)
    if updated == body:
        raise SystemExit(f'Function patch made no change: {name}')
    return text[:start] + updated + text[end:]


source = SOURCE.read_text(encoding='utf-8')
for old, new, label in [
    ('// @version      3.0.37', '// @version      3.0.38', 'metadata version'),
    ("const VERSION = '3.0.37';", "const VERSION = '3.0.38';", 'controller version'),
    ("const MASTER_VERSION = '3.0.37';", "const MASTER_VERSION = '3.0.38';", 'master version'),
]:
    source = replace_once(source, old, new, label)

source = replace_once(
    source,
    'function refreshRadioTransportRequests() {',
    'function refreshRadioTransportRequests(force = false) {',
    'forced Radio refresh signature',
)
source = replace_once(
    source,
    'if (state.radioScanAt && observedAt - state.radioScanAt < RADIO_SCAN_INTERVAL_MS) {',
    'if (!force && state.radioScanAt && observedAt - state.radioScanAt < RADIO_SCAN_INTERVAL_MS) {',
    'forced Radio refresh cache bypass',
)

helper = r'''
function maybeHandoffMissionATransportRoute(doc, href, context = null, source = 'watcher') {
if (
state.workerRole !== 'MISSION_A' || state.transportServiceActive ||
!state.wanted || state.stopping || !state.worker?.isConnected
) return false;
const vehicleId = vehicleIdFromUrl(href);
const transport = context || detectTransportContext(doc, href);
if (!vehicleId || !transport?.kind) return false;
const request = radioRequestForVehicle(
vehicleId,
refreshRadioTransportRequests(true)
);
if (request?.key && request.missionId) {
recordTransportService({
event: 'mission-a-route-detected', source, key: request.key,
vehicleId, missionId: request.missionId,
fromMissionId: state.currentMissionId,
evidence: (transport.evidence || []).slice(0, 6),
});
if (redirectWorkerToTransportService(request, state.currentMissionId)) return true;
}
const elapsedMs = Math.max(0, Date.now() - state.lastWorkerNavigationAt);
if (elapsedMs < 6000) {
if (state.phase !== 'TRANSPORT_HANDOFF_WAIT') {
setPhase(
'TRANSPORT_HANDOFF_WAIT',
'Matching transport route to personal Radio',
`Mission A cannot handle ${String(transport.kind).toLowerCase()} transport for vehicle ${vehicleId}. Waiting for the exact personal request.`
);
}
return true;
}
const abandonedMissionId = state.currentMissionId;
recordTransportService({
event: 'mission-a-route-rejected', source, vehicleId,
missionId: abandonedMissionId, elapsedMs,
evidence: (transport.evidence || []).slice(0, 6),
});
pausePipelineController('mission-a-unowned-transport-route', true);
clearSharedV2AutoRunning('mission-a-unowned-transport-route');
resetAutoStartTracking();
state.running = false;
state.transportServiceEligible = true;
removeWorker(false);
const workerFreeGeneration = state.workerGeneration;
setPhase(
'TRANSPORT_HANDOFF_RECOVERY',
'Removed mission A from an unowned transport route',
`Vehicle ${vehicleId} had no proven personal Radio request. Nexus will retry the exact request once, then continue with another mission.`
);
window.setTimeout(() => {
if (
!state.wanted || state.stopping || state.worker?.isConnected ||
state.workerGeneration !== workerFreeGeneration
) return;
const lateRequest = radioRequestForVehicle(
vehicleId,
refreshRadioTransportRequests(true)
);
if (lateRequest && startTransportOnlyWorker(lateRequest, 'mission-a-route-late-radio')) return;
const supply = actionableMissionSupply();
const mission = supply.candidates.find(item => item.missionId !== abandonedMissionId) ||
supply.candidates[0] || chooseTopMission({ actionableOnly: true });
if (mission?.url) createWorker(mission.url);
else beginMissionRescan();
}, 120);
return true;
}
'''.strip()
source = replace_once(
    source,
    'function redirectWorkerToTransportService(request, currentMissionId) {',
    helper + '\nfunction redirectWorkerToTransportService(request, currentMissionId) {',
    'parent A-route transport invariant',
)


def patch_load(body: str) -> str:
    old = """refreshRadioTransportRequests();
if (state.workerRole === 'TRANSPORT_B' && isMissionUrl(href)) {"""
    new = """const loadTransportContext = detectTransportContext(doc, href);
if (maybeHandoffMissionATransportRoute(doc, href, loadTransportContext, 'worker-load')) {
if (state.workerRole === 'MISSION_A' && state.worker?.isConnected) startWatcher();
return;
}
refreshRadioTransportRequests();
if (state.workerRole === 'TRANSPORT_B' && isMissionUrl(href)) {"""
    return replace_once(body, old, new, 'onWorkerLoad A-route handoff')


source = patch_function(source, 'onWorkerLoad', patch_load)


def patch_watch(body: str) -> str:
    old = """const radioRequests = refreshRadioTransportRequests();
correlateTransportMissionFromRadio(href, radioRequests);
const context = detectTransportContext(doc, href);
if (maybeRecoverStalledNonMissionRedirect(doc, href, context)) {"""
    new = """const radioRequests = refreshRadioTransportRequests();
correlateTransportMissionFromRadio(href, radioRequests);
const context = detectTransportContext(doc, href);
if (maybeHandoffMissionATransportRoute(doc, href, context, 'watcher')) {
captureWorkerSnapshot();
return;
}
if (maybeRecoverStalledNonMissionRedirect(doc, href, context)) {"""
    return replace_once(body, old, new, 'watchWorker A-route handoff')


source = patch_function(source, 'watchWorker', patch_watch)
SOURCE.write_text(source, encoding='utf-8')

# Permanent regression for the exact recurring Mission-A-on-patient-route deadlock.
Path('scripts/check-v3-mission-a-route-transport-handoff-v3038.mjs').write_text(r'''#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] || '';
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

const guard = extractFunction('maybeHandoffMissionATransportRoute');
for (const token of [
  "state.workerRole !== 'MISSION_A'",
  'vehicleIdFromUrl(href)',
  'transport?.kind',
  'refreshRadioTransportRequests(true)',
  'radioRequestForVehicle(',
  'redirectWorkerToTransportService(',
  "event: 'mission-a-route-detected'",
  "event: 'mission-a-route-rejected'",
  'removeWorker(false)',
  "startTransportOnlyWorker(lateRequest, 'mission-a-route-late-radio')",
]) {
  assert.ok(guard.includes(token), `route handoff guard is missing ${token}`);
}
assert.doesNotMatch(guard, /Dispatch|Unit Finder|handleTransportRequestsAfterDispatch/,
  'mission A route recovery must never perform transport or mission clicks itself');

const refresh = extractFunction('refreshRadioTransportRequests');
assert.match(refresh, /function refreshRadioTransportRequests\(force = false\)/);
assert.match(refresh, /if \(!force && state\.radioScanAt/,
  'normal Radio scans remain throttled while the ownership handoff can force exact evidence');

const load = extractFunction('onWorkerLoad');
const loadGuard = load.indexOf('maybeHandoffMissionATransportRoute(');
assert.ok(loadGuard >= 0 && loadGuard < load.indexOf("state.workerRole === 'TRANSPORT_B'"));
assert.ok(loadGuard < load.indexOf('if (!isMissionUrl(href))'),
  'load handling must convert A before generic non-mission handling');

const watch = extractFunction('watchWorker');
const watchGuard = watch.indexOf('maybeHandoffMissionATransportRoute(');
assert.ok(watchGuard >= 0 && watchGuard < watch.indexOf('maybeRecoverStalledNonMissionRedirect('));
assert.ok(watchGuard < watch.indexOf('beginTransportEvent('));
assert.ok(watchGuard < watch.indexOf('maybeAssistPatientTransport('),
  'watcher must transfer ownership before any transport observer or fallback can run');

const redirect = extractFunction('redirectWorkerToTransportService');
assert.ok(redirect.indexOf('removeWorker(false)') < redirect.indexOf('startTransportOnlyWorker('),
  'A must be destroyed before exact B creation');

let now = 10000;
let forcedScans = 0;
let redirects = 0;
let removals = 0;
let phases = [];
let callback = null;
let createdMission = '';
const request = {
  key: '4971825:259495582',
  vehicleId: '4971825',
  missionId: '259495582',
};
const state = {
  workerRole: 'MISSION_A',
  transportServiceActive: false,
  wanted: true,
  stopping: false,
  worker: { isConnected: true },
  currentMissionId: '259495582',
  lastWorkerNavigationAt: 9500,
  workerGeneration: 4,
  phase: 'ACTIVE',
  running: true,
  transportServiceEligible: false,
};
let scanResult = [request];
const context = vm.createContext({
  state,
  Date: { now: () => now },
  Math,
  String,
  Array,
  window: {
    setTimeout(fn) { callback = fn; return 1; },
  },
  vehicleIdFromUrl: () => '4971825',
  detectTransportContext: () => ({ kind: 'PATIENT', evidence: ['patient-route', 'anchors:68'] }),
  refreshRadioTransportRequests(force) {
    assert.equal(force, true);
    forcedScans += 1;
    return scanResult;
  },
  radioRequestForVehicle(vehicleId, requests) {
    return requests.find(item => item.vehicleId === vehicleId) || null;
  },
  recordTransportService() {},
  redirectWorkerToTransportService(exact) {
    assert.equal(exact.key, request.key);
    redirects += 1;
    return true;
  },
  setPhase(...args) { phases.push(args); state.phase = args[0]; },
  pausePipelineController() {},
  clearSharedV2AutoRunning() {},
  resetAutoStartTracking() {},
  removeWorker() {
    removals += 1;
    state.worker = null;
    state.workerRole = '';
    state.workerGeneration += 1;
  },
  startTransportOnlyWorker() { return false; },
  actionableMissionSupply() {
    return { candidates: [
      { missionId: '259495582', url: '/missions/259495582' },
      { missionId: '259500141', url: '/missions/259500141' },
    ] };
  },
  chooseTopMission: () => null,
  createWorker(url) { createdMission = url; },
  beginMissionRescan() {},
  result: null,
});
vm.runInContext(`${guard}\nthis.guard = maybeHandoffMissionATransportRoute;`, context);

context.result = context.guard({}, '/vehicles/4971825',
  { kind: 'PATIENT', evidence: ['patient-route', 'anchors:68'] }, 'watcher');
assert.equal(context.result, true);
assert.equal(forcedScans, 1);
assert.equal(redirects, 1, 'the exact personal request must transfer A to B immediately');
assert.equal(removals, 0, 'the central serialized handoff owns A removal');

state.workerRole = 'MISSION_A';
state.worker = { isConnected: true };
state.lastWorkerNavigationAt = 9500;
state.phase = 'ACTIVE';
scanResult = [];
context.result = context.guard({}, '/vehicles/4971825',
  { kind: 'PATIENT', evidence: [] }, 'watcher');
assert.equal(context.result, true);
assert.equal(phases.at(-1)[0], 'TRANSPORT_HANDOFF_WAIT');
assert.equal(removals, 0, 'a briefly delayed Radio row must receive a bounded evidence window');

now = 17000;
context.result = context.guard({}, '/vehicles/4971825',
  { kind: 'PATIENT', evidence: [] }, 'watcher');
assert.equal(context.result, true);
assert.equal(removals, 1, 'an unowned transport route must remove A instead of stalling');
assert.equal(typeof callback, 'function');
callback();
assert.equal(createdMission, '/missions/259500141',
  'fail-closed recovery must avoid immediately reopening the same trapped mission');

state.workerRole = 'TRANSPORT_B';
state.worker = { isConnected: true };
const scansBeforeB = forcedScans;
assert.equal(context.guard({}, '/vehicles/4971825',
  { kind: 'PATIENT', evidence: [] }, 'watcher'), false);
assert.equal(forcedScans, scansBeforeB, 'B must never be re-routed through the A-only guard');

console.log('PASS: any verified transport route reached by mission A is synchronously transferred to exact personal Worker B or removed by bounded fail-closed recovery.');
''', encoding='utf-8')

# Changelog and current documentation only. Historical version records remain untouched.
changelog = Path('CHANGELOG.md')
text = changelog.read_text(encoding='utf-8')
entry = """## [3.0.38] - 2026-08-30

### Fixed

- Enforce a parent-controller invariant on both worker load and watcher paths: if mission Worker A reaches a verified patient or prisoner vehicle route, Nexus immediately force-rescans personal Radio and serializes the exact request through transport Worker B.
- Preserve the normal one-second Radio scan throttle while allowing this ownership-critical route check to bypass the cache.
- If no exact personal Radio request can be proven within six seconds, remove A, retry the exact request once, then continue from a different actionable mission without clicking any transport control.
- Keep Alliance Radio excluded, Worker B transport-only, Worker A mission-only, the visible Mission Control overlay unchanged, and Mission Finder at `V10.6.177`.
- Increased the unified userscript version from `3.0.37` to `3.0.38`.

"""
if '## [3.0.38]' not in text:
    text = text.replace('## [Unreleased]\n\n', '## [Unreleased]\n\n' + entry, 1)
changelog.write_text(text, encoding='utf-8')

updates = {
    'README.md': [
        ('**Current version:** `3.0.37`', '**Current version:** `3.0.38`'),
        ('Version 3.0.37 enforces that split at every transport and observer gate: mission Worker A cannot enter legacy transport recovery, while Worker B remains the sole personal transport owner.',
         'Version 3.0.38 also enforces the split at the parent route boundary: any patient or prisoner vehicle route reached by mission Worker A is transferred to exact personal transport Worker B before transport handling can continue.'),
    ],
    'docs/README.md': [
        ('Command Nexus `3.0.37`', 'Command Nexus `3.0.38`'),
    ],
    'docs/ARCHITECTURE.md': [
        ('v3.0.37 source', 'v3.0.38 source'),
    ],
    'docs/DEVELOPER_HANDOFF.md': [
        ('| Command Nexus version | `3.0.37` |', '| Command Nexus version | `3.0.38` |'),
    ],
    'docs/MIGRATION.md': [
        ('Command Nexus `3.0.37`', 'Command Nexus `3.0.38`'),
    ],
    'docs/ROADMAP.md': [
        ('## Current production baseline — v3.0.37', '## Current production baseline — v3.0.38'),
    ],
    'src/README.md': [
        ('| Command Nexus version | `3.0.37` |', '| Command Nexus version | `3.0.38` |'),
    ],
}
for filename, pairs in updates.items():
    path = Path(filename)
    data = path.read_text(encoding='utf-8')
    for old, new in pairs:
        if old in data:
            data = data.replace(old, new, 1)
    path.write_text(data, encoding='utf-8')

# Remove all one-use inspection/build material before the candidate commit.
for path in Path('.').glob('.tmp-v3038-*.txt'):
    path.unlink()
Path('.github/workflows/_temporary-v3038-a-route-inspection.yml').unlink()
Path('scripts/_temporary-build-v3038-a-route-handoff.py').unlink()

size = SOURCE.stat().st_size
print(f'Candidate userscript size: {size} bytes')
if size > 2 * 1024 * 1024:
    raise SystemExit(f'Candidate exceeds the 2 MiB userscript ceiling: {size}')
