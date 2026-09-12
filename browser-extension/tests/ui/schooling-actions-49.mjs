import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {devLibrary} from '../../scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright'),base=path.resolve('extension');
const report={version:JSON.parse(fs.readFileSync(base+'/manifest.json')).version,realGame:false,checks:[],posts:[],errors:[]};
const pass=s=>{report.checks.push(s);console.log('PASS '+s);};
const meta='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
const wrap=body=>`<!doctype html><html><head>${meta}<style>body{background:#505050;color:white;font:14px Arial;padding:14px}.panel{margin:12px 0}.panel-heading{background:#292929;padding:12px}.panel-collapse{padding:10px}.alert-success{background:#284b28}.alert-danger{background:#602b2b}.alert{padding:15px}</style></head><body>${body}</body></html>`;
let mode='ok',showSuccess=false;
const pageHtml=()=>wrap(`<h1>Ambulance Officer</h1><div class="alert">There are still 10 seats available in this course.</div><form action="/schoolings/88/education" method="post"><input type="hidden" name="authenticity_token" value="fixture-csrf"><input id="validation" name="validation" value="ok" required><input type="hidden" name="native_clicks" value="0"><h2>Select Personnel</h2><div id="accordion">${[1,2].map(id=>`<div class="panel"><div class="panel-heading" building_id="${id}">Station ${id}</div><div class="panel-collapse">${[1,2].map(p=>`<label><input type="checkbox" name="personal_ids[]" value="${id}0${p}">Person ${id}0${p}</label>`).join('')}</div></div>`).join('')}</div><input id="educate" type="submit" name="commit" value="Educate" ${mode==='disabled'?'disabled':''}></form><script>document.getElementById('educate').addEventListener('click',()=>document.querySelector('[name=native_clicks]').value++);document.querySelector('form').addEventListener('submit',e=>{if(${JSON.stringify(mode)}==='cancel')e.preventDefault();});</script>`);
const ctx=await chromium.launchPersistentContext(path.resolve(`audit/actions49-${Date.now()}`),{headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',viewport:{width:1300,height:940},args:[`--disable-extensions-except=${base}`,`--load-extension=${base}`],ignoreDefaultArgs:['--disable-extensions']});
try {
 await ctx.route('https://**/*',async route=>{
  const request=route.request(),u=new URL(request.url());if(u.origin!=='https://www.missionchief.co.uk')return route.abort();
  if(u.pathname==='/api/buildings'){await new Promise(r=>setTimeout(r,180));return route.fulfill({contentType:'application/json',body:JSON.stringify([{id:100,caption:'North'},{id:200,caption:'South'},{id:1,caption:'Station 1',leitstelle_building_id:100},{id:2,caption:'Station 2',leitstelle_building_id:200}])});}
  if(request.method()==='POST'){
   assert.equal(u.pathname,'/schoolings/88/education');report.posts.push([...new URLSearchParams(request.postData()).entries()]);
   if(mode==='ok'){showSuccess=true;return route.fulfill({contentType:'text/html',body:wrap('<h1>Course result</h1><div class="alert alert-success">Personnel successfully educated.</div>')});}
   const body=mode==='full'?'<div class="alert alert-danger">There are no seats available. This course is full.</div>':mode==='error'?'<div class="alert alert-danger">Personnel could not be educated.</div>':'<p>Result received without a confirmation.</p>';
   return route.fulfill({contentType:'text/html',body:wrap('<h1>Course result</h1>'+body)});
  }
  if(u.pathname==='/schoolings/88')return route.fulfill({contentType:'text/html',body:pageHtml()});
  if(u.pathname==='/schoolings')return route.fulfill({contentType:'text/html',body:wrap('<h1>Courses</h1>'+(showSuccess?'<div class="alert alert-success">Personnel successfully educated.</div>':''))});
  if(u.pathname==='/host')return route.fulfill({contentType:'text/html',body:wrap('<h1>Native course window</h1>')});
  return route.fulfill({contentType:'application/json',body:'[]'});
 });
 const page=await ctx.newPage();globalThis.fixturePage=page;page.on('requestfailed',r=>(report.failedRequests??=[]).push({url:r.url(),error:r.failure()}));page.on('response',r=>(report.responses??=[]).push({url:r.url(),status:r.status()}));page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.message));
 const open=async()=>{showSuccess=false;await page.goto('https://www.missionchief.co.uk/schoolings/88');await page.locator('#nx-educate-again').waitFor();};
 await open();assert.ok(await page.locator('#educate').evaluate(n=>n.classList.contains('nx-education-button')));
 await page.locator('#validation').fill('');await page.locator('#nx-educate-again').click();assert.equal(report.posts.length,0);assert.equal(await page.evaluate(()=>sessionStorage.getItem('nexusEducateReturnV1')),null);
 await page.locator('#validation').fill('ok');await page.waitForFunction(()=>!document.querySelector('#nx-schooling-filters select').disabled);
 await page.getByLabel('Dispatch centre',{exact:true}).selectOption('100');await page.getByLabel('Station name',{exact:true}).fill('Station 1');await page.locator('[value="101"]').check();
 await page.screenshot({path:'audit/schooling-actions-49.png'});
 await page.locator('#nx-educate-again').click();await page.waitForFunction(()=>document.querySelector('.nx-education-note')?.textContent.includes('Select the next batch'));
 assert.equal(new URL(page.url()).pathname,'/schoolings/88');assert.equal(report.posts.length,1);
 assert.deepEqual(report.posts[0],[['authenticity_token','fixture-csrf'],['validation','ok'],['native_clicks','1'],['personal_ids[]','101'],['commit','Educate']]);
 assert.equal(await page.locator('#accordion input:checked').count(),0);assert.equal(await page.evaluate(()=>sessionStorage.getItem('nexusEducateReturnV1')),null);
 await page.waitForFunction(()=>document.querySelector('#nx-schooling-filters select')?.value==='100');assert.equal(await page.getByLabel('Station name',{exact:true}).inputValue(),'Station 1');
 pass('Nexus Educate styling preserves native validation, click handler, submitter and CSRF; one POST returns by GET with no staff selected and the same station filters');
 await page.locator('[value="102"]').check();await page.locator('#educate').click();await page.waitForURL('**/schoolings/88/education');await page.waitForTimeout(250);assert.equal(report.posts.length,2);assert.equal(new URL(page.url()).pathname,'/schoolings/88/education');assert.equal(await page.evaluate(()=>sessionStorage.getItem('nexusEducateReturnV1')),null);
 pass('Normal Educate keeps the game’s normal destination and does not reuse the previous return request');
 for(const result of ['error','full','unknown']){
  mode=result;await open();await page.locator('[value="101"]').check();const before=report.posts.length;await page.locator('#nx-educate-again').click();await page.waitForURL('**/schoolings/88/education');await page.waitForTimeout(250);assert.equal(report.posts.length,before+1);assert.equal(new URL(page.url()).pathname,'/schoolings/88/education');assert.equal(await page.evaluate(()=>sessionStorage.getItem('nexusEducateReturnV1')),null);
  if(result==='unknown')assert.equal(await page.getByRole('link',{name:'Return to this course'}).getAttribute('href'),'https://www.missionchief.co.uk/schoolings/88');else assert.equal(await page.locator('.nx-education-note').count(),0);
 }
 pass('Server errors and full courses remain visible; an unconfirmed result offers a return link and never retries the POST');
 mode='cancel';await open();let before=report.posts.length;await page.locator('[value="101"]').check();await page.locator('#nx-educate-again').click();await page.waitForTimeout(150);assert.equal(report.posts.length,before);assert.equal(await page.evaluate(()=>sessionStorage.getItem('nexusEducateReturnV1')),null);assert.ok(await page.locator('#nx-educate-again').isEnabled());
 mode='disabled';await open();assert.ok(await page.locator('#nx-educate-again').isDisabled());await page.locator('#educate').evaluate(n=>n.disabled=false);await page.waitForFunction(()=>!document.getElementById('nx-educate-again').disabled);
 pass('Native cancellation never arms a return; the extra button follows native disabled state');
 mode='ok';await open();await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await page.locator('#nx-educate-again').count(),0);await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));assert.equal(await page.locator('#nx-educate-again').count(),1);
 const cdp=await ctx.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.documentElement.dataset.nexusTouch==='true');for(const selector of ['#educate','#nx-educate-again']){const r=await page.locator(selector).boundingBox();assert.ok(r.height>=44&&r.x+r.width<=390);}
 await page.screenshot({path:'audit/schooling-actions-49-phone.png',fullPage:true});
 await page.evaluate(()=>localStorage.setItem('nexusConveniencesV1',JSON.stringify({schoolingActions:false})));await page.reload();await page.locator('#educate').waitFor();assert.equal(await page.locator('#nx-educate-again').count(),0);assert.ok(!await page.locator('#educate').evaluate(n=>n.classList.contains('nx-education-button')));await page.evaluate(()=>localStorage.removeItem('nexusConveniencesV1'));
 pass('Actions clean up and mount once after suspension, fit phone touch targets, and respect their separate Settings switch');
 await page.goto('https://www.missionchief.co.uk/host');const attached=page.waitForEvent('frameattached');await page.evaluate(()=>{const f=document.createElement('iframe');f.src='/schoolings/88';f.style='width:900px;height:700px';document.body.append(f);});const frame=await attached;await frame.waitForURL('**/schoolings/88');await frame.locator('#nx-educate-again').waitFor();await frame.locator('[value="101"]').check();before=report.posts.length;
 await frame.locator('#nx-educate-again').evaluate(n=>{n.click();n.click();});await frame.waitForFunction(()=>document.querySelector('.nx-education-note')?.textContent.includes('Select the next batch'));assert.equal(report.posts.length,before+1);assert.equal(new URL(page.url()).pathname,'/host');assert.equal(new URL(frame.url()).pathname,'/schoolings/88');
 pass('Native course iframe returns inside the same window; rapid repeat clicks produce exactly one submission');
 assert.deepEqual(report.errors,[]);report.passed=true;
} catch(error) {report.failure=await globalThis.fixturePage.evaluate(()=>({url:location.href,referrer:document.referrer,pending:(()=>{try{return sessionStorage.getItem('nexusEducateReturnV1')}catch{return 'inaccessible'}})(),text:document.body.innerText}));throw error;} finally {await ctx.close();fs.writeFileSync('audit/schooling-actions-49.json',JSON.stringify(report,null,2)+'\n');}
