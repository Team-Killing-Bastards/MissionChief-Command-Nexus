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
    for name in sorted(evidence['files']):
        info=zipfile.ZipInfo(name,date_time=(2026,10,18,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        info.create_system=3
        info.external_attr=0o100644 << 16
        z.writestr(info,(root/name).read_bytes(),compresslevel=8)
with zipfile.ZipFile(dest) as z:assert z.testzip() is None
digest=hashlib.sha256(dest.read_bytes()).hexdigest()
assert evidence['store']['sha256'] in ['pending',digest],'Package differs from the verified deterministic artifact'
print(dest)
print(digest)
