import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { devLibrary } from './dev-library.mjs';
import {releaseProvenance} from './release-provenance.mjs';
const require=createRequire(import.meta.url),acorn=require('internal/deps/acorn/acorn/dist/acorn'),JSZip=devLibrary('jszip');
const manifest=JSON.parse(fs.readFileSync('extension/manifest.json','utf8'));
assert.equal(manifest.manifest_version,3);assert.match(manifest.version,/^\d+\.\d+\.\d+\.\d+$/);
assert.ok(!manifest.version_name || manifest.version_name === manifest.version, 'Display version must match the package version');
assert.ok(manifest.description.length<=132);
assert.deepEqual([...manifest.permissions].sort(),['activeTab','alarms','scripting','storage']);
assert.deepEqual(manifest.host_permissions,['https://script.google.com/*','https://script.googleusercontent.com/*']);
assert.ok(!manifest.update_url && !manifest.externally_connectable);
const gameMatches=['https://www.missionchief.co.uk/*','https://police.missionchief.co.uk/*'];
assert.deepEqual(manifest.web_accessible_resources,[{resources:['icons/nexus-48.png'],matches:gameMatches}]);
assert.deepEqual(manifest.content_scripts[0],{matches:gameMatches,js:['nexus-settings.js'],run_at:'document_start',all_frames:true,world:'ISOLATED'});
assert.deepEqual(manifest.content_scripts[1],{matches:gameMatches,js:['nexus-storage-guard.js','nexus-dispatch-trace.js','nexus-settings-main.js','nexus-runtime.js'],run_at:'document_start',all_frames:true,world:'MAIN'});
for(const script of manifest.content_scripts) {
  const route=script.js.includes('nexus-course-list-filters.js')?'schoolings*':script.js.includes('nexus-daily.js')?'credits/daily*':script.js.includes('nexus-overview.js')?'credits/overview*':'*';
  assert.deepEqual(script.matches,gameMatches.map(s=>s.replace(/\*$/,route)));
}
const zip=await JSZip.loadAsync(fs.readFileSync(`release/Nexus-Extension-${manifest.version}.zip`));
const info=JSON.parse(await zip.file('BUILD-INFO.json').async('string'));
assert.equal(info.extensionVersion,manifest.version);
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const promotion=releaseProvenance();
assert.equal(manifest.version,promotion.version,'Explicitly review the next release provenance before publication');
assert.equal(manifest.version,JSON.parse(fs.readFileSync('package.json')).version);
assert.equal(manifest.name,'MissionChief Command Nexus');
assert.equal(info.testedLocalZipSha256,promotion.testedZipSha256);
assert.equal(info.testedLocalVersion,promotion.testedLocalVersion||'3.0.43.43');
assert.equal(info.runtimeSha256,promotion.sourceRuntimeSha256,'Package runtime must match the reviewed release source');
for(const [file,sum] of Object.entries(promotion.files))assert.equal(sha(fs.readFileSync(path.join('extension',file))),sum,'Unreviewed promotion change: '+file);
for(const entry of manifest.content_scripts)for(const file of entry.js)assert.ok(zip.file(file),'Missing content script '+file);
assert.equal(await zip.file('nexus-settings.js').async('string'),await zip.file('nexus-settings-main.js').async('string'));
assert.ok(!zip.file('LOCAL-INSTALL.txt'));
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
