from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')


def extract_function(name: str) -> str:
    marker = f'function {name}('
    start = source.find(marker)
    if start < 0:
        return f'{name}: NOT FOUND\n'
    params_start = source.find('(', start)
    params_depth = 0
    quote = ''
    escaped = False
    body_start = -1
    for index in range(params_start, len(source)):
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
        if char == '(':
            params_depth += 1
        elif char == ')':
            params_depth -= 1
            if params_depth == 0:
                body_start = source.find('{', index + 1)
                break
    if body_start < 0:
        return f'{name}: BODY NOT FOUND\n'
    depth = 0
    quote = ''
    escaped = False
    for index in range(body_start, len(source)):
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
    return f'{name}: UNTERMINATED\n'

names = [
    'isRescueSupportRequirement',
    'isRescueSupportVehicleCheckbox',
    'getAllMatchingVehicleCheckboxes',
    'countSelectedMatchingVehicles',
    'findUnitButton',
    'getNamedPersonnelCount',
    'getSupportedMissingPersonnelRowsFromText',
]

out = ['CURRENT RESCUE SUPPORT AND POLICE OFFICER CONTRACT', '']
for name in names:
    out.append(f'===== {name} =====')
    out.append(extract_function(name))

for marker in [
    "includes('83')",
    'Rescue Support Vehicles',
    'Missing Personnel:',
]:
    out.append(f'===== MARKER {marker} =====')
    position = 0
    while True:
        position = source.find(marker, position)
        if position < 0:
            break
        start = max(0, position - 600)
        end = min(len(source), position + 900)
        out.append(source[start:end])
        position += len(marker)

Path('CURRENT_RESCUE_POLICE_CONTRACT.txt').write_text('\n'.join(out), encoding='utf-8')
print('Wrote current Rescue Support and Police Officer contract')
