import fs from 'node:fs';import assert from 'node:assert/strict';import http from 'node:http';
import {devLibrary} from '../../scripts/dev-library.mjs';
const root='extension',fixed=fs.readFileSync(`${root}/nexus-runtime.js`,'utf8');
const extract=(name,text)=>{const m=new RegExp('^ {0,4}(?:async )?function '+name+'\\(','m').exec(text);assert.ok(m,name);const tail=text.slice(m.index+m[0].length),end=/\n {0,4}(?:async )?function /.exec(tail);assert.ok(end);return text.slice(m.index,m.index+m[0].length+end.index);};
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Nexus isolated test</title><body></body>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`,{chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const report={realGame:false};
try{
 const context=await browser.newContext();await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage();await page.goto(origin);
 report.quota=await page.evaluate(()=>{
  localStorage.setItem('mcPersonnelVehicleTrainingRegistry_v1','REGISTRY-PRESERVE');
  localStorage.setItem('nexusRequirementRulesV1','RULES-PRESERVE');
  localStorage.setItem('mf_auto_mode_running','false');
  localStorage.setItem('mf_unit_finder_diagnostics_v1',JSON.stringify([{at:1,detail:'x'.repeat(2400000)}]));
  localStorage.setItem('nexus-full-missions-v1:123',JSON.stringify({old:{seenAt:1,detail:'z'.repeat(100000)}}));
  let lo=0,hi=6*1024*1024;
  while(lo+1<hi){const mid=Math.floor((lo+hi)/2);try{localStorage.setItem('test-protected-data','p'.repeat(mid));lo=mid;}catch{hi=mid;}}
  localStorage.setItem('test-protected-data','p'.repeat(lo));
  let error='';try{localStorage.setItem('mf_issue_recorder_enabled_v1','false');}catch(e){error=e.name;}
  return {oldError:error,protectedChars:lo};
 });
 assert.equal(report.quota.oldError,'QuotaExceededError');
 await page.addScriptTag({path:`${root}/nexus-storage-guard.js`});
 report.repaired=await page.evaluate(()=>{
  localStorage.setItem('mf_issue_recorder_enabled_v1','false');
  localStorage.setItem('mf_unit_finder_diagnostics_v1',JSON.stringify(Array.from({length:120},(_,id)=>({id,detail:'x'.repeat(20000)}))));
  localStorage.setItem('mf_staffing_failure_history_v1',JSON.stringify([{detail:'z'.repeat(900000)}]));
  localStorage.setItem('mf_issue_recorder_v1',JSON.stringify([{detail:'y'.repeat(2000000)}]));
  localStorage.setItem('nexus-full-missions-v1:123','obsolete');
  return {flag:localStorage.getItem('mf_issue_recorder_enabled_v1'),registry:localStorage.getItem('mcPersonnelVehicleTrainingRegistry_v1'),
   rules:localStorage.getItem('nexusRequirementRulesV1'),protectedChars:localStorage.getItem('test-protected-data').length,
   obsolete:localStorage.getItem('nexus-full-missions-v1:123'),
   diagnosticChars:['mf_unit_finder_diagnostics_v1','mf_staffing_failure_history_v1','mf_issue_recorder_v1'].reduce((n,k)=>n+(localStorage.getItem(k)||'').length,0),
   health:window.__NEXUS_STORAGE_GUARD__.snapshot()};
 });
 assert.equal(report.repaired.flag,'false');assert.equal(report.repaired.registry,'REGISTRY-PRESERVE');assert.equal(report.repaired.rules,'RULES-PRESERVE');assert.equal(report.repaired.protectedChars,report.quota.protectedChars);assert.equal(report.repaired.obsolete,null);assert.ok(report.repaired.diagnosticChars<=300000);
 // Exhaust the origin entirely with protected data. Optional startup writes must not crash,
 // but an operational register write must still report failure to its caller.
 report.protectedFull=await page.evaluate(()=>{
  for(const key of ['mf_unit_finder_diagnostics_v1','mf_staffing_failure_history_v1','mf_issue_recorder_v1'])localStorage.removeItem(key);
  localStorage.removeItem('mf_issue_recorder_enabled_v1');
  let lo=0,hi=6*1024*1024;
  while(lo+1<hi){const mid=Math.floor((lo+hi)/2);try{localStorage.setItem('test-protected-data','p'.repeat(mid));lo=mid;}catch{hi=mid;}}
  localStorage.setItem('test-protected-data','p'.repeat(lo));
  let criticalError='';try{localStorage.setItem('mcPersonnelVehicleTrainingRegistry_v1','NEW'.repeat(1000));}catch(e){criticalError=e.name;}
  return {criticalError,registry:localStorage.getItem('mcPersonnelVehicleTrainingRegistry_v1')};
 });
 assert.equal(report.protectedFull.criticalError,'QuotaExceededError');assert.equal(report.protectedFull.registry,'REGISTRY-PRESERVE');
 report.optionalDropped=await page.evaluate(()=>{localStorage.setItem('mf_issue_recorder_v1','[]');return window.__NEXUS_STORAGE_HEALTH__.optionalWritesDropped;});assert.ok(report.optionalDropped>0);
 const block=text=>{const start=text.indexOf('    if (!mfV3DormantPreload) {\n        // Optional recorder');assert.ok(start>=0);const end=text.indexOf('    let mfIssueRecorderLastDangerFingerprint',start);return text.slice(start,end);};
 await page.addScriptTag({content:"const mfV3DormantPreload=false,MF_RECORDER_ENABLED_KEY='mf_issue_recorder_enabled_v1';"+block(fixed)+'window.startupPreferenceCompleted=true;'});
 assert.equal(await page.evaluate(()=>window.startupPreferenceCompleted),true);
 const session=await context.newCDPSession(page);await session.send('HeapProfiler.enable');
 async function retention(text){
  await page.evaluate(()=>{window.__NEXUS_SELECTIVE_LOADING__=null;window.probes=[];});
  const fn=extract('nexusRecordSelectiveLoad',text);
  const realm=await page.evaluate(({fn})=>{
   let childObjects=0;
   for(let i=0;i<12;i++){
    const frame=document.createElement('iframe');document.body.append(frame);
    const w=frame.contentWindow;
    w.eval('let nexusSelectiveLoadCurrent=null,nexusSelectiveProbeReason="test";function getLocalMissionInstanceKey(){return "mission";}'+fn+';nexusRecordSelectiveLoad({ready:true,partial:true,clickedPages:0,count:1},10);');
    const last=window.__NEXUS_SELECTIVE_LOADING__.recent.at(-1);
    if(Object.getPrototypeOf(last)!==Object.prototype)childObjects++;
    window.probes.push(new WeakRef(w.document));frame.remove();
   }
   return {childObjects,statsAreTopRealm:Object.getPrototypeOf(window.__NEXUS_SELECTIVE_LOADING__)===Object.prototype};
  },{fn});
  await session.send('HeapProfiler.collectGarbage');await session.send('HeapProfiler.collectGarbage');
  return {...realm,retained:await page.evaluate(()=>window.probes.filter(ref=>!!ref.deref()).length)};
 }
 report.fixedRetention=await retention(fixed);
 assert.equal(report.fixedRetention.childObjects,0);assert.equal(report.fixedRetention.statsAreTopRealm,true);
 assert.equal(report.fixedRetention.retained,0);
 async function boot(runtime,repair){
  const isolated=await browser.newContext();
  await isolated.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const tab=await isolated.newPage();await tab.goto(origin+'/missions/999');
  await tab.setContent('<h1>Fixture mission</h1><div id="mission_general_info"></div><div id="mission_help"></div><table id="vehicle_table"></table>');
  await tab.evaluate(()=>{
   localStorage.setItem('mf_auto_mode_running','false');
   localStorage.setItem('mf_unit_finder_diagnostics_v1',JSON.stringify([{detail:'x'.repeat(2400000)}]));
   let lo=0,hi=6*1024*1024;
   while(lo+1<hi){const mid=Math.floor((lo+hi)/2);try{localStorage.setItem('test-protected-data','p'.repeat(mid));lo=mid;}catch{hi=mid;}}
   localStorage.setItem('test-protected-data','p'.repeat(lo));
  });
  if(repair)await tab.addScriptTag({path:`${root}/nexus-storage-guard.js`});
  await tab.addScriptTag({content:runtime});
  await tab.waitForFunction(()=>window.__MCN_BOOT_TRACE__?.errors?.some(e=>e.type==='mission-finder-startup') || window.__MCN_BOOT_TRACE__?.events?.some(e=>e.stage==='mission-control-mounted'),{},{timeout:10000});
  const result=await tab.evaluate(()=>({events:window.__MCN_BOOT_TRACE__.events.map(e=>e.stage),errors:window.__MCN_BOOT_TRACE__.errors,controls:!!document.getElementById('mission-finder-wrapper')}));
  await isolated.close();return result;
 }
 report.fixedBoot=await boot(fixed,true);
 assert.ok(report.fixedBoot.events.includes('mission-control-mounted'));assert.equal(report.fixedBoot.controls,true);
 report.passed=true;fs.writeFileSync('audit/storage-memory-72-verification.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:true,oldError:report.quota.oldError,protectedDataPreserved:true,fixedRetention:report.fixedRetention}));
}finally{await browser.close();await new Promise(r=>server.close(r));}


