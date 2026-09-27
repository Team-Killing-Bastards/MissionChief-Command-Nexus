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
const markdown=fs.readFileSync(new URL('../../docs/extension-changelog.md',import.meta.url),'utf8');
for(const note of notesSince(null,manifest.version)) {
  const url=new URL(note.url);
  assert.equal(url.host,'github.com');
  assert(markdown.includes('## '+url.hash.slice(1)+'\n'),`Missing changelog anchor: ${url.hash}`);
}
console.log('Candidate syntax and every changelog target verified.');
