#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src' / 'missionchief-command-nexus.user.js'


def replace_js_function(text: str, name: str, replacement: str) -> str:
    marker = f'function {name}('
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f'ERROR: unable to find function {name}')
    brace = text.find('{', start)
    depth = 0
    quote = ''
    escaped = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(text):
        c = text[i]
        n = text[i + 1] if i + 1 < len(text) else ''
        if line_comment:
            if c == '\n': line_comment = False
            i += 1; continue
        if block_comment:
            if c == '*' and n == '/': block_comment = False; i += 2; continue
            i += 1; continue
        if quote:
            if escaped: escaped = False; i += 1; continue
            if c == '\\': escaped = True; i += 1; continue
            if c == quote: quote = ''
            i += 1; continue
        if c == '/' and n == '/': line_comment = True; i += 2; continue
        if c == '/' and n == '*': block_comment = True; i += 2; continue
        if c in ('\'', '"', '`'): quote = c; i += 1; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return text[:start] + replacement + text[i + 1:]
        i += 1
    raise SystemExit(f'ERROR: unterminated function {name}')


source = SOURCE.read_text(encoding='utf-8')
for token in [
    '// @version      1.0.96',
    'MISSION FINDER V10.6.145',
    'function isCarsToTowRequirementName(',
    'function getCarsToTowVehicleRequirement(',
    'function isFlatbedRecoveryVehicleRequirement(',
    "getVehicleTypeIdentifiers(input)\n            .includes('105')",
]:
    if token not in source:
        raise SystemExit(f'ERROR: missing v1.0.96 candidate token: {token}')

replacement = '''function isCarsToTowRequirementName(name) {
        // Historical helper name retained because the existing towing converter and
        // strict Flatbed Recovery selector both use it. Match explicit towing language
        // only: an ordinary "truck" requirement must never become Recovery demand.
        let key = normalise(name);
        key = key
            .replace(/^required\\s+/, '')
            .replace(/^(?:maximum|minimum)\\s+amount\\s+of\\s+/, '')
            .replace(/^\\d+\\s+/, '')
            .replace(/\\s+\\d+$/, '');

        if (
            /^(?:cars?|trucks?|lorr(?:y|ies)|vans?|vehicles?)\\s+(?:to\\s+tow|to\\s+be\\s+towed)$/.test(key)
        ) {
            return true;
        }

        return /^(?:tow|recovery)\\s+trucks?$/.test(key);
    }'''

source = replace_js_function(source, 'isCarsToTowRequirementName', replacement)
SOURCE.write_text(source, encoding='utf-8')
print('Patched v1.0.96 towing matcher while preserving maximum/minimum amount aliases.')
