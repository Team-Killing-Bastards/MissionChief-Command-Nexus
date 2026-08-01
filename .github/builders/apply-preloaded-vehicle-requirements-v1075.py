#!/usr/bin/env python3
from __future__ import annotations

import gzip
import hashlib
import subprocess
from pathlib import Path

PATCH_SHA256 = '1b255da6a43afb7722612734cdcadad3011c5200557ea8d3f8ad23f7febca98d'
PATCH_GZIP = Path('.github/builders/preloaded-vehicle-v1075.patch.gz')

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
if '// @version      1.0.75' in source:
    if 'MISSION FINDER V10.6.138' not in source:
        raise SystemExit('1.0.75 source found without V10.6.138')
    print('Preloaded Vehicle Load v1.0.75 patch already applied.')
    raise SystemExit(0)

if '// @version      1.0.74' not in source or 'MISSION FINDER V10.6.137' not in source:
    raise SystemExit('Expected exact production 1.0.74 / V10.6.137 baseline')

patch_bytes = gzip.decompress(PATCH_GZIP.read_bytes())
actual_sha = hashlib.sha256(patch_bytes).hexdigest()
if actual_sha != PATCH_SHA256:
    raise SystemExit(f'Patch checksum mismatch: {actual_sha}')

patch_path = Path('.github/builders/preloaded-vehicle-v1075.patch')
patch_path.write_bytes(patch_bytes)
try:
    subprocess.run(['git', 'apply', '--check', str(patch_path)], check=True)
    subprocess.run(['git', 'apply', str(patch_path)], check=True)
finally:
    patch_path.unlink(missing_ok=True)

print('Applied Command Nexus 1.0.75 / Mission Finder V10.6.138 preloaded Vehicle Load requirements.')
