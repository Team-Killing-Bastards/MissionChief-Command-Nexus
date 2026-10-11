(() => {
 if(window!==window.top)return;
 window.addEventListener('nexus:account-request',async e=>{
  let m;try{m=JSON.parse(e.detail);}catch{return;}
  if(!m||!/^\d+$/.test(String(m.id))||!['STATUS','SYNC','OPEN','PREFS_GET','PREFS_SET'].includes(m.action))return;
  const player=document.querySelector('#navbar_profile_link')?.getAttribute('href')?.match(/\/profile\/(\d+)/)?.[1];
  if(m.action==='SYNC'&&String(m.body?.player)!==player)return;
  try{const result=await chrome.runtime.sendMessage({type:'NEXUS_ACCOUNT_'+m.action,body:m.body,key:m.key,value:m.value});window.dispatchEvent(new CustomEvent('nexus:account-response',{detail:JSON.stringify({id:m.id,result})}));}
  catch{window.dispatchEvent(new CustomEvent('nexus:account-response',{detail:JSON.stringify({id:m.id,result:{ok:false,error:'Reload MissionChief after updating Nexus'}})}));}
 });
})();
