#!/usr/bin/env python3
from __future__ import annotations

import bisect
import json
import re
from collections import Counter
from pathlib import Path

SOURCE_PATH = Path('src/missionchief-command-nexus.user.js')
OUT_DIR = Path('.github/diagnostics')
MD_PATH = OUT_DIR / 'runtime-memory-audit-v1082.md'
JSON_PATH = OUT_DIR / 'runtime-memory-audit-v1082.json'
FUNCTIONS_PATH = OUT_DIR / 'runtime-memory-functions-v1082.txt'

source = SOURCE_PATH.read_text(encoding='utf-8')
lines = source.splitlines()
OUT_DIR.mkdir(parents=True, exist_ok=True)

line_offsets = [0]
for match in re.finditer('\n', source):
    line_offsets.append(match.end())


def line_of(offset: int) -> int:
    return bisect.bisect_right(line_offsets, max(0, offset))


def excerpt(line_number: int, radius: int = 4) -> str:
    start = max(1, line_number - radius)
    end = min(len(lines), line_number + radius)
    return '\n'.join(f'{idx:05d}: {lines[idx - 1]}' for idx in range(start, end + 1))

function_starts: list[tuple[int, str]] = []
for line_number, text in enumerate(lines, 1):
    match = re.search(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(', text)
    if not match:
        match = re.search(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=.*=>', text)
    if match:
        function_starts.append((line_number, match.group(1)))
function_lines = [item[0] for item in function_starts]


def nearest_function(line_number: int) -> str:
    index = bisect.bisect_right(function_lines, line_number) - 1
    return function_starts[index][1] if index >= 0 else '<module scope>'


def scan_calls(pattern: str) -> list[dict]:
    result = []
    for match in re.finditer(pattern, source):
        ln = line_of(match.start())
        result.append({'line': ln, 'function': nearest_function(ln), 'excerpt': excerpt(ln, 4)})
    return result


def tracked_calls(call_name: str, clear_name: str) -> tuple[list[dict], list[dict]]:
    assignment = re.compile(
        rf'(?P<handle>(?:[A-Za-z_$][\w$]*\.)?[A-Za-z_$][\w$]*)\s*=\s*{re.escape(call_name)}\s*\('
    )
    tracked = []
    call_offsets = set()
    for match in assignment.finditer(source):
        call_offset = source.find(call_name, match.start(), match.end())
        call_offsets.add(call_offset)
        handle = match.group('handle')
        ln = line_of(match.start())
        tracked.append({
            'handle': handle,
            'line': ln,
            'function': nearest_function(ln),
            'cleared': bool(re.search(rf'{re.escape(clear_name)}\s*\(\s*{re.escape(handle)}\s*\)', source)),
            'excerpt': excerpt(ln, 5),
        })
    untracked = []
    for match in re.finditer(rf'{re.escape(call_name)}\s*\(', source):
        if match.start() in call_offsets:
            continue
        ln = line_of(match.start())
        untracked.append({'line': ln, 'function': nearest_function(ln), 'excerpt': excerpt(ln, 5)})
    return tracked, untracked


intervals, untracked_intervals = tracked_calls('setInterval', 'clearInterval')
timeouts, untracked_timeouts = tracked_calls('setTimeout', 'clearTimeout')
rafs, untracked_rafs = tracked_calls('requestAnimationFrame', 'cancelAnimationFrame')

observers = []
observer_offsets = set()
observer_assignment = re.compile(
    r'(?P<handle>(?:[A-Za-z_$][\w$]*\.)?[A-Za-z_$][\w$]*)\s*=\s*new\s+MutationObserver\s*\('
)
for match in observer_assignment.finditer(source):
    observer_offsets.add(source.find('new MutationObserver', match.start(), match.end()))
    handle = match.group('handle')
    ln = line_of(match.start())
    observers.append({
        'handle': handle,
        'line': ln,
        'function': nearest_function(ln),
        'disconnected': bool(re.search(rf'{re.escape(handle)}\s*\.\s*disconnect\s*\(', source)),
        'body_subtree': bool(re.search(rf'{re.escape(handle)}\s*\.\s*observe\s*\(\s*document\.(?:body|documentElement)[\s\S]{{0,300}}subtree\s*:\s*true', source)),
        'excerpt': excerpt(ln, 7),
    })
untracked_observers = []
for match in re.finditer(r'new\s+MutationObserver\s*\(', source):
    if match.start() in observer_offsets:
        continue
    ln = line_of(match.start())
    untracked_observers.append({'line': ln, 'function': nearest_function(ln), 'excerpt': excerpt(ln, 7)})

listener_adds = scan_calls(r'addEventListener\s*\(')
listener_removes = scan_calls(r'removeEventListener\s*\(')
listener_details = []
listener_pattern = re.compile(
    r'(?P<target>window|document|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*\.\s*addEventListener\s*\(\s*[\'\"](?P<event>[^\'\"]+)[\'\"]\s*,\s*(?P<handler>[^,\n\)]+)'
)
for match in listener_pattern.finditer(source):
    target = match.group('target')
    event = match.group('event')
    handler = match.group('handler').strip()
    ln = line_of(match.start())
    listener_details.append({
        'target': target,
        'event': event,
        'handler': handler[:120],
        'line': ln,
        'function': nearest_function(ln),
        'anonymous': '=>' in handler or handler.startswith(('function', '(', 'async ')),
        'removal_pair': bool(re.search(
            rf'{re.escape(target)}\s*\.\s*removeEventListener\s*\(\s*[\'\"]{re.escape(event)}[\'\"]\s*,\s*{re.escape(handler)}',
            source,
        )),
    })

collections = []
collection_decl = re.compile(
    r'(?m)^\s*(?:const|let|var)\s+(?P<name>[A-Za-z_$][\w$]*)\s*=\s*(?P<kind>new\s+(?:Map|Set|WeakMap|WeakSet)\s*\(|\[\s*\]|Array\s*\()'
)
for match in collection_decl.finditer(source):
    name = match.group('name')
    ln = line_of(match.start())
    mutations = {
        'set': len(re.findall(rf'\b{re.escape(name)}\s*\.\s*set\s*\(', source)),
        'add': len(re.findall(rf'\b{re.escape(name)}\s*\.\s*add\s*\(', source)),
        'push': len(re.findall(rf'\b{re.escape(name)}\s*\.\s*push\s*\(', source)),
        'unshift': len(re.findall(rf'\b{re.escape(name)}\s*\.\s*unshift\s*\(', source)),
    }
    pruning = {
        'clear': len(re.findall(rf'\b{re.escape(name)}\s*\.\s*clear\s*\(', source)),
        'delete': len(re.findall(rf'\b{re.escape(name)}\s*\.\s*delete\s*\(', source)),
        'splice': len(re.findall(rf'\b{re.escape(name)}\s*\.\s*splice\s*\(', source)),
        'shift': len(re.findall(rf'\b{re.escape(name)}\s*\.\s*shift\s*\(', source)),
        'pop': len(re.findall(rf'\b{re.escape(name)}\s*\.\s*pop\s*\(', source)),
        'length_assign': len(re.findall(rf'\b{re.escape(name)}\s*\.\s*length\s*=\s*', source)),
    }
    mutation_total = sum(mutations.values())
    prune_total = sum(pruning.values())
    if mutation_total or prune_total:
        collections.append({
            'name': name,
            'kind': re.sub(r'\s+', ' ', match.group('kind')).strip(),
            'line': ln,
            'scope': nearest_function(ln),
            'mutations': mutations,
            'pruning': pruning,
            'mutation_total': mutation_total,
            'prune_total': prune_total,
            'limit_mentions': len(re.findall(rf'(?:MAX|LIMIT|CAP|TTL)[A-Z0-9_]*[\s\S]{{0,160}}\b{re.escape(name)}\b|\b{re.escape(name)}\b[\s\S]{{0,160}}(?:MAX|LIMIT|CAP|TTL)', source, flags=re.IGNORECASE)),
        })

query_occurrences = []
for token in ('querySelectorAll(', 'querySelector(', 'getElementsByClassName(', 'getElementsByTagName('):
    for match in re.finditer(re.escape(token), source):
        ln = line_of(match.start())
        query_occurrences.append({'token': token, 'line': ln, 'function': nearest_function(ln)})
query_by_function = Counter(item['function'] for item in query_occurrences)

node_retention = []
for pattern in (
    r'\.nodes\s*=\s*', r'\.node\s*=\s*', r'\.element\s*=\s*', r'\.elements\s*=\s*',
    r'\.frame\s*=\s*', r'\.document\s*=\s*', r'=\s*document\.querySelectorAll',
    r'=\s*\[\.\.\.document\.querySelectorAll', r'=\s*[^;\n]*\.contentDocument'
):
    for match in re.finditer(pattern, source):
        ln = line_of(match.start())
        node_retention.append({'pattern': pattern, 'line': ln, 'function': nearest_function(ln), 'excerpt': excerpt(ln, 4)})

selected_names = [
    'installBackgroundWatcherSupervisor', 'syncBackgroundAutomationWatchers',
    'shouldRunBackgroundAutomationWatchers', 'startSilentQueueWatcher',
    'startBruteApproachTransportWatcher', 'startPostTransportRehookWatcher',
    'stopBackgroundWatcherIntervalsOnly', 'scheduleAutoModeLoopResume', 'runAutoModeLoop',
    'classifyMissionFinderMutations', 'scheduleMissionFinderMutationWork',
    'flushMissionFinderMutationWork', 'invalidateVehicleCheckboxCache',
    'invalidateMissionContextCaches', 'invalidatePatientCountCache', 'invalidateTransportCaches',
    'startMissionFinderRuntimeMemoryMaintenance', 'stopMissionFinderRuntimeMemoryMaintenance',
    'runMissionFinderRuntimeMemoryMaintenance', 'performMissionFinderRuntimeMemorySoftFlush',
    'getMissionFinderRuntimeMemoryBlockReason', 'suspendMissionFinderRuntimeForInactiveFrame',
    'resumeMissionFinderRuntimeFromInactiveFrame', 'removeMissionFinderPanelForClosedMission',
    'cleanupMissionFinderRuntime', 'installMissionFinderRuntimeCleanup',
    'collectMissionFinderRuntimeDiagnosticState', 'renderSelectedTrainedPersonnelPanel',
    'readMissionUpdateRows', 'renderVehicleLoadListNow', 'refreshVehicleRequirementCounters',
    'getSelectedVehicleTrainingCoverageRows', 'startSessionRuntimeTicker', 'stopSessionRuntimeTicker',
    'startMissionEventCollectibleCollector', 'stopMissionEventCollectibleCollector'
]


def extract_function(name: str) -> str:
    match = re.search(rf'(?m)^\s*(?:async\s+)?function\s+{re.escape(name)}\s*\(', source)
    if not match:
        return f'FUNCTION NOT FOUND: {name}\n'
    brace = source.find('{', match.end())
    if brace < 0:
        return f'FUNCTION BODY NOT FOUND: {name}\n'
    depth = 0
    state = 'code'
    quote = ''
    escaped = False
    index = brace
    while index < len(source):
        ch = source[index]
        nxt = source[index + 1] if index + 1 < len(source) else ''
        if state == 'line':
            if ch == '\n': state = 'code'
            index += 1; continue
        if state == 'block':
            if ch == '*' and nxt == '/': state = 'code'; index += 2; continue
            index += 1; continue
        if state == 'string':
            if escaped: escaped = False
            elif ch == '\\': escaped = True
            elif ch == quote: state = 'code'
            index += 1; continue
        if ch == '/' and nxt == '/': state = 'line'; index += 2; continue
        if ch == '/' and nxt == '*': state = 'block'; index += 2; continue
        if ch in ('"', "'", '`'): state = 'string'; quote = ch; index += 1; continue
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: return source[match.start():index + 1] + '\n'
        index += 1
    return f'UNTERMINATED FUNCTION: {name}\n'

function_dump = []
function_presence = {}
for name in selected_names:
    body = extract_function(name)
    function_presence[name] = not body.startswith(('FUNCTION NOT FOUND', 'FUNCTION BODY NOT FOUND', 'UNTERMINATED'))
    function_dump.append(f'===== {name} =====\n{body}')
FUNCTIONS_PATH.write_text('\n\n'.join(function_dump), encoding='utf-8')

suspects = []
for item in intervals:
    if not item['cleared']: suspects.append({'score': 10, 'type': 'interval-without-clear', **item})
for item in untracked_intervals:
    suspects.append({'score': 9, 'type': 'untracked-interval', **item})
for item in observers:
    if not item['disconnected']: suspects.append({'score': 10, 'type': 'observer-without-disconnect', **item})
    if item['body_subtree']: suspects.append({'score': 6, 'type': 'document-wide-subtree-observer', **item})
for item in untracked_observers:
    suspects.append({'score': 10, 'type': 'untracked-observer', **item})
for item in collections:
    if item['mutation_total'] and not item['prune_total'] and not item['limit_mentions']:
        suspects.append({'score': 8, 'type': 'collection-without-static-prune-evidence', **item})
for item in listener_details:
    if item['target'] in ('window', 'document') and item['anonymous'] and not item['removal_pair']:
        suspects.append({'score': 5, 'type': 'anonymous-global-listener', **item})
for name, count in query_by_function.items():
    if count >= 10: suspects.append({'score': min(8, 3 + count // 8), 'type': 'high-dom-query-density', 'function': name, 'query_count': count})
suspects.sort(key=lambda item: (-item['score'], item.get('line', 0), item.get('function', '')))

metadata = re.search(r'(?m)^//\s*@version\s+(\S+)', source)
engine = re.search(r'MODULE 2: MISSION FINDER\s+(\S+)', source)
summary = {
    'line_count': len(lines), 'byte_count': len(source.encode('utf-8')),
    'userscript_version': metadata.group(1) if metadata else None,
    'mission_finder_version': engine.group(1) if engine else None,
    'set_interval_count': len(intervals) + len(untracked_intervals),
    'set_timeout_count': len(timeouts) + len(untracked_timeouts),
    'request_animation_frame_count': len(rafs) + len(untracked_rafs),
    'mutation_observer_count': len(observers) + len(untracked_observers),
    'add_event_listener_count': len(listener_adds),
    'remove_event_listener_count': len(listener_removes),
    'collection_count_with_mutation_or_pruning': len(collections),
    'dom_query_count': len(query_occurrences),
    'node_retention_match_count': len(node_retention),
}
report = {
    'summary': summary, 'intervals': intervals, 'untracked_intervals': untracked_intervals,
    'timeouts': timeouts, 'untracked_timeouts': untracked_timeouts,
    'animation_frames': rafs, 'untracked_animation_frames': untracked_rafs,
    'observers': observers, 'untracked_observers': untracked_observers,
    'listeners': listener_details, 'collections': collections,
    'query_by_function': query_by_function.most_common(), 'node_retention': node_retention,
    'selected_function_presence': function_presence, 'suspects': suspects,
}
JSON_PATH.write_text(json.dumps(report, indent=2, sort_keys=True), encoding='utf-8')

md = ['# MissionChief Command Nexus runtime-memory audit', '',
      'Linear static audit of the exact current branch source. Heuristic findings are evidence leads, not automatic proof of a leak.', '',
      '## Source baseline']
for key, value in summary.items(): md.append(f'- **{key.replace("_", " ")}**: `{value}`')
md += ['', '## Highest-signal suspects']
for item in suspects[:80]:
    details = ', '.join(f'{key}={item[key]}' for key in ('handle','function','line','name','kind','target','event','query_count') if key in item)
    md.append(f'- **score {item["score"]} — {item["type"]}**: {details}')
md += ['', '## Timer ownership', f'- Tracked intervals: {len(intervals)}; untracked intervals: {len(untracked_intervals)}']
for item in intervals: md.append(f'  - `{item["handle"]}` line {item["line"]} near `{item["function"]}`; clear found: **{item["cleared"]}**')
for item in untracked_intervals: md.append(f'  - untracked interval line {item["line"]} near `{item["function"]}`')
md.append(f'- Tracked timeouts: {len(timeouts)}; untracked timeouts: {len(untracked_timeouts)}')
for item in timeouts: md.append(f'  - `{item["handle"]}` line {item["line"]} near `{item["function"]}`; clear found: **{item["cleared"]}**')
md.append(f'- Tracked RAFs: {len(rafs)}; untracked RAFs: {len(untracked_rafs)}')
md += ['', '## MutationObserver ownership']
for item in observers: md.append(f'- `{item["handle"]}` line {item["line"]} near `{item["function"]}`; disconnect: **{item["disconnected"]}**; document subtree: **{item["body_subtree"]}**')
for item in untracked_observers: md.append(f'- untracked observer line {item["line"]} near `{item["function"]}`')
md += ['', '## Collections']
for item in sorted(collections, key=lambda entry: (-entry['mutation_total'], entry['line'])):
    md.append(f'- `{item["name"]}` `{item["kind"]}` line {item["line"]}: mutations={item["mutation_total"]}, pruning={item["prune_total"]}, limit mentions={item["limit_mentions"]}')
md += ['', '## DOM query density']
for name, count in query_by_function.most_common(50): md.append(f'- `{name}`: {count}')
md += ['', '## Potential DOM retention assignments']
for item in node_retention[:120]: md.append(f'- line {item["line"]} near `{item["function"]}` pattern `{item["pattern"]}`')
md += ['', '## Supporting extracts', f'- `{FUNCTIONS_PATH}`', f'- `{JSON_PATH}`']
MD_PATH.write_text('\n'.join(md) + '\n', encoding='utf-8')
print(json.dumps(summary, indent=2))
