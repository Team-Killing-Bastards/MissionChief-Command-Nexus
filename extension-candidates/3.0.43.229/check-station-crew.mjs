import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const root=new URL('./extension/',import.meta.url),results=[];
let checks=0;
const ok=(value,message)=>{assert(value,message);checks++;};
const eq=(value,expected,message)=>{assert.deepEqual(value,expected,message);checks++;};
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const cases=[
  'normal','one-already-bound','no-trained-staff','bound-elsewhere','status-six','limited-capacity',
  'partial-trained-staff','wrong-station','count-changed','missing-token','paginated',
  'stop-after-one','accepted-http-error','accepted-redirect','accepted-timeout','accepted-body-timeout','two-vehicles',
  'unconfirmed-post','verification-timeout','next-read-timeout','register-timeout',
  'register-rejected','register-conflict','ready-timeout','profile-accepted-error','profile-unconfirmed'
];
try{
 for(const mode of cases){
  const context=await browser.newContext({viewport:{width:1050,height:700}}),page=await context.newPage();
  let posts=0,assignmentReads=0,vehicleReads=0,requestError='',postTime=0;
  const people=Array.from({length:11},(_,i)=>({id:i+1,bound:mode==='one-already-bound'&&i===0?10:0,
    training:mode==='no-trained-staff'||(mode==='partial-trained-staff'&&i>1)?'None':'HazMat Unit',elsewhere:mode==='bound-elsewhere'}));
  const vehicle=(id=10)=>({id,vehicle_type:39,building_id:mode==='wrong-station'?2:1,caption:'Fixture OSU',
    fms_real:mode==='status-six'?6:2,max_personnel_override:mode==='limited-capacity'?2:mode==='two-vehicles'?1:6,
    assigned_personnel_count:people.filter(p=>p.bound===id).length+(mode==='count-changed'?1:0)});
  const table=(assignment,id=10)=>`${mode==='missing-token'?'':'<meta name="csrf-token" content="fixture">'}<table id="personal_table"><thead><tr><th>Name</th><th>Education</th><th>Status</th><th>Assigned to</th></tr></thead><tbody>${people.map(p=>`<tr personal_id="${p.id}"><td>Fixture ${p.id}</td><td>${p.training}</td><td>Available</td><td>${p.elsewhere||(p.bound&&p.bound!==id)?`<a class="btn-warning" href="/vehicles/${p.bound||20}">Other vehicle</a>`:assignment?`<a class="${p.bound?'btn-assigned':'btn-success'}" href="/vehicles/${id}/zuweisungDo/${p.id}">${p.bound?'Remove binding':'Assign vehicle'}</a>`:p.bound?`<a href="/vehicles/${p.bound}">Fixture OSU</a>`:''}</td></tr>`).join('')}</tbody></table>${mode==='paginated'?'<div class="pagination"><a href="?page=2">2</a></div>':''}`;
  await page.route('**/*',async route=>{
   const path=new URL(route.request().url()).pathname;let body,type='text/html';
   try{
    if(path==='/')body='<a id="navbar_profile_link" href="/profile/7">Fixture player</a><iframe style="width:100%;height:620px;border:0" src="/buildings/1"></iframe>';
    else if(path==='/buildings/1')body='<h1>Fixture station</h1><section style="padding:20px;background:#12283d;color:#def;font:14px Arial"><h3>Nexus · Specialist crew coverage</h3><div id="actions"></div></section>';
    else if(path==='/api/buildings/1/vehicles'){type='application/json';body=JSON.stringify([{...vehicle(),building_id:1},...(mode==='two-vehicles'?[vehicle(20)]:[])]);}
    else if(/^\/api\/vehicles\/(10|20)$/.test(path)){vehicleReads++;type='application/json';body=JSON.stringify(vehicle(Number(path.split('/').pop())));}
    else if(path==='/buildings/1/personals')body=table(false);
    else if(/^\/vehicles\/(10|20)\/zuweisung$/.test(path)){assignmentReads++;body=table(true,Number(path.split('/')[2]));}
    else if(/^\/vehicles\/(10|20)\/zuweisungDo\/\d+$/.test(path)){
     eq(route.request().method(),'POST');const person=people.find(p=>p.id===Number(path.split('/').pop()));
     ok(!person.bound,'binding is a toggle and must never be repeated');ok(!person.elsewhere&&person.training==='HazMat Unit','only eligible trained people');
     posts++;postTime=Date.now();
     if(!['unconfirmed-post','profile-unconfirmed'].includes(mode))person.bound=Number(path.split('/')[2]);
     if(mode==='accepted-http-error'||mode==='profile-accepted-error'){await route.fulfill({status:500,body:'Fixture interrupted response'});return;}
     if(mode==='accepted-redirect'){await route.fulfill({status:302,headers:{location:'/vehicles/10/zuweisung'},body:''});return;}
     body='OK';
    }else throw Error('Unexpected fixture request '+path);
    await route.fulfill({body,contentType:type});
   }catch(error){requestError=error.message;await route.abort().catch(()=>{});}
  });
  await page.goto('https://www.missionchief.co.uk/');const child=page.frames().find(f=>f!==page.mainFrame());await child.waitForLoadState();
  for(const name of ['nexus-register-storage.js','nexus-personnel-store.js'])await page.addScriptTag({content:fs.readFileSync(new URL(name,root),'utf8')});
  await page.evaluate(async()=>{
   await NexusPersonnelStore.ready();
   await NexusPersonnelStore.write({schemaVersion:1,vehicles:{'99':{vehicleId:'99',assignedPersonnelCount:3,updatedAt:Date.now(),marker:'untouched'}}});
  });
  await page.evaluate(mode=>{
   window.fixtureWrites=[];window.fixtureStorageEvents=[];
   addEventListener('storage',e=>{if(e.key==='mcPersonnelVehicleTrainingRegistry_v1'&&e.newValue)fixtureStorageEvents.push(JSON.parse(e.newValue));});
   const original=NexusPersonnelStore;
   window.NexusPersonnelStore={...original,ready:mode==='ready-timeout'?()=>new Promise(()=>{}):original.ready,write:async reg=>{
    fixtureWrites.push(reg);
    if(mode==='register-timeout')return new Promise(resolve=>{window.completeLateWrite=async()=>{await original.write(reg);resolve();};});
    if(mode==='register-rejected')throw Error('Fixture failed save');
    if(mode==='register-conflict')return original.write({schemaVersion:1,vehicles:{'10':{vehicleId:'10',assignedPersonnelCount:1,updatedAt:Date.now()+60000,marker:'newer'}}});
    return original.write(reg);
   }};
  },mode);
  // Real production deadlines are 15s. Accelerate only those deadlines in the
  // isolated browser; stalled wrappers deliberately ignore AbortSignal.
  await child.evaluate(mode=>{
   const nativeTimeout=window.setTimeout;window.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,ms===15000?200:ms,...args);
   const original=window.fetch;let posted=false,reads=0;
   window.fixtureProgress=[];
   new MutationObserver(()=>fixtureProgress.push(document.querySelector('#nx-assign-crew-status')?.textContent||''))
     .observe(document.querySelector('section'),{subtree:true,childList:true,characterData:true});
   window.fetch=async(url,options)=>{
    const path=new URL(url,location.origin).pathname;
    if(mode==='verification-timeout'&&posted&&path.endsWith('/zuweisung'))return new Promise(()=>{});
    if(path==='/api/vehicles/10'&&++reads>1&&mode==='next-read-timeout')return new Promise(()=>{});
    const response=await original(url,options);
    if(options?.method==='POST'){
     posted=true;
     if(mode==='stop-after-one')Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Stop assigning').click();
     if(mode==='accepted-timeout')return new Promise(()=>{});
     if(mode==='accepted-body-timeout')return new Response(new ReadableStream({start(){}}));
    }
    return response;
   };
  },mode);
  for(const name of ['nexus-building-data.js','nexus-personnel-reader.js','nexus-crew-register.js','nexus-assign-crew.js'])await child.addScriptTag({content:fs.readFileSync(new URL(name,root),'utf8')});
  await child.evaluate(()=>__NEXUS_ASSIGN_CREW__.mount(document.getElementById('actions'),()=>{}));
  const started=Date.now();
  if(mode.startsWith('profile-')){
   await child.evaluate(()=>{
    window.profileMessages=[];window.profileDone=false;
    __NEXUS_ASSIGN_CREW__.profileCrew([{id:10,crew:6,max:6,training:['HazMat Unit']}],text=>profileMessages.push(text),()=>false)
      .catch(e=>profileMessages.push('Stopped: '+e.message)).finally(()=>window.profileDone=true);
   });
   await child.waitForFunction(()=>profileDone,null,{timeout:5000});
  }else{
   await child.locator('#nx-assign-crew').click();
   await child.waitForFunction(()=>!__NEXUS_ASSIGN_CREW__.isRunning()&&/^(Finished|Stopped):/.test(document.querySelector('#nx-assign-crew-status').textContent),null,{timeout:5000});
  }
  const status=mode.startsWith('profile-')?(await child.evaluate(()=>profileMessages)).join('\n'):await child.locator('#nx-assign-crew-status').innerText();
  const writes=await page.evaluate(()=>fixtureWrites),register=await page.evaluate(()=>JSON.parse(NexusPersonnelStore.readRaw()));
  eq(requestError,'');eq(register.vehicles['99'].marker,'untouched','other vehicle records survive');
  const expectedPosts=['normal','accepted-http-error','accepted-redirect','accepted-timeout','accepted-body-timeout','register-timeout','register-rejected','register-conflict','profile-accepted-error'].includes(mode)?6:
    mode==='one-already-bound'?5:['limited-capacity','partial-trained-staff','two-vehicles'].includes(mode)?2:
    ['stop-after-one','unconfirmed-post','verification-timeout','next-read-timeout','profile-unconfirmed'].includes(mode)?1:0;
  eq(posts,expectedPosts,mode+' submission count');
  const uncertain=['unconfirmed-post','verification-timeout','profile-unconfirmed'].includes(mode);
  eq(await child.locator('#nx-assign-crew').isDisabled(),uncertain,mode+' button state');
  if(uncertain){
   eq(writes.length,0,'do not claim unverified crew in the register');
   ok(/Stopped:/.test(status));
   await child.evaluate(()=>document.querySelector('#nx-assign-crew').click());eq(posts,expectedPosts,'blocked repeat after unknown outcome');
  }else if(['register-timeout','register-rejected','register-conflict'].includes(mode)){
   ok(/Stopped: 6 crew assignments verified/.test(status),status);
   const progress=await child.evaluate(()=>fixtureProgress);ok(progress.some(p=>/6 crew assigned and verified/.test(p)),'show progress before saving');
   eq(writes.length,1,'one vehicle save');eq(Object.keys(writes[0].vehicles),['10'],'write only the changed vehicle');
   if(mode==='register-timeout'){
    ok(/timed out/.test(status));ok(Date.now()-started<3000,'deadline releases the busy state');
    await page.evaluate(()=>completeLateWrite());eq(posts,6,'late save cannot resume or replay assignments');
    eq(await page.evaluate(()=>JSON.parse(NexusPersonnelStore.readRaw()).vehicles['10'].assignedPersonnelCount),6);
    await page.screenshot({path:fileURLToPath(new URL('./station-crew-timeout.png',import.meta.url))});
   }else if(mode==='register-conflict'){eq(register.vehicles['10'].marker,'newer','never overwrite newer evidence');ok(/could not be verified/.test(status));}
  }else if(mode==='two-vehicles'){
   eq(writes.length,2);eq(writes.map(w=>Object.keys(w.vehicles)),[['10'],['20']]);
   eq(register.vehicles['10'].assignedPersonnelCount,1);eq(register.vehicles['20'].assignedPersonnelCount,1);
   eq(register.vehicles['10'].trainingCounts.gw_gefahrgut,1);eq(register.vehicles['20'].trainingCounts.gw_gefahrgut,1);
   ok(/Finished: 2 crew assigned across 2 checked vehicles/.test(status));
  }else if(expectedPosts||mode==='no-trained-staff'||mode==='bound-elsewhere'||mode==='missing-token'){
   const count=people.filter(p=>p.bound===10).length;
   eq(register.vehicles['10'].assignedPersonnelCount,count);eq(register.vehicles['10'].assignedTrainingProfiles.length,count);
   eq(register.vehicles['10'].trainingCounts.gw_gefahrgut||0,count,'exact trained coverage saved');
   eq(writes.length,mode==='profile-accepted-error'?7:1,'one save per checked vehicle for station action');
   for(const w of writes)eq(Object.keys(w.vehicles),['10']);
   const events=await page.evaluate(()=>fixtureStorageEvents);ok(events.length>0);ok(events.every(e=>e.vehicles['99']?.marker==='untouched'),'event contains committed full register');
   if(mode==='next-read-timeout'){ok(/Stopped: 1 crew assignments verified/.test(status));ok(/timed out/.test(status));}
   else if(mode==='stop-after-one')ok(/Stopped: 1 crew assigned/.test(status));
   else if(mode==='missing-token')ok(/security token unavailable/.test(status));
   else if(!mode.startsWith('profile-'))ok(/Finished:/.test(status));
  }else if(mode==='status-six'){eq(writes.length,0);ok(/No active specialist vehicles/.test(status));}
  else {eq(writes.length,0);ok(/Stopped:/.test(status));}
  if(mode==='normal'){
   await child.locator('#nx-assign-crew').click();
   await child.waitForFunction(()=>!__NEXUS_ASSIGN_CREW__.isRunning()&&/Finished: 0 crew assigned/.test(document.querySelector('#nx-assign-crew-status').textContent));
   eq(posts,6,'full vehicle does not replay a binding on another run');
   await page.screenshot({path:fileURLToPath(new URL('./station-crew-finished.png',import.meta.url))});
  }
  results.push({mode,posts,assignmentReads,vehicleReads,registerWrites:writes.length,status,elapsedMs:Date.now()-started,lastPostAt:postTime?postTime-started:null});
  console.log(mode+': passed');await context.close();
 }
 const report={checks,cases:results.length,liveGameVerified:false,allBrowserRequestsIntercepted:true,deadlineMs:15000,testDeadlineMs:200,results};
 fs.writeFileSync(new URL('./station-crew-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({checks,cases:results.length}));
}finally{await browser.close();}
