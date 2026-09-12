import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {devLibrary} from '../../scripts/dev-library.mjs';
const acorn=createRequire(import.meta.url)('internal/deps/acorn/acorn/dist/acorn');
const runtime=fs.readFileSync('extension/nexus-runtime.js','utf8');
const wanted=['buildUi','injectStyles','render','renderControllerSkips','readablePhaseLabel','compactMissionIdLabel','missionSkipIssueDetails','activeMissionSkipRecords'];
const found=new Map();
function walk(node){if(!node||typeof node!=='object')return;if(node.type==='FunctionDeclaration'&&wanted.includes(node.id.name)&&!found.has(node.id.name))found.set(node.id.name,runtime.slice(node.start,node.end));for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(walk);else if(value?.type)walk(value);}}
walk(acorn.parse(runtime,{ecmaVersion:'latest'}));assert.equal(found.size,wanted.length);
const report={version:'3.0.43.56',realGame:false,checks:[],errors:[]};
const pass=name=>{report.checks.push(name);console.log('PASS '+name);};
const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#505050;color:white;font:14px Arial}.navbar-header{height:50px;background:#b72922}.navbar-brand{float:left;padding:14px}#map{height:1400px;background:#1b3540}</style></head><body><div class="navbar-header"><a class="navbar-brand" href="/">MissionChief</a></div><div id="map"></div></body></html>';
const fixture=`
const ROOT_ID='mcn-v3-map-controller',STYLE_ID='mcn-v3-map-controller-style',STORAGE_COLLAPSED='mcn_v3_collapsed_v1',MASTER_VERSION='3.0.43',MISSION_FINDER_VERSION='10.6.180',MINIMUM_ACTIONABLE_MISSIONS=2;
window.__NEXUS_EXTENSION__={build:'3.0.43.56'};
const state={phase:'IDLE',status:'Ready',detail:'Auto Mode is stopped.',running:false,wanted:false,stopping:false,worker:null,currentMissionId:'',currentMissionName:'',currentMissionUrl:'',topMission:{missionId:'81',caption:'Fired Employee Spills Cleaning Chemicals',actionKind:'NEW'},visualTopMission:null,missionSkipRecords:new Map(),radioTransportRequests:[],runUniqueMissionCount:0,nativeMissionAdvances:0,runPatientTransports:0,runPrisonerTransports:0,transportServiceCleared:0,transportServiceAttempts:0,runtimeRecycles:0,postDispatchSoftRecoveries:0,postDispatchHardRecoveries:0};
window.calls={start:0,stop:0,retry:0,export:0};
function startController(){calls.start++;state.wanted=true;state.running=true;state.phase='ACTIVE';state.status='Auto Mode running';state.detail='Selecting units for the current mission.';state.currentMissionId='81';state.currentMissionName=state.topMission.caption;render();}
function gracefulStop(){calls.stop++;state.stopping=true;state.running=false;state.status='Stopping Auto Mode';render();}
function retryCurrent(){calls.retry++;}
function exportDiagnostics(){calls.export++;}
function log(){} function chooseTopMission(){return state.topMission;} function refreshRadioTransportRequests(){} function updateCurrentMissionName(){} function getWorkerDocument(){return null;} function compactMissionCandidate(x){return x;} function missionNameForId(){return 'Mission';} function missionDisplay(id,name){return (name||'Mission')+' [M'+id+']';} function missionFinderRunValueSnapshot(){return {completedDispatches:7};} function missionSkipRemaining(id){const r=state.missionSkipRecords.get(String(id));return r?Math.max(0,r.retryAfterAdvance-state.nativeMissionAdvances):0;} function collectMissionCandidates(){return state.topMission?[state.topMission]:[];}
localStorage.setItem(STORAGE_COLLAPSED,'false');
`;
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
  const context=await browser.newContext({viewport:{width:1280,height:940}});
  await context.route('https://**/*',route=>route.fulfill({contentType:'text/html',body:html}));
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('https://www.missionchief.co.uk/');await page.addScriptTag({content:fixture+'\n'+[...found.values()].join('\n')+'\nbuildUi();'});
  await page.addScriptTag({content:fs.readFileSync('extension/nexus-responsive.js','utf8')});
  assert.equal(await page.locator('[data-mcn-hero-name]').textContent(),'Fired Employee Spills Cleaning Chemicals');
  assert.equal(await page.locator('[data-mcn-sent]').textContent(),'7');
  assert.equal(await page.locator('[data-mcn-stop]').isVisible(),false);
  await page.locator('[data-mcn-start]').click();assert.equal(await page.locator('[data-mcn-start]').isVisible(),false);assert.equal(await page.locator('[data-mcn-stop]').isVisible(),true);
  await page.locator('[data-mcn-retry]').click();await page.locator('[data-mcn-stop]').click();assert.equal(await page.locator('[data-mcn-stop]').isDisabled(),true);
  assert.deepEqual(await page.evaluate(()=>calls),{start:1,stop:1,retry:1,export:0});
  pass('Real controller UI handlers invoke Start, Retry and Stop once; stopping cannot restart or double-stop.');
  await page.evaluate(()=>{state.wanted=false;state.stopping=false;state.phase='IDLE';state.status='Ready';state.detail='Auto Mode is stopped.';state.missionSkipRecords.set('82',{missionId:'82',missionName:'Chemical spill',reason:'Resource shortage',issues:['HazMat Unit x1'],retryAfterAdvance:5});state.missionSkipRecords.set('83',{missionId:'83',missionName:'Legacy skip',reason:'No successful selection',retryAfterAdvance:6});render();});
  assert.equal(await page.locator('[data-mcn-skip-count]').textContent(),'2');assert.equal(await page.locator('.mcn-skip-list>li').count(),0);
  await page.locator('[data-mcn-skip-details]>summary').click();await page.locator('.mcn-skip-list>li').first().waitFor();
  assert.match(await page.locator('.mcn-skip-list').innerText(),/HazMat Unit x1/);assert.match(await page.locator('.mcn-skip-list').innerText(),/No specific unit details were recorded/);
  assert.match(await page.locator('.mcn-skip-list').innerText(),/5 more mission advances/);
  assert.equal(await page.locator('.mcn-skip-name').first().getAttribute('href'),'/missions/82');
  await page.evaluate(()=>{window.keptSkipNode=document.querySelector('.mcn-skip-list>li');render();});
  assert.equal(await page.evaluate(()=>keptSkipNode===document.querySelector('.mcn-skip-list>li')),true);
  await page.screenshot({path:'audit/auto-focus-56-desktop.png'});
  pass('Skip reasons show recorded units, explicit unknown details and native mission links; stable renders retain the existing list.');
  await page.evaluate(()=>{state.missionSkipRecords.set('malicious',{missionId:'javascript:alert(1)',missionName:'<img src=x onerror=alert(1)>',reason:'<script>alert(1)</script>',issues:['<b>HazMat x1</b>'],retryAfterAdvance:2});render();});
  assert.equal(await page.locator('.mcn-skip-list img,.mcn-skip-list script,.mcn-skip-list b').count(),0);assert.equal(await page.locator('.mcn-skip-list a[href^="javascript:"]').count(),0);
  await page.evaluate(()=>{state.missionSkipRecords.delete('malicious');state.nativeMissionAdvances=5;render();});assert.equal(await page.locator('.mcn-skip-list>li').count(),1);assert.match(await page.locator('.mcn-skip-list').innerText(),/1 more mission advance\./);
  await page.evaluate(()=>{state.nativeMissionAdvances=6;render();});assert.equal(await page.locator('.mcn-skip-list>li').count(),0);assert.equal(await page.locator('[data-mcn-skips-empty]').isVisible(),true);
  pass('Untrusted mission/reason text is inert; expiry removes resolved skips and shows the empty state.');
  await page.locator('.mcn-fold').click();assert.equal(await page.locator('.mcn-summary').isVisible(),false);assert.equal(await page.locator('[data-mcn-start]').isVisible(),true);await page.locator('.mcn-fold').click();
  await page.locator('[data-mcn-system-details]>summary').click();await page.locator('[data-mcn-export]').click();assert.equal(await page.evaluate(()=>calls.export),1);await page.locator('[data-mcn-system-details]>summary').click();
  await page.locator('.mcn-fold').press('Escape');assert.equal(await page.locator('.mcn-panel').isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement.className),'mcn-launcher');await page.locator('.mcn-launcher').click();
  pass('Minimise keeps controls, Export retains its handler, and Escape closes the panel and restores launcher focus.');
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(()=>{state.nativeMissionAdvances=0;render();});
  await page.waitForFunction(()=>document.documentElement.dataset.nexusLayout==='phone');
  for(const open of [false,true]){
    await page.locator('[data-mcn-skip-details]').evaluate((n,open)=>n.open=open,open);
    const box=await page.locator('.mcn-panel').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=320&&box.y>=0&&box.y+box.height<=568);
    const overflow=await page.locator('.mcn-body').evaluate(n=>n.scrollWidth>n.clientWidth);assert.equal(overflow,false);
  }
  await page.locator('.mcn-body').evaluate(n=>n.scrollTop=n.scrollHeight);assert.equal(await page.locator('[data-mcn-start]').isVisible(),true);
  const action=await page.locator('[data-mcn-start]').boundingBox();assert.ok(action.y>=12&&action.y+action.height<=568);
  await page.screenshot({path:'audit/auto-focus-56-phone.png'});pass('320px phone panel fits; long disclosures scroll while Start/Stop stays reachable.');
  await context.close();
  const phone=await browser.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},hasTouch:true,isMobile:true});
  await phone.route('https://**/*',route=>route.fulfill({contentType:'text/html',body:html.replace('width=device-width,initial-scale=1','width=980')}));
  const mobile=await phone.newPage();mobile.on('pageerror',e=>report.errors.push(e.message));
  await mobile.goto('https://www.missionchief.co.uk/');await mobile.addScriptTag({content:fixture+'\n'+[...found.values()].join('\n')+'\nbuildUi();'});
  await mobile.addScriptTag({content:fs.readFileSync('extension/nexus-responsive.js','utf8')});
  await mobile.waitForFunction(()=>document.documentElement.hasAttribute('data-nexus-desktop-phone'));
  const viewport=await mobile.evaluate(()=>({width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale}));
  const phoneBox=await mobile.locator('.mcn-panel').boundingBox();assert.ok(phoneBox.x+phoneBox.width<=viewport.width+1&&phoneBox.y+phoneBox.height<=viewport.height+1);
  const phoneAction=await mobile.locator('[data-mcn-start]').boundingBox();assert.ok(phoneAction.height*viewport.scale>=43);
  await mobile.screenshot({path:'audit/auto-focus-56-orion-desktop.png'});
  pass('Phone desktop-site emulation fits the visible viewport and retains physical 44px action targets.');
  await phone.close();assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack;throw e;}finally{fs.writeFileSync('audit/auto-focus-56.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
