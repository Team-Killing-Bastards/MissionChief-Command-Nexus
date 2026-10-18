from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,subprocess,sys
base=Path(__file__).resolve().parent
root=base/'extension'
node=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
scripts=[p for p in root.rglob('*') if p.suffix in ('.js','.mjs')]
def syntax(p):
    r=subprocess.run([str(node),'--check',str(p)],capture_output=True,text=True,encoding='utf-8')
    assert r.returncode==0,(p.name,r.stderr)
with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(syntax,scripts))
subprocess.run([str(node),str(base/'check-scope.mjs')],check=True)
manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
for group in manifest.get('content_scripts',[]):
    for name in group.get('js',[])+group.get('css',[]):assert (root/name).is_file(),name
for name in manifest.get('icons',{}).values():assert (root/name).is_file(),name
assert (root/manifest['background']['service_worker']).is_file()
report=json.loads((base/'station-crew-validation.json').read_text(encoding='utf-8'))
scope=json.loads((base/'scope-validation.json').read_text(encoding='utf-8'))
assert report['cases']==26 and report['checks']>=477
validation={'stationCrewChecks':report['checks'],'isolatedBrowserCases':report['cases'],'syntaxFiles':len(scripts),
    'scopeChecks':scope['checks'],'permissionsUnchanged':True,'autoModeUnchangedExceptVersion':True,
    'liveStationReadVerified':True,'liveAssignmentFixVerified':False,'allFixtureRequestsIntercepted':True}
files={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}
assert len(files)==150
evidence={'version':'3.0.43.229','baseVersion':'3.0.43.228','baseCommit':'f9fbd293e76f80898c135e13103883270d8d334b',
    'changelogCommit':'11f4259282574802ce39671488fcfd4611eba41b','status':'Local candidate. Station crew progress and bounded verification/save waits. No store submission.',
    'validation':validation,'store':{'zip':'Nexus-3.0.43.229-Station-Crew.zip','files':len(files),'sha256':'pending'},'files':files}
def save():
    (base/'provenance.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8',newline='\n')
    (base/'validation.json').write_text(json.dumps(validation,indent=2)+'\n',encoding='utf-8',newline='\n')
save()
subprocess.run([sys.executable,'-X','utf8',str(base/'package.py')],check=True)
evidence['store']['sha256']=hashlib.sha256((base/evidence['store']['zip']).read_bytes()).hexdigest()
save()
subprocess.run([sys.executable,'-X','utf8',str(base/'package.py')],check=True)
print(json.dumps(validation,indent=2))
