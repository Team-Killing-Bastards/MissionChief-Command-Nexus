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

text = SOURCE_PATH.read_text(encoding='utf-8')
lines = text.splitlines()
OUT_DIR.mkdir(parents=True, exist_ok=True)

function_starts = []
current_function = '<module scope>'
line_function = {}
for n, line in enumerate(lines, 1):
    match = re.search(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(', line)
    if not match:
        match = re.search(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=.*=>', line)
    if match:
        current_function = match.group(1)
        function_starts.append((n, current_function))
    line_function[n] = current_function


def ctx(n: int, radius: int = 4) -> str:
    start = max(1, n - radius)
    end = min(len(lines), n + radius)
    return '\n'.join(f'{i:05d}: {lines[i - 1]}' for i in range(start, end + 1))

handles = {
    'interval': {},
    'timeout': {},
    'raf': {},
    'observer': {},
}
untracked = defaultdict(list)
clear_seen = defaultdict(set)
collections = {}
collection_ops = defaultdict(Counter)
listeners = []
listener_removals = set()
query_by_function = Counter()
node_retention = []
inner_html_by_function = Counter()

assign_patterns = {
    'interval': re.compile(r'(?P<h>(?:[A-Za-z_$][\w$]*\.)?[A-Za-z_$][\w$]*)\s*=\s*setInterval\s*\('),
    'timeout': re.compile(r'(?P<h>(?:[A-Za-z_$][\w$]*\.)?[A-Za-z_$][\w$]*)\s*=\s*setTimeout\s*\('),
    'raf': re.compile(r'(?P<h>(?:[A-Za-z_$][\w$]*\.)?[A-Za-z_$][\w$]*)\s*=\s*requestAnimationFrame\s*\('),
    'observer': re.compile(r'(?P<h>(?:[A-Za-z_$][\w$]*\.)?[A-Za-z_$][\w$]*)\s*=\s*new\s+MutationObserver\s*\('),
}
call_tokens = {
    'interval': 'setInterval(',
    'timeout': 'setTimeout(',
    'raf': 'requestAnimationFrame(',
    'observer': 'new MutationObserver(',
}
clear_patterns = {
    'interval': re.compile(r'clearInterval\s*\(\s*(?P<h>(?:[A-Za-z_$][\w$]*\.)?[A-Za-z_$][\w$]*)\s*\)'),
    'timeout': re.compile(r'clearTimeout\s*\(\s*(?P<h>(?:[A-Za-z_$][\w$]*\.)?[A-Za-z_$][\w$]*)\s*\)'),
    'raf': re.compile(r'cancelAnimationFrame\s*\(\s*(?P<h>(?:[A-Za-z_$][\w$]*\.)?[A-Za-z_$][\w$]*)\s*\)'),
    'observer': re.compile(r'(?P<h>(?:[A-Za-z_$][\w$]*\.)?[A-Za-z_$][\w$]*)\s*\.\s*disconnect\s*\('),
}
collection_decl = re.compile(r'\b(?:const|let|var)\s+(?P<name>[A-Za-z_$][\w$]*)\s*=\s*(?P<kind>new\s+(?:Map|Set|WeakMap|WeakSet)\s*\(|\[\s*\]|Array\s*\()')
collection_method = re.compile(r'\b(?P<name>[A-Za-z_$][\w$]*)\s*\.\s*(?P<method>set|add|push|unshift|clear|delete|splice|shift|pop)\s*\(')
length_assign = re.compile(r'\b(?P<name>[A-Za-z_$][\w$]*)\s*\.\s*length\s*=')
listener_add = re.compile(r'(?P<target>window|document|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*\.\s*addEventListener\s*\(\s*[\'\"](?P<event>[^\'\"]+)[\'\"]\s*,\s*(?P<handler>[^,\n\)]+)')
listener_remove = re.compile(r'(?P<target>window|document|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*\.\s*removeEventListener\s*\(\s*[\'\"](?P<event>[^\'\"]+)[\'\"]\s*,\s*(?P<handler>[^,\n\)]+)')

for n, line in enumerate(lines, 1):
    function = line_function[n]
    for kind, pattern in assign_patterns.items():
        match = pattern.search(line)
        if match:
            handles[kind][match.group('h')] = {'handle': match.group('h'), 'line': n, 'function': function, 'excerpt': ctx(n, 5)}
        elif call_tokens[kind] in line:
            untracked[kind].append({'line': n, 'function': function, 'excerpt': ctx(n, 5)})
    for kind, pattern in clear_patterns.items():
        for match in pattern.finditer(line):
            clear_seen[kind].add(match.group('h'))
    decl = collection_decl.search(line)
    if decl:
        collections[decl.group('name')] = {'name': decl.group('name'), 'kind': decl.group('kind'), 'line': n, 'scope': function}
    for match in collection_method.finditer(line):
        collection_ops[match.group('name')][match.group('method')] += 1
    for match in length_assign.finditer(line):
        collection_ops[match.group('name')]['length_assign'] += 1
    for match in listener_remove.finditer(line):
        listener_removals.add((match.group('target'), match.group('event'), match.group('handler').strip()))
    for match in listener_add.finditer(line):
        handler = match.group('handler').strip()
        listeners.append({
            'target': match.group('target'), 'event': match.group('event'), 'handler': handler[:120],
            'line': n, 'function': function,
            'anonymous': '=>' in handler or handler.startswith(('function', '(', 'async ')),
        })
    for token in ('querySelectorAll(', 'querySelector(', 'getElementsByClassName(', 'getElementsByTagName('):
        query_by_function[function] += line.count(token)
    if '.innerHTML' in line and '=' in line:
        inner_html_by_function[function] += 1
    for pattern in ('\.nodes\\s*=', '\.node\\s*=', '\.element\\s*=', '\.elements\\s*=', '\.frame\\s*=', '\.document\\s*=', 'contentDocument', 'document.querySelectorAll'):
        if re.search(pattern, line):
            node_retention.append({'pattern': pattern, 'line': n, 'function': function, 'excerpt': ctx(n, 4)})

for kind in handles:
    for handle, item in handles[kind].items():
        item['cleanup_found'] = handle in clear_seen[kind]
        if kind == 'observer':
            window = '\n'.join(lines[item['line'] - 1:min(len(lines), item['line'] + 80)])
            item['document_subtree'] = bool(re.search(r'observe\s*\(\s*document\.(?:body|documentElement)[\s\S]*?subtree\s*:\s*true', window))

collection_rows = []
for name, decl in collections.items():
    ops = collection_ops.get(name, Counter())
    mutations = sum(ops[key] for key in ('set','add','push','unshift'))
    pruning = sum(ops[key] for key in ('clear','delete','splice','shift','pop','length_assign'))
    if mutations or pruning:
        collection_rows.append({**decl, 'ops': dict(ops), 'mutations': mutations, 'pruning': pruning})

for item in listeners:
    item['removal_pair'] = (item['target'], item['event'], item['handler']) in listener_removals

selected_names = [
    'installBackgroundWatcherSupervisor','syncBackgroundAutomationWatchers','shouldRunBackgroundAutomationWatchers',
    'startSilentQueueWatcher','startBruteApproachTransportWatcher','startPostTransportRehookWatcher','stopBackgroundWatcherIntervalsOnly',
    'scheduleAutoModeLoopResume','runAutoModeLoop','classifyMissionFinderMutations','scheduleMissionFinderMutationWork',
    'flushMissionFinderMutationWork','startMissionFinderRuntimeMemoryMaintenance','runMissionFinderRuntimeMemoryMaintenance',
    'performMissionFinderRuntimeMemorySoftFlush','getMissionFinderRuntimeMemoryBlockReason','suspendMissionFinderRuntimeForInactiveFrame',
    'resumeMissionFinderRuntimeFromInactiveFrame','removeMissionFinderPanelForClosedMission','cleanupMissionFinderRuntime',
    'renderSelectedTrainedPersonnelPanel','getLiveMissionTrainedPersonnelRequirementsForDisplay','readMissionUpdateRows',
    'renderVehicleLoadListNow','refreshVehicleRequirementCounters'
]
start_lookup = defaultdict(list)
for n, name in function_starts:
    start_lookup[name].append(n)
function_parts = []
for name in selected_names:
    starts = start_lookup.get(name, [])
    if not starts:
        function_parts.append(f'===== {name} =====\nFUNCTION NOT FOUND\n')
        continue
    n = starts[0]
    end = min(len(lines), n + 220)
    function_parts.append(f'===== {name} (window lines {n}-{end}) =====\n' + '\n'.join(f'{i:05d}: {lines[i-1]}' for i in range(n, end + 1)))
FUNCTIONS_PATH.write_text('\n\n'.join(function_parts) + '\n', encoding='utf-8')

suspects = []
for kind, entries in handles.items():
    for item in entries.values():
        if not item['cleanup_found']:
            suspects.append({'score': 10, 'type': f'{kind}-without-cleanup', **item})
        if kind == 'observer' and item.get('document_subtree'):
            suspects.append({'score': 6, 'type': 'document-wide-subtree-observer', **item})
for kind, entries in untracked.items():
    for item in entries:
        suspects.append({'score': 9 if kind in ('interval','observer') else 4, 'type': f'untracked-{kind}', **item})
for row in collection_rows:
    if row['mutations'] and not row['pruning']:
        suspects.append({'score': 7, 'type': 'collection-without-prune-call', **row})
for item in listeners:
    if item['target'] in ('window','document') and item['anonymous'] and not item['removal_pair']:
        suspects.append({'score': 5, 'type': 'anonymous-global-listener', **item})
for name, count in query_by_function.items():
    if count >= 10:
        suspects.append({'score': min(8, 3 + count // 8), 'type': 'high-dom-query-density', 'function': name, 'query_count': count})
for name, count in inner_html_by_function.items():
    if count >= 4:
        suspects.append({'score': 4, 'type': 'high-innerhtml-density', 'function': name, 'innerhtml_count': count})
suspects.sort(key=lambda x: (-x['score'], x.get('line', 0), x.get('function', '')))

version = re.search(r'(?m)^//\s*@version\s+(\S+)', text)
engine = re.search(r'MODULE 2: MISSION FINDER\s+(\S+)', text)
summary = {
    'line_count': len(lines), 'byte_count': len(text.encode('utf-8')),
    'userscript_version': version.group(1) if version else None,
    'mission_finder_version': engine.group(1) if engine else None,
    'interval_count': len(handles['interval']) + len(untracked['interval']),
    'timeout_count': len(handles['timeout']) + len(untracked['timeout']),
    'raf_count': len(handles['raf']) + len(untracked['raf']),
    'observer_count': len(handles['observer']) + len(untracked['observer']),
    'listener_add_count': len(listeners), 'listener_remove_tuple_count': len(listener_removals),
    'collection_rows': len(collection_rows), 'dom_query_count': sum(query_by_function.values()),
    'node_retention_matches': len(node_retention),
}
report = {
    'summary': summary, 'handles': handles, 'untracked': dict(untracked), 'collections': collection_rows,
    'listeners': listeners, 'query_by_function': query_by_function.most_common(),
    'inner_html_by_function': inner_html_by_function.most_common(), 'node_retention': node_retention,
    'suspects': suspects,
}
JSON_PATH.write_text(json.dumps(report, indent=2, sort_keys=True), encoding='utf-8')

md = ['# MissionChief Command Nexus runtime-memory audit','',
      'Single-pass static inventory of the exact current branch. Scores identify investigation leads, not automatic proof.','',
      '## Baseline']
for key, value in summary.items(): md.append(f'- **{key.replace("_"," ")}**: `{value}`')
md += ['','## Highest-signal leads']
for item in suspects[:100]:
    detail = ', '.join(f'{key}={item[key]}' for key in ('handle','function','line','name','kind','target','event','query_count','innerhtml_count') if key in item)
    md.append(f'- **{item["score"]} · {item["type"]}** — {detail}')
md += ['','## Timers and observers']
for kind in ('interval','timeout','raf','observer'):
    md.append(f'### {kind}')
    for item in handles[kind].values():
        md.append(f'- `{item["handle"]}` line {item["line"]} near `{item["function"]}`; cleanup={item["cleanup_found"]}' + (f'; document subtree={item.get("document_subtree")}' if kind == 'observer' else ''))
    for item in untracked[kind]: md.append(f'- untracked line {item["line"]} near `{item["function"]}`')
md += ['','## Collections']
for row in sorted(collection_rows, key=lambda r: (-r['mutations'], r['line'])):
    md.append(f'- `{row["name"]}` line {row["line"]} `{row["kind"]}` mutations={row["mutations"]}, pruning={row["pruning"]}, ops={row["ops"]}')
md += ['','## DOM query density']
for name, count in query_by_function.most_common(60): md.append(f'- `{name}`: {count}')
md += ['','## innerHTML density']
for name, count in inner_html_by_function.most_common(40): md.append(f'- `{name}`: {count}')
md += ['','## Potential node retention']
for item in node_retention[:160]: md.append(f'- line {item["line"]} near `{item["function"]}` pattern `{item["pattern"]}`')
md += ['','## Supporting files',f'- `{JSON_PATH}`',f'- `{FUNCTIONS_PATH}`']
MD_PATH.write_text('\n'.join(md) + '\n', encoding='utf-8')
print(json.dumps(summary, indent=2))
