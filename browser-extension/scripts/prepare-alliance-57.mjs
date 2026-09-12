import fs from 'node:fs';
import crypto from 'node:crypto';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export const frameGuard=`  // BEGIN ALLIANCE FRAME ISOLATION 57\n  if (window.frameElement?.hasAttribute('data-nx-alliance-worker')) return;\n  // END ALLIANCE FRAME ISOLATION 57\n`;
export const controllerBridge=`// BEGIN ALLIANCE CONTROLLER BRIDGE 57\nwindow.__NEXUS_AUTO_DISPATCH_BUSY__ = () => Boolean(state.wanted || state.running || state.stopping);\nfunction nexusAllianceSupportBusy() {\n  if (window.__NEXUS_ALLIANCE_SUPPORT__?.busy) return true;\n  try { return Number(JSON.parse(localStorage.getItem('nexusAllianceSupportLeaseV1') || 'null')?.until) > Date.now(); } catch { return false; }\n}\n// END ALLIANCE CONTROLLER BRIDGE 57\n`;
export const startGuard=`// BEGIN ALLIANCE START GUARD 57\nif (nexusAllianceSupportBusy()) { log('Alliance support is sending; wait for its queue to finish before starting Auto Mode.'); return; }\n// END ALLIANCE START GUARD 57\n`;
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepare-alliance-57.mjs')){
  for(const name of ['extension/manifest.json','extension/nexus-tools.js','runtime/nexus-runtime.js','package.json'])fs.writeFileSync(name,fs.readFileSync(name,'utf8').replaceAll('3.0.43.56','3.0.43.57'));
  let runtime=fs.readFileSync('runtime/nexus-runtime.js','utf8');
  if(!runtime.includes('BEGIN ALLIANCE FRAME ISOLATION 57')){
    runtime=runtime.replace("  if (window.__NEXUS_EXTENSION__) return;",frameGuard+"  if (window.__NEXUS_EXTENSION__) return;");
    runtime=runtime.replace('function startController() {',controllerBridge+'function startController() {\n'+startGuard).replace('function retryCurrent() {','function retryCurrent() {\n'+startGuard);
    fs.writeFileSync('runtime/nexus-runtime.js',runtime);
  }
  const manifest=JSON.parse(fs.readFileSync('extension/manifest.json'));
  if(!manifest.content_scripts.some(row=>row.js.includes('nexus-alliance-support.js')))manifest.content_scripts.push({matches:['https://www.missionchief.co.uk/*','https://police.missionchief.co.uk/*'],js:['nexus-alliance-core.js','nexus-alliance-support.js'],run_at:'document_idle',all_frames:false,world:'MAIN'});
  fs.writeFileSync('extension/manifest.json',JSON.stringify(manifest,null,2)+'\n');
  const files=Object.fromEntries(['manifest.json','nexus-runtime.js','nexus-tools.js','nexus-alliance-core.js','nexus-alliance-support.js','nexus-settings.js','nexus-settings-main.js'].map(name=>[name,hash(fs.readFileSync(`${name==='nexus-runtime.js'?'runtime':'extension'}/${name}`))]));
  fs.writeFileSync('reference/alliance-support-57.json',JSON.stringify({version:'3.0.43.57',baseVersion:'3.0.43.56',sourceRuntimeSha256:files['nexus-runtime.js'],localOnly:true,changes:[
    'Alliance missions button beside Nexus; joined visibility toggle, estimated credit bands, individual and selected support',
    'User-triggered serialized native dispatch of one closest available Fire Officer, with pagination, confirmed-result filtering and persistent uncertain-send protection',
    'One sandboxed mission frame released after each job; heavy Nexus runtime excluded from that frame; no top navigation',
    'Lightweight Auto Mode busy bridge and start/retry guard; no changes to Auto mission selection or dispatch logic'
  ],files},null,2)+'\n');
  console.log('Prepared local .57 source and explicit provenance.');
}
