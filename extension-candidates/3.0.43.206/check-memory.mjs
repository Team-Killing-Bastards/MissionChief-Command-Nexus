import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const base=path.dirname(fileURLToPath(import.meta.url));
const fixed=path.resolve(process.env.NEXUS_CANDIDATE_ROOT||fileURLToPath(new URL('./extension/',import.meta.url)));
const read=(root,name)=>fs.readFileSync(path.join(root,name),'utf8');
function fn(source,name){const a=source.indexOf('    function '+name+'(');assert(a>=0,name);let b=source.indexOf('\n    function ',a+10);if(b<0)b=source.length;return source.slice(a,b);}
const key='__missionFinderActiveMissionInstanceV10_6_57';
const fixedRuntime=read(fixed,'nexus-runtime.js');
const claim=fn(fixedRuntime,'claimCurrentMissionExecutionOwnership');
const release=fn(fixedRuntime,'releaseCurrentMissionExecutionOwnership');
const ownerCheck=fn(fixedRuntime,'isCurrentMissionExecutionOwner');
const shared={Object};
function ownerContext(token){
 const c=vm.createContext({shared});vm.runInContext(`const MF_SHARED_ACTIVE_INSTANCE_KEY=${JSON.stringify(key)};const MF_INSTANCE_TOKEN=${JSON.stringify(token)};const document={};let primary=document;let managed=false;const isMfV3ManagedActiveFrame=()=>managed;const getPrimaryMissionRequirementDocument=()=>primary;const getSharedTopWindow=()=>shared;const getLocalMissionInstanceKey=()=> 'mission-123';${claim}\n${release}\n${ownerCheck}`,c);return c;
}
const a=ownerContext('a'),b=ownerContext('b');
assert(vm.runInContext('claimCurrentMissionExecutionOwnership("manual")',a));
assert.equal(Object.getPrototypeOf(shared[key]),null,'ownership has no foreign prototype');
assert.equal(shared[key].token,'a');
assert.equal(vm.runInContext('isCurrentMissionExecutionOwner()',b),false,'same mission cannot steal a fresh claim');
vm.runInContext('claimCurrentMissionExecutionOwnership()',b);vm.runInContext('releaseCurrentMissionExecutionOwnership()',a);
assert.equal(shared[key].token,'b','old frame cannot delete new owner');
vm.runInContext('releaseCurrentMissionExecutionOwnership()',b);assert.equal(shared[key],undefined);
vm.runInContext('primary={}',a);assert.equal(vm.runInContext('claimCurrentMissionExecutionOwnership()',a),false);
for(const name of ['removeMissionFinderPanelForClosedMission','cleanupMissionFinderRuntime','suspendMissionFinderRuntimeForPageHide','suspendMissionFinderRuntimeForInactiveFrame'])assert(fn(fixedRuntime,name).includes('releaseCurrentMissionExecutionOwnership();'),name);

let now=10000,id=0;const events=[],timers=[];
const c=vm.createContext({document:{querySelectorAll:()=>[]},crypto:{randomUUID:()=>String(++id)},Date:{now:()=>now},setInterval:f=>timers.push(f),CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}}});
vm.runInContext('window=globalThis;window.top=window;',c);c.dispatchEvent=event=>events.push(JSON.parse(event.detail));
const source=read(fixed,'collector-game.js').replace('window.__NEXUS_COLLECTOR_GAME__=api;','window.__NEXUS_COLLECTOR_GAME__=api;globalThis.testPending=pending;');
vm.runInContext(source,c);
const foreign=vm.runInNewContext('({record:{missionId:"123",missionName:"Fixture",units:[{vehicleId:"1",name:"One"},{vehicleId:"2",name:"Two"}],nested:{a:[1,2]}},who:{player:"42",host:"fixture"}})');
const api=c.__NEXUS_COLLECTOR_GAME__;const token=api.attempt(foreign.record,foreign.who);
c.testToken=token;
assert(vm.runInContext(`(()=>{const p=testPending.get(testToken);const check=v=>!v||typeof v!=='object'||((Object.getPrototypeOf(v)===(Array.isArray(v)?Array.prototype:Object.prototype))&&Object.values(v).every(check));return check(p.record)&&check(p.who);})()`,c),'report deeply belongs to main realm');
foreign.record.units[0].vehicleId='changed';foreign.who.player='changed';
api.confirm('1');assert.equal(events.length,1);assert.equal(events[0].player,'42');assert.equal(events[0].record.units[0].vehicleId,'1');
api.confirm('1');assert.equal(events.length,1,'duplicate confirmation ignored');api.confirm('2');assert.equal(events.length,3);assert.equal(events[2].record.eventType,'dispatch-confirmed');assert.equal(c.testPending.size,0);
const circular={};circular.self=circular;assert.equal(api.attempt(circular,{}),'','bad optional report does not interrupt game');assert.equal(api.attempt(undefined,{}),'');
const pending=api.attempt({units:[{vehicleId:'9'}]},{});now+=120001;timers.forEach(f=>f());assert.equal(c.testPending.has(pending),false,'two minute expiry unchanged');
for(let i=0;i<110;i++)api.attempt({units:[]},{});assert.equal(c.testPending.size,100,'queue stays bounded');
console.log('PASS: ownership lifecycle, cross-realm reports, confirmations, invalid payloads, expiry and queue bounds.');

