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


source = SOURCE.read_text(encoding='utf-8')
mission_module = source.find('MODULE 2: MISSION FINDER')
if mission_module < 0:
    raise SystemExit('Mission Finder module marker not found.')

old = (
    "function isTransportAutomationAllowed() {\n"
    "        if (isManualAutoStopActive()) return false;\n"
    "        return isAutoModeActiveFlagSet() || isPostTransportRehookPending();\n"
    "    }"
)
new = (
    "function isTransportAutomationAllowed() {\n"
    "        if (isManualAutoStopActive()) return false;\n"
    "        return isMfV3ManagedTransportWorker() ||\n"
    "            isAutoModeActiveFlagSet() || isPostTransportRehookPending();\n"
    "    }"
)
source = replace_once(source, old, new, 'transport B local authority')

start, end = function_span(source, 'handleTransportRequestsAfterDispatch', mission_module)
handler = source[start:end]
handler = replace_once(
    handler,
    'while (autoModeRunning && Date.now() - started < 90000 && sentCount < 25) {',
    'while ((autoModeRunning || isMfV3ManagedTransportWorker()) && Date.now() - started < 90000 && sentCount < 25) {',
    'transport B continuation loop',
)
source = source[:start] + handler + source[end:]

marker = '        markTransportSequenceActive();'
count = source.count(marker)
if count != 2:
    raise SystemExit(f'Expected two transport sequence markers, found {count}')
source = source.replace(
    marker,
    '        if (!isMfV3ManagedTransportWorker()) markTransportSequenceActive();',
)
source = replace_once(
    source,
    "            sessionStorage.setItem('mf_transport_sent_in_vehicle_modal_v1', 'true');",
    "            if (!isMfV3ManagedTransportWorker()) sessionStorage.setItem('mf_transport_sent_in_vehicle_modal_v1', 'true');",
    'exact transport shared flag guard',
)
source = replace_once(
    source,
    "            sessionStorage.setItem('mf_brute_transport_sent_v1', 'true');",
    "            if (!isMfV3ManagedTransportWorker()) sessionStorage.setItem('mf_brute_transport_sent_v1', 'true');",
    'brute transport shared flag guard',
)

start, end = function_span(source, 'clearAllTransportAutomationFlags', mission_module)
clearer = source[start:end]
old = (
    "        const clearRecentRehook =\n"
    "            String(reason || '').toLowerCase().includes('manual') ||\n"
    "            String(reason || '').toLowerCase().includes('stopped');"
)
new = (
    "        const clearReason = String(reason || '').toLowerCase();\n"
    "        const clearRecentRehook = clearReason.includes('manual') ||\n"
    "            clearReason.includes('stopped') || clearReason.includes('transport-worker-b');"
)
clearer = replace_once(clearer, old, new, 'transport B shared rehook cleanup')
source = source[:start] + clearer + source[end:]

start, end = function_span(source, 'startMissionFinderObserver', mission_module)
observer = source[start:end]
bootstrap = (
    "        scheduleAutoMemoryRecycleResume();\n"
    "        if (isMfV3ManagedTransportWorker()) {\n"
    "            clearAllTransportAutomationFlags('transport-worker-b');\n"
    "            void (async () => {\n"
    "                for (let pass = 0; pass < 2 && isMfV3ManagedTransportWorker(); pass += 1) {\n"
    "                    await handleTransportRequestsAfterDispatch('worker-b');\n"
    "                    await wait(400);\n"
    "                }\n"
    "            })();\n"
    "        }"
)
observer = replace_once(
    observer,
    '        scheduleAutoMemoryRecycleResume();',
    bootstrap,
    'transport B document bootstrap',
)
source = source[:start] + observer + source[end:]

# Reclaim source bytes from verbose handoff text only.
compact_pairs = [
    ("'Pausing mission Worker A'", "'Pausing A for B'"),
    (
        'Worker B will clear ${request.vehicleLabel || `vehicle ${request.vehicleId}`} before A restarts.',
        'B clears ${request.vehicleLabel || `vehicle ${request.vehicleId}`}; then A restarts.',
    ),
    ("'Worker B clearing transport during mission pause'", "'B transport during mission pause'"),
    ("'Worker B clearing personal transport'", "'B clearing personal transport'"),
    ('. Worker A is not loaded.', '.'),
    ("'Created transport B with A absent.'", "'Created transport B.'"),
    (
        "Worker B was released. ${state.lowQueueObservedCount} actionable personal mission${state.lowQueueObservedCount === 1 ? '' : 's'} remain.",
        "B released; ${state.lowQueueObservedCount} mission${state.lowQueueObservedCount === 1 ? '' : 's'} remain.",
    ),
    ("'Transport cleared; waiting for mission'", "'B cleared; waiting for mission'"),
    (
        "'Worker B was released and no actionable personal mission is currently available.'",
        "'B released; no mission available.'",
    ),
    ("'Worker B cleared; rebuilding mission Worker A'", "'B cleared; starting mission A'"),
    (
        '${missionDisplay(mission.missionId, state.currentMissionName)} is the next mission target.',
        '${missionDisplay(mission.missionId, state.currentMissionName)}',
    ),
    ("'Released B before starting fresh A.'", "'Released B; starting A.'"),
    (
        "`Created off-screen ${transportWorker ? 'transport Worker B' : 'mission Worker A'}.`",
        "`Created ${transportWorker ? 'transport B' : 'mission A'}.`",
    ),
    (
        "`Removed ${role === 'TRANSPORT_B' ? 'transport Worker B' : 'mission Worker A'}.`",
        "`Removed ${role === 'TRANSPORT_B' ? 'transport B' : 'mission A'}.`",
    ),
]
for old, new in compact_pairs:
    if old in source:
        source = source.replace(old, new, 1)

SOURCE.write_text(source, encoding='utf-8')

test_path = Path('scripts/check-v3-worker-b-transport-separation.mjs')
test = test_path.read_text(encoding='utf-8')
marker = (
    "assert.match(source, /!isMfV3ManagedTransportWorker\\(\\) &&\\s*\\(/,\n"
    "  'transport B must not inherit shared Auto Mode running state');"
)
addition = marker + """
const transportAllowed = extractFunction('isTransportAutomationAllowed', missionModule);
assert.match(transportAllowed, /isMfV3ManagedTransportWorker\(\)/,
  'B must receive local transport authority without shared Auto Mode state');
const transportHandler = extractFunction('handleTransportRequestsAfterDispatch', missionModule);
assert.match(transportHandler, /autoModeRunning \|\| isMfV3ManagedTransportWorker\(\)/,
  'the existing destination engine must continue while the current frame is B');
const observer = extractFunction('startMissionFinderObserver', missionModule);
assert.match(observer, /clearAllTransportAutomationFlags\('transport-worker-b'\)/,
  'B must clear stale shared Mission Finder rehook state before acting');
assert.match(observer, /handleTransportRequestsAfterDispatch\('worker-b'\)/,
  'every B transport document must bootstrap the existing transport engine');
assert.doesNotMatch(observer, /runAutoModeLoop\(/,
  'B transport bootstrap must never start the mission Auto Mode loop');
const exactTransportClick = extractFunction('clickExactApproachTransportButton', missionModule);
const bruteTransportClick = extractFunction('mfBruteClickFirstApproach', missionModule);
for (const body of [exactTransportClick, bruteTransportClick]) {
  assert.match(body, /!isMfV3ManagedTransportWorker\(\)/,
    'B transport clicks must not publish shared Auto Mode or rehook flags');
}"""
if marker not in test:
    raise SystemExit('Worker B regression insertion marker not found.')
test_path.write_text(test.replace(marker, addition, 1), encoding='utf-8')

changelog = Path('CHANGELOG.md')
text = changelog.read_text(encoding='utf-8')
old = (
    '- Prevented transport Worker B from inheriting Auto Mode state, mounting mission dispatch controls '
    'or entering Unit Finder/Dispatch when a transport flow reaches a mission route.\n'
)
new = old + (
    '- Start the established transport destination engine locally in each Worker B document while suppressing '
    'shared Auto Mode and post-transport rehook flags; the parent controller remains the only B-to-A handoff authority.\n'
)
if old not in text:
    raise SystemExit('Changelog transport-runtime marker not found.')
changelog.write_text(text.replace(old, new, 1), encoding='utf-8')

for path in Path('.').glob('.tmp-v3035-*.txt'):
    path.unlink()
Path('.github/workflows/_temporary-v3035-transport-runtime-audit.yml').unlink()
Path('scripts/_temporary-v3035-transport-runtime-patch.py').unlink()

size = SOURCE.stat().st_size
print(f'Candidate userscript size: {size} bytes')
if size > 2 * 1024 * 1024:
    raise SystemExit(f'Candidate exceeds 2 MiB: {size}')
