import fs from 'node:fs';
import assert from 'node:assert/strict';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
import {fn} from './check-worker-load.mjs';
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};const results=[];
try{
 for(const mode of ['first-load-stalls','both-loads-stall','missing-load-event','manual-stop']){
  const context=await browser.newContext(),page=await context.newPage(),requests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));let reads=0;
  await page.route('**/*',async route=>{
   const path=new URL(route.request().url()).pathname;requests.push({method:route.request().method(),path});
   if(path==='/')return route.fulfill({body:'<meta charset="utf-8"><p>Isolated worker load fixture</p>',contentType:'text/html'});
   if(path==='/missions/101'){
    reads++;
    if(mode!=='missing-load-event'&&(reads===1||mode==='both-loads-stall'||mode==='manual-stop'))return;
   }
   return route.fulfill({body:'<h3 id="missionH1">Fixture mission</h3><button id="fixture-auto">Auto Mode: Stop</button>',contentType:'text/html'});
  });
  await page.goto('https://www.missionchief.co.uk/');
  await page.evaluate(mode=>{
   const noop=()=>{};const attempted=new Set();window.events=[];
   window.state={wanted:true,stopping:false,worker:null,workerRole:'',workerGeneration:0,workerDocumentSerial:0,autoRecoverySkips:0,
    currentMissionId:'101',currentMissionName:'Fixture',currentMissionUrl:'/missions/101',autoStartIssued:false,transportServiceActive:false,transportKind:'',postDispatchWatchdog:null};
   Object.assign(window,{WORKER_LOAD_TIMEOUT_MS:1000,WORKER_ID:'fixture-worker',ACTIVE_WORKER_NAME_PREFIX:'mcn-v3-active-worker-',
    canonicalMissionWorkerUrl:u=>new URL(u,location.origin).href,
    clearTimer:name=>{clearTimeout(state[name]);state[name]=null;},clearPostDispatchWatchdog:noop,
    removeWorker:()=>{state.worker?.remove();state.worker=null;state.workerRole='';state.workerGeneration++;clearTimeout(state.workerLoadTimer);},
    applyActiveWorkerFrameStyle:f=>{f.style.display='none';},
    bindManagedFrameLoad:(f,cb)=>{f.addEventListener('load',()=>{if(mode!=='missing-load-event')cb();});},
    missionNameForId:id=>'Fixture '+id,forgetWorkerDocument:noop,clearAutoRecoveryWatchdog:noop,recordMissionVisit:noop,
    setPhase:(p,s,d)=>{state.phase=p;events.push({event:'phase',phase:p});},log:noop,
    setError:(m,d)=>{state.wanted=false;events.push({event:'error',message:m});},
    findAutoModeControl:doc=>doc?.querySelector('#fixture-auto'),currentWorkerAutoConfirmed:()=>false,
    onWorkerLoad:(f,g)=>{if(f!==state.worker||g!==state.workerGeneration)return;clearTimeout(state.workerLoadTimer);state.phase='ACTIVE';events.push({event:'adopt',missionId:state.currentMissionId});},
    captureStartupDiagnostic:noop,captureWorkerSnapshot:noop,recordAutoRecoveryEvent:e=>events.push(e),
    pausePipelineController:noop,clearSharedV2QueueGuard:noop,clearSharedV2AutoRunning:noop,resetAutoStartTracking:noop,finaliseActiveMissionTiming:noop,
    registerRecoverableMissionSkip:(id,name,reason,evidence,advances,category)=>{const record={missionId:id,category,retryAfterAt:Date.now()+60000};events.push({event:'skip',...record});return record;},
    transportServiceRequest:()=>null,refreshRadioTransportRequests:()=>[],choosePriorityTarget:()=>({missionId:'102',url:'/missions/102'}),
    beginMissionRescan:noop,missionDisplay:id=>id,
    __NEXUS_RECOVERY__:{attempt:id=>{if(attempted.has(id))return false;attempted.add(id);return true;},outcome:noop}
   });
   sessionStorage.setItem('mf_auto_dispatch_latch_v1','{"missionId":"99","claimedAt":1000}');
  },mode);
  for(const name of ['sameOriginUrl','missionIdFromUrl','canonicalMissionPageId','pathFromUrl','getWorkerDocument','getWorkerHref','recoverInitialMissionWorkerLoad','createWorker'])await page.addScriptTag({content:fn(name)});
  await page.evaluate(()=>createWorker('/missions/101'));
  if(mode==='manual-stop'){
   await page.evaluate(()=>{state.wanted=false;state.stopping=true;});
   await page.waitForTimeout(1200);
  }else try{await page.waitForFunction(()=>state.phase==='ACTIVE',null,{timeout:10000});}catch(error){
   console.log(JSON.stringify({mode,requests,errors,debug:await page.evaluate(()=>({events,wanted:state.wanted,phase:state.phase,href:getWorkerHref(),ready:getWorkerDocument()?.readyState}))}));throw error;
  }
  const result=await page.evaluate(()=>({wanted:state.wanted,phase:state.phase,missionId:state.currentMissionId,events,frames:document.querySelectorAll('iframe').length,claim:sessionStorage.getItem('mf_auto_dispatch_latch_v1')}));
  eq(errors,[]);eq(requests.some(r=>r.method!=='GET'),false);eq(result.claim,'{"missionId":"99","claimedAt":1000}');eq(result.frames,1);
  eq(reads,mode==='first-load-stalls'||mode==='both-loads-stall'?2:1);
  eq(result.events.some(e=>e.event==='error'),false);
  if(mode==='manual-stop'){eq(result.wanted,false);eq(result.events.filter(e=>e.event==='worker-load-fresh-retry').length,0);}
  else{eq(result.wanted,true);eq(result.phase,'ACTIVE');eq(result.missionId,mode==='both-loads-stall'?'102':'101');}
  eq(result.events.filter(e=>e.event==='skip').length,mode==='both-loads-stall'?1:0);
  if(mode==='missing-load-event')eq(result.events.filter(e=>e.event==='worker-load-event-recovered').length,1);
  results.push({mode,requests,...result});console.log(mode+': passed');await context.close();
 }
 fs.writeFileSync(new URL('./worker-load-browser-validation.json',import.meta.url),JSON.stringify({checks,cases:results.length,allRequestsIntercepted:true,liveRecoveryVerified:false,results},null,2)+'\n');
 console.log(`${checks} browser worker-load checks passed.`);
}finally{await browser.close();}
