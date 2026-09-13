/* User-triggered alliance support. One native mission frame, released after each job. */
(() => {
  'use strict';
  if (window !== window.top || location.pathname !== '/' || !globalThis.NexusAllianceCore || globalThis.__NEXUS_ALLIANCE_SUPPORT__ || globalThis.NexusSettings?.enabled('allianceSupport') === false) return;
  const C = NexusAllianceCore, nf = new Intl.NumberFormat('en-GB');
  const recordKey = 'nexusAllianceSupportResultsV1', leaseKey = 'nexusAllianceSupportLeaseV1';
  const owner = crypto.randomUUID(), selected = new Set(), reserved = new Set();
  let records = {}, items = [], busy = false, cancelled = false, frame = null, panel, launcher, list, status, total, send, stop, joined, value, sort, observer, timer, lastHeartbeat = 0;
  let supportedIds=new Set(), supportReadState='unread', supportReadAt=0, supportAttemptAt=0, supportRead=null, supportAbort=null, supportHint;
  function readRecords() { try { const data=JSON.parse(localStorage.getItem(recordKey)||'{}'); records=Object.fromEntries(Object.entries(data).filter(([id,r])=>C.id(id)&&r&&['sent','uncertain'].includes(r.state)&&C.id(r.vehicle)&&Number.isFinite(r.at)&&(r.state==='uncertain'||Date.now()-r.at<86400000))); } catch { records={}; } }
  function saveRecord(id, state, vehicle) {
    readRecords();if(!records[id]&&Object.keys(records).length>=2000)throw Error('Support history is full. Check unconfirmed dispatches before sending more.');records[id]={state,vehicle,at:Date.now()};
    // A send is never attempted unless its pending record can be persisted.
    localStorage.setItem(recordKey,JSON.stringify(records));
  }
  function forgetRecord(id) { readRecords();delete records[id];localStorage.setItem(recordKey,JSON.stringify(records)); }
  function el(tag,text,cls) { const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node; }
  function button(text,action,cls) { const node=el('button',text,cls);node.type='button';node.addEventListener('click',action);return node; }
  function say(text) { status.textContent=text; }
  function autoBusy() { return typeof window.__NEXUS_AUTO_DISPATCH_BUSY__ !== 'function' || window.__NEXUS_AUTO_DISPATCH_BUSY__(); }
  function heartbeat() {
    if (Date.now()-lastHeartbeat<10000) return;
    localStorage.setItem(leaseKey,JSON.stringify({owner,until:Date.now()+120000}));lastHeartbeat=Date.now();
  }
  function releaseLease() { try { if(JSON.parse(localStorage.getItem(leaseKey)||'null')?.owner===owner)localStorage.removeItem(leaseKey); } catch {} }
  function already(item) { return item.joined === true || supportedIds.has(item.id) || records[item.id]?.state === 'sent'; }
  async function refreshParticipation(force=false) {
    if(supportRead)return supportRead;
    if(!force&&Date.now()-supportAttemptAt<30000)return supportReadState==='ready';
    supportAttemptAt=Date.now();supportReadState='loading';render();
    const abort=new AbortController();supportAbort=abort;
    const timeout=setTimeout(()=>abort.abort(),20000);
    supportRead=(async()=>{
      try {
        const response=await fetch('/api/vehicles',{credentials:'same-origin',redirect:'error',cache:'no-store',headers:{Accept:'application/json'},signal:abort.signal});
        if(!response.ok){await response.body?.cancel();throw Error('Vehicle read failed.');}
        const reader=response.body.getReader(),decoder=new TextDecoder();let raw='',bytes=0;
        try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>12*1024*1024){await reader.cancel();throw Error('Vehicle list is too large.');}raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}
        supportedIds=C.supportedMissions(JSON.parse(raw));supportReadState='ready';supportReadAt=Date.now();
        for(const item of items)if(already(item)){selected.delete(item.id);if(!busy){item.progress='';item.error=false;}}
        return true;
      } catch { supportReadState='error';return false; }
      finally {clearTimeout(timeout);supportRead=null;supportAbort=null;render();}
    })();
    return supportRead;
  }
  function refresh(force=false) {
    readRecords(); const previous=new Map(items.map(item=>[item.id,item]));
    items=C.missions(document).filter(item=>item.credits!==0).map(fresh=>Object.assign(previous.get(fresh.id)||{},fresh));
    const current=new Set(items.map(item=>item.id));
    for(const id of selected)if(!current.has(id)||already(items.find(item=>item.id===id)))selected.delete(id);
    // Only confirmed records for missions removed from the live list expire here.
    // Uncertain requests survive refreshes until the user checks their result.
    for(const [id,record]of Object.entries(records))if(record.state==='sent'&&!current.has(id)&&Date.now()-record.at>86400000)delete records[id];
    render();if(panel&&!panel.hidden)void refreshParticipation(force);
  }
  function render() {
    if (!panel || panel.hidden) return;
    const fragment=document.createDocumentFragment();let visible=0;
    for(const item of [...items].sort((a,b)=>a.credits===null?(b.credits===null?0:1):b.credits===null?-1:(sort.value==='low'?a.credits-b.credits:b.credits-a.credits))) {
      const supported=already(item), pending=records[item.id]?.state==='uncertain';
      if ((!joined.checked&&supported)||!C.inRange(item.credits,value.value))continue;
      visible++;
      const row=el('div',undefined,'nx-as-row');row.dataset.mission=item.id;
      const description=el('div',undefined,'nx-as-description');const link=el('a',item.name);link.href='/missions/'+item.id;link.className='lightbox-open';
      description.append(link,el('small','M'+item.id+' · '+(item.credits===null?'Value unavailable':'≈ '+nf.format(item.credits)+' credits')));
      const detail=el('span',records[item.id]?.state==='sent'?'Sent: 1 Fire Officer':supported?'Supported':item.progress||(pending?'Check dispatch result':supportReadState==='ready'?'Not supported':'Participation not verified'),'nx-as-state');
      if(item.error||pending)detail.classList.add('nx-as-warning');description.append(detail);row.append(description);
      const actions=el('div',undefined,'nx-as-row-actions');
      const pick=button(selected.has(item.id)?'Selected':'Select',()=>{selected.has(item.id)?selected.delete(item.id):selected.add(item.id);render();});pick.setAttribute('aria-pressed',String(selected.has(item.id)));pick.disabled=busy||supported||pending||supportReadState!=='ready';
      const support=button(pending?'Check result':'Support',()=>void (pending?run([item.id],true):run([item.id])),'nx-as-primary');support.disabled=busy||supported||(!pending&&supportReadState!=='ready');
      actions.append(pick,support);row.append(actions);fragment.append(row);
    }
    if(!visible)fragment.append(el('p',items.length?'No missions match these filters.':'No shared alliance missions are in the game’s mission list.','nx-as-empty'));
    const focused=document.activeElement?.closest('[data-mission]');const focusId=focused?.dataset.mission;const focusIndex=focused?[...focused.querySelectorAll('button')].indexOf(document.activeElement):-1;
    list.replaceChildren(fragment);
    if(focusId&&focusIndex>=0)list.querySelector('[data-mission="'+focusId+'"]')?.querySelectorAll('button')[focusIndex]?.focus({preventScroll:true});
    total.textContent=`${visible} of ${items.length} shared missions · ${selected.size} selected`;
    supportHint.textContent=supportReadState==='ready'?`Supported missions checked against your vehicles at ${new Date(supportReadAt).toLocaleTimeString()}.`:supportReadState==='loading'?'Checking your vehicles for supported missions…':'Could not verify supported missions. Refresh to retry; known support is retained.';
    send.textContent=selected.size?`Support selected (${selected.size})`:'Support selected';send.disabled=busy||!selected.size||supportReadState!=='ready';stop.hidden=!busy;stop.disabled=cancelled;
    launcher.textContent=busy?'Alliance missions · sending':'Alliance missions';
  }
  function observe() {
    observer?.disconnect();if(panel.hidden&&!busy)return;
    observer=new MutationObserver(changes=>{
      if(!changes.some(change=>change.target.closest?.('#mission_list_alliance,#mission_list_alliance_event,#mission_list_alliance_event_missions')||[...change.addedNodes,...change.removedNodes].some(n=>n.nodeType===1&&(n.matches?.('[id^="mission_list_alliance"],.missionSideBarEntry')||n.querySelector?.('[id^="mission_list_alliance"]')))))return;
      clearTimeout(timer);timer=setTimeout(refresh,300);
    });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-mission-participation-filter','data-sortable-by','data-sortable_by']});
  }
  function open() { panel.hidden=false;launcher.setAttribute('aria-expanded','true');refresh(true);observe();panel.querySelector('button').focus(); }
  function close() { panel.hidden=true;launcher.setAttribute('aria-expanded','false');list.replaceChildren();observe();launcher.focus(); }
  function mount() {
    const nexus=document.getElementById('mcn-v3-map-controller');if(!nexus)return false;
    launcher=button('Alliance missions',()=>panel.hidden?open():close());launcher.id='nx-alliance-launcher';launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','nx-alliance-panel');nexus.after(launcher);
    const style=el('style');style.textContent=`
      #nx-alliance-launcher{float:left;margin:7px 4px;padding:7px 10px;min-height:36px;background:#153b57;border:1px solid #82bedb;border-radius:6px;color:#edf6ff;font:600 12px system-ui;cursor:pointer}
      #nx-alliance-panel{--as-scale:1;position:fixed;z-index:2147483647;top:62px;left:24px;width:min(780px,calc(100vw - 48px));max-height:calc(100dvh - 84px);box-sizing:border-box;display:flex;flex-direction:column;background:#102337;color:#e8f1fc;border:1px solid #54728d;border-radius:12px;box-shadow:0 12px 40px #0006;font:13px system-ui;text-align:left}
      #nx-alliance-panel *{box-sizing:border-box}#nx-alliance-panel [hidden],#nx-alliance-panel[hidden]{display:none!important}
      #nx-alliance-panel header,#nx-alliance-panel footer,#nx-alliance-panel .nx-as-filters{padding:14px;flex:none}#nx-alliance-panel header{display:flex;justify-content:space-between;gap:10px;align-items:center;border-bottom:1px solid #36516b}#nx-alliance-panel h2{font-size:18px;color:#eff8ff;margin:0 0 3px}#nx-alliance-panel p{margin:5px 0;color:#becfdf;font-size:12px}#nx-alliance-panel button,#nx-alliance-panel select{font:600 12px system-ui;padding:8px 11px;min-height:36px;border:1px solid #607e98;border-radius:5px;color:#f1f7ff;background:#19374f;cursor:pointer}#nx-alliance-panel :disabled{opacity:.5;cursor:default}#nx-alliance-panel button[aria-pressed=true]{background:#317da7;border-color:#a2dcff}#nx-alliance-panel button.nx-as-primary{background:#25658a;border-color:#79bcdf}#nx-alliance-panel button:focus-visible,#nx-alliance-panel a:focus-visible,#nx-alliance-panel select:focus-visible{outline:2px solid #a0e1ff;outline-offset:2px}
      #nx-alliance-panel .nx-as-filters{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding-bottom:8px}#nx-alliance-panel label{display:flex;align-items:center;gap:8px;font-weight:500;margin:0}#nx-alliance-panel input[type=checkbox]{appearance:none;width:calc(34px * var(--as-scale));height:calc(20px * var(--as-scale));border:1px solid #7993aa;border-radius:20px;background:#334a60;margin:0;position:relative;cursor:pointer}#nx-alliance-panel input[type=checkbox]::after{content:'';position:absolute;top:calc(2px * var(--as-scale));left:calc(2px * var(--as-scale));width:calc(14px * var(--as-scale));height:calc(14px * var(--as-scale));border-radius:50%;background:#ecf4fc}#nx-alliance-panel input[type=checkbox]:checked{background:#277aa9}#nx-alliance-panel input[type=checkbox]:checked::after{left:calc(16px * var(--as-scale))}#nx-alliance-panel input[type=checkbox]:focus-visible{outline:2px solid #a0e1ff;outline-offset:2px}#nx-alliance-panel .nx-as-count{padding:0 14px 10px;color:#bacddd;font-size:12px}#nx-alliance-panel .nx-as-list{min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:0 14px;flex:1}
      #nx-alliance-panel .nx-as-row{display:flex;gap:12px;justify-content:space-between;align-items:center;border-top:1px solid #314960;padding:12px 0}#nx-alliance-panel .nx-as-description{min-width:0;display:flex;flex-direction:column;gap:4px;overflow-wrap:anywhere}#nx-alliance-panel a{color:#e9f4ff;font-weight:600;text-decoration:none}#nx-alliance-panel small{color:#a9c1d7;font-size:11px}#nx-alliance-panel .nx-as-state{font-size:11px;color:#94dabb}#nx-alliance-panel .nx-as-warning{color:#ffc36d}#nx-alliance-panel .nx-as-row-actions{display:flex;gap:6px;flex-shrink:0}#nx-alliance-panel footer{border-top:1px solid #36516b;background:#122b40;border-radius:0 0 12px 12px}#nx-alliance-panel .nx-as-bulk{display:flex;gap:8px;flex-wrap:wrap}#nx-alliance-panel [role=status]{margin-top:9px;color:#c3d9ea;font-size:12px}
      html[data-nexus-touch=true] #nx-alliance-panel :is(button,select,label){min-height:44px}html[data-nexus-layout=phone] #nx-alliance-panel,html[data-nexus-desktop-phone] #nx-alliance-panel{--as-scale:var(--nx-ui-scale,1);top:var(--nx-visible-top,8px);left:var(--nx-visible-left,8px);width:var(--nx-visible-width,calc(100vw - 16px));max-height:var(--nx-visible-height,calc(100dvh - 16px));font-size:calc(13px * var(--as-scale))}html[data-nexus-layout=phone] #nx-alliance-panel .nx-as-row,html[data-nexus-desktop-phone] #nx-alliance-panel .nx-as-row{align-items:flex-start;flex-direction:column}html[data-nexus-desktop-phone] #nx-alliance-panel :is(button,select,label){font-size:calc(12px * var(--as-scale));min-height:calc(44px * var(--as-scale))}html[data-nexus-desktop-phone] #nx-alliance-panel :is(small,p,.nx-as-state,.nx-as-count,[role=status]){font-size:calc(11px * var(--as-scale))}html[data-nexus-desktop-phone] #nx-alliance-panel h2{font-size:calc(18px * var(--as-scale))}html[data-nexus-desktop-phone] #nx-alliance-launcher{font-size:calc(12px * var(--nx-ui-scale,1));min-height:calc(36px * var(--nx-ui-scale,1))}
      @media(max-width:500px){#nx-alliance-panel{top:8px;left:8px;width:calc(100vw - 16px);max-height:calc(100dvh - 16px)}#nx-alliance-panel .nx-as-row{align-items:flex-start;flex-direction:column}}
      html[data-nexus-layout=phone] #nx-alliance-panel,html[data-nexus-desktop-phone] #nx-alliance-panel{--as-scale:1;transform:scale(var(--nx-ui-scale,1));transform-origin:top left}
    `;document.head.append(style);
    panel=el('section');panel.id='nx-alliance-panel';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','Alliance missions');
    const header=el('header'),heading=el('div');heading.append(el('h2','Alliance missions'),el('p','Send one closest available Fire Officer per mission.'));header.append(heading,button('Close',close));panel.append(header);
    const filters=el('div',undefined,'nx-as-filters'),joinedLabel=el('label');joined=el('input');joined.type='checkbox';joinedLabel.append(joined,document.createTextNode('Show already supported'));joined.addEventListener('change',()=>{render();void refreshParticipation(true);});
    const valueLabel=el('label','Value');value=el('select');value.setAttribute('aria-label','Mission value');for(const [key,label]of C.ranges){const option=el('option',label);option.value=key;value.append(option);}value.addEventListener('change',render);valueLabel.append(value);const sortLabel=el('label','Sort');sort=el('select');sort.setAttribute('aria-label','Sort mission value');for(const [key,label]of [['high','Highest first'],['low','Lowest first']]){const option=el('option',label);option.value=key;sort.append(option);}try{sort.value=localStorage.getItem('nexusAllianceValueSort')==='low'?'low':'high';}catch{}sort.addEventListener('change',()=>{try{localStorage.setItem('nexusAllianceValueSort',sort.value);}catch{}render();});sortLabel.append(sort);filters.append(joinedLabel,valueLabel,sortLabel,button('Refresh',()=>{void refreshParticipation(true);refresh();}));panel.append(filters);
    total=el('div',undefined,'nx-as-count');supportHint=el('div',undefined,'nx-as-count');supportHint.dataset.supportRead='1';panel.append(total,supportHint);list=el('div',undefined,'nx-as-list');panel.append(list);
    const footer=el('footer'),bulk=el('div',undefined,'nx-as-bulk');send=button('Support selected',()=>void run([...selected]),'nx-as-primary');stop=button('Stop queue',()=>{cancelled=true;say('Stopping after the current dispatch result is checked.');render();});stop.hidden=true;bulk.append(send,button('Clear selection',()=>{if(!busy){selected.clear();render();}}),stop);status=el('div','Choose missions, then support them individually or as a batch.');status.setAttribute('role','status');footer.append(bulk,status);panel.append(footer);document.body.append(panel);
    panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}});
    return true;
  }
  function usable(node) {
    if(!C.enabled(node)||node.closest('[hidden],.hidden'))return false;
    for(let n=node;n&&n.nodeType===1;n=n.parentElement)if(n.ownerDocument.defaultView.getComputedStyle(n).display==='none')return false;
    return true; // Frame visibility is deliberately hidden; native controls inside remain usable.
  }
  function docFor(id) {
    const doc=frame?.contentDocument;if(!doc)return null;
    const url=new URL(doc.URL);if(url.origin!==location.origin||!new RegExp('^/missions/'+id+'(?:/alarm)?/?$').test(url.pathname))return null;
    return doc;
  }
  async function waitFor(test,ms,message,afterSend=false) {
    const until=Date.now()+ms;
    while(Date.now()<until){heartbeat();if(cancelled&&!afterSend)throw Error('Queue stopped.');const result=test();if(result)return result;await new Promise(resolve=>setTimeout(resolve,150));}
    throw Error(message);
  }
  async function load(id) {
    frame=document.createElement('iframe');frame.name='nexus-alliance-support-'+owner;frame.dataset.nxAllianceWorker='1';frame.setAttribute('data-mcn-v3-pipeline-preload','');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
    // No top-navigation permission: native dispatch cannot replace the open list.
    frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms');frame.style.cssText='position:fixed;left:-12000px;top:0;width:1100px;height:800px;visibility:hidden;pointer-events:none;border:0';frame.src='/missions/'+id;document.body.append(frame);
    return waitFor(()=>{const doc=docFor(id);return doc?.readyState==='complete'&&doc.querySelector('#mission_alarm_btn')&&doc;},30000,'Mission did not finish loading. It may have ended or require sign-in.');
  }
  async function loadVehicles(id) {
    let pages=0,previous='';const deadline=Date.now()+90000;
    while(Date.now()<deadline){
      const doc=docFor(id);if(!doc)throw Error('Mission changed before dispatch.');
      const loadControls=[...doc.querySelectorAll('a.missing_vehicles_load')];
      const loads=loadControls.filter(usable);
      if(loadControls.some(n=>!C.enabled(n)&&!n.closest('[hidden],.hidden')&&doc.defaultView.getComputedStyle(n).display!=='none')){
        await waitFor(()=>loadControls.every(n=>!n.isConnected||C.enabled(n)||n.closest('[hidden],.hidden')||doc.defaultView.getComputedStyle(n).display==='none'),15000,'Vehicle loading did not finish.');continue;
      }
      const loading=[...doc.querySelectorAll('#vehicle_table .loading,#vehicle_table .spinner,.vehicle_select_table .loading,.vehicle_select_table .spinner,[data-vehicle-loading="true"]')].some(usable);
      if(loading){await waitFor(()=>!([...doc.querySelectorAll('.vehicle_select_table .loading,.vehicle_select_table .spinner,#vehicle_table .loading,#vehicle_table .spinner,[data-vehicle-loading="true"]')].some(usable)),15000,'Vehicle loading did not finish.');continue;}
      if(!loads.length){
        const signature=[...doc.querySelectorAll('input.vehicle_checkbox')].map(C.vehicleId).join(',');
        await new Promise(resolve=>setTimeout(resolve,700));
        if(signature!==[...doc.querySelectorAll('input.vehicle_checkbox')].map(C.vehicleId).join(',')||[...doc.querySelectorAll('a.missing_vehicles_load')].some(usable))continue;
        return doc;
      }
      if(++pages>40)throw Error('Vehicle list is still incomplete. Open the mission to check its range.');
      const control=loads[0],signature=[...doc.querySelectorAll('input.vehicle_checkbox')].map(C.vehicleId).join(',')+'|'+control.getAttribute('href');
      if(signature===previous)throw Error('The next vehicle page did not load.');previous=signature;
      control.click();
      await waitFor(()=>!control.isConnected||!usable(control)||signature!==[...doc.querySelectorAll('input.vehicle_checkbox')].map(C.vehicleId).join(',')+'|'+control.getAttribute('href'),15000,'The next vehicle page did not load.');
      await new Promise(resolve=>setTimeout(resolve,650));
    }
    throw Error('Vehicle list loading timed out.');
  }
  async function support(item,checkOnly) {
    let clicked=false,chosen=null;
    const progress=text=>{item.progress=text;render();};
    try {
      progress(checkOnly?'Checking previous dispatch…':'Loading mission…');await load(item.id);
      let doc=docFor(item.id);const record=records[item.id];
      if(record?.state==='uncertain') {
        if(C.success(doc,record.vehicle)||C.attending(doc,record.vehicle)){saveRecord(item.id,'sent',record.vehicle);progress('Support confirmed');selected.delete(item.id);return 'sent';}
        doc=await loadVehicles(item.id);
        const available=[...doc.querySelectorAll('input.vehicle_checkbox')].find(box=>C.vehicleId(box)===record.vehicle&&C.enabled(box)&&!box.checked);
        if(available){forgetRecord(item.id);progress('Officer still available. You can try Support again.');return 'checked';}
        throw Error('Dispatch is still unconfirmed. Check this mission before sending another officer.');
      }
      if(checkOnly)return 'checked';
      progress('Finding closest Fire Officer…');doc=await loadVehicles(item.id);
      if(autoBusy())throw Error('Stop Auto Mode before sending alliance support.');
      const fresh=C.missions(document).find(m=>m.id===item.id);if(!fresh)throw Error('This mission is no longer in the shared list.');
      if(already(fresh)){selected.delete(item.id);progress('Already supported');return 'joined';}
      // Respect selections in the visible mission window as well as this batch.
      const unavailable=new Set(reserved);
      const docs=[document];for(const other of document.querySelectorAll('iframe'))if(other!==frame){try{if(other.contentDocument)docs.push(other.contentDocument);}catch{}}
      for(const other of docs)for(const box of other.querySelectorAll('input.vehicle_checkbox:checked'))unavailable.add(C.vehicleId(box));
      const candidates=C.officers(doc,unavailable);chosen=candidates.items[0];
      if(!chosen)throw Error(candidates.unknownOrder?'The game has not reported officer travel times. Open the mission to check.':'No available Fire Officer in this mission’s vehicle range.');
      for(const box of doc.querySelectorAll('input.vehicle_checkbox:checked'))box.click();
      chosen.box.click();
      const dispatch=await waitFor(()=>{const current=docFor(item.id),button=current?.querySelector('a#mission_alarm_btn');return button&&usable(button)&&/^dispatch\b/i.test(C.clean(button.textContent))&&!/\bnext\b/i.test(button.title)&&Number(C.clean(button.querySelector('#vehicle_amount')?.textContent))===1&&button;},4000,'The game could not prepare exactly one officer for dispatch.');
      const latest=C.missions(document).find(m=>m.id===item.id);
      if(latest&&already(latest)){selected.delete(item.id);progress('Already supported');return 'joined';}
      const picked=new Set([...doc.querySelectorAll('input.vehicle_checkbox:checked')].map(C.vehicleId));
      if(!latest||docFor(item.id)!==doc||!C.enabled(chosen.box)||autoBusy()||cancelled||picked.size!==1||!picked.has(chosen.id))throw Error('Selection changed before dispatch. No support was sent.');
      const previousAlerts=new Set(doc.querySelectorAll('.alert.alert-success'));
      saveRecord(item.id,'uncertain',chosen.id);reserved.add(chosen.id);
      progress('Sending 1 Fire Officer…');clicked=true;dispatch.click();
      await waitFor(()=>{const current=docFor(item.id);return current&&(C.success(current,chosen.id,previousAlerts)||C.attending(current,chosen.id));},20000,'Dispatch could not be confirmed. Use Check result before trying again.',true);
      saveRecord(item.id,'sent',chosen.id);selected.delete(item.id);progress('Sent: 1 Fire Officer');return 'sent';
    } catch(error) {
      item.error=true;progress(error.message||'Support could not be completed.');
      if(clicked)say('A dispatch result is unconfirmed. The queue has stopped; use Check result on that mission.');
      return clicked?'uncertain':'failed';
    } finally { frame?.remove();frame=null; }
  }
  async function run(ids,checkOnly=false) {
    if(busy||!ids.length)return;
    if(!checkOnly&&autoBusy()){say('Stop Auto Mode, then send alliance support. Your selections are kept.');return;}
    if(!navigator.locks?.request){say('This browser cannot lock background dispatch safely. Use the mission’s normal dispatch control.');return;}
    busy=true;cancelled=false;render();observe();
    try {
      await navigator.locks.request('nexus-alliance-support-v1',{mode:'exclusive',ifAvailable:true},async lock=>{
        if(!lock){say('Alliance support is already sending in another game tab.');return;}
        if(!checkOnly&&autoBusy()){say('Stop Auto Mode before sending alliance support.');return;}
        if(!checkOnly&&!await refreshParticipation(true)){say('Supported missions could not be verified. Refresh before sending support.');return;}
        lastHeartbeat=0;heartbeat();reserved.clear();readRecords();
        for(const r of Object.values(records))if(r.state==='uncertain')reserved.add(r.vehicle);
        let sentCount=0,failed=0;
        for(const id of [...new Set(ids)]) {
          if(cancelled)break;
          const item=items.find(m=>m.id===id);if(!item||already(item))continue;
          if(records[id]?.state==='uncertain'&&!checkOnly){failed++;continue;}
          item.error=false;say(`Working through ${ids.length} mission${ids.length===1?'':'s'} · ${sentCount} sent`);
          const result=await support(item,checkOnly);if(result==='sent')sentCount++;if(result==='failed')failed++;
          render();if(result==='uncertain')return;
        }
        say(checkOnly?'Result checked. See the mission row for its status.':`${cancelled?'Queue stopped':'Queue finished'} · ${sentCount} supported${failed?' · '+failed+' need attention':''}.`);
      });
    } catch(error) { say(error.message||'Could not start alliance support.'); }
    finally {releaseLease();busy=false;cancelled=false;frame?.remove();frame=null;reserved.clear();render();observe();}
  }
  globalThis.__NEXUS_ALLIANCE_SUPPORT__=Object.freeze({get busy(){return busy;}});
  window.addEventListener('pagehide',()=>{cancelled=true;frame?.remove();frame=null;supportAbort?.abort();observer?.disconnect();clearTimeout(timer);releaseLease();});
  window.addEventListener('storage',event=>{if(event.key===recordKey&&!busy&&panel&&!panel.hidden)refresh();});
  if(!mount()) {
    const discovery=new MutationObserver(()=>{if(mount()){discovery.disconnect();clearTimeout(expiry);}});
    discovery.observe(document.body,{childList:true,subtree:true});const expiry=setTimeout(()=>discovery.disconnect(),20000);
  }
})();
