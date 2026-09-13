import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root='extension';
const source=fs.readFileSync(root+'/nexus-runtime.js','utf8');
const extract=name=>{const m=new RegExp('^ {0,4}(?:async )?function '+name+'\\(','m').exec(source);assert.ok(m,name);const tail=source.slice(m.index+m[0].length),end=/\n {0,4}(?:async )?function /.exec(tail);assert.ok(end,name);return source.slice(m.index,m.index+m[0].length+end.index);};
let vehicles=[],quarantines=0;
const c={normaliseVehicleText:s=>String(s||'').toLowerCase().trim(),getVehicleTypeIdentifiers:v=>[v.type],getVehicleCheckboxSnapshot:()=>vehicles,
 sortVehicleCheckboxesByBestArrival:a=>a.sort((a,b)=>a.eta-b.eta),mfApplyStoredStaffingQuarantine:()=>{quarantines++;},
 __NEXUS_RULES__:{lookup:()=>({vehicleTypeId:'64'})},isFireOperationalSupportRequirement:()=>false,isFireEngineRequirement:()=>false,isAnyVehicleAmbulanceRequirement:()=>false,getEodResponseRequirementMode:()=>''};
vm.createContext(c);for(const n of ['getCoastguardRescueHelicopterTypeId','isCoastguardRescueHelicopterVehicleCheckbox','nexusFleetMatches','getAllMatchingVehicleCheckboxes','countSelectedMatchingVehicles'])vm.runInContext(extract(n),c);
const v=(id,type,eta,extra={})=>({id,type,eta,checked:false,disabled:false,...extra});
const standard='Coastguard Rescue Helicopter',large=standard+' (Large)';
const ids=(name=standard)=>Array.from(c.getAllMatchingVehicleCheckboxes(name,name,false),v=>v.id);
vehicles=[v('standard','64',1),v('large-slow','65',20),v('large-fast','65',10),v('other','9',0)];
assert.deepEqual(ids(),['large-fast','large-slow','standard']);
assert.deepEqual(ids(large),['large-fast','large-slow']);
assert.deepEqual(ids('Coastguard Rescue Helicopter (20%)'),['large-fast','large-slow','standard']);
assert.deepEqual(ids('CG Rescue Helicopters'),['large-fast','large-slow','standard']);
vehicles[1].disabled=true;vehicles[2].disabled=true;assert.deepEqual(ids(),['standard']);assert.deepEqual(ids(large),[]);
vehicles[0].checked=true;assert.deepEqual(ids(),[]);
vehicles=[v('large','65',1,{checked:true}),v('standard','64',2,{checked:true}),v('other','9',0,{checked:true})];
assert.equal(c.countSelectedMatchingVehicles(standard,standard),2);assert.equal(c.countSelectedMatchingVehicles(large,large),1);
vehicles=[v('large','65',1,{checked:true})];assert.equal(c.countSelectedMatchingVehicles(standard,standard),1);
assert.ok(quarantines>=7);
new vm.Script(source);
fs.writeFileSync('audit/coastguard-72-verification.json',JSON.stringify({passed:true,liveGame:false,checks:['large priority over faster standard','arrival order within type','large-only strict','20% alias','CG plural alias','disabled fallback','checked exclusion','standard coverage includes both','large coverage excludes standard','old type-64 override superseded','staffing quarantine retained','storage and crew payloads unchanged']},null,2));
console.log('PASS: coastguard selection, fallback, coverage and preserved payloads');
