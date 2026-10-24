import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {root,parseArticle} from './build.mjs';
const cfg=JSON.parse(await fs.readFile(path.join(root,'site.json'),'utf8')),source=path.resolve(root,'..',cfg.sourceDirectory);
const manifest=JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));
if(manifest.version!==cfg.sourceVersion)throw Error('Source version differs from documentation');
const refs=new Set(['manifest.json',manifest.background.service_worker,manifest.action.default_popup,manifest.options_page]);
for(const script of manifest.content_scripts||[])for(const p of [...script.js||[],...script.css||[]])refs.add(p);
for(const slug of cfg.articles){const a=parseArticle(await fs.readFile(path.join(root,'content',slug+'.md'),'utf8'));for(const file of a.sources)refs.add(file);}
const files=[];
for(const name of [...refs].sort()){
 const file=path.resolve(source,name);if(!file.startsWith(source+path.sep))throw Error('Unsafe evidence path');
 const bytes=await fs.readFile(file);files.push({path:name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
const evidence={sourceVersion:manifest.version,sourceCommit:cfg.sourceCommit,sourceDirectory:cfg.sourceDirectory,storeParity:'Not verified',captured:cfg.revision,contentScripts:manifest.content_scripts.map(s=>({matches:s.matches,world:s.world||'ISOLATED',files:s.js||[]})),files};
await fs.writeFile(path.join(root,'source-audit.json'),JSON.stringify(evidence,null,2)+'\n');
console.log('Verified '+files.length+' source evidence files and all manifest script references.');
