#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/check-mission-definition-trained-personnel.mjs')
text = path.read_text(encoding='utf-8')
replacements = [
    (
        r'''requireText("source:\n                            'mission-definition-required-personnel'", 'mission-definition source marker');''',
        '''requireText("'mission-definition-required-personnel'", 'mission-definition source marker');'''
    ),
    (
        r'''requireText('getTrainedPersonnelVehicleTarget(\n                                missionDefinitionPersonnelRequirements', 'shared trained optimiser target');''',
        '''requireText('getTrainedPersonnelVehicleTarget(', 'shared trained optimiser target');'''
    )
]
for old, new in replacements:
    if old not in text:
        raise SystemExit(f'Expected formatting-sensitive assertion was not found: {old[:70]}')
    text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
print('Updated mission-definition regression formatting-sensitive assertions.')
