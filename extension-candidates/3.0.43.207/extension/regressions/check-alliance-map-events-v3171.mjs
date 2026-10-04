import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const env={user_id:12,alliance_id:17,missions_data:[
 {id:1,user_id:0,alliance_id:17,caption:'Event with system owner'},
 {id:2,alliance_id:17,caption:'Event without player owner'},
 {id:3,user_id:22,alliance_id:17,caption:'Shared map mission'},
 {id:4,user_id:12,alliance_id:17,caption:'Personal mission'},
 {id:5,user_id:0,alliance_id:99,caption:'Other alliance'},
 {id:6,user_id:0,caption:'Unknown system mission'},
 {id:261822662,user_id:null,mtid:634,caption:'Severe Respiratory Distress'},
 {id:8,caption:'Incomplete object'},
 {id:9,user_id:null,sw:true,caption:'Unidentified planned appearance'}
],additionalMissionsFiltersFuncs:[],onMissionVLInitCallbacks:[],onMissionVLRenderCallbacks:[],
 setInterval:()=>1,setTimeout:()=>1,clearInterval:()=>{},clearTimeout:()=>{},addEventListener:()=>{},dispatchEvent:()=>{},CustomEvent:class{}};
env.window=env;env.top=env;
const c=vm.createContext(env);
for(const file of ['nexus-alliance-owner-capture.js','nexus-alliance-core.js'])vm.runInContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),c);
const capture=c.__NEXUS_ALLIANCE_MISSION_OWNER_CAPTURE__,core=c.NexusAllianceCore;
const doc={querySelectorAll:()=>[],querySelector:()=>null,getElementById:()=>null};
capture.harvest();
assert.deepEqual(Array.from(core.missions(doc),x=>x.id),['1','2','3','261822662']);
assert.equal(core.missions(doc).find(x=>x.id==='261822662').event,true);
assert.equal(core.missions(doc)[0].planned,false);
assert.equal(core.missions(doc)[0].credits,null,'unknown credits remain unknown');
capture.harvest();assert.equal(core.missions(doc).length,4,'repeated capture deduplicates');
c.missions_data=[];capture.harvest();assert.equal(core.missions(doc).length,0,'removed events disappear');
c.missions_data=[{id:7,alliance_id:17,caption:'New event'}];capture.harvest();
assert.deepEqual(Array.from(core.missions(doc),x=>x.id),['7'],'newly spawned event appears');
console.log('PASS: map-only events, ownerless/system ownership, foreign shared missions, personal/other alliance exclusion, removal and new spawns.');
