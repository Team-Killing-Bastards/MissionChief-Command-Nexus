import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { functionText } from './helpers.mjs';
const source=fs.readFileSync('extension/nexus-runtime.js','utf8');
const start=source.indexOf('  async function credits() {');
const code=source.slice(start,source.indexOf('  function session(action)',start));
test('logger marker rewards cannot change the native dispatch decision',()=>{
 const begin=source.indexOf('    function getMissionCredits() {'),fn=source.slice(begin,source.indexOf('    function formatRuntime(',begin));
 let snapshots=0,dispatches=0,shares=0;
 const c=vm.createContext({getMissionLoggerMissionSnapshot:()=>{snapshots++;return {advertisedCredits:15000};},getMissionValueDocuments:()=>[],mfLastMissionCreditCapture:null,
 MF_SHARE_CREDIT_THRESHOLD:10000,clearAutoAdvanceAfterDispatchState(){},clickDispatchOnly(){dispatches++;return true;},clickDispatchAndShareOnly(){shares++;return true;}});
 vm.runInContext(fn+'\n'+functionText('clickMissionDispatchByValue'),c);
 const result=c.clickMissionDispatchByValue(c.getMissionCredits(),'test');
 assert.equal(result.clicked,true);assert.equal(result.shared,false);
 assert.equal(dispatches,1);assert.equal(shares,0);assert.equal(snapshots,0);
 assert.equal(c.mfLastMissionCreditCapture.source,'not-found');
});

test('explicit page reward still drives the established high-value share path',()=>{
 const begin=source.indexOf('    function getMissionCredits() {'),fn=source.slice(begin,source.indexOf('    function formatRuntime(',begin));
 let shares=0;
 const c=vm.createContext({getMissionValueDocuments:()=>[{querySelectorAll:()=>[{getAttribute:()=> '15000'}]}],mfLastMissionCreditCapture:null,
 MF_SHARE_CREDIT_THRESHOLD:10000,createAutoAdvanceAfterDispatchState:()=>null,clearAutoAdvanceAfterDispatchState(){},updateStatusBox(){},clickDispatchAndShareOnly(){shares++;return true;}});
 vm.runInContext(fn+'\n'+functionText('clickMissionDispatchByValue'),c);
 assert.equal(c.clickMissionDispatchByValue(c.getMissionCredits(),'test').shared,true);assert.equal(shares,1);
});
async function capture(registry,transactions){
 const events=[],pages=[];
 const ctx=vm.createContext({creditBusy:false,creditAbort:null,lastCredit:0,creditPage:2,Date,AbortController,
 leader:()=>true,active:()=>true,registry,whoIncomePlayer:()=> '1',duplicate:()=>false,later:()=>1,clearTimeout:()=>{},timers:new Set(),
 fetch:async url=>{pages.push(url);return {ok:true,text:async()=>'<table></table>'};},DOMParser:class{parseFromString(){return {}; }},
 parseMissionLoggerCreditTransactionsFromDocument:()=>transactions,
 normaliseMissionLoggerCreditDescription:s=>s.toLowerCase(),emit:(kind,r)=>events.push({kind,r}),activity:(action,r)=>events.push({kind:'activity',r:{action,...r}})});
 vm.runInContext(code,ctx);await ctx.credits();return {events,pages};
}
test('captures ledger income when registry is empty and still scans bounded pages',async()=>{const {events,pages}=await capture({},[{transactionId:'x',transactionAt:'2026-09-06T12:00:00Z',amount:123,missionName:'New',normalisedDescription:'new'}]);assert.equal(pages.length,3);assert.equal(events.filter(e=>e.r.action==='CREDIT_TRANSACTION').length,3);assert.equal(events.filter(e=>e.kind==='mission').length,0);});
test('explicit mission ID matches despite different displayed name',async()=>{const {events}=await capture({'42':{missionId:'42',missionName:'Old title',firstUnitSentAt:'2026-09-06T11:00:00Z'}},[{transactionId:'x',transactionAt:'2026-09-06T12:00:00Z',amount:123,missionId:'42',normalisedDescription:'new title'}]);assert.ok(events.some(e=>e.r.eventType==='mission-credit'));});
test('ambiguous names do not guess mission ownership and expenses are excluded',async()=>{const a={missionName:'Same',completedAt:'2026-09-06T12:00:00Z'};const {events}=await capture({'1':{...a,missionId:'1'},'2':{...a,missionId:'2'}},[{transactionId:'x',transactionAt:a.completedAt,amount:123,normalisedDescription:'same'},{transactionId:'cost',transactionAt:a.completedAt,amount:-100,normalisedDescription:'same'}]);assert.equal(events.filter(e=>e.kind==='mission').length,0);assert.equal(events.filter(e=>e.r.transactionId==='cost').length,0);});
