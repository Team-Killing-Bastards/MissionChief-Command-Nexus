import fs from 'node:fs';
import crypto from 'node:crypto';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const name of ['extension/manifest.json','extension/nexus-tools.js','runtime/nexus-runtime.js','package.json'])fs.writeFileSync(name,fs.readFileSync(name,'utf8').replaceAll('3.0.43.57','3.0.43.58'));
const files=Object.fromEntries(['manifest.json','nexus-runtime.js','nexus-tools.js','nexus-alliance-core.js','nexus-alliance-support.js'].map(name=>[name,hash(fs.readFileSync(`${name==='nexus-runtime.js'?'runtime':'extension'}/${name}`))]));
fs.writeFileSync('reference/alliance-participation-58.json',JSON.stringify({version:'3.0.43.58',baseVersion:'3.0.43.57',sourceRuntimeSha256:files['nexus-runtime.js'],localOnly:true,changes:[
  'Recognise existing alliance participation using own vehicle mission targets, including all services travelling or on scene, even when the native mission card says new',
  'Refresh participation on open, explicit refresh, toggle and before each user-started batch; coalesce reads and retain only mission IDs',
  'Show unverified participation when the fleet read fails; retain previously known support and block unverified new sends',
  'Use explicit Sent: 1 Fire Officer confirmation instead of a vehicle status badge mistaken for its name; native one-officer dispatch unchanged'
],files},null,2)+'\n');
console.log('Prepared local .58 source and explicit provenance.');
