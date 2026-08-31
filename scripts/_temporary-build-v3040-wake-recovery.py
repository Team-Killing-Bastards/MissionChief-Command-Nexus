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
    paren = text.find('(', start)
    pdepth = 0
    quote = ''
    escaped = False
    index = paren
    while index < len(text):
        char = text[index]
        if quote:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == quote:
                quote = ''
            index += 1
            continue
        if char in ("'", '"', '`'):
            quote = char
            index += 1
            continue
        if char == '(':
            pdepth += 1
        elif char == ')':
            pdepth -= 1
            if pdepth == 0:
                index += 1
                break
        index += 1
    brace = text.find('{', index)
    if brace < 0:
        raise SystemExit(f'Opening body brace not found: {name}')
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


def replace_function(text: str, name: str, replacement: str, start_at: int = 0) -> str:
    start, end = function_span(text, name, start_at)
    return text[:start] + replacement.strip() + text[end:]


source = SOURCE.read_text(encoding='utf-8')
if source.count('3.0.39') < 3:
    raise SystemExit('Expected the 3.0.39 production source baseline.')
source = source.replace('3.0.39', '3.0.40')

source = replace_once(
    source,
    'const SLEEP_GAP_RECOVERY_THRESHOLD_MS = 20000;\nconst SLEEP_GAP_HISTORY_LIMIT = 30;',
    'const SLEEP_GAP_RECOVERY_THRESHOLD_MS = 90 * 1000;\nconst SLEEP_GAP_HIDDEN_RECOVERY_THRESHOLD_MS = 3 * 60 * 1000;\nconst SLEEP_GAP_HISTORY_LIMIT = 30;',
    'wake-recovery thresholds',
)

source = replace_function(source, 'recoverFromSuspendedTimerGap', r'''
function recoverFromSuspendedTimerGap(elapsedMs, source = 'watcher') {
const visibility = String(document.visibilityState || 'visible');
const thresholdMs = visibility === 'hidden'
? SLEEP_GAP_HIDDEN_RECOVERY_THRESHOLD_MS
: SLEEP_GAP_RECOVERY_THRESHOLD_MS;
if (!state.wanted || state.stopping || state.wakeRecoveryActive ||
elapsedMs < thresholdMs) return false;
const observedHref = getWorkerHref();
const recoveryUrl = sleepRecoveryMissionUrl(observedHref);
const transportBActive = state.workerRole === 'TRANSPORT_B' &&
state.transportServiceActive;
state.wakeRecoveryActive = true;
const freshRequests = refreshRadioTransportRequests(true);
const service = {
key: state.transportServiceKey,
vehicleId: state.transportServiceVehicleId,
missionId: state.transportServiceMissionId,
};
const exactTransportRequest = transportBActive
? freshRequests.find(request => request.key === service.key ||
(request.vehicleId === service.vehicleId && request.missionId === service.missionId)) || null
: null;
const preferredTransportRequest = transportServiceRequest(freshRequests);
if (!recoveryUrl && !preferredTransportRequest && !transportBActive) {
state.wakeRecoveryActive = false;
return false;
}
const action = transportBActive
? (exactTransportRequest ? 'rebuild-exact-transport-b' : 'complete-cleared-transport-b')
: (preferredTransportRequest ? 'restart-oldest-personal-transport' : 'rebuild-mission-a');
state.sleepGapRecoveries += 1;
const event = {
at: nowIso(), source, elapsedMs, thresholdMs, visibility,
workerRole: state.workerRole || '', observedPath: pathFromUrl(observedHref),
recoveryMissionId: missionIdFromUrl(recoveryUrl),
recoveryPath: pathFromUrl(recoveryUrl),
transportServiceWasActive: state.transportServiceActive,
transportKey: service.key || '', pendingPersonalTransports: freshRequests.length,
exactTransportStillRequested: Boolean(exactTransportRequest), action,
};
state.sleepGapHistory.push(event);
if (state.sleepGapHistory.length > SLEEP_GAP_HISTORY_LIMIT) {
state.sleepGapHistory.splice(0, state.sleepGapHistory.length - SLEEP_GAP_HISTORY_LIMIT);
}
clearTimer('watcherTimer', window.clearInterval);
clearTimer('nexusDiscoveryTimer');
clearPostDispatchWatchdog('suspended-timer-gap-recovery');
pausePipelineController('suspended-timer-gap-recovery', true);
resetAutoStartTracking();
clearPromotedWorkTracking();
clearSharedV2AutoRunning('suspended-timer-gap-recovery');
clearSharedV2QueueGuard('suspended-timer-gap-recovery', state.currentMissionId,
{ preserveFinalDispatch: true });
state.running = false;
log('Detected a genuine suspended browser/computer gap.', event);
if (transportBActive && !exactTransportRequest) {
state.wakeRecoveryActive = false;
if (returnToTopMissionAfterTransport('wake-recovery-request-cleared', service)) {
return true;
}
state.wakeRecoveryActive = true;
}
if (transportBActive && exactTransportRequest) {
if (state.activeTransportEvent) {
endTransportEvent('wake-recovery-rebuild', null, observedHref);
}
removeWorker(false);
clearTransportServiceState();
state.transportKind = '';
state.transportIdentity = '';
state.transportSince = 0;
state.transportWarned = false;
state.transportRecoveryAttempts = new Map();
state.transportServiceEligible = true;
setPhase('WAKE_RECOVERY', 'Resuming transport Worker B',
`The exact request ${exactTransportRequest.key} remains live after a ${Math.round(elapsedMs / 1000)} second gap.`);
const workerFreeGeneration = state.workerGeneration;
window.setTimeout(() => {
if (!state.wanted || state.stopping || state.worker?.isConnected ||
state.workerGeneration !== workerFreeGeneration) {
state.wakeRecoveryActive = false;
return;
}
if (startTransportOnlyWorker(exactTransportRequest,
'wake-recovery-exact-transport-b')) return;
state.wakeRecoveryActive = false;
beginMissionRescan();
}, CONTROLLER_RECYCLE_RESTART_DELAY_MS);
return true;
}
removeWorker(false);
clearTransportServiceState();
state.transportKind = '';
state.transportIdentity = '';
state.transportSince = 0;
state.transportWarned = false;
state.transportRecoveryAttempts = new Map();
state.transportServiceEligible = true;
setPhase('WAKE_RECOVERY', 'Computer resumed; restarting safely',
`${Math.round(elapsedMs / 1000)} second timer gap confirmed. The next worker will start from clean parent-owned state.`);
const workerFreeGeneration = state.workerGeneration;
window.setTimeout(() => {
if (!state.wanted || state.stopping || state.worker?.isConnected ||
state.workerGeneration !== workerFreeGeneration) {
state.wakeRecoveryActive = false;
return;
}
const requests = refreshRadioTransportRequests(true);
const preferredRequest = requests.find(request =>
request.key === preferredTransportRequest?.key) || transportServiceRequest(requests);
if (preferredRequest && startTransportOnlyWorker(preferredRequest,
'wake-recovery-oldest-personal-transport')) return;
state.wakeRecoveryActive = false;
if (recoveryUrl) createWorker(recoveryUrl);
else beginMissionRescan();
}, CONTROLLER_RECYCLE_RESTART_DELAY_MS);
return true;
}''')

mission_module = source.find('MODULE 2: MISSION FINDER')
if mission_module < 0:
    raise SystemExit('Mission Finder module marker not found.')

source = replace_function(source, 'shouldKeepMissionFinderObserverForCurrentFrame', r'''
function shouldKeepMissionFinderObserverForCurrentFrame() {
        if (/^\/missions\/\d+\/gefangene\/entlassen\/?$/i.test(String(globalThis.location?.pathname || ''))) return false;
        if (MF_IS_TOP_WINDOW) return true;
        if (isMfV3ManagedActiveFrame()) return true;
        if (!document.body || !isMissionPage()) return false;
        try {
            return getPrimaryMissionRequirementDocument() === document;
        } catch (_error) {
            return true;
        }
    }''', mission_module)

for ownership_function in ('claimCurrentMissionExecutionOwnership', 'isCurrentMissionExecutionOwner'):
    start, end = function_span(source, ownership_function, mission_module)
    body = source[start:end]
    old = """        const primaryDocument =
            getPrimaryMissionRequirementDocument();
        if (primaryDocument !== document) {
            return false;
        }"""
    new = """        const managedActiveFrame = isMfV3ManagedActiveFrame();
        const primaryDocument =
            getPrimaryMissionRequirementDocument();
        if (!managedActiveFrame && primaryDocument !== document) {
            return false;
        }"""
    body = replace_once(body, old, new, f'{ownership_function} managed-frame authority')
    source = source[:start] + body + source[end:]

start, end = function_span(source, 'startMissionFinderObserver', mission_module)
observer = source[start:end]
observer = replace_once(
    observer,
    """        globalThis.__MCN_BOOT_MARK__?.('mission-observer-entered', document.readyState);
        if (isMfV3ManagedActiveFrame()) {
            globalThis.__MCN_BOOT_MARK__?.('mission-observer-managed-active-owner');
        }""",
    """        globalThis.__MCN_BOOT_MARK__?.('mission-observer-entered', document.readyState);
        const managedActiveFrame = isMfV3ManagedActiveFrame();
        if (managedActiveFrame) {
            globalThis.__MCN_BOOT_MARK__?.('mission-observer-managed-active-owner');
        }""",
    'observer active-frame snapshot',
)
observer = replace_once(
    observer,
    '        if (!shouldKeepMissionFinderObserverForCurrentFrame()) {',
    '        if (!managedActiveFrame && !shouldKeepMissionFinderObserverForCurrentFrame()) {',
    'observer mutually exclusive inactive gate',
)
source = source[:start] + observer + source[end:]

start, end = function_span(source, 'waitForNexusAndStart')
waiter = source[start:end]
waiter = replace_once(
    waiter,
    """pausePipelineController('active-bootstrap-rescue', true);
clearTimer('nexusDiscoveryTimer');""",
    """pausePipelineController('active-bootstrap-rescue', true);
clearSharedV2QueueGuard('active-bootstrap-clean-retry', missionId,
{ preserveFinalDispatch: true });
clearSharedV2AutoRunning('active-bootstrap-clean-retry');
clearTimer('nexusDiscoveryTimer');""",
    'clean active-bootstrap retry state',
)
source = source[:start] + waiter + source[end:]

SOURCE.write_text(source, encoding='utf-8')

changelog = Path('CHANGELOG.md')
text = changelog.read_text(encoding='utf-8')
entry = """## [3.0.40] - 2026-08-31

### Fixed

- Stop treating ordinary 20–30 second browser scheduling delays as sleep events. Visible-page recovery now requires 90 seconds and hidden-page recovery requires three minutes.
- Make wake recovery Worker-role aware: a cleared transport B completes through the normal B-to-A path, while a still-live exact request rebuilds B instead of starting mission A.
- Preserve oldest-first Radio timing across wake recovery and clear stale queue/opening locks without dropping the final-dispatch duplicate guard.
- Make the immutable managed Worker A frame name terminal authority before DOM readiness, visible-primary ranking and mission execution ownership checks. A managed-active bootstrap can no longer emit the contradictory inactive-owner decision.
- Clear shared queue and Auto Mode state before the one permitted clean Worker A bootstrap retry.
- Increased the unified userscript version from `3.0.39` to `3.0.40`; Mission Finder remains `V10.6.177`.

"""
if '## [3.0.40]' not in text:
    text = text.replace('## [Unreleased]\n\n', '## [Unreleased]\n\n' + entry, 1)
changelog.write_text(text, encoding='utf-8')

replacements = {
    'README.md': [
        ('**Current version:** `3.0.39`', '**Current version:** `3.0.40`'),
        ('Version 3.0.39', 'Version 3.0.40'),
    ],
    'docs/ARCHITECTURE.md': [
        ('current MissionChief Command Nexus v3.0.39 source', 'current MissionChief Command Nexus v3.0.40 source'),
    ],
    'docs/DEVELOPER_HANDOFF.md': [
        ('| Command Nexus version | `3.0.39` |', '| Command Nexus version | `3.0.40` |'),
    ],
    'docs/MIGRATION.md': [
        ('Command Nexus `3.0.39`', 'Command Nexus `3.0.40`'),
    ],
    'docs/README.md': [
        ('Command Nexus `3.0.39`', 'Command Nexus `3.0.40`'),
    ],
    'docs/ROADMAP.md': [
        ('## Current production baseline — v3.0.39', '## Current production baseline — v3.0.40'),
    ],
    'src/README.md': [
        ('| Command Nexus version | `3.0.39` |', '| Command Nexus version | `3.0.40` |'),
    ],
}
for filename, pairs in replacements.items():
    path = Path(filename)
    data = path.read_text(encoding='utf-8')
    for old, new in pairs:
        if old in data:
            data = data.replace(old, new, 1)
    path.write_text(data, encoding='utf-8')

Path('scripts/check-v3-role-aware-wake-recovery-v3040.mjs').write_text(r'''#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name, from = 0) {
  const start = source.indexOf(`function ${name}(`, from);
  assert.ok(start >= 0, `${name} must exist`);
  const paren = source.indexOf('(', start);
  let pdepth = 0;
  let quote = '';
  let escaped = false;
  let index = paren;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '(') pdepth += 1;
    if (char === ')' && --pdepth === 0) { index += 1; break; }
  }
  const brace = source.indexOf('{', index);
  let depth = 0;
  quote = '';
  escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (index = brace; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] || '';
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; index += 1; } continue; }
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

assert.match(source, /const SLEEP_GAP_RECOVERY_THRESHOLD_MS = 90 \* 1000;/);
assert.match(source, /const SLEEP_GAP_HIDDEN_RECOVERY_THRESHOLD_MS = 3 \* 60 \* 1000;/);

const recover = extractFunction('recoverFromSuspendedTimerGap');
for (const token of [
  "state.workerRole === 'TRANSPORT_B'",
  'refreshRadioTransportRequests(true)',
  "returnToTopMissionAfterTransport('wake-recovery-request-cleared'",
  "startTransportOnlyWorker(exactTransportRequest,\n'wake-recovery-exact-transport-b')",
  "clearSharedV2QueueGuard('suspended-timer-gap-recovery'",
  '{ preserveFinalDispatch: true }',
]) assert.ok(recover.includes(token), `wake recovery lost ${token}`);
assert.doesNotMatch(recover, /radioRequestFirstSeenAt\s*=\s*new Map\(/,
  'wake recovery must preserve oldest-first Radio timing');

function makeWakeContext({ visibility = 'visible', requests = [] } = {}) {
  let returnCalls = 0;
  let removals = 0;
  let clears = 0;
  let callback = null;
  let startedB = null;
  const state = {
    wanted: true,
    stopping: false,
    wakeRecoveryActive: false,
    workerRole: 'TRANSPORT_B',
    worker: { isConnected: true },
    workerGeneration: 7,
    transportServiceActive: true,
    transportServiceKey: '7623492:259600971',
    transportServiceVehicleId: '7623492',
    transportServiceMissionId: '259600971',
    currentMissionId: '259600971',
    sleepGapRecoveries: 0,
    sleepGapHistory: [],
    transportKind: 'PATIENT',
    transportIdentity: 'PATIENT:7623492:2633165',
    transportSince: 1,
    transportWarned: true,
    transportRecoveryAttempts: new Map(),
    transportServiceEligible: false,
    activeTransportEvent: null,
    running: true,
  };
  const context = vm.createContext({
    state,
    document: { visibilityState: visibility },
    String, Boolean, Number, Math, Map,
    Date: { now: () => 200000 },
    SLEEP_GAP_RECOVERY_THRESHOLD_MS: 90000,
    SLEEP_GAP_HIDDEN_RECOVERY_THRESHOLD_MS: 180000,
    SLEEP_GAP_HISTORY_LIMIT: 30,
    CONTROLLER_RECYCLE_RESTART_DELAY_MS: 120,
    window: {
      clearInterval() {},
      setTimeout(fn) { callback = fn; return 1; },
    },
    getWorkerHref: () => '/vehicles/7623492/patient/2633165',
    sleepRecoveryMissionUrl: () => '/missions/259600971',
    refreshRadioTransportRequests(force) { assert.equal(force, true); return requests; },
    transportServiceRequest: list => list[0] || null,
    nowIso: () => 'now',
    pathFromUrl: value => value,
    missionIdFromUrl: value => String(value || '').match(/missions\/(\d+)/)?.[1] || '',
    clearTimer() {},
    clearPostDispatchWatchdog() {},
    pausePipelineController() {},
    resetAutoStartTracking() {},
    clearPromotedWorkTracking() {},
    clearSharedV2AutoRunning() {},
    clearSharedV2QueueGuard(_reason, _missionId, options) {
      assert.equal(options.preserveFinalDispatch, true);
    },
    log() {},
    returnToTopMissionAfterTransport(reason, service) {
      assert.equal(reason, 'wake-recovery-request-cleared');
      assert.equal(service.key, '7623492:259600971');
      returnCalls += 1;
      return true;
    },
    endTransportEvent() {},
    removeWorker() {
      removals += 1;
      state.worker = null;
      state.workerRole = '';
      state.workerGeneration += 1;
    },
    clearTransportServiceState() {
      clears += 1;
      state.transportServiceActive = false;
    },
    setPhase() {},
    startTransportOnlyWorker(request, reason) {
      startedB = { request, reason };
      return true;
    },
    beginMissionRescan() {},
    createWorker() {},
    result: null,
  });
  vm.runInContext(`${recover}\nthis.runRecovery = recoverFromSuspendedTimerGap;`, context);
  return {
    context, state,
    run: ms => context.runRecovery(ms, 'watcher'),
    callback: () => callback?.(),
    counts: () => ({ returnCalls, removals, clears, startedB }),
  };
}

const shortGap = makeWakeContext();
assert.equal(shortGap.run(26300), false, 'a normal 26 second scheduling delay must not tear down B');
assert.deepEqual(shortGap.counts(), { returnCalls: 0, removals: 0, clears: 0, startedB: null });

const hiddenGap = makeWakeContext({ visibility: 'hidden' });
assert.equal(hiddenGap.run(120000), false, 'a hidden-page two minute delay must not be treated as sleep');

const cleared = makeWakeContext();
assert.equal(cleared.run(100000), true);
assert.equal(cleared.counts().returnCalls, 1,
  'a cleared B request must finish through the normal B-to-A function');
assert.equal(cleared.counts().removals, 0,
  'the wake handler must not run its generic teardown before normal B completion');

const exact = { key: '7623492:259600971', vehicleId: '7623492', missionId: '259600971' };
const pending = makeWakeContext({ requests: [exact] });
assert.equal(pending.run(100000), true);
assert.equal(pending.counts().removals, 1, 'stale B must be removed before exact B rebuild');
assert.equal(pending.counts().clears, 1);
pending.callback();
assert.equal(pending.counts().startedB?.request.key, exact.key);
assert.equal(pending.counts().startedB?.reason, 'wake-recovery-exact-transport-b');
assert.equal(pending.counts().returnCalls, 0,
  'a still-live request must not start mission A');

const missionModule = source.indexOf('MODULE 2: MISSION FINDER');
assert.ok(missionModule >= 0);
const shouldKeep = extractFunction('shouldKeepMissionFinderObserverForCurrentFrame', missionModule);
assert.ok(
  shouldKeep.indexOf('if (isMfV3ManagedActiveFrame()) return true;') <
  shouldKeep.indexOf('if (!document.body || !isMissionPage()) return false;'),
  'managed A must outrank early DOM readiness and visible-primary ranking'
);
const keepContext = vm.createContext({
  MF_IS_TOP_WINDOW: false,
  document: { body: null },
  globalThis: { location: { pathname: '/missions/259600971' } },
  String,
  isMissionPage: () => false,
  isMfV3ManagedActiveFrame: () => true,
  getPrimaryMissionRequirementDocument: () => ({}),
  result: null,
});
vm.runInContext(`${shouldKeep}\nresult = shouldKeepMissionFinderObserverForCurrentFrame();`, keepContext);
assert.equal(keepContext.result, true,
  'an early hidden managed Worker A must remain admitted before its DOM is complete');

const observer = extractFunction('startMissionFinderObserver', missionModule);
assert.match(observer, /const managedActiveFrame = isMfV3ManagedActiveFrame\(\);/);
assert.match(observer, /if \(!managedActiveFrame && !shouldKeepMissionFinderObserverForCurrentFrame\(\)\)/,
  'managed-active and inactive-owner outcomes must be mutually exclusive');

for (const name of ['claimCurrentMissionExecutionOwnership', 'isCurrentMissionExecutionOwner']) {
  const body = extractFunction(name, missionModule);
  assert.match(body, /const managedActiveFrame = isMfV3ManagedActiveFrame\(\);/);
  assert.match(body, /if \(!managedActiveFrame && primaryDocument !== document\)/,
    `${name} must trust the parent-appointed managed frame before visible ranking`);
}

const waiter = extractFunction('waitForNexusAndStart');
assert.ok(
  waiter.indexOf("clearSharedV2QueueGuard('active-bootstrap-clean-retry'") <
  waiter.indexOf('removeWorker(false)'),
  'clean A retry must release stale opening locks before worker replacement'
);
assert.ok(waiter.includes("clearSharedV2AutoRunning('active-bootstrap-clean-retry')"));

console.log('PASS: delayed transport completion is role-aware, short throttling gaps are ignored, and named Worker A admission is terminal before DOM/visible-owner ranking.');
''', encoding='utf-8')

# Remove every inspection and one-use build artifact before validation/commit.
for path in Path('.').glob('.tmp-v3040-*.txt'):
    path.unlink()
Path('.github/workflows/_temporary-v3040-inspection.yml').unlink()
Path('scripts/_temporary-build-v3040-wake-recovery.py').unlink()

size = SOURCE.stat().st_size
print(f'Candidate userscript size: {size} bytes')
if size > 2 * 1024 * 1024:
    raise SystemExit(f'Candidate exceeds the 2 MiB release ceiling: {size}')
