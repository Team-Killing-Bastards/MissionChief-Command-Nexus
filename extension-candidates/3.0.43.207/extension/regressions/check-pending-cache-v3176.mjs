import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
function fixture(src){
 const requests=[],timers=[];
 const env={Date,URL,structuredClone,location:{origin:'https://www.missionchief.co.uk',pathname:'/missions/42'},sessionStorage:{getItem:()=> 'test'},indexedDB:{open(){const r={};requests.push(r);return r;}},setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},addEventListener(){}};
 env.top=env;
 const code=src.slice(src.indexOf('function createNexusPerformance(env)'),src.indexOf('window.__NEXUS_PERFORMANCE__ ='));
 const context=vm.createContext({env});vm.runInContext(code,context);
 return {api:vm.runInContext('createNexusPerformance(env)',context),requests,timers};
}
const descriptor={url:'https://www.missionchief.co.uk/einsaetze/7?mission_id=42',missionTypeId:7,missionId:42};
const old=fixture(read('../../build-175/nexus-runtime.js'));
const pending=old.api.getRequirements(descriptor); assert.equal(old.requests.length,1);
old.timers[0]();assert.equal(await pending,null);old.api.dispose();
assert.equal(typeof old.requests[0].onsuccess,'function','old timeout/dispose leaves database-open callbacks attached');
const fresh=fixture(read('../nexus-runtime.js'));
for(let i=0;i<30;i++){
 assert.equal(await fresh.api.getRequirements(descriptor),null);
 assert.equal(await fresh.api.putRequirements(descriptor,{rows:[],rawRows:[]}),false);
}
fresh.api.dispose();assert.equal(fresh.requests.length,0);assert.equal(fresh.timers.length,0);
console.log('PASS: reproduced outstanding old IDB open; repeated cache reads/writes now bypass without requests or timers.');
