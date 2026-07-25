from pathlib import Path
import re

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()


def extract_function(name: str) -> str:
    marker = f'function {name}('
    start = source.find(marker)
    if start < 0:
        return f'FUNCTION {name}: NOT FOUND\n'

    brace = source.find('{', start)
    depth = 0
    quote = ''
    escaped = False

    for index in range(brace, len(source)):
        char = source[index]
        if quote:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == quote:
                quote = ''
            continue

        if char in "'\"`":
            quote = char
            continue

        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return source[start:index + 1] + '\n'

    return f'FUNCTION {name}: UNTERMINATED\n'


def exact_context(pattern: str, before: int = 14, after: int = 28) -> list[str]:
    regex = re.compile(pattern, re.I)
    hits = [index for index, line in enumerate(lines, 1) if regex.search(line)]
    result = [f'PATTERN: {pattern}', f'HITS: {hits}', '']

    for line_no in hits:
        start = max(1, line_no - before)
        end = min(len(lines), line_no + after)
        result.append(f'--- source lines {start}-{end} ---')
        for number in range(start, end + 1):
            result.append(f'{number:05d}: {lines[number - 1]}')
        result.append('')

    return result


out = [
    'FOCUSED LIVE UPDATE / POLICE OFFICER AUDIT',
    f'Source lines: {len(lines)}',
    '',
]

for function_name in [
    'getLiveRequirementDispatchTarget',
    'readLiveMissionRequirementRow',
    'getPoliceOfficerVehicleRequirement',
    'getPoliceOfficerVehicleRequirementFromText',
    'getPoliceOfficerRequirementsFromText',
    'getMissingPersonnelRequirementsFromText',
    'recordUpdateRequirement',
]:
    out.append(f'===== FUNCTION {function_name} =====')
    out.append(extract_function(function_name))

for pattern in [
    r'Rescue Support Vehicles?',
    r'Major Foam Tenders?',
    r'Missing Personnel',
    r'Police Officers?',
    r'Fire Engine or RIV',
    r'normalise.*Requirement',
    r'foam',
]:
    out.extend(exact_context(pattern))

Path('LIVE_UPDATE_FOCUSED.txt').write_text('\n'.join(out), encoding='utf-8')
print(f'Wrote focused audit with {len(out)} blocks')
