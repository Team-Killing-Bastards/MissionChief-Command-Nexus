import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {devLibrary} from '../../scripts/dev-library.mjs';
import {commandToolbarFixture} from './command-toolbar-fixture.mjs';
import {buildingOverviewFixture,buildingPersonnel,buildingFleet} from './building-overview-fixture.mjs';
const {chromium}=devLibrary('playwright');
const base=path.resolve('extension'),report={version:JSON.parse(fs.readFileSync(base+'/manifest.json')).version,realDevice:false,checks:[],errors:[]};
const pass=text=>{report.checks.push(text);console.log('PASS '+text);};
const meta='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">';
const nav=`<nav class="navbar"><a href="#" id="native-home">MissionChief</a><ul class="navbar-right"><li class="dropdown"><button id="help" class="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">? ▾</button><ul class="dropdown-menu"><li><a href="/forum">Forum</a></li><li><a href="/faq">FAQ</a></li><li class="divider"></li><li><a href="/support">Contact Support</a></li><li class="divider"></li><li><a href="/toplist">Leaderboard</a></li></ul></li></ul></nav>`;
const home=`<!doctype html><html><head>${meta}<style>body{margin:0;background:#505050;color:white;font:14px Arial}.navbar{height:54px;background:#c83225;display:flex;align-items:center;justify-content:space-between;padding:0 14px}.navbar a{color:white;text-decoration:none}.navbar ul{list-style:none;padding:0;margin:0}.navbar-right{padding-right:11px!important}.dropdown{position:relative}#help{background:none;border:0;color:white;font:22px Arial;min-height:44px;min-width:44px}.dropdown-menu{display:none;position:absolute;right:0;top:100%;width:220px;background:#c83225;z-index:3000}.dropdown.open .dropdown-menu{display:block}.dropdown-menu a{display:block;padding:8px 20px}.divider{height:1px;background:white;margin:8px 0!important}main{padding:20px}</style></head><body>${nav}<main><h1>MissionChief</h1><p>Manual layout fixture</p><div style="height:1500px"></div></main><script>document.addEventListener('click',e=>{const b=e.target.closest('#help');if(b){const opened=b.parentNode.classList.toggle('open');b.setAttribute('aria-expanded',String(opened));}});</script></body></html>`;
const html=s=>s.replace('<head>','<head>'+meta);
const profiles=[['desktop',{width:1440,height:940},false],['tablet',{width:820,height:1180},true],['iphone',{width:390,height:844},true],['orion-desktop',{width:390,height:844},true]];
for(const [name,viewport,touch] of profiles){
 const ctx=await chromium.launchPersistentContext(path.resolve(`audit/responsive45-${name}-${Date.now()}`),{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,viewport,screen:viewport,hasTouch:touch,isMobile:touch,...(name==='iphone'?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'}:{}),args:[`--disable-extensions-except=${base}`,`--load-extension=${base}`],ignoreDefaultArgs:['--disable-extensions']});
 try{
  await ctx.route('https://**/*',route=>{
   const u=new URL(route.request().url());if(u.origin!=='https://www.missionchief.co.uk')return route.abort();
   let body=home,type='text/html';
   if(u.pathname.startsWith('/missions/'))body=html(commandToolbarFixture());
   else if(u.pathname==='/leitstellenansicht')body=`<!doctype html><html><head>${meta}</head><body style="background:#505050"><a class="lightbox-open list-group-item active" href="/buildings/1">Fixture Fire Station</a></body></html>`;
   else if(u.pathname==='/buildings/1')body=html(buildingOverviewFixture());
   else if(u.pathname==='/buildings/1/personals')body=html(buildingPersonnel());
   else if(u.pathname.startsWith('/api/')||u.pathname==='/einsaetze.json'){type='application/json';body=u.pathname==='/api/buildings/1/vehicles'?JSON.stringify(buildingFleet.filter(v=>v.building_id===1)):'[]';}
   if(name==='orion-desktop'&&type==='text/html')body=body.replace('width=device-width,initial-scale=1','width=980');
   return route.fulfill({contentType:type,body});
  });
  const page=await ctx.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.message));
  const cdp=await ctx.newCDPSession(page),worlds=new Map();
  cdp.on('Runtime.executionContextCreated',({context})=>worlds.set(context.id,context));
  cdp.on('Runtime.executionContextDestroyed',({executionContextId})=>worlds.delete(executionContextId));
  cdp.on('Runtime.executionContextsCleared',()=>worlds.clear());await cdp.send('Runtime.enable');
  await page.goto('https://www.missionchief.co.uk/');
  const tools=page.locator('#nexus-native-tools'),panel=tools.locator('#panel');
  await page.locator('#nexus-tools-menu-link').waitFor({state:'attached'});
  const unchanged=await page.evaluate(async()=>{
   let mutations=0;const observer=new MutationObserver(records=>mutations+=records.length);observer.observe(document.documentElement,{attributes:true});
   for(let i=0;i<100;i++)visualViewport.dispatchEvent(new Event('scroll'));
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));observer.disconnect();return mutations;
  });assert.equal(unchanged,0,'Unchanged viewport notifications must not repeatedly mutate the root');
  assert.equal(await tools.locator('#toggle').isVisible(),false);
  assert.equal(await page.locator('.navbar-right').evaluate(n=>getComputedStyle(n).paddingRight),'11px');
  assert.deepEqual(await page.locator('.dropdown-menu>li').evaluateAll(rows=>rows.map(n=>n.textContent.trim()||'divider')),['Forum','FAQ','divider','Nexus Tools','divider','Contact Support','divider','Leaderboard']);
  await page.locator('#help').click();await page.screenshot({path:`audit/responsive-45-${name}-menu.png`});
  await page.locator('#nexus-tools-menu-link').click();await tools.locator('[data-view=settings]').click();
  assert.equal(await tools.locator('#body').evaluate(n=>n.scrollTop),0,'Opening a view starts at its heading');
  await page.waitForFunction(()=>document.documentElement.dataset.nexusLayout);
  assert.equal(await page.locator('html').getAttribute('data-nexus-layout'),['iphone','orion-desktop'].includes(name)?'phone':name);
  const visible=await page.evaluate(()=>({width:visualViewport.width,height:visualViewport.height}));
  const bounds=await panel.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=visible.width+1&&bounds.y+bounds.height<=visible.height+1,`${name} bounds`);
  assert.equal(await tools.locator('#body').evaluate(n=>n.scrollWidth>n.clientWidth),false);
  if(name==='desktop')assert.equal(Math.round(bounds.width),850);
  if(touch){assert.ok((await tools.locator('#close').boundingBox()).height>=44);assert.equal(await tools.locator('input[type=number]').first().evaluate(n=>getComputedStyle(n).fontSize),'16px');}
  await tools.locator('#body').evaluate(n=>n.scrollTop=n.scrollHeight);
  await tools.locator('#saveSettings').click();await tools.locator('#settingsStatus').filter({hasText:'Saved.'}).waitFor();
  await page.screenshot({path:`audit/responsive-45-${name}-settings.png`});
  await tools.locator('#close').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'help');
  assert.equal(await page.locator('html').getAttribute('data-nexus-tools-open'),null);
  pass(`${name}: menu placement, native spacing, panel bounds, settings scrolling/save and focus restoration`);
  // Native menu can be rebuilt later without an observer or duplicate entries.
  await page.locator('.dropdown').evaluate((node,markup)=>{node.outerHTML=markup;},nav.match(/<li class="dropdown">[\s\S]*<\/li><\/ul><\/nav>/)[0].replace('</ul></nav>',''));
  await page.locator('#help').click();assert.equal(await page.locator('#nexus-tools-menu-item').count(),1);
  await page.locator('#nexus-tools-menu-link').click();await tools.locator('#close').press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'help');
  pass(`${name}: rebuilt native menu opens once, Escape closes and returns to Help`);
  if(name==='orion-desktop'){
   const metrics=await page.evaluate(()=>({scale:Number(document.documentElement.style.getPropertyValue('--nx-ui-scale')),zoom:visualViewport.scale,width:document.documentElement.clientWidth,meta:document.querySelector('meta[name=viewport]').content}));
   assert.ok(metrics.width>=980&&metrics.scale>2);assert.ok(Math.abs(metrics.scale*metrics.zoom-1)<0.03,'Desktop-site shrink is compensated for Nexus UI');assert.equal(metrics.meta,'width=980,viewport-fit=cover');
   await page.locator('#help').click();await page.locator('#nexus-tools-menu-link').click();await tools.locator('[data-view=settings]').click();
   assert.ok((await tools.locator('#close').boundingBox()).height*metrics.zoom>=43);
   await page.screenshot({path:'audit/responsive-45-orion-desktop-readable.png'});
   pass('Desktop site on a phone: Nexus text/touch targets keep physical size without changing the game viewport or zoom');
   await page.setViewportSize({width:844,height:390});
   await page.waitForFunction(()=>Number(document.documentElement.style.getPropertyValue('--nx-ui-scale'))<1.3);
   const rotated=await panel.boundingBox(),v=await page.evaluate(()=>({width:visualViewport.width,height:visualViewport.height}));assert.ok(rotated.x+rotated.width<=v.width+1&&rotated.y+rotated.height<=v.height+1);
   await page.screenshot({path:'audit/responsive-45-orion-desktop-landscape.png'});
   pass('Phone desktop-site layout remains fitted and readable after landscape rotation');
  }
  if(name==='iphone'){
   await page.locator('#help').click();await page.locator('#nexus-tools-menu-link').click();await tools.locator('[data-view=settings]').click();
   await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>parseFloat(document.documentElement.style.getPropertyValue('--nx-viewport-width'))>800);
   assert.equal(await page.locator('html').getAttribute('data-nexus-layout'),'phone');
   const landscape=await panel.boundingBox();assert.ok(landscape.y+landscape.height<=390);
   await tools.locator('#body').evaluate(n=>n.scrollTop=n.scrollHeight);await tools.locator('#saveSettings').click();
   await page.screenshot({path:'audit/responsive-45-iphone-landscape.png'});
   pass('iPhone landscape retains phone layout; all five tabs and Save remain reachable');
   await page.setViewportSize(viewport);
   // Controlled visualViewport event reproduces keyboard occlusion and browser
   // panning without pretending Chromium emulation is a physical iPhone.
   const keyboard=async()=>{
    // Extension JS has its own wrappers: model keyboard metrics in its actual
    // isolated world, rather than changing an unrelated page-world wrapper.
    let isolated;
    for(const id of worlds.keys()){
     const {result}=await cdp.send('Runtime.evaluate',{contextId:id,expression:'typeof chrome!=="undefined" && !!chrome.runtime?.id && !!globalThis.NexusNativeCore'});
     if(result.value){isolated=id;break;}
    }
    assert.ok(isolated,'Packaged extension isolated world found');
    await cdp.send('Runtime.evaluate',{contextId:isolated,expression:`for(const [key,value] of Object.entries({width:390,height:330,offsetTop:70,offsetLeft:0}))Object.defineProperty(visualViewport,key,{configurable:true,get:()=>value});visualViewport.dispatchEvent(new Event('resize'));visualViewport.dispatchEvent(new Event('scroll'));`});
   };
   await keyboard(page);await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--nx-viewport-height')==='330px');
   await tools.locator('summary').filter({hasText:'Vehicle groups in this register'}).click();
   await tools.locator('#groupEditor').fill('Firetruck: 0 1 16');
   const kb=await panel.boundingBox();assert.ok(kb.y>=70&&kb.y+kb.height<=400&&kb.width<=390);
   await tools.locator('#body').evaluate(n=>n.scrollTop=n.scrollHeight);await tools.locator('#saveSettings').click();
   await page.screenshot({path:'audit/responsive-45-iphone-keyboard.png'});
   pass('Keyboard-sized visible viewport: panel follows pan offset, text input and Save are reachable');
   await tools.locator('#close').click();
   // A long, merged personnel/building view must scroll instead of stretching.
   await page.goto('https://www.missionchief.co.uk/buildings/1');await page.locator('#nx-specialist-table').waitFor();
   assert.ok((await page.locator('#nx-building-overview').boundingBox()).width<=390);
   assert.equal(await page.locator('#nx-extension-grid').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),2);
   await page.screenshot({path:'audit/responsive-45-iphone-building.png',fullPage:true});pass('Phone building and extension cards stack within the available width');
   await page.goto('https://www.missionchief.co.uk/leitstellenansicht');await page.locator('#mc-namer-panel').waitFor();await keyboard(page);
   await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--nx-viewport-height')==='330px');
   const naming=await page.locator('#mc-namer-panel').boundingBox();assert.ok(naming.x>=0&&naming.width<=374&&naming.y>=70&&naming.y+naming.height<=400);
   await page.locator('#mc-namer-body').evaluate(n=>n.scrollTop=n.scrollHeight);await page.screenshot({path:'audit/responsive-45-iphone-naming.png'});
   pass('Naming panel stays inside the keyboard-sized viewport with its own scrollable body');
   await page.goto('https://www.missionchief.co.uk/missions/10');await page.locator('#nx-command-tools').waitFor();
   await page.locator('#nx-command-tools [data-nx-action=stay]').click();await keyboard(page);
   await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--nx-viewport-height')==='330px');
   const command=await page.locator('#nx-command-popover').boundingBox();assert.ok(command.x>=0&&command.width<=374&&command.y>=70&&command.y+command.height<=400);
   await page.locator('#nx-command-popover button').filter({hasText:'Cancel'}).click();
   assert.deepEqual(await page.evaluate(()=>dispatches),[]);
   pass('Mission share dialog fits the visible phone screen and Cancel sends no dispatch');
  }
  // Nothing in the viewport layer is installed in active or nested workers.
  await page.goto('https://www.missionchief.co.uk/');
  const attached=page.waitForEvent('frameattached');
  await page.evaluate(()=>{const f=document.createElement('iframe');f.name='mcn-v3-active-worker-responsive-test';f.src='/missions/88';document.body.append(f);});
  const worker=await attached;
  await worker.waitForURL('**/missions/88');await worker.waitForLoadState('load');
  assert.equal(await worker.locator('#nexus-responsive-style').count(),0);
  assert.equal(await worker.locator('html').getAttribute('data-nexus-layout'),null);
  const nestedAttached=page.waitForEvent('frameattached');
  await worker.evaluate(()=>{const f=document.createElement('iframe');f.src='/missions/89';document.body.append(f);});
  const nested=await nestedAttached;await nested.waitForURL('**/missions/89');await nested.waitForLoadState('load');assert.equal(await nested.locator('#nexus-responsive-style').count(),0);
  pass(`${name}: responsive helpers excluded from Auto workers and their child frames`);
 }finally{await ctx.close();}
}
assert.deepEqual(report.errors,[]);report.passed=true;fs.writeFileSync('audit/responsive-45-results.json',JSON.stringify(report,null,2)+'\n');
