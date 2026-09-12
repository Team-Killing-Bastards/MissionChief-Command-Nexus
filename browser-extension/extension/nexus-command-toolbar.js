/* Nexus manual mission controls. Native dispatch remains authoritative; no Auto hooks or background scans. */
(() => {
  'use strict';
  if (globalThis.NexusSettings?.enabled('commandBar') === false) return;
  if(!/^\/missions\/\d+\/?$/.test(location.pathname)||/^mcn-v3-(active-worker|pipeline-preload)-/.test(window.name||''))return;
  try{if(window.frameElement?.matches('[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload],#mcn-v3-background-mission-worker'))return;}catch{return;}
  if(window.__NEXUS_COMMANDS__)return;
  const missionId=location.pathname.split('/')[2],nf=new Intl.NumberFormat('en-GB');
  let toolbar=null,root=null,popover=null,opener=null,controller=null,timeout=null,busy=false,dispatching=false,ticket=0,stage='',uncertain=false,dispatched=false,shared=false;
  const posted=new Set();let originalClass=false;
  window.__NEXUS_COMMANDS__={activate,suspend};
  const style=document.createElement('style');style.textContent=`
  .nx-command-toolbar{background:#102338!important;border-top:2px solid #579cc5!important;color:#e8f0fb!important;min-height:48px;height:auto!important}
  .nx-command-toolbar .btn-success,.nx-command-toolbar .btn-default{background:#1d415d!important;color:#e8f0fb!important;border-color:#7193ac!important;text-shadow:none!important}
  .nx-command-toolbar .btn-success:hover,.nx-command-toolbar .btn-default:hover{background:#39799a!important}.nx-command-toolbar .btn.disabled,.nx-command-toolbar .btn[disabled]{opacity:.5}
  #nx-command-tools{display:inline-flex;align-items:center;gap:5px;flex-wrap:wrap;margin:4px 8px;font:12px system-ui,sans-serif;color:#e8f0fb;vertical-align:middle}
  #nx-command-tools .nx-command-brand{color:#b9e1fc;font-weight:bold;margin-right:3px}#nx-command-tools svg,#nx-command-popover svg{width:15px;height:15px;vertical-align:middle;flex:none}
  .nx-command-button{display:inline-flex;align-items:center;justify-content:center;gap:5px;background:#1d415d;color:#e8f0fb;border:1px solid #7193ac;border-radius:4px;padding:7px 9px;font:inherit;cursor:pointer}
  .nx-command-button:hover,.nx-command-button[aria-expanded=true]{background:#39799a;border-color:#b6e3fa}.nx-command-button:disabled{opacity:.5;cursor:default}.nx-command-button:focus-visible,#nx-command-popover :focus-visible{outline:2px solid #96dbff;outline-offset:2px}
  #nx-command-popover{position:fixed;z-index:2147483000;box-sizing:border-box;width:420px;max-width:calc(100vw - 20px);max-height:calc(100vh - 20px);overflow:auto;padding:14px;background:#102338;color:#e8f0fb;border:1px solid #7891aa;border-left:4px solid #579cc5;border-radius:5px;box-shadow:0 8px 28px #0007;font:13px system-ui,sans-serif}
  #nx-command-popover *{box-sizing:border-box}#nx-command-popover h3{font:600 16px system-ui,sans-serif;color:#b9e1fc;margin:0 0 12px}#nx-command-popover p{margin:8px 0;color:#cad7e5}#nx-command-popover label{display:block;font-weight:normal;margin:10px 0}#nx-command-popover textarea{display:block;width:100%;min-height:80px;margin-top:6px;border:1px solid #7193ac;border-radius:4px;background:#17354b;color:#fff;padding:8px;font:inherit;resize:vertical}#nx-command-popover input[type=checkbox]{margin-right:7px}
  #nx-command-popover table{border-collapse:collapse;width:100%;color:inherit;font:inherit}#nx-command-popover td,#nx-command-popover th{padding:7px 5px;border-bottom:1px solid #7193ac55;text-align:left}#nx-command-popover td:last-child,#nx-command-popover th:last-child{text-align:right}#nx-command-popover .nx-command-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
  #nx-command-status{max-width:420px;color:#d5ebff;font-size:11px}#nx-command-status:empty{display:none}#nx-command-popover [role=status]{white-space:normal;color:#ffda9f;margin-top:10px}
  @media(max-width:900px){#nx-command-tools{margin:4px;gap:4px}.nx-command-button{padding:6px}.nx-command-toolbar{flex-wrap:wrap!important}}
  `;document.head.append(style);
  function el(tag,text){const node=document.createElement(tag);node.dataset.nexusCommand='1';if(text!==undefined)node.textContent=text;return node;}
  function icon(kind){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','2');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
    const paths={share:'M16 6L8 10M8 14L16 18 M20 5a3 3 0 1 0-6 0a3 3 0 0 0 6 0 M8 12a3 3 0 1 0-6 0a3 3 0 0 0 6 0 M20 19a3 3 0 1 0-6 0a3 3 0 0 0 6 0',next:'M4 12H20M14 6L20 12L14 18',car:'M4 10L6 4H18L20 10M3 10H21V19H3ZM6 19V21M18 19V21M6 14H8M16 14H18',down:'M6 9L12 15L18 9'};
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',paths[kind]);svg.append(path);return svg;}
  function button(label,action,kind){const node=el('button');node.type='button';node.className='nx-command-button';node.setAttribute('aria-label',label);node.title=label;if(kind)node.append(icon(kind));node.append(el('span',label));node.addEventListener('click',event=>{if(event.isTrusted)action(node);});return node;}
  function visible(){if(document.hidden)return false;try{let win=window;while(win!==win.top){const frame=win.frameElement;if(!frame||frame.getAttribute('aria-hidden')==='true')return false;const css=win.parent.getComputedStyle(frame);if(css.display==='none'||css.visibility==='hidden'||!frame.getClientRects().length)return false;win=win.parent;}}catch{return false;}return true;}
  function target(next){return document.getElementById(next?'alert_next_btn':'mission_alarm_btn');}
  function usable(node){return !!node?.isConnected&&!node.disabled&&!node.classList.contains('disabled')&&node.getAttribute('aria-disabled')!=='true';}
  function status(message){const outer=document.getElementById('nx-command-status'),inner=popover?.querySelector('[role=status]');if(outer)outer.textContent=message;if(inner)inner.textContent=message;}
  function setBusy(value){busy=value;for(const node of root?.querySelectorAll('[data-nx-share]')||[])node.disabled=value||uncertain||dispatched;for(const node of popover?.querySelectorAll('textarea,input,[data-nx-submit]')||[])node.disabled=value||uncertain||dispatched;}
  function closePanel(focus=false){popover?.remove();popover=null;opener?.setAttribute('aria-expanded','false');if(focus&&opener?.isConnected)opener.focus();opener=null;}
  function position(){if(!popover||!opener)return;const rect=opener.getBoundingClientRect(),width=Math.min(420,innerWidth-20);popover.style.width=`${width}px`;popover.style.left=`${Math.max(10,Math.min(rect.left,innerWidth-width-10))}px`;const height=Math.min(popover.scrollHeight,innerHeight-20);popover.style.top=`${Math.max(10,Math.min(rect.bottom+6+height<=innerHeight-10?rect.bottom+6:rect.top-height-6,innerHeight-height-10))}px`;}
  function openPanel(trigger,title){if(opener===trigger&&popover){closePanel(true);return null;}closePanel();opener=trigger;trigger.setAttribute('aria-expanded','true');popover=el('section');popover.id='nx-command-popover';popover.setAttribute('role','dialog');popover.setAttribute('aria-label',title);popover.append(el('h3',title));document.body.append(popover);return popover;}
  function openShare(trigger,next){if(busy||uncertain||dispatched)return;const panel=openPanel(trigger,next?'Share + dispatch + next':'Share + dispatch');if(!panel)return;
    panel.append(el('p','Uses your currently selected units. Add an optional mission note below.'));
    const noteLabel=el('label','Mission note (optional)'),note=el('textarea');note.maxLength=4000;note.placeholder='Leave blank to share without a note';noteLabel.append(note);panel.append(noteLabel);
    const chatLabel=el('label'),chat=el('input');chat.type='checkbox';chatLabel.append(chat,document.createTextNode('Also post this note to alliance chat'));panel.append(chatLabel);
    const feedback=el('div');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');panel.append(feedback);
    const actions=el('div');actions.className='nx-command-actions';actions.append(button('Cancel',()=>closePanel(true)));const submit=button(next?'Share + dispatch + next':'Share + dispatch',()=>void run(next,note.value.trim(),chat.checked),'share');submit.dataset.nxSubmit='1';actions.append(submit);panel.append(actions);
    if(!usable(target(next)))feedback.textContent='The game dispatch control is unavailable. Select your units and try again.';
    position();note.focus();
  }
  function openVehicles(trigger){const panel=openPanel(trigger,'Selected vehicles');if(!panel)return;
    const checked=document.querySelectorAll('#vehicle_list_step input.vehicle_checkbox:checked'),groups=new Map(),seen=new Set();let total=0;
    for(const checkbox of checked){const identity=checkbox.value&&checkbox.value!=='on'?checkbox.value:checkbox.id||checkbox;if(seen.has(identity))continue;seen.add(identity);const raw=checkbox.getAttribute('vehicle_type_id'),spec=window.__NEXUS_COMFORT_DATA__?.types?.[raw],name=spec?.name||(raw?`Vehicle type ${raw}`:'Unknown vehicle type');groups.set(name,(groups.get(name)||0)+1);total++;}
    panel.append(el('p',`${nf.format(total)} selected ${total===1?'vehicle':'vehicles'}`));
    if(total){const table=el('table'),head=el('thead'),tr=el('tr');tr.append(el('th','Vehicle type'),el('th','Selected'));head.append(tr);table.append(head);const body=el('tbody');for(const [name,count]of [...groups].sort(([a],[b])=>a.localeCompare(b))){const row=el('tr');row.append(el('td',name),el('td',nf.format(count)));body.append(row);}table.append(body);panel.append(table);}else panel.append(el('p','No vehicles selected.'));
    panel.append(el('p','Includes selected follow-up units. Reopen to refresh the breakdown.'));const actions=el('div');actions.className='nx-command-actions';actions.append(button('Close',()=>closePanel(true)));panel.append(actions);position();panel.querySelector('button')?.focus();
  }
  async function request(path,options={}){
    const abortController=new AbortController(),requestTimeout=setTimeout(()=>abortController.abort(),15000);controller=abortController;timeout=requestTimeout;
    try{
      const response=await fetch(path,{credentials:'same-origin',...options,headers:{'X-Requested-With':'XMLHttpRequest',...options.headers},signal:abortController.signal});
      // No executable response is evaluated or retained. Native endpoints can return an HTML/JS page.
      await response.body?.cancel().catch(()=>{});
      const url=new URL(response.url||path,location.origin);
      if(url.origin!==location.origin||/\/(?:users\/)?(?:sign_in|login|sign_up)(?:\/|$)/.test(url.pathname))throw Error('Sign in to MissionChief again before using this action.');
      if(!response.ok)throw Error(`The game returned HTTP ${response.status}.`);
    }finally{clearTimeout(requestTimeout);if(timeout===requestTimeout)timeout=null;if(controller===abortController)controller=null;}
  }
  async function run(next,note,chat){
    if(busy||uncertain||dispatched||!visible())return;
    if(!usable(target(next))){status('The game dispatch control is unavailable. No sharing or posting was started.');return;}
    const csrf=document.querySelector('meta[name="csrf-token"]')?.content||document.querySelector('input[name="authenticity_token"]')?.value;
    if(note&&!csrf){status('The game security token is unavailable. Refresh this mission before posting a note.');return;}
    const current=++ticket,key=JSON.stringify([note,!!chat]);setBusy(true);status('Sharing mission…');
    try{
      if(!shared){stage='share';await request(`/missions/${missionId}/alliance`);if(current!==ticket)return;shared=true;}
      if(note&&!posted.has(key)){
        stage='note';status('Posting mission note…');const body=new URLSearchParams({utf8:'✓',authenticity_token:csrf,'mission_reply[content]':note,'mission_reply[mission_id]':missionId,'mission_reply[alliance_chat]':chat?'1':'0'});
        await request('/mission_replies',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});if(current!==ticket)return;posted.add(key);
      }
      stage='dispatch';const native=target(next);
      if(current!==ticket||!visible()||location.pathname.split('/')[2]!==missionId)return;
      if(!usable(native)){status('Sharing completed, but the game dispatch control is unavailable. Select your units, then try again.');return;}
      dispatched=true;setBusy(false);status('Handed to the game dispatch control. Reopen the mission before another combined action.');dispatching=true;
      try{native.click();}finally{dispatching=false;}
    }catch(error){
      if(current!==ticket)return;
      // A failed/aborted note response may already have committed. Never retry it automatically.
      if(stage==='note'){uncertain=true;status('The note could not be confirmed. Check the mission notes before reopening this mission to retry. No dispatch was started.');}
      else status(`${error.name==='AbortError'?'Sharing timed out.':error.message||'Sharing request failed.'} No dispatch was started.`);
    }finally{if(current===ticket){stage='';setBusy(false);}}
  }
  function otherDispatch(event){if(!busy||dispatching||!event.target.closest?.('#mission_alarm_btn,#alert_next_btn'))return;uncertain=stage==='note';ticket++;controller?.abort();stage='';setBusy(false);status('Combined action stopped because another dispatch control was used.');}
  function outside(event){if(popover&&!popover.contains(event.target)&&!root?.contains(event.target))closePanel();}
  function keydown(event){if(event.key==='Escape'&&popover){event.preventDefault();closePanel(true);}}
  function activate(){
    if(root?.isConnected||!visible())return;
    const native=target(false);toolbar=document.getElementById('container_navbar_alarm');
    if(!native||!toolbar?.contains(native)){toolbar=null;return;}
    originalClass=toolbar.classList.contains('nx-command-toolbar');toolbar.classList.add('nx-command-toolbar');
    root=el('span');root.id='nx-command-tools';root.append(el('strong','Nexus'));
    root.firstChild.className='nx-command-brand';
    for(const next of [false,true]){if(!target(next))continue;const trigger=button(next?'Share + dispatch + next':'Share + dispatch',node=>openShare(node,next),next?'next':'share');trigger.dataset.nxShare='1';trigger.dataset.nxAction=next?'next':'stay';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');root.append(trigger);}
    const selected=button('Selected units',openVehicles,'car');selected.dataset.nxAction='vehicles';selected.setAttribute('aria-haspopup','dialog');selected.setAttribute('aria-expanded','false');selected.append(icon('down'));root.append(selected);
    const feedback=el('span');feedback.id='nx-command-status';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');root.append(feedback);
    const spacer=toolbar.querySelector('#navbar-alarm-spacer');if(spacer)spacer.before(root);else toolbar.append(root);
    toolbar.addEventListener('click',otherDispatch,true);document.addEventListener('click',outside);document.addEventListener('keydown',keydown);window.addEventListener('resize',position);setBusy(false);
  }
  function suspend(){ticket++;if(busy&&stage==='note')uncertain=true;controller?.abort();clearTimeout(timeout);timeout=null;controller=null;busy=false;stage='';closePanel();if(toolbar){toolbar.removeEventListener('click',otherDispatch,true);if(!originalClass)toolbar.classList.remove('nx-command-toolbar');}root?.remove();root=null;toolbar=null;document.removeEventListener('click',outside);document.removeEventListener('keydown',keydown);window.removeEventListener('resize',position);}
  window.addEventListener('pagehide',suspend);window.addEventListener('pageshow',activate);window.addEventListener('focus',activate);document.addEventListener('visibilitychange',()=>document.hidden?suspend():activate());activate();
})();
