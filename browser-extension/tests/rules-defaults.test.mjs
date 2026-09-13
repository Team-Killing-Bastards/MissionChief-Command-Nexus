import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {BUILT_IN_TYPE_RULES,builtInTypeRule,requirementKey} from '../extension/rules-core.mjs';
import {runtime,functions,events} from './helpers.mjs';
const exported=[['Coastguard Commanders','60'],['Drones','89'],['Hovercrafts (Trailer)','71'],['Any vehicle','5'],['car to tow','105']];
function ruleBridge(saved={schema:1,rules:[]},cache=null) {
  const storage=new Map(cache?[['nexusRequirementRulesCacheV1',JSON.stringify(cache)]]:[]);
  const document=events(),window={};
  const c=vm.createContext({document,window,Event:class{constructor(type){this.type=type;}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
  const a=runtime.indexOf("const RULES_KEY = 'nexusRequirementRulesV1';"),b=runtime.indexOf('// ==UserScript==',a);
  vm.runInContext(runtime.slice(a,b),c);
  const deliver=data=>document.dispatchEvent({type:'nexus-rules-delivery-v1',detail:JSON.stringify(data)});
  const api=window.__NEXUS_RULES__;assert.equal(api.isReady(),false);deliver(saved);assert.equal(api.isReady(),true);
  return {api,deliver,storage};
}
test('all five exported IDs are permanent defaults without import or saved rules',()=>{
  const {api,storage}=ruleBridge();
  for(const[name,id]of exported)assert.equal(api.lookup(name)?.vehicleTypeId,id,name);
  assert.equal(api.snapshot().count,0,'Defaults do not masquerade as saved overrides');
  assert.equal(api.snapshot().builtInTypeRules.length,5);
  assert.deepEqual(JSON.parse(storage.get('nexusRequirementRulesCacheV1')),{schema:1,rules:[]});
});
test('explicit singular/plural aliases handle casing, Required prefixes and quantities',()=>{
  const seen=new Set();
  for(const row of BUILT_IN_TYPE_RULES)for(const alias of row.aliases){
    assert.ok(!seen.has(requirementKey(alias)));seen.add(requirementKey(alias));
    for(const name of [alias,alias.toUpperCase(),` Required  3 ${alias} `,`${alias} x2`])assert.equal(builtInTypeRule(name)?.vehicleTypeId,row.vehicleTypeId,name);
  }
  for(const name of ['Police Drones','Police Helicopter or Drones','Truck to tow','HGVs to tow','Any vehicle training','Coastguard Rescue Helicopter','Drone operator'])assert.equal(builtInTypeRule(name),null,name);
});
test('real runtime selector uses exact IDs and rejects wrong-type names, checked and disabled units',()=>{
  const bridge=ruleBridge();
  for(const[name,id]of exported){
    const match={types:[Number(id)],name:'Renamed by player'},wrong={types:['999'],name:bridge.api.lookup(name).vehicleName};
    const checked={types:[id],checked:true},disabled={types:[id],disabled:true};
    const api=functions(['getAllMatchingVehicleCheckboxes','getCoastguardRescueHelicopterTypeId'],{normaliseVehicleText:s=>String(s||'').toLowerCase().trim(),__NEXUS_RULES__:bridge.api,mfApplyStoredStaffingQuarantine(){},getVehicleCheckboxSnapshot:()=>[wrong,disabled,checked,match],getVehicleTypeIdentifiers:i=>i.types,sortVehicleCheckboxesByBestArrival:x=>x});
    assert.deepEqual(api.getAllMatchingVehicleCheckboxes(name,'wrong display name',false),[match]);
    assert.deepEqual(api.getAllMatchingVehicleCheckboxes(name,'',true,true),[disabled,checked,match]);
  }
});
test('custom rules still override defaults; disabled custom rows fall back without being rewritten',()=>{
  const custom={requirement:'Drones',vehicleTypeId:'98',vehicleName:'User preference',enabled:true};
  const original={schema:1,rules:[custom,{...custom,requirement:'Any vehicle',enabled:false}]};
  const {api,storage}=ruleBridge(original);
  assert.equal(api.lookup('Drones').vehicleTypeId,'98');assert.equal(api.lookup('Any vehicle').vehicleTypeId,'5');
  assert.deepEqual(JSON.parse(storage.get('nexusRequirementRulesCacheV1')),original);
});
test('authoritative restored rules replace stale cache and remain fixed during selection',()=>{
  const custom={requirement:'Drones',vehicleTypeId:'98',vehicleName:'Preferred drone',enabled:true};
  const {api,deliver}=ruleBridge({schema:1,rules:[custom]},{schema:1,rules:[{...custom,vehicleTypeId:'88'}]});
  assert.equal(api.lookup('Drones').vehicleTypeId,'98');
  deliver({schema:1,rules:[]});assert.equal(api.lookup('Drones').vehicleTypeId,'98');
  assert.equal(ruleBridge().api.lookup('Drones').vehicleTypeId,'89');
});
test('flatbed towing keeps the existing strict type and capacity path',()=>{
  const api=functions(['isFlatbedRecoveryVehicleRequirement','isFlatbedRecoveryVehicleCheckbox'],{normaliseVehicleText:s=>String(s||'').toLowerCase(),isCarsToTowRequirementName:s=>/^(?:car|cars) to tow$/i.test(s),getVehicleTypeIdentifiers:i=>i.types});
  for(const name of ['car to tow','Cars to tow'])assert.equal(api.isFlatbedRecoveryVehicleRequirement(name,builtInTypeRule(name).vehicleName),true);
  assert.equal(api.isFlatbedRecoveryVehicleCheckbox({types:['105']}),true);
  for(const id of ['104','106','5'])assert.equal(api.isFlatbedRecoveryVehicleCheckbox({types:[id]}),false);
});
test('rules catalogue exposes every bundled alias with the same ID and label',()=>{
  const catalogue=JSON.parse(fs.readFileSync('extension/rules-catalogue.json'));
  for(const row of BUILT_IN_TYPE_RULES)for(const alias of row.aliases){
    const entry=catalogue.builtIn.find(r=>requirementKey(r.requirement)===requirementKey(alias));
    assert.equal(entry?.vehicleTypeId,row.vehicleTypeId);assert.equal(entry.vehicleName,row.vehicleName);
  }
});
