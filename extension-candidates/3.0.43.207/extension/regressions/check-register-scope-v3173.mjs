import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../nexus-runtime.js',import.meta.url),'utf8');
const section=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
let centre='10', fail=false, reads=[];
const buildings=[{id:1,caption:'North',leitstelle_building_id:10},{id:2,caption:'South',leitstelle_building_id:20},{id:3,caption:'Default',leitstelle_building_id:null}];
const registry={vehicles:{oldNorth:{stationHref:'/buildings/1'},south:{stationHref:'/buildings/2',verifiedAt:123},default:{stationHref:'/buildings/3'}}};
const untouched=JSON.stringify(registry.vehicles.south);
const noop=()=>{};
const c=vm.createContext({console,Date,Set,Map,window:{NexusPersonnelStore:{ready:async()=>{},remove:async()=>{}}},STATE:{},STATION_STATE:{},PERSONNEL_STATE:{},PERSONNEL_TRAINING_REGISTRY_DIRTY:false,
 document:{getElementById:()=>({value:centre,selectedOptions:[{textContent:'Selected area'}]}),querySelector:()=>({})},
 cleanText:s=>s,personnelLog:noop,setPersonnelUiValue:noop,
 personnelFetchResponse:async()=>{if(fail)throw new Error('offline');return {ok:true,json:async()=>buildings};},
 getPersonnelRegisterStationEntries:()=>{throw new Error('Must not fall back to all stations');},
 readPersonnelTrainingRegistry:()=>registry,createPersonnelRegisterReader:()=>({stats:{requests:0,throttled:0},cancel:noop}),
 setPersonnelTrainingRegistryTransferDisabled:noop,waitIfPersonnelPaused:async()=>{},
 personnelFetchDocument:async href=>{reads.push(href);return {doc:{querySelector:()=>({})}};},
 getPersonnelVehicleQueue:()=>[],flushPersonnelTrainingRegistry:noop,
 getPersonnelTrainingRegistryStats:()=>({count:Object.keys(registry.vehicles).length}),renderPersonnelReport:noop,updatePersonnelTrainingRegistryStatus:noop});
vm.runInContext(section('    function getNamingDispatchCentreIdFromRecord(', '    function getNamingBuildingRecordLabel'),c);
vm.runInContext(section('    let personnelRegisterScopeLoading', '    function getPersonnelRegisterStationEntries'),c);
vm.runInContext(section('    async function buildPersonnelTrainingRegisterOneClick(', '    function startPersonnelRun'),c);
for(const fullVerify of [false,true]){
 reads=[]; await c.buildPersonnelTrainingRegisterOneClick({fullVerify});
 assert.deepEqual(reads,['/buildings/1']);
 assert.equal(JSON.stringify(registry.vehicles.south),untouched);
 assert.ok(registry.vehicles.default);
 assert.equal(registry.vehicles.oldNorth,undefined);
}
centre='unassigned'; reads=[];await c.buildPersonnelTrainingRegisterOneClick();assert.deepEqual(reads,['/buildings/3']);
centre='999';reads=[];await c.buildPersonnelTrainingRegisterOneClick();assert.deepEqual(reads,[]);
fail=true;centre='10';reads=[];await c.buildPersonnelTrainingRegisterOneClick();assert.deepEqual(reads,[]);
assert.equal(JSON.stringify(registry.vehicles.south),untouched);
console.log('PASS: quick/full scope, unassigned, empty scope, failed lookup, and untouched-area retention');

