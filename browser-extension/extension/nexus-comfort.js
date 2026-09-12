/* Nexus inline game conveniences. No LSS/Vue runtime, game-function wrapping or shared estate. */
(() => {
  'use strict';
  if (/^mcn-v3-(active-worker|pipeline-preload)-/.test(window.name || '')) return;
  try { if (window.frameElement?.matches('[data-mcn-v3-worker], [data-mcn-v3-pipeline-preload], #mcn-v3-background-mission-worker')) return; } catch { return; }
  if (window.__NEXUS_COMFORT__ || !window.__NEXUS_COMFORT_DATA__) return;
  const D = window.__NEXUS_COMFORT_DATA__, P = window.__NEXUS_PERSONNEL_READER__;
  globalThis.NexusSettings?.applyFlags(D);
  const enabled = name => globalThis.NexusSettings?.enabled(name) !== false;
  const path = location.pathname, mission = /^\/missions\/\d+\/?$/.test(path), building = /^\/buildings\/\d+\/?$/.test(path),
    personnel = /^\/buildings\/\d+\/personals\/?$/.test(path), assignment = /^\/vehicles\/\d+\/zuweisung\/?$/.test(path);
  const home = path === '/', vehicle = /^\/vehicles\/\d+\/?$/.test(path);
  if (!home && !mission && !building && !personnel && !assignment && !vehicle && !/^\/profile\/\d+/.test(path)) return;
  const flags = D.flags, own = '[data-nexus-comfort]';
  const text = (value, max = 1000) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const numeric = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
  const validId = value => /^\d{1,16}$/.test(String(value));
  const nf = value => value === null || value === undefined ? '?' : Number(value).toLocaleString('en-GB');
  const duration = seconds => { const n = Math.max(0, Math.ceil(seconds)); return `${Math.floor(n / 3600) ? `${Math.floor(n / 3600)}:` : ''}${String(Math.floor(n / 60) % 60).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; };
  const epoch = raw => { const num = numeric(raw); if (num !== null && num > 0) return num < 1e12 ? num * 1000 : num; const parsed = Date.parse(raw); return Number.isFinite(parsed) ? parsed : null; };
  const state = { active: false, started: false, passes: 0, vehicleRowsDecorated: 0, lastPassMs: 0, fetches: 0 };
  window.__NEXUS_COMFORT__ = state;
  let timer = null, deferred = null, controller = null, apiJob = false, disposed = false, generation = 0;
  let observers = [], processed = new WeakSet(), group = -1, registry = new Map(), registryTime = 0, selectedKey = '', patientKey = '', missingKey = '';
  let tickNumber = 0;
  let decorating = false, decorateAgain = false;
  let nativeVehicleTabs = null, vehicleFilterRun = 0, activatingAllVehicles = false;
  const patientDeadlines = new Map();
  const style = document.createElement('style'); style.dataset.nexusComfort = 'style';
  style.textContent = `
  [data-nexus-comfort]{font-family:system-ui,sans-serif}.nx-box{border:1px solid #7891aa;border-left:4px solid #579cc5;border-radius:5px;padding:9px 12px;margin:8px 0;background:#102338;color:#e8f0fb;font-size:12px}
  .nx-box strong{color:#b9e1fc}.nx-box small{color:#cad7e5}.nx-box a{color:#95d5ff}.nx-line{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.nx-badge{display:inline-block;border:1px solid #6685a1;border-radius:4px;padding:2px 6px;margin:2px;background:#17354b;color:#eef5ff;font-size:12px}
  #nx-missing .nx-requirement-tick{display:inline-block;margin-left:6px;color:#69c8ff;font-weight:800;font-size:14px;line-height:1;vertical-align:baseline}#nx-missing .nx-requirement-covered{border-color:#69b6e1}
  .nx-good{color:#176330;background:#d6f2df}.nx-short{color:#942523;background:#ffe6df}.nx-unknown{color:#4f5260;background:#edf0f5}.nx-staff{font-size:12px;white-space:nowrap}.nx-type{font-size:11px;font-weight:normal;margin-left:5px;color:#486c86}.nx-box button{background:#1d415d;color:#fff;border:1px solid #7193ac;border-radius:4px;padding:4px 8px;margin:3px;font:inherit;cursor:pointer}.nx-box button[aria-pressed=true]{background:#39799a;border-color:#b6e3fa}
  .nx-original-hidden{display:none!important}.nx-native-vehicle-tabs-hidden{display:none!important}.nx-group-hidden{display:none!important}.nx-currency{font-weight:bold;white-space:nowrap}.nx-currency-icon{display:none!important}.nx-aging{border:1px solid #df6666;border-radius:3px;padding:1px 3px}.nx-time{font-size:11px;padding:1px 5px;color:#17455b;background:#e4f3fc;border-radius:3px}
  .nx-training{border-collapse:collapse;width:auto;font-size:12px}.nx-training th,.nx-training td{padding:4px 14px 4px 0;text-align:left}.nx-inline-list{display:flex;gap:4px;flex-wrap:wrap}.nx-box input{color:#172e40;background:#fff;border:1px solid #819ab1;border-radius:3px;padding:4px 6px}.nx-arr{position:relative}.nx-crew-links{display:block;font-size:11px}
  #nx-personnel-overview{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-areas:"summary demand" "summary filter";gap:8px 18px;align-items:start}
  #nx-personnel-overview>section{min-width:0;margin:0;padding:0;border:0;background:none;font:inherit;color:inherit}
  #nx-personnel-overview #nx-personnel-summary{grid-area:summary}#nx-personnel-overview #nx-personnel-demand{grid-area:demand}#nx-personnel-overview #nx-personnel-filter{grid-area:filter}
  #nx-personnel-overview #nx-personnel-demand,#nx-personnel-overview #nx-personnel-filter{border-left:1px solid #6685a180;padding-left:16px}
  #nx-personnel-overview .nx-training{width:100%;margin:5px 0}#nx-personnel-overview .nx-training td,#nx-personnel-overview .nx-training th{padding:3px 10px 3px 0;overflow-wrap:anywhere}
  #nx-personnel-overview .nx-training td:not(:first-child),#nx-personnel-overview .nx-training th:not(:first-child){text-align:right;white-space:nowrap}
  #nx-personnel-overview small{display:block;line-height:1.4}#nx-personnel-overview #nx-personnel-demand>div{margin:4px 0}#nx-personnel-overview button{margin:5px 0 0}
  #nx-personnel-overview #nx-personnel-filter{display:flex;flex-wrap:wrap;align-items:center;gap:5px 8px}#nx-personnel-overview #nx-personnel-filter>strong,#nx-personnel-overview #nx-personnel-filter>div{flex-basis:100%}
  #nx-personnel-overview input[type=search]{flex:1 1 180px;min-width:0;max-width:260px;width:100%}#nx-personnel-overview label{display:inline-flex;align-items:center;gap:5px;line-height:1.3;margin:0}#nx-personnel-overview label input{flex:none;margin:0}
  #nx-personnel-overview.nx-personnel-no-summary{display:block}#nx-personnel-overview.nx-personnel-no-summary>section{border-left:0;padding-left:0}#nx-personnel-overview.nx-personnel-no-summary>section+section{margin-top:10px}
  @media(max-width:700px){#nx-personnel-overview{grid-template-columns:minmax(0,1fr);grid-template-areas:"summary" "demand" "filter";gap:10px}#nx-personnel-overview #nx-personnel-demand,#nx-personnel-overview #nx-personnel-filter{border-left:0;border-top:1px solid #6685a180;padding:9px 0 0}}
  `;
  document.head.append(style);
  function element(tag, value, className) { const node = document.createElement(tag); node.dataset.nexusComfort = '1'; if (value !== undefined) node.textContent = value; if (className) node.className = className; return node; }
  function set(node, value) { if (node && node.textContent !== value) node.textContent = value; }
  function box(id, before, title) {
    let node = document.getElementById(id); if (node?.isConnected) return node;
    if (!before?.parentElement) return null;
    node = element('section', undefined, 'nx-box'); node.id = id;
    if (title) node.append(element('strong', `Nexus · ${title}`));
    before.before(node); return node;
  }
  function visible() {
    if (document.hidden || disposed) return false;
    try {
      let win = window;
      while (win !== win.top) {
        const frame = win.frameElement; if (!frame || frame.getAttribute('aria-hidden') === 'true') return false;
        if (frame.matches('[data-mcn-v3-worker], [data-mcn-v3-pipeline-preload]')) return false;
        const css = win.parent.getComputedStyle(frame);
        if (css.display === 'none' || css.visibility === 'hidden' || css.opacity === '0' || !frame.getClientRects().length) return false;
        win = win.parent;
      }
    } catch { return false; }
    return true;
  }
  function observe(target, fn) {
    if (!target) return;
    const observer = new MutationObserver(records => {
      if (!visible() || records.every(r => (r.target.nodeType === 1 ? r.target : r.target.parentElement)?.closest?.(own))) return;
      schedule(fn);
    });
    observer.observe(target, { childList: true, subtree: true, characterData: true }); observers.push(observer);
  }
  const pending = new Set();
  function schedule(fn) {
    pending.add(fn); if (deferred || !visible()) return;
    deferred = setTimeout(() => { deferred = null; if (!visible()) { pending.clear(); return; } const jobs = [...pending]; pending.clear(); jobs.forEach(job => job()); }, 200);
  }
  function currency() {
    window.__NEXUS_CURRENCY__?.update();
  }
  function generatedTime() {
    if (!flags.extendedCallWindow?.generationDate) return;
    const info = document.getElementById('mission_general_info'); if (!info) return;
    const when = epoch(info.getAttribute('data-generation-time')); if (!when) return;
    let stamp = info.querySelector('[data-nx-generated]');
    if (!stamp) { stamp = element('span'); stamp.dataset.nxGenerated = '1'; (info.querySelector('small') || info).append(stamp); }
    const age = Math.max(0, Date.now() - when), absolute = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(when);
    set(stamp, ` · Generated ${absolute} London · ${age < 3600000 ? `${Math.floor(age / 60000)}m` : `${Math.floor(age / 3600000)}h ${Math.floor(age / 60000) % 60}m`} ago`);
    stamp.title = new Date(when).toISOString();
    const boundary = new Date(); boundary.setUTCHours(2, 0, 0, 0); if (+boundary > Date.now()) boundary.setUTCDate(boundary.getUTCDate() - 1);
    stamp.classList.toggle('nx-aging', !!flags.extendedCallWindow.redBorder && when < +boundary);
  }
  function splitRequirements(raw) { return raw.split(/,(?!\d{3}\b)|;|\n/).map(s => text(s, 200)).filter(Boolean).slice(0, 60); }
  function missing() {
    if (!flags.extendedCallWindow?.enhancedMissingVehicles) return;
    const source = document.getElementById('missing_text'); if (!source) return;
    const value = text(source.textContent, 12000); if (value === missingKey && document.getElementById('nx-missing')) return; missingKey = value;
    const panel = box('nx-missing', source, 'Missing requirements'); if (!panel) return;
    panel.replaceChildren(element('strong', 'Nexus · Missing requirements'));
    const groups = [...source.querySelectorAll('[data-requirement-type]')].slice(0, 8);
    if (!value) { panel.hidden = true; source.classList.remove('nx-original-hidden'); return; }
    panel.hidden = false;
    if (!groups.length) { panel.append(element('div', value)); source.classList.remove('nx-original-hidden'); return; }
    for (const section of groups) {
      const title = text(section.querySelector('b,strong')?.textContent) || section.getAttribute('data-requirement-type');
      const line = element('div', undefined, 'nx-line'); line.append(element('strong', title));
      const raw = text(section.textContent, 6000).replace(text(section.querySelector('b,strong')?.textContent), '').trim();
      const kind=section.getAttribute('data-requirement-type'),vehicleGroup=kind==='vehicles',vehicleLike=vehicleGroup||kind==='other',ticks=window.__NEXUS_REQUIREMENT_TICKS__;
      const requirements=vehicleLike&&ticks?ticks.split(raw):splitRequirements(raw);
      for (const requirement of requirements) { const badge=element('span',requirement,'nx-badge');if(vehicleGroup||(kind==='other'&&ticks?.supports(requirement)))badge.dataset.nxVehicleRequirement=requirement;line.append(badge); }
      panel.append(line);
    }
    // Preserve the original source text and any unclassified details for other readers.
    const original = element('details'); original.append(element('summary', 'Original game requirements'), element('div', value)); panel.append(original);
    source.classList.add('nx-original-hidden');
    window.__NEXUS_REQUIREMENT_TICKS__?.refresh();
  }
  function patients() {
    if (!flags.extendedCallWindow?.patientSummary) return;
    const source = document.getElementById('mission_general_info') || document.querySelector('.mission_patient'); if (!source) return;
    const items = Array.from(document.querySelectorAll('.mission_patient')).slice(0, 1000);
    const counts = new Map(); let missingCount = 0;
    for (const patient of items) {
      const alerts = patient.querySelectorAll('.alert-danger'); if (alerts.length) missingCount++;
      for (const alert of alerts) for (const req of splitRequirements(text(alert.textContent).replace(/^[^:]*:\s*/, ''))) counts.set(req, (counts.get(req) || 0) + 1);
    }
    const key = JSON.stringify([items.length, missingCount, [...counts]]); if (key === patientKey && document.getElementById('nx-patients')) return; patientKey = key;
    const panel = box('nx-patients', source, 'Patient summary'); if (!panel) return; panel.hidden = !items.length;
    panel.replaceChildren(element('strong', `Nexus · Patients: ${items.length}${items.length === 1000 ? '+' : ''} · Awaiting resources: ${missingCount}`));
    const line = element('div', undefined, 'nx-inline-list');
    for (const [name, count] of [...counts].slice(0, 60)) line.append(element('span', `${name}: ${count}`, 'nx-badge'));
    if (!counts.size && items.length) line.append(element('small', 'No missing-resource warnings currently shown.'));
    panel.append(line);
  }
  function patientTimes() {
    if (!(home ? flags.extendedCallList?.remainingPatientTime : flags.extendedCallWindow?.remainingPatientTime)) return;
    const timers = window.patient_timers; if (!Array.isArray(timers)) return;
    const activeIds = new Set();
    for (const item of timers.slice(0, 1000)) {
      const data = item?.params || item; const id = item?.patient_id ?? data?.id;
      if (!validId(id)) continue;
      const bar = document.getElementById(`mission_patients_${id}`) || document.getElementById(`patient_bar_${id}`);
      if (!bar?.parentElement) continue;
      const ms = numeric(item.miliseconds_by_percent ?? data.miliseconds_by_percent), value = numeric(data.live_current_value);
      const outputId = `nx-patient-time-${id}`;
      if (data.target_percent || ms === null || value === null || ms < 0 || value < 0) { document.getElementById(outputId)?.remove(); patientDeadlines.delete(outputId); continue; }
      const fingerprint = `${ms}:${value}`;
      if (patientDeadlines.get(outputId)?.fingerprint !== fingerprint) patientDeadlines.set(outputId, { fingerprint, at: Date.now() + ms * value });
      activeIds.add(outputId); let output = document.getElementById(outputId);
      if (!output) { output = element('span', '', 'nx-time'); output.id = outputId; output.dataset.nxPatientTime = '1'; bar.parentElement.before(output); }
      set(output, `Treatment remaining ${duration((patientDeadlines.get(outputId).at - Date.now()) / 1000)}`);
    }
    for (const output of document.querySelectorAll('[data-nx-patient-time]')) if (!activeIds.has(output.id)) output.remove();
    for (const id of patientDeadlines.keys()) if (!activeIds.has(id)) patientDeadlines.delete(id);
  }
  function typeFor(row) {
    const checkbox = row.querySelector('input.vehicle_checkbox');
    const raw = checkbox?.getAttribute('vehicle_type_id') ?? row.querySelector('[vehicle_type_id]')?.getAttribute('vehicle_type_id') ?? row.getAttribute('vehicle_type_id');
    return numeric(raw);
  }
  async function decorateVehicles() {
    if (decorating) { decorateAgain = true; return; }
    const table = document.getElementById('vehicle_show_table_all'); if (!table) return;
    decorating = true;
    const ticket = generation, items = table.querySelectorAll('tbody tr');
    try {
    for (let i = 0; i < Math.min(items.length, 10000); i++) {
      if (i % 100 === 0) { await new Promise(resolve => setTimeout(resolve, 0)); if (ticket !== generation || !visible()) return; }
      const row = items[i]; if (processed.has(row)) continue; processed.add(row);
      const type = typeFor(row), definition = D.types[type], label = row.querySelector('label.mission_vehicle_label, td[vehicle_type_id] label');
      if (flags.extendedCallWindow?.vehicleTypeInList && label && !label.querySelector('[data-nx-type]')) {
        const tag = element('small', ` [${definition?.name || row.getAttribute('vehicle_type') || `Type ${type ?? '?'}`}]`, 'nx-type'); tag.dataset.nxType = '1'; label.append(tag);
      }
      state.vehicleRowsDecorated++;
    }
    } finally { decorating = false; if (decorateAgain && visible()) { decorateAgain = false; schedule(decorateVehicles); } }
  }
  function selection() {
    if (!flags.extendedCallWindow?.selectedVehicleCounter) return;
    const anchor = document.getElementById('vehicle_list_step') || document.getElementById('vehicle_show_table_all'); if (!anchor) return;
    const chosen = Array.from(anchor.querySelectorAll('input.vehicle_checkbox:checked')).slice(0, 1000);
    let min = 0, max = 0, unknown = 0;
    for (const checkbox of chosen) {
      const spec = D.types[checkbox.getAttribute('vehicle_type_id')]; if (!spec) { unknown++; continue; }
      min += spec.min; max += spec.max;
    }
    const message = `Selected vehicles: ${chosen.length}${chosen.length === 1000 ? '+' : ''} · Crew capacity: min ${min} / max ${max}${unknown ? ` · ${unknown} unknown types` : ''}`;
    if (message === selectedKey && document.getElementById('nx-selected')) return; selectedKey = message;
    const panel = box('nx-selected', anchor); if (!panel) return;
    set(panel, message); panel.title = 'Reference min/max capacity, not proof that trained crew are aboard. Vehicle-specific staff limits may differ.';
  }
  async function filterVehicles(index, activateAll = true) {
    const table = document.getElementById('vehicle_show_table_all'); if (!table) return;
    const allowed = D.groups[index]?.types; group = index; const filterRun = ++vehicleFilterRun;
    const pane = table.closest('.tab-pane');
    // Retain native tab loading/selection handlers. Only activate All when it is not already active;
    // appended rows must not repeatedly click All or re-trigger a native vehicle request.
    if (activateAll && pane?.id && !pane.classList.contains('active')) {
      activatingAllVehicles = true;
      try { (nativeVehicleTabs?.all || document.querySelector(`a[data-toggle="tab"][href="#${CSS.escape(pane.id)}"]`))?.click(); }
      finally { activatingAllVehicles = false; }
    }
    markVehicleGroup(index);
    const items = table.querySelectorAll('tbody tr'), ticket = generation;
    for (let i = 0; i < Math.min(items.length, 10000); i++) {
      if (i % 100 === 0) { await new Promise(resolve => setTimeout(resolve, 0)); if (ticket !== generation || !visible() || group !== index || filterRun !== vehicleFilterRun) return; }
      const row = items[i]; row.classList.toggle('nx-group-hidden', !!allowed && !allowed.includes(typeFor(row)) && !row.querySelector('input:checked'));
    }
  }
  function markVehicleGroup(index, native = null) {
    const mappedName = text(native?.textContent).toLowerCase();
    for (const b of document.querySelectorAll('#nx-vehicle-tabs button')) {
      const selected = native ? b.dataset.nxNativeTab === nativeVehicleTabs?.links.indexOf(native).toString() ||
        (!b.hasAttribute('data-nx-native-tab') && text(b.textContent).toLowerCase() === mappedName) :
        b.hasAttribute('data-nx-group') && Number(b.dataset.nxGroup) === index;
      b.setAttribute('aria-pressed', String(selected));
    }
  }
  function restoreVehicleTabs() {
    vehicleFilterRun++;
    if (nativeVehicleTabs) {
      nativeVehicleTabs.list.removeEventListener('click', nativeVehicleTabs.onClick);
      if (!nativeVehicleTabs.previouslyHidden) nativeVehicleTabs.list.classList.remove('nx-native-vehicle-tabs-hidden');
      nativeVehicleTabs = null;
    }
    document.getElementById('nx-vehicle-tabs')?.remove();
    for (const row of document.querySelectorAll('#vehicle_show_table_all .nx-group-hidden')) row.classList.remove('nx-group-hidden');
    group = -1;
  }
  function vehicleTabs() {
    if (!enabled('vehicleGroups')) return;
    const table = document.getElementById('vehicle_show_table_all'); if (!table) return;
    const scope = document.getElementById('vehicle_list_step') || table.parentElement;
    const pane = table.closest('.tab-pane');
    const lists = [...scope.querySelectorAll('#tabs,ul.nav-tabs,[role="tablist"]')];
    const list = lists.find(candidate => [...candidate.querySelectorAll('a')].some(a => a.getAttribute('tabload') === 'all' ||
      (pane?.id && a.getAttribute('href') === `#${pane.id}`)));
    // Only replace a dedicated native vehicle tab row. Unknown controls retain their native UI.
    const links = list ? [...list.querySelectorAll('a[tabload],a[data-toggle="tab"],a[role="tab"]')].filter(a =>
      a.getAttribute('tabload') || a.getAttribute('href')?.startsWith('#')) : [];
    const all = links.find(a => a.getAttribute('tabload') === 'all' || (pane?.id && a.getAttribute('href') === `#${pane.id}`));
    const canReplace = !!all && !list.contains(table) && !list.contains(document.getElementById('nx-vehicle-tabs')) &&
      !list.querySelector('button,input') && [...list.querySelectorAll('a')].every(a => links.includes(a));
    const existing = document.getElementById('nx-vehicle-tabs');
    if (existing && (!canReplace && !nativeVehicleTabs || canReplace && nativeVehicleTabs?.list === list &&
      links.length === nativeVehicleTabs.links.length && links.every((a,i) => a === nativeVehicleTabs.links[i]))) return;
    if (existing || nativeVehicleTabs) restoreVehicleTabs();
    const panel = box('nx-vehicle-tabs', document.getElementById('vehicle_list_step') || table, 'Vehicle groups'); if (!panel) return;
    panel.setAttribute('role','group'); panel.setAttribute('aria-label','Nexus vehicle groups');
    for (const [index, name] of [[-1, 'All'], ...D.groups.map((g, i) => [i, g.name])]) {
      const button = element('button', name); button.type = 'button'; button.dataset.nxGroup = String(index); button.setAttribute('aria-pressed', String(index === -1));
      button.addEventListener('click', () => { void filterVehicles(index); }); panel.append(button);
    }
    if (canReplace) {
      const names = new Set(['all', ...D.groups.map(g => text(g.name).toLowerCase())]);
      nativeVehicleTabs = { list, all, links, previouslyHidden:list.classList.contains('nx-native-vehicle-tabs-hidden'), onClick:null };
      links.forEach((link, index) => {
        const name = text(link.textContent,100);
        if (link === all || names.has(name.toLowerCase())) return;
        const button = element('button', name || `Vehicle group ${index + 1}`); button.type = 'button'; button.dataset.nxNativeTab = String(index);
        button.setAttribute('aria-pressed','false');button.title = name === 'Follow-up' ? 'Open the game follow-up vehicle list' : `Open ${name}`;
        button.addEventListener('click', () => { if (visible() && link.isConnected) link.click(); }); panel.append(button);
      });
      nativeVehicleTabs.onClick = event => {
        const link = event.target.closest?.('a'); if (activatingAllVehicles || !links.includes(link)) return;
        if (link === all) { void filterVehicles(-1,false); return; }
        group = -2; vehicleFilterRun++; markVehicleGroup(-2,link);
      };
      list.addEventListener('click',nativeVehicleTabs.onClick);
      // The source anchors remain in the DOM for the game's own tabload/Bootstrap handlers.
      list.classList.add('nx-native-vehicle-tabs-hidden');
      const active = links.find(a => a.closest('li')?.classList.contains('active') || a.getAttribute('aria-selected') === 'true');
      if (active && active !== all) { group = -2; markVehicleGroup(-2,active); }
    }
    panel.append(element('small', ' Selected vehicles remain visible.'));
  }
  function arrHover(event) {
    const arr = event.target.closest?.('#mission-aao-group .aao, #mission-aao-group .vehicle_group'); if (!arr || arr.contains(event.relatedTarget)) return;
    if (!flags.extendedCallWindow?.arrSpecs) return;
    const container = document.getElementById('mission-aao-group');
    const panel = box('nx-arr-specs', container, 'ARR requirements'); if (!panel) return;
    const names = Object.fromEntries(Array.isArray(window.aao_types) ? window.aao_types.slice(0, 500) : []), specs = [];
    for (const attr of Array.from(arr.attributes).slice(0, 300)) if (names[attr.name] && numeric(attr.value) > 0) specs.push(`${names[attr.name]}: ${attr.value}`);
    for (const key of ['vehicle_type_ids', 'custom']) {
      try { const raw = arr.getAttribute(key); if (!raw || raw.length > 8000) continue; const object = JSON.parse(raw); for (const [id, amount] of Object.entries(object).slice(0, 100)) if (numeric(amount) > 0) specs.push(`${D.types[id]?.name || text(id, 80)}: ${amount}`); } catch {}
    }
    panel.replaceChildren(element('strong', `Nexus · ${text(arr.textContent, 100) || 'ARR'} requirements`), element('div', specs.length ? specs.join(' · ') : 'No numeric requirements are exposed by this ARR.'));
  }
  function mergePersonnelPanels() {
    if(!personnel&&!assignment)return;
    const table=document.getElementById('personal_table');if(!table)return;
    const panels=['nx-personnel-summary','nx-personnel-demand','nx-personnel-filter'].map(id=>document.getElementById(id)).filter(Boolean);
    if(!panels.length)return;
    const overview=box('nx-personnel-overview',table);if(!overview)return;
    overview.setAttribute('aria-label','Nexus personnel overview');
    for(const panel of panels){panel.classList.remove('nx-box');if(panel.parentElement!==overview)overview.append(panel);}
    overview.classList.toggle('nx-personnel-no-summary',!document.getElementById('nx-personnel-summary'));
  }
  function personnelSummary() {
    const table = document.getElementById('personal_table'); if (!table || !flags.extendedBuilding?.schoolingSummary) return;
    const list = Array.from(table.querySelectorAll('tbody tr')).slice(0, 10000), groups = new Map(), layout=P.columns(table), names=P.nameIndex([...registry.values()]); let assigned = 0, readable = 0;
    for (const row of list) {
      const person=P.read(row,layout,names,assignment?path.match(/\d+/)?.[0]:null);if(!person)continue;readable++;
      const trainings=person.training.length?person.training:[person.trainingKnown?'No training':'Training unavailable']; const bound=person.bound;if(bound)assigned++;
      for (const name of trainings) {
        const group = groups.get(name) || { total: 0, assigned: 0 }; group.total++; if (bound) group.assigned++; groups.set(name, group);
      }
    }
    const panel = box('nx-personnel-summary', table, 'Personnel summary'); if (!panel) return;
    panel.replaceChildren(element('strong', `Nexus · ${readable} personnel · Assigned ${assigned} · Unassigned ${readable - assigned}${list.length === 10000 ? ' · Partial list' : ''}`));
    const summary = element('table', undefined, 'nx-training'); const head = summary.createTHead().insertRow();
    for (const name of ['Training', 'Total', 'Assigned', 'Unassigned']) { const th = element('th', name); head.append(th); }
    const body = summary.createTBody();
    for (const [name, value] of [...groups].sort(([a], [b]) => a.localeCompare(b)).slice(0, 100)) {
      const row = body.insertRow(); [name, value.total, value.assigned, value.total - value.assigned].forEach(v => { row.insertCell().textContent = String(v); });
    }
    panel.append(summary, element('small', 'Multi-trained staff appear in each relevant training row; the total above counts people once.'));
    mergePersonnelPanels();
  }
  async function fleetSnapshot() {
    if (!flags.extendedBuilding?.personnelDemands && !enabled('assignedCrew') && !flags.extendedBuilding?.vehicleTypes && !flags.extendedBuilding?.personnelAssignmentBtn && !(assignment && flags.extendedBuilding?.enhancedPersonnelAssignment)) return;
    if (apiJob || (!building && !personnel && !assignment && !vehicle)) return;
    apiJob = true; controller = new AbortController(); const current = controller, ticket = generation;
    const timeout = setTimeout(() => current.abort(), 20000);
    try {
      state.fetches++;
      const response = await fetch('/api/vehicles', { signal: current.signal, credentials: 'same-origin', redirect: 'error' });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const reader = response.body.getReader(), decoder = new TextDecoder(); let raw = '', size = 0;
      try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 12 * 1024 * 1024) { await reader.cancel(); throw Error('Vehicle register is too large'); } raw += decoder.decode(value, { stream: true }); } raw += decoder.decode(); } finally { reader.releaseLock(); }
      const items = JSON.parse(raw); raw = ''; if (!Array.isArray(items)) throw Error('Unrecognised vehicle register');
      const buildingId = /^\/buildings\/(\d+)/.exec(path)?.[1], vehicleId = /^\/vehicles\/(\d+)/.exec(path)?.[1];
      const wanted = new Set(Array.from(document.querySelectorAll('#vehicle_table a[href^="/vehicles/"]')).slice(0, 10000).map(a => a.getAttribute('href').match(/^\/vehicles\/(\d+)/)?.[1]).filter(Boolean));
      const next = new Map();
      for (let i = 0; i < Math.min(items.length, 30000); i++) {
        if (i % 250 === 0) { await new Promise(resolve => setTimeout(resolve, 0)); if (!visible() || ticket !== generation) return; }
        const v = items[i]; if (!v || !validId(v.id)) continue;
        if (String(v.building_id) !== buildingId && String(v.id) !== vehicleId && !wanted.has(String(v.id))) continue;
        next.set(String(v.id), { id: v.id, name: text(v.caption,256), type: numeric(v.vehicle_type), assigned: numeric(v.assigned_personnel_count), limit: numeric(v.max_personnel_override), status: numeric(v.fms_real), building: String(v.building_id) });
      }
      if (!visible() || ticket !== generation) return;
      registry = next; registryTime = Date.now(); await staffDisplay(items.length > 30000); if(personnel||assignment)personnelSummary();fitPersonnel();
    } catch (err) {
      if (ticket === generation && visible()) {
        const anchor = document.getElementById('vehicle_table') || document.getElementById('personal_table') || document.querySelector('h1');
        if(building&&window.__NEXUS_BUILDING_OVERVIEW__)window.__NEXUS_BUILDING_OVERVIEW__.failFleet(err.message);
        else if(flags.extendedBuilding?.personnelDemands) { const panel = box('nx-personnel-demand', anchor, 'Crew data'); if (panel) panel.append(element('div', `Crew data unavailable (${text(err.message, 100)}). Existing game controls remain available.`));mergePersonnelPanels(); }
      }
    } finally { clearTimeout(timeout); if (controller === current) { apiJob = false; controller = null; } }
  }
  async function staffDisplay(partial = false) {
    const table = document.getElementById('vehicle_table'); let sumMin = 0, sumMax = 0, activeMin = 0, activeMax = 0, assigned = 0, unknown = 0, missingAssigned = 0;
    for (const v of registry.values()) {
      const definition = D.types[v.type]; if (!definition) { unknown++; continue; }
      const max = v.limit ?? definition.max; sumMin += definition.min; sumMax += max;
      if (v.status !== 6) { activeMin += definition.min; activeMax += max; }
      if (v.assigned === null) missingAssigned++; else assigned += v.assigned;
    }
    const anchor = table || document.getElementById('personal_table') || document.querySelector('h1');
    if(building&&window.__NEXUS_BUILDING_OVERVIEW__)window.__NEXUS_BUILDING_OVERVIEW__.setFleet([...registry.values()],partial,registryTime,()=>void fleetSnapshot());
    const panel = !flags.extendedBuilding?.personnelDemands||building&&window.__NEXUS_BUILDING_OVERVIEW__?null:box('nx-personnel-demand', anchor, 'Personnel requirements'); if (panel) {
      panel.replaceChildren(element('strong', `${personnel||assignment?'Crew requirements':'Nexus · Personnel requirements'}: min ${sumMin} / max ${sumMax}`),
        element('div', `Excluding status 6: min ${activeMin} / max ${activeMax} · Assigned crew: ${assigned}${missingAssigned ? ` (${missingAssigned} not reported)` : ''}`),
        element('small', `${registry.size} vehicles · ${partial || unknown ? `Partial: ${unknown} unknown types or register limit reached · ` : ''}Read ${new Date(registryTime).toLocaleTimeString('en-GB')}. Assigned crew is not the current crew aboard.`));
      const refresh = element('button', 'Refresh crew'); refresh.type = 'button'; refresh.addEventListener('click', () => { void fleetSnapshot(); }); panel.append(refresh);
      mergePersonnelPanels();
    }
    let rowNumber = 0; const ticket = generation;
    for (const row of Array.from(table?.querySelectorAll('tbody tr') || []).slice(0, 10000)) {
      if (rowNumber++ % 100 === 0) { await new Promise(resolve => setTimeout(resolve, 0)); if (ticket !== generation || !visible()) return; }
      const a = row.querySelector('a[href^="/vehicles/"]'), id = a?.getAttribute('href')?.match(/^\/vehicles\/(\d+)/)?.[1], v = registry.get(id); if (!v || !a) continue;
      const definition = D.types[v.type], max = v.limit ?? definition?.max ?? null;
      let info = row.querySelector('[data-nx-crew]');
      if (!info && enabled('assignedCrew')) {
        const cell = row.lastElementChild || a.parentElement;
        // Keep the game's numeric source for readers without displaying a second,
        // contradictory staff figure beside the requested assigned/max display.
        for (const child of Array.from(cell.childNodes)) if (child.nodeType === Node.TEXT_NODE && /^\s*\(?\d+(?:\s*\/\s*\d+)?\)?\s*$/.test(child.textContent)) {
          const original = element('span', undefined, 'nx-original-hidden'); child.before(original); original.append(child);
        }
        info = element('span', '', 'nx-staff'); info.dataset.nxCrew = id; cell.append(info);
      }
      const display = ` Assigned ${nf(v.assigned)} / max ${nf(max)}`;
      if(info){set(info, display); info.className = `nx-staff ${v.assigned === null || max === null ? 'nx-unknown' : v.assigned < max ? 'nx-short' : 'nx-good'}`;}
      if (flags.extendedBuilding?.vehicleTypes && !a.parentElement.querySelector('[data-nx-building-type]')) { const label = element('small', ` ${definition?.name || `Type ${v.type}`}`, 'nx-type'); label.dataset.nxBuildingType = '1'; a.after(label); }
      if (flags.extendedBuilding?.personnelAssignmentBtn && !row.querySelector('[data-nx-assignment]')) {
        const link = element('a', 'Assign crew', 'nx-crew-links'); link.href = `/vehicles/${id}/zuweisung`; link.dataset.nxAssignment = id; (row.lastElementChild || a.parentElement).append(link);
      }
    }
  }
  function fitPersonnel() {
    if (!assignment || !flags.extendedBuilding?.enhancedPersonnelAssignment) return;
    const id = path.match(/\d+/)?.[0], v = registry.get(id), spec = D.types[v?.type], table = document.getElementById('personal_table');
    if (!spec || !table) return;
    const existing=document.getElementById('nx-personnel-filter');if(existing){existing.refreshPersonnel?.(spec);return;}
    const panel = box('nx-personnel-filter', table, 'Personnel filters'); if (!panel) return;
    panel.querySelector('strong').textContent='Personnel filters';
    panel.append(element('div', `Training for ${spec.name}: ${spec.training.join(', ') || 'No specialist training requirement in the reference data.'}`));
    const search = element('input'); search.type = 'search'; search.placeholder = 'Find personnel or training'; search.setAttribute('aria-label', 'Find personnel or training');
    const label = element('label'), checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.checked = flags.extendedBuilding?.['enhancedPersonnelAssignment.toggleFittingPersonnel'] === true; label.append(checkbox, ' Show staff with the vehicle’s training'); panel.append(search, label);
    let currentSpec=spec;
    const apply = () => {
      const query = text(search.value).toLowerCase(),layout=P.columns(table);
      for (const row of Array.from(table.querySelectorAll('tbody tr')).slice(0, 10000)) {
        const person=P.read(row,layout);if(!person)continue;
        const trained = !person.trainingKnown || P.matches(person,currentSpec.training);
        const searchable=`${text(row.textContent)} ${person.training.join(' ')}`.toLowerCase();
        row.classList.toggle('nx-group-hidden', !(searchable.includes(query) && (!checkbox.checked || trained)) && !row.querySelector('input:checked'));
      }
    };
    panel.refreshPersonnel=next=>{currentSpec=next;apply();};
    search.addEventListener('input', apply); checkbox.addEventListener('change', apply);
    table.addEventListener('change',event=>{if(visible()&&event.target.matches('input[type="checkbox"]'))apply();});
    apply();
    mergePersonnelPanels();
  }
  function profileId() {
    if (!enabled('profileId')) return;
    const id = path.match(/^\/profile\/(\d+)/)?.[1]; if (!id || document.getElementById('nx-profile-id')) return;
    const heading = document.querySelector('h1'); if (!heading) return; const label = element('small', ` · Player ${id}`); label.id = 'nx-profile-id'; heading.append(label);
  }
  function chatExtras() {
    const chat = document.getElementById('chat_panel_body'); if (!chat) return;
    for (const node of Array.from(chat.querySelectorAll('[data-message-time]')).slice(-150)) {
      if (flags.chatExtras?.chatTime) {
        const time = epoch(node.getAttribute('data-message-time')); const user = node.querySelector('.mission_chat_message_username');
        if (time && user && !user.querySelector('[data-nx-chat-time]')) {
          const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(time).map(p => [p.type, p.value]));
          const stamp = element('span', `[${parts.day}.${parts.month} ${parts.hour}:${parts.minute}:${parts.second}] `);
          stamp.dataset.nxChatTime = '1'; user.prepend(stamp);
          if (stamp.nextSibling?.nodeType === Node.TEXT_NODE && /^\s*\[.*\]/.test(stamp.nextSibling.textContent)) stamp.nextSibling.textContent = stamp.nextSibling.textContent.replace(/^\s*\[[^\]]*\]\s*/, '');
        }
      }
    }
    if (flags.chatExtras?.selfHighlight && validId(window.user_id)) {
      for (const a of Array.from(chat.querySelectorAll(`a[href="/profile/${window.user_id}"]`)).slice(-150)) { a.style.backgroundColor = '#5cb85c'; a.style.color = '#173a20'; }
    }
  }
  function expansions() {
    if(building&&window.__NEXUS_BUILDING_OVERVIEW__){window.__NEXUS_BUILDING_OVERVIEW__.expansions();return;}
    const table = document.getElementById('ausbauten'); if (!table || !flags.extendedBuilding?.expansions) return;
    let panel = document.getElementById('nx-expansions');
    if (!panel) { panel = box('nx-expansions', document.querySelector('dl.dl-horizontal') || table, 'Extensions'); if (!panel) return; }
    const source = Array.from(table.querySelectorAll('tbody tr')).slice(0, 100);
    const value = source.map(row => { const name = text(row.querySelector('b')?.textContent, 100); if (!name) return ''; const finish = epoch(row.querySelector('[data-end-time]')?.getAttribute('data-end-time')); return `${name}: ${finish ? `ready in ${duration((finish - Date.now()) / 1000)}` : text(row.querySelector('.label')?.textContent, 80) || 'See extension tab'}`; }).filter(Boolean).join(' · ');
    set(panel, `Nexus · ${value || 'No extension rows loaded.'}`);
  }
  function watchVehicleAdditions() {
    const table = document.getElementById('vehicle_show_table_all'); if (!table) return;
    // Watch only row insertion/removal. Checkbox attributes and label text do not trigger a full scan.
    const observer = new MutationObserver(records => {
      if (!visible()) return;
      if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1 && (n.tagName === 'TR' || n.tagName === 'TBODY')))) schedule(refreshVehicleRows);
    });
    observer.observe(table, { childList: true, subtree: true }); observers.push(observer);
  }
  function refreshVehicleRows() { void decorateVehicles(); if (group >= 0) void filterVehicles(group); selection(); }
  function tick() {
    clearTimeout(timer); timer = null; if (!visible()) { suspend(); return; }
    const begin = performance.now(); state.passes++; tickNumber++;
    if (mission || home) patientTimes();
    if (mission && tickNumber % 10 === 1) { generatedTime(); missing(); patients(); vehicleTabs(); window.__NEXUS_COMMANDS__?.activate(); window.__NEXUS_REQUIREMENT_TICKS__?.activate(); }
    if (home) { currency(); if (tickNumber % 10 === 1) chatExtras(); }
    if (building && tickNumber % 10 === 1) expansions();
    state.lastPassMs = Math.round((performance.now() - begin) * 100) / 100;
    timer = setTimeout(tick, mission || home ? 1000 : 10000);
  }
  function suspend() {
    if(building)window.__NEXUS_BUILDING_OVERVIEW__?.suspend();
    if (home) window.__NEXUS_CURRENCY__?.suspend();
    if (mission) { restoreVehicleTabs(); window.__NEXUS_COMMANDS__?.suspend(); window.__NEXUS_REQUIREMENT_TICKS__?.suspend(); }
    generation++; clearTimeout(timer); timer = null; clearTimeout(deferred); deferred = null; pending.clear(); observers.forEach(o => o.disconnect()); observers = [];
    controller?.abort(); controller = null; apiJob = false; registry.clear(); patientDeadlines.clear(); decorateAgain = false; state.active = false;
  }
  function activate() {
    if (!visible() || state.active) return; state.active = true; state.started = true;
    if(building)window.__NEXUS_BUILDING_OVERVIEW__?.activate();
    if (home) { currency(); chatExtras(); observe(document.getElementById('chat_panel_body'), chatExtras); }
    if (mission) {
      window.__NEXUS_COMMANDS__?.activate();
      window.__NEXUS_REQUIREMENT_TICKS__?.activate();
      generatedTime(); missing(); patients(); vehicleTabs(); selection(); void decorateVehicles();
      observe(document.getElementById('missing_text'), missing);
      const patientRoot = document.querySelector('.mission_patient')?.parentElement;
      if (patientRoot && !patientRoot.querySelector('#vehicle_show_table_all')) observe(patientRoot, patients);
      watchVehicleAdditions();
    }
    if (personnel || assignment) { personnelSummary(); observe(document.getElementById('personal_table'), () => {personnelSummary();fitPersonnel();}); }
    if (building || personnel || assignment || vehicle) { void fleetSnapshot(); if (building) expansions(); }
    profileId(); tick();
  }
  document.addEventListener('change', event => {
    if (!visible() || !mission || !event.target.matches?.('input.vehicle_checkbox')) return;
    if (group >= 0) {
      const row = event.target.closest('tr');
      if (row?.closest('#vehicle_show_table_all')) row.classList.toggle('nx-group-hidden', !D.groups[group].types.includes(typeFor(row)) && !row.querySelector('input:checked'));
    }
    schedule(selection);
  });
  document.addEventListener('mouseover', event => { if (visible() && mission) arrHover(event); });
  document.addEventListener('focusin', event => { if (visible() && mission) arrHover(event); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); else activate(); });
  window.addEventListener('pagehide', () => { suspend(); processed = new WeakSet(); });
  window.addEventListener('pageshow', activate);
  // A user-opened lightbox can become visible after its document has loaded.
  window.addEventListener('focus', activate);
  activate();
})();
