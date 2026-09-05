import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),acorn=require('internal/deps/acorn/acorn/dist/acorn');
const names=new Set(['buildPersonnelTrainingRegisterOneClick','runPersonnelRegisterVehicleVerificationPool','createPersonnelRegisterReader','personnelFetchDocument','personnelFetchResponse','waitForPersonnelRequestSlot','waitPersonnelDelay']);
function extract(file){const source=fs.readFileSync(file,'utf8'),found=[];function visit(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&names.has(n.id.name)){found.push(source.slice(n.start,n.end));return;}for(const v of Object.values(n))if(Array.isArray(v))v.forEach(visit);else if(v?.type)visit(v);}visit(acorn.parse(source,{ecmaVersion:'latest'}));return found.join('\n');}
const baseline=extract('reference/original-extension/nexus-runtime.js'),candidate=extract('extension/nexus-runtime.js');
async function measure(source,fullVerify,launchGap){
  const start=1000000;let now=start,id=0,requests=0,active=0,peak=0;const timers=new Map();
  const timeout=(fn,ms)=>{timers.set(++id,{at:now+Math.max(0,ms),fn});return id;};
  const sleep=ms=>new Promise(resolve=>timeout(resolve,ms));
  class ClockDate extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}}
  const stations=Array.from({length:12},(_,i)=>({href:'/buildings/'+(i+1),displayName:'Station '+(i+1)}));
  const vehiclesFor=href=>Array.from({length:6},(_,i)=>({vehicleId:href.split('/').at(-1)+'0'+i,name:'Vehicle '+i,assignmentHref:'/vehicles/'+href.split('/').at(-1)+'0'+i+'/zuweisung'}));
  const registry={vehicles:Object.fromEntries(stations.flatMap(s=>vehiclesFor(s.href).map(v=>[v.vehicleId,{stationHref:s.href}])))};
  const c=vm.createContext({Date:ClockDate,Promise,Set,Map,URL,DOMException,AbortController,setTimeout:timeout,clearTimeout:i=>timers.delete(i),sleep,
    STATE:{running:false},STATION_STATE:{running:false},PERSONNEL_STATE:{running:false,registerBuilding:false,lastRequestAt:0},
    PERSONNEL_REQUEST_GAP_MS:650,PERSONNEL_REGISTER_LAUNCH_GAP_MS:launchGap,PERSONNEL_REGISTER_MAX_CONCURRENCY:3,
    isIosSafariWebsite:()=>false,location:{origin:'https://www.missionchief.co.uk'},
    getSameOriginResourceUrl:u=>new URL(u,'https://www.missionchief.co.uk'),
    fetch:async url=>{requests++;active++;peak=Math.max(peak,active);await sleep(200);active--;return {ok:true,status:200,url:'https://www.missionchief.co.uk'+url,text:async()=>url};},
    DOMParser:class{parseFromString(html){return {html,querySelector:()=>true};}},document:{querySelector:()=>({disabled:false,textContent:''})},
    getPersonnelRegisterStationEntries:()=>stations,readPersonnelTrainingRegistry:()=>registry,
    setPersonnelTrainingRegistryTransferDisabled(){},setPersonnelUiValue(){},personnelLog(){},waitIfPersonnelPaused:async()=>{},
    getPersonnelVehicleQueue:doc=>vehiclesFor(doc.html),getPersonnelStationAssignmentSnapshot:()=>({evidence:[],safe:true,profilesByVehicle:new Map()}),
    isPersonnelRegistryVehicleSnapshotReusable:input=>!input.fullVerify,
    parseVehicleAssignmentPage:()=>({rows:[]}),mergePersonnelRegisterEvidence(){},publishPersonnelVehicleTrainingRegistry:({vehicles})=>vehicles.length,
    flushPersonnelTrainingRegistry(){},getPersonnelTrainingRegistryStats:()=>({count:72}),renderPersonnelReport(){},updatePersonnelTrainingRegistryStatus(){}
  });vm.runInContext(source,c);
  let done=false,error;const task=c.buildPersonnelTrainingRegisterOneClick({fullVerify}).then(()=>done=true,e=>{done=true;error=e;});
  for(let steps=0;!done&&steps<100000;steps++){
    await new Promise(setImmediate);if(done)break;
    const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next)throw Error('Benchmark deadlocked');
    timers.delete(next[0]);now=next[1].at;next[1].fn();
  }
  await task;if(error)throw error;return {seconds:(now-start)/1000,requests,peakConcurrent:peak};
}
const report={type:'Deterministic simulation; not a live MissionChief benchmark',assumptions:{stations:12,vehiclesPerStation:6,networkResponseMs:200,parseAndStorageMs:0,quickMode:'all exact records safely reusable'},results:{}};
for(const full of [false,true]){const before=await measure(baseline,full,350),after=await measure(candidate,full,250);report.results[full?'full':'quick']={before,after,reductionPercent:Math.round((1-after.seconds/before.seconds)*100)};}
fs.writeFileSync('audit/personnel-scanner-benchmark.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
