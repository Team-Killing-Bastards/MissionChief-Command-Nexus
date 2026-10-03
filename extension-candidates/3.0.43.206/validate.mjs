import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {NOTES, notesSince} from './extension/nexus-update-notes-data.mjs';
const folder=new URL('./extension/',import.meta.url);
for(const file of fs.readdirSync(folder)) {
  if(!/\.(js|mjs)$/.test(file))continue;
  const result=spawnSync(process.execPath,['--check',fileURLToPath(new URL(file,folder))],{encoding:'utf8'});
  assert.equal(result.status,0,`${file}: ${result.stderr}`);
}
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',folder),'utf8'));
assert(NOTES.some(note=>note.version===manifest.version),'Every release needs its own note');
const markdown=fs.readFileSync(new URL('../../docs/extension-changelog.md',import.meta.url),'utf8').replaceAll('\r\n','\n');
for(const note of notesSince(null,manifest.version)) {
  const url=new URL(note.url);
  assert.equal(url.host,'github.com');
  assert(markdown.includes('## '+url.hash.slice(1)+'\n'),`Missing changelog anchor: ${url.hash}`);
}
const old=JSON.parse(fs.readFileSync(new URL('../3.0.43.205/extension/manifest.json',import.meta.url),'utf8'));
for(const key of ['key','permissions','host_permissions','content_security_policy','web_accessible_resources'])assert.deepEqual(manifest[key],old[key],`Unrequested manifest change: ${key}`);
const files=[manifest.background.service_worker,...manifest.content_scripts.flatMap(s=>[...(s.js||[]),...(s.css||[])]),manifest.options_page,manifest.action.default_popup,...Object.values(manifest.icons)];
for(const file of files)assert(fs.existsSync(new URL(file,folder)),`Missing manifest file ${file}`);
const scripts=manifest.content_scripts.find(s=>s.js?.includes('nexus-runtime.js'));
assert.equal(scripts.world,'MAIN');assert(scripts.js.indexOf('nexus-vehicle-claims.js')<scripts.js.indexOf('nexus-runtime.js'));
assert.equal(NOTES.filter(n=>n.version===manifest.version).length,3);
console.log('Candidate JavaScript, manifest references, preserved permissions/key and all changelog targets verified.');
