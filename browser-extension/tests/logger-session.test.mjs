import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,webcrypto} from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import {functions,events} from './helpers.mjs';
import {cleanRecord} from '../extension/analytics-record.mjs';
import {initialState,prepareBatch,acceptAck,boundState,loggerHealth,activityDate,describeDelivery} from '../extension/analytics-core.mjs';
const today = Date.parse('2026-09-07T10:00:00Z'), yesterday = today-86400000;
const queued = (at, fresh=false) => ({id:randomUUID(),device:randomUUID(),session:randomUUID(),player:'419938',kind:'mission',at,
  record:{missionId:'42',eventType:'mission-observed',firstObservedAt:new Date(at).toISOString()},...(fresh?{queuedAt:at}:{})});
function live(start=today, restored={}) {
  let now=start; const timers=[], out=[], storage=new Map([['nexus-full-missions-v1:419938',JSON.stringify(restored)]]);
  const win=events(),doc=events(); win.top=win;win.document=doc;
  const nativeDispatch=win.dispatchEvent.bind(win);
  win.dispatchEvent=e=>{if(e.type==='nexus-analytics-event-v1')out.push(JSON.parse(e.detail));return nativeDispatch(e);};
  doc.querySelector=s=>s==='#navbar_profile_link'?{getAttribute:()=>'/profile/419938',textContent:'Test player'}:null;
  doc.querySelectorAll=()=>[];
  class Clock extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  const api=functions(['installNexusFullLogger'],{window:win,document:doc,crypto:{randomUUID},Map,Set,Date:Clock,Intl,
    cleanRecord,CustomEvent:class {constructor(type,init){this.type=type;this.detail=init?.detail;}},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    trimMissionLoggerText:s=>String(s||''),location:{pathname:'/',origin:'https://www.missionchief.co.uk'},
    setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){},navigator:{userAgent:'test'},innerWidth:1000,innerHeight:800});
  api.installNexusFullLogger();win.dispatchEvent({type:'nexus-analytics-control-v1',detail:'{"enabled":true}'});
  return {win,out,advance:t=>{now=t;},tick:()=>{const t=timers.findLast(t=>t.ms===500||t.ms===5000);t.fn();},
    emit:(type,extra={})=>win.__NEXUS_FULL_LOGGER__.emit('mission',{eventType:type,missionId:'42',...extra})};
}
test('startup ignores restored lifecycle suppression and captures actual live time',()=>{
  const l=live(today,{42:{firstObservedAt:new Date(yesterday).toISOString(),completedAt:new Date(yesterday).toISOString(),seenAt:yesterday}});
  assert.equal(l.emit('mission-observed'),true);
  assert.equal(l.out[0].at,today);assert.equal(l.out[0].record.firstObservedAt,new Date(today).toISOString());
  assert.equal(l.emit('mission-completed',{completedAt:new Date(today).toISOString()}),true);
  assert.equal(l.emit('mission-observed'),false);
});
test('reload keeps stable lifecycle identity but does not restore live timestamps',()=>{
  const a=live(),b=live(today+1000);a.emit('mission-observed');b.emit('mission-observed');
  assert.equal(a.out[0].eventKey,b.out[0].eventKey);assert.notEqual(a.out[0].activitySession,b.out[0].activitySession);
  assert.equal(b.out[0].at,today+1000);
  a.emit('mission-completed');b.emit('mission-completed');assert.equal(a.out[1].eventKey,b.out[1].eventKey);
});
test('London midnight resets session, dedup and observation state before next live event',()=>{
  const l=live(Date.parse('2026-09-07T22:59:59Z'));l.emit('mission-observed');const first=l.out[0];
  l.advance(Date.parse('2026-09-07T23:00:01Z'));l.emit('mission-observed');const next=l.out[1];
  assert.equal(next.activityDate,'2026-09-08');assert.notEqual(next.activitySession,first.activitySession);
  assert.notEqual(next.eventKey,first.eventKey);assert.equal(next.record.firstObservedAt,'2026-09-07T23:00:01.000Z');
  assert.equal(activityDate(Date.parse('2026-12-07T23:30:00Z')),'2026-12-07');
});
test('fresh events bypass an immutable failed legacy backlog and ACK cannot erase the other lane',()=>{
  const state=initialState(),old=queued(yesterday),fresh=queued(today,true);state.events=[old];
  state.pending={id:randomUUID(),createdAt:yesterday,ids:[old.id],nextAttempt:today+900000};
  state.events.push(fresh);const batch=prepareBatch(state,randomUUID,today);
  assert.deepEqual(batch.events.map(e=>e.id),[fresh.id]);assert.equal(batch.telemetry[fresh.id].isReplay,false);
  assert.equal(batch.events[0].at,today);assert.equal(batch.loggerHealth.backlogEventCount,1);
  acceptAck(state,batch,{ok:true,id:batch.id,eventIds:[fresh.id]},today);
  assert.equal(state.pending.ids[0],old.id);assert.equal(state.events[0].at,yesterday);
});
test('new backlog batch preserves captured timestamps, marks replay and retries identically after restoration',()=>{
  const state=initialState();state.events=[queued(yesterday)];const first=prepareBatch(state,randomUUID,today);
  assert.equal(first.events[0].at,yesterday);assert.equal(first.telemetry[first.events[0].id].isReplay,true);
  assert.equal(first.telemetry[first.events[0].id].uploadedAt,today);
  const restored=boundState(JSON.parse(JSON.stringify(state)),today+1000);
  assert.deepEqual(prepareBatch(restored,randomUUID,today+1000),first);
  assert.equal(loggerHealth(restored,today).oldestQueuedEventAt,yesterday);
});
test('bridge hashes stable mission identities and retains them across repeated captures',async()=>{
  const win=events(),sent=[];const timers=[];
  win.top=win;
  vm.runInNewContext(fs.readFileSync('extension/analytics-bridge.js','utf8'),{window:win,crypto:webcrypto,TextEncoder,Uint8Array,Date,JSON,
    chrome:{runtime:{sendMessage:async m=>{if(m.events.length)sent.push(...m.events);return {ok:true};}},storage:{onChanged:{addListener(){}}}},
    CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},setInterval:()=>1,clearInterval(){},setTimeout:fn=>{timers.push(fn);return 1;},clearTimeout(){}});
  const raw={kind:'mission',player:'419938',at:today,eventKey:'419938:42:mission-completed',record:{eventType:'mission-completed',missionId:'42'}};
  win.dispatchEvent({type:'nexus-analytics-event-v1',detail:JSON.stringify(raw)});
  win.dispatchEvent({type:'nexus-analytics-event-v1',detail:JSON.stringify(raw)});
  await new Promise(r=>setTimeout(r,30));for(const fn of timers.splice(0))await fn();
  assert.equal(sent.length,2);assert.equal(sent[0].id,sent[1].id);
});
test('a former fresh batch that becomes backlog cannot trap newer live events',()=>{
  const state=initialState();state.events=[queued(yesterday,true)];
  const old=prepareBatch(state,randomUUID,yesterday);state.priorityPending.nextAttempt=today+900000;
  const fresh=queued(today,true);state.events.push(fresh);
  const next=prepareBatch(state,randomUUID,today);assert.equal(next.events[0].id,fresh.id);
  assert.equal(state.deferredPending[0].id,old.id);
  assert.equal(state.deferredPending[0].telemetry[old.events[0].id].uploadedAt,yesterday);
  const replay=describeDelivery(old,state,today);
  assert.equal(replay.events[0].at,yesterday);assert.equal(replay.telemetry[old.events[0].id].isReplay,true);
  assert.equal(replay.telemetry[old.events[0].id].uploadedAt,today);assert.equal(replay.loggerHealth.activityDate,'2026-09-07');
});
test('backend accepts additive reports, preserves receipt time and deduplicates legacy lifecycle identities',()=>{
  const backend=vm.createContext({Date,Number,JSON,Set,Utilities:{formatDate:d=>activityDate(+d)}});
  vm.runInContext(fs.readFileSync('extension/google-backend/Code.gs','utf8'),backend);
  const state=initialState();state.events=[queued(today,true)];const batch=prepareBatch(state,randomUUID,today);
  const envelope=backend.nxCaptureEnvelope(batch);
  const saved={...envelope,received_at:'2026-09-07T10:00:05.000Z'};
  assert.equal(backend.nxCaptureMatches(saved,batch),true);assert.equal(saved.events[0].at,today);
  assert.equal(backend.nxCaptureMatches({...batch,telemetry:undefined,loggerHealth:undefined},batch),true);
  assert.equal(backend.nxCaptureMatches(saved,{...batch,events:[{...batch.events[0],at:today+1}]}),false);
  const key=(type,at,player='419938')=>backend.nxLifecycleIdentity(player,'42',type,new Date(at),{});
  assert.equal(key('mission-completed',today),key('mission-completed',yesterday));
  assert.notEqual(key('mission-observed',today),key('mission-observed',yesterday));
  assert.notEqual(key('mission-completed',today),key('mission-completed',today,'999'));
});
test('newly generated raw fixture contains current London mission capture and separately marked backlog',()=>{
  const now=Date.now(),l=live(now);l.emit('mission-observed');
  const state=initialState(),fresh={...l.out[0],id:randomUUID(),device:randomUUID(),session:l.out[0].activitySession,queuedAt:now};
  delete fresh.activityDate;delete fresh.activitySession;delete fresh.eventKey;
  state.events=[queued(now-86400000),fresh];const batch=prepareBatch(state,randomUUID,now);
  assert.equal(activityDate(batch.events[0].at),activityDate(now));
  assert.equal(activityDate(Date.parse(batch.events[0].record.firstObservedAt)),activityDate(now));
  fs.mkdirSync('audit',{recursive:true});
  fs.writeFileSync('audit/logger-report-synthetic.json',JSON.stringify({evidence:'AUTOMATED FIXTURE - not a live game upload',generatedAt:new Date(now).toISOString(),report:batch},null,2));
});

