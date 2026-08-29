from pathlib import Path

SOURCE = Path('src/missionchief-command-nexus.user.js')


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


def get_function(text: str, name: str, start_at: int = 0) -> str:
    start, end = function_span(text, name, start_at)
    return text[start:end]


def replace_function(text: str, name: str, replacement: str, start_at: int = 0) -> str:
    start, end = function_span(text, name, start_at)
    return text[:start] + replacement.strip() + text[end:]


def prepend_function_guard(text: str, name: str, guard: str, start_at: int = 0) -> str:
    start, end = function_span(text, name, start_at)
    function = text[start:end]
    if guard in function:
        return text
    brace = function.find('{')
    if brace < 0:
        raise SystemExit(f'Opening brace missing while guarding {name}')
    function = function[:brace + 1] + '\n' + guard + function[brace + 1:]
    return text[:start] + function + text[end:]


source = SOURCE.read_text(encoding='utf-8')
if source.count('3.0.35') < 3:
    raise SystemExit('Expected the v3.0.35 production source baseline.')
source = source.replace('3.0.35', '3.0.36')

source = replace_function(source, 'isTransportAutomationAllowed', r'''
function isTransportAutomationAllowed() {
        if (isManualAutoStopActive()) return false;
        if (isMfV3ManagedTransportWorker()) return true;
        if (isMfV3ManagedActiveFrame()) return false;
        return isAutoModeActiveFlagSet() || isPostTransportRehookPending();
    }''', source.find('MODULE 2: MISSION FINDER'))

for function_name in [
    'maybeAssistPatientTransport',
    'maybeAssistPrisonerTransport',
    'maybeHandleTransportServiceTimeout',
]:
    source = prepend_function_guard(
        source,
        function_name,
        "if (state.workerRole !== 'TRANSPORT_B') return false;",
    )

for function_name, signature in [
    ('maybeHandleConfirmedPrisonerReleaseSuccess', 'rootDoc, href, context'),
    ('maybeReturnFromCompletedPrisonerDestination', 'context, href, requests'),
    ('maybeRecoverStalledTransportContext', 'context, href, requests'),
    ('maybeRecoverStrandedPrisonerHandoff', "doc, href, context, statusText = ''"),
]:
    source = replace_function(
        source,
        function_name,
        f"function {function_name}({signature}) {{\nreturn false;\n}}",
    )

source = replace_function(source, 'schedulePostTransportRehook', r'''
function schedulePostTransportRehook(clearedKey) {
const [vehicleId, missionId] = String(clearedKey || '').split(':');
if (
!vehicleId ||
!missionId ||
state.workerRole !== 'TRANSPORT_B' ||
!state.transportServiceActive ||
state.transportServiceKey !== clearedKey
) return;
state.transportServiceCleared += 1;
recordTransportService({
event: 'service-cleared',
key: clearedKey,
vehicleId,
missionId,
elapsedMs: state.transportServiceStartedAt
? Date.now() - state.transportServiceStartedAt
: 0,
});
window.setTimeout(() => {
if (
!state.wanted ||
state.stopping ||
state.workerRole !== 'TRANSPORT_B' ||
!state.worker?.isConnected
) return;
const requests = refreshRadioTransportRequests();
if (radioRequestForVehicle(vehicleId, requests)) return;
returnToTopMissionAfterTransport('radio-cleared', {
key: clearedKey,
vehicleId,
missionId,
});
}, POST_TRANSPORT_REHOOK_DELAY_MS);
}''')

mission_module = source.find('MODULE 2: MISSION FINDER')
for function_name in [
    'shouldKeepMissionFinderObserverForCurrentFrame',
    'startMissionFinderObserver',
]:
    start, end = function_span(source, function_name, mission_module)
    function = source[start:end]
    count = function.count('isMfV3ManagedActiveWorker()')
    if count < 1:
        raise SystemExit(f'{function_name}: active-worker bridge marker not found')
    function = function.replace('isMfV3ManagedActiveWorker()', 'isMfV3ManagedActiveFrame()')
    source = source[:start] + function + source[end:]

SOURCE.write_text(source, encoding='utf-8')

# Replace the old same-worker prisoner-return regression with the v3.0.36 contract.
Path('scripts/check-v3-completed-prisoner-destination-return.mjs').write_text(r'''#!/usr/bin/env node

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

for (const name of [
  'maybeHandleConfirmedPrisonerReleaseSuccess',
  'maybeReturnFromCompletedPrisonerDestination',
  'maybeRecoverStalledTransportContext',
  'maybeRecoverStrandedPrisonerHandoff',
]) {
  const body = extractFunction(name);
  assert.match(body, /\{\s*return false;\s*\}$/,
    `${name} must remain an inert legacy compatibility hook`);
  assert.doesNotMatch(body, /location\.(?:replace|assign)|createWorker\s*\(|redirectWorkerToPriority\s*\(|\.click\s*\(/,
    `${name} must never navigate, rebuild or click from mission Worker A`);
}

assert.doesNotMatch(source, /return-existing-worker-after-completed-prisoner-destination/,
  'the released same-worker prisoner return path must not survive v3.0.36');

const schedule = extractFunction('schedulePostTransportRehook');
assert.match(schedule, /state\.workerRole !== 'TRANSPORT_B'/,
  'only active transport B may consume a cleared Radio request');
assert.match(schedule, /state\.transportServiceKey !== clearedKey/);
assert.match(schedule, /returnToTopMissionAfterTransport\('radio-cleared'/);
assert.doesNotMatch(schedule, /redirectWorkerToPriority|location\.(?:replace|assign)/,
  'Radio clearance must end B through the parent handoff, never repurpose the current iframe');

const finish = extractFunction('returnToTopMissionAfterTransport');
assert.match(finish, /state\.workerRole !== 'TRANSPORT_B'/);
assert.ok(finish.indexOf('removeWorker(false)') < finish.indexOf('createWorker(mission.url)'),
  'B must be removed before a fresh mission A is created');

console.log('PASS: completed prisoner destinations are owned by transport B and cannot navigate or recycle mission Worker A.');
''', encoding='utf-8')

# Retain the wider transport regression, but replace obsolete Worker-A recovery assertions.
transport_test = Path('scripts/check-v3-transport-context-recovery.mjs')
text = transport_test.read_text(encoding='utf-8')
start_marker = "const watcher = extractFunction('watchWorker');"
end_marker = "const wakeRecovery = extractFunction('recoverFromSuspendedTimerGap');"
start = text.find(start_marker)
end = text.find(end_marker)
if start < 0 or end < 0 or end <= start:
    raise SystemExit('Transport-context regression replacement markers not found.')
replacement = r'''const watcher = extractFunction('watchWorker');
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

'''
text = text[:start] + replacement + text[end:]
text = text.replace(
    'one bounded no-dispatch rebuild, sleep recovery, staffing quarantine, credit parsing, and banked vehicle cross-references are preserved.',
    'transport-B-only timeout ownership, sleep recovery, staffing quarantine, credit parsing, and banked vehicle cross-references are preserved.',
)
transport_test.write_text(text, encoding='utf-8')

# Update the inactive-frame ownership regression to trust the managed frame name.
memory_test = Path('scripts/check-runtime-memory-maintenance-v1074.mjs')
text = memory_test.read_text(encoding='utf-8')
if 'isMfV3ManagedActiveWorker' not in text:
    raise SystemExit('Runtime memory ownership marker not found.')
text = text.replace('isMfV3ManagedActiveWorker', 'isMfV3ManagedActiveFrame')
text = text.replace('Verified managed Worker A', 'Named managed active frame')
memory_test.write_text(text, encoding='utf-8')

# Extend the existing A/B separation test with the live regression contract.
separation_test = Path('scripts/check-v3-worker-b-transport-separation.mjs')
text = separation_test.read_text(encoding='utf-8')
marker = """assert.match(transportAllowed, /isMfV3ManagedTransportWorker\\(\\)/,
  'B must receive local transport authority without shared Auto Mode state');"""
addition = marker + """
assert.match(transportAllowed, /if \\(isMfV3ManagedActiveFrame\\(\\)\\) return false;/,
  'mission Worker A must be denied every Mission Finder transport watcher');"""
if marker not in text:
    raise SystemExit('Worker B separation transport-authority marker not found.')
text = text.replace(marker, addition, 1)
marker = """const observer = extractFunction('startMissionFinderObserver', missionModule);"""
addition = """const ownerGate = extractFunction('shouldKeepMissionFinderObserverForCurrentFrame', missionModule);
assert.match(ownerGate, /isMfV3ManagedActiveFrame\\(\\)/,
  'the immutable managed frame name must outrank a transient bridge value');
assert.doesNotMatch(ownerGate, /isMfV3ManagedActiveWorker\\(\\)/,
  'observer admission must not depend on the mutable ownership bridge');
const observer = extractFunction('startMissionFinderObserver', missionModule);
assert.match(observer, /isMfV3ManagedActiveFrame\\(\\)/,
  'observer startup diagnostics must use the same immutable frame authority');"""
if marker not in text:
    raise SystemExit('Worker B separation observer marker not found.')
text = text.replace(marker, addition, 1)
separation_test.write_text(text, encoding='utf-8')

# Dedicated executable regression for the exact v3.0.35 live failure.
Path('scripts/check-v3-transport-owner-race-v3036.mjs').write_text(r'''#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name, from = 0) {
  const start = source.indexOf(`function ${name}(`, from);
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
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
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

const moduleStart = source.indexOf('MODULE 2: MISSION FINDER');
assert.ok(moduleStart >= 0);

const transportAllowed = extractFunction('isTransportAutomationAllowed', moduleStart);
const authority = vm.createContext({
  isManualAutoStopActive: () => false,
  isMfV3ManagedTransportWorker: () => false,
  isMfV3ManagedActiveFrame: () => true,
  isAutoModeActiveFlagSet: () => true,
  isPostTransportRehookPending: () => true,
  result: null,
});
vm.runInContext(`${transportAllowed}\nresult = isTransportAutomationAllowed();`, authority);
assert.equal(authority.result, false,
  'mission Worker A must remain transport-inert even when shared Auto Mode and rehook flags are set');
authority.isMfV3ManagedTransportWorker = () => true;
vm.runInContext('result = isTransportAutomationAllowed();', authority);
assert.equal(authority.result, true, 'transport Worker B must retain local destination authority');
authority.isMfV3ManagedTransportWorker = () => false;
authority.isMfV3ManagedActiveFrame = () => false;
vm.runInContext('result = isTransportAutomationAllowed();', authority);
assert.equal(authority.result, true,
  'a normal visible mission document must retain the established manual transport behaviour');

const ownerGate = extractFunction('shouldKeepMissionFinderObserverForCurrentFrame', moduleStart);
const document = { body: {} };
const ownership = vm.createContext({
  MF_IS_TOP_WINDOW: false,
  document,
  isMissionPage: () => true,
  isMfV3ManagedActiveFrame: () => true,
  getPrimaryMissionRequirementDocument: () => ({ competing: true }),
  result: null,
});
vm.runInContext(`${ownerGate}\nresult = shouldKeepMissionFinderObserverForCurrentFrame();`, ownership);
assert.equal(ownership.result, true,
  'a correctly named fresh Worker A must survive a transient false storage bridge during bootstrap');
ownership.isMfV3ManagedActiveFrame = () => false;
vm.runInContext('result = shouldKeepMissionFinderObserverForCurrentFrame();', ownership);
assert.equal(ownership.result, false, 'an unrelated child mission frame must still yield');

for (const name of ['maybeAssistPatientTransport', 'maybeAssistPrisonerTransport', 'maybeHandleTransportServiceTimeout']) {
  assert.match(extractFunction(name), /state\.workerRole !== 'TRANSPORT_B'/,
    `${name} must be transport-B-only`);
}
for (const name of [
  'maybeHandleConfirmedPrisonerReleaseSuccess',
  'maybeReturnFromCompletedPrisonerDestination',
  'maybeRecoverStalledTransportContext',
  'maybeRecoverStrandedPrisonerHandoff',
]) {
  const legacy = extractFunction(name);
  assert.match(legacy, /\{\s*return false;\s*\}$/);
  assert.doesNotMatch(legacy, /location\.(?:replace|assign)|redirectWorkerToPriority|createWorker|\.click\s*\(/);
}

const schedule = extractFunction('schedulePostTransportRehook');
assert.match(schedule, /state\.workerRole !== 'TRANSPORT_B'/);
assert.doesNotMatch(schedule, /redirectWorkerToPriority/);
assert.doesNotMatch(source, /return-existing-worker-after-completed-prisoner-destination/);

const finish = extractFunction('returnToTopMissionAfterTransport');
assert.ok(finish.indexOf('removeWorker(false)') < finish.indexOf('createWorker(mission.url)'));

console.log('PASS: v3.0.35 transport leakage and active/inactive observer race are permanently blocked.');
''', encoding='utf-8')

# Release documentation.
changelog = Path('CHANGELOG.md')
text = changelog.read_text(encoding='utf-8')
entry = """## [3.0.36] - 2026-08-29

### Fixed

- Denied every patient/prisoner transport watcher inside mission Worker A, even when shared Auto Mode or post-transport flags are still present.
- Retired the legacy same-worker prisoner return, release-success redirect and transport hard-recovery paths that could navigate Worker A away from mission work.
- Restricted parent patient/prisoner assistance, Radio-clearance handling and transport timeout recovery to explicit transport Worker B.
- Made the managed active-frame name authoritative during Mission Finder observer bootstrap, preventing a transient ownership-bridge value from classifying a fresh Worker A as active and then inactive.
- Added a permanent executable regression for the v3.0.35 mission `259490733` failure sequence.
- Increased the unified userscript version from `3.0.35` to `3.0.36`; Mission Finder remains `V10.6.177`.

"""
if '## [3.0.36]' not in text:
    text = text.replace('## [Unreleased]\n\n', '## [Unreleased]\n\n' + entry, 1)
changelog.write_text(text, encoding='utf-8')

replacements = {
    'README.md': [
        ('**Current version:** `3.0.35`', '**Current version:** `3.0.36`'),
        ('Version 3.0.35 separates mission dispatch and transport: Worker A is mission-only, while on-demand Worker B exclusively handles personal patient and prisoner transport.',
         'Version 3.0.36 enforces that split at every transport and observer gate: mission Worker A cannot enter legacy transport recovery, while Worker B remains the sole personal transport owner.'),
    ],
    'docs/ARCHITECTURE.md': [('current MissionChief Command Nexus v3.0.35 source', 'current MissionChief Command Nexus v3.0.36 source')],
    'docs/DEVELOPER_HANDOFF.md': [('| Command Nexus version | `3.0.35` |', '| Command Nexus version | `3.0.36` |')],
    'docs/MIGRATION.md': [('The current Command Nexus `3.0.35` source assigns mission dispatch only to Worker A and personal patient/prisoner transport only to on-demand Worker B',
                           'The current Command Nexus `3.0.36` source enforces mission-only Worker A and personal patient/prisoner transport-only Worker B at every transport, recovery and observer gate')],
    'docs/README.md': [('The current baseline is Command Nexus `3.0.35` with Mission Finder `V10.6.177`, using mission-only Worker A and on-demand transport-only Worker B.',
                        'The current baseline is Command Nexus `3.0.36` with Mission Finder `V10.6.177`, enforcing mission-only Worker A and on-demand transport-only Worker B through immutable frame-role admission.')],
    'docs/ROADMAP.md': [('## Current production baseline — v3.0.35', '## Current production baseline — v3.0.36')],
    'src/README.md': [('| Command Nexus version | `3.0.35` |', '| Command Nexus version | `3.0.36` |')],
}
for filename, pairs in replacements.items():
    path = Path(filename)
    data = path.read_text(encoding='utf-8')
    for old, new in pairs:
        if old not in data:
            raise SystemExit(f'{filename}: documentation marker not found: {old}')
        data = data.replace(old, new, 1)
    path.write_text(data, encoding='utf-8')

# Remove all temporary inspection/build material before the production commit.
for path in Path('.').glob('.tmp-v3036-*.txt'):
    path.unlink()
Path('.github/workflows/_temporary-v3036-error-inspection.yml').unlink()
Path('scripts/_temporary-build-v3036-owner-race.py').unlink()

size = SOURCE.stat().st_size
print(f'Candidate userscript size: {size} bytes')
if size > 2 * 1024 * 1024:
    raise SystemExit(f'Candidate exceeds the 2 MiB userscript ceiling: {size}')
