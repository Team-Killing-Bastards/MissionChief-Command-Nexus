#!/usr/bin/env python3
from pathlib import Path

REPLACEMENTS = (
    (
        "buildId: '1.1.9-activity-recorder-2'",
        "buildId: '1.1.10-upload-lock-hotfix-1'",
    ),
    (
        "buildId: '1\\.1\\.9-activity-recorder-2'",
        "buildId: '1\\.1\\.10-upload-lock-hotfix-1'",
    ),
)

updated = []
for path in sorted(Path('scripts').glob('check-*.mjs')):
    text = path.read_text(encoding='utf-8')
    revised = text
    for old, new in REPLACEMENTS:
        revised = revised.replace(old, new)
    if revised == text:
        continue
    path.write_text(revised, encoding='utf-8')
    updated.append(path.as_posix())

if not updated:
    raise SystemExit('No remaining logger build-marker regressions were updated')

regression_path = Path('scripts/check-mission-logger-hotfix-v1110.mjs')
regression = regression_path.read_text(encoding='utf-8')
old_version_assertion = r"expect(/^\/\/\s+@version\s+1\.1\.10\s*$/m.test(source), 'Command Nexus must be v1.1.10');"
new_version_assertion = r"expect(/const MF_MISSION_LOGGER_CLIENT_VERSION\s*=\s*'[^']+';/.test(source), 'Logger client version constant is missing');"
if old_version_assertion not in regression:
    raise SystemExit('The generated hotfix regression version assertion was not found')
regression_path.write_text(
    regression.replace(old_version_assertion, new_version_assertion, 1),
    encoding='utf-8'
)
updated.append(regression_path.as_posix())

print('Updated logger regressions in:')
for path in updated:
    print(f'  {path}')
