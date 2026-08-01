#!/usr/bin/env python3
from __future__ import annotations

import base64
import gzip
import hashlib
import subprocess
from pathlib import Path

PATCH_SHA256 = '68ffe93ac4a0b36be26acd2aef87fc37a2ec211c7544bbe7b068e580c327a985'
PATCH_GZIP_SHA256 = '7ea0e653d005ad7698efd04302f5e6184e3ce0910dfd7808fd825b02f1c7bcca'
BASE_SOURCE_SHA256 = '25e303004cc92caa13fcfc8bf06cccb73e19021f2dbaa1feb1e5c88b42ccd725'
CANDIDATE_SOURCE_SHA256 = 'ef61bc9acbf46ddb274cf9b941d01487910376e794623e887a99fc00dda586a4'
PART_GLOB = '.github/builders/stations-overview-popup-v1077.patch.b64.part*'

source_path = Path('src/missionchief-command-nexus.user.js')
source_bytes = source_path.read_bytes()
source = source_bytes.decode('utf-8')
source_sha = hashlib.sha256(source_bytes).hexdigest()

if '// @version      1.0.77' in source:
    if source_sha != CANDIDATE_SOURCE_SHA256:
        raise SystemExit(f'Unexpected existing 1.0.77 source hash: {source_sha}')
    print('Stations overview popup v1.0.77 patch already applied.')
    raise SystemExit(0)

if source_sha != BASE_SOURCE_SHA256:
    raise SystemExit(f'Expected exact production 1.0.76 source hash, found {source_sha}')
if '// @version      1.0.76' not in source:
    raise SystemExit('Expected Command Nexus 1.0.76 production metadata')
if 'MISSION FINDER V10.6.139' not in source:
    raise SystemExit('Expected Mission Finder V10.6.139 production baseline')
if "const UNIT_VERSION = '3.3.8';" not in source:
    raise SystemExit('Expected Unit Naming 3.3.8 production baseline')

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

patch_path = Path('.github/builders/stations-overview-popup-v1077.patch')
patch_path.write_bytes(patch_bytes)
try:
    subprocess.run(['git', 'apply', '--check', str(patch_path)], check=True)
    subprocess.run(['git', 'apply', str(patch_path)], check=True)
finally:
    patch_path.unlink(missing_ok=True)

candidate_bytes = source_path.read_bytes()
candidate = candidate_bytes.decode('utf-8')
candidate_sha = hashlib.sha256(candidate_bytes).hexdigest()
if candidate_sha != CANDIDATE_SOURCE_SHA256:
    raise SystemExit(f'Candidate source checksum mismatch: {candidate_sha}')
if '// @version      1.0.77' not in candidate:
    raise SystemExit('Candidate is missing Command Nexus 1.0.77 metadata')
if 'MISSION FINDER V10.6.139' not in candidate:
    raise SystemExit('Candidate changed the Mission Finder V10.6.139 baseline')
if "const UNIT_VERSION = '3.3.9';" not in candidate:
    raise SystemExit('Candidate is missing Unit Naming 3.3.9')
if 'TOOL_IS_STATION_OVERVIEW_FRAME' not in candidate:
    raise SystemExit('Candidate is missing the Stations overview frame classifier')

print('Applied exact Command Nexus 1.0.77 Stations overview popup hotfix.')
