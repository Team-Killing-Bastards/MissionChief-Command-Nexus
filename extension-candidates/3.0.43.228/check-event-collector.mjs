import assert from 'node:assert/strict';
import fs from 'node:fs';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const source=fs.readFileSync(new URL('./extension/nexus-event-collector.js',import.meta.url),'utf8');
const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
let checks=0;
const eq=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
async function fixture({enabled=true,hidden=false}={}) {
  const context=await browser.newContext();
  const hits=[],holds=[],modes=new Map(),markup=new Map();
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/claim_found_object_sync')) {
      hits.push(url.pathname);
      const id=url.pathname.split('/')[2],mode=modes.get(id);
      if(mode==='hold')await new Promise(resolve=>holds.push(resolve));
      try {
        await route.fulfill(mode==='redirect'?{status:302,headers:{location:'/users/sign_in'}}:
          {status:mode==='error'?500:200,contentType:'application/json',body:'{}'});
      } catch {}
      return;
    }
    if(url.pathname==='/users/sign_in'){hits.push('login');return route.fulfill({status:200,body:'login'});}
    const id=url.pathname.match(/^\/missions\/(\d+)/)?.[1];
    const body=id ? (markup.get(id)??`<a id="easter-egg-link" href="/missions/${id}/claim_found_object_sync">🎃</a>`) : '<h1>Map</h1>';
    await route.fulfill({contentType:'text/html',body:body+'<button id="dispatch" onclick="window.top.dispatchClicks=(window.top.dispatchClicks||0)+1">Dispatch fixture</button>'});
  });
  await context.addInitScript(({enabled,hidden})=>{
    if(window===window.top)localStorage.setItem('mf_event_scanner_enabled_v1',String(enabled));
    window.intervalCalls=0;
    const original=window.setInterval;window.setInterval=(...args)=>{window.intervalCalls++;return original(...args);};
    if(hidden)Object.defineProperty(document,'visibilityState',{get:()=> 'hidden'});
  },{enabled,hidden});
  await context.addInitScript({content:source});
  const page=await context.newPage();await page.goto('https://www.missionchief.co.uk/');
  const state=()=>page.evaluate(()=>NexusEventCollector.snapshot());
  const wait=predicate=>page.waitForFunction(predicate,null,{timeout:8000});
  const frame=async(id,name='f'+id)=>{
    const navigation=page.waitForEvent('framenavigated',{predicate:f=>f.name()===name,timeout:5000});
    await page.evaluate(({id,name})=>{const f=document.createElement('iframe');f.name=name;f.style.display='none';f.src='/missions/'+id;document.body.append(f);},{id,name});
    const f=await navigation;await f.waitForLoadState('domcontentloaded');return f;
  };
  const settings=async value=>page.evaluate(value=>{localStorage.setItem('mf_event_scanner_enabled_v1',String(value));window.dispatchEvent(new Event('nexus:settings-saved'));},value);
  return {context,page,hits,holds,modes,markup,state,wait,frame,settings,close:async()=>{for(const release of holds)release();await context.close();}};
}
try {
  let f=await fixture({hidden:true});
  eq(await f.page.evaluate(()=>window.__MCN_HEAVY_RUNTIME_LOADED__===true),false,'Collector independent of heavy runtime');
  eq((await f.state()).requests,0,'Map with no event sends nothing');
  f.modes.set('101','hold');const worker=await f.frame('101');
  await f.wait(()=>NexusEventCollector.snapshot().requests===1);
  eq(await worker.evaluate(()=>document.visibilityState),'hidden','Worker/test tab is hidden');
  await worker.evaluate(()=>document.getElementById('dispatch').click());
  eq(await f.page.evaluate(()=>window.dispatchClicks),1,'Dispatch can progress while claim is pending');
  eq((await f.state()).acceptedResponses,0,'No premature success');
  await f.frame('101','duplicate');
  eq((await f.state()).requests,1,'Same mission in two frames has one request');
  await f.page.evaluate(()=>document.querySelector('iframe[name="f101"]').remove());
  f.holds.shift()();await f.wait(()=>NexusEventCollector.snapshot().acceptedResponses===1);
  eq((await f.state()).inFlight,false,'Claim outlives a removed worker without holding dispatch');
  eq(await f.page.frames().find(x=>x.name()==='duplicate').locator('#easter-egg-link').count(),0,'Acknowledged item removed in the surviving document');
  await f.frame('101','reloaded');eq((await f.state()).requests,1,'Reload does not duplicate an acknowledged claim');
  eq(await f.page.evaluate(()=>window.intervalCalls),0,'No recurring scan');
  await f.close();

  f=await fixture({enabled:false});await f.frame('102');
  eq((await f.state()).enabled,false);eq((await f.state()).requests,0,'Setting off prevents claims');
  await f.settings(true);await f.wait(()=>NexusEventCollector.snapshot().acceptedResponses===1);
  eq(f.hits.length,1,'Turning on collects an already open mission');
  await f.settings(false);await f.frame('103');eq((await f.state()).requests,1,'Turning off prevents new work');await f.close();

  f=await fixture();f.modes.set('104','error');const failed=await f.frame('104');
  await f.wait(()=>NexusEventCollector.snapshot().failures===1);
  eq((await f.state()).acceptedResponses,0,'HTTP error not counted as success');
  eq(await failed.locator('#easter-egg-link').count(),1,'Failed item stays visible');
  await f.frame('104','retry-view');eq((await f.state()).requests,1,'Uncertain request not automatically repeated');
  f.modes.set('105','redirect');await f.frame('105');await f.wait(()=>NexusEventCollector.snapshot().failures===2);
  eq(f.hits.includes('login'),false,'Authentication redirects are not followed or counted');await f.close();

  f=await fixture();f.modes.set('106','hold');await f.frame('106');await f.wait(()=>NexusEventCollector.snapshot().inFlight);
  await f.frame('107');eq((await f.state()).pending,1,'Claims are serial');eq((await f.state()).requests,1);
  await f.settings(false);await f.wait(()=>!NexusEventCollector.snapshot().inFlight);
  eq((await f.state()).pending,0,'Disable clears waiting work');eq((await f.state()).requests,1,'Queued claim never starts after disable');await f.close();

  f=await fixture();f.modes.set('108','hold');await f.frame('108');await f.wait(()=>NexusEventCollector.snapshot().inFlight);
  await f.frame('109');await f.wait(()=>NexusEventCollector.snapshot().timeouts===1&&NexusEventCollector.snapshot().acceptedResponses===1);
  eq((await f.state()).requests,2,'Timeout releases the next claim');eq((await f.state()).pending,0);await f.close();

  f=await fixture();
  const invalid=[
    '<a id="easter-egg-link" href="https://other.example/missions/110/claim_found_object_sync">Item</a>',
    '<a id="easter-egg-link" href="/missions/999/claim_found_object_sync">Wrong mission</a>',
    '<a id="easter-egg-link" href="/buildings/123">Wrong endpoint</a>',
    '<a id="unrelated" href="/missions/113/claim_found_object_sync_extra">Not the claim endpoint</a>'
  ];
  for(let i=0;i<invalid.length;i++){f.markup.set(String(110+i),invalid[i]);await f.frame(String(110+i));}
  eq((await f.state()).requests,0,'Only the native collection control for this mission is accepted');
  eq(await f.page.evaluate(()=>NexusEventCollector.offer('https://other.example/missions/1/claim_found_object_sync')),false,'Coordinator rejects cross-origin input');
  eq(await f.page.evaluate(()=>NexusEventCollector.offer('/missions/1/delete')),false,'Coordinator rejects unrelated actions');
  eq(await f.page.evaluate(()=>NexusEventCollector.offer({href:'/missions/1/claim_found_object_sync'})),false,'Queue accepts scalars only');await f.close();

  f=await fixture();f.markup.set('114','<a id="pumpkin-link" href="/missions/114/claim_found_object_sync"><img alt="Pumpkin"></a>');const seasonal=await f.frame('114');
  await f.wait(()=>NexusEventCollector.snapshot().acceptedResponses===1);
  eq(await seasonal.locator('#pumpkin-link').count(),0,'Native claim endpoint also works if seasonal icon ID changes');await f.close();

  f=await fixture();f.modes.set('120','hold');await f.frame('120');await f.wait(()=>NexusEventCollector.snapshot().inFlight);
  await f.page.evaluate(()=>{for(let id=200;id<240;id++)NexusEventCollector.offer('/missions/'+id+'/claim_found_object_sync');});
  eq((await f.state()).pending,24,'Waiting queue is bounded');eq((await f.state()).overflow,16);eq((await f.state()).requests,1,'Only one request in flight');
  await f.settings(false);await f.close();

  f=await fixture();f.markup.set('130','<p>No event item</p>');await f.frame('130');
  eq((await f.state()).requests,0,'Ordinary mission creates no requests');
  const native=await f.page.goto('https://www.missionchief.co.uk/missions/131');assert(native.ok());
  await f.wait(()=>NexusEventCollector.snapshot().acceptedResponses===1);
  eq(await f.page.locator('#easter-egg-link').count(),0,'Standalone/manual mission still collects');await f.close();

  f=await fixture();f.markup.set('140','<p>Item arrives just after DOM ready</p>');const late=await f.frame('140');
  await late.evaluate(()=>document.body.insertAdjacentHTML('beforeend','<a id="easter-egg-link" href="/missions/140/claim_found_object_sync">Pumpkin</a>'));
  await f.wait(()=>NexusEventCollector.snapshot().acceptedResponses===1);
  eq((await f.state()).requests,1,'One delayed check handles late native content');
  await f.page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  eq((await f.state()).suspended,true,'Page hide suspends coordinator');
  await f.page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  eq((await f.state()).suspended,false,'Back/forward restore resumes coordinator');
  eq((await f.state()).requests,1,'Restoring the page does not repeat an accepted claim');await f.close();

  f=await fixture();
  for(let batch=0;batch<11;batch++) {
    await f.page.evaluate(batch=>{for(let n=0;n<24;n++)NexusEventCollector.offer('/missions/'+(1000+batch*24+n)+'/claim_found_object_sync');},batch);
    await f.wait(()=>!NexusEventCollector.snapshot().inFlight&&NexusEventCollector.snapshot().pending===0);
  }
  eq((await f.state()).acceptedResponses,264,'Long run completes queued claims');
  eq((await f.state()).recentCount,250,'Recent history stays bounded');
  eq((await f.state()).overflow,0,'Serial draining does not overflow');await f.close();

  eq(/setInterval\s*\(|new MutationObserver/.test(source),false,'No polling or vehicle-table observer');
  eq(/visibilityState|document\.hidden/.test(source),false,'No foreground-only gate');
  const result={checks,allNetworkIntercepted:true,liveGameVerified:false};
  fs.writeFileSync(new URL('./event-collector-validation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
} finally {await browser.close();}
