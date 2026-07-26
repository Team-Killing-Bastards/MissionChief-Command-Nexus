#!/usr/bin/env python3
from pathlib import Path

builder_path = Path('.diagnostics/apply-bulk-trained-register-update.py')
builder = builder_path.read_text(encoding='utf-8')

start_marker = """source = replace_once(
    source,
    '''            {
                code:
                    'armed_response_personnel',
''',
"""
start = builder.find(start_marker)
if start < 0:
    raise SystemExit('Unable to find ambiguous Search Advisor pattern builder block')

end_marker = """    'Search Advisor trained pattern',
)
"""
end = builder.find(end_marker, start)
if end < 0:
    raise SystemExit('Unable to find end of Search Advisor pattern builder block')
end += len(end_marker)

replacement = r"""source = replace_once(
    source,
    r'''            {
                code:
                    'railway_police',
                label:
                    'Railway Police Officer',
                patterns: [
                    /(\d+)\s*(?:x\s*)?Railway\s+Police\s+Officer(?:s)?/gi,
                    /Railway\s+Police\s+Officer(?:s)?\s*(?:x\s*)?(\d+)/gi
                ]
            },
            {
                code:
                    'armed_response_personnel',
''',
    r'''            {
                code:
                    'railway_police',
                label:
                    'Railway Police Officer',
                patterns: [
                    /(\d+)\s*(?:x\s*)?Railway\s+Police\s+Officer(?:s)?/gi,
                    /Railway\s+Police\s+Officer(?:s)?\s*(?:x\s*)?(\d+)/gi
                ]
            },
            {
                code:
                    'search_and_rescue',
                label:
                    'Search Advisor',
                patterns: [
                    /(\d+)\s*(?:x\s*)?Search\s+Advisor(?:s)?/gi,
                    /Search\s+Advisor(?:s)?\s*(?:x\s*)?(\d+)/gi
                ]
            },
            {
                code:
                    'armed_response_personnel',
''',
    'Search Advisor trained pattern',
)
"""

patched_builder = builder[:start] + replacement + builder[end:]
namespace = {
    '__name__': '__main__',
    '__file__': str(builder_path),
}
exec(compile(patched_builder, str(builder_path), 'exec'), namespace)
