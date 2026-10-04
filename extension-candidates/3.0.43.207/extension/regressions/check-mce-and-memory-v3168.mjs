import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../nexus-runtime.js',import.meta.url),'utf8');
const start=source.indexOf('    function applyConfiguredFreshMissionVehicleRequirements(');
const end=source.indexOf('    function buildFreshAmbulanceOfficerThresholdAdditionalRows(',start);
assert.ok(start>0&&end>start);
let threshold='15', enabled='true', selected=0, uncapped=0;
const context=vm.createContext({
 localStorage:{getItem:key=>key.endsWith('enabled_v1')?enabled:threshold},
 addNexusKnownAmbulanceRequirement:rows=>rows,
 addConfiguredAmbulanceOfficerThresholdRequirement:rows=>rows,
 addConfiguredHighRiskMissingPersonAmbulanceRequirement:rows=>rows,
 isAmbulanceTransportRequest:name=>/^Ambulance(?: x 01)?$/.test(name),
 resolveUnitName:name=>name,
 countSelectedMatchingVehicles:()=>selected,
 mfGetRecordedUncappedAmbulanceDemand:()=>uncapped,
 getCurrentMissionIdForQueueRestart:()=> '123'
});
vm.runInContext(source.slice(start,end),context);
const row=n=>[{unitName:'Ambulance',stillNeeded:n}];
const run=(rows,extra=[])=>context.applyConfiguredFreshMissionVehicleRequirements(rows,extra);
const mce=rows=>rows.filter(r=>r.unitName==='Mass Casualty Equipment');
assert.equal(mce(run(row(15))).length,0);
assert.equal(mce(run(row(16))).length,1,'fresh mission adds MCE without background-controller state');
assert.equal(mce(run(row(30))).length,1);
assert.equal(mce(run(row(10),row(10))).length,0,'duplicate demand sources must not double count');
assert.equal(mce(run([],row(16))).length,1,'late patient rows trigger MCE');
uncapped=40;assert.equal(mce(run(row(10))).length,1,'uncapped demand survives the ambulance cap');uncapped=0;
let once=run(row(20));assert.equal(mce(run(once)).length,1,'repeated planning does not duplicate MCE');
selected=1;assert.equal(mce(run(row(20))).length,0);selected=0;
enabled='false';assert.equal(mce(run(row(20))).length,0);
assert.equal(mce(run([...row(20),{unitName:'Mass Casualty Equipment',stillNeeded:1}])).length,1,'OFF retains explicit game requirements');
enabled='true';threshold=null;assert.equal(mce(run(row(20))).length,0);assert.equal(mce(run(row(21))).length,1,'missing setting defaults to 20');
assert.match(source,/requirementRows = addConfiguredMassCasualtyThresholdRequirement\(\s*requirementRows, options.ambulanceOfficerThresholdAdditionalRows\)/,'late selection path uses the same rule');

const memoryStart=source.indexOf('function createNexusMemoryDiagnostics(env) {');
const memoryEnd=source.indexOf('const nexusMemoryDiagnostics=',memoryStart);
let now=100000, writes=0;const saved=new Map();
const memoryContext=vm.createContext({WeakSet,JSON,Number});
vm.runInContext(source.slice(memoryStart,memoryEnd),memoryContext);
const env={Date:{now:()=>now},WeakRef,performance:{memory:{usedJSHeapSize:1000000}},sessionStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>{writes++;saved.set(k,v);}}};
const monitor=memoryContext.createNexusMemoryDiagnostics(env);
assert.equal(monitor.snapshot(),null,'no active run is missing data, not a healthy-memory verdict');
monitor.sample('run',{},true);const baseline=writes;
for(let i=0;i<100;i++)monitor.sample('run');
assert.equal(writes,baseline,'sampling is throttled between 15-second boundaries');
const doc={};monitor.retire(doc,'run');monitor.retire(doc,'run');assert.equal(monitor.snapshot().retiredTotal,1);
for(let i=0;i<300;i++){now+=15001;monitor.retire({},'run');monitor.sample('run',{connectedFrames:2});}
const result=monitor.snapshot();assert.equal(result.samples.length,120);assert.ok(result.droppedWeakProbes>0);
assert.ok(result.samples.every(s=>s.liveRetiredProbes<=128));assert.ok(saved.values().next().value.length<100000);
const restored=memoryContext.createNexusMemoryDiagnostics(env);restored.sample('run',{},true);assert.equal(restored.snapshot().samples.length,120);
env.sessionStorage.setItem=()=>{throw Error('quota');};now+=15001;monitor.sample('run');assert.equal(monitor.snapshot().storageError,true,'quota does not break gameplay');
monitor.sample('new-run',{},true);assert.equal(monitor.snapshot().retiredTotal,0);
console.log('PASS: MCE fresh/late/capped/OFF/dedup boundaries; memory throttle, bounded samples/weak probes, restoration and quota isolation.');
