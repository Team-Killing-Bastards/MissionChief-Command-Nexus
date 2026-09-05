import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';
import fs from 'node:fs';
import { cleanEvent, initialState, boundState, storedBytes, prepareBatch, acceptAck, retryDelay, validEndpoint, LIMITS } from '../extension/analytics-core.mjs';
import { cleanRecord } from '../extension/analytics-record.mjs';
const now = Date.now();
const event = (overrides={}) => ({kind:'activity',player:'123',at:now,record:{action:'CLICK'},id:randomUUID(),device:randomUUID(),session:randomUUID(),...overrides});
test('record sanitation excludes arbitrary game data, typed values and credentials',()=>{
  const input={action:'CLICK',password:'never',cookies:'never',body:{secret:'never'},inputValue:'never',route:'https://www.missionchief.co.uk/missions/17?token=secret#secret',targetHref:'https://unrelated.test/secret'};
  assert.deepEqual(cleanRecord(input),{action:'CLICK',route:'/missions/17',targetHref:''});
});
test('invalid mission events are rejected and oversized labels are bounded',()=>{
  assert.equal(cleanEvent(event({kind:'mission',record:{eventType:'dispatch',missionId:'bad'}}),now),null);
  assert.equal(cleanEvent(event({player:'invalid'}),now),null);
  assert.equal(cleanEvent(event({at:now-LIMITS.age-1}),now),null);
  assert.equal(cleanEvent(event({reason:'x'.repeat(900),username:'y'.repeat(200)}),now).reason.length,600);
});
test('the browser sanitizer produces events accepted by the bundled backend validator',()=>{
  const backend = vm.createContext({Date,Number,JSON,Set});
  vm.runInContext(fs.readFileSync('extension/google-backend/Code.gs','utf8'),backend);
  for(const kind of ['activity','session','mission','performance']) {
    const raw=event({kind,record:{eventType:'dispatch',missionId:'42',action:'START',units:[{vehicleId:'7',vehicleName:'Ambulance'}]}});
    const clean={...cleanEvent(raw),id:raw.id,session:raw.session,device:raw.device};
    assert.equal(backend.nxValidEvent(clean),true,kind);
  }
  assert.equal(backend.nxCell('=IMPORTDATA("https://invalid.test")').startsWith("'="),true);
});
test('a pending batch keeps identical IDs and payload across a worker restart',()=>{
  const state=initialState();state.events=[event(),event()];
  const first=prepareBatch(state,randomUUID,now);
  const restored=boundState(JSON.parse(JSON.stringify(state)),now);
  assert.deepEqual(prepareBatch(restored,randomUUID,now+100),first);
});
test('an inexact acknowledgement never deletes pending data',()=>{
  const state=initialState();state.events=[event(),event()];
  const batch=prepareBatch(state,randomUUID,now);
  for(const reply of [{ok:false},{ok:true,id:randomUUID(),eventIds:batch.events.map(e=>e.id)},{ok:true,id:batch.id,eventIds:batch.events.map(e=>e.id).reverse()}]) {
    assert.equal(acceptAck(state,batch,reply,now),false);assert.equal(state.events.length,2);
  }
  const later=event();state.events.push(later);
  assert.equal(acceptAck(state,batch,{ok:true,id:batch.id,eventIds:batch.events.map(e=>e.id)},now),true);
  assert.deepEqual(state.events,[later]);assert.equal(state.pending,null);
});
test('outage trimming protects pending events, prefers mission data and keeps order',()=>{
  const state=initialState();state.events=Array.from({length:11000},()=>event());
  const first=prepareBatch(state,randomUUID,now);const high=event({kind:'mission',record:{missionId:'42',eventType:'dispatch'}});state.events.push(high);
  const originalOrder=state.events.map(e=>e.id);
  boundState(state,now);
  assert.equal(state.events.length,10000);assert.equal(state.dropped,1001);
  assert.deepEqual(prepareBatch(state,randomUUID,now),first);
  assert.ok(state.events.includes(high));
  assert.deepEqual(state.events.map(e=>e.id),originalOrder.filter(id=>state.events.some(e=>e.id===id)));
});
test('non-ASCII queues remain within the conservative storage byte budget',()=>{
  const state=initialState();state.events=Array.from({length:5000},()=>event({record:{message:'漢'.repeat(600)}}));
  boundState(state,now);
  assert.ok(storedBytes(state.events)<=LIMITS.bytes);
  assert.ok(state.dropped>0);
});
test('expired, duplicate and corrupt events cannot poison the queue',()=>{
  const a=event(),state=initialState();state.events=[a,{...a},event({at:now-LIMITS.age-1}),event({id:'------------------------------------'}),event()];
  state.pending={id:randomUUID(),ids:[a.id,a.id],createdAt:now};
  boundState(state,now);assert.equal(state.events.length,2);assert.equal(state.dropped,3);assert.equal(state.pending,null);
});
test('batch size, retry backoff and endpoint credentials are bounded',()=>{
  const state=initialState();state.events=Array.from({length:800},()=>event({record:{message:'x'.repeat(600)}}));
  const batch=prepareBatch(state,randomUUID,now);
  assert.ok(batch.events.length<=500);assert.ok(JSON.stringify(batch).length<=550000);
  assert.equal(retryDelay(1,()=>0),30000);assert.equal(retryDelay(5),900000);
  assert.equal(validEndpoint('https://script.google.com/macros/s/demo/exec'),true);
  for(const value of ['https://u:p@script.google.com/macros/s/demo/exec','https://script.google.com.evil.test/macros/s/demo/exec','http://script.google.com/macros/s/demo/exec','https://script.google.com/macros/s/demo/exec?token=x']) assert.equal(validEndpoint(value),false);
});
