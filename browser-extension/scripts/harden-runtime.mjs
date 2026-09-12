import fs from 'node:fs';
import crypto from 'node:crypto';
const source=fs.readFileSync('runtime/nexus-runtime.js');
const manifest=JSON.parse(fs.readFileSync('extension/manifest.json'));
if(manifest.version==='3.0.43.43') {
  const expected=JSON.parse(fs.readFileSync('reference/local-43.json'));
  if(crypto.createHash('sha256').update(source).digest('hex')!==expected.testedRuntimeSha256)throw Error('Runtime differs from tested .43');
}
if(!source.toString().includes("build: '"+manifest.version+"'"))throw Error('Runtime and manifest version differ');
fs.writeFileSync('extension/nexus-runtime.js',source);
console.log('Prepared reviewed runtime '+manifest.version+' without regenerating an older build.');
