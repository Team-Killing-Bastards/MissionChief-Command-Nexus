#!/usr/bin/env python3
from pathlib import Path

builder_path = Path('.diagnostics/apply-bulk-trained-register-update.py')
builder = builder_path.read_text(encoding='utf-8')

label = "'Search Advisor trained pattern'"
label_index = builder.find(label)
if label_index < 0:
    raise SystemExit('Unable to find Search Advisor pattern builder label')

start = builder.rfind('source = replace_once(', 0, label_index)
if start < 0:
    raise SystemExit('Unable to find start of Search Advisor pattern builder operation')

next_operation = builder.find('\n\nsource = ', label_index)
if next_operation < 0:
    raise SystemExit('Unable to find end of Search Advisor pattern builder operation')
end = next_operation

replacement = """source = replace_once(
    source,
    '''            {\\n                code:\\n                    'railway_police',\\n                label:\\n                    'Railway Police Officer',\\n                patterns: [\\n                    /(\\\\d+)\\\\s*(?:x\\\\s*)?Railway\\\\s+Police\\\\s+Officer(?:s)?/gi,\\n                    /Railway\\\\s+Police\\\\s+Officer(?:s)?\\\\s*(?:x\\\\s*)?(\\\\d+)/gi\\n                ]\\n            },\\n            {\\n                code:\\n                    'armed_response_personnel',\\n''',
    '''            {\\n                code:\\n                    'railway_police',\\n                label:\\n                    'Railway Police Officer',\\n                patterns: [\\n                    /(\\\\d+)\\\\s*(?:x\\\\s*)?Railway\\\\s+Police\\\\s+Officer(?:s)?/gi,\\n                    /Railway\\\\s+Police\\\\s+Officer(?:s)?\\\\s*(?:x\\\\s*)?(\\\\d+)/gi\\n                ]\\n            },\\n            {\\n                code:\\n                    'search_and_rescue',\\n                label:\\n                    'Search Advisor',\\n                patterns: [\\n                    /(\\\\d+)\\\\s*(?:x\\\\s*)?Search\\\\s+Advisor(?:s)?/gi,\\n                    /Search\\\\s+Advisor(?:s)?\\\\s*(?:x\\\\s*)?(\\\\d+)/gi\\n                ]\\n            },\\n            {\\n                code:\\n                    'armed_response_personnel',\\n''',
    'Search Advisor trained pattern',
)"""

patched_builder = builder[:start] + replacement + builder[end:]
namespace = {
    '__name__': '__main__',
    '__file__': str(builder_path),
}
exec(compile(patched_builder, str(builder_path), 'exec'), namespace)

# Repair the generated JavaScript token directly. The nested Python replacement
# can otherwise turn its intended \n escape into a literal line break inside a
# double-quoted JavaScript string.
check_path = Path('scripts/check-open-issues-batch.mjs')
check_source = check_path.read_text(encoding='utf-8')
bad_token = "requireText(\"code:\n                    'search_and_rescue'\","
good_token = "requireText(\"code:\\n                    'search_and_rescue'\","
match_count = check_source.count(bad_token)
if match_count != 1:
    raise SystemExit(
        f'Generated open-issues Search Advisor token: expected one invalid match, found {match_count}'
    )
check_path.write_text(
    check_source.replace(bad_token, good_token, 1),
    encoding='utf-8',
)
