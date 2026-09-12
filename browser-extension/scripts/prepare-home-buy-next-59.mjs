import fs from 'node:fs';import crypto from 'node:crypto';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const name of ['extension/manifest.json','extension/nexus-tools.js','runtime/nexus-runtime.js','package.json'])fs.writeFileSync(name,fs.readFileSync(name,'utf8').replaceAll('3.0.43.58','3.0.43.59'));
const files=Object.fromEntries(['manifest.json','nexus-runtime.js','nexus-tools.js','nexus-home-market.js'].map(name=>[name,hash(fs.readFileSync(`${name==='nexus-runtime.js'?'runtime':'extension'}/${name}`))]));
fs.writeFileSync('reference/home-buy-next-59.json',JSON.stringify({version:'3.0.43.59',baseVersion:'3.0.43.58',sourceRuntimeSha256:files['nexus-runtime.js'],localOnly:true,changes:[
 'Home Response quick-buy strip includes a persistent Buy and next building toggle, off by default',
 'Capture the native next-building link with the purchase intent; navigate the current frame once only after game success, preserving its query',
 'Failed, cancelled, expired or unconfirmed purchases do not advance; unavailable next links retain the existing return-to-building behavior'
],files},null,2)+'\n');console.log('Prepared local .59 source and explicit provenance.');
