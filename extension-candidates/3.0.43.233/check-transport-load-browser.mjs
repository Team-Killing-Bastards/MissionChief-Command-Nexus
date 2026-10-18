import fs from 'node:fs';
import assert from 'node:assert/strict';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
import {fn,functions} from './transport-load-fixture.mjs';
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};const results=[];
try {
 for(const mode of ['normal','stalled','no-load-event','action-in-flight','cleared','pending-other','no-missions-retry','manual-stop']) {
  const context=await browser.newContext(),page=await context.newPage(),requests=[],errors=[];let vehicleReads=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const path=new URL(route.request().url()).pathname,method=route.request().method();requests.push({path,method});
   if(path==='/')return route.fulfill({contentType:'text/html',body:'<p>Isolated Worker B load regression</p>'});
   if(path==='/never')return;
   if(path==='/vehicles/11'){
    vehicleReads++;
    if(['stalled','cleared','pending-other','manual-stop'].includes(mode)||(mode==='no-missions-retry'&&vehicleReads===1))return;
    if(mode==='action-in-flight')return route.fulfill({contentType:'text/html',body:'<form id="send" method="post" action="/vehicles/11/patient/9"></form><script>parent.sessionStorage.setItem("mf_transport_last_click_at_v10_3_9zd",String(Date.now()));document.querySelector("#send").submit();</script>'});
    return route.fulfill({contentType:'text/html',body:'<h2>Vehicle 11</h2><a href="/vehicles/11/patient/9">Transport patient</a>'});
   }
   if(path==='/vehicles/11/patient/9')return route.fulfill({contentType:'text/html',body:'<p>Transport submitted</p><img src="/never">'});
   return route.fulfill({contentType:'text/html',body:'<h3 id="missionH1">Fixture</h3>'});
  });
  await page.goto('https://www.missionchief.co.uk/');
  await page.evaluate(mode=>{
   const noop=()=>{};window.events=[];window.mode=mode;
   window.request={key:'11:101',vehicleId:'11',missionId:'101',missionUrl:'https://www.missionchief.co.uk/missions/101'};
   window.liveRequests=[request];if(mode==='pending-other')liveRequests.push({key:'12:103',vehicleId:'12',missionId:'103'});
   window.state={wanted:true,stopping:false,running:false,worker:null,workerRole:'',workerGeneration:0,workerDocumentSerial:0,
    currentMissionId:'101',currentMissionName:'Fixture',currentMissionUrl:request.missionUrl,transportServiceActive:false,
    transportServiceAttempts:0,transportServiceCleared:0,transportServiceHistory:[],transportServiceDeferredUntil:new Map(),
    patientAssistLastClickAt:0,prisonerAssistLastClickAt:0,postTransportRehooks:0,lowQueuePaused:false,lowQueueObservedCount:0};
   Object.assign(window,{WORKER_LOAD_TIMEOUT_MS:3000,TRANSPORT_SERVICE_MAX_MS:1800,TRANSPORT_SERVICE_RETRY_COOLDOWN_MS:3000,
    TRANSPORT_SERVICE_HISTORY_LIMIT:40,MINIMUM_ACTIONABLE_MISSIONS:2,LOW_QUEUE_RESUME_STABLE_MS:1500,
    SLEEP_GAP_RECOVERY_THRESHOLD_MS:60000,MISSION_RESCAN_MS:100,WORKER_ID:'test-worker',ACTIVE_WORKER_NAME_PREFIX:'active-',
    canonicalMissionWorkerUrl:u=>new URL(u,location.origin).href,clearPostDispatchWatchdog:noop,
    clearTimer:(name,clear=clearTimeout)=>{clear(state[name]);state[name]=null;},
    removeWorker:()=>{state.worker?.remove();state.worker=null;state.workerRole='';state.workerGeneration++;clearTimeout(state.workerLoadTimer);},
    applyActiveWorkerFrameStyle:f=>{f.style.display='none';},
    bindManagedFrameLoad:(f,cb)=>f.addEventListener('load',()=>{if((mode==='no-load-event'||mode==='action-in-flight')&&state.workerRole==='TRANSPORT_B')return;cb();}),
    forgetWorkerDocument:noop,clearAutoRecoveryWatchdog:noop,recordMissionVisit:noop,
    setPhase:(phase,status,detail)=>{Object.assign(state,{phase,status,detail});events.push({event:'phase',phase});},log:noop,
    missionNameForId:id=>'Fixture '+id,cleanMissionCaption:s=>s,missionDisplay:id=>id,nowIso:()=>new Date().toISOString(),
    pausePipelineController:noop,clearSharedV2AutoRunning:noop,resetAutoStartTracking:noop,resetPatientAssistTracking:noop,resetPrisonerAssistTracking:noop,
    detectTransportContext:(doc,href)=>({kind:/\/(patient|gefangener)\//.test(href)||doc.querySelector('a[href*="/patient/"]')?'PATIENT':'',evidence:[]}),
    refreshRadioTransportRequests:()=>liveRequests,
    actionableMissionSupply:()=>mode==='no-missions-retry'?{count:0,candidates:[]}:{count:2,candidates:[{missionId:'102',url:'https://www.missionchief.co.uk/missions/102'},{missionId:'103',url:'https://www.missionchief.co.uk/missions/103'}]},
    compactControllerEphemeralMemory:noop,saveRunContinuity:noop,persistResumeMission:noop,
    enterLowQueuePause:()=>{state.lowQueuePaused=true;beginMissionRescan();},lowQueueResumeExcludedMissionId:()=>'',render:noop,
    captureStartupDiagnostic:noop,captureWorkerSnapshot:noop,recoverInitialMissionWorkerLoad:()=>false,
    onWorkerLoad:(f,g)=>{if(!state.wanted||f!==state.worker||g!==state.workerGeneration)return;clearTimeout(state.workerLoadTimer);
     state.phase=state.workerRole==='TRANSPORT_B'?'TRANSPORT_SERVICE':'ACTIVE';events.push({event:'adopt',role:state.workerRole,path:getWorkerHref(f)});},
    setError:(message)=>{state.wanted=false;events.push({event:'error',message});}
   });
   sessionStorage.setItem('mf_auto_dispatch_latch_v1','{"missionId":"99","claimedAt":1}');
   sessionStorage.setItem('mf_transport_click_lock_until_v10_3_9zd','100');
  },mode);
  for(const name of ['getWorkerDocument','getWorkerHref',...functions])await page.addScriptTag({content:fn(name)});
  await page.evaluate(()=>{startTransportOnlyWorker(request);window.originalWorker=state.worker;});
  if(mode==='cleared')await page.evaluate(()=>{liveRequests=[];});
  if(mode==='manual-stop'){
   await page.evaluate(()=>{state.wanted=false;state.stopping=true;});await page.waitForTimeout(2100);
  } else {
   try{await page.waitForFunction(mode=>{
    if(['stalled','cleared'].includes(mode))return state.phase==='ACTIVE';
    if(mode==='pending-other')return events.some(e=>e.event==='adopt'&&e.path.endsWith('/vehicles/12'));
    if(mode==='no-missions-retry')return events.some(e=>e.event==='adopt'&&e.path.endsWith('/vehicles/11'))&&state.transportServiceAttempts===2;
    if(mode==='no-load-event'||mode==='action-in-flight')return state.transportServiceHistory.some(e=>e.event==='transport-worker-b-load-event-recovered');
    return events.some(e=>e.event==='adopt');
   },mode,{timeout:10000});}catch(error){console.log(JSON.stringify({mode,requests,errors,state:await page.evaluate(()=>({events,phase:state.phase,history:state.transportServiceHistory,href:getWorkerHref(),ready:getWorkerDocument()?.readyState}))}));throw error;}
  }
  const result=await page.evaluate(()=>({wanted:state.wanted,phase:state.phase,role:state.workerRole,serviceKey:state.transportServiceKey,
   events,history:state.transportServiceHistory,frames:document.querySelectorAll('iframe').length,
   originalRetained:originalWorker===state.worker,deferred:[...state.transportServiceDeferredUntil.keys()],
   claim:sessionStorage.getItem('mf_auto_dispatch_latch_v1'),clickLock:sessionStorage.getItem('mf_transport_click_lock_until_v10_3_9zd')}));
  if(errors.length||result.events.some(e=>e.event==='error'))console.log(JSON.stringify({mode,requests,errors,result}));
  eq(errors,[]);eq(result.events.some(e=>e.event==='error'),false);eq(result.wanted,mode!=='manual-stop');
  eq(result.frames,1);eq(result.claim,'{"missionId":"99","claimedAt":1}');eq(result.clickLock,'100');
  eq(vehicleReads,mode==='no-missions-retry'?2:1);
  eq(requests.filter(r=>r.method==='POST').length,mode==='action-in-flight'?1:0,'never resubmit transport');
  eq(requests.some(r=>r.path.includes('/alarm')||r.path.includes('/backalarm')),false);
  eq(result.originalRetained,['normal','no-load-event','action-in-flight','manual-stop'].includes(mode));
  if(['stalled','cleared'].includes(mode))eq(result.role,'MISSION_A');
  if(mode==='pending-other')eq(result.serviceKey,'12:103');
  if(mode==='stalled'||mode==='pending-other'||mode==='no-missions-retry')eq(result.deferred.includes('11:101'),true);
  if(mode==='normal')eq(result.history.some(e=>e.event.startsWith('transport-worker-b-load-')),false,'healthy load does not use recovery');
  results.push({mode,requests,...result});console.log(mode+': passed');await context.close();
 }
 fs.writeFileSync(new URL('./transport-load-browser-validation.json',import.meta.url),JSON.stringify({checks,cases:results.length,allRequestsIntercepted:true,acceleratedFixtureDeadlines:true,liveRecoveryVerified:false,results},null,2)+'\n');
 console.log(`${checks} isolated Edge transport load checks passed.`);
} finally {await browser.close();}
