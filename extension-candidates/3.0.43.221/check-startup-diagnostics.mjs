import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const root = new URL('./extension/', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
const moduleSource = read('nexus-startup-diagnostics.js'), runtime = read('nexus-runtime.js');
const previous = fs.readFileSync(new URL('../3.0.43.217/extension/nexus-runtime.js', import.meta.url), 'utf8');
// Preserve the old held-paint fixture to test the diagnostic distinction.
// The .219 fix itself is exercised by check-background-startup.mjs.
const paintDependentRuntime = fs.readFileSync(new URL('../3.0.43.218/extension/nexus-runtime.js', import.meta.url), 'utf8');
function fn(source, name) {
  const start = source.indexOf('function ' + name + '('); assert(start >= 0, name);
  const boundary = /\n(?:    )?(?:async )?function /.exec(source.slice(start + 10));
  const end = boundary ? start + 10 + boundary.index : -1;
  assert(end > start, name + ' boundary'); return source.slice(start, end);
}
let checks = 0;
const report = {scope:'Isolated fixtures, no live game or account; diagnostic collection only', cases:[]};
// These decision functions remain byte-identical to .217. The .220 loop/probe changes have separate throughput regressions. Instrumentation cannot
// release dispatch latches or extend discovery/dispatch timeouts.
for (const name of ['claimAutoMissionDispatch','releaseAutoMissionDispatch','findAutoModeControl','isInteractive','nexusHandlePatientMissionTail']) {
  assert.equal(fn(runtime, name), fn(previous, name), name + ' unchanged'); checks++;
}
assert.equal(read('nexus-settings.js'), read('nexus-settings-main.js')); checks++;
assert(read('nexus-profile-sync.js').includes("filter(key=>key!=='nexusDiagnosticCaptureV1')")); checks++;
// Hostile getters prove the OFF path does not inspect a document or styles.
const listeners = new Map(); let domReads = 0, storageWrites = 0;
const documentOff = {addEventListener:()=>{domReads++;},removeEventListener:()=>{domReads++;}};
Object.defineProperty(documentOff, 'querySelector', {get(){domReads++;throw Error('OFF DOM access');}});
const context = vm.createContext({document:documentOff, localStorage:{getItem:()=>null,setItem:()=>storageWrites++},
  setInterval:()=>{throw Error('Unexpected polling');},setTimeout:()=>{throw Error('Unexpected timer');}});
vm.runInContext('window=globalThis;window.top=window;window.addEventListener=(name,fn)=>listeners.set(name,fn);', Object.assign(context,{listeners}));
vm.runInContext(moduleSource,context);
const off = context.__NEXUS_STARTUP_DIAGNOSTICS__;
const started = performance.now();
for (let i=0;i<100000;i++) { off.capture('disabled',documentOff); off.reveal('scheduled'); }
report.disabled100000CallsMs = performance.now() - started;
assert.equal(domReads,0);assert.equal(storageWrites,0);assert.equal(off.snapshot().retained,0);checks+=3;
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
report.browser=browser.version();
try {
  const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];
  const requests=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
    requests.push({method:route.request().method(),url:route.request().url()});
    if(new URL(route.request().url()).pathname==='/icons/nexus-48.png')return route.fulfill({contentType:'image/png',body:fs.readFileSync(new URL('icons/nexus-48.png',root))});
    return route.fulfill({contentType:'text/html',body:'<!doctype html><nav class="navbar"><ul class="dropdown-menu"><li><a>FAQ</a></li><li><a>Contact support</a></li></ul></nav><div id="map"></div>'});
  });
  await page.goto('https://www.missionchief.co.uk/');
  await page.evaluate(()=>{window.chrome={runtime:{id:'fixture',getURL:n=>'https://www.missionchief.co.uk/'+n,sendMessage:async m=>m.type==='NEXUS_TOOLS_GET'?{ok:true,value:{}}:{ok:true}},storage:{onChanged:{addListener(){}}}};});
  for(const name of ['nexus-settings-main.js','nexus-startup-diagnostics.js','nexus-tools-core.js','nexus-tools.js'])await page.addScriptTag({path:fileURLToPath(new URL(name,root))});
  await page.locator('#nexus-tools-menu-link').click();
  const tools=page.locator('#nexus-native-tools');
  await tools.getByRole('button',{name:'Settings',exact:true}).click();
  const toggle=tools.locator('input[data-setting-id="diagnosticCapture"]');
  assert.equal(await toggle.isChecked(),false);assert.equal(await page.evaluate(()=>__NEXUS_STARTUP_DIAGNOSTICS__.isEnabled()),false);checks+=2;
  await toggle.check();assert.equal(await page.evaluate(()=>__NEXUS_STARTUP_DIAGNOSTICS__.isEnabled()),false);checks++;
  await tools.getByRole('button',{name:'Save settings',exact:true}).click();
  assert.equal(await page.evaluate(()=>__NEXUS_STARTUP_DIAGNOSTICS__.isEnabled()),true);checks++;
  await tools.locator('#diagnosticCaptureState').filter({hasText:'Capture is ON'}).waitFor();
  await toggle.scrollIntoViewIfNeeded();
  await page.screenshot({path:fileURLToPath(new URL('./diagnostic-settings-220.png',import.meta.url))});
  await page.evaluate(()=>{
    const frame=document.createElement('iframe');frame.name='mcn-v3-active-worker-7-101';frame.src='/missions/101';frame.id='fixture-worker';document.body.append(frame);
  });
  const frame=await (await page.locator('#fixture-worker').elementHandle()).contentFrame();assert(frame);await frame.waitForURL('**/missions/101');await frame.waitForLoadState();
  await frame.addScriptTag({content:moduleSource});
  await page.evaluate(()=>{
    window.recordRealmChecks=[];window.originalArrayPush=Array.prototype.push;
    const belongsHere=value=>!value||typeof value!=='object'||
      (Object.getPrototypeOf(value)===(Array.isArray(value)?Array.prototype:Object.prototype)&&Object.values(value).every(belongsHere));
    Array.prototype.push=function(...values){
      for(const value of values)if(value?.reason&&value?.controls&&Object.hasOwn(value,'panelReveal'))originalArrayPush.call(recordRealmChecks,belongsHere(value));
      return originalArrayPush.apply(this,values);
    };
  });
  await frame.evaluate(({detector,centre})=>{
    document.body.innerHTML='<div id="mission-finder-wrapper" style="visibility:hidden"><div id="control-panel"><button id="auto-mode-box" title="Auto Mode: Start" aria-label="Auto Mode: Start">Auto Mode: Start</button></div></div>';
    window.normaliseText=value=>String(value||'').trim();window.resetMissionFinderIosPosition=()=>false;
    window.mfKeepPanelPosition=false;window.mfDebugEnabled=false;window.MF_PANEL_LEFT_KEY='fixture-left';window.MF_PANEL_TOP_KEY='fixture-top';
    window.heldFrames=[];window.requestAnimationFrame=callback=>heldFrames.push(callback);
    window.__MCN_V3_FRAME_OWNERSHIP_BRIDGE__={role:()=> 'ACTIVE',source:()=> 'fixture'};
    (0,eval)(detector+'\n'+centre);
    centreMissionFinderWindow(document.getElementById('mission-finder-wrapper'),'fixture');
    window.top.__NEXUS_STARTUP_DIAGNOSTICS__.capture('pre-clean-a-only-retry',document,{documentSerial:7,workerGeneration:3,workerRole:'MISSION_A',expectedMissionId:'101'});
  },{detector:runtime.slice(runtime.indexOf('function isInteractive(element)'),runtime.indexOf('function autoControlLooksRunning(control)')),centre:fn(paintDependentRuntime,'centreMissionFinderWindow')});
  const snapshot=()=>page.evaluate(()=>__NEXUS_STARTUP_DIAGNOSTICS__.snapshot());
  let snap=await snapshot(),record=snap.records.at(-1);
  assert(record.buttonPresent);assert(record.panelPresent);assert.equal(record.controls[0].visibility,'hidden');
  assert(record.controls[0].hiddenAncestors.items.some(n=>n.id==='mission-finder-wrapper'));
  assert.equal(record.panelReveal.completedAt,0);assert(record.panelReveal.scheduledAt>0);
  assert.equal(await frame.evaluate(()=>Boolean(findAutoModeControl(document))),false);checks+=7;
  report.cases.push({case:'Mounted hidden panel before retry',record});
  // Execute the actual bootstrap-history callback, whose first operation now
  // captures the worker before the existing clean retry/removal can run.
  const bootstrapStart=runtime.indexOf('const captureBootstrap = (reason, elapsedMs) => {');
  const bootstrapEnd=runtime.indexOf('\nconst attempt =',bootstrapStart);
  await page.evaluate(code=>{
    window.state={worker:document.getElementById('fixture-worker'),workerRole:'MISSION_A',workerGeneration:3,workerDocumentSerial:7,currentMissionId:'101',activeBootstrapHistory:[]};
    window.getWorkerDocument=()=>state.worker?.contentDocument;window.getWorkerHref=()=>state.worker?.contentWindow.location.href||'';
    window.missionIdFromUrl=url=>url.match(/\/missions\/(\d+)/)?.[1]||'';window.nowIso=()=>new Date().toISOString();window.PROMOTION_RECOVERY_HISTORY_LIMIT=60;
    (0,eval)(code);
  },fn(runtime,'captureStartupDiagnostic')+'\nconst frame=state.worker;\n'+runtime.slice(bootstrapStart,bootstrapEnd)+'\ncaptureBootstrap("pre-clean-a-only-retry",3000);');
  record=(await snapshot()).records.at(-1);assert.equal(record.reason,'pre-clean-a-only-retry');assert(record.buttonPresent);assert.equal(record.panelReveal.completedAt,0);checks+=3;
  await frame.evaluate(()=>{while(heldFrames.length)heldFrames.shift()(performance.now());});
  assert.equal(await frame.evaluate(()=>Boolean(findAutoModeControl(document))),true);checks++;
  record=(await snapshot()).records.at(-1);assert(record.panelReveal.completedAt>0);assert(record.panelReveal.firstCallbackAt>0);checks+=2;
  report.cases.push({case:'Original reveal callbacks completed',record});
  const realmChecks=await page.evaluate(()=>{Array.prototype.push=originalArrayPush;return recordRealmChecks;});
  assert(realmChecks.length>0&&realmChecks.every(Boolean),'Retained records and nested reveal state belong to the parent realm');checks++;
  report.enabled500MountedSnapshotsMs=await frame.evaluate(()=>{
    const api=window.top.__NEXUS_STARTUP_DIAGNOSTICS__,start=performance.now();
    for(let i=0;i<500;i++)api.capture('mounted-measure-'+i,document,{documentSerial:7,workerRole:'MISSION_A',expectedMissionId:'101'});
    return performance.now()-start;
  });
  await frame.evaluate(()=>{document.getElementById('auto-mode-box').disabled=true;window.top.__NEXUS_STARTUP_DIAGNOSTICS__.capture('disabled-button',document);});
  record=(await snapshot()).records.at(-1);assert(record.controls[0].disabled);assert.equal(await frame.evaluate(()=>Boolean(findAutoModeControl(document))),false);checks+=2;
  await frame.evaluate(()=>window.top.__NEXUS_STARTUP_DIAGNOSTICS__.capture('wrong-mission-document',document,{expectedMissionId:'999'}));
  assert.equal((await snapshot()).records.at(-1).documentMatchesExpectedMission,false);checks++;
  await frame.evaluate(()=>{document.getElementById('auto-mode-box').remove();window.top.__NEXUS_STARTUP_DIAGNOSTICS__.capture('missing-button',document);});
  assert.equal((await snapshot()).records.at(-1).buttonPresent,false);checks++;
  // Recreate the hidden control, then execute the actual controller removal path.
  await frame.evaluate(()=>{document.getElementById('control-panel').innerHTML='<button id="auto-mode-box">Auto Mode: Start</button>';});
  await page.evaluate(code=>{
    window.state={worker:document.getElementById('fixture-worker'),workerRole:'MISSION_A',workerGeneration:3,workerDocumentSerial:7,currentMissionId:'101'};
    window.getWorkerDocument=()=>state.worker?.contentDocument;window.getWorkerHref=()=>state.worker?.contentWindow.location.href||'';
    window.missionIdFromUrl=url=>url.match(/\/missions\/(\d+)/)?.[1]||'';
    for(const name of ['clearTimer','resetStaleCanonicalMissionCandidate','captureWorkerSnapshot','endTransportEvent','clearPostDispatchWatchdog','forgetWorkerDocument','setFrameOwnership','disposeManagedFrameRuntime','log','clearPersistedRunIntent','clearAllControllerTimers','clearAutoRecoveryWatchdog','clearSharedV2QueueGuard','clearSharedV2AutoRunning','pausePipelineController','clearTransportServiceState','resetPriorityPending','resetAutoStartTracking','clearPromotedWorkTracking','markRunStopped','setPhase','saveRunContinuity'])window[name]=()=>{};
    window.normaliseText=value=>String(value||'');
    (0,eval)(code);setError('Fixture startup failure');
  },fn(runtime,'captureStartupDiagnostic')+'\n'+fn(runtime,'removeWorker')+'\n'+fn(runtime,'setError'));
  snap=await snapshot();record=snap.records.findLast(r=>r.reason==='before-worker-removal');
  assert(record.buttonPresent);assert.equal(record.documentSerial,7);assert.equal(await page.locator('#fixture-worker').count(),0);checks+=3;
  assert(snap.records.findLast(r=>r.reason==='before-controller-error')?.buttonPresent);checks++;
  report.cases.push({case:'Scalar evidence retained before real removal path',record});
  // OFF removes the dedicated visibility listener and retains previous records.
  await toggle.uncheck();await tools.getByRole('button',{name:'Save settings',exact:true}).click();
  snap=await snapshot();assert.equal(snap.enabled,false);assert.equal(snap.visibilityListening,false);checks+=2;
  const retained=snap.retained;
  await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));__NEXUS_STARTUP_DIAGNOSTICS__.capture('must-not-collect');});
  assert.equal((await snapshot()).retained,retained);checks++;
  // Re-enable, deduplicate identical records, cap retention and copy exports.
  await toggle.check();await tools.getByRole('button',{name:'Save settings',exact:true}).click();
  const enabledMetrics=await page.evaluate(()=>{
    const api=__NEXUS_STARTUP_DIAGNOSTICS__,t=performance.now();
    for(let i=0;i<500;i++)api.capture('bounded-'+i);
    const elapsed=performance.now()-t;for(let i=0;i<50;i++)api.capture('repeat');
    const first=api.snapshot();first.records[0].reason='mutation';
    return {elapsed,original:api.snapshot(),bytes:JSON.stringify(api.snapshot()).length};
  });
  assert.equal(enabledMetrics.original.retained,200);assert(enabledMetrics.original.dropped>0);assert(enabledMetrics.original.deduplicated>=49);assert.notEqual(enabledMetrics.original.records[0].reason,'mutation');assert(enabledMetrics.bytes<400000);checks+=5;
  report.enabled500SnapshotsMs=enabledMetrics.elapsed;report.boundedExportBytes=enabledMetrics.bytes;
  // Real existing diagnostic export consumes startupDiagnostics. Run the full
  // parent runtime in a clean intercepted fixture and download its JSON.
  const exportPage=await browser.newPage();
  await exportPage.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><nav class="navbar"><div class="navbar-header"><a class="navbar-brand hidden-xs" href="/">MissionChief</a></div><ul class="navbar-nav"></ul></nav><div id="map"></div><div id="mission_list"></div>'}));
  await exportPage.goto('https://www.missionchief.co.uk/');
  await exportPage.evaluate(()=>localStorage.setItem('nexusDiagnosticCaptureV1','true'));
  for(const name of ['nexus-settings-main.js','nexus-startup-diagnostics.js','nexus-auto-stop-store.js','nexus-runtime.js'])await exportPage.addScriptTag({path:fileURLToPath(new URL(name,root))});
  await exportPage.waitForFunction(()=>typeof window.__MCN_V3_DIAGNOSTICS_SNAPSHOT__==='function');
  const exported=await exportPage.evaluate(()=>__MCN_V3_DIAGNOSTICS_SNAPSHOT__());
  assert.equal(exported.extensionVersion,'3.0.43.221');assert.equal(exported.startupDiagnostics.enabled,true);assert(exported.startupDiagnostics.retained>0);checks+=3;
  await exportPage.getByRole('button',{name:'Open Command Nexus V3',exact:true}).click();
  await exportPage.locator('[data-mcn-system-details] summary').click();
  const downloadPromise=exportPage.waitForEvent('download');
  await exportPage.locator('[data-mcn-export]').click();
  const downloaded=JSON.parse(fs.readFileSync(await (await downloadPromise).path(),'utf8'));
  assert.equal(downloaded.extensionVersion,'3.0.43.221');assert.equal(downloaded.startupDiagnostics.enabled,true);checks+=2;
  await exportPage.evaluate(()=>{localStorage.setItem('nexusDiagnosticCaptureV1','false');window.dispatchEvent(new Event('nexus:settings-saved'));});
  const disabledExport=await exportPage.evaluate(()=>__MCN_V3_DIAGNOSTICS_SNAPSHOT__());
  assert.equal(disabledExport.startupDiagnostics.enabled,false);assert(disabledExport.startupDiagnostics.retained>0);checks+=2;
  report.exportVerified=true;
  assert(requests.every(r=>r.method==='GET'),'No game actions or uploads');checks++;
  assert.deepEqual(errors,[]);checks++;
  // Headless Edge reports visibility directly; no simulated state is described
  // as a real OS minimisation. Native window testing runs separately below.
  report.headlessVisibility=await page.evaluate(()=>document.visibilityState);
} finally {await browser.close();}
if(process.platform==='win32' && process.env.NEXUS_TEST_WINDOW_STATES==='1') {
  const headed=await chromium.launch({headless:false,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',ignoreDefaultArgs:['--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling']});
  try {
    const ctx=await headed.newContext(),a=await ctx.newPage(),b=await ctx.newPage();
    for(const page of [a,b]) {
      await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><div id="mission-finder-wrapper"><div id="control-panel"><button id="auto-mode-box">Auto Mode: Start</button></div></div>'}));
      await page.goto('https://www.missionchief.co.uk/missions/101');
      await page.evaluate(()=>localStorage.setItem('nexusDiagnosticCaptureV1','true'));
      await page.addScriptTag({content:moduleSource});
    }
    report.windowStates=[];
    for(const [label,activate]of [['foreground',()=>a.bringToFront()],['background',()=>b.bringToFront()]]) {
      await activate();await a.waitForTimeout(300);
      report.windowStates.push(await a.evaluate(label=>{
        __NEXUS_STARTUP_DIAGNOSTICS__.capture(label);
        return {requested:label,visibility:document.visibilityState,record:__NEXUS_STARTUP_DIAGNOSTICS__.snapshot().records.at(-1)};
      },label));
    }
    const cdp=await a.context().newCDPSession(a),info=await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds',{windowId:info.windowId,bounds:{windowState:'minimized'}});
    await a.waitForTimeout(350);
    report.windowStates.push(await a.evaluate(()=>{
      __NEXUS_STARTUP_DIAGNOSTICS__.capture('minimized');
      return {requested:'minimized',visibility:document.visibilityState,record:__NEXUS_STARTUP_DIAGNOSTICS__.snapshot().records.at(-1)};
    }));
    const bounds=await cdp.send('Browser.getWindowBounds',{windowId:info.windowId});
    report.minimizedWindowState=bounds.bounds.windowState;
    assert.equal(report.minimizedWindowState,'minimized');
    assert(report.windowStates.every(s=>s.record.buttonPresent&&s.record.documentVisibility===s.visibility));checks+=2;
    await a.evaluate(()=>{localStorage.setItem('nexusDiagnosticCaptureV1','false');window.dispatchEvent(new Event('nexus:settings-saved'));});
    assert.equal(await a.evaluate(()=>__NEXUS_STARTUP_DIAGNOSTICS__.snapshot().visibilityListening),false);checks++;
  } finally {await headed.close();}
}
report.checks=checks;report.passed=true;
fs.writeFileSync(new URL('./diagnostic-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,checks,disabled100000CallsMs:report.disabled100000CallsMs,enabled500MountedSnapshotsMs:report.enabled500MountedSnapshotsMs,enabled500SnapshotsMs:report.enabled500SnapshotsMs,boundedExportBytes:report.boundedExportBytes,exportVerified:report.exportVerified,windowStates:report.windowStates?.map(s=>({requested:s.requested,visibility:s.visibility})),minimizedWindowState:report.minimizedWindowState}));
