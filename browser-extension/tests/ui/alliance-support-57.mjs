import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {devLibrary} from '../../scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
fs.mkdirSync('audit/audit80-alliance',{recursive:true});
const report={version:JSON.parse(fs.readFileSync('extension/manifest.json')).version,realGame:false,checks:[],errors:[],dispatches:[]};
const pass=name=>{report.checks.push(name);console.log('PASS '+name);};
const card=(id,value,participation='new')=>`<div class="missionSideBarEntry" mission_id="${id}" data-mission-participation-filter="${participation}" data-sortable-by='${JSON.stringify({average_credits:value})}'><a class="mission-alarm-button" href="/missions/${id}"><span id="mission_caption_${id}">Shared mission ${id}</span></a></div>`;
const home=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#384852;font:14px Arial}.navbar-header{height:50px;background:#bd2f27}.navbar-brand{float:left;padding:14px;color:white}#map{height:1000px;background:linear-gradient(130deg,#22484c,#182d38)}.missionSideBarEntry{color:white}</style></head><body><div class="navbar-header"><a class="navbar-brand" href="/">MC</a></div><a id="navbar_profile_link" href="/profile/123">Player</a><div id="mission_list">${card(9,9000)}</div><div id="mission_list_alliance" style="display:none">${card(114,0)}${card(101,2500)}${card(102,3000)}${card(103,5000)}${card(104,15000)}${card(105,20000)}${card(106,null)}${card(107,9000,'participated')}${card(108,1500)}${card(109,1700)}${card(110,7000)}${card(111,12000)}${card(112,16000)}</div><div id="mission_list_alliance_event">${card(113,30000)}</div><div id="map"></div></body></html>`;
const vehicle=(id,type,delay,extra='')=>`<tr ${delay===null?'':`data-sortvalue="${delay}"`}><td><input type="checkbox" name="vehicle_ids[]" class="vehicle_checkbox" id="vehicle_checkbox_${id}" vehicle_type_id="${type}" value="${id}" ${extra}><label for="vehicle_checkbox_${id}">Officer ${id}</label><a href="/vehicles/${id}">Officer ${id}</a></td></tr>`;
let sent=new Map(),delayReply=0,unknownMission='',loading=false;
let pendingReply=null;
function holdDispatchReply() {
  assert.equal(pendingReply,null);
  let resolve;
  const promise=new Promise(done=>{resolve=done;});
  pendingReply={promise,resolve};
  return ()=>{resolve();pendingReply=null;};
}
function mission(id) {
  const available=[vehicle(201,3,30),vehicle(202,3,10),vehicle(203,3,1,'disabled'),vehicle(204,8,0),vehicle(205,3,20),vehicle(301,95,25),vehicle(302,95,5)].join('');
  const rows=id==='108'?vehicle(204,8,0):id==='109'?vehicle(201,3,null):available;
  return `<!doctype html><html><head><meta name="csrf-token" content="fixture"><title>Mission ${id}</title></head><body><div id="mission_general_info">Shared mission ${id}</div><form action="/missions/${id}/alarm" method="post"><div id="vehicle_list_step"><table id="vehicle_show_table_all"><tbody>${rows}</tbody></table>${id==='111'?'<a class="missing_vehicles_load" href="#page2">Load more vehicles</a>':''}</div><a id="mission_alarm_btn" title="Dispatch" href="#">Dispatch <span id="vehicle_amount">0</span></a></form><div id="feedback"></div><table id="mission_vehicle_driving"><tbody>${sent.has(id)?`<tr><td><a href="/vehicles/${sent.get(id)}">Officer</a></td></tr>`:''}</tbody></table><script>
    document.addEventListener('change',()=>document.getElementById('vehicle_amount').textContent=document.querySelectorAll('input:checked').length);
    document.querySelector('.missing_vehicles_load')?.addEventListener('click',e=>{e.preventDefault();e.target.classList.add('disabled');setTimeout(()=>{document.querySelector('tbody').insertAdjacentHTML('beforeend',${JSON.stringify(vehicle(206,3,2))});e.target.remove();},250);});
    document.getElementById('mission_alarm_btn').onclick=async e=>{e.preventDefault();const data=new URLSearchParams();for(const box of document.querySelectorAll('input:checked'))data.append('vehicle_ids[]',box.value);const response=await fetch('/missions/${id}/alarm',{method:'POST',body:data});document.getElementById('feedback').innerHTML=await response.text();};
  </script></body></html>`;
}
const base=path.resolve('extension'),context=await chromium.launchPersistentContext(path.resolve('audit/audit80-alliance',`alliance57-${Date.now()}`),{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,viewport:{width:1280,height:900},args:[`--disable-extensions-except=${base}`,`--load-extension=${base}`],ignoreDefaultArgs:['--disable-extensions']});
let page;
try {
  await context.route('https://**/*',async route=>{
    const url=new URL(route.request().url());if(url.origin!=='https://www.missionchief.co.uk')return route.abort();
    if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:home});
    const alarm=url.pathname.match(/^\/missions\/(\d+)\/alarm$/);
    if(alarm){const selected=new URLSearchParams(route.request().postData()).getAll('vehicle_ids[]');report.dispatches.push({mission:alarm[1],selected});loading=true;if(pendingReply)await pendingReply.promise;else if(delayReply)await new Promise(r=>setTimeout(r,delayReply));loading=false;
      if(alarm[1]===unknownMission)return route.fulfill({contentType:'text/html',body:'<div class="alert alert-danger">No confirmed result</div>'});
      sent.set(alarm[1],selected[0]);return route.fulfill({contentType:'text/html',body:`<div class="alert alert-success" id="alert_success_${Date.now()}"><a href="/vehicles/${selected[0]}">Officer</a> has successfully been dispatched.</div>`});}
    const match=url.pathname.match(/^\/missions\/(\d+)$/);if(match)return route.fulfill({contentType:'text/html',body:mission(match[1])});
    return route.fulfill({contentType:'application/json',body:'[]'});
  });
  page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto('https://www.missionchief.co.uk/');await page.locator('#nx-alliance-launcher').click();
  const panel=page.locator('#nx-alliance-panel'),row=id=>panel.locator(`[data-mission="${id}"]`),support=id=>row(id).getByRole('button',{name:'Support',exact:true});
  const idle=()=>page.waitForFunction(()=>!window.__NEXUS_ALLIANCE_SUPPORT__.busy);
  assert.equal(await panel.locator('[data-mission]').count(),12);assert.equal(await row(107).count(),0);assert.equal(await row(9).count(),0);assert.equal(await row(113).count(),1);assert.equal(await row(114).count(),0);
  assert.equal(await panel.locator('[data-mission]').first().getAttribute('data-mission'),'113');
  await panel.getByLabel('Sort mission value',{exact:true}).selectOption('low');assert.equal(await panel.locator('[data-mission]').first().getAttribute('data-mission'),'108');
  await panel.getByLabel('Sort mission value',{exact:true}).selectOption('high');
  assert.equal(await page.locator('#nx-alliance-launcher').evaluate(n=>n.previousElementSibling.id),'mcn-v3-map-controller');
  await panel.getByLabel('Show already supported').check();assert.equal(await row(107).count(),1);assert.equal(await support(107).isDisabled(),true);await panel.getByLabel('Show already supported').uncheck();
  await panel.getByLabel('Mission value',{exact:true}).selectOption('3');assert.deepEqual(await panel.locator('[data-mission]').evaluateAll(nodes=>nodes.map(n=>n.dataset.mission)),['102']);
  await panel.getByLabel('Mission value',{exact:true}).selectOption('all');assert.match(await row(106).innerText(),/Value unavailable/);
  pass('Button beside Nexus lists hidden/shared/event cards; personal missions excluded; joined toggle, credit bounds and unknown credits work');
  await panel.getByLabel('Mission value',{exact:true}).selectOption('3');
  await panel.getByRole('button',{name:'Select all',exact:true}).click();
  assert.equal(await panel.getByRole('button',{name:'Support selected (1)',exact:true}).isEnabled(),true);
  assert.equal(await row(102).getByRole('button',{name:'Selected',exact:true}).count(),1);
  assert.equal(report.dispatches.length,0);
  await panel.getByRole('button',{name:'Clear selection',exact:true}).click();
  await panel.getByLabel('Mission value',{exact:true}).selectOption('all');
  await panel.getByLabel('Show already supported').check();
  await panel.getByRole('button',{name:'Select all',exact:true}).click();
  assert.equal(await row(107).getByRole('button',{name:'Selected',exact:true}).count(),0);
  assert.equal(await panel.getByRole('button',{name:'Select all',exact:true}).isDisabled(),true);
  assert.equal(await panel.getByRole('button',{name:'Support selected (12)',exact:true}).count(),1);
  await panel.getByRole('button',{name:'Clear selection',exact:true}).click();
  await panel.getByLabel('Show already supported').uncheck();
  pass('Select all respects value filter, excludes supported and zero-value missions, and does not dispatch');

  await page.evaluate(()=>{const node=document.getElementById('mission_caption_113');node.textContent='<img src=x onerror="window.injected=true">';});await panel.getByRole('button',{name:'Refresh',exact:true}).click();assert.equal(await row(113).locator('img').count(),0);assert.equal(await page.evaluate(()=>!!window.injected),false);
  await page.screenshot({path:'audit/audit80-alliance/alliance-57-desktop.png'});
  delayReply=1400;await support(101).dblclick();await page.waitForFunction(()=>document.querySelector('[data-nx-alliance-worker]')?.contentDocument?.querySelector('#vehicle_amount')?.textContent==='1');
  const worker=page.frames().find(f=>f.url().includes('/missions/101'));assert.equal(await worker.evaluate(()=>!!window.__NEXUS_EXTENSION__||!!window.__MCN_BOOT_TRACE__||!!window.__NEXUS_REQUIREMENT_TICKS__),false);
  assert.equal(await row(101).count(),1);assert.equal(await panel.isVisible(),true);
  await idle();assert.deepEqual(report.dispatches,[{mission:'101',selected:['202']}]);assert.equal(await row(101).count(),0);assert.equal(await page.locator('[data-nx-alliance-worker]').count(),0);
  pass('Double-click sends exactly one closest eligible Fire Officer; native confirmation hides row; frame has no Nexus heavy runtime and is released');
  delayReply=0;await row(102).getByRole('button',{name:'Select',exact:true}).click();await row(103).getByRole('button',{name:'Select',exact:true}).click();
  await panel.getByRole('button',{name:'Support selected (2)',exact:true}).click();await idle();
  assert.deepEqual(report.dispatches.slice(1),[{mission:'102',selected:['202']},{mission:'103',selected:['205']}]);assert.equal(await panel.isVisible(),true);assert.equal(await page.locator('[data-nx-alliance-worker]').count(),0);
  pass('Bulk sends one distinct officer per selected mission and retains the open panel');
  await support(108).click();await idle();assert.match(await row(108).innerText(),/No available Fire Officer/);await support(109).click();await idle();assert.match(await row(109).innerText(),/not reported vehicle travel times/);assert.equal(report.dispatches.length,3);
  await support(111).click();await idle();assert.deepEqual(report.dispatches.at(-1),{mission:'111',selected:['206']});
  pass('No officer or unknown ordering prevents dispatch; native pagination completes before nearest-officer selection');
  delayReply=1800;await support(104).click();await page.waitForFunction(()=>!!document.querySelector('[data-nx-alliance-worker]'));
  assert.equal(await page.evaluate(()=>window.__NEXUS_ALLIANCE_SUPPORT__.busy),true);
  // Exercise the actual start handler immediately; the open alliance panel can
  // cover the Auto button, making an actionability-based click wait until idle.
  await page.locator('[data-mcn-start]').dispatchEvent('click');assert.equal(await page.evaluate(()=>window.__NEXUS_AUTO_DISPATCH_BUSY__()),false);
  await panel.getByRole('button',{name:'Close',exact:true}).click();assert.equal(await panel.isVisible(),false);await idle();assert.equal(await page.locator('[data-nx-alliance-worker]').count(),0);await page.locator('#nx-alliance-launcher').click();assert.equal(await row(104).count(),0);
  pass('Auto start is guarded during support; closing the list does not interrupt a pending result or navigate the map');
  // Keep the native result pending until Stop is clicked, regardless of CI speed.
  const releaseStoppedReply=holdDispatchReply();await row(105).getByRole('button',{name:'Select',exact:true}).click();await row(112).getByRole('button',{name:'Select',exact:true}).click();
  const beforeStop=report.dispatches.length;await panel.getByRole('button',{name:'Support selected (2)',exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('nexusAllianceSupportResultsV1')||'{}')['105']?.state==='uncertain');
  await panel.getByRole('button',{name:'Stop queue',exact:true}).click();releaseStoppedReply();await idle();assert.equal(report.dispatches.length,beforeStop+1);assert.equal(report.dispatches.at(-1).mission,'105');assert.equal(await row(112).getByRole('button',{name:'Selected',exact:true}).count(),1);
  await panel.getByRole('button',{name:'Clear selection',exact:true}).click();
  pass('Stop queue checks the in-flight result and leaves remaining selections unsent');
  const releaseLockedReply=holdDispatchReply();await support(112).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('nexusAllianceSupportResultsV1')||'{}')['112']?.state==='uncertain');
  const second=await context.newPage();await second.goto('https://www.missionchief.co.uk/');await second.locator('#nx-alliance-launcher').click();
  await second.locator('[data-mission="113"]').getByRole('button',{name:'Support',exact:true}).click();await second.waitForFunction(()=>!window.__NEXUS_ALLIANCE_SUPPORT__.busy);
  assert.match(await second.locator('#nx-alliance-panel [role=status]').innerText(),/already sending in another game tab/);assert.equal(await second.locator('[data-nx-alliance-worker]').count(),0);await second.close();releaseLockedReply();await idle();
  pass('Two tabs cannot run competing alliance support queues');
  unknownMission='110';delayReply=0;await support(110).click();await idle();assert.equal(await row(110).getByRole('button',{name:'Check result'}).count(),1);assert.equal(await row(110).count(),1);
  const before=report.dispatches.length;await page.reload();await page.locator('#nx-alliance-launcher').click();assert.equal(await row(110).getByRole('button',{name:'Check result'}).count(),1);
  sent.set('110','202');await row(110).getByRole('button',{name:'Check result'}).click();await idle();assert.equal(await row(110).count(),0);assert.equal(report.dispatches.length,before);
  pass('Unconfirmed dispatch remains visible and survives reload; result check can confirm attendance without another send');
  await panel.getByRole('combobox',{name:'Support vehicle',exact:true}).selectOption('95');
  await support(113).click();await idle();assert.deepEqual(report.dispatches.at(-1),{mission:'113',selected:['302']});
  await panel.getByLabel('Show already supported').check();assert.match(await row(113).innerText(),/Sent: 1 Community Midwife/);assert.match(await row(101).innerText(),/Sent: 1 Fire Officer/);
  await page.reload();await page.locator('#nx-alliance-launcher').click();assert.equal(await panel.getByRole('combobox',{name:'Support vehicle',exact:true}).inputValue(),'95');
  pass('Saved dropdown dispatches exactly one nearest Midwife, preserves earlier Fire Officer labels, and survives full page reload');
  await page.setViewportSize({width:320,height:640});await panel.getByLabel('Show already supported').check();
  const bounds=await panel.evaluate(n=>{const r=n.getBoundingClientRect(),f=n.querySelector('footer').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,footer:f.bottom};});assert.ok(bounds.left>=0&&bounds.right<=320&&bounds.top>=0&&bounds.bottom<=640&&bounds.footer<=640,JSON.stringify(bounds));
  await panel.locator('.nx-as-list').evaluate(n=>n.scrollTop=n.scrollHeight);assert.ok(await panel.getByRole('button',{name:'Support selected',exact:true}).isVisible());await page.screenshot({path:'audit/audit80-alliance/alliance-57-phone.png'});
  pass('320px phone layout fits; mission list scrolls while filters and bulk controls remain visible');
  // Exercise the packaged panel in a phone browser requesting a 980px desktop layout.
  const phone=await chromium.launchPersistentContext(path.resolve('audit/audit80-alliance',`alliance57-phone-${Date.now()}`),{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,viewport:{width:390,height:844},screen:{width:390,height:844},hasTouch:true,isMobile:true,args:[`--disable-extensions-except=${base}`,`--load-extension=${base}`],ignoreDefaultArgs:['--disable-extensions']});
  try {
    await phone.route('https://**/*',route=>new URL(route.request().url()).pathname==='/'?route.fulfill({contentType:'text/html',body:home.replace('width=device-width,initial-scale=1','width=980')}):route.fulfill({contentType:'application/json',body:'[]'}));
    const mobile=await phone.newPage();await mobile.goto('https://www.missionchief.co.uk/');await mobile.locator('#nx-alliance-launcher').click();await mobile.waitForFunction(()=>document.documentElement.hasAttribute('data-nexus-desktop-phone'));
    const viewport=await mobile.evaluate(()=>({width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale}));
    const box=await mobile.locator('#nx-alliance-panel').boundingBox(),action=await mobile.locator('#nx-alliance-panel .nx-as-row-actions button').first().boundingBox();
    assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,JSON.stringify({box,viewport}));assert.ok(action.height*viewport.scale>=43);
    assert.ok(box.width*viewport.scale>=350,'Phone panel must use the available screen width');
    const scrollArea=await mobile.locator('#nx-alliance-panel .nx-as-list').boundingBox();assert.ok(scrollArea.height*viewport.scale>=200,'Mission rows must remain visible, not collapse under controls');
    await mobile.screenshot({path:'audit/audit80-alliance/alliance-57-orion-desktop.png'});pass('Phone desktop-site emulation fits the visible viewport with physical 44px action buttons');
  } finally { await phone.close(); }
  assert.deepEqual(report.errors,[]);report.passed=true;
} finally {pendingReply?.resolve();fs.writeFileSync('audit/audit80-alliance/alliance-support-57.json',JSON.stringify(report,null,2)+'\n');await context.close();}
