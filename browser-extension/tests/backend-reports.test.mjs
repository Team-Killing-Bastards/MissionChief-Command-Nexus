import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync('extension/google-backend/Code.gs','utf8');
function setup(existing=[]){
  const calls=[],c=vm.createContext({Date,console,SpreadsheetApp:{flush(){}}});vm.runInContext(source,c);
  c.nxFindRows=()=>existing;c.nxSetRows=(_,first,rows)=>calls.push({first,rows});
  const sheet={getName:()=> 'Mission Summary',getLastRow:()=>1000,getRange:()=>({getValues:()=>calls.at(-1).rows})};
  return {c,sheet,calls};
}
test('hundreds of adjacent report updates use one bulk write without changing results',()=>{
  const existing=Array.from({length:722},(_,i)=>({index:i+2,row:[String(i),'old']})),h=setup(existing);
  h.c.nxStore(h.sheet,existing.map(e=>[e.row[0],'new']),[0],true);
  const writes=h.calls.filter(x=>x.rows.length);assert.equal(writes.length,1);assert.equal(writes[0].rows.length,722);assert.equal(writes[0].first,2);
});
test('batched updates preserve gaps and deduplicate new keys without writing row minus one',()=>{
  const h=setup([{index:2,row:['a','old']},{index:4,row:['b','old']}]);
  h.c.nxStore(h.sheet,[['a',1],['b',2],['c',3],['c',4]],[0],true);
  assert.deepEqual(h.calls.map(c=>c.first),[2,4,1001]);assert.equal(h.calls[2].rows.length,1);assert.equal(h.calls[2].rows[0][1],4);
});
test('raw insert mode preserves first occurrence and never replaces existing IDs',()=>{
  const h=setup([{index:2,row:['a','old']}]);h.c.nxStore(h.sheet,[['a',1],['b',2],['b',3]]);
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].first,1001);assert.equal(h.calls[0].rows.length,1);assert.equal(h.calls[0].rows[0][1],2);
});
test('report scan reads each row once in bounded blocks and caches the last row',()=>{
  const h=setup();let lastReads=0,seen=0;const sizes=[];
  h.c.nxEach({getLastRow(){lastReads++;return 5002;},getRange(first,col,count,width){sizes.push(count);return {getValues:()=>Array.from({length:count},(_,i)=>[first+i])};}},1,()=>seen++,Date.now()+10000);
  assert.equal(seen,5001);assert.equal(lastReads,1);assert.deepEqual(sizes,[2000,2000,1001]);
});
