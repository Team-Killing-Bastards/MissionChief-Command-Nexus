import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./extension/nexus-runtime.js',import.meta.url),'utf8');
const previous=fs.readFileSync(new URL('../3.0.43.223/extension/nexus-runtime.js',import.meta.url),'utf8');
function fn(name,text=source) {
  const start=[...text.matchAll(new RegExp('^ {0,8}(?:async )?function '+name+'\\(','gm'))].at(-1);
  assert(start,name);
  const end=/\n {0,4}(?:async )?function /.exec(text.slice(start.index+start[0].length));
  assert(end,name);
  return text.slice(start.index,start.index+start[0].length+end.index);
}
let checks=0;
const eq=(a,b,message)=>{assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),message);checks++;};
const requirement='Police Cars or Armed Response Vehicles (ARVs)';
const functions=['normaliseVehicleText','nexusPoliceAlternativeTypes','nexusFleetPreferenceTypes',
  'nexusFleetMatches','getAllMatchingVehicleCheckboxes','getMatchingVehicleCheckboxes',
  'countSelectedMatchingVehicles','findUnitButton','selectVehicleUnits',
  'isArmedResponsePersonnelRequirementName','getArmedResponsePersonnelRequirements'];
function fixture(rows,custom=null) {
  const boxes=rows.map((r,i)=>({id:String(i+1),type:String(r[0]),eta:r[1],checked:!!r[2],disabled:!!r[3]}));
  const flags={owner:true,staffingBlocked:false,ready:true,quarantined:new Set()};
  const c=vm.createContext({
    console,mfDebugEnabled:false,processedSelectionKeys:new Set(),vehicleLoadState:{rows:[]},
    getVehicleTypeIdentifiers:b=>[b.type],getVehicleCheckboxSnapshot:()=>boxes,
    sortVehicleCheckboxesByBestArrival:items=>items.slice().sort((a,b)=>a.eta-b.eta),
    mfApplyStoredStaffingQuarantine:()=>{for(const b of boxes)if(flags.quarantined.has(b.id))b.disabled=true;},
    getCoastguardRescueHelicopterTypeId:()=>null,nexusLifeguardAlternativeTypes:()=>null,nexusWaterCarrierTypes:()=>null,
    isCurrentMissionExecutionOwner:()=>flags.owner,detectAndLatchStaffingBlock:()=>flags.staffingBlocked,
    mfApplyAmbulanceMissionLimitToSelectionAmount:()=>({applied:false}),
    buildSelectionKey:(...a)=>a.join('|'),renderVehicleLoadList:()=>{},highDebugLog:()=>{},
    getVehicleDebugName:b=>b.id,clickVehicleElement:b=>{if(b.disabled||b.checked)return false;b.checked=true;return true;},
    __NEXUS_RULES__:{isReady:()=>flags.ready,lookup:()=>custom},
    normalisePublicOrderTrainedRequirements:items=>items
  });
  c.window=c;
  for(const name of functions)vm.runInContext(fn(name),c);
  return {c,boxes,flags,select:(n=3,options=null)=>c.selectVehicleUnits(requirement,'Police ATC',n,'TEST',options),
    selected:()=>boxes.filter(b=>b.checked).map(b=>b.id),count:()=>c.countSelectedMatchingVehicles(requirement,'Police ATC')};
}
let f=fixture([]);
for(const wording of [requirement,'Police Cars or Armed Response Vehicles','police car or armed response vehicle (ARV)',
  'Required Police Cars or Armed Response Vehicles (ARVs)','3 Police Cars or Armed Response Vehicles (ARVs)',
  'Requires: 3 x Police Cars or Armed Response Vehicles (ARVs) x3']) {
  eq(f.c.nexusPoliceAlternativeTypes(wording,'Police ATC'),['25','13','8'],wording);
}
for(const wording of ['Police Cars','Traffic Cars','Armed Response Vehicles','Armed Response Personnel',
  'Armed Response Personnel (In Armed Vehicles)','Police Officers','Fire Engines','Police Cars or Helicopters']) {
  eq(f.c.nexusPoliceAlternativeTypes(wording,'Police ATC'),null,'Do not widen '+wording);
}
f=fixture([[8,1],[13,2],[25,90],[25,60],[25,75]]);
eq(f.c.getMatchingVehicleCheckboxes(requirement,'Police ATC').map(b=>b.id),['4','5','3','2','1']);
eq(f.select().missing,0);eq(f.selected(),['3','4','5'],'ATCs precede faster ARV and Police Car');eq(f.count(),3);
f=fixture([[8,1],[13,2],[25,90],[25,60]]);f.select();eq(f.selected(),['2','3','4'],'2 ATC + 1 ARV');
f=fixture([[8,1],[13,2],[13,3],[25,90]]);f.select();eq(f.selected(),['2','3','4'],'1 ATC + 2 ARV');
f=fixture([[8,1],[13,2],[13,3]]);f.select();eq(f.selected(),['1','2','3'],'No ATC: 2 ARV + 1 Police Car');
f=fixture([[8,20],[8,3],[8,10],[8,1]]);f.select();eq(f.selected(),['2','3','4'],'No armed vehicles: earliest 3 Police Cars');
f=fixture([[25,1,false,true],[13,2],[8,3],[8,4]]);f.select();eq(f.selected(),['2','3','4'],'Unavailable ATC excluded');
f=fixture([[25,1],[13,2],[8,3],[8,4]]);f.flags.quarantined.add('1');f.select();eq(f.selected(),['2','3','4'],'Staffing quarantine retained');
f=fixture([[25,1],[13,2]]);eq(f.select().missing,1,'Insufficient pool remains a shortfall');eq(f.count(),2);
f=fixture([[25,30,true,true],[13,10],[8,1],[8,2]]);eq(f.count(),1);f.select(2);eq(f.count(),3);eq(f.selected(),['1','2','3'],'Existing selection counted once');
f=fixture([[25,5],[13,4],[8,3]],{vehicleTypeId:'25',vehicleName:'Police ATC'});f.select();eq(f.count(),3,'Legacy single-type rule retains fallback');
eq(f.c.findUnitButton('Police ATC',requirement),null,'No duplicate fallback after all selected');
f=fixture([[25,5],[13,4],[8,3]],{vehicleTypeId:'13',vehicleName:'Armed Response Vehicle'});
eq(f.c.findUnitButton('Armed Response Vehicle',requirement).type,'25','Button path shares ATC preference');
f.select();eq(f.count(),3);
f=fixture([[125,1],[113,1],[18,1],[8,2]]);eq(f.select().missing,2,'Exact IDs only');eq(f.selected(),['4']);
for(const flag of ['owner','ready']) {f=fixture([[25,1],[13,2],[8,3]]);f.flags[flag]=false;f.select();eq(f.count(),0,flag+' gate remains');}
f=fixture([[25,1],[13,2],[8,3]]);f.flags.staffingBlocked=true;f.select();eq(f.count(),0,'Staffing block remains');
f=fixture([[25,1],[13,2],[8,3]]);f.select(3,{isRequirementSatisfied:()=>f.count()>=1});eq(f.count(),1,'Live requirement can stop selection');
f=fixture([[25,1],[13,2],[8,3]]);f.select();eq(f.select().skipped,true,'Duplicate selection guard remains');eq(f.count(),3);
eq(f.c.getArmedResponsePersonnelRequirements(requirement,'3'),[],'Vehicle alternative does not create a personnel requirement');
eq(f.c.getArmedResponsePersonnelRequirements('Armed Response Personnel (In Armed Vehicles)','6'),
  [{code:'armed_response_personnel',label:'Armed Response Personnel',required:6}],'Real armed personnel requirements remain separate');
for(const name of ['normalisePublicOrderTrainedRequirements','getRemainingTrainedPersonnelRequirements',
  'selectVehiclesForTrainedPersonnelRequirements','applyTrainingCandidateCoverage','blockTrainedPersonnelDispatch',
  'claimAutoMissionDispatch','releaseAutoMissionDispatch','nexusCheckMissionProgress']) {
  eq(fn(name).replaceAll('3.0.43.224','3.0.43.223'),fn(name,previous),name+' unchanged');
}
const result={checks,order:['25','13','8'],liveGameVerified:false};
fs.writeFileSync(new URL('./police-alternatives-validation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
