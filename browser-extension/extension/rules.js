import { RULES_KEY, requirementKey, validateRules, mergeRules } from './rules-core.mjs';
const $ = id => document.getElementById(id);
let data = { schema: 1, rules: [] }, catalogue, editing = null, pendingImport = null, busy = false;
function status(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error', error); }
function vehicleOptions(preferred = $('vehicle').value) {
  const query = $('search').value.trim().toLowerCase();
  const filtered = catalogue.vehicles.filter(v => (!$('service').value || v.service === $('service').value) && `${v.name} ${v.id}`.toLowerCase().includes(query));
  $('vehicle').replaceChildren(new Option('Choose a vehicle type', ''), ...filtered.map(v => new Option(`${v.name} · ${v.service} · #${v.id}`, v.id)));
  if (filtered.some(v => v.id === preferred)) $('vehicle').value = preferred;
  $('catalogue-note').textContent = `${filtered.length} of ${catalogue.vehicles.length} known vehicle types. The catalogue includes script types and types read from your game.`;
}
function preview() {
  const key = requirementKey($('requirement').value);
  const builtin = catalogue.builtIn.find(r => requirementKey(r.requirement) === key);
  $('match-preview').textContent = !key ? '' : builtin ? `Built-in match: ${builtin.vehicleName}. Your enabled rule takes priority for this vehicle requirement.` : `Matches “${key}” regardless of case, extra spaces, a Required prefix or a leading quantity. Add a separate rule for different wording or plurals.`;
}
function cell(row, value) { const td = document.createElement('td'); td.textContent = value; row.append(td); return td; }
function render() {
  $('count').textContent = `(${data.rules.length})`; $('empty').hidden = data.rules.length > 0; $('rules').replaceChildren();
  for (const rule of data.rules) {
    const tr = document.createElement('tr');
    const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.checked = rule.enabled; toggle.setAttribute('aria-label', 'Enable ' + rule.requirement);
    toggle.addEventListener('change', () => change(latest => ({ ...latest, rules: latest.rules.map(r => requirementKey(r.requirement) === requirementKey(rule.requirement) ? { ...r, enabled: toggle.checked } : r) })));
    cell(tr, '').append(toggle); cell(tr, rule.requirement); cell(tr, `${rule.vehicleName} (#${rule.vehicleTypeId})`);
    const actions = cell(tr, '');
    const edit = document.createElement('button'); edit.textContent = 'Edit'; edit.className = 'secondary'; edit.onclick = () => {
      editing = requirementKey(rule.requirement); $('requirement').value = rule.requirement; $('service').value = ''; $('search').value = '';
      if (!catalogue.vehicles.some(v => v.id === rule.vehicleTypeId)) catalogue.vehicles.push({id:rule.vehicleTypeId,name:rule.vehicleName,service:'Other'});
      vehicleOptions(rule.vehicleTypeId); $('editor-title').textContent = 'Edit rule'; $('save').textContent = 'Save changes'; $('cancel').hidden = false; preview(); $('requirement').focus();
    };
    const remove = document.createElement('button'); remove.textContent = 'Delete'; remove.className = 'secondary'; remove.onclick = () => change(latest => ({ ...latest, rules: latest.rules.filter(r => requirementKey(r.requirement) !== requirementKey(rule.requirement)) }));
    actions.append(edit, remove); $('rules').append(tr);
  }
}
function reset() { editing = null; $('rule-form').reset(); $('editor-title').textContent = 'Add a rule'; $('save').textContent = 'Save rule'; $('cancel').hidden = true; vehicleOptions(''); preview(); }
async function change(transform) {
  if (busy) return;
  busy = true; $('save').disabled = true;
  try {
    // Serialise settings tabs without holding the analytics queue's storage lock.
    await navigator.locks.request('nexus-requirement-rules', async () => {
      const latest = validateRules((await chrome.storage.local.get(RULES_KEY))[RULES_KEY] || {schema:1,rules:[]});
      const next = validateRules(transform(latest));
      await chrome.storage.local.set({ [RULES_KEY]: next }); data = next;
    });
    render(); status('Saved. Stop Auto Mode and refresh the game to apply these rules across all workers.'); return true;
  } catch (error) { status(error.message, true); render(); return false; }
  finally { busy = false; $('save').disabled = false; }
}
$('rule-form').onsubmit = async event => {
  event.preventDefault(); const v = catalogue.vehicles.find(v => v.id === $('vehicle').value);
  if (!v) return status('Choose a vehicle type.', true);
  const rule = { requirement: $('requirement').value, vehicleTypeId: v.id, vehicleName: v.name, enabled: true };
  if (await change(latest => {
    const duplicate = latest.rules.find(r => requirementKey(r.requirement) === requirementKey(rule.requirement));
    if (duplicate && requirementKey(duplicate.requirement) !== editing) throw Error('This requirement already has a rule. Use Edit.');
    const previous = latest.rules.find(r => requirementKey(r.requirement) === editing);
    if (previous) rule.enabled = previous.enabled;
    return {schema:1,rules:[...latest.rules.filter(r => requirementKey(r.requirement) !== editing),rule]};
  })) reset();
};
$('cancel').onclick = reset; $('service').onchange = () => vehicleOptions(); $('search').oninput = () => vehicleOptions(); $('requirement').oninput = preview;
$('export').onclick = async () => {
  try {
    const current = validateRules((await chrome.storage.local.get(RULES_KEY))[RULES_KEY] || {schema:1,rules:[]});
    const blob = new Blob([JSON.stringify({...current, extensionVersion:chrome.runtime.getManifest().version, exportedAt:new Date().toISOString()}, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'nexus-requirement-rules.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { status(error.message, true); }
};
$('import').onchange = async () => {
  try {
    const file = $('import').files[0]; if (!file) return;
    if (file.size > 150000) throw Error('Rules file is too large (maximum 150 KB).');
    pendingImport = validateRules(JSON.parse(await file.text()));
    const keys = new Set(data.rules.map(r=>requirementKey(r.requirement)));
    $('import-summary').textContent = `Import ${pendingImport.rules.length} rules? ${pendingImport.rules.filter(r=>keys.has(requirementKey(r.requirement))).length} matching local entries will be replaced. Other rules stay in place.`;
    $('import-dialog').showModal();
  } catch (error) { pendingImport = null; status(error.message, true); }
  finally { $('import').value = ''; }
};
$('confirm-import').onclick = async () => { const incoming = pendingImport; if (!incoming) return; if (await change(latest=>mergeRules(latest,incoming))) { $('import-dialog').close(); pendingImport=null; reset(); } };
$('cancel-import').onclick = () => { pendingImport=null; $('import-dialog').close(); };
$('builtin-search').oninput = () => {
  const query = $('builtin-search').value.toLowerCase(); $('builtins').replaceChildren();
  for (const r of catalogue.builtIn.filter(r => `${r.requirement} ${r.vehicleName}`.toLowerCase().includes(query))) { const tr=document.createElement('tr'); cell(tr,r.requirement); cell(tr,r.vehicleName); $('builtins').append(tr); }
};
$('discover').onclick = async () => {
  try {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find(t => /^https:\/\/(www|police)\.missionchief\.co\.uk\//.test(t.url || ''));
    if (!tab) throw Error('Open Nexus from the game tab first, then open Requirement rules.');
    const results = await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',func:()=>{
      const found=new Map(); const docs=[document];
      for (const frame of document.querySelectorAll('iframe')) { try { if(frame.contentDocument) docs.push(frame.contentDocument); } catch {} }
      for(const doc of docs) for(const el of doc.querySelectorAll('[vehicle_type_id]')) {
        const id=el.getAttribute('vehicle_type_id');
        const name=el.getAttribute('vehicle_type_caption') || el.closest('tr')?.getAttribute('vehicle_type_caption') || el.closest('tr')?.querySelector('[vehicle_type_caption]')?.getAttribute('vehicle_type_caption');
        if(/^\d{1,5}$/.test(id||'') && name && name.length<=180) found.set(id,{id,name,service:'Other'});
        if(found.size>=300) break;
      }
      return [...found.values()].slice(0,300);
    }});
    const found=results[0]?.result || []; let added=0;
    for(const v of found) if(!catalogue.vehicles.some(old=>old.id===v.id)) { catalogue.vehicles.push(v); added++; }
    await chrome.storage.local.set({nexusExtraVehicleTypesV1:catalogue.vehicles.filter(v=>v.service==='Other').slice(0,300)});
    catalogue.vehicles.sort((a,b)=>a.name.localeCompare(b.name)); vehicleOptions();
    status(`Added ${added} vehicle types from ${found.length} types visible in the game. Open a mission vehicle list to expose more types.`);
  } catch(error) { status(error.message, true); }
};
try {
  catalogue=await (await fetch('rules-catalogue.json')).json();
  const saved=await chrome.storage.local.get([RULES_KEY,'nexusExtraVehicleTypesV1']);
  data=validateRules(saved[RULES_KEY] || {schema:1,rules:[]});
  for(const v of saved.nexusExtraVehicleTypesV1 || []) if(/^\d{1,5}$/.test(v?.id || '') && typeof v.name==='string' && v.name.length<=180 && !catalogue.vehicles.some(old=>old.id===v.id)) catalogue.vehicles.push({id:v.id,name:v.name,service:'Other'});
  for(const name of [...new Set([...catalogue.vehicles.map(v=>v.service),'Other'])].sort()) $('service').add(new Option(name,name));
  vehicleOptions(); render(); $('builtin-search').oninput(); status('Ready. Built-in rules remain active wherever no custom rule applies.');
} catch(error) { status('Could not load rules: '+error.message,true); $('save').disabled=true; }
