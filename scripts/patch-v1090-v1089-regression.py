#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/check-naming-dispatch-centre-retry-v1089.mjs')
text = path.read_text()

old_vm = """  `${extractFunction('isNamingDispatchCentreSeedStationTypeId')}\\n` +
  `${extractFunction('getNamingDispatchCentreSeedBuildingIds')}\\n` +
"""
new_vm = """  `${extractFunction('isNamingDispatchCentreSeedStationTypeId')}\\n` +
  `${extractFunction('getNamingDispatchCentreSeedBuildingIdsFromRows')}\\n` +
  `${extractFunction('getNamingDispatchCentreSeedBuildingIds')}\\n` +
"""
if text.count(old_vm) != 1:
    raise SystemExit(f'Expected one v1.0.89 seed VM block, found {text.count(old_vm)}')
text = text.replace(old_vm, new_vm, 1)

old_assertion = "expect(listLoader.includes('getNamingDispatchCentreSeedBuildingIds(3)'), 'List loader must use bounded assigned-station seed candidates');"
new_assertion = "expect(listLoader.includes('await loadNamingDispatchCentreSeedBuildingIds(3)'), 'List loader must use bounded resilient station seed candidates');"
if text.count(old_assertion) != 1:
    raise SystemExit(f'Expected one assigned-only loader assertion, found {text.count(old_assertion)}')
text = text.replace(old_assertion, new_assertion, 1)

text = text.replace(
    "console.log('PASS: v1.0.89 keeps Retry Dispatch Centres clickable, visibly active and seeded from assigned ordinary stations.');",
    "console.log('PASS: v1.0.89 Retry interaction remains protected under the v1.0.90 resilient seed loader.');"
)

path.write_text(text)
print('Adapted v1.0.89 Retry regression to the v1.0.90 resilient seed helper/loader.')
