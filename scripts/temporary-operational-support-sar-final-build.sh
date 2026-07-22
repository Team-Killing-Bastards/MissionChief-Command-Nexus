#!/usr/bin/env bash
set -euo pipefail

git fetch origin main --force
git show origin/main:scripts/temporary-operational-support-sar-patch.py > /tmp/operational-support-sar-patch.py

python3 - <<'PY'
from pathlib import Path

path = Path('/tmp/operational-support-sar-patch.py')
text = path.read_text(encoding='utf-8')

old_verification = '''source = replace_in_segment(
    source,
    "    function countSelectedMatchingVehicles(originalName, mappedName) {",
    "    function refreshVehicleRequirementCounters() {",
    dog_flag,
    dog_flag_with_operational,
    "verification strict flag",
)'''
new_verification = r'''source = replace_in_segment(
    source,
    "    function countSelectedMatchingVehicles(originalName, mappedName) {",
    "    function refreshVehicleRequirementCounters() {",
    "        const dogSupportOnly = isDogSupportUnitRequirement(originalName, mappedName);\n        const generic4x4Only =",
    "        const dogSupportOnly = isDogSupportUnitRequirement(originalName, mappedName);\n        const operationalSupportOnly =\n            isOperationalSupportOrSarVehicleRequirement(\n                originalName,\n                mappedName\n            );\n\n        const generic4x4Only =",
    "verification strict flag",
)'''
if text.count(old_verification) != 1:
    raise SystemExit(
        f'Verification correction anchor count: {text.count(old_verification)}'
    )
text = text.replace(old_verification, new_verification, 1)

old_boundary = '"    async function clickUnitButton"'
new_boundary = '"    function injectStyles() {"'
if text.count(old_boundary) != 1:
    raise SystemExit(
        f'findUnitButton boundary anchor count: {text.count(old_boundary)}'
    )
text = text.replace(old_boundary, new_boundary, 1)
path.write_text(text, encoding='utf-8', newline='\n')
PY

python3 /tmp/operational-support-sar-patch.py

python3 - <<'PY'
from pathlib import Path

path = Path('src/missionchief-command-nexus.user.js')
source = path.read_text(encoding='utf-8')
old = '''        if (getVehicleTypeIdentifiers(input).includes('86')) {
            return true;
        }

        return getExtendedVehicleValues(input).some(value => {'''
new = '''        const typeIdentifiers = getVehicleTypeIdentifiers(input);
        if (typeIdentifiers.includes('86')) {
            return true;
        }
        if (typeIdentifiers.includes('39')) {
            return false;
        }

        return getExtendedVehicleValues(input).some(value => {'''
if source.count(old) != 1:
    raise SystemExit(f'Type-39 exclusion anchor count: {source.count(old)}')
path.write_text(source.replace(old, new, 1), encoding='utf-8', newline='\n')
PY

python3 - <<'PY'
from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
markers = [
    '// @version      1.0.17',
    'MODULE 2: MISSION FINDER V10.6.81',
    '"Operational Support or SAR Vehicle": "Operational Support Van"',
    '"Operational Support or SAR Vehicle x1": "Operational Support Van"',
    'function isOperationalSupportOrSarVehicleRequirement(',
    'function isOperationalSupportVanCheckbox(',
    "typeIdentifiers.includes('86')",
    "typeIdentifiers.includes('39')",
    "!raw.includes('operational support unit')",
    'matches = isOperationalSupportVanCheckbox(input);',
]
missing = [marker for marker in markers if marker not in source]
if missing:
    raise SystemExit('Missing focused regression markers: ' + ', '.join(missing))
if source.count('const operationalSupportOnly =') != 2:
    raise SystemExit('Expected exactly two Operational Support strict flags')
if source.count('isOperationalSupportVanCheckbox(') < 4:
    raise SystemExit(
        'Type-86 matcher is not connected to selection, verification and fallback'
    )
print('Focused Operational Support SAR checks passed.')
PY

node --check src/missionchief-command-nexus.user.js
node scripts/validate-userscript.mjs
node scripts/validate-userscript.mjs --base-ref origin/main
node scripts/check-ios-compatibility.mjs
python3 scripts/check_repository.py
git diff --check

git config user.name MartyBlyth
git config user.email 32400596+Martyblyth@users.noreply.github.com
git rm -f .github/workflows/build-operational-support-sar-fix.yml
git add CHANGELOG.md README.md src/README.md src/missionchief-command-nexus.user.js
git reset --soft origin/main

git restore --staged \
  .github/workflows/temporary-operational-support-sar-builder.yml \
  .github/workflows/temporary-operational-support-sar-push-builder.yml \
  .github/workflows/temporary-operational-support-sar-diagnostic-builder.yml \
  .github/workflows/temporary-command-nexus-action-probe.yml \
  scripts/temporary-operational-support-sar-patch.py \
  scripts/temporary-operational-support-sar-final-build.sh \
  2>/dev/null || true

git restore \
  .github/workflows/temporary-operational-support-sar-builder.yml \
  .github/workflows/temporary-operational-support-sar-push-builder.yml \
  .github/workflows/temporary-operational-support-sar-diagnostic-builder.yml \
  .github/workflows/temporary-command-nexus-action-probe.yml \
  scripts/temporary-operational-support-sar-patch.py \
  scripts/temporary-operational-support-sar-final-build.sh \
  2>/dev/null || true

git commit -m 'Restore Operational Support SAR selection'
git push --force origin HEAD:agent/fix-operational-support-sar-vehicle
