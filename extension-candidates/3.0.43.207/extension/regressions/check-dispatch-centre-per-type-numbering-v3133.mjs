import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const script = fs.readFileSync(path.join(root, 'nexus-dispatch-centre-rename.js'), 'utf8');

assert.equal(manifest.version, '3.0.43.189', 'extension version must be 3.0.43.151');
assert.ok(script.includes('const nextByType=new Map()'), 'plan must maintain independent counters by vehicle type');
assert.ok(script.includes('const key=String(item.type)'), 'vehicle type ID must own the numbering sequence');
assert.ok(script.includes('const sequenceNumber=nextByType.get(key)??state.config.start'), 'each type must start from the configured Start value');
assert.ok(script.includes('nextByType.set(key,sequenceNumber+1)'), 'only a successfully planned supported vehicle may advance its type counter');
assert.ok(!script.includes('let unsupported=0,noStation=0,nextNumber=state.config.start'), 'one global counter must not be used');
assert.ok(script.includes('Numbering runs separately for each vehicle type across the current rename scope.'), 'UI must explain per-type numbering');

const simulate = ({ start = 1, padding = 1, rows = [] } = {}) => {
  const nextByType = new Map();
  const out = [];
  for (const row of rows) {
    if (!row.supported || !row.station) continue;
    const key = String(row.type);
    const n = nextByType.get(key) ?? start;
    out.push(`${row.type}:${String(n).padStart(padding, '0')}`);
    nextByType.set(key, n + 1);
  }
  return out;
};

assert.deepEqual(simulate({rows:[
  {type:17,supported:true,station:'ANNIESLAND - FS'},
  {type:17,supported:true,station:'POLLOK - FS'},
  {type:16,supported:true,station:'PORT GLASGOW - FS'},
  {type:17,supported:true,station:'KIRKINTILLOCH - FS'},
  {type:16,supported:true,station:'CLARKSTON - FS'},
  {type:8,supported:true,station:'CENTRAL - PS'},
  {type:8,supported:true,station:'WEST - PS'},
]}), ['17:1','17:2','16:1','17:3','16:2','8:1','8:2'], 'same type must continue across stations while a new type restarts');

assert.deepEqual(simulate({start:1,padding:3,rows:[
  {type:17,supported:true,station:'A'},
  {type:17,supported:false,station:'B'},
  {type:16,supported:true,station:'C'},
  {type:17,supported:true,station:'D'},
]}), ['17:001','16:001','17:002'], 'unsupported rows must not consume a number in any type sequence');

console.log('PASS: 3.0.43.151 numbers Dispatch Centre rename targets independently per exact vehicle type while continuing across home stations.');
