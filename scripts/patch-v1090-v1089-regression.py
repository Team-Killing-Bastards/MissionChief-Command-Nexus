#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/check-naming-dispatch-centre-retry-v1089.mjs')
text = path.read_text()
old = """  `${extractFunction('isNamingDispatchCentreSeedStationTypeId')}\\n` +\n  `${extractFunction('getNamingDispatchCentreSeedBuildingIds')}\\n` +\n"""
new = """  `${extractFunction('isNamingDispatchCentreSeedStationTypeId')}\\n` +\n  `${extractFunction('getNamingDispatchCentreSeedBuildingIdsFromRows')}\\n` +\n  `${extractFunction('getNamingDispatchCentreSeedBuildingIds')}\\n` +\n"""
if text.count(old) != 1:
    raise SystemExit(f'Expected one v1.0.89 seed VM block, found {text.count(old)}')
path.write_text(text.replace(old, new, 1))
print('Adapted v1.0.89 Retry regression to load the v1.0.90 row helper.')
