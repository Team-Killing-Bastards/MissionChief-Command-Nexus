import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('./extension/',import.meta.url),old=new URL('../3.0.43.228/extension/',import.meta.url);
const changed=['nexus-assign-crew.js','nexus-crew-register.js','nexus-update-notes-data.mjs'];
let checks=0;
for(const name of fs.readdirSync(root,{recursive:true})){
 const path=new URL(name.replaceAll('\\','/'),root);if(!fs.statSync(path).isFile()||changed.includes(name))continue;
 assert.equal(fs.readFileSync(path,'utf8').replaceAll('3.0.43.229','3.0.43.228'),fs.readFileSync(new URL(name,old),'utf8'),name+' changed beyond version');checks++;
}
assert.equal(JSON.parse(fs.readFileSync(new URL('manifest.json',root))).version,'3.0.43.229');checks++;
const source=fs.readFileSync(new URL('nexus-assign-crew.js',root),'utf8');
assert(source.includes("reject(Error(label+' timed out'));},15000)"));checks++;
fs.writeFileSync(new URL('./scope-validation.json',import.meta.url),JSON.stringify({checks,autoModeUnchangedExceptVersion:true,permissionsUnchanged:true,changed},null,2)+'\n');
console.log(`${checks} scope checks passed.`);
