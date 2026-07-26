#!/usr/bin/env python3
from pathlib import Path
import re

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()

wanted_names = {
    'getPersonnelAssignedToVehicle',
    'getPersonnelAssignedTrainingProfiles',
    'getPersonnelTrainingSet',
    'getPersonnelTrainingCodes',
    'readPersonnelTrainingRegistry',
    'normalisePersonnelTrainingRegistry',
    'updatePersonnelTrainingRegistryForStation',
    'getRegistryTrainingQualifiedCount',
    'normalisePublicOrderTrainedRequirements',
    'getSearchAdvisorTrainedVehicleRequirement',
    'selectVehiclesForTrainedPersonnelRequirements',
    'getTrainedPersonnelVehicleCandidates',
    'getPersonnelAssignmentRows',
    'getPersonnelAssignmentIndex',
    'parsePersonnelAssignmentPage',
    'getPersonnelVehicleTypeIdFromRow',
}

interesting_tokens = [
    'data-filterable-by',
    'assignedVehicleId',
    'assignedTrainingProfiles',
    'trainingProfilesComplete',
    'assignmentPersonnelRowsSeen',
    'assignmentScanComplete',
    'personnel-register-exact-',
    'search_and_rescue',
    'registryAnyVehicle',
    'trainedOnly',
    'btn-assigned',
    'remove binding',
    '/zuweisung',
]

func_pattern = re.compile(r'^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(', re.M)
funcs = list(func_pattern.finditer(source))
out = [f'SOURCE_LINES={len(lines)}', '']

for index, match in enumerate(funcs):
    name = match.group(1)
    end = funcs[index + 1].start() if index + 1 < len(funcs) else len(source)
    body = source[match.start():end]
    if name in wanted_names or any(token.lower() in body.lower() for token in interesting_tokens):
        start_line = source.count('\n', 0, match.start()) + 1
        end_line = source.count('\n', 0, end) + 1
        if len(body) > 24000 and name not in wanted_names:
            continue
        out.append(f'=== FUNCTION {name}: lines {start_line}-{end_line} ===')
        out.append(body.rstrip())
        out.append('')

out.append('=== TOKEN CONTEXT ===')
for token in interesting_tokens:
    out.append(f'--- {token} ---')
    for hit in re.finditer(re.escape(token), source, re.I):
        line_no = source.count('\n', 0, hit.start()) + 1
        start = max(1, line_no - 8)
        end = min(len(lines), line_no + 12)
        out.append(f'lines {start}-{end}')
        for number in range(start, end + 1):
            out.append(f'{number:06d}: {lines[number - 1]}')
        if len(out) > 12000:
            break
    out.append('')

Path('.diagnostics/search-advisor-register-context.txt').write_text('\n'.join(out) + '\n', encoding='utf-8')
