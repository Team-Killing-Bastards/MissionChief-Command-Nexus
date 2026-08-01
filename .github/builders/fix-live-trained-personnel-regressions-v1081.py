#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/check-trained-personnel-on-scene-authority-v1080.mjs')
text = path.read_text(encoding='utf-8')

replacements = [
    (
        "const process = extractFunction('processRequirementRows');",
        "const processBlock = extractFunction('processRequirementRows');"
    ),
    ('process.includes(', 'processBlock.includes('),
    ('process.indexOf(', 'processBlock.indexOf('),
    (
        "'Vehicles are on scene. Live personnel and course shortages are authoritative.',",
        "'No current trained-personnel shortage is reported.',"
    ),
    (
        "'Mission Required Personnel is shown only before the first vehicle arrives on scene.'",
        "'Current Missing Personnel'"
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count < 1:
        raise SystemExit(f'Missing regression token: {old}')
    text = text.replace(old, new)

path.write_text(text, encoding='utf-8')
