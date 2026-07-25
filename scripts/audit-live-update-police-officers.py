from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')


def extract_function(name: str) -> str:
    marker = f'function {name}('
    start = source.find(marker)
    if start < 0:
        return f'{name}: NOT FOUND\n'
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
    return f'{name}: UNTERMINATED\n'

names = [
    'getAllMatchingVehicleCheckboxes',
    'countSelectedMatchingVehicles',
    'findUnitButton',
    'getNamedPersonnelCount',
    'getSupportedMissingPersonnelRowsFromText',
]

out = ['EXACT SELECTOR FUNCTIONS', '']
for name in names:
    out.append(f'===== {name} =====')
    out.append(extract_function(name))

Path('LIVE_UPDATE_FUNCTIONS.txt').write_text('\n'.join(out), encoding='utf-8')
print('Wrote exact selector functions')
