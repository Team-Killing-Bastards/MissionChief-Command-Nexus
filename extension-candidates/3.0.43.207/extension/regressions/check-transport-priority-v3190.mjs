import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../nexus-runtime.js', import.meta.url), 'utf8');
const fn = name => {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf('\nfunction ', start + 10));
};
const request = (id, missionId = id) => ({key:`${id}:${missionId}`,vehicleId:id,missionId});
function realm() {
  const calls = [], queue = [request('1'), request('2'), request('3')];
  const state = {wanted:true,stopping:false,worker:{isConnected:true},workerRole:'TRANSPORT_B',
    transportServiceActive:true,transportServiceKey:'1:1',transportServiceVehicleId:'1',transportServiceMissionId:'1',
    transportServiceDeferredUntil:new Map(),transportResumeMission:{missionId:'100'},workerGeneration:1,
    workerDocumentSerial:1,postTransportRehooks:0};
  const c = {state,calls,queue,Date,MINIMUM_ACTIONABLE_MISSIONS:2,
    refreshRadioTransportRequests:()=>queue,
    clearTransportServiceState:()=>{state.transportServiceActive=false;},
    clearSharedV2AutoRunning:()=>{},resetAutoStartTracking:()=>{state.autoStartIssued=false;},
    removeWorker:()=>{state.worker=null;state.workerGeneration++;},
    compactControllerEphemeralMemory:()=>{},saveRunContinuity:()=>{},recordTransportService:e=>calls.push(e),
    startTransportOnlyWorker:r=>{assert.equal(state.worker,null);calls.push({b:r.key});state.worker={isConnected:true};state.workerRole='TRANSPORT_B';state.transportServiceActive=true;state.transportServiceKey=r.key;return true;},
    actionableMissionSupply:()=>({count:2,candidates:[{missionId:'200',url:'/missions/200'},{missionId:'100',url:'/missions/100'}]}),
    enterLowQueuePause:()=>calls.push({pause:true}),beginMissionRescan:()=>calls.push({rescan:true}),
    cleanMissionCaption:()=>'',missionNameForId:()=>'',persistResumeMission:()=>{},setPhase:()=>{},missionDisplay:()=>'',log:()=>{},
    window:{setTimeout:f=>f()},createWorker:url=>calls.push({a:url}),
    missionIdFromUrl:url=>url.match(/\/missions\/(\d+)/)?.[1]||'',
    findAutoModeControl:()=>null,autoControlLooksRunning:c=>Boolean(c.running),
    redirectWorkerToTransportService:(r,id)=>{calls.push({handoff:r.key,resume:id});return true;}};
  vm.createContext(c);
  vm.runInContext(['transportServiceRequest','chooseTransportResumeMission','returnToTopMissionAfterTransport','maybePrioritiseTransportBeforeAuto'].map(fn).join('\n'), c);
  return c;
}
// Reproduce three Radio requests at run start. Clear all before the saved A mission resumes.
{
  const c=realm();
  c.queue.shift(); c.returnToTopMissionAfterTransport('radio-cleared');
  assert.equal(c.calls.at(-1).b,'2:2'); assert.equal(c.state.transportResumeMission.missionId,'100');
  c.queue.shift(); c.returnToTopMissionAfterTransport('radio-cleared');
  assert.equal(c.calls.at(-1).b,'3:3');
  c.queue.shift(); c.returnToTopMissionAfterTransport('radio-cleared');
  assert.deepEqual(c.calls.filter(x=>x.a).map(x=>x.a),['/missions/100']);
}
{
  const c=realm(); c.state.transportServiceDeferredUntil.set('2:2', Date.now()+30000);
  c.returnToTopMissionAfterTransport('bounded-timeout');
  assert.equal(c.calls.at(-1).b,'3:3','exclude completed key and honour retry cooldown');
}
{
  const c=realm(); c.state.lowQueuePaused=true;c.queue.shift();
  c.returnToTopMissionAfterTransport('radio-cleared');assert.equal(c.calls.at(-1).b,'2:2');
}
{
  const c=realm();c.state.stopping=true;
  assert.equal(c.returnToTopMissionAfterTransport('radio-cleared'),false);assert.equal(c.calls.length,0);
}
const doc={readyState:'complete',querySelector:()=>null};
function before(overrides={}) {
  const c=realm();Object.assign(c.state,{workerRole:'MISSION_A',transportServiceActive:false},overrides);
  return c;
}
{
  const c=before();assert.equal(c.maybePrioritiseTransportBeforeAuto(doc,'/missions/3'),true);
  assert.equal(c.calls.at(-1).handoff,'3:3','own transport wins before Unit Finder');
}
for(const overrides of [{stopping:true},{wanted:false},{postDispatchWatchdog:{}},{autoStartIssued:true,autoStartDocumentSerial:1},{workerRole:'TRANSPORT_B'}]) {
  const c=before(overrides);assert.equal(c.maybePrioritiseTransportBeforeAuto(doc,'/missions/3'),false);assert.equal(c.calls.length,0);
}
for(const scenario of ['running','selected','loading','no-radio','deferred']) {
  const c=before();let d=doc;
  if(scenario==='running')c.findAutoModeControl=()=>({running:true});
  if(scenario==='selected')d={...doc,querySelector:()=>({})};
  if(scenario==='loading')d={...doc,readyState:'loading'};
  if(scenario==='no-radio')c.queue.length=0;
  if(scenario==='deferred')c.queue.forEach(r=>c.state.transportServiceDeferredUntil.set(r.key,Date.now()+30000));
  assert.equal(c.maybePrioritiseTransportBeforeAuto(d,'/missions/3'),false,scenario);
}
// Execute the real patient click helper against a controlled clock.
{
  const c=before({workerRole:'TRANSPORT_B',patientAssistAttempts:0,patientAssistHistory:[]});
  let now=1000, clicks=0, live=true;
  const r=request('7','30');
  Object.assign(c,{Date:{now:()=>now},PATIENT_ASSIST_DELAY_MS:350,PATIENT_ASSIST_CLICK_COOLDOWN_MS:5000,
    TRANSPORT_SERVICE_HISTORY_LIMIT:60,resetPatientAssistTracking:()=>{c.state.patientAssistKey='';},
    exactPatientPath:()=>null,findExactPersonalPatientAnchor:()=>({request:r,patientId:'9',vehicleId:'7',anchor:{click:()=>clicks++}}),
    pathFromUrl:x=>x,collectRadioTransportRequests:()=>live?[r]:[],radioRequestForVehicle:(id,rs)=>rs.find(x=>x.vehicleId===id),nowIso:()=>''});
  vm.runInContext(fn('maybeAssistPatientTransport'),c);
  const run=()=>c.maybeAssistPatientTransport(doc,'/vehicles/7',{kind:'PATIENT'},[r]);
  assert.equal(run(),false); now=1349;assert.equal(run(),false);
  now=1350;assert.equal(run(),true);assert.equal(clicks,1);
  now=1500;assert.equal(run(),false);assert.equal(clicks,1,'no duplicate click');
  now=8000;live=false;assert.equal(run(),false);assert.equal(clicks,1,'request must still be live');
}
console.log('PASS transport queue drain, saved mission resume, cooldown/stop/dispatch guards, pre-start handoff and fast exact patient click');
