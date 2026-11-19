/* Dock the existing naming controls without cloning their handlers or starting a run. */
(() => {
 'use strict';let host,ui,section,desired=null,waitingTimer=null;
 const current=()=>document.getElementById('mc-namer-panel');
 const visible=()=>section?.isConnected&&!section.hidden;
 function dock(){
  const panel=current();if(!host||!panel?.hasAttribute('data-nexus-namer-ready'))return false;
  clearTimeout(waitingTimer);waitingTimer=null;document.documentElement.removeAttribute('data-nexus-renamer-requested');
  panel.setAttribute('data-nexus-renamer-docked','');panel.slot='nexus-renamer';
  if(panel.parentNode!==host)host.append(panel);
  panel.hidden=!visible();panel.setAttribute('aria-hidden',String(!visible()));panel.style.setProperty('display',visible()?'block':'none','important');
  if(visible()){
   section.querySelector('[data-renamer-status]').textContent='Namer · 1.3.3 · Stations load directly from your game account. Preview changes before using Rename and Save.';
   section.querySelector('[data-renamer-retry]').hidden=true;
   if(desired){const tab=desired;desired=null;window.dispatchEvent(new Event('nexus:renamer-select-'+tab));}
  }
  return true;
 }
 function requestOpen(){
  clearTimeout(waitingTimer);waitingTimer=null;
  document.documentElement.setAttribute('data-nexus-renamer-requested','');
  window.dispatchEvent(new Event('nexus:renamer-open'));
  if(dock())return;
  const target=section;target.querySelector('[data-renamer-status]').textContent='Opening naming controls…';
  waitingTimer=setTimeout(()=>{if(section!==target)return;target.querySelector('[data-renamer-status]').textContent='The naming module did not start. Retry, or reload Nexus and refresh this game page.';target.querySelector('[data-renamer-retry]').hidden=false;},8000);
 }
 function install(container){
  host=container;
  const style=document.createElement('style');style.id='nexus-renamer-dock-style';
  style.textContent=`
  html #nexus-native-tools #mc-namer-panel[data-nexus-renamer-docked]{position:static!important;inset:auto!important;width:100%!important;min-width:0!important;max-width:100%!important;max-height:none!important;height:auto!important;transform:none!important;margin:0!important;box-shadow:none!important;border:0!important;font:13px system-ui,sans-serif!important;overflow:visible!important}
  html #nexus-native-tools #mc-namer-panel[data-nexus-renamer-docked][hidden]{display:none!important}
  #nexus-native-tools #mc-namer-header{display:none!important}
  html #nexus-native-tools #mc-namer-panel #mc-namer-body{display:block!important;max-height:none!important;height:auto!important;overflow:visible!important;padding:0!important}
  #nexus-native-tools #mc-namer-panel :is(#mc-unit-view,#mc-station-view){grid-template-columns:minmax(0,1fr)!important;padding:8px 0!important;gap:10px!important}
  #nexus-native-tools #mc-namer-panel :is(button,select,input,label,summary){font-size:13px!important;min-height:32px;line-height:1.4!important}
  #nexus-native-tools #mc-namer-panel button{color:#dceefa;background-color:#16364c;border:1px solid #3d6178;border-radius:5px;cursor:pointer}
  #nexus-native-tools #mc-namer-panel :is(select,input){max-width:100%!important;box-sizing:border-box!important}
  #nexus-native-tools #mc-namer-panel :is(.mc-namer-section,.mc-compact-disclosure){padding:9px!important}
  #nexus-native-tools #mc-namer-panel :is(.mc-nexus-log,.mc-nexus-status-card span,.mc-nexus-status-card b){font-size:12px!important}
  #nexus-native-tools #mc-namer-panel .mc-namer-tabs{display:flex!important;gap:6px!important;flex-wrap:wrap!important}
  #nexus-native-tools #mc-namer-panel .mc-namer-tab{flex:1!important;padding:8px!important}
  `;document.head.append(style);
  window.addEventListener('nexus:renamer-ready',dock);dock();
 }
 function mount(container,root){
  host=container;ui=root;section=document.createElement('section');section.id='renamerView';
  const status=document.createElement('p');status.dataset.renamerStatus='';status.setAttribute('role','status');
  status.textContent='Opening naming controls…';
  const retry=document.createElement('button');retry.type='button';retry.dataset.renamerRetry='';retry.textContent='Retry opening Renamer';retry.hidden=true;retry.onclick=requestOpen;
  const links=document.createElement('div');links.className='links';
  for(const [tab,label]of [['station','Station names'],['unit','Vehicle names']]){
   const a=document.createElement('a');a.href=location.pathname+'#nexus-renamer='+tab;a.textContent=label;
   a.onclick=e=>{if(e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();desired=tab;requestOpen();};links.append(a);
  }
  const slot=document.createElement('slot');slot.name='nexus-renamer';section.append(status,retry,links,slot);ui.getElementById('body').append(section);
  const requested=location.hash.match(/^#nexus-renamer=(unit|station|personnel)$/)?.[1];if(requested)desired=requested;
  requestOpen();
 }
 function suspend(){clearTimeout(waitingTimer);waitingTimer=null;document.documentElement.removeAttribute('data-nexus-renamer-requested');section?.remove();section=null;const panel=current();if(panel?.hasAttribute('data-nexus-renamer-docked')){panel.hidden=true;panel.setAttribute('aria-hidden','true');panel.style.setProperty('display','none','important');}}
 globalThis.NexusRenamerTools=Object.freeze({install,mount,suspend});
})();
