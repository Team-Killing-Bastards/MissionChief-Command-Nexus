/* User-opened bulk profile review. One station execution frame, never an Auto Mode worker. */
(() => {
 'use strict';if(window!==window.top)return;let active=null;
 const C=globalThis.NexusStationProfilesCore,D=globalThis.NexusStationProfilesData,Store=globalThis.NexusStationProfilesStore;
 const who=()=>document.querySelector('#navbar_profile_link')?.getAttribute('href')?.match(/\/profile\/(\d+)/)?.[1]||'';
 const money=n=>Number(n).toLocaleString('en-GB');
 function open(){
  if(active){active.focus();return;}
  const player=who(),host=document.createElement('div');host.id='nexus-profile-batch';host.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0007;display:grid;place-items:center';
  const root=host.attachShadow({mode:'open'});root.innerHTML=`<style>
  :host{font:14px system-ui,sans-serif;color:#e7edf8}*{box-sizing:border-box}[hidden]{display:none!important}button,input,select{font:inherit;color:inherit;background:#17314b;border:1px solid #4c7091;border-radius:6px;padding:8px}button{cursor:pointer}button:disabled{opacity:.5;cursor:default}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #70d7ff}input[type=checkbox]{accent-color:#29b9d7}a{color:#91d9ff}dialog{position:relative;margin:0;width:min(1050px,calc(100vw - 32px));height:min(850px,calc(100vh - 36px));padding:0;color:inherit;background:#0c1828;border:1px solid #547594;border-radius:12px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 15px 60px #0009}header{display:flex;align-items:center;gap:12px;padding:16px;background:#11243a}header div{flex:1}h2{font-size:20px;margin:0}small{display:block;color:#b2c8df;margin:5px 0}main{padding:16px;overflow:auto;flex:1;min-height:0}.bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0}label{display:flex;align-items:center;gap:7px}.filters label{flex:1;min-width:200px}.filters select{width:100%}input[type=search]{flex:1;min-width:150px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;vertical-align:top;padding:9px;border-bottom:1px solid #30455e}thead{background:#142a43;position:sticky;top:0}.list{max-height:340px;overflow:auto}summary{cursor:pointer;color:#97d9ff}details p{margin:5px 0}#state{white-space:pre-line;color:#b9e1f7}#log{max-height:180px;overflow:auto;font-size:12px}#log p{margin:5px 0}.primary{background:#217fa6}#approval{padding:12px;border:1px solid #59728b;border-radius:6px}#quoted{font-weight:bold;color:#8ee1cd}@media(max-width:600px){main{padding:10px}.list table{min-width:640px}header{padding:10px}.filters label{flex-basis:100%}}</style>
  <dialog open aria-label="Apply profiles to stations"><header><div><h2>Apply profiles to stations</h2><small>Profiles · 1.2.3</small></div><button id="close" aria-label="Close bulk profiles">×</button></header><main>
  <p>Apply one saved profile to matching stations. Review levels, vehicles, naming and crew targets before running.</p>
  <button id="load">Load profiles and stations</button><div id="controls" hidden>
  <div class="bar filters"><label>Profile <select id="profile" aria-label="Batch profile"></select></label><label>Dispatch centre <select id="centre" aria-label="Profile dispatch centre"></select></label></div>
  <label><input type="checkbox" id="max" checked>Upgrade to maximum level before applying</label><small>The maximum level and credit price come from each station’s current game controls. Extensions and specialisations remain separate upgrades.</small>
  <details id="targetDetails"><summary>What this profile checks</summary><p id="targetText" style="white-space:pre-line"></p></details>
  <div class="bar"><button id="rescan">Scan profile matches</button><button id="cancelScan" hidden>Stop scan</button><label><input id="showMatches" type="checkbox">Show matching stations</label><small id="scanState" role="status" aria-live="polite"></small></div>
  <small>Choosing a profile or dispatch centre checks vehicles, level, naming and crew targets. Confirmed matches are hidden. The first difference is shown for each remaining station; incomplete checks stay visible. This scan makes no changes.</small>
  <div class="bar"><input id="search" type="search" placeholder="Search matching stations" aria-label="Search profile stations"><button id="all">Select all matching</button><button id="none">Clear selection</button><span id="count"></span></div>
  <div class="list"><table><thead><tr><th>Select / station</th><th title="Total staff at this station; includes unavailable and mission-assigned personnel. Loaded with the building list.">Personnel</th><th>Level</th><th>Vehicles</th><th>Credits</th><th>Result</th></tr></thead><tbody id="stations"></tbody></table></div>
  <div class="bar"><button id="previous">Previous</button><small id="page"></small><button id="next">Next</button></div>
  <button id="review">Review selected stations</button><p id="quoted"></p>
  <div id="approval" hidden><p id="reviewText"></p><label><input id="confirm" type="checkbox">I approve these purchases at current game credit prices, including price changes, and permanent removal of the listed vehicles.</label><div class="bar"><button id="run" class="primary" disabled>Run reviewed profiles</button></div></div>
  </div><button id="stop" hidden>Stop after current action</button><p id="state" role="status" aria-live="polite">Load your saved profiles and stations to begin.</p><div id="log"></div>
  </main></dialog>`;
  document.documentElement.append(host);const q=id=>root.getElementById(id);let profiles=[],buildings=[],selected=new Set(),quotes=new Map(),errors=new Map(),outcomes=new Map(),page=0,busy=false,stopped=false,closing=false,frame=null,workerStop=null,scanController=null,scanTimer=null;const matches=new Map();
  const focus=()=>q('close').focus();active={focus};focus();
  const say=text=>q('state').textContent=text;
  const assertPlayer=()=>{if(!player||who()!==player)throw Error('Player changed or is unavailable. Reopen Profiles from the main game page.');};
  const profile=()=>{const p=profiles.find(p=>p.id===q('profile').value);return p?C.validate({...p,maxLevel:q('max').checked},D):null;};
  const scoped=()=>{const p=profile();return buildings.filter(b=>p&&String(b.building_type)===p.buildingType&&(!q('centre').value||String(b.leitstelle_building_id||'none')===q('centre').value));};
  const matching=()=>scoped().filter(b=>(q('showMatches').checked||!matches.get(String(b.id))?.matches)&&String(b.caption||'').toLowerCase().includes(q('search').value.toLowerCase()));
  function cancelScan(){clearTimeout(scanTimer);scanTimer=null;scanController?.abort();scanController=null;q('cancelScan').hidden=true;}
  function scanControls(){const scanning=!!scanController||scanTimer!==null;q('review').disabled=busy||scanning;q('all').disabled=busy||scanning;q('rescan').disabled=busy;q('cancelScan').disabled=false;q('cancelScan').hidden=!scanning;}
  function scheduleScan(){cancelScan();matches.clear();selected.clear();invalidate();q('scanState').textContent=profile()?'Waiting to check profile…':'';scanTimer=setTimeout(()=>{scanTimer=null;void scanMatches();},350);draw();}
  async function scanMatches(){
   cancelScan();if(busy||!profile()){draw();return;}matches.clear();selected.clear();invalidate();
   const controller=new AbortController();scanController=controller;const p=profile(),stations=scoped();let next=0,checked=0,hidden=0,unknown=0;
   const current=()=>scanController===controller&&!controller.signal.aborted;
   const progress=()=>{q('scanState').textContent='Checked '+checked+' / '+stations.length+' · '+hidden+' already match'+(unknown?' · '+unknown+' need checking':'');};
   async function scan(){while(current()&&next<stations.length){const station=stations[next++],id=String(station.id);let result;
    try{assertPlayer();result=await globalThis.NexusProfileMatch.check(p,station,{signal:controller.signal});assertPlayer();}
    catch(error){if(!current())return;if(who()!==player){cancelScan();matches.clear();q('scanState').textContent='Player changed. Reopen Profiles before scanning again.';draw();return;}result={matches:false,unknown:true,reason:'Check incomplete: '+error.message};}
    if(!current())return;matches.set(id,result);checked++;if(result.matches)hidden++;if(result.unknown)unknown++;progress();draw();
   }}
   progress();draw();try{await Promise.all([scan(),scan()]);}finally{if(current()){scanController=null;q('scanState').textContent='Scan complete · '+hidden+' already match · '+(stations.length-hidden)+' remain'+(unknown?' ('+unknown+' need checking)':'');draw();}}
  }
  q('rescan').onclick=()=>{void scanMatches();};q('cancelScan').onclick=()=>{cancelScan();q('scanState').textContent='Scan stopped. Unchecked stations remain visible.';draw();};
  q('showMatches').onchange=()=>{for(const id of selected)if(!q('showMatches').checked&&matches.get(id)?.matches)selected.delete(id);invalidate();page=0;draw();};
  function invalidate(){quotes.clear();errors.clear();outcomes.clear();q('approval').hidden=true;q('confirm').checked=false;q('quoted').textContent='';}
  function draw(){
   const target=profile();q('targetText').textContent=target?[target.name+' · '+D.buildings[target.buildingType],q('max').checked?'Level: maximum (selected above)':'Level: keep current','Names: '+(target.rename?'match Nexus vehicle names':'keep current names'),...target.units.map(u=>u.count+' × '+D.vehicles[u.type].name+' · '+u.crew+' assigned crew per vehicle'+(u.training.length?' · each with '+u.training.join(' + '):'')+(u.role?' · '+u.role:'')),'Only a confirmed full match is hidden. A failed read is not treated as a match.'].join('\n'):'Choose a saved profile.';
   const rows=matching();page=Math.min(page,Math.max(0,Math.ceil(rows.length/100)-1));q('stations').replaceChildren();
   for(const b of rows.slice(page*100,page*100+100)){
    const id=String(b.id),plan=quotes.get(id),tr=document.createElement('tr'),cell=document.createElement('td'),label=document.createElement('label'),check=document.createElement('input'),name=document.createElement('a');check.type='checkbox';check.dataset.station=id;check.checked=selected.has(id);check.disabled=busy||!!scanController||scanTimer!==null;check.setAttribute('aria-label','Select '+b.caption);name.href='/buildings/'+id;name.target='_blank';name.rel='noopener noreferrer';name.textContent=b.caption;label.append(check,name);cell.append(label);tr.append(cell);
    const personnel=document.createElement('td'),rawCount=b.personal_count,staffCount=typeof rawCount==='number'?rawCount:typeof rawCount==='string'&&/^\d+$/.test(rawCount.trim())?Number(rawCount):null;
    personnel.textContent=Number.isSafeInteger(staffCount)&&staffCount>=0?money(staffCount):'—';personnel.title=personnel.textContent==='—'?'Personnel total unavailable in the building list.':'Total staff, including unavailable and mission-assigned personnel. Reload profiles and stations to refresh.';tr.append(personnel);
    const level=document.createElement('td');level.textContent=plan?.level?plan.level.current+' → '+plan.level.target:(b.level??'—')+' · keep';tr.append(level);
    const vehicles=document.createElement('td');vehicles.textContent=plan?plan.buy.reduce((n,u)=>n+u.count,0)+' buy · '+plan.remove.length+' remove':'Not reviewed';
    if(plan){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Show planned changes';details.append(summary);for(const text of [...plan.buy.map(u=>'Buy '+u.count+' × '+D.vehicles[u.type].name),...plan.remove.map(v=>'Remove '+(v.caption||'Vehicle')+' #'+v.id),...plan.profile.units.map(u=>'Crew: '+D.vehicles[u.type].name+(u.role?' / '+u.role:'')+' · '+u.crew+' per vehicle'+(u.training.length?' · '+u.training.join(', '):'')),plan.profile.rename?'Run Nexus naming':'Keep vehicle names']){const p=document.createElement('p');p.textContent=text;details.append(p);}vehicles.append(details);}tr.append(vehicles);
    const cost=document.createElement('td');cost.textContent=plan?money(plan.cost):'—';tr.append(cost);const result=document.createElement('td');result.textContent=errors.get(id)||outcomes.get(id)|| (plan?'Reviewed':matches.get(id)?.reason||'');if(!plan&&matches.get(id)?.detail){const detail=document.createElement('small');detail.textContent=matches.get(id).detail;detail.style.cssText='max-width:300px;overflow-wrap:anywhere';result.append(detail);}tr.append(result);q('stations').append(tr);
   }
   q('count').textContent=selected.size+' stations selected';q('page').textContent=rows.length+' matching · page '+(page+1)+' / '+Math.max(1,Math.ceil(rows.length/100));q('previous').disabled=busy||page===0;q('next').disabled=busy||(page+1)*100>=rows.length;scanControls();
  }
  function lock(value){busy=value;for(const control of root.querySelectorAll('button,input,select'))control.disabled=value;q('stop').hidden=!value;q('stop').disabled=false;q('close').disabled=false;if(!value){q('run').disabled=!q('confirm').checked||quotes.size!==selected.size||!!errors.size;draw();}}
  function dispose(){cancelScan();matches.clear();frame?.remove();host.remove();active=null;quotes.clear();buildings=[];profiles=[];}
  function stop(){stopped=true;workerStop?.();say('Stopping after the current action is checked…');}
  q('close').onclick=()=>{if(busy){closing=true;stop();}else dispose();};q('stop').onclick=stop;
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();q('close').click();}});
  async function operation(task){if(busy)return;cancelScan();stopped=false;lock(true);try{assertPlayer();await task();}catch(error){say('Stopped: '+error.message);}finally{lock(false);if(closing)dispose();}}
  async function inventory(){const r=await fetch('/api/buildings',{credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Building list returned HTTP '+r.status);const data=await r.json();if(!Array.isArray(data)||data.length>20000)throw Error('Building inventory is unavailable.');return data;}
  q('load').onclick=()=>operation(async()=>{invalidate();matches.clear();q('scanState').textContent='';selected.clear();profiles=(await Store.read('nexusStationProfilesV1:'+player)).map(p=>C.validate(p,D));buildings=await inventory();q('profile').replaceChildren(new Option('Choose a saved profile',''),...profiles.map(p=>new Option(p.name+' · '+D.buildings[p.buildingType],p.id)));q('centre').replaceChildren(new Option('All dispatch centres',''),new Option('No dispatch centre','none'),...buildings.filter(b=>Number(b.building_type)===7).map(b=>new Option(b.caption,String(b.id))));q('controls').hidden=false;say(profiles.length?'Choose a profile and dispatch centre, then select stations.':'Create and save a profile in Nexus Tools first.');});
  q('profile').onchange=()=>{q('max').checked=true;page=0;scheduleScan();};q('centre').onchange=()=>{page=0;scheduleScan();};q('max').onchange=()=>{scheduleScan();};q('search').oninput=()=>{page=0;draw();};
  q('all').onclick=()=>{for(const b of matching())selected.add(String(b.id));invalidate();draw();};q('none').onclick=()=>{selected.clear();invalidate();draw();};q('previous').onclick=()=>{page--;draw();};q('next').onclick=()=>{page++;draw();};
  q('stations').onchange=e=>{const id=e.target.dataset.station;if(!id||busy||scanController||scanTimer!==null)return;e.target.checked?selected.add(id):selected.delete(id);invalidate();draw();};
  q('review').onclick=()=>operation(async()=>{
   invalidate();const p=profile();if(!p||!selected.size)throw Error('Choose a profile and at least one station.');let checked=0,total=0,removed=0;const ids=[...selected];let next=0;
   async function scan(){while(next<ids.length&&!stopped){const id=ids[next++];try{const plan=await globalThis.NexusStationProfilesEngineFactory.create(id,{readOnly:true}).review(p,buildings);if(plan.unknownCost)throw Error('A required vehicle has no verified credit price. Check this station’s market.');quotes.set(id,plan);total+=plan.cost;removed+=plan.remove.length;if(!Number.isSafeInteger(total))throw Error('Credit total exceeds the supported limit.');}catch(error){errors.set(id,error.message);}checked++;say('Reviewed '+checked+' / '+ids.length+' stations. No changes sent.');draw();}}
   await Promise.all([scan(),scan()]);if(stopped){invalidate();return;}if(errors.size)throw Error(errors.size+' stations need attention. Read the row messages, then review again or deselect them.');
   q('quoted').textContent='Estimated credit spend: '+money(total)+' credits';q('reviewText').textContent=quotes.size+' stations · '+removed+' vehicles listed for permanent removal. Credit prices are rechecked during the run; price changes update the cost and do not stop the batch. Levels are bought before applying each profile. Vehicles may leave or return during the run. Only removals listed in this review are allowed; away vehicles are left alone. Existing crew bindings are retained; only suitable empty seats are filled. Any skipped step appears in the run log.';q('approval').hidden=false;say('Review ready. No purchases or removals have been sent.');
  });
  q('confirm').onchange=()=>{q('run').disabled=!q('confirm').checked;};
  function stationRun(plan){
   return new Promise((resolve,reject)=>{
    const nonce=crypto.randomUUID(),requestId=crypto.randomUUID(),id=plan.stationId;let timer,submitted=false,settled=false;frame=document.createElement('iframe');frame.name='nexus-profile-batch-'+nonce;frame.hidden=true;frame.setAttribute('aria-hidden','true');frame.src='/buildings/'+id+'#nexus-profile-batch='+nonce;
    const post=(type,detail={})=>frame?.contentWindow?.postMessage({channel:'nexus-profile-batch-command',nonce,stationId:id,requestId,type,...detail},location.origin);
    const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);window.removeEventListener('message',receive);workerStop=null;frame?.remove();frame=null;error?reject(error):resolve(value);};
    const deadline=ms=>{clearTimeout(timer);timer=setTimeout(()=>{post('stop');finish(Error('Station response timed out. Check its profile review before retrying; no repeat request was sent.'));},ms);};
    const receive=e=>{const m=e.data;if(e.origin!==location.origin||e.source!==frame?.contentWindow||m?.channel!=='nexus-profile-batch-result'||m.nonce!==nonce||m.stationId!==id)return;if(m.type==='available'){post('ready');return;}if(m.requestId!==requestId)return;
     if(m.type==='ready'&&!submitted){if(stopped){finish(null,{spent:0,stopped:true});return;}if(!m.crewReady){finish(Error('The station crew module did not start. Refresh the game before retrying.'));return;}submitted=true;deadline(75000);post('apply',{profile:plan.profile,reviewedCost:plan.cost,approval:globalThis.NexusStationProfilesEngineFactory.create(id,{readOnly:true}).approvalKey(plan,{allowCreditPriceChanges:true})});}
     if(m.type==='progress'){deadline(75000);say(m.text);const line=document.createElement('p');line.textContent=plan.stationName+': '+m.text;q('log').append(line);while(q('log').children.length>150)q('log').firstChild.remove();q('log').scrollTop=q('log').scrollHeight;}
     if(m.type==='done')finish(null,m.result);if(m.type==='error')finish(Error(m.error));
    };
    workerStop=()=>post('stop');window.addEventListener('message',receive);frame.addEventListener('load',()=>post('ready'),{once:true});deadline(30000);host.append(frame);
   });
  }
  q('run').onclick=()=>operation(async()=>{
   if(!selected.size||!q('confirm').checked||quotes.size!==selected.size||errors.size)throw Error('Review and confirm the selected stations first.');const plans=[...selected].map(id=>quotes.get(id));let done=0,spent=0;q('approval').hidden=true;q('log').replaceChildren();
   try{await navigator.locks.request('nexus-profiles-batch',{ifAvailable:true},async lock=>{if(!lock)throw Error('Another profile batch is running.');for(const plan of plans){if(stopped)break;assertPlayer();say('Applying '+(done+1)+' / '+plans.length+': '+plan.stationName);outcomes.set(plan.stationId,'Running');draw();try{const result=await stationRun(plan);spent+=Number(result?.spent)||0;outcomes.set(plan.stationId,result?.stopped?'Stopped':result?.missingVehicles?'Needs attention · '+result.missingVehicles+' vehicles still missing':'Profile pass finished · see log');done++;if(result?.stopped)stopped=true;}catch(error){outcomes.set(plan.stationId,'Stopped · '+error.message);throw error;}}say((stopped?'Stopped. ':'Finished. ')+done+' / '+plans.length+' profile passes · '+money(spent)+' credits verified in completed passes. Read any blocked steps in the log.');});}
   finally{q('confirm').checked=false;quotes.clear();matches.clear();q('scanState').textContent='Scan profile matches again to check the latest setup.';draw();}
  });
 }
 globalThis.NexusProfileBatch={open};
})();
