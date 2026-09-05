import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { devLibrary } from './dev-library.mjs';
const JSZip=devLibrary('jszip');
export const files=[
  'manifest.json','nexus-runtime.js','analytics-worker.mjs','analytics-core.mjs','analytics-record.mjs',
  'analytics-bridge.js','analytics-settings.js','analytics.html','deployment-config.mjs',
  'rules-core.mjs','rules-bridge.js','rules.js','rules.html','rules.css','rules-catalogue.json',
  'popup.js','popup.html','popup.css','privacy.html','LICENSE',
  'icons/nexus-16.png','icons/nexus-32.png','icons/nexus-48.png','icons/nexus-128.png'
];
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const manifest=JSON.parse(fs.readFileSync('extension/manifest.json','utf8'));
const original=JSON.parse(fs.readFileSync('reference/original-extension/BUILD-INFO.json','utf8'));
const build={extensionVersion:manifest.version,sourceVersion:original.sourceVersion,components:{...original.components,personnelAssignment:'1.3.13'},
  sourceRepository:original.sourceRepository,sourceCommit:original.sourceCommit,
  canonicalUserscriptSha256:original.sourceSha256,
  suppliedLegacySha256:sha(fs.readFileSync('reference/legacy-runtime.txt')),
  curatedBaselineSha256:sha(fs.readFileSync('reference/build-baseline.zip')),
  originalRuntimeSha256:original.runtimeSha256,runtimeSha256:sha(fs.readFileSync('extension/nexus-runtime.js')),
  status:'Local Edge personnel scanner update. This package is not submitted to the store; no live scanner timing certification.',
  personnelScannerChanges:['One shared read scheduler: 3 desktop requests, 250ms minimum start gap; iOS retains 2 requests and 350ms','Prefetch one station with 10-second freshness limit','Cancel all active scanner reads; timeout includes response body','Respect Retry-After on 429/503; preserve exact record reuse rules and assignment-write pacing'],
  changes:['Reject mixed parent/worker extension builds before startup','Preserve logger across BFCache navigation','Fail closed on unavailable sharing settings','Explicit sharing opt-in, preserving saved boolean choices','Cancel pre-send uploads after a sharing-setting change','Cross-context lock for rule migration/editor','Linear priority trimming with UTF-8/UTF-16 storage budget','Persist queue expiry even while sharing is paused','Reject corrupt pending batch identities','Reject credentials in endpoint URLs'],
  files:Object.fromEntries(files.map(file=>[file,sha(fs.readFileSync(path.join('extension',file)))]))
};
fs.writeFileSync('extension/BUILD-INFO.json',JSON.stringify(build,null,2)+'\n');
const output=path.join('release',`Nexus-Extension-${manifest.version}`);fs.mkdirSync(output,{recursive:true});
const zip=new JSZip();
for(const file of [...files,'BUILD-INFO.json'].sort()) {
  const content=fs.readFileSync(path.join('extension',file));
  const destination=path.join(output,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,content);
  zip.file(file,content,{date:new Date('2026-09-05T00:00:00Z'),createFolders:false,unixPermissions:0o100644});
}
const buffer=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9},platform:'UNIX'});
const archive=output+'.zip';fs.writeFileSync(archive,buffer);
const receipt={archive,bytes:buffer.length,sha256:sha(buffer),files:[...files,'BUILD-INFO.json'].length};
fs.writeFileSync('audit/package.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
