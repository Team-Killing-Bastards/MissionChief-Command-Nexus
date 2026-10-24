import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {root} from './build.mjs';
const cfg=JSON.parse(await fs.readFile(path.join(root,'site.json'),'utf8')),source=path.resolve(root,'..',cfg.sourceDirectory),out=path.join(root,'output/help-links');
await fs.mkdir(out,{recursive:true});
const manifest=JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));if(manifest.version!==cfg.sourceVersion)throw Error('Review the new extension source first');
const edits=[['popup.html','  <script src="popup.js"></script>','  <p><a href="https://nexus.blyth.scot/guide/" target="_blank" rel="noopener noreferrer">User Guide</a></p>\n  <script src="popup.js"></script>'],['nexus-tools.js','<a id="discordSupport"','<a href="https://nexus.blyth.scot/guide/" target="_blank" rel="noopener noreferrer">User Guide</a><a id="discordSupport"']];
const results=[];
for(const [name,old,value]of edits){
 const before=await fs.readFile(path.join(source,name),'utf8');if(before.split(old).length!==2)throw Error('Source anchor changed: '+name);
 const after=before.replace(old,value);await fs.writeFile(path.join(out,name),after);
 results.push({name,sourceSha256:crypto.createHash('sha256').update(before).digest('hex'),previewSha256:crypto.createHash('sha256').update(after).digest('hex')});
}
await fs.writeFile(path.join(out,'README.txt'),'Review-only file previews. This directory is NOT an installable extension. Do not activate links until /guide is live. Apply reviewed edits to a separately versioned current extension and regenerate its provenance/package checks. No manifest, permissions or operational source changed.\n');
await fs.writeFile(path.join(out,'evidence.json'),JSON.stringify(results,null,2));
console.log('Prepared two non-installable Help-link previews; original extension unchanged.');
