#!/usr/bin/env python3
from pathlib import Path
import re

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
sections = []
for name in [
    'isAmbulanceTransportRequest',
    'countSelectedMatchingVehicles',
    'handlePatientSelector',
    'handleUnitFinderPatientRequirements',
    'getMissionUpdatePatientRequirementRule',
]:
    match = re.search(rf'^\s*(?:async\s+)?function\s+{re.escape(name)}\s*\(', source, re.M)
    if not match:
        sections.append(f'=== {name}: NOT FOUND ===\n')
        continue
    next_match = re.search(r'^\s*(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(', source[match.end():], re.M)
    end = match.end() + next_match.start() if next_match else len(source)
    sections.append(f'=== {name} ===\n{source[match.start():end].rstrip()}\n')
Path('.diagnostics/hems-ambulance-context-extra.txt').write_text('\n'.join(sections), encoding='utf-8')
