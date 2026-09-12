import fs from 'node:fs';
import crypto from 'node:crypto';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const file of ['extension/manifest.json','extension/nexus-tools.js','runtime/nexus-runtime.js','package.json']){
  fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll('3.0.43.55','3.0.43.56'));
}
const files=Object.fromEntries(['manifest.json','nexus-runtime.js','nexus-tools.js'].map(name=>[name,hash(fs.readFileSync(`${name==='nexus-runtime.js'?'runtime':'extension'}/${name}`))]));
fs.writeFileSync('reference/auto-focus-56.json',JSON.stringify({version:'3.0.43.56',baseVersion:'3.0.43.55',sourceRuntimeSha256:files['nexus-runtime.js'],localOnly:true,changes:[
  'Design A: current mission and session counts, one Start/Stop action, minimisation and collapsed system diagnostics',
  'Separate Temporary skips disclosure with recorded shortage evidence, mission links and retry eligibility measured in mission advances',
  'Capture bounded specific shortage text from already-collected evidence before truncation; no new requests or timers',
  'Phone and desktop-mode phone sizing uses existing viewport variables; dispatch and worker scheduling are unchanged'
],files},null,2)+'\n');
console.log('Prepared local .56 version markers and explicit file provenance.');
