from pathlib import Path

SOURCE = Path('src/missionchief-command-nexus.user.js')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


def function_span(text: str, name: str, start_at: int = 0) -> tuple[int, int]:
    candidates = [
        text.find(f'function {name}(', start_at),
        text.find(f'async function {name}(', start_at),
    ]
    starts = [value for value in candidates if value >= 0]
    if not starts:
        raise SystemExit(f'Function not found: {name}')
    start = min(starts)
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
    raise SystemExit(f'Unterminated function: {name}')


def replace_function(text: str, name: str, replacement: str, start_at: int = 0) -> str:
    start, end = function_span(text, name, start_at)
    return text[:start] + replacement.strip() + text[end:]


def insert_at_function_start(text: str, name: str, insertion: str, start_at: int = 0) -> str:
    start, _ = function_span(text, name, start_at)
    brace = text.find('{', start)
    return text[:brace + 1] + '\n' + insertion.rstrip() + text[brace + 1:]


source = SOURCE.read_text(encoding='utf-8')
if source.count('3.0.38') < 3:
    raise SystemExit('Expected the 3.0.38 production source baseline.')
source = source.replace('3.0.38', '3.0.39')

controller_helpers = r'''
function isPrisonerReleaseTerminalUrl(value) {
const url = sameOriginUrl(value);
return Boolean(url && /^\/missions\/\d+\/gefangene\/entlassen\/?$/i.test(url.pathname));
}
function canonicalMissionWorkerUrl(value) {
const url = sameOriginUrl(value);
if (!url) return String(value || '');
if (!isPrisonerReleaseTerminalUrl(url.href)) return url.href;
const missionId = missionIdFromUrl(url.href);
const canonical = missionId ? sameOriginUrl(`/missions/${missionId}`) : null;
return canonical?.href || url.href;
}
function hasConfirmedPrisonerReleaseSuccess(doc) {
if (!doc?.querySelectorAll) return false;
for (const alert of doc.querySelectorAll('.alert.alert-success')) {
const text = normaliseText(alert.textContent).toLowerCase();
if (/^the prisoners were released\.?$/.test(text)) return true;
}
return false;
}
function maybeFinishPrisonerReleaseTerminal(doc, href, source = 'watcher') {
if (
state.workerRole !== 'MISSION_A' || !state.wanted || state.stopping ||
!state.worker?.isConnected || !isPrisonerReleaseTerminalUrl(href)
) return false;
const missionId = missionIdFromUrl(href) || state.currentMissionId;
const key = `${missionId || 'unknown'}:prisoner-release-terminal`;
if (state.prisonerReleaseSuccessKey !== key) {
state.prisonerReleaseSuccessKey = key;
state.prisonerReleaseSuccessSince = Date.now();
}
const confirmed = hasConfirmedPrisonerReleaseSuccess(doc);
const elapsedMs = Math.max(0, Date.now() - state.prisonerReleaseSuccessSince);
if (!confirmed && elapsedMs < 3000) {
setPhase('PRISONER_RELEASE_RESULT', 'Waiting for prisoner release result',
`Mission ${missionId || 'unknown'} reached the terminal release route. Mission Finder and Dispatch remain blocked.`);
return true;
}
const event = {
at: nowIso(), source, missionId, path: pathFromUrl(href), confirmed,
elapsedMs, title: normaliseText(doc?.title).slice(0, 160),
};
if (confirmed) {
state.prisonerReleaseSuccessRehooks += 1;
state.prisonerReleaseHandledKeys.add(key);
}
state.prisonerReleaseSuccessHistory.push(event);
if (state.prisonerReleaseSuccessHistory.length > TRANSPORT_SERVICE_HISTORY_LIMIT) {
state.prisonerReleaseSuccessHistory.splice(0,
state.prisonerReleaseSuccessHistory.length - TRANSPORT_SERVICE_HISTORY_LIMIT);
}
pausePipelineController('prisoner-release-terminal', true);
clearSharedV2AutoRunning('prisoner-release-terminal');
resetAutoStartTracking();
state.running = false;
state.bootstrapMissionUrl = '';
state.currentMissionUrl = '';
sessionSet(SESSION_RESUME_MISSION, '');
setPhase('PRISONER_RELEASE_RETURN',
confirmed ? 'Prisoners released; rebuilding mission A' : 'Release result unconfirmed; leaving terminal route',
`Mission ${missionId || 'unknown'} terminal result will not be reused as a mission worker URL.`);
log('Removed mission A from the terminal prisoner release result.', event);
removeWorker(false);
state.prisonerReleaseSuccessKey = '';
state.prisonerReleaseSuccessSince = 0;
compactControllerEphemeralMemory();
saveRunContinuity();
const workerFreeGeneration = state.workerGeneration;
window.setTimeout(() => {
if (!state.wanted || state.stopping || state.worker?.isConnected ||
state.workerGeneration !== workerFreeGeneration) return;
const supply = actionableMissionSupply();
const mission = supply.candidates.find(item => item.missionId !== missionId) ||
supply.candidates[0] || chooseTopMission({ actionableOnly: true });
if (mission?.url) {
persistResumeMission(mission.url);
createWorker(mission.url);
} else beginMissionRescan();
}, CONTROLLER_RECYCLE_RESTART_DELAY_MS);
return true;
}
'''
source = replace_once(
    source,
    'function persistResumeMission(value) {',
    controller_helpers + '\nfunction persistResumeMission(value) {',
    'insert prisoner terminal controller helpers',
)

source = replace_function(source, 'persistResumeMission', r'''
function persistResumeMission(value) {
const url = sameOriginUrl(value);
if (
url && isMissionUrl(url.href) &&
!isPrisonerReleaseTerminalUrl(url.href) &&
!missionAlarmSubmissionId(url.href)
) sessionSet(SESSION_RESUME_MISSION, url.href);
}''')

source = replace_function(source, 'storedResumeMissionUrl', r'''
function storedResumeMissionUrl() {
const value = sessionGet(SESSION_RESUME_MISSION);
const url = sameOriginUrl(value);
if (!url || !isMissionUrl(url.href) || missionAlarmSubmissionId(url.href) ||
isPrisonerReleaseTerminalUrl(url.href)) {
if (value) sessionSet(SESSION_RESUME_MISSION, '');
return '';
}
return url.href;
}''')

source = insert_at_function_start(
    source,
    'createWorker',
    "if (role === 'MISSION_A') url = canonicalMissionWorkerUrl(url);",
)

source = replace_once(
    source,
    "const documentChanged = adoptWorkerDocument(doc, href, 'load-event');\nstate.currentMissionUrl = href;",
    """const documentChanged = adoptWorkerDocument(doc, href, 'load-event');
if (maybeFinishPrisonerReleaseTerminal(doc, href, 'worker-load')) {
if (state.worker?.isConnected) startWatcher();
return;
}
state.currentMissionUrl = href;""",
    'worker-load terminal guard',
)

source = replace_once(
    source,
    "const documentChanged = adoptWorkerDocument(doc, href, 'watcher');\nif (state.workerRole === 'TRANSPORT_B' && isMissionUrl(href)) {",
    """const documentChanged = adoptWorkerDocument(doc, href, 'watcher');
if (maybeFinishPrisonerReleaseTerminal(doc, href, 'watcher')) {
captureWorkerSnapshot();
return;
}
if (state.workerRole === 'TRANSPORT_B' && isMissionUrl(href)) {""",
    'watcher terminal guard',
)

source = replace_once(
    source,
    "const href = getWorkerHref(frame);\nconst missionId = missionIdFromUrl(href);",
    """const href = getWorkerHref(frame);
const terminalDoc = getWorkerDocument(frame);
if (maybeFinishPrisonerReleaseTerminal(terminalDoc, href, 'nexus-discovery')) return;
const missionId = missionIdFromUrl(href);""",
    'nexus-discovery terminal guard',
)
source = replace_once(
    source,
    'const rescueUrl = href;',
    'const rescueUrl = canonicalMissionWorkerUrl(href);',
    'canonical clean retry URL',
)

mission_module = source.find('MODULE 2: MISSION FINDER')
if mission_module < 0:
    raise SystemExit('Mission Finder module marker not found.')
embedded_helper = r'''
    function isMfV3PrisonerReleaseTerminalPage() {
        try {
            return /^\/missions\/\d+\/gefangene\/entlassen\/?$/i.test(
                String(window.location.pathname || '')
            );
        } catch (_error) {
            return false;
        }
    }
'''
marker = '    function isMfV3ManagedTransportWorker() {'
pos = source.find(marker, mission_module)
if pos < 0:
    raise SystemExit('Mission Finder transport-worker helper marker not found.')
source = source[:pos] + embedded_helper + source[pos:]

source = insert_at_function_start(
    source,
    'startMissionFinderObserver',
    """        if (isMfV3PrisonerReleaseTerminalPage()) {
            globalThis.__MCN_BOOT_MARK__?.('prisoner-release-terminal-result');
            return;
        }""",
    mission_module,
)
source = insert_at_function_start(
    source,
    'initialize',
    '        if (isMfV3PrisonerReleaseTerminalPage()) return;',
    mission_module,
)

source = replace_once(
    source,
    "function shouldKeepMissionFinderObserverForCurrentFrame() {\n        if (MF_IS_TOP_WINDOW) return true;",
    """function shouldKeepMissionFinderObserverForCurrentFrame() {
        if (isMfV3PrisonerReleaseTerminalPage()) return false;
        if (MF_IS_TOP_WINDOW) return true;""",
    'terminal observer ownership guard',
)

SOURCE.write_text(source, encoding='utf-8')

changelog = Path('CHANGELOG.md')
text = changelog.read_text(encoding='utf-8')
entry = """## [3.0.39] - 2026-08-30

### Fixed

- Treat `/missions/{id}/gefangene/entlassen` as a terminal prisoner-release result rather than a reusable mission page. A confirmed “The prisoners were released” result now removes Worker A and continues from a fresh mission worker without waiting for Mission Finder.
- Block Mission Finder initialization, Unit Finder, Dispatch and Auto Mode discovery on prisoner-release terminal/404 documents.
- Reject prisoner-release terminal URLs from current resume storage and canonicalize any clean Worker A retry back to `/missions/{id}` so the terminal URL can never be replayed.
- Add bounded three-second fail-closed handling when the terminal route loads without a readable success alert; the worker is removed and another actionable mission is selected without clicking any further control.
- Increased the unified userscript version from `3.0.38` to `3.0.39`; Mission Finder remains `V10.6.177`.

"""
if '## [3.0.39]' not in text:
    text = text.replace('## [Unreleased]\n\n', '## [Unreleased]\n\n' + entry, 1)
changelog.write_text(text, encoding='utf-8')

replacements = {
    'README.md': [
        ('**Current version:** `3.0.38`', '**Current version:** `3.0.39`'),
    ],
    'docs/ARCHITECTURE.md': [
        ('current MissionChief Command Nexus v3.0.38 source', 'current MissionChief Command Nexus v3.0.39 source'),
    ],
    'docs/DEVELOPER_HANDOFF.md': [
        ('| Command Nexus version | `3.0.38` |', '| Command Nexus version | `3.0.39` |'),
    ],
    'docs/MIGRATION.md': [
        ('The current Command Nexus `3.0.38` source', 'The current Command Nexus `3.0.39` source'),
    ],
    'docs/README.md': [
        ('The current baseline is Command Nexus `3.0.38`', 'The current baseline is Command Nexus `3.0.39`'),
    ],
    'docs/ROADMAP.md': [
        ('## Current production baseline — v3.0.38', '## Current production baseline — v3.0.39'),
    ],
    'src/README.md': [
        ('| Command Nexus version | `3.0.38` |', '| Command Nexus version | `3.0.39` |'),
    ],
}
for filename, pairs in replacements.items():
    path = Path(filename)
    if not path.exists():
        continue
    data = path.read_text(encoding='utf-8')
    for old, new in pairs:
        if old in data:
            data = data.replace(old, new, 1)
    path.write_text(data, encoding='utf-8')

Path('scripts/check-v3-prisoner-release-terminal-v3039.mjs').write_text(r'''#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name, from = 0) {
  const markers = [`function ${name}(`, `async function ${name}(`];
  const starts = markers.map(marker => source.indexOf(marker, from)).filter(value => value >= 0);
  assert.ok(starts.length, `${name} must exist`);
  const start = Math.min(...starts);
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
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; index += 1; } continue; }
    if (quote) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === quote) quote = ''; continue; }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

const urlHelpers = [
  extractFunction('isPrisonerReleaseTerminalUrl'),
  extractFunction('canonicalMissionWorkerUrl'),
].join('\n');
const sandbox = {
  URL,
  location: { origin: 'https://www.missionchief.co.uk' },
  sameOriginUrl(value) {
    try {
      const url = new URL(String(value || ''), this.location.origin);
      return url.origin === this.location.origin ? url : null;
    } catch { return null; }
  },
  missionIdFromUrl(value) {
    const url = this.sameOriginUrl(value);
    const match = url?.pathname.match(/^\/missions\/(\d+)(?:\/|$)/i);
    return match ? match[1] : '';
  },
};
vm.createContext(sandbox);
vm.runInContext(`${urlHelpers}; this.isTerminal=isPrisonerReleaseTerminalUrl; this.canonical=canonicalMissionWorkerUrl;`, sandbox);
assert.equal(sandbox.isTerminal('/missions/259517433/gefangene/entlassen'), true);
assert.equal(sandbox.isTerminal('/missions/259517433/gefangene/entlassen?sd=a'), true);
assert.equal(sandbox.isTerminal('/missions/259517433'), false);
assert.equal(sandbox.isTerminal('/missions/259517433/missing_vehicles'), false);
assert.equal(sandbox.canonical('/missions/259517433/gefangene/entlassen'), 'https://www.missionchief.co.uk/missions/259517433');

const finish = extractFunction('maybeFinishPrisonerReleaseTerminal');
for (const marker of [
  "state.workerRole !== 'MISSION_A'",
  "hasConfirmedPrisonerReleaseSuccess(doc)",
  "elapsedMs < 3000",
  "clearSharedV2AutoRunning('prisoner-release-terminal')",
  "state.bootstrapMissionUrl = ''",
  "state.currentMissionUrl = ''",
  "sessionSet(SESSION_RESUME_MISSION, '')",
  'removeWorker(false)',
  "supply.candidates.find(item => item.missionId !== missionId)",
]) assert.ok(finish.includes(marker), `terminal handler missing ${marker}`);
assert.doesNotMatch(finish, /\.click\s*\(|Dispatch|Unit Finder/,
  'terminal result handling must never click or dispatch');

const persist = extractFunction('persistResumeMission');
const stored = extractFunction('storedResumeMissionUrl');
assert.match(persist, /!isPrisonerReleaseTerminalUrl\(url\.href\)/);
assert.match(stored, /isPrisonerReleaseTerminalUrl\(url\.href\)/);
assert.match(stored, /sessionSet\(SESSION_RESUME_MISSION, ''\)/);

const create = extractFunction('createWorker');
assert.ok(create.indexOf("role === 'MISSION_A'") < create.indexOf("frame.src = url"),
  'mission A URL must be canonicalized before iframe creation');

const load = extractFunction('onWorkerLoad');
assert.ok(load.indexOf('maybeFinishPrisonerReleaseTerminal') < load.indexOf('state.currentMissionUrl = href'),
  'worker-load terminal guard must run before current/resume URL persistence');
const watch = extractFunction('watchWorker');
assert.ok(watch.indexOf('maybeFinishPrisonerReleaseTerminal') < watch.indexOf('documentChanged && isMissionUrl(href)'),
  'watcher terminal guard must run before Mission Finder discovery');
const discover = extractFunction('waitForNexusAndStart');
assert.ok(discover.indexOf('maybeFinishPrisonerReleaseTerminal') < discover.indexOf('ensureActiveWorkerOwnership'),
  'discovery must exit terminal results before ownership or Auto Mode lookup');
assert.match(discover, /const rescueUrl = canonicalMissionWorkerUrl\(href\)/,
  'clean A-only retry must never replay the terminal route');

const missionModule = source.indexOf('MODULE 2: MISSION FINDER');
const observer = extractFunction('startMissionFinderObserver', missionModule);
const initialize = extractFunction('initialize', missionModule);
assert.ok(observer.indexOf('isMfV3PrisonerReleaseTerminalPage()') < observer.indexOf('mission-observer-entered'),
  'terminal page must exit before Mission Finder observer startup');
assert.match(initialize, /isMfV3PrisonerReleaseTerminalPage\(\)/,
  'terminal page must never mount the mission UI');

console.log('PASS: prisoner release success/404 routes are terminal, never persisted or replayed, and return through a fresh mission Worker A without Auto Mode discovery or dispatch.');
''', encoding='utf-8')

for pattern in ('.tmp-v3039-*.txt',):
    for path in Path('.').glob(pattern):
        path.unlink()
Path('.github/workflows/_temporary-v3039-prisoner-release-inspection.yml').unlink()
Path('scripts/_temporary-build-v3039-prisoner-terminal.py').unlink()

size = SOURCE.stat().st_size
print(f'Candidate userscript size: {size} bytes')
if size > 2 * 1024 * 1024:
    raise SystemExit(f'Candidate exceeds 2 MiB: {size}')
