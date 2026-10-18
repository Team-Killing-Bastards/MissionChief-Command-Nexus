import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('./extension/nexus-runtime.js', import.meta.url), 'utf8');
function fn(name) {
  const start = new RegExp('^ {0,8}(?:async )?function ' + name + '\\(', 'm').exec(source);
  assert(start, name);
  const end = /\n {0,4}(?:async )?function /.exec(source.slice(start.index + start[0].length));
  assert(end, name);
  return source.slice(start.index, start.index + start[0].length + end.index);
}
let checks = 0;
const plain = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const eq = (a,b,m) => { assert.deepEqual(plain(a),plain(b),m); checks++; };
const requirement = 'HazMat Units or CBRN Vehicles';
function fixture(rows, custom = null) {
  const boxes = rows.map((r,i) => ({id:String(i+1), type:String(r[0]), eta:r[1], checked:!!r[2], disabled:!!r[3]}));
  const flags = {owner:true, ready:true, staffingBlocked:false, quarantine:new Set()};
  const c = vm.createContext({
    console, mfDebugEnabled:false, processedSelectionKeys:new Set(), vehicleLoadState:{rows:[]},
    MF_FIRE_OPERATIONAL_SUPPORT_TYPE_ID:'39', MF_HAZMAT_OSU_REQUIREMENT_NAMES:new Set(['hazmat','hazmat unit','hazmat units','hazmat units or cbrn vehicles']),
    getVehicleTypeIdentifiers:b=>[b.type], getExtendedVehicleValues:()=>[], getVehicleCheckboxSnapshot:()=>boxes,
    sortVehicleCheckboxesByBestArrival:items=>items.slice().sort((a,b)=>a.eta-b.eta),
    mfApplyStoredStaffingQuarantine:()=>{for(const b of boxes)if(flags.quarantine.has(b.id))b.disabled=true;},
    getCoastguardRescueHelicopterTypeId:()=>null, nexusLifeguardAlternativeTypes:()=>null, nexusWaterCarrierTypes:()=>null,
    isCurrentMissionExecutionOwner:()=>flags.owner, detectAndLatchStaffingBlock:()=>flags.staffingBlocked,
    mfApplyAmbulanceMissionLimitToSelectionAmount:()=>({applied:false}), buildSelectionKey:(...a)=>a.join('|'),
    renderVehicleLoadList:()=>{}, highDebugLog:()=>{}, getVehicleDebugName:b=>b.id,
    clickVehicleElement:b=>{if(b.disabled||b.checked)return false;b.checked=true;return true;},
    __NEXUS_RULES__:{isReady:()=>flags.ready, lookup:()=>custom}, resolveUnitName:()=> 'OSU'
  });
  c.window=c;
  for(const name of ['nexusIsFlexibleSarSupportRequirement','isFireEngineRequirement','isAmbulanceTransportRequest',
    'getPrvSrvRequirementTypeId','isAerialApplianceOrRescueStairsRequirement','isFireEngineOrRivRequirement',
    'isFlatbedRecoveryVehicleRequirement','isSearchDogUnitRequirement','isHgvRecoveryVehicleRequirement','isAirfieldOperationsSupervisorRequirement'])c[name]=()=>false;
  for(const name of ['normaliseVehicleText','isHazMatOsuRequirement','isFireOperationalSupportRequirement',
    'isFireOperationalSupportUnitCheckbox','nexusHazmatAlternativeTypes','nexusPoliceAlternativeTypes','nexusFleetPreferenceTypes',
    'nexusFleetMatches','getAllMatchingVehicleCheckboxes','getMatchingVehicleCheckboxes','countSelectedMatchingVehicles',
    'findUnitButton','selectVehicleUnits','collapseSharedFireOperationalSupportRequirements'])vm.runInContext(fn(name),c);
  return {c,boxes,flags,select:(n=3,name=requirement)=>c.selectVehicleUnits(name,'OSU',n,'TEST'),
    selected:()=>boxes.filter(b=>b.checked).map(b=>b.id), count:(name=requirement)=>c.countSelectedMatchingVehicles(name,'OSU')};
}
let f = fixture([]);
for(const name of [requirement,'HazMat','HazMat Unit','Required HazMat Units','HazMat/CBRN',
  'Required: 3 x HazMat Units or CBRN Vehicles x3','hazmat unit or cbrn vehicle']) {
  eq(f.c.nexusHazmatAlternativeTypes(name,'OSU'),['39','7','32'],name);
}
eq(f.c.nexusHazmatAlternativeTypes('Required CBRN Vehicles','OSU'),['39','32'],'Specific CBRN retains its own type');
for(const name of ['BASU','Breathing Apparatus Support Units','Welfare Vehicles','Operational Support Unit',
  'HazMat Personnel','HazMat Training','Operational Support Vans, Trailers or Personal SAR Vehicles','Fire Engines']) {
  eq(f.c.nexusHazmatAlternativeTypes(name,'OSU'),null,'No widening: '+name);
}
f=fixture([[7,1],[32,2],[39,90],[39,60],[39,75]]);
eq(f.c.getMatchingVehicleCheckboxes(requirement,'OSU').map(b=>b.id),['4','5','3','1','2']);
eq(f.select().missing,0);eq(f.selected(),['3','4','5'],'OSUs precede faster specialist vehicles');eq(f.count(),3);
f=fixture([[7,1],[32,2],[39,90],[39,60]]);f.select();eq(f.selected(),['1','3','4'],'Two OSUs plus one HazMat');
f=fixture([[7,5],[32,1],[7,3],[39,90]]);f.select();eq(f.selected(),['1','3','4'],'OSU then earliest HazMat units');
f=fixture([[7,5],[32,1],[39,90]]);f.select();eq(f.count(),3,'All three types combine');
f=fixture([[32,1],[7,5],[7,3]]);f.select();eq(f.selected(),['1','2','3'],'No OSU: specialist fleet fills demand');
f=fixture([[32,3],[32,2],[32,1],[32,4]]);f.select();eq(f.selected(),['1','2','3'],'CBRN-only fleet');
f=fixture([[39,1,false,true],[7,2],[32,3],[32,4]]);f.select();eq(f.selected(),['2','3','4'],'Disabled OSU excluded');
f=fixture([[39,1],[7,2],[32,3],[32,4]]);f.flags.quarantine.add('1');f.select();eq(f.selected(),['2','3','4'],'Staffing quarantine retained');
f=fixture([[39,1],[7,2]]);eq(f.select().missing,1);eq(f.count(),2,'Shortage stays visible');
f=fixture([[39,1,true,true],[7,2],[32,3]]);eq(f.count(),1);f.select(2);eq(f.count(),3,'Existing selection counted once');
for(const type of ['39','7','32']) {
  f=fixture([[39,3],[7,2],[32,1]],{vehicleTypeId:type});
  eq(f.c.findUnitButton('OSU',requirement).type,'39','Old single-type mapping keeps preference');
  f.select();eq(f.count(),3,'Old single-type mapping keeps alternatives');
}
f=fixture([[139,1],[107,1],[132,1],[7,2]]);eq(f.select().missing,2,'Exact type IDs');
for(const flag of ['owner','ready']) {f=fixture([[39,1],[7,2],[32,3]]);f.flags[flag]=false;f.select();eq(f.count(),0,flag+' guard');}
f=fixture([[39,1],[7,2],[32,3]]);f.flags.staffingBlocked=true;f.select();eq(f.count(),0,'Staffing block');
f=fixture([[39,1],[7,2],[32,3]]);f.select();eq(f.select().skipped,true,'Duplicate selection guard');eq(f.count(),3);
// Shared OSUs may cover several capabilities, but specialist alternatives may not.
for(const order of [[requirement,'Welfare Vehicles','BASU'],['BASU','Welfare Vehicles',requirement]]) {
  f=fixture([[39,3],[39,4],[7,1],[32,2]]);
  const rows=order.map(unitName=>({unitName,stillNeeded:unitName===requirement?3:unitName==='BASU'?1:2}));
  const collapsed=f.c.collapseSharedFireOperationalSupportRequirements(rows);
  eq(collapsed.length,2,'HazMat not collapsed into the shared OSU row');
  eq(collapsed.find(r=>r.unitName===requirement).sharedOperationalSupportRequirement,undefined,'HazMat keeps own coverage');
  for(const row of collapsed)f.select(Math.max(0,row.stillNeeded-f.count(row.unitName)),row.unitName);
  eq(f.count(),3);eq(f.count('Welfare Vehicles'),2);eq(f.count('BASU'),2);eq(f.selected().length,3,'Shared OSUs avoid redundant units');
}
f=fixture([[7,1],[32,2],[7,3]]);f.select();eq(f.count(),3);
eq(f.count('Welfare Vehicles'),0,'HazMat and CBRN do not cover Welfare');
eq(f.count('BASU'),0,'HazMat and CBRN do not cover BASU');
f=fixture([[7,1],[32,2],[39,3]]);f.select(2,'CBRN Vehicles');eq(f.selected(),['2','3'],'Specific CBRN does not select HazMat-only vehicle');
const result={checks,order:['39','7','32'],liveGameVerified:false};
fs.writeFileSync(new URL('./hazmat-validation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
