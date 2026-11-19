from pathlib import Path
import base64, hashlib, json, re, zipfile

root = Path(__file__).resolve().parent
source = root / 'extension'
release = json.loads((root / 'release.json').read_text())
candidate = json.loads((root / 'candidate-validation.json').read_text())
sha = lambda data: hashlib.sha256(data).hexdigest()
files = {p.relative_to(source).as_posix(): p for p in source.rglob('*') if p.is_file()}
assert len(files) == 179
assert {name: sha(p.read_bytes()) for name, p in files.items()} == release['files']
assert set(files) == set(candidate['fileHashes'])
for name, p in files.items():
    data = p.read_bytes()
    if name == release['sourceChange']['file']:
        change = release['sourceChange']
        text = data.decode('utf-8')
        assert text.count(change['afterUrl']) == 1
        data = text.replace(change['afterUrl'], change['beforeUrl']).encode('utf-8')
    assert sha(data) == candidate['fileHashes'][name], name + ' differs from tested candidate'
assert candidate['passed'] and candidate['version'] == release['version']
for name, report in candidate['reports'].items():
    data = (root / ('candidate-' + name)).read_bytes()
    assert sha(data) == report['sha256'] and json.loads(data)['passed']
assert sum(len(r.get('checks', [])) for r in candidate['reports'].values()) == 147
manifest = json.loads(files['manifest.json'].read_text())
assert manifest['version'] == release['version'] == '3.0.43.281'
assert manifest['manifest_version'] == 3
assert set(manifest['permissions']) == {'activeTab', 'scripting', 'storage', 'alarms', 'identity'}
assert manifest['host_permissions'] == ['https://nexus.blyth.scot/*']
assert not manifest.get('update_url') and not manifest.get('externally_connectable')
digest = sha(base64.b64decode(manifest['key']))[:32]
assert ''.join(chr(97 + int(x, 16)) for x in digest) == release['itemId']
assert manifest['background']['service_worker'] in files
assert manifest['options_page'] in files and manifest['action']['default_popup'] in files
for entry in manifest['content_scripts']:
    assert all(url.startswith(('https://www.missionchief.co.uk/', 'https://police.missionchief.co.uk/')) for url in entry['matches'])
    for name in entry.get('js', []) + entry.get('css', []):
        assert name in files, name
for name, p in files.items():
    if p.suffix in ['.js', '.mjs']:
        text = p.read_text(encoding='utf-8')
        for dep in re.findall(r'(?:from\s*|import\s*)[\'"](\./[^\'"]+)[\'"]', text):
            assert (p.parent / dep).is_file(), (name, dep)
    if p.suffix == '.html':
        text = p.read_text(encoding='utf-8')
        assert not re.search(r'<script\b[^>]*src=[\'"]https?:', text, re.I)
        for dep in re.findall(r'<script\b[^>]*src=[\'"]([^\'"]+)', text, re.I):
            assert (p.parent / dep).is_file(), (name, dep)
output = root / release['zip']
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name in sorted(files):
        info = zipfile.ZipInfo(name, (2026, 11, 19, 0, 0, 0))
        archive.writestr(info, files[name].read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None and set(archive.namelist()) == set(files)
    assert all(sha(archive.read(name)) == digest for name, digest in release['files'].items())
result = {'passed': True, 'version': release['version'], 'files': len(files), 'sha256': sha(output.read_bytes()),
          'candidateFixtureChecks': 147, 'onlyCandidateDifference': 'Published immutable changelog URL', 'itemId': release['itemId']}
(root / 'package-validation.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
