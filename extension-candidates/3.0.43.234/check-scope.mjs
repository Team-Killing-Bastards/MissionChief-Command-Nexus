import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('./extension/',import.meta.url),old=new URL('../3.0.43.233/extension/',import.meta.url);
let checks=0,syntax=0;
const text=(name,base=root)=>fs.readFileSync(new URL(name,base),'utf8');
const normal=s=>s.replaceAll('\r\n','\n').replaceAll('3.0.43.234','3.0.43.233');
const versionFiles=['manifest.json','nexus-dispatch-trace.js','nexus-event-collector.js','nexus-startup-diagnostics.js','nexus-runtime.js'];
const changed=['nexus-alliance-support.js','nexus-settings.js','nexus-settings-main.js','nexus-tools.js','nexus-update-notes-data.mjs'];
const files=fs.readdirSync(root,{recursive:true}).map(n=>n.replaceAll('\\','/')).filter(n=>fs.statSync(new URL(n,root)).isFile());
const oldFiles=fs.readdirSync(old,{recursive:true}).map(n=>n.replaceAll('\\','/')).filter(n=>fs.statSync(new URL(n,old)).isFile());
assert.deepEqual(files.sort(),oldFiles.sort());checks++;
for(const name of files){
 const a=fs.readFileSync(new URL(name,root)),b=fs.readFileSync(new URL(name,old));
 if(versionFiles.includes(name)){assert.equal(normal(a.toString()),normal(b.toString()),name+' version-only');checks++;}
 else if(!changed.includes(name)){assert(a.equals(b),name+' byte unchanged');checks++;}
 if(/\.(?:js|mjs)$/.test(name)){execFileSync(process.execPath,['--check',fileURLToPath(new URL(name,root))],{stdio:'pipe'});syntax++;}
}
assert.equal(text('nexus-settings.js'),text('nexus-settings-main.js'));checks++;
assert.equal(normal(text('nexus-settings-main.js')).replace(/^    \['alliance(?:MinCredits|BatchSize|PauseMinutes)'.*\n/gm,''),normal(text('nexus-settings-main.js',old)));checks++;
const oldHint='Sends one support unit per eligible shared mission while personal Auto Mode continues. Uses the vehicle and value filters in Alliance missions. Keep one game tab open.';
const newHint='Sends one support unit per eligible shared mission in batches while personal Auto Mode continues. Minimum credits combines with the value filter in Alliance missions. The fixed pause starts after each batch finishes; the next batch time appears in that panel. Settings sync with your Nexus account; the running schedule stays in this browser.';
assert.equal(normal(text('nexus-tools.js')).replace(newHint,oldHint),normal(text('nexus-tools.js',old)));checks++;
const data=new Map(),c=vm.createContext({localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},Event:class {},window:{dispatchEvent(){}}});
vm.runInContext(text('nexus-settings-main.js'),c);c.window.NexusSettings=c.NexusSettings;
const settings=c.NexusSettings,defaults=settings.snapshot();
assert.equal(defaults.runtime.allianceAuto,false);checks++;
for(const [id,key,expected,min,max]of [['allianceMinCredits','nexusAllianceMinCreditsV1',0,0,1000000000],['allianceBatchSize','nexusAllianceBatchSizeV1',10,1,100],['alliancePauseMinutes','nexusAlliancePauseMinutesV1',10,1,1440]]){
 assert.equal(defaults.runtime[id],expected);checks++;
 for(const n of [min-1,max+1,1.5,'nonsense']){data.set(key,String(n));assert.equal(settings.snapshot().runtime[id],expected);checks++;}
 for(const n of [min,max]){data.set(key,String(n));assert.equal(settings.snapshot().runtime[id],n);checks++;}
 data.delete(key);
 const draft=settings.snapshot();draft.runtime[id]=max+1;const before=JSON.stringify([...data]);assert.throws(()=>settings.save(draft));assert.equal(JSON.stringify([...data]),before);checks+=2;
}
const draft=settings.snapshot();draft.runtime.allianceMinCredits=10000;draft.runtime.allianceBatchSize=7;draft.runtime.alliancePauseMinutes=5;settings.save(draft);
for(const id of ['allianceMinCredits','allianceBatchSize','alliancePauseMinutes']){assert.equal(settings.snapshot().runtime[id],draft.runtime[id]);checks++;}
// Actual cloud allowlist is built from runtime preferences; cadence is deliberately absent.
const profile=text('nexus-profile-sync.js');vm.runInContext(profile.match(/ const localKeys=.*\n/)[0]+'globalThis.keys=localKeys();',c);
for(const key of ['nexusAllianceMinCreditsV1','nexusAllianceBatchSizeV1','nexusAlliancePauseMinutesV1']){assert(c.keys.includes(key));checks++;}
assert(!c.keys.includes('nexusAllianceAutoPaceV1'));checks++;
const manifest=JSON.parse(text('manifest.json')),before=JSON.parse(text('manifest.json',old));assert.equal(manifest.version,'3.0.43.234');assert.deepEqual({...manifest,version:before.version},before);checks+=2;
const notes=await import('./extension/nexus-update-notes-data.mjs'),latest=notes.notesSince('3.0.43.233','3.0.43.234');assert.equal(latest.length,1);assert(latest[0].url.includes('6ec3801de13382201e3c80ddd0dd6cc943e98748'));assert(latest[0].url.endsWith('#v3-0-43-234-alliance-batches'));checks+=3;
fs.writeFileSync(new URL('./scope-validation.json',import.meta.url),JSON.stringify({checks,syntaxFiles:syntax,files:files.length,personalRuntimeVersionOnly:true,workerBRecoveryRetained:true,patientCleanupRetained:true,trainedCrewAndSelectionUnchanged:true,permissionsUnchanged:true,cloudPreferencesAllowlisted:true,liveGameVerified:false},null,2)+'\n');
console.log(`${checks} scope and settings assertions; ${syntax} JavaScript syntax checks passed.`);
