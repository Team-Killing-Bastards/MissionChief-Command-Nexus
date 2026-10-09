import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const source=fs.readFileSync(new URL('./extension/nexus-runtime.js',import.meta.url),'utf8');
const block=source.slice(source.indexOf('    // BEGIN VERIFIED PATIENT TAIL 213'),source.indexOf('    // END VERIFIED PATIENT TAIL 213'));
assert(block.length>1000);
assert.equal((source.match(/await nexusHandlePatientMissionTail\(autoCycleMissionId\)/g)||[]).length,2,'both pre-loading and pre-retry gates');
let checks=1;
const html=({summary='0 Patients - 0 Untreated patients',alerts='',cards='',rows='',name='UTI',table='',next=true,bulk='/missions/101/backalarmAll?ifs=at_fi&ift=al_ae_sw&sd=a&sk=cr'}={})=>`<h3 id="missionH1">${name}</h3><div id="mission_general_info"></div><span id="patient_button_text">${summary}</span>${alerts}${cards}${table}${bulk?`<a data-confirm="Are you sure you want to cancel all your units?" href="${bulk}">Cancel All Units</a>`:''}<table id="mission_vehicle_at_mission"><tbody>${rows}</tbody></table>${next?'<a id="mission_next_mission_btn" href="/missions/102">Next Mission</a>':''}`;
const row=(id,href=`/vehicles/${id}/backalarm?return=mission`)=>`<tr id="vehicle_row_${id}"><td><a href="${href}">Cancel</a></td></tr>`;
const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
async function fixture({body=html(),snapshots=[body],failRelease=false,owner='7',player='7',afterFetch='',afterRelease='',runtime=block,releaseRedirect='',releaseGone=false}={}) {
 const page=await browser.newPage();let first=true,reads=0;const calls=[];
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(first){first=false;await route.fulfill({contentType:'text/html',body});return;}
  calls.push(url.pathname);
  if(/backalarm(?:All)?$/.test(url.pathname)){
   if(afterRelease)await page.evaluate(afterRelease);
   if(releaseRedirect)return route.fulfill({status:302,headers:{location:releaseRedirect},body:''});
   return route.fulfill({status:failRelease?500:releaseGone?404:200,body:'ok'});
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
 await page.addScriptTag({content:runtime});
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
 assert.deepEqual(states,['empty','unknown','unknown','unknown','unknown','empty','unknown','unknown','unknown','transport','unknown']);checks+=states.length;await f.page.close();
 // Reproduce the reported transport warnings: no cancellation, no extra dispatch,
 // no 3,000-vehicle full-list retry, and a distinct pending-transport status.
 for(const name of ['UTI','Multiple Seizures','Smoke Inhalation (caused by "Large fire in nightclub")']){
  const f=await fixture({body:html({name,summary:'1 Patient - 0 Untreated patients',alerts:`<div class="${name === 'UTI' ? 'alert alert-warning' : 'alert-danger'}">Transport is needed!</div>`,rows:row('11')})});
  assert.equal(await f.run(),true);const s=await f.state();assert.match(s.stops[0],/patient transport remains pending/);assert.deepEqual(f.calls,[]);assert.equal(s.nexts,0);
  const signal=await f.page.evaluate(()=>window.__NEXUS_PATIENT_TAIL_HANDOFF__);assert.equal(signal.missionId,'101');assert.equal(signal.reason,s.stops[0]);assert.equal(signal.kind,'PATIENT_TRANSPORT_PENDING');assert(signal.at>0);checks++;await f.page.close();
 }
 // Fresh explicit zero invokes the native mission action once; row links only prove own units.
 {const f=await fixture({body:html({rows:row('11')+row('12')}),snapshots:[html({rows:row('11')+row('12')}),html()]});
 assert.equal(await f.run(),true);assert.deepEqual(f.calls,['/missions/101','/missions/101/backalarmAll','/missions/101']);
 const s=await f.state();assert.equal(s.nexts,1);assert.equal(s.events.find(e=>e.type==='verified-patient-tail-cleanup').released,2);assert.deepEqual(s.stops,[]);checks++;await f.run();assert.equal(f.calls.filter(x=>/backalarm(?:All)?$/.test(x)).length,1,'no duplicate cleanup');checks++;await f.page.close();}
 for(const options of [
  {owner:'8'},{owner:''},{player:''},{body:html({name:'Large Fire'})},
  {snapshots:[html({summary:'1 Patient - 0 Untreated patients'})]},
  {snapshots:[html({summary:'1 Patient',alerts:'<div class="alert-danger">Transport is needed!</div>'})]},
  {afterFetch:"window.current='999'"},{afterFetch:'window.manual=true'},
  {afterFetch:'window.ownerActive=false'}
 ]) {const f=await fixture({body:html({rows:row('11')}),...options});assert.equal(await f.run(),false);assert(!f.calls.some(x=>/backalarm(?:All)?$/.test(x)));assert.equal((await f.state()).nexts,0);checks++;await f.page.close();}
 // Failed verification, remaining units and a newly appearing patient keep the
 // mission visible and never advance or repeat uncertain cancellation requests.
 for(const options of [
  {snapshots:[null]}, {failRelease:true},
  {snapshots:[html({rows:row('11')}),html({rows:row('11')})]},
  {body:html({rows:row('11')+row('12')}),snapshots:[html({rows:row('11')+row('12')}),html({summary:'1 Patient',rows:row('12')})]},
  {afterRelease:'window.manual=true'}
 ]){const f=await fixture({body:html({rows:row('11')}),snapshots:[html({rows:row('11')}),html()],...options});assert.equal(await f.run(),true);const s=await f.state();assert.equal(s.nexts,0);assert(s.stops.length);assert(f.calls.filter(x=>/backalarm(?:All)?$/.test(x)).length<=1);checks++;await f.page.close();}
 {const f=await fixture({body:html({rows:row('11','https://evil.invalid/vehicles/11/backalarm')})});const candidates=await f.page.evaluate(()=>nexusPatientTailReleasableVehicles(document));assert.deepEqual(candidates,[]);checks++;await f.page.close();}
 {const f=await fixture({body:html({rows:row('11','https://evil.invalid/vehicles/11/backalarm')})});assert.equal(await f.run(),true);assert(!f.calls.some(x=>/backalarm(?:All)?$/.test(x)));assert.equal((await f.state()).nexts,0);checks++;await f.page.close();}
 {const f=await fixture({body:html({rows:row('11')}),snapshots:[html({rows:row('11')}),'gone']});assert.equal(await f.run(),true);const s=await f.state();assert.equal(s.nexts,1);assert.equal(s.events.find(e=>e.type==='verified-patient-tail-cleanup').outcome,'mission-no-longer-available');assert.equal(f.calls.filter(x=>/backalarm(?:All)?$/.test(x)).length,1);checks++;await f.page.close();}
 {const f=await fixture({body:html({rows:row('11')+row('12')}),snapshots:[html({rows:row('11')+row('12')}),'gone']});assert.equal(await f.run(),true);assert.equal((await f.state()).nexts,1);assert.equal(f.calls.filter(x=>/backalarm(?:All)?$/.test(x)).length,1);checks++;await f.page.close();}
 // Actual live Multiple Seizures markup: total zero, stale banner, and a hidden
 // prison-loading error. Only the hidden placeholder is ignored; visible errors block.
 const orphanAlerts='<div class="alert alert-danger">Transport is needed!</div><div id="prisons-load-error" class="alert alert-danger" hidden>Something went wrong! Please try again.</div>';
 {const f=await fixture();const old=fs.readFileSync(new URL('../3.0.43.214/extension/nexus-runtime.js',import.meta.url),'utf8');
 const start=old.indexOf('    function nexusPatientTailState('),end=old.indexOf('    function nexusPatientTailOwnMission(',start);
 await f.page.addScriptTag({content:old.slice(start,end).replace('nexusPatientTailState','previousPatientTailState')});
 const result=await f.page.evaluate(body=>{const doc=new DOMParser().parseFromString(body,'text/html');return [previousPatientTailState(doc).kind,nexusPatientTailState(doc).kind];},html({summary:'0 Patient',alerts:orphanAlerts,rows:row('11')+row('12')}));
 assert.deepEqual(result,['transport','empty'],'reproduce .214 wrong branch with live markup');checks++;await f.page.close();}
 for(const name of ['Multiple Seizures','UTI','Smoke Inhalation (caused by "Hotel fire (large)")']) {
  const initial=html({name,summary:'0 Patient',alerts:orphanAlerts,rows:row('11')+row('12')});
  const final=html({name,summary:'',alerts:orphanAlerts});
  const f=await fixture({body:initial,snapshots:[initial,final]});
  assert.equal(await f.run(),true);assert.equal((await f.state()).nexts,1);assert.equal(f.calls.filter(x=>/backalarm(?:All)?$/.test(x)).length,1);
  assert.equal((await f.state()).events.find(e=>e.type==='verified-patient-tail-cleanup').initialEvidence.counts[0],0);checks++;await f.page.close();
 }
 for(const alerts of [
  '<div class="alert" hidden>Missing Vehicles: Any vehicle</div>',
  '<div style="display:none"><div class="alert">Something went wrong! Please try again.</div></div>',
  '<div class="alert" aria-hidden="true">Something went wrong! Please try again.</div>'
 ]) {const f=await fixture();assert.equal(await f.page.evaluate(body=>nexusPatientTailState(new DOMParser().parseFromString(body,'text/html')).kind,html({alerts})), 'empty');checks++;await f.page.close();}
 for(const body of [
  html({summary:'',alerts:orphanAlerts,rows:row('11')}),
  html({alerts:'<div class="alert">Transport is needed!</div><div class="alert">Something went wrong! Please try again.</div>'}),
  html({alerts:'<div class="alert">Transport is needed!</div><div class="alert">Missing Personnel: 2</div>'}),
  html({alerts:'<div class="alert">Transport is needed! Missing Vehicles: 1 Fire Engine</div>'})
 ]) {const f=await fixture({body});assert.notEqual(await f.page.evaluate(()=>nexusPatientTailState(document).kind),'empty');await f.run();assert(!f.calls.some(x=>/backalarm(?:All)?$/.test(x)));checks++;await f.page.close();}
 // Missing total count cannot authorise the first release. The post-release
 // exception requires no assigned rows and no patient cards/links/demands.
 {const f=await fixture();const results=await f.page.evaluate(input=>input.map(body=>nexusPatientTailState(new DOMParser().parseFromString(body,'text/html'),true).kind),[
  html({summary:'',alerts:orphanAlerts}),html({summary:'',rows:row('12'),alerts:orphanAlerts}),
  html({summary:'',cards:'<div class="mission_patient" hidden></div>',alerts:orphanAlerts}),
  html({summary:'',cards:'<a href="/vehicles/11/patient/9">Transport</a>',alerts:orphanAlerts})]);
 assert.equal(results[0],'empty');assert(results.slice(1).every(x=>x!=='empty'));checks+=4;await f.page.close();}
 // A patient or transport link appearing in a fresh read still prevents release.
 for(const change of [{summary:'1 Patient',alerts:orphanAlerts},{cards:'<div class="mission_patient" hidden></div>',alerts:orphanAlerts},{cards:'<a href="/vehicles/11/patient/9">Transport</a>',alerts:orphanAlerts}]) {
  const f=await fixture({body:html({alerts:orphanAlerts,rows:row('11')}),snapshots:[html({...change,rows:row('11')})]});assert.equal(await f.run(),false);assert(!f.calls.some(x=>/backalarm(?:All)?$/.test(x)));checks++;await f.page.close();
 }
 // Native updates may remove the total counter after Cancel All Units.
 {const initial=html({summary:'0 Patient',alerts:orphanAlerts,rows:row('11')});const f=await fixture({body:initial,snapshots:[initial,html({summary:'',alerts:orphanAlerts})],afterRelease:"document.querySelector('#patient_button_text').remove();document.querySelector('#vehicle_row_11').remove()"});assert.equal(await f.run(),true);assert.equal((await f.state()).nexts,1);checks++;await f.page.close();}
 // Reproduce .215's exact missing action: zero patients and no assigned units
 // used to advance without ever calling the game's mission-level cancel action.
 {const old=fs.readFileSync(new URL('../3.0.43.215/extension/nexus-runtime.js',import.meta.url),'utf8');
 const previous=old.slice(old.indexOf('    // BEGIN VERIFIED PATIENT TAIL 213'),old.indexOf('    // END VERIFIED PATIENT TAIL 213'));
 const f=await fixture({runtime:previous});assert.equal(await f.run(),true);
 assert(!f.calls.some(x=>x.endsWith('backalarmAll')));assert.equal((await f.state()).nexts,1);checks++;await f.page.close();}
 for(const name of ['UTI','Multiple Seizures','Smoke Inhalation (caused by "Large fire in nightclub")']) {
  const initial=html({name,summary:'0 Patient',alerts:orphanAlerts});
  const f=await fixture({body:initial,snapshots:[initial,'gone']});
  assert.equal(await f.run(),true);assert.deepEqual(f.calls,['/missions/101','/missions/101/backalarmAll','/missions/101']);
  const state=await f.state();assert.equal(state.nexts,1);assert.deepEqual(state.stops,[]);
  const event=state.events.find(e=>e.type==='verified-patient-tail-cleanup');
  assert.equal(event.released,0);assert.equal(event.cancellationSent,true);assert.equal(event.outcome,'mission-no-longer-available');checks++;await f.page.close();
 }
 // An empty unit list does not waive patient/requirement/ownership safeguards.
 for(const body of [html({summary:'1 Patient - 0 Untreated patients'}),html({summary:''}),
  html({cards:'<div class="mission_patient" hidden></div>'}),
  html({table:'<table id="mission_vehicle_requirements"><tbody><tr><td>1 Fire Engine</td></tr></tbody></table>'}),
  html({bulk:''}),html({bulk:'/missions/999/backalarmAll'}),html({bulk:'https://evil.invalid/missions/101/backalarmAll'})]) {
  const f=await fixture({body});await f.run();assert(!f.calls.some(x=>x.endsWith('backalarmAll')));assert.equal((await f.state()).nexts,0);checks++;await f.page.close();
 }
 // A bulk response must not silently redirect to login or another mission. No retry.
 for(const releaseRedirect of ['/users/sign_in','https://evil.invalid/missions/101','/missions/999']) {
  const f=await fixture({releaseRedirect});assert.equal(await f.run(),true);const state=await f.state();
  assert.equal(state.nexts,0);assert.match(state.stops[0],releaseRedirect.startsWith('https:')?/Failed to fetch/:/redirected/);
  await f.run();assert.equal(f.calls.filter(x=>x.endsWith('backalarmAll')).length,1);checks++;await f.page.close();
 }
 {const f=await fixture({releaseGone:true});assert.equal(await f.run(),true);assert.equal((await f.state()).nexts,0);assert.match((await f.state()).stops[0],/not accepted/);checks++;await f.page.close();}
 // Use the real ownership module rather than only stubbing its get() result.
 {const f=await fixture({owner:''});await f.page.evaluate(()=>{delete window.__NEXUS_ALLIANCE_MISSION_OWNER_CAPTURE__;window.user_id=7;window.mission_markers={};});
 await f.page.addScriptTag({path:fileURLToPath(new URL('./extension/nexus-alliance-owner-capture.js',import.meta.url))});
 await f.page.evaluate(()=>{window.mission_markers={101:{mission_id:101,user_id:7}};});
 assert.equal(await f.run(),true);assert.equal(f.calls.filter(x=>x.endsWith('backalarmAll')).length,1);checks++;await f.page.close();}
 // A native personal emergency card is positive fallback evidence when capture
 // has no owner; foreign/event/planned evidence always vetoes it.
 const personal='<div id="mission_list"><div class="missionSideBarEntry" mission_id="101" data-mission-type-filter="emergency"><a id="alarm_button_101" href="/missions/101">Dispatch</a></div></div>';
 {const f=await fixture({body:html()+personal,owner:''});assert.equal(await f.run(),true);assert.equal(f.calls.filter(x=>x.endsWith('backalarmAll')).length,1);checks++;await f.page.close();}
 for(const owner of [{userId:'8',event:false},{userId:'7',event:true},{userId:'7',event:false,planned:true}]) {
  const f=await fixture({body:html()+personal});await f.page.evaluate(owner=>{window.__NEXUS_ALLIANCE_MISSION_OWNER_CAPTURE__={get:()=>owner,currentUserId:()=>7};},owner);
  assert.equal(await f.run(),false);assert.equal(f.calls.length,0);assert((await f.state()).events.some(e=>e.type==='patient-tail-cleanup-blocked'));checks++;await f.page.close();
 }
 for(const changed of [personal.replace('id="mission_list"','id="mission_list_alliance"'),personal.replace('"emergency"','"alliance"'),
  personal.replace('missionSideBarEntry"','missionSideBarEntry mission_deleted"'),personal.replace('href="/missions/101"','href="/missions/999"')]) {
  const f=await fixture({body:html()+changed,owner:''});assert.equal(await f.run(),false);assert.equal(f.calls.length,0);checks++;await f.page.close();
 }
 {const initial=html()+personal;const f=await fixture({body:initial,owner:'',snapshots:[initial,'gone'],afterRelease:"document.querySelector('.missionSideBarEntry').classList.add('mission_deleted')"});assert.equal(await f.run(),true);assert.equal((await f.state()).nexts,1);checks++;await f.page.close();}
 {const f=await fixture({snapshots:['gone']});assert.equal(await f.run(),true);assert.equal(f.calls.filter(x=>x.endsWith('backalarmAll')).length,0);assert.equal((await f.state()).nexts,1);checks++;await f.page.close();}
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
