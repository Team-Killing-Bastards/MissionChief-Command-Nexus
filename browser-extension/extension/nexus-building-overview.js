/* Compact manual building overview; native links and extension controls remain in place. */
(() => {
  'use strict';
  const id=location.pathname.match(/^\/buildings\/(\d+)\/?$/)?.[1];
  if(!id||window.__NEXUS_BUILDING_OVERVIEW__||!window.__NEXUS_BUILDING_DATA__||!window.__NEXUS_BUILDING_CORE__)return;
  const flags=window.__NEXUS_COMFORT_DATA__?.flags?.extendedBuilding||{};
  if(!flags.personnelDemands&&!flags.expansions)return;
  function worker(){try{let w=window;while(true){if(/^mcn-v3-(active-worker|pipeline-preload|retired-worker)-/.test(w.name||''))return true;if(w===w.top)return false;if(w.frameElement?.matches('[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload],#mcn-v3-background-mission-worker'))return true;w=w.parent;}}catch{return true;}}
  if(worker()||!document.querySelector('dl.dl-horizontal'))return;
  const D=window.__NEXUS_BUILDING_DATA__,C=window.__NEXUS_BUILDING_CORE__,P=window.__NEXUS_PERSONNEL_READER__;
  let active=false,root=null,left=null,right=null,crew=null,sourceList=null,fleet=null,partial=false,staff=null,staffError='',staffTried=false,controller=null,generation=0,refreshFleet=null,readAt=0,extensionKey='',extensionObserver=null,extensionSource=null,extensionTimer=null;
  const state=window.__NEXUS_BUILDING_OVERVIEW__={activate,suspend,setFleet,failFleet,expansions,staffFetches:0,extensionPasses:0,model:null};
  const txt=(v,n=200)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n),nf=v=>Number(v).toLocaleString('en-GB');
  function el(tag,value,cls){const n=document.createElement(tag);n.dataset.nexusBuilding='1';n.dataset.nexusComfort='1';if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;}
  function visible(){if(!active||document.hidden||worker())return false;try{let w=window;while(w!==w.top){const f=w.frameElement;if(!f||f.hidden||f.getAttribute('aria-hidden')==='true')return false;const css=w.parent.getComputedStyle(f);if(css.display==='none'||css.visibility==='hidden'||!f.getClientRects().length)return false;w=w.parent;}return true;}catch{return false;}}
  const style=el('style');style.textContent=`
  #nx-building-overview{display:grid;grid-template-columns:minmax(380px,.9fr) minmax(390px,1.1fr);align-items:start;gap:16px;margin:12px 0;font:12px system-ui,sans-serif;color:#e8f0fb}#nx-building-overview *{box-sizing:border-box}
  #nx-building-overview .nx-building-left>dl{float:none;width:100%;padding:0;margin:0 0 10px}#nx-building-overview .nx-building-left>dl:after{content:'';display:block;clear:both}#nx-building-overview dt{color:inherit}#nx-building-overview #nx-required-label{clear:left}#nx-building-overview #nx-required-personnel{color:#9ed9ff;font-weight:600}#nx-building-overview #nx-required-personnel small{display:block;font-weight:normal;color:#cad7e5}
  #nx-building-overview .nx-building-panel{min-width:0;background:#102338;border:1px solid #7891aa;border-left:4px solid #579cc5;border-radius:5px;padding:10px 12px}#nx-building-overview h3{font:600 13px system-ui,sans-serif;margin:0 0 8px;color:#b9e1fc}#nx-building-overview p{margin:6px 0;color:#cad7e5;font-size:11px}#nx-building-overview button,#nx-building-overview .nx-building-link{font:inherit;background:#1d415d;border:1px solid #7193ac;color:#e8f0fb;border-radius:4px;padding:4px 7px;margin-top:6px;cursor:pointer}#nx-building-overview button:disabled{opacity:.5}#nx-building-overview a{color:#a1dbff}
  #nx-specialist-table{border-collapse:collapse;width:100%;font:11px system-ui,sans-serif}#nx-specialist-table th,#nx-specialist-table td{padding:7px 5px;border-bottom:1px solid #6685a14d;text-align:right;vertical-align:middle}#nx-specialist-table th:first-child,#nx-specialist-table td:first-child{text-align:left}#nx-specialist-table th{color:#b9e1fc;font-weight:600}#nx-specialist-table .nx-covered{color:#8de0ad}#nx-specialist-table .nx-gap{color:#ffca83}#nx-specialist-table .nx-unverified{color:#ccd6e4}
  #nx-extension-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#nx-extension-grid .nx-extension-item{background:#17354b;border-radius:4px;padding:7px;min-width:0}#nx-extension-grid .nx-extension-name{display:block;font-size:11px;margin-bottom:5px;color:#d5eafb}#nx-extension-grid .nx-extension-slots{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:3px}#nx-extension-grid .nx-extension-state{display:block;border-radius:3px;padding:4px;text-align:center;font-size:10px;line-height:1.25;font-weight:600;color:white;background:#486077;overflow-wrap:anywhere}#nx-extension-grid .nx-ext-ready{background:#247047}#nx-extension-grid .nx-ext-unbuilt{background:#286895}#nx-extension-grid .nx-ext-inactive{background:#9b433d}#nx-extension-grid .nx-ext-building{background:#8c641b}#nx-extension-grid .nx-ext-pending{background:#366a7b}
  @media(max-width:850px){#nx-building-overview{grid-template-columns:minmax(0,1fr)}#nx-building-overview .nx-building-left>dl{max-width:100%}}@media(max-width:430px){#nx-extension-grid{grid-template-columns:minmax(0,1fr)}#nx-specialist-table th,#nx-specialist-table td{padding:6px 3px;font-size:10px}}
  `;document.head.append(style);
  function mount(){
    if(root?.isConnected)return true;sourceList=document.querySelector('dl.dl-horizontal');if(!sourceList)return false;
    root=el('div');root.id='nx-building-overview';sourceList.before(root);left=el('div',undefined,'nx-building-left');root.append(left);left.append(sourceList);
    if(flags.personnelDemands){const dt=el('dt','Required personnel');dt.id='nx-required-label';const dd=el('dd','Loading crew…');dd.id='nx-required-personnel';sourceList.append(dt,dd);crew=el('section',undefined,'nx-building-panel');crew.id='nx-personnel-demand';left.append(crew);renderCrew();}
    if(flags.expansions){right=el('section',undefined,'nx-building-panel');right.id='nx-expansions';root.append(right);right.append(el('h3','Nexus · Building extensions'));const grid=el('div');grid.id='nx-extension-grid';right.append(grid);const link=el('a','Manage extensions','nx-building-link');link.href='#ausbauten';link.addEventListener('click',()=>document.querySelector('a[href="#extension"],a[href="#extensions"],a[href="#ausbauten"]:not([data-nexus-building])')?.click());right.append(link);}
    return true;
  }
  function renderCrew(){
    if(!crew)return;crew.replaceChildren(el('h3','Nexus · Specialist crew coverage'));
    const value=document.getElementById('nx-required-personnel');
    if(!fleet){if(value)value.textContent=staffError?'Crew data unavailable':'Loading crew…';crew.append(el('p',staffError||'Loading vehicle crew requirements…'));return;}
    const model=C.calculate(fleet,D,staff,partial);state.model=model;const t=model.total,uncertain=t.partial||t.unknown>0,prefix=uncertain?'Known totals: ':'';
    value.replaceChildren(document.createTextNode(`${prefix}min: ${nf(t.min)} (${nf(t.activeMin)}) / max: ${nf(t.max)} (${nf(t.activeMax)})`),el('small','Figures in brackets exclude status 6 vehicles.'));
    if(uncertain)crew.append(el('p',`Partial vehicle data: ${t.unknown} unknown definitions${t.partial?' or incomplete register':''}.`));
    if(model.training.length){
      const table=el('table');table.id='nx-specialist-table';const head=table.createTHead().insertRow();for(const name of ['Training','Crew min–max','Trained here','Assigned cover'])head.append(el('th',name));const body=table.createTBody();
      for(const g of model.training){const row=body.insertRow();row.dataset.nxTraining=g.name;const trained=staff?`${staff.partial?'≥ ':''}${g.trained}`:'—';
        const short=g.vehicles-g.full-g.unknown>0;
        const coverage=g.vehicles?`${g.full}/${g.vehicles}${short?' !':g.unknown?'':' ✓'}${g.unknown?` · ${g.unknown} unverified`:''}`:'Tow crew';
        [g.name,g.vehicles?`${g.min}–${g.max}`:'Tow crew',trained,coverage].forEach(v=>row.insertCell().textContent=v);
        row.cells[2].title=staff?`${g.free} unassigned trained staff. Multi-trained people appear in each matching training row.`:staffError||'Personnel not loaded yet.';
        row.cells[3].className=short?'nx-gap':g.unknown||!g.vehicles?'nx-unverified':'nx-covered';
        const reason=`${g.full} of ${g.vehicles} active vehicles are fully staffed and meet this training requirement.${short?' Warning: some vehicles have empty crew places or insufficient qualified assigned staff.':''}${g.unknown?' Some assignments cannot be verified; this is not a confirmed shortage.':''}${g.tow?' Trailer/towing crew requirements need checking separately.':''}`;
        row.cells[3].setAttribute('aria-label',reason);
        row.cells[3].title=[reason,...g.coverageDetails.slice(0,20).map(v=>v.status==='unknown'?`${v.name}: assignment unverified`:`${v.name}: ${v.assigned}/${v.max} crew assigned; ${v.qualified}/${v.target} trained required${v.status==='full'?' — full':' — needs attention'}`),...(g.coverageDetails.length>20?[`Plus ${g.coverageDetails.length-20} other vehicles`]:[])].join('\n');
        if(g.vehicles&&!g.unknown){const count=el('small',`${g.qualifiedAssigned}/${g.trainingTarget} trained assigned`);count.style.display='block';count.style.marginTop='3px';row.cells[3].append(count);}
      }
      crew.append(table);const notes=el('details');notes.append(el('summary','How coverage is counted'));notes.append(el('p','✓ means every active vehicle has its configured crew capacity filled and its training requirement met. Orange ! means empty crew places or insufficient trained assignees. Hover over Assigned cover for each vehicle’s counts. Minimum crew alone does not earn a tick; staff elsewhere in the station do not fill empty places.'));
      if(model.training.some(g=>g.tow))notes.append(el('p','Trailer training is shown, but towing-vehicle crew coverage is not inferred.'));crew.append(notes);
      if(staffError)crew.append(el('p',staffError));else if(!staff)crew.append(el('p','Reading this station’s personnel…'));else if(staff.partial)crew.append(el('p','Personnel list is incomplete; coverage is unverified.'));
    }else crew.append(el('p',t.unknown?'Specialist requirements unavailable for unknown vehicle types.':'No specialist training required by the active vehicles in this register.'));
    const foot=el('p',`${t.vehicles} station vehicles · ${t.paused} in status 6${readAt?` · Read ${new Date(readAt).toLocaleTimeString('en-GB')}`:''}`);foot.title='Assigned crew is not the current crew aboard.';crew.append(foot);
    const refresh=el('button','Refresh crew & training');refresh.type='button';refresh.disabled=!!controller;refresh.addEventListener('click',()=>{if(!visible()||controller)return;staff=null;staffTried=false;staffError='';renderCrew();refreshFleet?.();});crew.append(refresh);
  }
  async function readPersonnel(){
    if(!flags.personnelDemands)return;
    if(staffTried||controller||!visible()||!fleet?.some(v=>v.status!==6&&D[v.type]?.training.length))return;
    staffTried=true;const ticket=generation;controller=new AbortController();const current=controller,timeout=setTimeout(()=>current.abort(),15000);
    try{
      let doc=document,table=document.getElementById('personal_table');
      if(!table){state.staffFetches++;const response=await fetch(`/buildings/${id}/personals`,{credentials:'same-origin',redirect:'error',signal:current.signal});if(!response.ok)throw Error(`HTTP ${response.status}`);
        const reader=response.body.getReader(),decoder=new TextDecoder();let raw='',bytes=0;
        try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>4*1024*1024){await reader.cancel();throw Error('Personnel response too large');}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}
        doc=new DOMParser().parseFromString(raw,'text/html');raw='';table=doc.getElementById('personal_table');
      }
      if(!table)throw Error('Personnel table not returned');
      const rows=table.querySelectorAll('tbody tr'),people=[],seen=new Set(),layout=P.columns(table),names=P.nameIndex(fleet);let invalid=0;
      for(let i=0;i<Math.min(rows.length,10000);i++){if(i%200===0){await new Promise(r=>setTimeout(r,0));if(ticket!==generation||!visible())return;}const row=rows[i],person=P.read(row,layout,names);
        if(!person){if(txt(row.textContent)&&!row.querySelector('[colspan],th'))invalid++;continue;}
        if(person.identity&&seen.has(person.identity))continue;if(person.identity)seen.add(person.identity);
        if(!person.trainingKnown)invalid++;
        people.push({training:person.training,bound:person.bound,vehicle:person.vehicle});
      }
      const pagination=[...doc.querySelectorAll('.pagination a[rel="next"],.pagination .next:not(.disabled) a,.pagination a[href*="page="]')].some(a=>!a.closest('.disabled,.active'));
      const label=[...sourceList.querySelectorAll('dt')].find(n=>/^personnel:?$/i.test(txt(n.textContent))),expectedText=txt(label?.nextElementSibling?.textContent),match=expectedText.match(/^([\d,]+)\s+(?:Employees|Personnel|Staff)\b/i),expected=match?Number(match[1].replaceAll(',','')):null;
      if(!people.length&&!(expected===0||/\bNo (?:personnel|employees|staff)\b/i.test(table.textContent)))throw Error('Personnel rows not recognised');
      if(ticket!==generation||!visible())return;staff={people,partial:rows.length>10000||invalid>0||pagination||(expected!==null&&expected!==people.length)};staffError='';
    }catch(err){if(ticket===generation&&visible())staffError=`Personnel unavailable (${txt(err.message,100)}). Coverage is not verified.`;}
    finally{clearTimeout(timeout);if(controller===current)controller=null;if(ticket===generation&&visible())renderCrew();}
  }
  function setFleet(entries,isPartial,time,refresh){if(!visible()||!mount())return;const station=entries.filter(v=>String(v.building)===id);fleet=station.slice(0,5000);partial=isPartial||station.length>5000;readAt=time;refreshFleet=refresh;renderCrew();void readPersonnel();}
  function failFleet(message){staffError=`Crew data unavailable (${txt(message,100)}).`;fleet=null;state.model=null;renderCrew();}
  function extensionStatus(row){
    const timer=row.querySelector('[data-end-time]'),raw=Number(timer?.getAttribute('data-end-time')),end=Number.isFinite(raw)&&raw>0?(raw<1e12?raw*1000:raw):null;
    if(end){const seconds=Math.max(0,Math.ceil((end-Date.now())/1000)),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),text=seconds?`${hours?`${hours}h `:''}${minutes}m ${seconds%60}s`:'Awaiting game update';return {kind:row.querySelector('a[href*="extension_finish"]')?'building':'pending',text:`${seconds?'◷ ':''}${text}`,title:`${row.querySelector('a[href*="extension_finish"]')?'Building':'Pending'} · ${new Date(end).toLocaleString('en-GB')}`};}
    const danger=row.querySelector('.label-danger'),success=row.querySelector('.label-success');
    if(danger)return {kind:'inactive',text:`! ${txt(danger.textContent)||'Inactive'}`};
    if(success)return {kind:'ready',text:`✓ ${txt(success.textContent)||'Ready for action'}`};
    if(row.querySelector('a[href*="extension_ready"]'))return {kind:'unknown',text:'Built · status unavailable'};
    const label=row.querySelector('.label');if(label)return {kind:'unknown',text:txt(label.textContent)||'Status unavailable'};
    return {kind:'unbuilt',text:'— Not built yet'};
  }
  function expansions(){
    if(!visible()||!flags.expansions||!mount()||!right)return;
    const table=document.getElementById('ausbauten');if(table!==extensionSource){extensionObserver?.disconnect();extensionSource=table;if(table){extensionObserver=new MutationObserver(records=>{if(!visible())return;const relevant=records.some(r=>r.type==='attributes'||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1));if(relevant){clearTimeout(extensionTimer);extensionTimer=setTimeout(expansions,120);}});extensionObserver.observe(table,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-end-time','href']});}}
    const rows=[...table?.querySelectorAll('tbody tr')||[]].slice(0,200),groups=new Map();
    for(const row of rows){const name=txt(row.querySelector('b,strong')?.textContent);if(!name)continue;const group=groups.get(name)||[];group.push(extensionStatus(row));groups.set(name,group);}
    const key=JSON.stringify([...groups]);if(key===extensionKey)return;extensionKey=key;state.extensionPasses++;
    const grid=right.querySelector('#nx-extension-grid');grid.replaceChildren();
    for(const [name,states]of groups){const item=el('div',undefined,'nx-extension-item');item.append(el('strong',name,'nx-extension-name'));const slots=el('div',undefined,'nx-extension-slots');states.forEach((status,i)=>{const bar=el('span',status.text,`nx-extension-state nx-ext-${status.kind}`);bar.title=`${name}${states.length>1?` · slot ${i+1}/${states.length}`:''}${status.title?` · ${status.title}`:''}`;slots.append(bar);});item.append(slots);grid.append(item);}
    if(!groups.size)grid.append(el('p','No extension rows available.'));
  }
  function activate(){active=true;if(visible()){mount();expansions();}}
  function suspend(){active=false;generation++;controller?.abort();controller=null;staffTried=false;staff=null;fleet=null;state.model=null;refreshFleet=null;extensionObserver?.disconnect();extensionObserver=null;extensionSource=null;clearTimeout(extensionTimer);extensionTimer=null;}
})();
