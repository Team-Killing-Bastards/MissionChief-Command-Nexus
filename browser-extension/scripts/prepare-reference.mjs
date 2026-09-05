import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {devLibrary} from './dev-library.mjs';
const zipFile='reference/build-baseline.zip';
const bytes=fs.readFileSync(zipFile);
if(crypto.createHash('sha256').update(bytes).digest('hex')!=='bbddb1445a541c5aea5bd2c5ccb71df42656be1499be9fe2106b13b831755f31')throw Error('Supplied baseline ZIP identity changed');
const zip=await devLibrary('jszip').loadAsync(bytes),root=path.resolve('reference/original-extension');
for(const [name,entry] of Object.entries(zip.files)) {
  const target=path.resolve(root,name);
  if(!target.startsWith(root+path.sep)||entry.unsafeOriginalName && entry.unsafeOriginalName!==name)throw Error('Unsafe ZIP path');
  if(entry.dir)fs.mkdirSync(target,{recursive:true});
  else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,await entry.async('nodebuffer'));}
}
console.log('Verified and extracted curated .13 build baseline.');
