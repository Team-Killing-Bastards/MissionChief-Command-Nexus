import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=(file,version='3.0.43.226')=>fs.readFileSync(new URL(`../${version}/extension/${file}`,import.meta.url),'utf8');
const old=read('nexus-runtime.js','3.0.43.225'),source=read('nexus-runtime.js');
let expected=old.replaceAll('3.0.43.225','3.0.43.226');
const remove=(start,end)=>{const a=expected.indexOf(start),b=expected.indexOf(end,a);assert(a>=0&&b>a);expected=expected.slice(0,a)+expected.slice(b);};
remove('    const MF_EVENT_COLLECTIBLE_SELECTOR =','    const MF_IS_TOP_WINDOW =');
remove('    function syncNexusEventScannerSetting() {','    const MF_OPERATIONAL_MISSION_MARKER_SELECTOR =');
expected=expected.replace('    if (!mfV3DormantPreload) {\n        startMissionEventCollectibleCollector();\n    }\n','')
  .replaceAll('        startMissionEventCollectibleCollector();\n','').replaceAll('        stopMissionEventCollectibleCollector();\n','')
  .replace('heavyRuntimeLoaded: window.__MCN_HEAVY_RUNTIME_LOADED__ === true,','heavyRuntimeLoaded: window.__MCN_HEAVY_RUNTIME_LOADED__ === true,\neventCollector: window.NexusEventCollector?.snapshot() || null,')
  .replace('mfEventCollectibleScanTimer !== null','false')
  .replace('mfEventCollectibleScanRunning === true','window.top.NexusEventCollector?.snapshot().inFlight === true')
  .replace('mfEventCollectibleClaimTimes.size','window.top.NexusEventCollector?.snapshot().recentCount || 0');
assert.equal(source,expected,'Only remove legacy collector and expose new scalar status; all Auto Mode code must be unchanged');
const manifest=JSON.parse(read('manifest.json')),before=JSON.parse(read('manifest.json','3.0.43.225'));
before.version='3.0.43.226';
const main=before.content_scripts.find(c=>c.js?.includes('nexus-runtime.js'));
main.js.splice(main.js.indexOf('nexus-runtime.js'),0,'nexus-event-collector.js');
assert.deepEqual(manifest,before,'Manifest changes limited to version and collector script');
const folder=new URL('./extension/',import.meta.url);
let checks=2;
for(const file of fs.readdirSync(folder,{recursive:true})) {
  const path=new URL(file.replaceAll('\\','/'),folder);
  if(!fs.statSync(path).isFile()||['nexus-runtime.js','manifest.json','nexus-update-notes-data.mjs','nexus-event-collector.js'].includes(file))continue;
  const current=fs.readFileSync(path);
  const previous=fs.readFileSync(new URL(`../3.0.43.225/extension/${file.replaceAll('\\','/')}`,import.meta.url));
  if(!current.equals(previous))assert.equal(current.toString().replaceAll('3.0.43.226','3.0.43.225'),previous.toString(),file+' changed beyond version');
  checks++;
}
assert(!/mfEventScanner|MF_EVENT_SCANNER|mfEventCollectible|MissionEventCollectible/.test(source),'No legacy collector references');checks++;
const result={checks,dispatchAndCrewCodeUnchanged:true,permissionsUnchanged:true};
fs.writeFileSync(new URL('./collector-scope-validation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
