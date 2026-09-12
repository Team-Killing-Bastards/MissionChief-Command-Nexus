import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {devLibrary} from '../../scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
fs.mkdirSync('audit',{recursive:true});
const report={version:JSON.parse(fs.readFileSync('extension/manifest.json')).version,realGame:false,checks:[],writes:[],errors:[]};
const pass=name=>{report.checks.push(name);console.log('PASS '+name);};
const scripts=['nexus-settings-main.js','nexus-responsive.js','nexus-home-market.js'].map(name=>fs.readFileSync('extension/'+name,'utf8'));
const wrap=body=>`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="csrf-token" content="fixture-only"><style>body{margin:12px;background:#505050;color:white;font:14px Arial}#nx-building-overview{display:grid;grid-template-columns:1fr 1.1fr;gap:16px}.fixture-panel{padding:12px;background:#102338;border:1px solid #7193ac;border-radius:4px}#nx-building-overview>div{min-height:90px}@media(max-width:700px){#nx-building-overview{grid-template-columns:1fr}}</style></head><body>${body}</body></html>`;
let mode='ok',nextMode='valid';
const home=(id,success=false)=>wrap(`<h1>Home Response ${id}</h1>${nextMode==='none'?'':`<a class="btn" href="${nextMode==='external'?'https://example.invalid/buildings/24':nextMode==='same'?'/buildings/'+id:'/buildings/'+(Number(id)+1)+'?dispatch=7'}">Next building</a>`}${success?'<div class="alert alert-success">Vehicle purchased.</div>':''}<div id="nx-building-overview"><div><dl class="dl-horizontal"><dt>Vehicles:</dt><dd>0 of 1 <a href="/buildings/${id}/vehicles/new">Vehicle Market</a></dd></dl><section class="fixture-panel">Nexus · Specialist crew coverage</section></div><div class="fixture-panel">Nexus · Building extensions</div></div>`);
const card=(id,type,name,post=false)=>`<div class="vehicle_type"><h3>${name}</h3><a class="buy-vehicle-btn" ${post?'data-method="post" data-confirm="Buy this unit?"':''} href="/buildings/${id}/vehicle/${id}/${type}/credits?building=${id}">10,000</a></div>`;
const market=id=>wrap(card(id,3,'Fire Officer')+card(id,80,'OTL',true));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const ctx=await browser.newContext({viewport:{width:1150,height:760}});
await ctx.addInitScript(texts=>document.addEventListener('DOMContentLoaded',()=>texts.forEach(text=>{const s=document.createElement('script');s.textContent=text;document.head.append(s);})),scripts);
await ctx.route('https://**/*',route=>{
 const request=route.request(),u=new URL(request.url());if(u.origin!=='https://www.missionchief.co.uk')return route.abort();
 const api=u.pathname.match(/^\/api\/buildings\/(\d+)$/);if(api)return route.fulfill({json:{id:Number(api[1]),building_type:22}});
 const offer=u.pathname.match(/^\/buildings\/(\d+)\/vehicles\/new$/);if(offer)return route.fulfill({contentType:'text/html',body:market(offer[1])});
 const purchase=u.pathname.match(/^\/buildings\/(\d+)\/vehicle\/(\d+)\/(\d+)\/credits$/);
 if(purchase){report.writes.push({id:purchase[1],type:purchase[3],method:request.method(),body:[...new URLSearchParams(request.postData()||'')]});
  if(mode==='redirect')return route.fulfill({status:302,headers:{location:`/buildings/${purchase[1]}?bought=1`},body:''});
  return route.fulfill({contentType:'text/html',body:wrap(mode==='reject'?'<div class="alert alert-danger">Purchase rejected.</div>':mode==='unconfirmed'?'<p>Result unavailable.</p>':'<div class="alert alert-success">Vehicle purchased.</div>')});
 }
 const building=u.pathname.match(/^\/buildings\/(\d+)$/);if(building)return route.fulfill({contentType:'text/html',body:home(building[1],u.searchParams.has('bought'))});
 if(u.pathname==='/host')return route.fulfill({contentType:'text/html',body:wrap('<h1>Game map</h1><iframe src="/buildings/23" style="width:100%;height:650px"></iframe>')});
 return route.fulfill({json:[]});
});
const page=await ctx.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.message));
const panel=page.locator('#nx-home-market'),toggle=panel.getByRole('switch',{name:'Buy and next building'}),buy=name=>panel.getByRole(name==='OTL'?'button':'link',{name:new RegExp('^'+name+' ')});
const open=async()=>{await page.goto('https://www.missionchief.co.uk/buildings/23');await buy('Fire Officer').waitFor();};
try{
 await open();assert.equal(await toggle.isChecked(),false);assert.equal(report.writes.length,0);
 await buy('Fire Officer').click();await page.waitForURL('**/buildings/23');await buy('Fire Officer').waitFor();assert.equal(report.writes.length,1);assert.equal(await toggle.isChecked(),false);
 pass('Default off preserves quick buy and return to the current building');
 await toggle.check();assert.equal(report.writes.length,1);assert.equal(new URL(page.url()).pathname,'/buildings/23');await page.screenshot({path:'audit/home-buy-next-59-desktop.png',fullPage:true});
 await buy('Fire Officer').evaluate(a=>{a.click();a.click();});await page.waitForURL('**/buildings/24?dispatch=7');await buy('Fire Officer').waitFor();assert.equal(report.writes.length,2);assert.deepEqual(report.writes.at(-1),{id:'23',type:'3',method:'GET',body:[]});assert.equal(await toggle.isChecked(),true);assert.equal(await page.evaluate(()=>sessionStorage.getItem('nexusHomeVehiclePurchaseV1')),null);
 await page.waitForTimeout(200);assert.equal(report.writes.length,2);assert.equal(new URL(page.url()).pathname,'/buildings/24');
 pass('Toggle alone never buys; one confirmed GET advances to the native next building with its query and keeps the choice without buying there');
 await open();page.once('dialog',d=>d.dismiss());await buy('OTL').click();assert.equal(report.writes.length,2);assert.equal(new URL(page.url()).pathname,'/buildings/23');
 page.once('dialog',d=>d.accept());await buy('OTL').click();await page.waitForURL('**/buildings/24?dispatch=7');await buy('Fire Officer').waitFor();assert.equal(report.writes.length,3);assert.equal(report.writes.at(-1).method,'POST');assert.deepEqual(report.writes.at(-1).body,[['authenticity_token','fixture-only']]);
 pass('Native POST confirmation and CSRF are preserved; cancellation stays put and confirmation advances once');
 mode='redirect';await open();await buy('Fire Officer').click();await page.waitForURL('**/buildings/24?dispatch=7');await buy('Fire Officer').waitFor();assert.equal(report.writes.length,4);
 pass('Success returned directly to the building after a native redirect also advances to the next building');
 for(const value of ['reject','unconfirmed']){mode=value;await open();await buy('Fire Officer').click();await page.getByText(value==='reject'?'Purchase rejected.':'Result unavailable.').waitFor();assert.match(page.url(),/\/vehicle\/23\/3\/credits/);assert.equal(await page.evaluate(()=>sessionStorage.getItem('nexusHomeVehiclePurchaseV1')),null);}
 assert.equal(report.writes.length,6);pass('Rejected or unconfirmed results stay on the game response, consume the intent and never retry');
 mode='ok';for(const value of ['none','external','same']){nextMode=value;await open();assert.equal(await toggle.isDisabled(),true);await buy('Fire Officer').click();await page.waitForURL('**/buildings/23');await buy('Fire Officer').waitFor();}
 assert.equal(report.writes.length,9);pass('Missing, external and same-building next links leave ordinary quick buy working without forwarding');
 nextMode='valid';await open();await page.evaluate(()=>sessionStorage.setItem('nexusHomeVehiclePurchaseV1',JSON.stringify({id:'23',at:Date.now()-120001,next:'/buildings/24'})));
 // Navigate directly to a mocked result to exercise an expired intent. This
 // fixture request is recorded, but no control click or retry is involved.
 await page.goto('https://www.missionchief.co.uk/buildings/23/vehicle/23/3/credits?building=23',{referer:'https://www.missionchief.co.uk/buildings/23'});await page.getByText('Vehicle purchased.').waitFor();assert.match(page.url(),/\/vehicle\/23\/3\/credits/);
 await open();await toggle.uncheck();await page.reload();await buy('Fire Officer').waitFor();assert.equal(await toggle.isChecked(),false);await toggle.check();
 pass('Expired intents cannot advance; switching the preference off survives reload');
 const before=report.writes.length;await page.goto('https://www.missionchief.co.uk/host');const frame=page.frameLocator('iframe');await frame.locator('#nx-home-market a.nx-buy').waitFor();await frame.getByRole('link',{name:'Fire Officer 10,000 credits',exact:true}).click();await frame.getByRole('heading',{name:'Home Response 24',exact:true}).waitFor();assert.equal(new URL(page.url()).pathname,'/host');assert.equal(report.writes.length,before+1);assert.equal(await frame.getByRole('switch',{name:'Buy and next building'}).isChecked(),true);
 pass('Buying within the visible building window advances that frame and keeps the main game page open');
 await open();await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.dataset.nexusTouch='true');const bounds=await panel.boundingBox(),label=await panel.locator('.nx-home-buy-next').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);assert.ok(label.height>=44);await page.screenshot({path:'audit/home-buy-next-59-phone.png',fullPage:true});
 pass('The themed toggle wraps within phone width and keeps a 44px touch target');assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=String(error);throw error;}finally{await browser.close();fs.writeFileSync('audit/home-buy-next-59.json',JSON.stringify(report,null,2)+'\n');}
