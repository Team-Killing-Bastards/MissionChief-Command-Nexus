#!/usr/bin/env python3
from pathlib import Path

builder_path = Path('.github/builders/apply-runtime-memory-deep-dive-v1082.py')
builder = builder_path.read_text(encoding='utf-8')

cache_old = '''# Shared document topology cache lives longer; explicit invalidation/force refresh remains available.
source = replace_once(
    source,
    'expiresAt: now + 500,\\n            documents',
    'expiresAt: now + 5000,\\n            documents',
    'mission document cache lifetime',
)
'''
cache_new = '''# Shared Mission Finder document topology cache lives longer; explicit invalidation/force refresh remains available.
document_cache_start, document_cache_end = function_span(
    source,
    'getMissionAccessibleDocuments'
)
document_cache_body = source[
    document_cache_start:document_cache_end
]
document_cache_body = replace_once(
    document_cache_body,
    'expiresAt: now + 500,\\n            documents',
    'expiresAt: now + 5000,\\n            documents',
    'mission document cache lifetime',
)
source = (
    source[:document_cache_start] +
    document_cache_body +
    source[document_cache_end:]
)
'''

cleanup_old = '''source = replace_once(
    source,
    '''        stopSessionRuntimeTicker();
        stopMissionFinderRuntimeMemoryMaintenance();
        removeMissionFinderRuntimeMemoryActivityTracking();''',
    '''        stopSessionRuntimeTicker();
        stopMissionFinderRuntimeMemoryMaintenance();
        cancelTrainedPersonnelPanelRefresh();
        removeMissionFinderRuntimeMemoryActivityTracking();''',
    'inactive frame trained refresh cleanup',
)
'''
cleanup_new = '''inactive_start, inactive_end = function_span(
    source,
    'suspendMissionFinderRuntimeForInactiveFrame'
)
inactive_body = source[inactive_start:inactive_end]
inactive_body = replace_once(
    inactive_body,
    '''        stopSessionRuntimeTicker();
        stopMissionFinderRuntimeMemoryMaintenance();
        removeMissionFinderRuntimeMemoryActivityTracking();''',
    '''        stopSessionRuntimeTicker();
        stopMissionFinderRuntimeMemoryMaintenance();
        cancelTrainedPersonnelPanelRefresh();
        removeMissionFinderRuntimeMemoryActivityTracking();''',
    'inactive frame trained refresh cleanup',
)
source = source[:inactive_start] + inactive_body + source[inactive_end:]
'''

for label, old, new in (
    ('cache', cache_old, cache_new),
    ('inactive cleanup', cleanup_old, cleanup_new),
):
    if builder.count(old) != 1:
        raise SystemExit(
            f'Builder {label} patch anchor: expected one match, found {builder.count(old)}'
        )
    builder = builder.replace(old, new, 1)

namespace = {
    '__name__': '__main__',
    '__file__': str(builder_path),
}
exec(compile(builder, str(builder_path), 'exec'), namespace, namespace)
