#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

SOURCE_PATH = Path('src/missionchief-command-nexus.user.js')
OUT_DIR = Path('.github/diagnostics')
MD_PATH = OUT_DIR / 'runtime-memory-audit-v1082.md'
JSON_PATH = OUT_DIR / 'runtime-memory-audit-v1082.json'
FUNCTIONS_PATH = OUT_DIR / 'runtime-memory-functions-v1082.txt'

source = SOURCE_PATH.read_text(encoding='utf-8')
lines = source.splitlines()
OUT_DIR.mkdir(parents=True, exist_ok=True)


def line_of(offset: int) -> int:
    return source.count('\n', 0, max(0, offset)) + 1


def line_excerpt(line_number: int, radius: int = 4) -> str:
    start = max(1, line_number - radius)
    end = min(len(lines), line_number + radius)
    return '\n'.join(f'{idx:05d}: {lines[idx - 1]}' for idx in range(start, end + 1))


def find_matching_brace(open_index: int) -> int:
    depth = 0
    state = 'code'
    quote = ''
    escaped = False
    template_expr_depth = 0
    index = open_index
    while index < len(source):
        ch = source[index]
        nxt = source[index + 1] if index + 1 < len(source) else ''
        if state == 'line_comment':
            if ch == '\n':
                state = 'code'
            index += 1
            continue
        if state == 'block_comment':
            if ch == '*' and nxt == '/':
                state = 'code'
                index += 2
                continue
            index += 1
            continue
        if state == 'string':
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                state = 'code'
                quote = ''
            index += 1
            continue
        if state == 'template':
            if escaped:
                escaped = False
                index += 1
                continue
            if ch == '\\':
                escaped = True
                index += 1
                continue
            if ch == '`' and template_expr_depth == 0:
                state = 'code'
                index += 1
                continue
            if ch == '$' and nxt == '{':
                template_expr_depth += 1
                depth += 1
                index += 2
                continue
            if ch == '}' and template_expr_depth > 0:
                template_expr_depth -= 1
                depth -= 1
                index += 1
                continue
            index += 1
            continue
        if ch == '/' and nxt == '/':
            state = 'line_comment'
            index += 2
            continue
        if ch == '/' and nxt == '*':
            state = 'block_comment'
            index += 2
            continue
        if ch in ('"', "'"):
            state = 'string'
            quote = ch
            index += 1
            continue
        if ch == '`':
            state = 'template'
            template_expr_depth = 0
            index += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return index
        index += 1
    return -1


function_candidates: list[tuple[str, int, int]] = []
patterns = [
    re.compile(r'(?m)^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\('),
    re.compile(r'(?m)^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^\n]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{'),
]
for pattern in patterns:
    for match in pattern.finditer(source):
        brace = source.find('{', match.end() - 1)
        if brace < 0:
            continue
        close = find_matching_brace(brace)
        if close > brace:
            function_candidates.append((match.group(1), match.start(), close + 1))
function_candidates.sort(key=lambda item: (item[1], item[2] - item[1]))


def containing_function(offset: int) -> str:
    candidates = [item for item in function_candidates if item[1] <= offset < item[2]]
    if not candidates:
        return '<module scope>'
    return min(candidates, key=lambda item: item[2] - item[1])[0]


def function_body(name: str) -> str:
    matches = [item for item in function_candidates if item[0] == name]
    if not matches:
        return f'FUNCTION NOT FOUND: {name}\n'
    item = min(matches, key=lambda entry: entry[2] - entry[1])
    return source[item[1]:item[2]] + '\n'


def call_occurrences(token: str) -> list[dict]:
    items = []
    for match in re.finditer(re.escape(token), source):
        ln = line_of(match.start())
        items.append({
            'line': ln,
            'function': containing_function(match.start()),
            'excerpt': line_excerpt(ln, 5),
        })
    return items


def assignments_for(call_name: str) -> list[dict]:
    results = []
    pattern = re.compile(
        rf'(?P<lhs>(?:[A-Za-z_$][\w$]*\.)?[A-Za-z_$][\w$]*)\s*=\s*{re.escape(call_name)}\s*\(',
        re.MULTILINE,
    )
    assigned_offsets = set()
    for match in pattern.finditer(source):
        assigned_offsets.add(source.find(call_name, match.start(), match.end()))
        handle = match.group('lhs')
        clear_name = {
            'setInterval': 'clearInterval',
            'setTimeout': 'clearTimeout',
            'requestAnimationFrame': 'cancelAnimationFrame',
        }.get(call_name, '')
        clear_regex = re.compile(rf'{re.escape(clear_name)}\s*\(\s*{re.escape(handle)}\s*\)') if clear_name else None
        results.append({
            'handle': handle,
            'line': line_of(match.start()),
            'function': containing_function(match.start()),
            'cleared': bool(clear_regex.search(source)) if clear_regex else None,
            'clear_call': clear_name,
            'excerpt': line_excerpt(line_of(match.start()), 5),
        })
    untracked = []
    for match in re.finditer(rf'{re.escape(call_name)}\s*\(', source):
        if match.start() in assigned_offsets:
            continue
        prefix = source[max(0, match.start() - 160):match.start()]
        if re.search(r'(?:return\s+|:\s*|\(\s*)$', prefix):
            pass
        untracked.append({
            'line': line_of(match.start()),
            'function': containing_function(match.start()),
            'excerpt': line_excerpt(line_of(match.start()), 5),
        })
    return results, untracked


intervals, untracked_intervals = assignments_for('setInterval')
timeouts, untracked_timeouts = assignments_for('setTimeout')
rafs, untracked_rafs = assignments_for('requestAnimationFrame')

observer_pattern = re.compile(
    r'(?P<lhs>(?:[A-Za-z_$][\w$]*\.)?[A-Za-z_$][\w$]*)\s*=\s*new\s+MutationObserver\s*\(',
    re.MULTILINE,
)
observers = []
assigned_observer_offsets = set()
for match in observer_pattern.finditer(source):
    assigned_observer_offsets.add(source.find('new MutationObserver', match.start(), match.end()))
    handle = match.group('lhs')
    observers.append({
        'handle': handle,
        'line': line_of(match.start()),
        'function': containing_function(match.start()),
        'disconnected': bool(re.search(rf'{re.escape(handle)}\s*\.\s*disconnect\s*\(', source)),
        'body_subtree': bool(re.search(rf'{re.escape(handle)}\s*\.\s*observe\s*\(\s*document\.(?:body|documentElement)[\s\S]{{0,240}}subtree\s*:\s*true', source)),
        'excerpt': line_excerpt(line_of(match.start()), 7),
    })
untracked_observers = []
for match in re.finditer(r'new\s+MutationObserver\s*\(', source):
    if match.start() in assigned_observer_offsets:
        continue
    untracked_observers.append({
        'line': line_of(match.start()),
        'function': containing_function(match.start()),
        'excerpt': line_excerpt(line_of(match.start()), 7),
    })

listener_pattern = re.compile(
    r'(?P<target>(?:window|document|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?))\s*\.\s*addEventListener\s*\(\s*[\'\"](?P<event>[^\'\"]+)[\'\"]\s*,\s*(?P<handler>[^,\n\)]+)',
    re.MULTILINE,
)
listeners = []
for match in listener_pattern.finditer(source):
    target = match.group('target').strip()
    event = match.group('event').strip()
    handler = match.group('handler').strip()
    removable = bool(re.search(
        rf'{re.escape(target)}\s*\.\s*removeEventListener\s*\(\s*[\'\"]{re.escape(event)}[\'\"]\s*,\s*{re.escape(handler)}',
        source,
    ))
    anonymous = handler.startswith(('function', '(', 'async', 'event =>', 'e =>')) or '=>' in handler
    listeners.append({
        'target': target,
        'event': event,
        'handler': handler[:120],
        'line': line_of(match.start()),
        'function': containing_function(match.start()),
        'removable_pair_found': removable,
        'anonymous': anonymous,
    })

collection_pattern = re.compile(
    r'(?m)^\s*(?:const|let|var)\s+(?P<name>[A-Za-z_$][\w$]*)\s*=\s*(?P<kind>new\s+(?:Map|Set|WeakMap|WeakSet)\s*\(|\[\s*\]|Array\s*\(|Object\.create\s*\(|\{\s*\})'
)
collections = []
for match in collection_pattern.finditer(source):
    name = match.group('name')
    kind = re.sub(r'\s+', ' ', match.group('kind')).strip()
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
    if mutation_total == 0 and prune_total == 0:
        continue
    declaration_function = containing_function(match.start())
    collections.append({
        'name': name,
        'kind': kind,
        'line': line_of(match.start()),
        'scope': declaration_function,
        'mutations': mutations,
        'pruning': pruning,
        'mutation_total': mutation_total,
        'prune_total': prune_total,
        'limit_mentions': len(re.findall(rf'(?:MAX|LIMIT|CAP|TTL)[A-Z0-9_]*[\s\S]{{0,180}}\b{re.escape(name)}\b|\b{re.escape(name)}\b[\s\S]{{0,180}}(?:MAX|LIMIT|CAP|TTL)', source, flags=re.IGNORECASE)),
    })

query_calls = []
for token in ('querySelectorAll(', 'querySelector(', 'getElementsByClassName(', 'getElementsByTagName('):
    for item in call_occurrences(token):
        query_calls.append({'token': token, **item})
query_by_function = Counter(item['function'] for item in query_calls)

inner_html_assignments = []
for match in re.finditer(r'\.innerHTML\s*(?:\+?=)', source):
    inner_html_assignments.append({
        'line': line_of(match.start()),
        'function': containing_function(match.start()),
        'excerpt': line_excerpt(line_of(match.start()), 3),
    })

node_retention_patterns = [
    r'\.nodes\s*=\s*',
    r'\.node\s*=\s*',
    r'\.element\s*=\s*',
    r'\.elements\s*=\s*',
    r'\.frame\s*=\s*',
    r'\.document\s*=\s*',
    r'=\s*\[\.\.\.document\.querySelectorAll',
    r'=\s*document\.querySelectorAll',
    r'=\s*[^;\n]*\.contentDocument',
]
node_retention = []
for pattern in node_retention_patterns:
    for match in re.finditer(pattern, source):
        node_retention.append({
            'pattern': pattern,
            'line': line_of(match.start()),
            'function': containing_function(match.start()),
            'excerpt': line_excerpt(line_of(match.start()), 4),
        })

recursive_timeout_functions = []
for name, start, end in function_candidates:
    body = source[start:end]
    if 'setTimeout' in body and re.search(rf'\b{re.escape(name)}\s*\(', body[body.find('{') + 1:]):
        recursive_timeout_functions.append({
            'function': name,
            'line': line_of(start),
            'has_guard': bool(re.search(r'if\s*\([^\)]*(?:Timer|Running|Active|Scheduled|Pending)', body)),
        })

selected_functions = [
    'installBackgroundWatcherSupervisor',
    'syncBackgroundAutomationWatchers',
    'shouldRunBackgroundAutomationWatchers',
    'startSilentQueueWatcher',
    'startBruteApproachTransportWatcher',
    'startPostTransportRehookWatcher',
    'stopBackgroundWatcherIntervalsOnly',
    'scheduleAutoModeLoopResume',
    'runAutoModeLoop',
    'classifyMissionFinderMutations',
    'scheduleMissionFinderMutationWork',
    'flushMissionFinderMutationWork',
    'invalidateVehicleCheckboxCache',
    'invalidateMissionContextCaches',
    'invalidatePatientCountCache',
    'invalidateTransportCaches',
    'startMissionFinderRuntimeMemoryMaintenance',
    'stopMissionFinderRuntimeMemoryMaintenance',
    'runMissionFinderRuntimeMemoryMaintenance',
    'performMissionFinderRuntimeMemorySoftFlush',
    'getMissionFinderRuntimeMemoryBlockReason',
    'suspendMissionFinderRuntimeForInactiveFrame',
    'resumeMissionFinderRuntimeFromInactiveFrame',
    'removeMissionFinderPanelForClosedMission',
    'cleanupMissionFinderRuntime',
    'installMissionFinderRuntimeCleanup',
    'collectMissionFinderRuntimeDiagnosticState',
    'renderSelectedTrainedPersonnelPanel',
    'readMissionUpdateRows',
    'renderVehicleLoadListNow',
    'refreshVehicleRequirementCounters',
    'getSelectedVehicleTrainingCoverageRows',
    'startSessionRuntimeTicker',
    'stopSessionRuntimeTicker',
    'startMissionEventCollectibleCollector',
    'stopMissionEventCollectibleCollector',
]
function_dump_parts = []
function_presence = {}
for name in selected_functions:
    body = function_body(name)
    function_presence[name] = not body.startswith('FUNCTION NOT FOUND')
    function_dump_parts.append(f'===== {name} =====\n{body}')
FUNCTIONS_PATH.write_text('\n\n'.join(function_dump_parts), encoding='utf-8')

suspects = []
for item in intervals:
    if not item['cleared']:
        suspects.append({'score': 9, 'type': 'interval-without-clear', **item})
for item in untracked_intervals:
    suspects.append({'score': 8, 'type': 'untracked-interval', **item})
for item in observers:
    if not item['disconnected']:
        suspects.append({'score': 10, 'type': 'observer-without-disconnect', **item})
    if item['body_subtree']:
        suspects.append({'score': 5, 'type': 'document-wide-subtree-observer', **item})
for item in untracked_observers:
    suspects.append({'score': 10, 'type': 'untracked-observer', **item})
for item in collections:
    if item['scope'] == '<module scope>' and item['mutation_total'] > 0 and item['prune_total'] == 0 and item['limit_mentions'] == 0:
        suspects.append({'score': 8, 'type': 'unbounded-module-collection', **item})
for item in listeners:
    if item['anonymous'] and not item['removable_pair_found'] and item['target'] in ('window', 'document'):
        suspects.append({'score': 4, 'type': 'anonymous-global-listener', **item})
for item in recursive_timeout_functions:
    if not item['has_guard']:
        suspects.append({'score': 5, 'type': 'recursive-timeout-without-obvious-guard', **item})
for function_name, count in query_by_function.items():
    if count >= 10:
        suspects.append({'score': min(8, 3 + count // 8), 'type': 'high-dom-query-density', 'function': function_name, 'query_count': count})

suspects.sort(key=lambda item: (-item['score'], item.get('line', 0), item.get('function', '')))

metadata_version = re.search(r'(?m)^//\s*@version\s+([^\s]+)', source)
mission_finder_version = re.search(r'MODULE 2: MISSION FINDER\s+([^\s*]+)', source)
summary = {
    'source_path': str(SOURCE_PATH),
    'line_count': len(lines),
    'byte_count': len(source.encode('utf-8')),
    'userscript_version': metadata_version.group(1) if metadata_version else None,
    'mission_finder_version': mission_finder_version.group(1) if mission_finder_version else None,
    'function_count': len(function_candidates),
    'set_interval_count': len(call_occurrences('setInterval(')),
    'set_timeout_count': len(call_occurrences('setTimeout(')),
    'request_animation_frame_count': len(call_occurrences('requestAnimationFrame(')),
    'mutation_observer_count': len(call_occurrences('new MutationObserver(')),
    'add_event_listener_count': len(call_occurrences('addEventListener(')),
    'remove_event_listener_count': len(call_occurrences('removeEventListener(')),
    'query_call_count': len(query_calls),
    'inner_html_assignment_count': len(inner_html_assignments),
    'node_retention_match_count': len(node_retention),
}

report = {
    'summary': summary,
    'intervals': intervals,
    'untracked_intervals': untracked_intervals,
    'timeouts': timeouts,
    'untracked_timeouts': untracked_timeouts,
    'animation_frames': rafs,
    'untracked_animation_frames': untracked_rafs,
    'observers': observers,
    'untracked_observers': untracked_observers,
    'listeners': listeners,
    'collections': collections,
    'query_by_function': query_by_function.most_common(),
    'inner_html_assignments': inner_html_assignments,
    'node_retention': node_retention,
    'recursive_timeout_functions': recursive_timeout_functions,
    'selected_function_presence': function_presence,
    'suspects': suspects,
}
JSON_PATH.write_text(json.dumps(report, indent=2, sort_keys=True), encoding='utf-8')

md = []
md.append('# MissionChief Command Nexus runtime-memory audit')
md.append('')
md.append('Static deep-dive generated from the current branch source. This report intentionally over-collects possible retention and churn paths; findings still require engineering interpretation.')
md.append('')
md.append('## Source baseline')
for key, value in summary.items():
    md.append(f'- **{key.replace("_", " ")}**: `{value}`')
md.append('')
md.append('## Highest-signal suspects')
if suspects:
    for item in suspects[:60]:
        details = []
        for key in ('handle', 'function', 'line', 'name', 'kind', 'event', 'target', 'query_count'):
            if key in item:
                details.append(f'{key}={item[key]}')
        md.append(f'- **score {item["score"]} — {item["type"]}**: ' + ', '.join(details))
else:
    md.append('- No heuristic suspects found.')
md.append('')
md.append('## Timer ownership')
md.append(f'- Tracked intervals: {len(intervals)}; untracked interval calls: {len(untracked_intervals)}')
for item in intervals:
    md.append(f'  - `{item["handle"]}` at line {item["line"]} in `{item["function"]}` — clear found: **{item["cleared"]}**')
for item in untracked_intervals:
    md.append(f'  - **untracked** interval at line {item["line"]} in `{item["function"]}`')
md.append(f'- Tracked timeouts: {len(timeouts)}; untracked timeout calls: {len(untracked_timeouts)}')
for item in timeouts:
    md.append(f'  - `{item["handle"]}` at line {item["line"]} in `{item["function"]}` — clear found: **{item["cleared"]}**')
md.append(f'- Tracked animation frames: {len(rafs)}; untracked RAF calls: {len(untracked_rafs)}')
for item in rafs:
    md.append(f'  - `{item["handle"]}` at line {item["line"]} in `{item["function"]}` — cancel found: **{item["cleared"]}**')
md.append('')
md.append('## MutationObserver ownership')
for item in observers:
    md.append(f'- `{item["handle"]}` at line {item["line"]} in `{item["function"]}` — disconnect found: **{item["disconnected"]}**; document-wide subtree: **{item["body_subtree"]}**')
for item in untracked_observers:
    md.append(f'- **untracked observer** at line {item["line"]} in `{item["function"]}`')
md.append('')
md.append('## Module and function collections')
for item in sorted(collections, key=lambda entry: (-entry['mutation_total'], entry['line'])):
    md.append(
        f'- `{item["name"]}` ({item["kind"]}) line {item["line"]}, scope `{item["scope"]}` — '
        f'mutations={item["mutation_total"]}, pruning={item["prune_total"]}, limit mentions={item["limit_mentions"]}'
    )
md.append('')
md.append('## DOM query density')
for name, count in query_by_function.most_common(40):
    md.append(f'- `{name}`: {count} DOM query calls')
md.append('')
md.append('## Global event listeners without obvious removal pairs')
for item in listeners:
    if item['target'] in ('window', 'document') and not item['removable_pair_found']:
        md.append(f'- line {item["line"]}: `{item["target"]}.{item["event"]}` handler `{item["handler"]}` in `{item["function"]}`; anonymous={item["anonymous"]}')
md.append('')
md.append('## Potential DOM-node retention assignments')
for item in node_retention[:100]:
    md.append(f'- line {item["line"]} in `{item["function"]}` pattern `{item["pattern"]}`')
md.append('')
md.append('## Recursive timeout functions')
for item in recursive_timeout_functions:
    md.append(f'- `{item["function"]}` line {item["line"]}; obvious guard={item["has_guard"]}')
md.append('')
md.append('## Extracted function bodies')
md.append(f'- See `{FUNCTIONS_PATH}` for the lifecycle, Auto Mode, observer, cache, render and memory-maintenance functions used for manual review.')
md.append(f'- Machine-readable data: `{JSON_PATH}`.')
MD_PATH.write_text('\n'.join(md) + '\n', encoding='utf-8')

print(json.dumps(summary, indent=2))
print(f'Wrote {MD_PATH}')
print(f'Wrote {JSON_PATH}')
print(f'Wrote {FUNCTIONS_PATH}')
