#!/usr/bin/env python3
from pathlib import Path
import re

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
funcs = list(re.finditer(r'^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(', source, re.M))
requested = {
    'parseVehicleAssignmentPage',
    'getPersonnelAssignmentIndex',
    'getPersonnelAssignedToVehicle',
    'getPersonnelVehicleQueue',
    'getPersonnelVehicleTypeIdFromRow',
    'publishPersonnelVehicleTrainingRegistry',
    'getRegistryTrainingQualifiedCount',
    'getRegistryTrainingProfileCounts',
    'getTrainedPersonnelVehicleCandidates',
    'selectVehiclesForTrainedPersonnelRequirements',
    'normalisePublicOrderTrainedRequirements',
    'getSearchAdvisorTrainedVehicleRequirement',
}
out = []
for i, match in enumerate(funcs):
    name = match.group(1)
    if name not in requested:
        continue
    end = funcs[i + 1].start() if i + 1 < len(funcs) else len(source)
    start_line = source.count('\n', 0, match.start()) + 1
    end_line = source.count('\n', 0, end) + 1
    out.append(f'=== {name} source lines {start_line}-{end_line} ===')
    out.append(source[match.start():end].rstrip())
    out.append('')
missing = sorted(requested - {m.group(1) for m in funcs})
out.append('MISSING=' + ','.join(missing))
Path('.diagnostics/search-advisor-exact-context.txt').write_text('\n'.join(out) + '\n', encoding='utf-8')
