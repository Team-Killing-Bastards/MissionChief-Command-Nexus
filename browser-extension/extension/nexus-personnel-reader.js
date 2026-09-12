/* Read-only personnel rows shared by manual building coverage, summary and filters. */
(() => {
  'use strict';
  if (!/^\/(?:buildings\/\d+(?:\/personals)?|vehicles\/\d+\/zuweisung)\/?$/.test(location.pathname) || window.__NEXUS_PERSONNEL_READER__) return;
  try { let w=window; while(true) { if(/^mcn-v3-(active-worker|pipeline-preload|retired-worker)-/.test(w.name||''))return; if(w===w.top)break; if(w.frameElement?.matches('[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload],#mcn-v3-background-mission-worker'))return; w=w.parent; } } catch { return; }
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim(), normal=v=>clean(v).toLowerCase();
  const rules=new Map(), aliases=new Map();
  for(const type of Object.values(window.__NEXUS_BUILDING_DATA__||{}))for(const rule of type.training){
    rules.set(rule.key,rule); for(const name of [rule.name,...rule.aliases])aliases.set(normal(name),rule.name);
  }
  function columns(table) {
    const head=table.tHead?.rows[table.tHead.rows.length-1] || [...table.rows].find(r=>r.querySelector('th'));
    const cells=[...(head?.cells||[])], find=re=>cells.findIndex(c=>re.test(normal(c.textContent).replace(/[:*]/g,'')));
    return {hasHeaders:!!head,training:find(/^(education|training|schooling|qualifications?)$/),assigned:find(/^(assigned(?: vehicle| to)?|vehicle(?: assignment)?|binding|bound to)$/)};
  }
  function nameIndex(fleet) {
    const names=new Map();
    for(const v of fleet||[]){const key=normal(v.name);if(key)names.set(key,names.has(key)?null:String(v.id));}
    return names;
  }
  function vehicleId(raw) {
    try { const u=new URL(raw,location.origin);return u.origin===location.origin?u.pathname.match(/^\/vehicles\/(\d+)\/?$/)?.[1]||null:null; } catch { return null; }
  }
  function read(row,layout,names=new Map(),currentVehicle=null) {
    const cells=[...row.cells];if(cells.length<2||row.querySelector('th')||cells.some(c=>c.colSpan>1))return null;
    const offset=cells[0]?.querySelector('input.personal-delete-checkbox')?1:0;
    // Older station pages include Motivation; newer station and assignment pages do not.
    const legacy=/^\d+(?:[.,]\d+)?\s*%?$/.test(clean(cells[offset+1]?.textContent));
    const ti=layout.training>=0?layout.training:layout.hasHeaders?-1:offset+(legacy?2:1);
    const trainingCell=ti>=0?cells[ti]:null,training=new Set();
    if(trainingCell){const copy=trainingCell.cloneNode(true);copy.querySelectorAll('br').forEach(n=>n.replaceWith(', '));
      for(const part of copy.textContent.split(/[,;\n]/)){const label=clean(part);if(label&&!/^(?:-|none|no (?:training|education))$/i.test(label))training.add(aliases.get(normal(label))||label);}
    }
    const keys=new Set([...row.querySelectorAll('[data-education-key]')].map(n=>n.getAttribute('data-education-key')));
    if(row.hasAttribute('data-education-key'))keys.add(row.getAttribute('data-education-key'));
    const raw=row.getAttribute('data-filterable-by');
    if(raw&&raw.length<=8000)try{const values=JSON.parse(raw);if(Array.isArray(values))for(const value of values.slice(0,200))if(typeof value==='string')keys.add(value);}catch{}
    for(const key of keys)if(rules.has(key))training.add(rules.get(key).name);
    const ai=layout.assigned>=0?layout.assigned:ti>=0?ti+1:-1,assigned=ai>=0?cells[ai]:null;
    const links=[...(assigned?.querySelectorAll('a[href]')||[])],ids=[...new Set(links.map(a=>vehicleId(a.getAttribute('href'))).filter(Boolean))];
    let vehicle=ids.length===1?ids[0]:null;
    const assignedText=clean(assigned?.textContent),empty=/^(?:[-—–]|none|no vehicle|not assigned|unassigned|available)?$/i.test(assignedText);
    if(!vehicle&&!ids.length&&!empty)vehicle=names.get(normal(assignedText))||null;
    const controls=[...row.querySelectorAll('a,button,input[type="submit"],input[type="button"]')];
    const boundHere=!!currentVehicle&&controls.some(n=>!n.hidden&&!n.closest('.hidden,.d-none,[hidden]')&&!/display\s*:\s*none|visibility\s*:\s*hidden/i.test(n.getAttribute('style')||'')&&
      (n.classList.contains('btn-assigned')||/remove\s+binding/i.test(clean(n.textContent||n.value))));
    if(boundHere&&(!vehicle||vehicle===String(currentVehicle)))vehicle=String(currentVehicle);
    const bound=!!vehicle||(!empty&&!!assigned&&!/^(?:assign|bind|select)$/i.test(assignedText));
    const identity=row.getAttribute('personal_id')||row.dataset.personalId||row.id||row.querySelector('input.personal-delete-checkbox[value]')?.value||row.querySelector('a[href*="/personals/"]')?.getAttribute('href');
    return {identity,training:[...training],trainingKnown:!!trainingCell||keys.size>0,bound,vehicle};
  }
  const matches=(person,required)=>required.every(name=>person.training.some(label=>normal(aliases.get(normal(label))||label)===normal(aliases.get(normal(name))||name)));
  window.__NEXUS_PERSONNEL_READER__={columns,nameIndex,read,matches};
})();
