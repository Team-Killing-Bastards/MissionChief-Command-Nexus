import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {functions,runtime} from './helpers.mjs';
import {frameGuard,controllerBridge,startGuard} from '../scripts/prepare-alliance-57.mjs';
const context=vm.createContext({});vm.runInContext(fs.readFileSync('extension/nexus-alliance-core.js','utf8'),context);const C=context.NexusAllianceCore;
test('credit bands partition every boundary exactly once and never treat an unknown value as zero',()=>{
  for(const [amount,key]of [[0,'0'],[2999,'0'],[3000,'3'],[4999,'3'],[5000,'5'],[9999,'5'],[10000,'10'],[14999,'10'],[15000,'15'],[19999,'15'],[20000,'20'],[100000,'20']])assert.deepEqual(Array.from(C.ranges).filter(r=>r[0]!=='all'&&C.inRange(amount,r[0])).map(r=>r[0]),[key]);
  assert.equal(C.inRange(null,'all'),true);assert.equal(C.inRange(null,'0'),false);assert.equal(C.number(''),null);assert.equal(C.number(null),null);
});
test('participation distinguishes joined, new and unavailable evidence',()=>{
  for(const input of ['participated','participating','joined','yes'])assert.equal(C.participation(input),true);
  for(const input of ['new','not_participated','not participating','false'])assert.equal(C.participation(input),false);
  assert.equal(C.participation(''),null);assert.equal(C.participation('red'),null);
});
test('runtime changes are limited to exact isolation and dispatch coordination guards',()=>{
  assert.equal(runtime.split(frameGuard).length-1,1);assert.equal(runtime.split(controllerBridge).length-1,1);assert.equal(runtime.split(startGuard).length-1,2);
  const child={frameElement:{hasAttribute:()=>true}};vm.runInNewContext('(()=>{'+frameGuard+'throw Error("Heavy runtime ran");})()',{window:child});
});
test('Auto start and retry do nothing while alliance queue owns dispatch; expired lease does not block',()=>{
  const logs=[],store=new Map(),window={__NEXUS_ALLIANCE_SUPPORT__:{busy:true}};
  const c=functions(['nexusAllianceSupportBusy','startController','retryCurrent'],{window,localStorage:{getItem:key=>store.get(key)},Date,log:text=>logs.push(text)});
  c.startController();c.retryCurrent();assert.equal(logs.length,2);
  window.__NEXUS_ALLIANCE_SUPPORT__.busy=false;store.set('nexusAllianceSupportLeaseV1',JSON.stringify({until:Date.now()+10000}));assert.equal(c.nexusAllianceSupportBusy(),true);
  store.set('nexusAllianceSupportLeaseV1',JSON.stringify({until:Date.now()-10000}));assert.equal(c.nexusAllianceSupportBusy(),false);
});
