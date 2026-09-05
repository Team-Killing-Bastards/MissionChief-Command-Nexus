import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import * as analytics from '../extension/analytics-core.mjs';
import * as rules from '../extension/rules-core.mjs';
import { events, settle } from './helpers.mjs';
const KEY='nexusAnalyticsV1',SETTINGS='nexusAnalyticsSettingsV1';
const game={frameId:0,tab:{id:1},url:'https://www.missionchief.co.uk/'};
const settingsPage={url:'chrome-extension://test/analytics.html'};
const raw=()=>({kind:'activity',player:'123',at:Date.now(),record:{action:'CLICK'},id:randomUUID(),session:randomUUID()});
function worker(data={},options={}) {
  const messages=[],requests=[],locks=[];let listener,alarmListener;
  const chrome={
    runtime:{getURL:name=>'chrome-extension://test/'+name,onMessage:{addListener:fn=>listener=fn},onInstalled:{addListener(){}},onStartup:{addListener(){}}},
    tabs:{create:async()=>{}},
    storage:{local:{
      get:async keys=>{
        if(options.read) await options.read(keys);
        const result={};for(const key of Array.isArray(keys)?keys:[keys]) if(key in data)result[key]=structuredClone(data[key]);return result;
      },
      set:async values=>{if(options.failStorage)throw Error('Quota exceeded');Object.assign(data,structuredClone(values));},setAccessLevel:async()=>{}
    }},
    alarms:{create:async()=>{},onAlarm:{addListener(fn){alarmListener=fn}}},
    permissions:{contains:options.permission || (async()=>true)}
  };
  let lockTail=Promise.resolve();
  const navigator={locks:{request(name,fn){locks.push(name);const current=lockTail.then(fn);lockTail=current.catch(()=>{});return current;}}};
  const context=vm.createContext({...analytics,...rules,chrome,navigator,GOOGLE_ENDPOINT:'https://script.google.com/macros/s/test/exec',URL,Date,JSON,Number,Set,Map,TextEncoder,AbortController,crypto:{randomUUID},setTimeout,clearTimeout,
    fetch:async(url,opts)=>{const batch=JSON.parse(opts.body);requests.push(batch);if(options.fetch)return options.fetch(url,opts,batch);return {ok:true,text:async()=>JSON.stringify({ok:true,id:batch.id,eventIds:batch.events.map(e=>e.id)})};}
  });
  vm.runInContext(fs.readFileSync('extension/analytics-worker.mjs','utf8').replace(/^import .*\n/gm,''),context);
  const send=(message,sender=game)=>new Promise(resolve=>{const result=listener(message,sender,reply=>{messages.push(reply);resolve(reply)});if(result!==true)resolve(undefined);});
  return {send,data,requests,locks,navigator,context,alarm:()=>alarmListener({name:'nexus-analytics'})};
}
test('fresh installs capture and upload nothing until an explicit choice',async()=>{
  const w=worker();const reply=await w.send({type:'NEXUS_ANALYTICS_CAPTURE',events:[raw()]});await settle();
  assert.equal(reply.disabled,true);assert.equal(w.requests.length,0);assert.equal(w.data[KEY],undefined);
});
test('explicit sharing choice persists and accepted events upload with stable identity',async()=>{
  const w=worker({[SETTINGS]:{enabled:true}});const reply=await w.send({type:'NEXUS_ANALYTICS_CAPTURE',events:[raw()]});await settle();
  assert.equal(reply.ok,true);assert.equal(w.requests.length,1);assert.equal(w.data[KEY].events.length,0);
  assert.equal(w.requests[0].events[0].device,w.data.nexusDevice);
});
test('capture refuses another website, child frame and extension UI impostor',async()=>{
  const w=worker({[SETTINGS]:{enabled:true}});
  for(const sender of [{...game,url:'https://evil.test/'},{...game,frameId:1},{url:settingsPage.url}]) assert.equal(await w.send({type:'NEXUS_ANALYTICS_CAPTURE',events:[raw()]},sender),undefined);
  assert.equal(await w.send({type:'NEXUS_ANALYTICS_SETTINGS',enabled:true},game),undefined);
  await settle();assert.equal(w.requests.length,0);
});
test('storage failure does not acknowledge capture or upload an unsaved event',async()=>{
  const w=worker({[SETTINGS]:{enabled:true}},{failStorage:true});const reply=await w.send({type:'NEXUS_ANALYTICS_CAPTURE',events:[raw()]});await settle();
  assert.equal(reply.ok,false);assert.equal(w.requests.length,0);
});
test('lost response and worker restart retry the exact durable batch',async()=>{
  const data={[SETTINGS]:{enabled:true}};
  const first=worker(data,{fetch:async()=>{throw Error('offline')}});
  await first.send({type:'NEXUS_ANALYTICS_CAPTURE',events:[raw()]});await settle();
  assert.equal(data[KEY].events.length,1);assert.equal(data[KEY].failures,1);
  const second=worker(data);await second.send({type:'NEXUS_ANALYTICS_RETRY'},settingsPage);await settle();
  assert.deepEqual(second.requests[0],first.requests[0]);assert.equal(data[KEY].events.length,0);
});
test('pause during an asynchronous permission check prevents the pending upload',async()=>{
  let resume,started;const waiting=new Promise(resolve=>started=resolve);
  const permission=()=>new Promise(resolve=>{resume=resolve;started()});
  const w=worker({[SETTINGS]:{enabled:true}},{permission});
  await w.send({type:'NEXUS_ANALYTICS_CAPTURE',events:[raw()]});await waiting;
  await w.send({type:'NEXUS_ANALYTICS_SETTINGS',enabled:false},settingsPage);resume(true);await settle();
  assert.equal(w.requests.length,0);assert.equal(w.data[KEY].events.length,1);
});
test('a malformed sharing toggle cannot overwrite the saved setting',async()=>{
  const w=worker({[SETTINGS]:{enabled:true}});
  assert.equal((await w.send({type:'NEXUS_ANALYTICS_SETTINGS',enabled:'false'},settingsPage)).ok,false);
  assert.equal(w.data[SETTINGS].enabled,true);
});
test('expired queue records are actually removed from storage while sharing is paused',async()=>{
  const state=analytics.initialState();state.events=[{...raw(),device:randomUUID(),at:Date.now()-analytics.LIMITS.age-1000}];
  const w=worker({[SETTINGS]:{enabled:false},[KEY]:state});w.alarm();await settle();
  assert.equal(w.data[KEY].events.length,0);assert.equal(w.data[KEY].dropped,1);assert.equal(w.requests.length,0);
});
test('rule migration uses the same cross-context lock as the rules editor',async()=>{
  const old={requirement:'Search Dog Units',vehicleTypeId:'102',vehicleName:'Search Dog Unit SAR',enabled:true};
  const custom={requirement:'Ambulances',vehicleTypeId:'5',vehicleName:'Ambulance',enabled:true};
  const w=worker({[rules.RULES_KEY]:{schema:1,rules:[old,custom]}});
  const result=await w.send({type:'NEXUS_REQUIREMENT_RULES_GET'},{...game,frameId:1});
  assert.equal(result.ok,true);assert.equal(result.data.rules.length,1);assert.equal(result.data.rules[0].requirement,'Ambulances');
  assert.deepEqual(w.locks,['nexus-requirement-rules']);
});
test('bridge settings failures disable capture and BFCache restores recheck consent',async()=>{
  const win={...events()},changes={addListener(){}},timers=new Map();let nextTimer=1,fail=true,calls=0;
  win.top=win;
  const context=vm.createContext({window:win,crypto:{randomUUID},Date,JSON,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail}},
    chrome:{runtime:{sendMessage:async()=>{calls++;return fail?{ok:false}:{ok:true}}},storage:{onChanged:changes}},
    setInterval:fn=>{timers.set(nextTimer,fn);return nextTimer++;},clearInterval:id=>timers.delete(id),setTimeout:fn=>{timers.set(nextTimer,fn);return nextTimer++;},clearTimeout:id=>timers.delete(id)
  });
  const enabled=[];win.addEventListener('nexus-analytics-control-v1',e=>enabled.push(JSON.parse(e.detail).enabled));
  vm.runInContext(fs.readFileSync('extension/analytics-bridge.js','utf8'),context);await settle();
  assert.equal(enabled.at(-1),false);
  win.dispatchEvent({type:'pagehide',persisted:true});assert.equal(timers.size,1);
  fail=false;win.dispatchEvent({type:'pageshow',persisted:true});await settle();assert.equal(enabled.at(-1),true);assert.equal(calls,2);
  win.dispatchEvent({type:'pagehide',persisted:false});assert.equal(timers.size,0);
});
