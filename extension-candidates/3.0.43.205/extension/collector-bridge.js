(()=>{
 if(window.top!==window)return;
 const queue=[];let sending=false,retry=null,button,paused=false,bytes=0,gaps=0,saveError=false,reportingEnabled=false;
 const send=message=>chrome.runtime.sendMessage(message);
 const enable=()=>window.dispatchEvent(new CustomEvent('nexus-analytics-control-v1',{detail:JSON.stringify({enabled:!paused,reportingEnabled})}));
 async function flush(){
  if(sending||!queue.length)return;sending=true;const batch=[];let batchBytes=0,failed=false;
  for(const v of queue){const n=JSON.stringify(v).length;if(batch.length&&(batch.length>=25||batchBytes+n>400000))break;batch.push(v);batchBytes+=n;}
  try{const r=await send({type:'NEXUS_COLLECTOR_CAPTURE',events:batch});if(!r?.ok)throw Error();saveError=false;queue.splice(0,batch.length);bytes-=batchBytes;if(paused&&bytes<500000){paused=false;enable();}}
  catch{failed=true;saveError=true;if(button)button.textContent='Logger: save pending';}
  finally{sending=false;if(queue.length){clearTimeout(retry);retry=setTimeout(flush,failed?1000:25);}}
 }
 window.addEventListener('nexus-analytics-event-v1',e=>{
  try{
   if(typeof e.detail!=='string'||e.detail.length>100000)return;
   // Ignore interaction/network noise before doing any storage or messaging.
   const v=JSON.parse(e.detail);
   if(!['mission-location','mission','income','register','register-snapshot','capture-health'].includes(v.kind)&&!['status','lifecycle','recovery-attempt','recovery-result'].includes(v.kind))return;
   if(paused){gaps++;return;}queue.push(v);bytes+=JSON.stringify(v).length;
   if(bytes>2000000){paused=true;gaps++;enable();}queueMicrotask(flush);
  }catch{}
 });
 window.addEventListener('nexus-analytics-ready-v1',enable);
 async function tick(){
  enable();
  const p=document.querySelector('#navbar_profile_link'),player=p?.getAttribute('href')?.match(/\/profile\/(\d+)/)?.[1];
  try{
   if(player){await send({type:'NEXUS_COLLECTOR_IDENTITY',identity:{player,username:p.textContent.trim()}});if(!document.getElementById('nexus-upload-disclosure')&&!sessionStorage.getItem('nexus-upload-disclosure-103')){const box=document.createElement('div');box.id='nexus-upload-disclosure';box.style.cssText='position:fixed;bottom:12px;right:12px;z-index:100000;background:#11283a;color:white;padding:16px;max-width:380px;border:1px solid #6298b5;border-radius:8px';const text=document.createElement('p');text.textContent='Nexus gameplay uploads are enabled by default. Game identity, mission activity and station/fleet records are sent to the Nexus project owner for reporting. You can turn uploads off in Private collector.';box.append(text);for(const [label,action] of [['Collector settings',()=>send({type:'NEXUS_COLLECTOR_OPEN'})],['Turn uploads off',()=>send({type:'NEXUS_COLLECTOR_SETTINGS_GAME',enabled:false})],['Dismiss',()=>Promise.resolve()]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>Promise.resolve(action()).then(()=>{sessionStorage.setItem('nexus-upload-disclosure-103','1');box.remove();}).catch(()=>{});box.append(b);}document.body.append(box);}}
   if(!button&&p){button=document.createElement('button');button.type='button';button.style.cssText='background:#18374d;color:#e6f3ff;border:1px solid #5b8198;border-radius:4px;padding:5px 8px;margin:3px;font-size:11px';button.addEventListener('click',()=>send({type:'NEXUS_COLLECTOR_OPEN'}).catch(()=>{}));p.parentElement.append(button);}
   if(gaps){const r=await send({type:'NEXUS_COLLECTOR_GAP'});if(r?.ok)gaps=0;}
   await send({type:'NEXUS_COLLECTOR_CAPTURE_STATE',paused,saveError,queued:queue.length});
   const r=await send({type:'NEXUS_COLLECTOR_HEALTH'});if(r?.ok){reportingEnabled=r.enabled===true;enable();}if(button&&r?.ok){button.textContent=paused?'Logger: recording paused':queue.length?'Logger: save pending':(r.uploadError??r.lastError)?'Logger: check health':r.paired?'Logger: '+r.pending+' pending':'Logger: pair device';button.title='Open private collector health';}
  }catch{}void flush();
 }
 document.addEventListener('DOMContentLoaded',tick,{once:true});void tick();setInterval(tick,15000);
})();
