from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib, json, subprocess, sys

base = Path(__file__).resolve().parent
root = base / 'extension'
repo = base.parents[1]
node = Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
manifest = json.loads((root/'manifest.json').read_text(encoding='utf-8'))
previous = json.loads((base.parent/'3.0.43.227/extension/manifest.json').read_text(encoding='utf-8'))
assert manifest['version'] == '3.0.43.228'
assert {k:v for k,v in manifest.items() if k not in ('version','version_name')} == {k:v for k,v in previous.items() if k not in ('version','version_name')}
scripts = [p for p in root.rglob('*') if p.suffix in ('.js','.mjs')]
def syntax(path):
    result = subprocess.run([str(node),'--check',str(path)],capture_output=True,text=True,encoding='utf-8')
    assert result.returncode == 0, f'{path.name}: {result.stderr}'
with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(syntax,scripts))
for group in manifest.get('content_scripts',[]):
    for name in group.get('js',[])+group.get('css',[]): assert (root/name).is_file(),name
for name in manifest.get('icons',{}).values(): assert (root/name).is_file(),name
if manifest.get('background',{}).get('service_worker'): assert (root/manifest['background']['service_worker']).is_file()
notes=(root/'nexus-update-notes-data.mjs').read_text(encoding='utf-8')
assert "{version:'3.0.43.228', id:'shortage-wait'" in notes
assert '## v3-0-43-228-shortage-wait' in (repo/'docs/extension-changelog.md').read_text(encoding='utf-8')

def result(name):return json.loads((base/name).read_text(encoding='utf-8'))
validation={
    'shortageWaitChecks':result('shortage-wait-validation.json')['checks'],
    'shortageWaitBrowserChecks':result('shortage-wait-browser-validation.json')['checks'],
    'automaticRecoveryChecks':result('auto-recovery-validation.json')['checks'],
    'automaticRecoveryBrowserChecks':result('auto-recovery-browser-validation.json')['checks'],
    'throughputChecks':result('throughput-validation.json')['checks'],
    'crewChecks':result('crew-throughput-validation.json')['checks'],
    'hazmatChecks':result('hazmat-validation.json')['checks'],
    'policeChecks':result('police-alternatives-validation.json')['checks'],
    'idleDispatchChecks':result('idle-dispatch-validation.json')['checks'],
    'startupReadinessChecks':result('startup-readiness-validation.json')['checks'],
    'patientTailChecks':result('additional-regression-validation.json')['patientTailChecks'],
    'startupHandoffChecks':result('additional-regression-validation.json')['startupHandoffChecks'],
    'packageScopeChecks':result('recovery-scope-validation.json')['checks'],
    'syntaxFiles':len(scripts),'selectionAndCrewUnchanged':True,'permissionsUnchanged':True,
    'allBrowserRequestsIntercepted':True,'liveGameVerified':False,
}
files={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}
assert len(files)==150
evidence={'version':'3.0.43.228','baseVersion':'3.0.43.227','baseCommit':'0d65eaafb06a8ac618c69ee243c3e5d6e21606ca',
    'changelogCommit':'e11fd372cc067c695ddfe90b0d5a98090d44b194',
    'status':'Local candidate. Verified final resource stops use three seconds instead of twelve. Unit/crew coverage unchanged; no live throughput guarantee. No store submission.',
    'validation':validation,'store':{'zip':'Nexus-3.0.43.228-Shortage-Recovery.zip','files':len(files),'sha256':'pending'},'files':files}
def save():
    (base/'provenance.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8',newline='\n')
    (base/'validation.json').write_text(json.dumps(validation,indent=2)+'\n',encoding='utf-8',newline='\n')
save()
subprocess.run([sys.executable,'-X','utf8',str(base/'package.py')],check=True)
evidence['store']['sha256']=hashlib.sha256((base/evidence['store']['zip']).read_bytes()).hexdigest()
save()
subprocess.run([sys.executable,'-X','utf8',str(base/'package.py')],check=True)
print(json.dumps(validation,indent=2))
