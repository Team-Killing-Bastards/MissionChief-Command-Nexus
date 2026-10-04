import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const key='mcPersonnelVehicleTrainingRegistry_v1';
class Storage {
 constructor(){this.data=new Map();this.max=Infinity;}
 getItem(k){return this.data.get(String(k))??null;}
 setItem(k,v){k=String(k);v=String(v);let total=v.length;for(const [n,s]of this.data)if(n!==k)total+=s.length;if(total>this.max)throw new DOMException('Full','QuotaExceededError');this.data.set(k,v);}
 removeItem(k){this.data.delete(String(k));}
}
const register={schemaVersion:1,vehicles:{}};
for(let i=0;i<11000;i++) register.vehicles[i]={vehicleId:String(i),vehicleName:'🚒 TEST-'+i,vehicleTypeId:String(i%100),stationName:'STATION '+Math.floor(i/20),stationHref:'/buildings/'+Math.floor(i/20),assignedPersonnelCount:6,assignmentScanComplete:true,personnelRowsSeen:6,trainingCounts:{hazmat:6},trainingCombinationCounts:{'swat+traffic_police':0},assignedTrainingProfiles:Array.from({length:6},()=>['hazmat']),trainingProfilesComplete:true,updatedAt:1790499493893,source:'personnel-register-exact-assign-crew'};
const raw=JSON.stringify(register),local=new Storage();local.setItem(key,raw);
const c=vm.createContext({Storage,localStorage:local,window:{},console});
vm.runInContext(read('nexus-register-storage.js'),c);
const codec=c.window.__NEXUS_REGISTER_PACK__,stored=local.data.get(key);
assert.equal(local.getItem(key),raw);assert.equal(codec.unpack(stored),raw);assert(stored.length<raw.length/2);
for(const sample of ['', 'a','aaaaaa','🚑\ud800\u0000\ue000\n'.repeat(50),JSON.stringify({a:'quotes \" backslash \\',b:'\n'.repeat(30)}),Array.from({length:65000},(_,i)=>String.fromCharCode(i)).join('')])assert.equal(codec.unpack(codec.pack(sample)),sample);
// Exercise dictionary saturation and lots of distinct data with deterministic input.
let seed=7;const random=Array.from({length:200000},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return String.fromCharCode(seed>>>16);}).join('');
assert.equal(codec.unpack(codec.pack(random)),random);
const legacy='NEXUS-REGISTER-PACK-1\n{\ue00e:1,\ue00f:{}}';assert.equal(codec.unpack(legacy),'{'+'"schemaVersion":1,"vehicles":{}}');
local.max=stored.length+200;assert.throws(()=>local.setItem(key,random),/Full/);assert.equal(local.getItem(key),raw,'failed write must preserve old register and cache');
local.max=Infinity;local.setItem(key,raw.replace('TEST-0','UPDATED'));assert(local.getItem(key).includes('UPDATED'));
console.log(`PASS: register roundtrip, legacy decode, atomic failure, dictionary limits. ${(raw.length/1e6).toFixed(2)}M -> ${(stored.length/1e6).toFixed(2)}M characters.`);
const full={getItem:()=>null,setItem(){throw Error('quota');},removeItem(){throw Error('quota');}};
const host={location:{origin:'https://www.missionchief.co.uk'}};
function realm(){const window={top:host,localStorage:full,sessionStorage:full};const context=vm.createContext({window});vm.runInContext(read('nexus-auto-stop-store.js'),context);window.NexusAutoStopStore=context.NexusAutoStopStore;return context;}
const worker=realm(),controller=realm();const stop=JSON.stringify({reason:'Auto stopped: required resource unavailable',stoppedAt:Date.now()});
worker.NexusAutoStopStore.write(stop);assert.equal(controller.NexusAutoStopStore.read(),stop);assert.equal(typeof host.__NEXUS_AUTO_STOP_RAW__,'string');
const runtime=read('nexus-runtime.js'),a=runtime.indexOf('function readV2AutoStopRecord()'),b=runtime.indexOf('function requestV2FrameRuntimeReconcile',a);
Object.assign(controller,{localStorage:full,V2_AUTO_STOP_RECORD_KEY:'test',normaliseText:s=>s,state:{autoRunningConfirmedAt:Date.now()-1000}});vm.runInContext(runtime.slice(a,b),controller);
assert.equal(controller.readV2AutoStopRecord().reason,JSON.parse(stop).reason);assert.equal(controller.readV2AutoStopRecord().afterCurrentConfirmation,true);
worker.NexusAutoStopStore.clear();assert.equal(controller.NexusAutoStopStore.read(),'');assert.equal(controller.readV2AutoStopRecord(),null);
console.log('PASS: real controller reads original stop reason with both stores full; clear removes fallback.');
