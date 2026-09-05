import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { devLibrary } from './dev-library.mjs';
const require=createRequire(import.meta.url),acorn=require('internal/deps/acorn/acorn/dist/acorn'),JSZip=devLibrary('jszip');
const manifest=JSON.parse(fs.readFileSync('extension/manifest.json','utf8'));
assert.equal(manifest.manifest_version,3);assert.match(manifest.version,/^\d+\.\d+\.\d+\.\d+$/);
assert.ok(manifest.description.length<=132);
assert.deepEqual([...manifest.permissions].sort(),['activeTab','alarms','scripting','storage']);
assert.deepEqual(manifest.host_permissions,['https://script.google.com/*','https://script.googleusercontent.com/*']);
assert.ok(!manifest.update_url && !manifest.externally_connectable && !manifest.web_accessible_resources);
assert.equal(manifest.content_scripts[0].world,'MAIN');assert.equal(manifest.content_scripts[0].all_frames,true);
for(const script of manifest.content_scripts)assert.deepEqual(script.matches,['https://www.missionchief.co.uk/*','https://police.missionchief.co.uk/*']);
const zip=await JSZip.loadAsync(fs.readFileSync(`release/Nexus-Extension-${manifest.version}.zip`));
const info=JSON.parse(await zip.file('BUILD-INFO.json').async('string'));
assert.equal(info.extensionVersion,manifest.version);
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
assert.equal(sha(fs.readFileSync('reference/original-extension/nexus-runtime.js')),info.originalRuntimeSha256);
assert.equal(sha(fs.readFileSync('reference/build-baseline.zip')),info.curatedBaselineSha256);
assert.deepEqual(Object.keys(zip.files).sort(),[...Object.keys(info.files),'BUILD-INFO.json'].sort());
let scripts=0;
for(const [file,expected] of Object.entries(info.files)) {
  const data=await zip.file(file).async('nodebuffer');assert.equal(sha(data),expected,file);
  assert.equal(sha(fs.readFileSync(path.join('extension',file))),expected,file+' source drift');
  if(/\.(mjs|js)$/.test(file)) {
    const source=data.toString();acorn.parse(source,{ecmaVersion:'latest',sourceType:'module'});scripts++;
    assert.ok(!/\beval\s*\(|\bnew\s+Function\s*\(/.test(source),file+' dynamic code execution');
  }
  if(file.endsWith('.html')) {
    const html=data.toString();
    assert.ok(!/<script\b[^>]*src=["']https?:/i.test(html),file+' remote script');
    for(const match of html.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi))assert.ok(zip.file(match[1]),'Missing script '+match[1]);
  }
}
assert.equal(sha(await zip.file('nexus-runtime.js').async('nodebuffer')),info.runtimeSha256);
console.log(`PASS: ${scripts} executable files parse; manifest, permissions, ${Object.keys(info.files).length} file hashes, ZIP contents and provenance verified.`);
