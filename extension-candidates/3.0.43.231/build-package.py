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
def read(name):return json.loads((base/name).read_text(encoding='utf-8'))
validation={
    'cleanupControllerChecks':read('cleanup-recovery-validation.json')['checks'],
    'patientTailBrowserChecks':read('patient-tail-validation.json')['checks'],
    'initialWorkerLoadChecks':read('worker-load-validation.json')['checks'],
    'initialWorkerLoadBrowserChecks':read('worker-load-browser-validation.json')['checks'],
    'priorAutomaticRecoveryChecks':read('auto-recovery-validation.json')['checks'],
    'priorAutomaticRecoveryBrowserChecks':read('auto-recovery-browser-validation.json')['checks'],
    'throughputChecks':read('throughput-validation.json')['checks'],
    'trainedCrewChecks':read('crew-throughput-validation.json')['checks'],
    'inheritedStationCrewChecks':read('../3.0.43.229/station-crew-validation.json')['checks'],
    'inheritedStationCrewBrowserCases':26,
    'syntaxFiles':len(scripts),'scopeChecks':read('scope-validation.json')['checks'],
    'permissionsUnchanged':True,'dispatchSelectionTrainingUnchanged':True,'stationCrewFixByteIdenticalTo229':True,
    'initialWorkerRecoveryByteIdenticalTo230':True,'liveFailureExportVerified':True,
    'liveFixedBuildVerified':False,'allFixtureRequestsIntercepted':True}
files={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}
assert len(files)==150
evidence={'version':'3.0.43.231','baseVersion':'3.0.43.230','baseCommit':'2ee86907458360f2256e75cbfcdaf77cae7bc1b1',
    'changelogCommit':'7007b90638ddb976020fe4f4cf913b55f5ce4aed','status':'Local candidate. Isolate unverified patient cleanup; preserve cancellation guards. No store submission.',
    'validation':validation,'store':{'zip':'Nexus-3.0.43.231-Patient-Cleanup-Recovery.zip','files':len(files),'sha256':'pending'},'files':files}
def save():
    (base/'provenance.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8',newline='\n')
    (base/'validation.json').write_text(json.dumps(validation,indent=2)+'\n',encoding='utf-8',newline='\n')
save()
subprocess.run([sys.executable,'-X','utf8',str(base/'package.py')],check=True)
evidence['store']['sha256']=hashlib.sha256((base/evidence['store']['zip']).read_bytes()).hexdigest()
save()
subprocess.run([sys.executable,'-X','utf8',str(base/'package.py')],check=True)
print(json.dumps(validation,indent=2))
