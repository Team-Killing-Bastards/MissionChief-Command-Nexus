#!/usr/bin/env python3
from __future__ import annotations

import base64
import gzip
import hashlib
import subprocess
from pathlib import Path

PATCH_SHA256 = 'edacb0263d280e71b4fad8bbfdeb734ce323a8be1dc724b6b915a2efac0e3207'
PATCH_GZIP_SHA256 = 'd4c74ca1308262a3857a0434e8ee267be69e9c9121899a98acf891f3b4146f0d'
PART_GLOB = '.github/builders/high-risk-missing-person-ambulance-v1076.patch.b64.part*'

source_path = Path('src/missionchief-command-nexus.user.js')
source = source_path.read_text(encoding='utf-8')

if '// @version      1.0.76' in source:
    if 'MISSION FINDER V10.6.139' not in source:
        raise SystemExit('1.0.76 source found without Mission Finder V10.6.139')
    print('High-risk Missing Person Ambulance v1.0.76 patch already applied.')
    raise SystemExit(0)

if '// @version      1.0.75' not in source or 'MISSION FINDER V10.6.138' not in source:
    raise SystemExit('Expected exact production 1.0.75 / V10.6.138 baseline')

part_paths = sorted(Path('.').glob(PART_GLOB))
if len(part_paths) != 4:
    raise SystemExit(f'Expected 4 patch payload parts, found {len(part_paths)}')

encoded = ''.join(path.read_text(encoding='utf-8').strip() for path in part_paths)
compressed = base64.b64decode(encoded)
compressed_sha = hashlib.sha256(compressed).hexdigest()
if compressed_sha != PATCH_GZIP_SHA256:
    raise SystemExit(f'Compressed patch checksum mismatch: {compressed_sha}')

patch_bytes = gzip.decompress(compressed)
patch_sha = hashlib.sha256(patch_bytes).hexdigest()
if patch_sha != PATCH_SHA256:
    raise SystemExit(f'Patch checksum mismatch: {patch_sha}')

patch_path = Path('.github/builders/high-risk-missing-person-ambulance-v1076.patch')
patch_path.write_bytes(patch_bytes)
try:
    subprocess.run(['git', 'apply', '--check', str(patch_path)], check=True)
    subprocess.run(['git', 'apply', str(patch_path)], check=True)
finally:
    patch_path.unlink(missing_ok=True)

print('Applied Command Nexus 1.0.76 / Mission Finder V10.6.139 high-risk Missing Person Ambulance setting.')
