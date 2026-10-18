import fs from 'node:fs';
import assert from 'node:assert/strict';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const source=fs.readFileSync(new URL('./extension/nexus-runtime.js',import.meta.url),'utf8');
function fn(name){const a=new RegExp('^ {0,8}(?:async )?function '+name+'\\(','m').exec(source);assert(a,name);const b=/\n {0,4}(?:async )?function /.exec(source.slice(a.index+a[0].length));assert(b,name);return source.slice(a.index,a.index+a[0].length+b.index);}
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
try{
 const page=await browser.newPage(),requests=[];
 await page.route('**/*',r=>{requests.push(r.request().method());return r.fulfill({contentType:'text/html',body:new URL(r.request().url()).pathname==='/'?'<iframe src="/missions/101"></iframe>':'<button id="auto">Auto Mode: Start</button><div id="stop"></div>'});});
 await page.goto('https://www.missionchief.co.uk/');await page.frames()[1].waitForLoadState();
 await page.evaluate(functions=>{
  const frame=document.querySelector('iframe'),doc=frame.contentDocument;
  window.state={wanted:true,stopping:false,workerRole:'MISSION_A',currentMissionId:'101',worker:frame,workerDocument:doc,workerDocumentSerial:1,autoRunningConfirmedDocumentSerial:1,autoRunningConfirmedAt:Date.now()-100};
  window.normaliseText=s=>String(s||'').replace(/\s+/g,' ').trim();
  window.missionIdFromUrl=u=>new URL(u,location.href).pathname.match(/\/missions\/(\d+)/)?.[1]||'';
  window.getWorkerHref=()=>frame.contentWindow.location.href;
  window.findAutoModeControl=d=>d.getElementById('auto');window.autoControlLooksRunning=c=>c.textContent.includes('Stop');
  window.V2_AUTO_STOP_RECORD_KEY='test-stop';
  window.reason='Auto stopped: Required mission resource is unavailable. Unit Finder selected 1 vehicle, but the mission is not fully covered. Confirmed requirements still missing: CRVs x1. No vehicles were dispatched.';
  window.saveStop=()=>localStorage.setItem('test-stop',JSON.stringify({reason,stoppedAt:Date.now()}));saveStop();
  for(const text of functions)(0,eval)(text);
  window.verify=()=>isConfirmedResourceSelectionStop(doc,'AUTO STOPPED: '+reason);
 },['currentWorkerAutoConfirmed','readV2AutoStopRecord','isConfirmedResourceSelectionStop'].map(fn));
 check(await page.evaluate(()=>verify()),'real complete worker and stored stop enable fast path');
 await page.evaluate(()=>state.worker.contentDocument.getElementById('auto').textContent='Auto Mode: Stop');
 check(!await page.evaluate(()=>verify()),'running DOM control blocks shortcut');
 await page.evaluate(()=>{state.worker.contentDocument.getElementById('auto').textContent='Auto Mode: Start';sessionStorage.setItem('mf_auto_dispatch_latch_v1',JSON.stringify({missionId:'101',claimedAt:Date.now()}));});
 check(!await page.evaluate(()=>verify()),'real session claim blocks shortcut');
 await page.evaluate(()=>{sessionStorage.removeItem('mf_auto_dispatch_latch_v1');state.autoRunningConfirmedAt=Date.now()+1000;});
 check(!await page.evaluate(()=>verify()),'old stored stop cannot qualify new document');
 await page.evaluate(()=>{state.autoRunningConfirmedAt=Date.now()-100;saveStop();state.worker.contentWindow.__NEXUS_AUTO_SELECTION_WAIT__={missionId:'101',active:true};});
 check(!await page.evaluate(()=>verify()),'live selection signal blocks shortcut');
 await page.evaluate(()=>{state.worker.contentWindow.__NEXUS_AUTO_SELECTION_WAIT__.active=false;});
 check(await page.evaluate(()=>verify()),'completed selection plus current terminal stop qualifies');
 await page.evaluate(()=>state.worker.remove());
 check(!await page.evaluate(()=>verify()),'detached mission frame blocks shortcut');
 check(requests.every(method=>method==='GET'),'proof performs no dispatch or game write');
 fs.writeFileSync(new URL('./shortage-wait-browser-validation.json',import.meta.url),JSON.stringify({checks,allRequestsIntercepted:true,liveGameVerified:false},null,2)+'\n');
 console.log(`${checks} isolated browser shortage-proof checks passed.`);
}finally{await browser.close();}
