import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('./extension/',import.meta.url),old=new URL('../3.0.43.226/extension/',import.meta.url);
let checks=0;
for(const file of fs.readdirSync(root,{recursive:true})){
 const name=file.replaceAll('\\','/'),path=new URL(name,root);if(!fs.statSync(path).isFile())continue;
 if(['nexus-runtime.js','nexus-update-notes-data.mjs'].includes(name))continue;
 const a=fs.readFileSync(path),b=fs.readFileSync(new URL(name,old));
 if(!a.equals(b))assert.equal(a.toString().replaceAll('3.0.43.227','3.0.43.226'),b.toString(),name+' changed beyond version');
 checks++;
}
const source=fs.readFileSync(new URL('nexus-runtime.js',root),'utf8');
assert(source.includes('eventCollector: window.NexusEventCollector?.snapshot() || null'));checks++;
assert(source.includes("record.category === 'VEHICLE_LOADING' && Number.isFinite(record.retryAfterAt)"));checks++;
fs.writeFileSync(new URL('./recovery-scope-validation.json',import.meta.url),JSON.stringify({checks,otherRuntimeFilesUnchanged:true,permissionsUnchanged:true},null,2)+'\n');
console.log(`${checks} package scope checks passed.`);
