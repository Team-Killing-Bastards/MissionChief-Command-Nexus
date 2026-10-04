import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const now=fs.readFileSync(new URL('../nexus-runtime.js',import.meta.url),'utf8');
const old=fs.readFileSync(new URL('../../build-174/nexus-runtime.js',import.meta.url),'utf8');
const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
const make=()=>{
 const marker={isConnected:true};
 const local={documentElement:{},querySelectorAll:()=>[marker],defaultView:{}};
 const manual={documentElement:{},querySelectorAll:()=>[marker],defaultView:{}};
 manual.defaultView.top={document:manual};
 const c=vm.createContext({document:local,window:{location:{pathname:'/missions/123'}},Date,managed:true,
 isMfV3ManagedActiveFrame:()=>c.managed,isMissionDocumentVisible:()=>true,isMissionElementVisible:()=>true,
 getMissionAccessibleDocuments:()=>[local,manual],getLocalMissionInstanceKey:()=> 'mission:123',isCachedMissionDocumentUsable:()=>true});
 return {c,local,manual};
};
const before=make();vm.runInContext(section(old,'    function getPrimaryMissionRequirementDocument()', '    function getSharedTopWindow()'),before.c);
assert.equal(before.c.getPrimaryMissionRequirementDocument(),before.manual,'reproduce visible foreign mission winning over auto worker');
const after=make();vm.runInContext(section(now,'    function isNexusMissionWorkerDocumentScope()', '    function getSharedTopWindow()'),after.c);
assert.equal(after.c.getPrimaryMissionRequirementDocument(),after.local);
vm.runInContext('let mfVehicleSelectionDocumentCache={document:null};',after.c);
vm.runInContext(section(now,'    function getVehicleSelectionDocument(', '    function queryVehicleSelectionElements('),after.c);
after.c.window.foreign=after.manual;
vm.runInContext('mfVehicleSelectionDocumentCache={document:window.foreign,missionKey:"mission:123",expiresAt:Date.now()+10000}',after.c);
assert.equal(after.c.getVehicleSelectionDocument(),after.local);
after.c.managed=false;assert.equal(after.c.getPrimaryMissionRequirementDocument(),after.manual,'manual modal preference remains');
after.c.managed=true;vm.runInContext('let mfMissionDocumentCache={documents:[],expiresAt:0};',after.c);
vm.runInContext(section(now,'    function getMissionAccessibleDocuments(', '    let mfIphoneLauncherLastNativeCluster'),after.c);
assert.deepEqual(Array.from(after.c.getMissionAccessibleDocuments()),[after.local]);
after.c.window.location.pathname='/vehicles/42';assert.equal(after.c.isNexusMissionWorkerDocumentScope(),false,'transport pages keep their existing scope');
console.log('PASS: reproduced foreign mission priority; Auto requirements, vehicle selection and document cache remain local; manual selection retained.');
