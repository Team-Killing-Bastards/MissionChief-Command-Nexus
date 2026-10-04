import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
assert.equal(manifest.version,'3.0.43.189');
assert.ok(manifest.content_scripts.some(row=>row.world==='ISOLATED'&&row.js.includes('nexus-staging-profiles-editor.js')));
assert.ok(manifest.content_scripts.some(row=>row.world==='MAIN'&&row.js.includes('nexus-staging-map.js')));
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
  const context=await browser.newContext(),page=await context.newPage();
  page.on('console',msg=>console.log(msg.text())); page.on('pageerror',err=>console.log(err.message));
  const activity={builds:0,duration:0,dispatch:0,body:''};let buildings=[],durationDays=1,scenario='map';
  await context.route('https://www.missionchief.co.uk/**',async route=>{
    const request=route.request(),url=new URL(request.url()),p=url.pathname;
    const html=body=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body});
    if(p==='/')return html('<html><head></head><body><a id="navbar_profile_link" href="/profile/419938">Profile</a><button id="nx-realism-launcher">Map</button></body></html>');
    if(p==='/api/buildings')return route.fulfill({status:200,contentType:'application/json',body:'[]'});
    if(p==='/building/buildings_json')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({buildings})});
    if(p==='/buildings/new')return html(`<form id="new_building" action="/buildings" method="post"><input name="authenticity_token" value="test"><select id="building_building_type" name="building[building_type]"><option value="0">Fire</option><option value="14">Staging area</option></select><input id="building_name" name="building[name]" required><input id="building_latitude" name="building[latitude]"><input id="building_longitude" name="building[longitude]"><input name="native_setup" value="not-ready"><input name="payment" value=""><input type="hidden" id="build_with_coins" name="build_with_coins" value="1"><input type="hidden" id="build_as_alliance" name="build_as_alliance" value="1"><input type="submit" id="build_credits_7" name="commit" value="Build 0 Credits"><button type="submit" id="build_credits_14" name="commit" value="Build 0 Credits" disabled>Build with Credits</button><button type="submit">Build with Coins</button></form><script>
      document.querySelector('#building_building_type').addEventListener('change',function(){if(this.value==='14'){document.querySelector('[name="native_setup"]').value='staging-ready';document.querySelector('#build_credits_14').disabled=${scenario==='coins'?'true':'false'};}});
      document.querySelector('#build_credits_14').addEventListener('click',function(){document.querySelector('[name="payment"]').value='credits';});
      document.querySelector('form').addEventListener('submit',function(){const proof=document.createElement('input');proof.name='native_submit';proof.value='yes';this.append(proof);});
      </script>`);
    if(p==='/buildings'&&request.method()==='POST'){
      activity.builds++;activity.body=request.postData()||'';
      const data=new URLSearchParams(activity.body);
      assert.equal(data.get('native_setup'),'staging-ready','game type-change script must run');
      assert.equal(data.get('payment'),'credits','native credit button click handler must run');
      assert.equal(data.get('native_submit'),'yes','native submit handler must run');
      assert.equal(data.get('building[building_type]'),'14');
      assert.equal(data.get('building[name]'),'Test staging · Staging');
      assert.equal(data.get('commit'),'Build 0 Credits');
      assert.equal(data.get('build_with_coins'),'');
      assert.equal(data.get('build_as_alliance'),'');
      assert.equal(data.get('building[latitude]'),'55.9');
      assert.equal(data.get('building[longitude]'),'-4.3');
      if(scenario==='rejected')return html('<div class="alert-danger">Staging area limit reached</div>');
      if(scenario==='direct')return html('<h1 building_type="14">Test staging · Staging</h1><form action="/buildings/alarm/123"></form>');
      buildings=[{id:123,building_type:14,caption:'Test staging · Staging',latitude:55.9,longitude:-4.3}];
      return html('<div class="alert-danger">Something went wrong! Please try again and press the reload button.</div>');
    }
    if(p==='/buildings/123/bereitstellung-verlaengern'){
      activity.duration++;durationDays=Number(url.searchParams.get('days'))||1;return html('Duration updated');
    }
    if(p==='/buildings/123'){
      const timer=Date.now()+durationDays*86400000;
      return html(`<a href="/buildings/123/bereitstellung-verlaengern?days=3">3 days</a><script>registerEducationTimer("education_schooling_-1", "education_schooling_-1", ${timer});</script><form action="/buildings/alarm/123" method="post"><input type="hidden" name="authenticity_token" value="test"><input class="vehicle_checkbox" type="checkbox" name="vehicle_ids[]" value="10" vehicle_type_id="0" fms="2" at_staging_area="false"></form>`);
    }
    if(p==='/buildings/alarm/123'&&request.method()==='POST'){
      activity.dispatch++;assert.match(request.postData()||'',/vehicle_ids/);assert.match(request.postData()||'',/\b10\b/);return html('<div class="alert-success">Dispatched</div>');
    }
    return route.fulfill({status:404,body:'Missing fixture '+p});
  });
  await page.goto('https://www.missionchief.co.uk/');
  await page.evaluate(()=>{
    window.NexusStationProfilesStore={read:async()=>[{id:'p1',name:'Test staging',days:3,units:[{type:'0',count:1}]}]};
    window.NexusStationProfilesData={vehicles:{'0':{name:'Water Ladder'}}};
    window.map={on:(name,handler)=>window._mapClick=handler,off:()=>{},removeLayer:()=>{}};
    window.L={marker:()=>({addTo(){return this;}})};
  });
  await page.addScriptTag({path:path.join(root,'nexus-staging-map.js')});
  await page.locator('#nx-staging-launcher').click();
  await page.locator('#nx-staging-panel select').selectOption('p1');
  await page.getByRole('button',{name:'Choose point on map'}).click();
  await page.evaluate(()=>window._mapClick({latlng:{lat:55.9,lng:-4.3}}));
  await page.getByRole('button',{name:'Build and send'}).click();
  await page.waitForFunction(()=>/Dispatch request sent|^Stopped:/.test(document.querySelector('#nx-staging-panel p')?.textContent||''),null,{timeout:40000}); console.log(await page.locator('#nx-staging-panel p').innerText());
  assert.equal(activity.builds,1,'generic error after build must not cause a retry');
  assert.equal(activity.duration,1);
  assert.equal(activity.dispatch,1);
  assert.equal(await page.locator('#nx-staging-build-frame').count(),0,'builder frame must be released after completion');
  async function rerun(mode){
    scenario=mode;buildings=[];
    await page.getByRole('button',{name:'Choose point on map'}).click();
    await page.evaluate(()=>window._mapClick({latlng:{lat:55.9,lng:-4.3}}));
    await page.getByRole('button',{name:'Build and send'}).click();
  }
  await rerun('direct');
  await page.waitForFunction(()=>/Dispatch request sent|^Stopped:/.test(document.querySelector('#nx-staging-panel p')?.textContent||''),null,{timeout:40000});
  assert.match(await page.locator('#nx-staging-panel p').innerText(),/Dispatch request sent/);
  assert.equal(activity.builds,2,'the live staging page must verify creation even while both feeds are stale');
  assert.equal(activity.dispatch,2);
  await rerun('coins');
  await page.waitForFunction(()=>document.querySelector('#nx-staging-panel p')?.textContent.startsWith('Stopped:'),null,{timeout:10000});
  assert.match(await page.locator('#nx-staging-panel p').innerText(),/credits\/free build button/);
  assert.equal(activity.builds,2,'coins-only build must never submit');
  await rerun('rejected');
  await page.waitForFunction(()=>document.querySelector('#nx-staging-panel p')?.textContent.startsWith('Stopped:'),null,{timeout:40000});
  assert.match(await page.locator('#nx-staging-panel p').innerText(),/Staging area limit reached/);
  assert.equal(activity.builds,3,'rejected native build is submitted only once');
  assert.equal(activity.dispatch,2,'no units may be sent for a rejected build');
  assert.equal(activity.duration,2,'duration may not be changed for a rejected build');
  assert.equal(await page.locator('#nx-staging-build-frame').count(),0);
  const editor=await context.newPage();
  // Model the live standalone form: no game scripts and all type buttons visible.
  await context.route('https://www.missionchief.co.uk/buildings/new',route=>route.fulfill({contentType:'text/html',body:'<form id="new_building" action="/buildings" method="post"><select id="building_building_type" name="building[building_type]"><option value="14">Staging Area</option></select><input id="building_name" name="building[name]" required><input id="building_latitude" name="building[latitude]"><input id="building_longitude" name="building[longitude]"><input name="native_setup" value="staging-ready"><input name="payment" value="credits"><input name="native_submit" value="yes"><input id="build_with_coins" name="build_with_coins" value="1"><input id="build_as_alliance" name="build_as_alliance" value="1"><input type="submit" id="build_credits_7" name="commit" value="Wrong type"><input type="submit" id="build_credits_14" name="commit" value="Build 0 Credits"><input type="submit" value="Build 0 Coins"></form><script>throw Error("$ is not defined")</script>'}));
  await rerun('standalone');
  await page.waitForFunction(()=>/Dispatch request sent|^Stopped:/.test(document.querySelector('#nx-staging-panel p')?.textContent||''),null,{timeout:40000}); console.log(await page.locator('#nx-staging-panel p').innerText());
  assert.equal(activity.builds,4);assert.equal(activity.dispatch,3,'standalone form must work without game scripts');
  await editor.goto('https://www.missionchief.co.uk/');
  await editor.evaluate(()=>{
    window.NexusStationProfilesCore={};
    window.NexusStationProfilesData={vehicles:{'0':{name:'Water Ladder'}}};
  });
  await editor.addScriptTag({path:path.join(root,'nexus-station-profiles-store.js')});
  await editor.addScriptTag({path:path.join(root,'nexus-staging-profiles-editor.js')});
  await editor.evaluate(()=>{const root=document.createElement('div');document.body.append(root);window.NexusStagingProfiles.mountEditor(root);});
  await editor.locator('#nx-staging-profile-editor input[placeholder="Profile name"]').fill('Roadside staging');
  await editor.locator('#nx-staging-profile-editor select[aria-label="Saved staging profile"]').waitFor();
  await editor.locator('#nx-staging-profile-editor select').nth(1).selectOption('7');
  await editor.locator('#nx-staging-profile-editor input[type="checkbox"]').check();
  await editor.locator('#nx-staging-profile-editor input[type="number"]').fill('2');
  await editor.getByRole('button',{name:'Save staging profile'}).click();
  await editor.getByText(/Saved Roadside staging/).waitFor();
  const saved=await editor.evaluate(()=>window.NexusStationProfilesStore.read('nexusStagingProfilesV1:419938'));
  assert.deepEqual({days:saved[0]?.days,units:saved[0]?.units},{days:7,units:[{type:'0',count:2}]});
  await editor.close();
  await page.evaluate(()=>{const iframe=document.createElement('iframe');iframe.srcdoc='<html><head></head><body><button id="nx-realism-launcher">Map</button></body></html>';document.body.append(iframe);});
  const frame=page.frames().find(candidate=>candidate!==page.mainFrame());
  await frame.addScriptTag({path:path.join(root,'nexus-staging-map.js')});
  await frame.locator('#nx-staging-launcher').waitFor();
  await frame.locator('#nx-staging-launcher').click();
  await frame.locator('#nx-staging-panel select').selectOption(saved[0].id);
  assert.match(await frame.locator('#nx-staging-panel select').locator('option:checked').innerText(),/Roadside staging/,'map frame must read the profile saved in IndexedDB by the editor');
  const empty=await context.newPage();await empty.goto('https://www.missionchief.co.uk/');
  await empty.evaluate(()=>{window.NexusStationProfilesStore={read:async()=>[]};});
  await empty.addScriptTag({path:path.join(root,'nexus-staging-map.js')});
  await empty.locator('#nx-staging-launcher').click();
  await empty.getByText(/No staging profiles saved/).waitFor();
  assert.equal(await empty.getByRole('button',{name:'Choose point on map'}).isDisabled(),true);
  await empty.close();
  const building=await context.newPage();await building.goto('https://www.missionchief.co.uk/buildings/123');
  await building.evaluate(()=>{window.NexusStationProfilesCore={};window.NexusStationProfilesStore={read:async()=>[]};document.body.insertAdjacentHTML('afterbegin','<button id="nx-realism-launcher">Map</button>');});
  await building.addScriptTag({path:path.join(root,'nexus-staging-map.js')});
  await building.locator('#nx-staging-launcher').waitFor();
  await building.close();
  console.log('PASS: staging map frame reads the top-level player profiles; editor saves profiles; map placement verifies build, duration and one unit send.');
}finally{await browser.close();}
