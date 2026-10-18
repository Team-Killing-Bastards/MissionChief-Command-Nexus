import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('./extension/',import.meta.url),old=new URL('../3.0.43.229/extension/',import.meta.url);
let checks=0;
const normal=s=>s.replaceAll('\r\n','\n').replaceAll('3.0.43.230','3.0.43.229');
const versionFiles=['manifest.json','nexus-dispatch-trace.js','nexus-event-collector.js','nexus-startup-diagnostics.js','nexus-tools.js'];
for(const name of fs.readdirSync(root,{recursive:true})){
 const path=new URL(name.replaceAll('\\','/'),root);if(!fs.statSync(path).isFile()||['nexus-runtime.js','nexus-update-notes-data.mjs'].includes(name))continue;
 const a=fs.readFileSync(path),b=fs.readFileSync(new URL(name,old));
 if(versionFiles.includes(name))assert.equal(normal(a.toString()),b.toString().replaceAll('\r\n','\n'),name);
 else assert(a.equals(b),name+' must remain byte-identical');checks++;
}
const source=normal(fs.readFileSync(new URL('nexus-runtime.js',root),'utf8')),before=fs.readFileSync(new URL('nexus-runtime.js',old),'utf8').replaceAll('\r\n','\n');
function fn(name,text){const a=new RegExp('^ {0,8}(?:async )?function '+name+'\\(','m').exec(text);if(!a)return '';const b=/\n {0,4}(?:async )?function /.exec(text.slice(a.index+a[0].length));assert(b);return text.slice(a.index,a.index+a[0].length+b.index);}
const allowed=['isTimedMissionLoadingSkip','missionSkipRemaining','registerRecoverableMissionSkip','redirectAfterRecoverableSkip','lowQueueResumeExcludedMissionId','recoverInitialMissionWorkerLoad','createWorker','renderControllerSkips'];
let a=source,b=before;
for(const name of allowed){a=a.replace(fn(name,source),'');b=b.replace(fn(name,before),'');}
assert.equal(a.replace(/\n+/g,'\n'),b.replace(/\n+/g,'\n'),'all runtime code outside the exact load recovery and timed skip functions is unchanged');checks++;
assert.equal(JSON.parse(fs.readFileSync(new URL('manifest.json',root))).version,'3.0.43.230');checks++;
fs.writeFileSync(new URL('./scope-validation.json',import.meta.url),JSON.stringify({checks,allowedRuntimeFunctions:allowed,dispatchSelectionTrainingUnchanged:true,stationCrewFixRetained:true,permissionsUnchanged:true},null,2)+'\n');
console.log(`${checks} package scope checks passed.`);
