from pathlib import Path

SOURCE = Path('src/missionchief-command-nexus.user.js')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


def extract_function_span(text: str, name: str, start_at: int = 0) -> tuple[int, int]:
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


def replace_function(text: str, name: str, replacement: str, start_at: int = 0) -> str:
    start, end = extract_function_span(text, name, start_at)
    return text[:start] + replacement.strip() + text[end:]


source = SOURCE.read_text(encoding='utf-8')
if source.count('3.0.34') < 3:
    raise SystemExit('Expected the 3.0.34 production source baseline.')
source = source.replace('3.0.34', '3.0.35')
source = replace_once(
    source,
    'const PIPELINE_PRELOAD_COUNT = 1;',
    'const PIPELINE_PRELOAD_COUNT = 0;',
    'disable mission preload B',
)
source = replace_once(
    source,
    'worker: null,\nworkerGeneration: 0,',
    "worker: null,\nworkerRole: '',\nworkerGeneration: 0,",
    'controller worker role state',
)

source = replace_function(source, 'redirectWorkerToTransportService', r'''
function redirectWorkerToTransportService(request, currentMissionId) {
if (!request?.vehicleId || !request?.missionId || !state.worker?.isConnected ||
state.workerRole !== 'MISSION_A' || state.transportServiceActive) return false;
state.transportServiceEligible = false;
const event = { event: 'mission-a-to-transport-b', key: request.key,
vehicleId: request.vehicleId, missionId: request.missionId,
missionName: missionNameForId(request.missionId), fromMissionId: currentMissionId || '' };
recordTransportService(event);
pausePipelineController('transport-worker-b-handoff', true);
clearSharedV2AutoRunning('transport-worker-b-handoff');
resetAutoStartTracking();
state.running = false;
setPhase('TRANSPORT_HANDOFF', 'Pausing mission Worker A',
`Worker B will clear ${request.vehicleLabel || `vehicle ${request.vehicleId}`} before a fresh mission Worker A starts.`);
log('Released mission Worker A before starting transport Worker B.', event);
removeWorker(false);
const workerFreeGeneration = state.workerGeneration;
window.setTimeout(() => {
if (!state.wanted || state.stopping || state.worker?.isConnected ||
state.workerGeneration !== workerFreeGeneration) return;
const liveRequest = refreshRadioTransportRequests().find(item => item.key === request.key) || null;
if (liveRequest && startTransportOnlyWorker(liveRequest, 'mission-boundary-handoff')) return;
recordTransportService({ event: 'transport-b-not-needed', key: request.key,
vehicleId: request.vehicleId, missionId: request.missionId });
const supply = actionableMissionSupply();
if (supply.count < MINIMUM_ACTIONABLE_MISSIONS) {
enterLowQueuePause('transport-handoff-cleared-below-minimum-supply');
return;
}
const mission = supply.candidates[0] || chooseTopMission({ actionableOnly: true });
if (mission?.url) createWorker(mission.url);
else beginMissionRescan();
}, 120);
return true;
}''')

source = replace_function(source, 'startTransportOnlyWorker', r'''
function startTransportOnlyWorker(request, source = 'mission-wait') {
if (state.worker?.isConnected || state.transportServiceActive ||
!request?.vehicleId || !request?.missionId) return false;
const url = sameOriginUrl(`/vehicles/${request.vehicleId}`);
if (!url) return false;
state.transportServiceEligible = false;
state.transportServiceActive = true;
state.transportServiceKey = request.key;
state.transportServiceVehicleId = request.vehicleId;
state.transportServiceMissionId = request.missionId;
state.transportServiceStartedAt = Date.now();
state.transportServiceAttempts += 1;
state.currentMissionId = request.missionId;
state.currentMissionName = missionNameForId(request.missionId) || state.currentMissionName;
state.currentMissionUrl = request.missionUrl || state.currentMissionUrl;
recordTransportService({ event: 'transport-worker-b-start', source,
lowQueuePaused: state.lowQueuePaused, key: request.key,
vehicleId: request.vehicleId, missionId: request.missionId,
missionName: state.currentMissionName, url: url.href });
clearTimer('missionRescanTimer', window.clearInterval);
pausePipelineController('transport-worker-b-start', true);
clearSharedV2AutoRunning('transport-worker-b-start');
resetAutoStartTracking();
state.running = false;
createWorker(url.href, 'TRANSPORT_B');
setPhase('TRANSPORT_SERVICE',
state.lowQueuePaused ? 'Worker B clearing transport during mission pause' : 'Worker B clearing personal transport',
`${missionDisplay(request.missionId, state.currentMissionName)} | ${request.vehicleLabel || `vehicle ${request.vehicleId}`}. Worker A is not loaded.`);
log('Created on-demand transport Worker B with mission Worker A absent.', {
source, key: request.key, vehicleId: request.vehicleId, missionId: request.missionId });
return true;
}''')

source = replace_function(source, 'returnToTopMissionAfterTransport', r'''
function returnToTopMissionAfterTransport(reason, request = null) {
if (!state.wanted || state.stopping || !state.worker?.isConnected ||
state.workerRole !== 'TRANSPORT_B') return false;
const service = { key: state.transportServiceKey || request?.key || '',
vehicleId: state.transportServiceVehicleId || request?.vehicleId || '',
missionId: state.transportServiceMissionId || request?.missionId || '' };
const paused = state.lowQueuePaused;
clearTransportServiceState();
clearSharedV2AutoRunning('transport-worker-b-complete');
resetAutoStartTracking();
state.running = false;
removeWorker(false);
compactControllerEphemeralMemory();
saveRunContinuity();
recordTransportService({ event: 'transport-worker-b-complete', reason, ...service });
if (paused) {
state.transportServiceEligible = true;
setPhase('LOW_QUEUE_PAUSED', 'Transport cleared - waiting for 2 missions',
`Worker B was released. ${state.lowQueueObservedCount} actionable personal mission${state.lowQueueObservedCount === 1 ? '' : 's'} remain.`);
beginMissionRescan();
return true;
}
const supply = actionableMissionSupply();
if (supply.count < MINIMUM_ACTIONABLE_MISSIONS) {
enterLowQueuePause('transport-cleared-below-minimum-supply');
return true;
}
const mission = supply.candidates[0] || chooseTopMission({ actionableOnly: true });
if (!mission?.missionId || !mission.url) {
setPhase('WAITING_MISSION', 'Transport cleared; waiting for mission',
'Worker B was released and no actionable personal mission is currently available.');
beginMissionRescan();
return true;
}
state.postTransportRehooks += 1;
state.currentMissionId = mission.missionId;
state.currentMissionName = cleanMissionCaption(mission.caption) || missionNameForId(mission.missionId);
state.currentMissionUrl = mission.url;
persistResumeMission(mission.url);
setPhase('TRANSPORT_RETURN', 'Worker B cleared; rebuilding mission Worker A',
`${missionDisplay(mission.missionId, state.currentMissionName)} is the next mission target.`);
log('Released transport Worker B before starting a fresh mission Worker A.', {
reason, ...service, toMissionId: mission.missionId, toMissionName: state.currentMissionName });
const workerFreeGeneration = state.workerGeneration;
window.setTimeout(() => {
if (!state.wanted || state.stopping || state.worker?.isConnected ||
state.workerGeneration !== workerFreeGeneration) return;
createWorker(mission.url);
}, 120);
return true;
}''')

source = replace_function(source, 'createWorker', r'''
function createWorker(url, role = 'MISSION_A') {
clearPostDispatchWatchdog('worker-recreated');
removeWorker(false);
state.nonMissionRedirectRecoveryInFlight = false;
state.workerGeneration += 1;
const generation = state.workerGeneration;
const transportWorker = role === 'TRANSPORT_B';
const frame = document.createElement('iframe');
frame.id = WORKER_ID;
frame.name = `${ACTIVE_WORKER_NAME_PREFIX}${transportWorker ? 'transport-b-' : ''}${generation}-${missionIdFromUrl(url) || state.transportServiceMissionId || 'mission'}`;
frame.src = url;
frame.setAttribute('aria-hidden', 'true');
frame.setAttribute('tabindex', '-1');
frame.setAttribute('data-mcn-v3-worker', 'true');
frame.setAttribute('data-mcn-v3-worker-role', transportWorker ? 'transport-b' : 'mission-a');
applyActiveWorkerFrameStyle(frame);
bindManagedFrameLoad(frame, () => {
if (generation !== state.workerGeneration || state.worker !== frame) return;
onWorkerLoad(frame, generation);
});
document.body.appendChild(frame);
state.worker = frame;
state.workerRole = transportWorker ? 'TRANSPORT_B' : 'MISSION_A';
state.lastWatchHeartbeatAt = Date.now();
state.wakeRecoveryActive = false;
if (!transportWorker) {
state.bootstrapMissionUrl = url;
state.currentMissionUrl = url;
state.currentMissionId = missionIdFromUrl(url);
state.currentMissionName = missionNameForId(state.currentMissionId);
} else {
state.currentMissionId = state.transportServiceMissionId || state.currentMissionId;
state.currentMissionName = missionNameForId(state.currentMissionId) || state.currentMissionName;
}
forgetWorkerDocument();
state.lastWorkerHref = '';
state.lastWorkerNavigationAt = Date.now();
state.autoStoppedSince = 0;
state.autoStopWarned = false;
clearAutoRecoveryWatchdog();
state.priorityPendingKey = '';
state.priorityPendingSince = 0;
state.redirectFromMissionId = '';
state.redirectTargetMissionId = '';
state.transportKind = '';
state.transportIdentity = '';
state.transportSince = 0;
state.transportWarned = false;
state.foreignMissionUiWarned = false;
recordMissionVisit(url, transportWorker ? 'transport-worker-b-created' : 'worker-created');
clearTimer('workerLoadTimer');
state.workerLoadTimer = window.setTimeout(() => {
if (generation !== state.workerGeneration || !state.wanted) return;
setError(`${transportWorker ? 'Transport Worker B' : 'Mission Worker A'} did not finish loading.`,
'The off-screen MissionChief frame exceeded the 30 second load window.');
}, WORKER_LOAD_TIMEOUT_MS);
setPhase(transportWorker ? 'TRANSPORT_LOADING' : 'LOADING',
transportWorker ? 'Opening transport Worker B' : 'Opening mission Worker A',
transportWorker ? `Vehicle ${state.transportServiceVehicleId} is loading off-screen.` : `${missionDisplay(state.currentMissionId, state.currentMissionName)} is loading off-screen.`);
log(`Created off-screen ${transportWorker ? 'transport Worker B' : 'mission Worker A'}.`, {
role: state.workerRole, missionId: state.currentMissionId,
missionName: state.currentMissionName, pathname: new URL(url).pathname });
}''')

source = replace_function(source, 'removeWorker', r'''
function removeWorker(logRemoval = true) {
clearTimer('workerLoadTimer');
clearTimer('nexusDiscoveryTimer');
clearTimer('watcherTimer', window.clearInterval);
resetStaleCanonicalMissionCandidate();
captureWorkerSnapshot();
if (state.activeTransportEvent) endTransportEvent('worker-removed');
clearPostDispatchWatchdog('worker-removed');
const frame = state.worker;
const role = state.workerRole || 'MISSION_A';
state.worker = null;
state.workerRole = '';
forgetWorkerDocument();
state.workerGeneration += 1;
if (frame?.isConnected) {
setFrameOwnership(frame, false, logRemoval ? 'active-worker-remove' : 'active-worker-replace');
try { frame.name = `mcn-v3-retired-worker-${state.workerGeneration}`; } catch {}
disposeManagedFrameRuntime(frame, logRemoval ? 'active-worker-remove' : 'active-worker-replace');
try { frame.src = 'about:blank'; } catch {}
try { frame.remove(); } catch {}
if (logRemoval) log(`Removed ${role === 'TRANSPORT_B' ? 'transport Worker B' : 'mission Worker A'}.`);
}
}''')

source = replace_once(
    source,
    "if (\n!state.wanted ||\n!currentWorkerAutoConfirmed() ||",
    "if (\nstate.workerRole !== 'MISSION_A' ||\n!state.wanted ||\n!currentWorkerAutoConfirmed() ||",
    'mission priority restricted to Worker A',
)
source = replace_once(
    source,
    "const documentChanged = adoptWorkerDocument(doc, href, 'watcher');\nif (maybeRecoverStaleCanonicalMissionWorker(href, doc, 'watcher')) return;",
    """const documentChanged = adoptWorkerDocument(doc, href, 'watcher');
if (state.workerRole === 'TRANSPORT_B' && isMissionUrl(href)) {
const requests = refreshRadioTransportRequests();
const liveRequest = requests.find(item => item.key === state.transportServiceKey) || null;
if (!liveRequest) returnToTopMissionAfterTransport('transport-worker-b-mission-route');
else maybeHandleTransportServiceTimeout(requests);
captureWorkerSnapshot();
return;
}
if (maybeRecoverStaleCanonicalMissionWorker(href, doc, 'watcher')) return;""",
    'transport B mission-route watcher gate',
)
source = replace_once(
    source,
    "if (!controlRunning && !state.autoStartIssued && isMissionUrl(href)) {",
    "if (state.workerRole === 'MISSION_A' && !controlRunning && !state.autoStartIssued && isMissionUrl(href)) {",
    'Auto Mode start restricted to mission A',
)
source = replace_once(
    source,
    "refreshRadioTransportRequests();\napplyAirfieldOperationsSupervisorCrossRef(doc);",
    """refreshRadioTransportRequests();
if (state.workerRole === 'TRANSPORT_B' && isMissionUrl(href)) {
setPhase('TRANSPORT_RETURN_WAIT', 'Worker B awaiting transport clearance',
`Transport Worker B reached mission ${missionIdFromUrl(href) || state.transportServiceMissionId} and cannot run Auto Mode.`);
startWatcher();
return;
}
applyAirfieldOperationsSupervisorCrossRef(doc);""",
    'transport B load gate',
)
source = replace_once(
    source,
    "`The temporary transport worker was released. ${state.lowQueueObservedCount} actionable personal mission${state.lowQueueObservedCount === 1 ? '' : 's'} remain; durable registers were not touched.`",
    "`Worker B was released. ${state.lowQueueObservedCount} actionable personal mission${state.lowQueueObservedCount === 1 ? '' : 's'} remain.`",
    'legacy low queue transport wording',
) if "`The temporary transport worker was released." in source else source
source = source.replace(
    'Starting a fresh Worker A; B will rebuild only as a dormant preload.',
    'Starting mission Worker A; Worker B remains reserved for transport.',
)
source = source.replace('A/B remain released.', 'Mission A is released; transport B remains on standby.')

mission_module = source.find('MODULE 2: MISSION FINDER V10.6.177')
if mission_module < 0:
    raise SystemExit('Mission Finder module marker not found.')
active_worker_marker = "    function isMfV3ManagedActiveWorker() {"
active_worker_at = source.find(active_worker_marker, mission_module)
if active_worker_at < 0:
    raise SystemExit('Managed active worker marker not found.')
transport_helper = """    function isMfV3ManagedTransportWorker() {
        try {
            return window.top !== window.self &&
                String(window.name || '').startsWith(
                    MF_V3_ACTIVE_NAME_PREFIX + 'transport-b-'
                );
        } catch (_error) {
            return false;
        }
    }
"""
source = source[:active_worker_at] + transport_helper + source[active_worker_at:]
source = replace_once(
    source,
    "let autoModeRunning =\n        !mfV3DormantPreload &&\n        (",
    "let autoModeRunning =\n        !mfV3DormantPreload &&\n        !isMfV3ManagedTransportWorker() &&\n        (",
    'transport B cannot inherit Auto Mode running state',
)
init_start = source.find('function initialize()', mission_module)
if init_start < 0:
    raise SystemExit('Mission Finder initialize function not found.')
init_brace = source.find('{', init_start)
source = source[:init_brace + 1] + "\n        if (isMfV3ManagedTransportWorker()) return;" + source[init_brace + 1:]

old_pipeline_render = """if (state.ui.pipeline) {
const slots = state.pipelineSlots.slice().sort((a, b) => a.index - b.index);
const activeLabel = state.transportServiceActive
? 'A: clearing transport'
: state.lowQueuePaused
? 'A: released for RAM'
: `A: ${state.running ? 'active' : 'starting'} ${compactMissionIdLabel(state.currentMissionId)}`;
const labels = [activeLabel];
if (state.lowQueuePaused) {
labels.push('B: released');
} else if (state.pipelineMemoryPressureActive) {
labels.push('B: off (RAM protection)');
} else if (state.pipelineActiveOnly) {
labels.push('B: off (safe A-only)');
} else {
for (let i = 0; i < PIPELINE_PRELOAD_COUNT; i += 1) {
const slot = slots.find(item => item.index === i) || null;
const letter = 'B';
labels.push(slot
? `${letter}: ${readablePipelineSlotStatus(slot)} ${compactMissionIdLabel(slot.missionId)}`
: `${letter}: waiting`);
}
}
state.ui.pipeline.textContent = labels.join(' | ');
}"""
new_pipeline_render = """if (state.ui.pipeline) {
state.ui.pipeline.textContent = state.workerRole === 'TRANSPORT_B'
? `A: paused | B: transport ${compactMissionIdLabel(state.transportServiceMissionId)}`
: `${state.lowQueuePaused ? 'A: released' : `A: ${state.running ? 'dispatching' : 'starting'} ${compactMissionIdLabel(state.currentMissionId)}`} | B: transport standby`;
}"""
source = replace_once(source, old_pipeline_render, new_pipeline_render, 'A/B status display')
source = replace_once(
    source,
    "`warm handoffs ${state.pipelineReadyPromotions}/${state.pipelinePromotions} | dormant B ${state.pipelineV2DormantReady} | RAM guard ${state.pipelineMemoryPressureActive ? 'A-only' : 'normal'} | cycles ${state.runtimeRecycles} | cleanups ${state.managedRuntimeDisposals} | recovery ${state.postDispatchSoftRecoveries}/${state.postDispatchHardRecoveries} | transport ${state.transportServiceCleared}/${state.transportServiceAttempts}`;",
    "`A mission-only | B transport ${state.transportServiceCleared}/${state.transportServiceAttempts} | RAM ${state.pipelineMemoryPressureActive ? 'guard' : 'normal'} | cycles ${state.runtimeRecycles} | recovery ${state.postDispatchSoftRecoveries}/${state.postDispatchHardRecoveries}`;",
    'rule assist architecture display',
)
source = replace_once(
    source,
    'detail: state.detail,\nlowQueuePaused:',
    "detail: state.detail,\nworkerRole: state.workerRole || '',\nlowQueuePaused:",
    'controller role diagnostics',
)
source = replace_once(
    source,
    'worker: {\npresent: Boolean(state.worker?.isConnected),',
    "worker: {\nrole: state.workerRole || '',\npresent: Boolean(state.worker?.isConnected),",
    'worker role diagnostics',
)

SOURCE.write_text(source, encoding='utf-8')

# Release documentation.
changelog = Path('CHANGELOG.md')
text = changelog.read_text(encoding='utf-8')
entry = """## [3.0.35] - 2026-08-29

### Changed

- Split the active lifecycle into mission-only Worker A and on-demand transport-only Worker B. A is always removed before B starts; B is always removed before a fresh A starts.
- Disabled dormant mission preloading so the B slot is reserved exclusively for personal patient and prisoner transport. Alliance Radio remains excluded.
- Prevented transport Worker B from inheriting Auto Mode state, mounting mission dispatch controls or entering Unit Finder/Dispatch when a transport flow reaches a mission route.
- Updated RAM behaviour and diagnostics to show the active worker role. Transport B remains the sole active frame during a handoff and is released immediately after clearance or bounded timeout.
- Increased the unified userscript version from `3.0.34` to `3.0.35`; Mission Finder remains `V10.6.177`.

"""
if '## [3.0.35]' not in text:
    text = text.replace('## [Unreleased]\n\n', '## [Unreleased]\n\n' + entry, 1)
changelog.write_text(text, encoding='utf-8')

replacements = {
    'README.md': [
        ('**Current version:** `3.0.34`', '**Current version:** `3.0.35`'),
        ('Version 3.0.34 keeps the proven 3.0.29 runtime and adds bounded diagnostic-only Worker A lifecycle evidence without changing ownership, dispatch or visible mission controls.', 'Version 3.0.35 separates mission dispatch and transport: Worker A is mission-only, while on-demand Worker B exclusively handles personal patient and prisoner transport.'),
    ],
    'docs/ARCHITECTURE.md': [
        ('current MissionChief Command Nexus v3.0.34 source', 'current MissionChief Command Nexus v3.0.35 source'),
    ],
    'docs/DEVELOPER_HANDOFF.md': [
        ('| Command Nexus version | `3.0.34` |', '| Command Nexus version | `3.0.35` |'),
    ],
    'docs/MIGRATION.md': [
        ('The current Command Nexus `3.0.34` source retains the proven `3.0.29` runtime and adds diagnostic-only Worker A lifecycle evidence', 'The current Command Nexus `3.0.35` source assigns mission dispatch only to Worker A and personal patient/prisoner transport only to on-demand Worker B'),
    ],
    'docs/README.md': [
        ('The current baseline is Command Nexus `3.0.34` with Mission Finder `V10.6.177`, retaining the proven `3.0.29` runtime with diagnostic-only Worker A lifecycle evidence.', 'The current baseline is Command Nexus `3.0.35` with Mission Finder `V10.6.177`, using mission-only Worker A and on-demand transport-only Worker B.'),
    ],
    'docs/ROADMAP.md': [
        ('## Current production baseline — v3.0.34', '## Current production baseline — v3.0.35'),
    ],
    'src/README.md': [
        ('| Command Nexus version | `3.0.34` |', '| Command Nexus version | `3.0.35` |'),
    ],
}
for filename, pairs in replacements.items():
    path = Path(filename)
    data = path.read_text(encoding='utf-8')
    for old, new in pairs:
        data = data.replace(old, new, 1)
    path.write_text(data, encoding='utf-8')

# Update the one existing test that intentionally locked one mission preload.
path = Path('scripts/check-v3-adaptive-memory-pressure.mjs')
data = path.read_text(encoding='utf-8')
data = data.replace('assert.match(source, /const PIPELINE_PRELOAD_COUNT = 1;/);',
                    'assert.match(source, /const PIPELINE_PRELOAD_COUNT = 0;/);', 1)
data = data.replace('normal A+B startup heap', 'normal mission-A startup heap')
data = data.replace('growth must be sustained before B is released', 'growth must be sustained before RAM protection activates')
data = data.replace("'preload B may return after the sustained safe period'", "'the controller may leave RAM protection after the sustained safe period'")
data = data.replace('learns normal A+B heap, sheds B only after sustained pressure',
                    'learns normal mission-A heap and activates protection only after sustained pressure')
path.write_text(data, encoding='utf-8')

Path('scripts/check-v3-worker-b-transport-separation.mjs').write_text(r'''#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name, from = 0) {
  const start = source.indexOf(`function ${name}(`, from);
  assert.ok(start >= 0, `${name} must exist`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

assert.match(source, /const PIPELINE_PRELOAD_COUNT = 0;/,
  'the B slot must no longer create mission preloads');
assert.match(source, /workerRole: '',/);
assert.match(source, /function createWorker\(url, role = 'MISSION_A'\)/);
assert.match(source, /'TRANSPORT_B'/);
assert.match(source, /ACTIVE_WORKER_NAME_PREFIX\}\$\{transportWorker \? 'transport-b-' : ''\}/,
  'transport B must remain a managed active frame while retaining an explicit role name');

const handoff = extractFunction('redirectWorkerToTransportService');
assert.ok(handoff.includes("state.workerRole !== 'MISSION_A'"));
assert.ok(handoff.includes("pausePipelineController('transport-worker-b-handoff', true)"));
assert.ok(handoff.indexOf('removeWorker(false)') < handoff.indexOf('startTransportOnlyWorker('),
  'mission A must be removed before transport B can start');
assert.doesNotMatch(handoff, /state\.worker\.contentWindow\.location\.(?:replace|assign)/,
  'A must never be navigated into transport');

const startB = extractFunction('startTransportOnlyWorker');
assert.ok(startB.includes("createWorker(url.href, 'TRANSPORT_B')"));
assert.ok(startB.includes("clearSharedV2AutoRunning('transport-worker-b-start')"));
assert.doesNotMatch(startB, /Dispatch|Unit Finder/);

const finishB = extractFunction('returnToTopMissionAfterTransport');
assert.ok(finishB.includes("state.workerRole !== 'TRANSPORT_B'"));
assert.ok(finishB.indexOf('removeWorker(false)') < finishB.indexOf('createWorker(mission.url)'),
  'transport B must be removed before fresh mission A starts');
assert.doesNotMatch(finishB, /redirectWorkerToPriority/,
  'a transport iframe must never be promoted or redirected into mission work');

const watch = extractFunction('watchWorker');
assert.match(watch, /state\.workerRole === 'TRANSPORT_B' && isMissionUrl\(href\)/);
assert.match(watch, /state\.workerRole === 'MISSION_A' && !controlRunning/);
const load = extractFunction('onWorkerLoad');
assert.match(load, /state\.workerRole === 'TRANSPORT_B' && isMissionUrl\(href\)/);

const missionModule = source.indexOf('MODULE 2: MISSION FINDER V10.6.177');
assert.ok(missionModule >= 0);
const initialise = extractFunction('initialize', missionModule);
assert.match(initialise, /if \(isMfV3ManagedTransportWorker\(\)\) return;/,
  'transport B must fail closed before Mission Finder mounts dispatch controls');
assert.match(source, /!isMfV3ManagedTransportWorker\(\) &&\s*\(/,
  'transport B must not inherit shared Auto Mode running state');
assert.match(source, /A: paused \| B: transport/);
assert.match(source, /B: transport standby/);

console.log('PASS: Worker A is mission-only, Worker B is on-demand transport-only, and the two active roles never coexist.');
''', encoding='utf-8')

# Remove every inspection/build artifact before the production commit.
for path in Path('.').glob('.tmp-*.txt'):
    path.unlink()
Path('.github/workflows/_temporary-transport-worker-inspection.yml').unlink()
Path('scripts/_temporary-build-v3035-worker-b.py').unlink()

size = SOURCE.stat().st_size
print(f'Candidate userscript size: {size} bytes')
if size > 2 * 1024 * 1024:
    raise SystemExit(f'Candidate exceeds the 2 MiB Greasy Fork ceiling: {size}')
