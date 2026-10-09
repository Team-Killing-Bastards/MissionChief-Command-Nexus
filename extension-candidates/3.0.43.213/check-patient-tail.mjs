import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const source=fs.readFileSync(new URL('./extension/nexus-runtime.js',import.meta.url),'utf8');
const block=source.slice(source.indexOf('    // BEGIN VERIFIED PATIENT TAIL 213'),source.indexOf('    // END VERIFIED PATIENT TAIL 213'));
assert(block.length>1000);
assert.equal((source.match(/await nexusHandlePatientMissionTail\(autoCycleMissionId\)/g)||[]).length,2,'both pre-loading and pre-retry gates');
let checks=1;
const html=({summary='0 Patients - 0 Untreated patients',alerts='',cards='',rows='',name='UTI',table='',next=true}={})=>`<h3 id="missionH1">${name}</h3><div id="mission_general_info"></div><span id="patient_button_text">${summary}</span>${alerts}${cards}${table}<table id="mission_vehicle_at_mission"><tbody>${rows}</tbody></table>${next?'<a id="mission_next_mission_btn" href="/missions/102">Next Mission</a>':''}`;
const row=(id,href=`/vehicles/${id}/backalarm?return=mission`)=>`<tr id="vehicle_row_${id}"><td><a href="${href}">Cancel</a></td></tr>`;
const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
async function fixture({body=html(),snapshots=[body],failRelease=false,owner='7',player='7',afterFetch='',afterRelease=''}={}) {
 const page=await browser.newPage();let first=true,reads=0;const calls=[];
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(first){first=false;await route.fulfill({contentType:'text/html',body});return;}
  calls.push(url.pathname);
  if(/backalarm$/.test(url.pathname)){
   if(afterRelease)await page.evaluate(afterRelease);
   return route.fulfill({status:failRelease?500:200,body:'ok'});
  }
  const snapshot=snapshots[Math.min(reads++,snapshots.length-1)];
  if(afterFetch)await page.evaluate(afterFetch);
  if(snapshot===null)return route.fulfill({status:500,body:'failed'});
  if(snapshot==='gone')return route.fulfill({status:404,body:'Mission not found'});
  await route.fulfill({contentType:'text/html',body:snapshot});
 });
 await page.goto('https://www.missionchief.co.uk/missions/101');
 await page.evaluate(({owner,player})=>{
  window.autoModeRunning=true;window.current='101';window.manual=false;window.ownerActive=true;window.stops=[];window.statuses=[];window.events=[];window.nexts=0;
  window.isManualAutoStopActive=()=>manual;window.getCurrentMissionIdForQueueRestart=()=>current;
  window.isCurrentMissionExecutionOwner=()=>ownerActive;window.getCurrentMissionName=()=>document.querySelector('#missionH1')?.textContent||'';
  window.stopAutoMode=message=>{stops.push(message);autoModeRunning=false;};window.updateStatusBox=message=>statuses.push(message);
  window.__NEXUS_RECOVERY__={emit:(type,data)=>events.push({type,...data})};
  window.__NEXUS_ALLIANCE_MISSION_OWNER_CAPTURE__={get:()=>({userId:owner,event:false}),currentUserId:()=>player};
  window.getAutoReleaseMissionVehicleId=row=>row.id.match(/^vehicle_row_?(\d+)$/)?.[1]||'';
  // The user setting remains off throughout this fixture.
  localStorage.setItem('mf_auto_release_surplus_ambulances_v1','false');
  document.querySelector('#mission_next_mission_btn')?.addEventListener('click',e=>{e.preventDefault();nexts++;});
 },{owner,player});
 await page.addScriptTag({content:block});
 return {page,calls,async run(){return page.evaluate(()=>nexusHandlePatientMissionTail('101'));},async state(){return page.evaluate(()=>({stops,nexts,statuses,events}));}};
}
try {
 const f=await fixture();
 const states=await f.page.evaluate(input=>input.map(body=>nexusPatientTailState(new DOMParser().parseFromString(body,'text/html')).kind),[
  html(),html({summary:'1 Patient - 0 Untreated patients'}),html({summary:'0 Untreated patients'}),html({summary:''}),
  html({cards:'<div class="mission_patient" style="display:none"></div>'}),
  html({alerts:'<div class="alert alert-danger">Transport is needed!</div>'}),
  html({alerts:'<div class="alert alert-danger">Transport is needed!</div><div class="alert alert-danger">Missing Vehicles: Any vehicle</div>'}),
  html({alerts:'<div class="alert alert-danger">Something went wrong! Please try again.</div>'}),
  html({table:'<table aria-label="Live mission requirements"><tbody><tr><td>2 Fire Engines</td></tr></tbody></table>'}),
  html({cards:'<a href="/vehicles/11/patient/9">Transport</a>'}),'<form>Sign in</form>'
 ]);
 assert.deepEqual(states,['empty','unknown','unknown','unknown','unknown','transport','unknown','unknown','unknown','transport','unknown']);checks+=states.length;await f.page.close();
 // Reproduce the reported transport warnings: no cancellation, no extra dispatch,
 // no 3,000-vehicle full-list retry, and a distinct pending-transport status.
 for(const name of ['UTI','Multiple Seizures','Smoke Inhalation (caused by "Large fire in nightclub")']){
  const f=await fixture({body:html({name,alerts:`<div class="${name === 'UTI' ? 'alert alert-warning' : 'alert-danger'}">Transport is needed!</div>`,rows:row('11')})});
  assert.equal(await f.run(),true);const s=await f.state();assert.match(s.stops[0],/patient transport remains pending/);assert.deepEqual(f.calls,[]);assert.equal(s.nexts,0);checks++;await f.page.close();
 }
 // Only fresh, explicit zero-patient evidence releases actual native row links.
 {const f=await fixture({body:html({rows:row('11')+row('12')}),snapshots:[html({rows:row('11')+row('12')}),html({rows:row('12')}),html()]});
 assert.equal(await f.run(),true);assert.deepEqual(f.calls,['/missions/101','/vehicles/11/backalarm','/missions/101','/vehicles/12/backalarm','/missions/101']);
 const s=await f.state();assert.equal(s.nexts,1);assert.equal(s.events[0].released,2);assert.deepEqual(s.stops,[]);checks++;await f.run();assert.equal(f.calls.filter(x=>x.endsWith('backalarm')).length,2,'no duplicate cleanup');checks++;await f.page.close();}
 for(const options of [
  {owner:'8'},{owner:''},{player:''},{body:html({name:'Large Fire'})},
  {snapshots:[html({summary:'1 Patient - 0 Untreated patients'})]},
  {snapshots:[html({alerts:'<div class="alert-danger">Transport is needed!</div>'})]},
  {afterFetch:"window.current='999'"},{afterFetch:'window.manual=true'},
  {afterFetch:'window.ownerActive=false'}
 ]) {const f=await fixture({body:html({rows:row('11')}),...options});assert.equal(await f.run(),false);assert(!f.calls.some(x=>x.endsWith('backalarm')));assert.equal((await f.state()).nexts,0);checks++;await f.page.close();}
 // Failed verification, partial cleanup and a newly appearing patient keep the
 // mission visible and never advance or repeat uncertain cancellation requests.
 for(const options of [
  {snapshots:[null]}, {failRelease:true},
  {snapshots:[html({rows:row('11')}),html({rows:row('11')})]},
  {body:html({rows:row('11')+row('12')}),snapshots:[html({rows:row('11')+row('12')}),html({summary:'1 Patient',rows:row('12')})]},
  {afterRelease:'window.manual=true'}
 ]){const f=await fixture({body:html({rows:row('11')}),snapshots:[html({rows:row('11')}),html()],...options});assert.equal(await f.run(),true);const s=await f.state();assert.equal(s.nexts,0);assert(s.stops.length);assert(f.calls.filter(x=>x.endsWith('backalarm')).length<=1);checks++;await f.page.close();}
 {const f=await fixture({body:html({rows:row('11','https://evil.invalid/vehicles/11/backalarm')})});const candidates=await f.page.evaluate(()=>nexusPatientTailReleasableVehicles(document));assert.deepEqual(candidates,[]);checks++;await f.page.close();}
 {const f=await fixture({body:html({rows:row('11','https://evil.invalid/vehicles/11/backalarm')})});assert.equal(await f.run(),true);assert(!f.calls.some(x=>x.endsWith('backalarm')));assert.equal((await f.state()).nexts,0);checks++;await f.page.close();}
 {const f=await fixture({body:html({rows:row('11')}),snapshots:[html({rows:row('11')}),'gone']});assert.equal(await f.run(),true);const s=await f.state();assert.equal(s.nexts,1);assert.equal(s.events[0].outcome,'mission-no-longer-available');assert.equal(f.calls.filter(x=>x.endsWith('backalarm')).length,1);checks++;await f.page.close();}
 {const f=await fixture({body:html({rows:row('11')+row('12')}),snapshots:[html({rows:row('11')+row('12')}),'gone']});assert.equal(await f.run(),true);assert.equal((await f.state()).nexts,1);assert.equal(f.calls.filter(x=>x.endsWith('backalarm')).length,1);checks++;await f.page.close();}
 // Controller classification and handoff are exercised from packaged source.
 function fn(name){const start=source.indexOf('function '+name+'(');assert(start>=0,name);const end=source.indexOf('\nfunction ',start+10);return source.slice(start,end);}
 const context=vm.createContext({state:{currentMissionId:'101'},candidate:{actionKind:'UPGRADE',missingText:'Transport is needed!'},mapMissionCandidate:()=>context.candidate,normaliseText:x=>String(x||''),collectAutoStopEvidence:(_doc,status)=>status});
 vm.runInContext(fn('hasExactZeroSelectionFullListStop')+'\n'+fn('isTransportOnlyZeroSelection'),context);
 const pending='Auto stopped: patient transport remains pending; no additional vehicles were requested.';
 assert.equal(vm.runInContext(`hasExactZeroSelectionFullListStop(null,${JSON.stringify(pending)}).matched`,context),true);checks++;
 assert.equal(vm.runInContext(`isTransportOnlyZeroSelection(${JSON.stringify(pending)})`,context),true);checks++;
 context.candidate.missingText='Missing Vehicles: 1 ILB';assert.equal(vm.runInContext(`isTransportOnlyZeroSelection(${JSON.stringify(pending)})`,context),false);checks++;
 assert(source.includes('skipAdvances = transportOnly ? 1 : ZERO_SELECTION_SKIP_ADVANCES;'));checks++;
 const handoffs=[];const records=[];
 Object.assign(context,{state:{wanted:true,stopping:false,currentMissionId:'101',currentMissionUrl:'/missions/101',currentMissionName:'UTI',workerRole:'MISSION_A'},
  RECOVERABLE_SHORTAGE_SKIP_ADVANCES:20,ZERO_SELECTION_SKIP_ADVANCES:20,AUTO_RECOVERY_WATCHDOG_MS:2000,
  hasCoastguardHelicopterShortageEvidence:()=>({matched:false}),clearAutoRecoveryWatchdog:()=>{},isMissionUrl:()=>true,
  findAutoModeControl:()=>null,requests:[{key:'11:101',vehicleId:'11',missionId:'101'}],
  refreshRadioTransportRequests:()=>context.requests,transportServiceRequest:requests=>requests[0]||null,
  registerRecoverableMissionSkip:(id,name,reason,evidence,advances,category)=>{const record={missionId:id,missionName:name,reason,evidence,skipAdvances:advances,category};records.push(record);return record;},
  clearSharedV2AutoRunning:()=>{},resetAutoStartTracking:()=>{},removeWorker:()=>handoffs.push('release-A'),
  startTransportOnlyWorker:request=>{handoffs.push('start-B:'+request.vehicleId);return true;},
  choosePriorityTarget:()=>({missionId:'102'}),redirectAfterRecoverableSkip:()=>true});
 vm.runInContext(fn('maybeHandleRecoverableAutoStop'),context);
 context.doc={defaultView:{}};context.pending=pending;context.candidate={actionKind:'UPGRADE',missingText:'Transport is needed!'};
 assert.equal(vm.runInContext('maybeHandleRecoverableAutoStop(doc,pending)',context),true);
 assert.deepEqual(handoffs,['release-A','start-B:11']);assert.equal(records[0].skipAdvances,1);assert.equal(records[0].category,'TRANSPORT_ONLY');checks++;
 handoffs.length=0;context.requests=[];assert.equal(vm.runInContext('maybeHandleRecoverableAutoStop(doc,pending)',context),true);assert.deepEqual(handoffs,[]);assert.equal(records[1].skipAdvances,1);checks++;
 console.log(`${checks} patient-tail checks passed. All Edge traffic intercepted; no live game dispatch, transport or cancellation.`);
} finally {await browser.close();}
