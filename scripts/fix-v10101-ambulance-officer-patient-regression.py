#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD = r"/requirementRows\s*=\s*applyConfiguredFreshMissionVehicleRequirements\(\s*requirementRows\s*\);/.exec(source);"
NEW = r"/requirementRows\s*=\s*applyConfiguredFreshMissionVehicleRequirements\(\s*requirementRows\s*,\s*options\s*\.ambulanceOfficerThresholdAdditionalRows\s*\);/.exec(source);"

for relative in (
    'scripts/check-ambulance-officer-threshold-v10101.mjs',
    'scripts/check-high-risk-missing-person-ambulance-v1076.mjs',
):
    path = ROOT / relative
    text = path.read_text(encoding='utf-8')
    if NEW in text:
        continue
    count = text.count(OLD)
    if count != 1:
        raise SystemExit(
            f'{relative}: expected one old fresh-rule regex, got {count}'
        )
    path.write_text(text.replace(OLD, NEW, 1), encoding='utf-8')

print('Updated v1.0.101 fresh-rule regressions for patient-demand forwarding.')
