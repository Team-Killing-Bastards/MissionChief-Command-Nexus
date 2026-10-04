import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'nexus-real-locations.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
assert.equal(manifest.version,'3.0.43.189');
assert.ok(manifest.version_name.startsWith('3.0.43.189 '));
const build=source.slice(source.indexOf('async function buildOne('),source.indexOf('async function runBuild('));
assert.ok(build.indexOf('const before=await fetchVerificationBuildings()')<build.indexOf('await fetch(action'), 'snapshot must precede submission');
assert.ok(!build.includes('if(rejection)throw Error'), 'a generic error page cannot be treated as a certain failure');
assert.ok(!build.includes('if(responseId)return'), 'a response URL alone cannot prove creation');
assert.ok(build.indexOf('for(let i=0;i<24;i++)')<build.indexOf('MissionChief displayed an error'), 'verify after game error response');
assert.ok(build.includes('!beforeIds.has(buildingIdOf(b))'), 'a building must be new');
assert.ok(build.includes('return hasCoords?distanceMeters(item,b)<350:sameCaption(buildingCaptionOf(b),caption)'), 'match the intended location');
assert.ok(build.includes('throw unverified('), 'unverified outcomes must stop the batch');
console.log('PASS: Realism verifies new station after generic error and stops safely when outcome is uncertain.');
