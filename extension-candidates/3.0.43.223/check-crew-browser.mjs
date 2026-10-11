import fs from 'node:fs';
import assert from 'node:assert/strict';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const source=read('./extension/nexus-runtime.js');
function fn(name) {const a=[...source.matchAll(new RegExp('^ {0,8}(?:async )?function '+name+'\\(','gm'))].at(-1);assert(a,name);const b=/\n {0,4}(?:async )?function /.exec(source.slice(a.index+a[0].length));return source.slice(a.index,a.index+a[0].length+b.index);}
const names=['isStrictLiveVerifiedTrainingEntry','isAuthoritativeLivePoliceTrainingEntry','nexusFreshLiveTrainingEntry',
 'getTrainingRequirementPersonnelTarget','getTrainingRequirementRequiredCodes','getTrainingRequirementEligibleTypeIds','getTrainingRequirementVehicleCapacity','getTrainingRequirementVehicleTypeId','getRegistryTrainingQualifiedCount','getTrainingRequirementQualifiedCount','getTrainingRequirementNominalCapacity','getTrainingCandidatePersonnelProfiles','isCheckboxVehicleTypeEligibleForTrainingRequirement','isCheckboxEligibleForTrainingRequirement','doesTrainingProfileSatisfyRequirement','applyTrainingCandidateCoverage','getRegistryTrainingCountsForCheckbox','getRemainingTrainedPersonnelRequirements','getUnverifiedRegistryTrainingHintScore','orderStrictPoliceTrainingCandidates','hasStrictPoliceTrainingRequirement','getTrainedCandidateMetrics','getTrainedVehicleSelectionScore','applyTrainingCandidateToRemaining','countSelectedTrainingVehicles','selectVehiclesForTrainedPersonnelRequirements','areTrainedPersonnelRequirementsSatisfied','parseVehicleIdFromAssignmentLink','getMissionTrainingCombinationKey','parseLivePoliceTrainingAssignments','savePersonnelTrainingRegistry','refreshPoliceInspectorRegistryFromLiveVehicles'];
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
try {
 const page=await browser.newPage(),errors=[],requests=[];let untrained=false;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{
  const u=new URL(r.request().url());check(r.request().method()==='GET','fixture cannot perform game writes');
  const id=u.pathname.match(/^\/vehicles\/(\d+)\/zuweisung$/)?.[1];
  if(id){requests.push(id);return r.fulfill({contentType:'text/html',body:'<img class="vehicle_image_reload" vehicle_type_id="75"><table id="personal_table"><thead><tr><th>Name</th><th>Training</th><th>Binding</th></tr></thead><tbody>'+Array.from({length:300},(_,i)=>`<tr data-filterable-by="${i<2&&!untrained?'arff':''}"><td>Person ${i}</td><td>${i<2&&!untrained?'ARFF':''}</td><td>${i<2?`<a class="btn-assigned" href="/vehicles/${id}/zuweisungDo/${i+1}">Remove binding</a>`:'Unassigned'}</td></tr>`).join('')+'</tbody></table>'});}
  return r.fulfill({contentType:'text/html',body:'<a id="navbar_profile_link" href="/profile/555">Player</a>'+Array.from({length:66},(_,i)=>`<input id="${1000+i}" type="checkbox" vehicle_type_id="75">`).join('')});
 });
 async function install(){
  await page.goto('https://www.missionchief.co.uk/missions/101');
  await page.addScriptTag({content:read('./extension/nexus-personnel-store.js')});
  await page.evaluate(async()=>{await NexusPersonnelStore.ready();window.commitCount=0;const store=NexusPersonnelStore;
   window.NexusPersonnelStore={...store,get player(){return store.player;},write:async(...a)=>{window.commitCount++;return store.write(...a);}};
   Object.assign(window,{MF_LIVE_TRAINING_VERIFY_CACHE_MS:600000,MF_LIVE_TRAINING_VERIFY_BATCH_SIZE:6,MF_STRICT_TRAINING_SOURCE_PREFIX:'mission-finder-live-strict-',MF_EXACT_REGISTER_TRAINING_SOURCE_PREFIX:'personnel-register-exact-',MF_EXACT_REGISTER_TRAINING_MAX_AGE_MS:180*86400000,MF_TRAINED_VEHICLE_CAPACITY_BY_TYPE:{'51':9,'8':2,'25':2},MF_PSU_COMPATIBLE_TRAINING_CODES:[],MF_PROTECTED_ORDINARY_IRV_TRAINING_CODES:[],autoModeRunning:true,mfDebugEnabled:false,
    getCurrentMissionIdForQueueRestart:()=> '101',isManualAutoStopActive:()=>false,isCurrentMissionExecutionOwner:()=>true,
    readPersonnelTrainingRegistry:()=>JSON.parse(NexusPersonnelStore.readRaw()),
    getVehicleCheckboxSnapshot:()=>Array.from(document.querySelectorAll('input[type=checkbox]')),
    getMissionVehicleId:b=>b.id,getVehicleTypeIdentifiers:b=>[b.getAttribute('vehicle_type_id')],
    sortVehicleCheckboxesByBestArrival:b=>b.slice(),getVehicleDebugName:b=>b.id,
    getRegistryEntryForMissionCheckbox:(b,r)=>({entry:r.vehicles[b.id]?.vehicleTypeId===b.getAttribute('vehicle_type_id')?r.vehicles[b.id]:null}),
    nexusApplyCommittedTraining:r=>r,clickVehicleElement:b=>{b.checked=true;return true;},debugLog:()=>{}});
  });
  await page.addScriptTag({content:names.map(n=>fn(n)).join('\n')});
 }
 const run=()=>page.evaluate(async()=>{
  const requirements=[{code:'arff',label:'ARFF',personnelRequired:132,eligibleVehicleTypeIds:['75'],vehicleCapacityByType:{'75':4},requiredTrainingCodes:['arff']}];
  const started=performance.now();const scan=await refreshPoliceInspectorRegistryFromLiveVehicles(requirements,'BROWSER');
  const selected=selectVehiclesForTrainedPersonnelRequirements(requirements,'BROWSER');
  return {scan,selected:selected.satisfied,count:getVehicleCheckboxSnapshot().filter(b=>b.checked).length,commits:commitCount,elapsedMs:Math.round(performance.now()-started),rows:Object.keys(readPersonnelTrainingRegistry().vehicles).length};
 });
 await install();const cold=await run();check(cold.scan.complete,'real parser completes 66 assignment pages');check(cold.selected&&cold.count===66,'132 real parsed ARFF occupants covered');check(cold.commits===1,'one real IDB commit');check(requests.length===66,'66 live assignment reads');
 await install();const fresh=await run();check(fresh.scan.complete&&fresh.selected,'fresh evidence survives a new page realm');check(fresh.commits===0&&requests.length===66,'no repeats after navigation');
 // A concurrent new record replaces the old profile and cannot receive the old qualification count.
 await page.evaluate(async()=>{const r=readPersonnelTrainingRegistry();const e={...r.vehicles['1000'],updatedAt:Date.now(),source:'personnel-register-exact-assigned',assignedPersonnelCount:0,assignedTrainingProfiles:[],trainingCounts:{arff:0}};await NexusPersonnelStore.write({schemaVersion:1,vehicles:{1000:e}});getVehicleCheckboxSnapshot().forEach(b=>b.checked=false);});
 untrained=true;const changed=await run();check(!changed.selected,'changed assignment blocks full crew coverage');check(requests.length===67,'only changed evidence reread');
 await page.evaluate(async()=>{document.querySelector('#navbar_profile_link').href='/profile/556';await NexusPersonnelStore.ready();});
 check(await page.evaluate(()=>Object.keys(readPersonnelTrainingRegistry().vehicles).length===0),'different game account cannot reuse prior crew evidence');
 check(errors.length===0,JSON.stringify(errors));
 const report={checks,cold,fresh,changed,requests:requests.length,liveGameVerified:false,scope:'Isolated Edge fixture; actual assignment parser and IndexedDB; all routes intercepted'};
 fs.writeFileSync(new URL('./crew-browser-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} finally {await browser.close();}
