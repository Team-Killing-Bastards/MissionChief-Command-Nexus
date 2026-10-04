import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=n=>fs.readFileSync(new URL('../'+n,import.meta.url),'utf8');
const scope={};vm.createContext(scope);
vm.runInContext(read('nexus-station-profiles-data.js'),scope);
vm.runInContext(read('nexus-station-profiles-core.js'),scope);
const catalog=scope.NexusStationProfilesData,core=scope.NexusStationProfilesCore;
const profile={name:'Lifeguard fleet',buildingType:'37',units:[{type:'118',count:1,crew:2,training:['Lifeguard Training']},{type:'119',count:2,crew:4,training:['Lifeguard Training']},{type:'67',count:1,crew:0,training:[]},{type:'70',count:1,crew:0,training:[]}]};
assert.equal(core.validate(profile,catalog).units.length,4);
assert.throws(()=>core.validate({...profile,units:[{...profile.units[0],crew:3}]},catalog),/crew must/);
assert.throws(()=>core.validate({...profile,units:[{...profile.units[1],crew:5}]},catalog),/crew must/);
assert.throws(()=>core.validate({...profile,buildingType:'0'},catalog),/Invalid vehicle/);
const rules=JSON.parse(read('rules-catalogue.json'));
for(const id of ['118','119'])assert.equal(rules.vehicles.find(v=>v.id===id).service,'Coastguard & lifeboats');
const rt=read('nexus-runtime.js');
const classes=rt.match(/const UNIT_CLASS_TYPE_IDS_BY_STATION_TYPE = Object.freeze\(([^\n]+)\);/)[1];
const categories=vm.runInNewContext('('+classes+')');
for(const id of ['67','70','118','119'])assert(categories.COASTGUARD.includes(id));
const begin=rt.indexOf('const SAR_RULES ='),end=rt.indexOf('const MEDICAL_RULES =',begin);
const personnel={makePoliceRule:r=>r};vm.createContext(personnel);
vm.runInContext(rt.slice(begin,end)+';globalThis.rules=SAR_RULES;globalThis.buildings=SAR_PROFILE_BUILDING_TYPE_IDS;globalThis.all=SAR_ALL_RULES;',personnel);
assert.equal(personnel.rules.lifeguardQuad.target,2);
assert.equal(personnel.rules.lifeguard4x4.target,4);
for(const key of ['lifeguardQuadJet','lifeguard4x4Jet']){
 assert.deepEqual(Array.from(personnel.rules[key].companionVehicleTypeIds),['70']);
 assert.deepEqual(Array.from(personnel.rules[key].trainingAll),['jetski','gw_wasserrettung']);
 assert(personnel.all.includes(personnel.rules[key]));
}
for(const key of ['lifeguard','jetSki','all'])assert(personnel.buildings[key].includes('37'));
const data={window:{},location:{pathname:'/buildings/123'}};data.window.top=data.window;vm.createContext(data);
vm.runInContext(read('nexus-comfort-data.js'),data);
for(const id of ['118','119'])assert.equal(data.window.__NEXUS_COMFORT_DATA__.types[id].max,catalog.vehicles[id].max);
assert(data.window.__NEXUS_COMFORT_DATA__.groups.find(g=>g.name==='Water').types.includes(118));
for(const file of ['nexus-station-rename.js','nexus-dispatch-centre-rename.js','nexus-runtime.js']){
 assert(read(file).includes('"118": "Lifeguard Quadbike"'));
 assert(read(file).includes('"119": "Lifeguard 4x4"'));
}
console.log('PASS: Lifeguard profiles accept four market types, enforce 2/4 crew limits, reject incompatible stations, classify Coastguard, and include linked trailer crew rules.');
