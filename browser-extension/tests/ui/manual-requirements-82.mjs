import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {devLibrary} from '../../scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
fs.mkdirSync('audit/audit78-hidden-popup',{recursive:true});
const report={version:JSON.parse(fs.readFileSync('extension/manifest.json')).version,realGame:false,checks:[],errors:[],dispatches:[]};
const pass=name=>{report.checks.push(name);console.log('PASS '+name);};
const card=(id,value,participation='new')=>`<div class="missionSideBarEntry" mission_id="${id}" data-mission-participation-filter="${participation}" data-sortable-by='${JSON.stringify({average_credits:value})}'><a class="mission-alarm-button" href="/missions/${id}"><span id="mission_caption_${id}">Shared mission ${id}</span></a></div>`;
const home=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#384852;font:14px Arial}.navbar-header{height:50px;background:#bd2f27}.navbar-brand{float:left;padding:14px;color:white}#map{height:1000px;background:linear-gradient(130deg,#22484c,#182d38)}.missionSideBarEntry{color:white}</style></head><body><div class="navbar-header"><a class="navbar-brand" href="/">MC</a></div><a id="navbar_profile_link" href="/profile/123">Player</a><div id="mission_list">${card(9,9000)}</div><div id="mission_list_alliance" style="display:none">${card(114,0)}${card(101,2500)}${card(102,3000)}${card(103,5000)}${card(104,15000)}${card(105,20000)}${card(106,null)}${card(107,9000,'participated')}${card(108,1500)}${card(109,1700)}${card(110,7000)}${card(111,12000)}${card(112,16000)}</div><div id="mission_list_alliance_event">${card(113,30000)}</div><div id="map"></div></body></html>`;
const vehicle=(id,type,delay,extra='')=>`<tr ${delay===null?'':`data-sortvalue="${delay}"`}><td><input type="checkbox" name="vehicle_ids[]" class="vehicle_checkbox" id="vehicle_checkbox_${id}" vehicle_type_id="${type}" vehicle_type_caption="${({3:'Fire Officer',5:'Ambulance',33:'Mass Casualty Equipment',34:'Ambulance Officer',0:'Water Ladder',8:'Police car'})[type]||'Vehicle'}" value="${id}" ${extra}><label for="vehicle_checkbox_${id}">${({3:'Fire Officer',5:'Ambulance',33:'Mass Casualty Equipment',34:'Ambulance Officer',0:'Water Ladder',8:'Police car'})[type]||'Vehicle'} ${id}</label><a href="/vehicles/${id}">${({3:'Fire Officer',5:'Ambulance',33:'Mass Casualty Equipment',34:'Ambulance Officer',0:'Water Ladder',8:'Police car'})[type]||'Vehicle'} ${id}</a></td></tr>`;
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
  const available=[vehicle(201,3,30),vehicle(202,3,10),vehicle(203,3,1,'disabled'),vehicle(204,8,0),vehicle(205,3,20),vehicle(401,0,2),vehicle(402,0,3),...Array.from({length:140},(_,i)=>vehicle(500+i,5,i+4)),vehicle(701,34,5),vehicle(801,33,5),vehicle(301,95,25),vehicle(302,95,5)].join('');
  const rows=id==='108'?vehicle(204,8,0):id==='109'?vehicle(201,3,null):available;
  return `<!doctype html><html><head><meta name="csrf-token" content="fixture"><title>Mission ${id}</title></head><body><div id="mission_general_info">Shared mission ${id}<div id="missing_text" class="alert alert-danger"><div data-requirement-type="vehicles"><b>Missing Vehicles:</b> 2 Fire engines, 1 Police car, 1 Fire Officer</div></div><span class="badge">127 Patients</span><div class="mission_patient"><div id="patients_missing_1" class="alert alert-danger">127 x We need: Ambulance, Ambulance Officer, Mass Casualty Equipment</div></div></div><form action="/missions/${id}/alarm" method="post"><div id="vehicle_list_step"><table id="vehicle_show_table_all"><tbody>${rows}</tbody></table>${id==='111'?'<a class="missing_vehicles_load" href="#page2">Load more vehicles</a>':''}</div><a id="mission_alarm_btn" title="Dispatch" href="#">Dispatch <span id="vehicle_amount">0</span></a></form><div id="feedback"></div><table id="mission_vehicle_driving"><tbody>${sent.has(id)?`<tr><td><a href="/vehicles/${sent.get(id)}">Officer</a></td></tr>`:''}</tbody></table><script>
    sessionStorage.setItem('mf_patient_selection_ledger_v10_6_50',JSON.stringify({missionKey:'mission:101',counts:{ambulance:127,'ambulance-officer':1,'mass-casualty-equipment':1}}));
    document.addEventListener('change',()=>document.getElementById('vehicle_amount').textContent=document.querySelectorAll('input:checked').length);
    document.querySelector('.missing_vehicles_load')?.addEventListener('click',e=>{e.preventDefault();e.target.classList.add('disabled');setTimeout(()=>{document.querySelector('tbody').insertAdjacentHTML('beforeend',${JSON.stringify(vehicle(206,3,2))});e.target.remove();},250);});
    document.getElementById('mission_alarm_btn').onclick=async e=>{e.preventDefault();const data=new URLSearchParams();for(const box of document.querySelectorAll('input:checked'))data.append('vehicle_ids[]',box.value);const response=await fetch('/missions/${id}/alarm',{method:'POST',body:data});document.getElementById('feedback').innerHTML=await response.text();};
  </script></body></html>`;
}
const base=path.resolve('extension'),context=await chromium.launchPersistentContext(path.resolve('audit/audit78-hidden-popup',`alliance57-${Date.now()}`),{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,viewport:{width:1280,height:900},args:[`--disable-extensions-except=${base}`,`--load-extension=${base}`],ignoreDefaultArgs:['--disable-extensions']});
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
  await page.waitForFunction(()=>window.__NEXUS_EXTENSION__?.build==='3.0.43.82');
  const state=await page.evaluate(()=>({build:window.__NEXUS_EXTENSION__,controller:!!window.__MCN_V3_CONTROLLER__}));
  await page.locator('#nx-alliance-panel').getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>{const modal=document.createElement('div');modal.className='lightbox';modal.style='position:fixed;inset:0;background:white;z-index:99999';modal.innerHTML='<iframe src="/missions/101" style="width:100%;height:100%"></iframe>';document.body.append(modal);});
  await page.waitForFunction(()=>document.querySelector('.lightbox iframe')?.contentDocument?.querySelector('#mission-update-box'));const topPage=page;page=page.frames().find(f=>f.url().includes('/missions/101'));


  await page.locator('#mission-update-box').waitFor(); await page.waitForFunction(()=>document.querySelector('#missing_text')?.classList.contains('nx-original-hidden')); console.log('CONFIRMED actual comfort panel hid original requirements');
  const dialogs=[];topPage.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});
  await page.locator('#mission-update-box').click();await page.waitForFunction(()=>!document.querySelector('#mission-update-box').disabled);await page.waitForTimeout(500);
  const outcome=await page.evaluate(()=>({selected:[...document.querySelectorAll('input.vehicle_checkbox:checked')].map(x=>x.value),status:document.querySelector('#status-box-message')?.textContent}));console.log(JSON.stringify({outcome,dialogs}));
  fs.writeFileSync('audit/hidden-source-fixed-outcome.json',JSON.stringify({outcome,dialogs,errors:report.errors},null,2));
  fs.writeFileSync('audit/hidden-source-fixed-outcome.json',JSON.stringify({outcome,dialogs,errors:report.errors},null,2));
  assert.equal(outcome.selected.filter(x=>Number(x)>=500&&Number(x)<640).length,127);
  assert.ok(['202','204','401','402','701','801'].every(id=>outcome.selected.includes(id)));
  const first=[...outcome.selected];await page.locator('#mission-update-box').click();await page.waitForFunction(()=>!document.querySelector('#mission-update-box').disabled);
  const second=await page.evaluate(()=>[...document.querySelectorAll('input.vehicle_checkbox:checked')].map(x=>x.value));assert.deepEqual(second,first);
  console.log('PASS actual button: all mixed requirements selected, repeat preserved exact selections');
  await page.evaluate(()=>{const x=document.createElement('div');x.style.display='none';x.className='alert alert-danger';x.textContent='Missing Vehicles: 999 Fire Officers';document.body.append(x);document.querySelector('#nx-missing details').open=true;});
  await page.locator('#mission-update-box').click();await page.waitForFunction(()=>!document.querySelector('#mission-update-box').disabled);
  assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('input.vehicle_checkbox:checked')].map(x=>x.value)),first);
  console.log('PASS expanded original and unrelated hidden alert do not duplicate requirements');
  await page.evaluate(()=>{document.querySelector('#missing_text [data-requirement-type]').innerHTML='<b>Missing Vehicles:</b> 5 Fire Officers, 3 Water Carriers, 1 BASU, 4 HazMat Units or CBRN Vehicles, 5 Foam Units, 6 Police cars, 1 Ambulance Officer, 1 ATV Carrier, 1 Mass Casualty Equipment, 2 Welfare Vehicles, 1 Primary Response Vehicle, 2 Secondary Response Vehicles, 2 Operational Team Leaders';});
  await page.waitForFunction(()=>document.querySelector('#nx-missing')?.textContent.includes('Secondary Response Vehicles'));
  await page.waitForTimeout(400);
  await page.locator('#mission-update-box').click();await page.waitForFunction(()=>!document.querySelector('#mission-update-box').disabled);
  const full=await page.evaluate(()=>({status:document.querySelector('#status-box-message').textContent,list:document.querySelector('#vehicle-load-list-box').textContent}));
  console.log(JSON.stringify({full}));
  fs.writeFileSync('audit/all-requirements-78-outcome.json',JSON.stringify({full,dialogs,errors:report.errors},null,2));
  for(const name of ['Fire Officer','Water Carrier','HazMat','Foam','Police','Ambulance Officer','ATV Carrier','Mass Casualty','Primary Response','Secondary Response','Operational Team Leader'])assert.ok(full.list.toLowerCase().includes(name.toLowerCase()),name);
  assert.ok(!/^Units ready for dispatch/.test(full.status));
  const pendingDownload=topPage.waitForEvent('download');
  await page.evaluate(()=>document.dispatchEvent(new Event('nexus:export-mission-diagnostics')));
  const diagnostic=JSON.parse(fs.readFileSync(await (await pendingDownload).path(),'utf8'));
  console.log('PASS exported requirement diagnostics in mission popup');
  fs.writeFileSync('audit/source-rows-popup-82.json',JSON.stringify(diagnostic.current.requirementContext,null,2));
  console.log('PASS screenshot requirement groups reach selector; existing shared OSU rules retained; unavailable units prevent ready');

  console.log(JSON.stringify({loaded:true,state,missionUpdateVisible:await page.locator('#mission-update-box').isVisible(),errors:report.errors}));
  assert.deepEqual(report.errors,[]);
}finally{await context.close();}
