import fs from 'node:fs';
import assert from 'node:assert/strict';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const runtime=read('./extension/nexus-runtime.js'), previous=read('../3.0.43.218/extension/nexus-runtime.js');
function fn(source,name) {
  const start=source.indexOf('function '+name+'(');assert(start>=0,name);
  const boundary=/\n(?:    )?(?:async )?function /.exec(source.slice(start+10));assert(boundary,name);
  return source.slice(start,start+10+boundary.index);
}
let checks=0;
for(const name of ['claimAutoMissionDispatch','releaseAutoMissionDispatch','findAutoModeControl','isInteractive','nexusHandlePatientMissionTail']) {
  assert.equal(fn(runtime,name),fn(previous,name),name+' unchanged');checks++;
}
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
const report={version:'3.0.43.221',scope:'Isolated held-animation fixtures; document visibility is simulated, not a live Edge background run',cases:[]};
try {
  const page=await browser.newPage(),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{requests.push(route.request().method());return route.fulfill({contentType:'text/html',body:'<!doctype html><style>#mission-finder-wrapper{position:fixed;width:320px;height:240px}</style><div id="mission-finder-wrapper" style="visibility:hidden"><div id="control-panel"><button id="auto-mode-box" title="Auto Mode: Start">Auto Mode: Start</button></div></div>'});});
  for(const [label,width,height,visibility] of [['desktop',1100,850,'visible'],['hidden-tab',1100,850,'hidden'],['small-screen',390,700,'hidden']]) {
    await page.setViewportSize({width,height});await page.goto('https://www.missionchief.co.uk/missions/101');
    const result=await page.evaluate(({oldCentre,newCentre,detector,visibility})=>{
      Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>visibility});
      window.normaliseText=value=>String(value||'').trim();window.resetMissionFinderIosPosition=()=>false;
      window.mfKeepPanelPosition=false;window.mfDebugEnabled=false;window.MF_PANEL_LEFT_KEY='fixture-left';window.MF_PANEL_TOP_KEY='fixture-top';
      window.frames=[];window.requestAnimationFrame=callback=>frames.push(callback);
      window.events=[];window.__NEXUS_STARTUP_DIAGNOSTICS__={reveal:stage=>events.push(stage)};
      window.timerCount=0;const oldTimeout=window.setTimeout;window.setTimeout=()=>{timerCount++;throw Error('No timer should be needed');};
      const panel=document.getElementById('mission-finder-wrapper');
      (0,eval)(detector+'\n'+oldCentre);centreMissionFinderWindow(panel,'old hidden startup');
      const old={found:!!findAutoModeControl(document),heldCallbacks:frames.length,visibility:getComputedStyle(panel).visibility};
      frames.length=0;events.length=0;
      (0,eval)(newCentre);centreMissionFinderWindow(panel,'new hidden startup');
      const control=findAutoModeControl(document);let clicks=0;
      control?.addEventListener('click',()=>clicks++);control?.click();
      const ready={found:!!control,heldCallbacks:frames.length,visibility:getComputedStyle(panel).visibility,rect:{left:panel.getBoundingClientRect().left,top:panel.getBoundingClientRect().top},clicks,events:[...events],timerCount};
      control.disabled=true;const disabledRejected=!findAutoModeControl(document);control.disabled=false;
      panel.style.visibility='hidden';const intentionallyHiddenRejected=!findAutoModeControl(document);
      mfKeepPanelPosition=true;centreMissionFinderWindow(panel,'saved position');
      const saved={left:localStorage.getItem(MF_PANEL_LEFT_KEY),top:localStorage.getItem(MF_PANEL_TOP_KEY)};
      const detached=panel.cloneNode(true);events.length=0;centreMissionFinderWindow(detached,'detached');
      const detachedEvents=events.length;
      panel.remove();const missingRejected=!findAutoModeControl(document);
      window.setTimeout=oldTimeout;
      return {old,ready,disabledRejected,intentionallyHiddenRejected,missingRejected,saved,detachedEvents,documentVisibility:document.visibilityState};
    },{oldCentre:fn(previous,'centreMissionFinderWindow'),newCentre:fn(runtime,'centreMissionFinderWindow'),detector:runtime.slice(runtime.indexOf('function isInteractive(element)'),runtime.indexOf('function autoControlLooksRunning(control)')),visibility});
    assert.equal(result.old.found,false);assert.equal(result.old.heldCallbacks,1);checks+=2;
    assert.equal(result.ready.found,true);assert.equal(result.ready.heldCallbacks,0);assert.equal(result.ready.timerCount,0);assert.equal(result.ready.clicks,1);assert.deepEqual(result.ready.events,['immediate']);checks+=5;
    assert.equal(result.ready.rect.left,Math.max(8,Math.round((width-320)/2)));assert.equal(result.ready.rect.top,Math.max(8,Math.round((height-240)/2)));checks+=2;
    assert(result.disabledRejected);assert(result.intentionallyHiddenRejected);assert(result.missingRejected);assert.equal(result.detachedEvents,0);checks+=4;
    assert.equal(result.saved.left,result.ready.rect.left+'px');assert.equal(result.saved.top,result.ready.rect.top+'px');checks+=2;
    report.cases.push({label,...result});
  }
  assert.deepEqual(errors,[]);assert(requests.every(method=>method==='GET'));checks+=2;
} finally {await browser.close();}
report.passed=true;report.checks=checks;
fs.writeFileSync(new URL('./background-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,checks,scope:report.scope,cases:report.cases.map(c=>({label:c.label,oldFound:c.old.found,newFound:c.ready.found,heldCallbacks:c.ready.heldCallbacks}))}));
