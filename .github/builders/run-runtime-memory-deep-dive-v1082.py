#!/usr/bin/env python3
from pathlib import Path

builder_path = Path('.github/builders/apply-runtime-memory-deep-dive-v1082.py')
builder = builder_path.read_text(encoding='utf-8')

old = '''# Shared document topology cache lives longer; explicit invalidation/force refresh remains available.
source = replace_once(
    source,
    'expiresAt: now + 500,\\n            documents',
    'expiresAt: now + 5000,\\n            documents',
    'mission document cache lifetime',
)
'''
new = '''# Shared Mission Finder document topology cache lives longer; explicit invalidation/force refresh remains available.
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

if builder.count(old) != 1:
    raise SystemExit(
        f'Builder cache patch anchor: expected one match, found {builder.count(old)}'
    )

builder = builder.replace(old, new, 1)
namespace = {
    '__name__': '__main__',
    '__file__': str(builder_path),
}
exec(compile(builder, str(builder_path), 'exec'), namespace, namespace)
