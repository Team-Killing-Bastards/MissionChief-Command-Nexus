from pathlib import Path
import hashlib,json,zipfile
base=Path(__file__).parent
evidence=json.loads((base/'provenance.json').read_text())
root=base/'extension'
for name,digest in evidence['files'].items():
    assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest,name
assert set(evidence['files'])=={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
dest=base/evidence['store']['zip']
with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=8) as z:
    for name in sorted(evidence['files']):z.write(root/name,name)
with zipfile.ZipFile(dest) as z:assert z.testzip() is None
print(dest)
print(hashlib.sha256(dest.read_bytes()).hexdigest())
