import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {functions, functionText} from './helpers.mjs';

const readerSource=fs.readFileSync('scripts/runtime/personnel-register-reader.js','utf8');
const origin='https://www.missionchief.co.uk';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function fixture(fetchImpl,ios=false){
  const state={stopped:false,paused:false},starts=[];let active=0,maxActive=0;
  const c=vm.createContext({Date,Promise,Set,DOMException,AbortController,URL,setTimeout,clearTimeout,
    PERSONNEL_STATE:state,PERSONNEL_REGISTER_MAX_CONCURRENCY:3,PERSONNEL_REGISTER_LAUNCH_GAP_MS:10,
    isIosSafariWebsite:()=>ios,location:{origin},
    getSameOriginResourceUrl:s=>{const u=new URL(s,origin);if(u.origin!==origin)throw Error('Origin');return u;},
    DOMParser:class{parseFromString(html){return {html};}},
    fetch:async(url,options)=>{starts.push({at:Date.now(),url,options});active++;maxActive=Math.max(active,maxActive);try{return await fetchImpl(url,options);}finally{active--;}}
  });
  vm.runInContext(readerSource,c);return {reader:c.createPersonnelRegisterReader(),state,starts,get max(){return maxActive;}};
}
const response=(url,extra={})=>({ok:true,status:200,url:origin+url,text:async()=>'<html></html>',...extra});
test('register reads share a global launch gap and concurrency limit, including station prefetch',async t=>{
  // A virtual clock checks the scheduler independently of Windows timer granularity.
  t.mock.timers.enable({apis:['Date','setTimeout'],now:100000});
  const h=fixture(async url=>{await delay(45);return response(url);});
  const completed=Promise.all(Array.from({length:9},(_,i)=>h.reader.read('/buildings/'+i)));
  for(let ms=0;ms<1000;ms++) {for(let turn=0;turn<20;turn++)await Promise.resolve();t.mock.timers.tick(1);}
  await completed;
  assert.equal(h.max,3);assert.equal(h.reader.stats.requests,9);
  for(let i=1;i<h.starts.length;i++)assert.ok(h.starts[i].at-h.starts[i-1].at>=10);
  assert.ok(h.starts.every(s=>s.options.method==='GET'&&s.options.cache==='no-store'));
});
test('iOS keeps its two-request cap',async()=>{
  const h=fixture(async url=>{await delay(450);return response(url);},true);
  await Promise.all([1,2,3,4].map(i=>h.reader.read('/buildings/'+i)));assert.equal(h.max,2);
});
test('stop cancels every active request and prevents queued reads launching',async()=>{
  let aborted=0;const h=fixture((url,o)=>new Promise((resolve,reject)=>o.signal.addEventListener('abort',()=>{aborted++;reject(new DOMException('Stopped','AbortError'));})));
  const tasks=Array.from({length:7},(_,i)=>h.reader.read('/buildings/'+i));const settled=Promise.allSettled(tasks);
  await delay(45);h.state.stopped=true;h.reader.cancel();await settled;
  assert.equal(aborted,3);assert.equal(h.starts.length,3);
});
test('pause holds queued reads; cancel also works while paused',async()=>{
  const h=fixture(async url=>response(url));h.state.paused=true;
  const result=h.reader.read('/buildings/1').catch(e=>e);await delay(20);assert.equal(h.starts.length,0);
  h.reader.cancel();assert.equal((await result).name,'AbortError');assert.equal(h.starts.length,0);
});
test('timeout covers the response body rather than only the response headers',async()=>{
  const h=fixture(async(url,o)=>response(url,{text:()=>new Promise((resolve,reject)=>o.signal.addEventListener('abort',()=>reject(new DOMException('Timeout','AbortError'))))}));
  await assert.rejects(h.reader.read('/buildings/1',25),{name:'AbortError'});assert.equal(h.reader.stats.failed,1);
});
test('rate limits stop new launches and remain cancellable',async()=>{
  const h=fixture(async url=>response(url,{ok:false,status:429,headers:{get:()=> '60'}}));
  await assert.rejects(h.reader.read('/buildings/1'),/429/);
  const second=h.reader.read('/buildings/2').catch(e=>e);await delay(30);assert.equal(h.starts.length,1);
  h.reader.cancel();assert.equal((await second).name,'AbortError');assert.equal(h.reader.stats.throttled,1);
});
test('redirected pages and cross-origin requests are rejected',async()=>{
  const h=fixture(async()=>response('/users/sign_in'));
  await assert.rejects(h.reader.read('/buildings/1'),/different page/);
  await assert.rejects(h.reader.read('https://example.com/buildings/1'),/Origin/);
});
test('quick refresh preserves strict reuse rules and full verify never reuses a vehicle',()=>{
  const c=functions(['getPersonnelRegisterCanonicalProfiles','isPersonnelRegistryVehicleSnapshotReusable'],{Date,PERSONNEL_REGISTER_REVERIFY_AGE_MS:30*86400000});
  const input={vehicle:{vehicleId:'1',vehicleTypeId:'5'},station:{href:'/buildings/2'},expectedProfiles:[['critical_care']],snapshotSafe:true,fullVerify:false,
    existingEntry:{vehicleId:'1',vehicleTypeId:'5',stationHref:'/buildings/2',assignmentScanComplete:true,trainingProfilesComplete:true,source:'personnel-register-exact-test',updatedAt:Date.now(),assignedPersonnelCount:1,assignedTrainingProfiles:[['critical_care']]}};
  assert.equal(c.isPersonnelRegistryVehicleSnapshotReusable(input),true);
  for(const change of [{fullVerify:true},{snapshotSafe:false},{expectedProfiles:[['other']]},{existingEntry:{...input.existingEntry,updatedAt:Date.now()-31*86400000}},{existingEntry:{...input.existingEntry,assignmentScanComplete:false}}])assert.equal(c.isPersonnelRegistryVehicleSnapshotReusable({...input,...change}),false);
});
test('ordinary personnel operations retain the original paced fetch path',async()=>{
  let original=0,register=0;
  const c=functions(['personnelFetchDocument'],{PERSONNEL_STATE:{registerBuilding:false,registerReader:{read:async()=>register++}},personnelFetchResponse:async()=>{original++;return {ok:true,url:origin+'/buildings/1',text:async()=>''};},DOMParser:class{parseFromString(){return {}; }},URL,location:{origin}});
  await c.personnelFetchDocument('/buildings/1');assert.equal(original,1);assert.equal(register,0);
  c.PERSONNEL_STATE.registerBuilding=true;await c.personnelFetchDocument('/buildings/1');assert.equal(original,1);assert.equal(register,1);
});

for(const expirePrefetch of [false,true])test(`station prefetch overlaps safely; expired snapshot refetched=${expirePrefetch}`,async()=>{
  const calls=[],buttons={disabled:false,textContent:''};let release;
  const firstVerified=new Promise(resolve=>release=resolve);
  const state={running:false,registerBuilding:false};
  let now=Date.now();class ScanDate extends Date {static now(){return now;}}
  const c=functions(['buildPersonnelTrainingRegisterOneClick'],{
    STATE:{running:false},STATION_STATE:{running:false},PERSONNEL_STATE:state,Date:ScanDate,Map,Set,
    document:{querySelector:()=>({...buttons})},getPersonnelRegisterStationEntries:()=>[1,2].map(n=>({href:'/buildings/'+n,displayName:String(n)})),
    readPersonnelTrainingRegistry:()=>({vehicles:{}}),createPersonnelRegisterReader:()=>({stats:{requests:0,throttled:0},cancel(){}}),
    setPersonnelTrainingRegistryTransferDisabled(){},setPersonnelUiValue(){},personnelLog(){},waitIfPersonnelPaused:async()=>{},
    personnelFetchDocument:async href=>{calls.push('fetch:'+href);return {doc:{querySelector:()=>true}};},
    getPersonnelVehicleQueue:()=>[{vehicleId:'10'}],getPersonnelStationAssignmentSnapshot:()=>({evidence:[],safe:true,profilesByVehicle:new Map()}),
    isPersonnelRegistryVehicleSnapshotReusable:()=>false,
    runPersonnelRegisterVehicleVerificationPool:async({station})=>{calls.push('verify:'+station.href);if(station.href.endsWith('/1'))await firstVerified;return {exactPagesRead:0,failedVehicles:0,failedVehicleIds:[],verifiedVehicles:[]};},
    flushPersonnelTrainingRegistry(){},getPersonnelTrainingRegistryStats:()=>({count:0}),renderPersonnelReport(){},updatePersonnelTrainingRegistryStatus(){}
  });
  const work=c.buildPersonnelTrainingRegisterOneClick();await delay(10);
  assert.deepEqual(calls,['fetch:/buildings/1','fetch:/buildings/2','verify:/buildings/1']);
  if(expirePrefetch)now+=11000;
  release();await work;assert.equal(calls.at(-1),'verify:/buildings/2');assert.equal(state.running,false);assert.equal(state.registerReader,null);
  assert.equal(calls.filter(x=>x==='fetch:/buildings/2').length,expirePrefetch?2:1);
});
