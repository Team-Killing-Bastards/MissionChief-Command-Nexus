/* Nexus Tools: user-opened views, bounded snapshots, no game-function hooks. */
(() => {
  'use strict';
  if (window !== window.top || !globalThis.NexusNativeCore || document.getElementById('nexus-native-tools')) return;
  if (!/^\/(?:$|(?:buildings|vehicles|missions|profile|schoolings|credits)(?:\/|$))/.test(location.pathname)) return;
  const C = globalThis.NexusNativeCore;
  const MAX_ROWS = 20000, PAGE_SIZE = 50, MAX_BYTES = 12 * 1024 * 1024;
  const host = document.createElement('div'); host.id = 'nexus-native-tools';
  host.toggleAttribute('data-compact', document.documentElement.dataset.nexusLayout === 'phone');
  host.toggleAttribute('data-touch', document.documentElement.dataset.nexusTouch === 'true');
  const ui = host.attachShadow({ mode: 'open' });
  ui.innerHTML = `
  <style>
  :host{position:fixed;right:64px;top:7px;z-index:2147483001;color:#e7edf8;font:14px system-ui,sans-serif;line-height:1.45}
  *{box-sizing:border-box}[hidden]{display:none!important}button,input,select,textarea{font:inherit}
  button,a{cursor:pointer}button{color:#e7edf8;background:#17314b;border:1px solid #365779;border-radius:7px;padding:8px 12px}
  button:hover{background:#224465}button:disabled{opacity:.45;cursor:default}a{color:#90d2ff;text-decoration:none}a:hover{text-decoration:underline}
  button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #ffd57a;outline-offset:2px}
  #panel{position:fixed;right:16px;top:54px;width:min(850px,calc(100vw - 32px));height:min(800px,calc(100vh - 70px));display:flex;flex-direction:column;background:#0b1525;border:1px solid #365779;border-radius:14px;box-shadow:0 15px 55px #0008;overflow:hidden}
  header{display:flex;align-items:center;gap:10px;padding:16px 20px;background:#101f34;border-bottom:1px solid #29405a}header img{width:38px;height:38px}header .brand{flex:1}h1{font-size:18px;margin:0}header small{font-size:11px;color:#9caec8}
  #toggle{display:grid;place-items:center;width:36px;height:36px;padding:5px;border-radius:50%;border-color:#6598c3;box-shadow:0 4px 16px #0005}#toggle svg{height:23px;width:23px}
  #panel:not([hidden])~#toggle{display:none}
  #tabs{display:flex;gap:4px;padding:10px 14px;border-bottom:1px solid #29405a;flex-wrap:wrap}#tabs button{border-color:transparent;background:transparent;padding:7px 9px;font-size:13px}#tabs button[aria-pressed=true]{background:#234562;border-color:#537fa8}
  #body{padding:18px 20px;overflow:auto;flex:1;min-height:0}h2{font-size:21px;margin:0 0 5px}p{margin:6px 0 14px;color:#aabbd3}small{font-size:12px;color:#aabbd3}#intro{font-size:13px}
  #summary:empty,#homeLinks:empty{display:none}.toolbar:has(>#refresh[hidden]):has(>#cancel[hidden]){display:none}
  .toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}input,select,textarea{color:#e7edf8;background:#101f34;border:1px solid #365779;border-radius:6px;padding:9px}#search{flex:1;min-width:150px}#sort{max-width:160px}
  #groups{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0}#groups button{font-size:12px;padding:5px 9px}#groups button[aria-pressed=true]{border-color:#90d2ff;background:#24506b}
  .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:16px 0}.card{background:#122239;border:1px solid #29405a;border-radius:9px;padding:14px}.card strong{display:block;font-size:23px;margin:4px 0;overflow-wrap:anywhere}.card small{font-size:11px}
  .links{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.links a{display:inline-block;border:1px solid #365779;border-radius:6px;padding:8px 12px}#status{font-size:12px;min-height:19px;color:#b8cce3;margin:9px 0}#status.error{color:#ffb9a7}
  #rows{list-style:none;margin:0;padding:0}.row{display:flex;gap:10px;align-items:flex-start;padding:11px 0;border-bottom:1px solid #24354c}.row .info{flex:1;min-width:0}.row .title{font-weight:600;overflow-wrap:anywhere}.row small{display:block;margin-top:3px;overflow-wrap:anywhere}.row .actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.row .actions a{font-size:12px}.star{padding:4px 9px}.tag{color:#91dfc2}#pager{display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px}
  #settings label{display:block;margin:15px 0}#settings textarea{display:block;width:100%;height:190px;margin:8px 0;font:12px ui-monospace,monospace}#settings .check{display:flex;align-items:center;gap:10px}footer{padding:10px 20px;border-top:1px solid #29405a;font-size:11px;color:#9aabc3}
  .settings-group{border:1px solid #29405a;border-radius:8px;margin:12px 0;padding:12px;background:#101f34}.settings-group legend{padding:0 6px;color:#a6dbff;font-weight:650}.setting-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px}#settings .setting-row{display:flex;align-items:center;gap:10px;margin:0;padding:8px 0;font-size:13px}#settings .setting-row span{flex:1}#settings input[role=switch]{appearance:none;flex:none;width:36px;height:21px;border-radius:15px;padding:0;margin:0;background:#3b4a5e;position:relative;cursor:pointer}#settings input[role=switch]:before{content:'';position:absolute;width:15px;height:15px;left:2px;top:2px;background:white;border-radius:50%;transition:transform .12s}#settings input[role=switch]:checked{background:#2182af;border-color:#6bcdf4}#settings input[role=switch]:checked:before{transform:translateX(15px)}#settings input[type=number]{width:90px}#settings .save-row{position:sticky;bottom:-18px;background:#0b1525;border-top:1px solid #365779;padding:12px 0;margin-bottom:0}#settingsStatus{margin:8px 0;font-size:12px;color:#bde9d2}#settingsStatus.error{color:#ffb9a7}
  @media(max-width:650px){.setting-grid{grid-template-columns:1fr}}
  @media(max-width:550px){.cards{grid-template-columns:1fr}#body{padding:12px}#tabs{padding:7px}#panel{height:calc(100vh - 85px)}header{padding:10px}#clock{display:none}}
  :host([data-touch]):not([data-compact]) #panel{left:var(--nx-visible-left,8px);top:var(--nx-visible-top,8px);right:auto;width:min(850px,var(--nx-visible-width,calc(100vw - 16px)));height:min(800px,var(--nx-visible-height,calc(100dvh - 16px)))}
  :host([data-compact]) #panel{left:var(--nx-visible-left,8px);top:var(--nx-visible-top,8px);right:auto;width:var(--nx-visible-width,calc(100vw - 16px));height:var(--nx-visible-height,calc(100dvh - 16px));border-radius:10px;transform:scale(var(--nx-ui-scale,1));transform-origin:top left}
  :host([data-compact]) header{padding:8px 10px;flex:none}:host([data-compact]) header img{width:30px;height:30px}:host([data-compact]) header small{font-size:10px}:host([data-compact]) #clock{display:none}
  :host([data-compact]) #tabs{flex:none;flex-wrap:nowrap;overflow-x:auto;padding:4px;gap:0;overscroll-behavior:contain}:host([data-compact]) #tabs button{flex:0 0 auto;padding:8px;font-size:12px;min-height:44px}
  :host([data-compact]) #body{padding:12px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scroll-padding-block:12px 85px;overflow-x:hidden}
  :host([data-compact]) .setting-grid{grid-template-columns:minmax(0,1fr)}:host([data-compact]) .cards{grid-template-columns:1fr}:host([data-compact]) .settings-group{min-width:0;padding:10px}:host([data-compact]) #settings .save-row{bottom:-12px}
  :host([data-compact]) footer{padding:6px 10px;font-size:10px;flex:none}:host([data-compact]) #toggle{position:fixed;right:calc(8px + env(safe-area-inset-right,0px));top:calc(8px + env(safe-area-inset-top,0px))}
  :host([data-touch]) button,:host([data-touch]) .links a,:host([data-touch]) #settings .setting-row{min-height:44px;touch-action:manipulation}:host([data-touch]) #toggle{width:44px;height:44px}
  :host([data-touch]) #close{min-width:44px}
  :host([data-touch]) input:not([role=switch]),:host([data-touch]) select,:host([data-touch]) #settings textarea{font-size:16px;min-height:44px}
  :host([data-compact]) #panel header .brand{min-width:0}:host([data-compact]) #panel header small{overflow-wrap:anywhere}
  :host([data-compact]) #settings .setting-row span{min-width:0;overflow-wrap:anywhere}
  </style>
  <section id="panel" hidden role="dialog" aria-label="Nexus Tools">
    <header><img class="logo" alt=""><div class="brand"><h1>Nexus Tools</h1><small>MissionChief Command Nexus · 3.0.43.45</small></div><small id="clock"></small><button id="close" aria-label="Close Nexus Tools">×</button></header>
    <nav id="tabs" aria-label="Nexus tools views">
      <button data-view="home">Overview</button><button data-view="buildings">Buildings</button><button data-view="vehicles">Vehicles</button><button data-view="schoolings">Schooling</button><button data-view="settings">Settings</button>
    </nav>
    <main id="body"><h2 id="heading"></h2><p id="intro"></p><div id="summary"></div><div id="homeLinks" class="links"></div>
      <div id="filters" hidden><div class="toolbar"><input id="search" type="search" maxlength="120" aria-label="Search this view" placeholder="Search names, IDs or building IDs"><select id="sort" aria-label="Sort results"><option value="name">Name A–Z</option><option value="id">ID</option><option value="personnel">Fewest personnel</option><option value="amount">Highest credits</option></select><select id="fms" aria-label="Vehicle status" hidden><option value="">All statuses</option></select></div><div id="groups"></div></div>
      <div class="toolbar"><button id="refresh">Refresh</button><button id="cancel" hidden>Cancel loading</button></div>
      <div id="settings" hidden><p>Display and mission-control changes apply when you next open or refresh the relevant game page. Event Scanner and transport switches apply on save. Stop Auto before changing dispatch settings.</p><div id="settingSections"></div><fieldset class="settings-group"><legend>Tools & navigation</legend><div class="setting-grid"><label class="setting-row"><span>London clock while Tools is open</span><input id="showClock" type="checkbox" role="switch"></label><label class="setting-row"><span>Open map popup links in a separate tab</span><input id="mapLinks" type="checkbox" role="switch"></label></div><details><summary>Vehicle groups in this register</summary><label for="groupEditor">One name and list of type IDs per line</label><textarea id="groupEditor" spellcheck="false" aria-label="Vehicle groups"></textarea><small>Example: Firetruck: 0 1 16</small><button id="resetGroups">Restore my six groups</button></details></fieldset><fieldset class="settings-group"><legend>Reports & sharing</legend><p>Sharing is optional. Manage uploads and reporting in Sharing & Sync.</p><button id="sharingSettings">Sharing & Sync</button><button id="missionDiagnostics">Export open mission diagnostics</button><small id="diagnosticStatus" role="status"></small></fieldset><div class="save-row"><button id="saveSettings">Save settings</button><p id="settingsStatus" role="status" aria-live="polite"></p></div></div>
      <p id="status" role="status" aria-live="polite"></p><ul id="rows"></ul><div id="pager" hidden><button id="prev">Previous</button><small id="pageCount"></small><button id="next">Next</button></div>
    </main><footer>On-demand snapshots · links open separately · close to release loaded lists</footer>
  </section><button id="toggle" aria-expanded="false" aria-label="Nexus Tools" title="Nexus Tools"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M14 5a5 5 0 0 0-6 6L3 16a3 3 0 0 0 5 5l5-5a5 5 0 0 0 6-6l-4 4-4-4 4-4Z"/></svg></button>`;
  document.body.append(host);
  const $ = id => ui.getElementById(id);
  let menuEntry = null, helpToggle = null;
  const menuStyle = document.createElement('style');
  menuStyle.textContent = '.dropdown-menu .nx-tools-separator{height:1px;margin:8px 0;overflow:hidden;background:#fff;border:0}.dropdown-menu #nexus-tools-menu-link{display:flex;align-items:center;gap:9px}.dropdown-menu #nexus-tools-menu-link svg{width:20px;height:20px;flex:none}html[data-nexus-touch=true] #nexus-tools-menu-link{min-height:44px}html[data-nexus-layout=phone][data-nexus-tools-open],html[data-nexus-layout=phone][data-nexus-tools-open] body{overflow:hidden}';
  document.head.append(menuStyle);
  menuStyle.textContent += 'html[data-nexus-desktop-phone] .dropdown-menu:has(>#nexus-tools-menu-item){min-width:calc(220px * var(--nx-ui-scale));font-size:calc(14px * var(--nx-ui-scale))}html[data-nexus-desktop-phone] .dropdown-menu:has(>#nexus-tools-menu-item)>li>a{min-height:calc(44px * var(--nx-ui-scale));display:flex;align-items:center}html[data-nexus-desktop-phone] #nexus-tools-menu-link svg{width:calc(20px * var(--nx-ui-scale));height:calc(20px * var(--nx-ui-scale))}';
  function mountHelpMenu() {
    if (menuEntry?.isConnected) return;
    // Only inspect native navigation when it appears or is opened. No observer
    // sees the constantly changing mission/vehicle lists.
    for (const menu of document.querySelectorAll('.navbar .dropdown-menu,#navbar-main-collapse .dropdown-menu,.navbar-header .dropdown-menu')) {
      const links = [...menu.querySelectorAll('a')];
      const faq = links.find(a => /^(faq|frequently asked questions)$/i.test(a.textContent.trim()));
      const support = links.find(a => /^contact support$/i.test(a.textContent.trim()));
      if (!faq || !support || faq.closest('li')?.parentElement !== menu || support.closest('li')?.parentElement !== menu) continue;
      const contactRow = support.closest('li');
      menuEntry = document.createElement('li'); menuEntry.id = 'nexus-tools-menu-item';
      const entry = document.createElement('a'); entry.id = 'nexus-tools-menu-link'; entry.href = '#nexus-tools';
      entry.setAttribute('aria-haspopup', 'dialog'); entry.setAttribute('aria-expanded', 'false');
      entry.append($('toggle').querySelector('svg').cloneNode(true), document.createTextNode('Nexus Tools')); menuEntry.append(entry);
      menu.insertBefore(menuEntry, contactRow);
      const separator = () => { const node = document.createElement('li'); node.className = 'divider nx-tools-separator'; node.setAttribute('role', 'separator'); return node; };
      if (menuEntry.previousElementSibling?.matches('.divider,[role=separator]')) menuEntry.previousElementSibling.classList.add('nx-tools-separator');
      else menuEntry.before(separator());
      menuEntry.after(separator());
      helpToggle = menu.parentElement.querySelector('[data-toggle=dropdown],.dropdown-toggle');
      $('toggle').hidden = true;
      entry.addEventListener('click', e => {
        e.preventDefault();
        const focus = helpToggle || entry;
        menu.parentElement.classList.remove('open'); helpToggle?.setAttribute('aria-expanded', 'false');
        void open(focus);
      });
      return;
    }
    $('toggle').hidden = false; // Standalone mission pages may have no help menu.
  }
  function onNavigation(e) {
    if (e.target instanceof Element && e.target.closest('.navbar,#navbar-main-collapse,.navbar-header')) mountHelpMenu();
  }
  const S = globalThis.NexusSettings;
  let settingsDraft = null;
  function settingsNotice(message, error=false) { $('settingsStatus').textContent=message; $('settingsStatus').classList.toggle('error',error); }
  function renderSettings() {
    $('settingSections').replaceChildren();
    try { settingsDraft = S.snapshot(globalThis.NexusSettingsDefaults); }
    catch { settingsDraft=null; $('saveSettings').disabled=true; settingsNotice('Browser settings could not be read. Reload before saving.',true); return; }
    $('saveSettings').disabled=false; settingsNotice('');
    const groups = new Map();
    for (const [kind, specs] of [['runtime',S.runtime],['transport',S.transport],['features',S.features]]) for (const spec of specs) {
      const groupName=spec.group||'Transport requests';
      let grid=groups.get(groupName);
      if(!grid){const box=document.createElement('fieldset'),legend=document.createElement('legend');box.className='settings-group';legend.textContent=groupName;grid=document.createElement('div');grid.className='setting-grid';box.append(legend,grid);$('settingSections').append(box);groups.set(groupName,grid);}
      const label=document.createElement('label'),name=document.createElement('span'),input=document.createElement('input');
      label.className='setting-row';name.textContent=spec.label;input.dataset.settingKind=kind;input.dataset.settingId=spec.id;
      const number=kind==='runtime'&&typeof spec.fallback==='number';input.type=number?'number':'checkbox';
      if(number){input.min=spec.min;input.max=spec.max;input.step='1';input.value=settingsDraft[kind][spec.id];}else{input.setAttribute('role','switch');input.checked=settingsDraft[kind][spec.id];}
      label.append(name,input);grid.append(label);
    }
    $('showClock').checked=prefs.showClock;$('mapLinks').checked=prefs.mapLinks;
  }
  $('sharingSettings').addEventListener('click',async()=>{try{const reply=await chrome.runtime.sendMessage({type:'NEXUS_TOOLS_OPEN_OPTIONS'});if(!reply?.ok)throw Error();}catch{$('diagnosticStatus').textContent='Could not open Sharing & Sync. Open extension options from the browser toolbar.';}});
  $('missionDiagnostics').addEventListener('click',()=>{
    const docs=[document];
    for(const frame of [...document.querySelectorAll('iframe')].slice(0,24)){try{if(!/^mcn-v3-/.test(frame.name||'')&&!frame.matches('[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload]')&&frame.getClientRects().length&&frame.contentDocument)docs.push(frame.contentDocument);}catch{}}
    const doc=docs.find(d=>d.getElementById('mission-finder-wrapper'));
    if(doc){doc.dispatchEvent(new Event('nexus:export-mission-diagnostics'));$('diagnosticStatus').textContent='Export requested for the open mission.';}else $('diagnosticStatus').textContent='Open a mission window first, then export here.';
  });
  for (const logo of ui.querySelectorAll('.logo')) logo.src = chrome.runtime.getURL('icons/nexus-48.png');
  let prefs = { showClock: false, mapLinks: true, groups: C.cleanGroups(), favourites: [] };
  let view = 'home', rows = [], visible = [], offset = 0, group = '', request = null, clockTimer = null, renderTimer = null, generation = 0;
  let metadata = '', storageError = '', returnFocus = null;
  const titles = { home: 'Your command desk', buildings: 'Buildings & personnel', vehicles: 'Vehicle register', missions: 'Loaded missions', credits: 'Daily credit summary', schoolings: 'Training & schooling', favourites: 'Your favourites', settings: 'Nexus settings' };
  const intro = {
    home: 'Open a view when you need it. Building and vehicle registers use your account’s current game data.',
    buildings: 'Search your buildings, check staff counts and open personnel pages. Loads one snapshot when selected.',
    vehicles: 'Your vehicle groups, status and assigned personnel in one searchable register. Loads only when selected.',
    missions: 'A searchable snapshot of mission links currently loaded on this page. The game’s mission order stays intact.',
    credits: 'Reads the game’s daily credit summary. These are the rows returned by the game, not logger estimates.',
    schoolings: 'Search your running courses and advertised courses from the game’s schooling page.',
    favourites: 'Saved building, vehicle, mission and course links. Up to 100 favourites.',
    settings: 'Choose the conveniences you use. Settings are saved in this browser.'
  };
  function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
  function link(href, label) {
    const path = C.safePath(href); if (!path) return null;
    const a = document.createElement('a'); a.href = path; a.textContent = label; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  }
  function addLink(target, href, label) { const a = link(href, label); if (a) target.append(a); }
  function card(label, value, note) {
    const box = document.createElement('div'); box.className = 'card';
    const title = document.createElement('small'); title.textContent = label;
    const strong = document.createElement('strong'); strong.textContent = value;
    const small = document.createElement('small'); small.textContent = note;
    box.append(title, strong, small); return box;
  }
  function cards(items) { $('summary').className = 'cards'; $('summary').replaceChildren(...items.map(item => card(...item))); }
  const fmt = value => value === null || value === undefined ? 'Not reported' : new Intl.NumberFormat('en-GB').format(value);
  function stopRequest() { generation++; request?.abort(); request = null; $('cancel').hidden = true; }
  function release() {
    stopRequest(); clearTimeout(renderTimer); renderTimer = null; rows = []; visible = []; metadata = ''; offset = 0;
    $('rows').replaceChildren(); $('summary').replaceChildren(); $('homeLinks').replaceChildren(); $('groups').replaceChildren(); $('pager').hidden = true;
  }
  function startClock() {
    clearTimeout(clockTimer); clockTimer = null; $('clock').textContent = '';
    if ($('panel').hidden || document.hidden || !prefs.showClock) return;
    $('clock').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }).format(new Date()) + ' London';
    clockTimer = setTimeout(startClock, 60000 - Date.now() % 60000);
  }
  function close() {
    $('panel').hidden = true; $('toggle').setAttribute('aria-expanded', 'false'); release(); clearTimeout(clockTimer); clockTimer = null;
    menuEntry?.querySelector('a')?.setAttribute('aria-expanded', 'false');
    document.documentElement.removeAttribute('data-nexus-tools-open');
    returnFocus = null;
  }
  function busy(value) { $('cancel').hidden = !value; }
  async function save() {
    try { const reply = await chrome.runtime.sendMessage({ type: 'NEXUS_TOOLS_SAVE', data: prefs }); if (!reply?.ok) throw Error('Save failed'); storageError = ''; return true; }
    catch { storageError = 'Could not save settings. Changes last until this page is refreshed.'; status(storageError, true); return false; }
  }
  const initialSettings = chrome.runtime.sendMessage({ type: 'NEXUS_TOOLS_GET' }).then(saved => {
    if (!saved?.ok) throw Error('Settings unavailable');
    const value = saved.data;
    if (value && typeof value === 'object') prefs = { showClock: value.showClock === true, mapLinks: value.mapLinks !== false,
      groups: C.cleanGroups(value.groups), favourites: Array.isArray(value.favourites) ? value.favourites.map(C.favourite).filter(Boolean).slice(0, 100) : [] };
    else if (Array.isArray(saved.legacy)) prefs.favourites = saved.legacy.map(C.favourite).filter(Boolean).slice(0, 100);
  }).catch(() => { storageError = 'Saved settings could not be read.'; });
  function home() {
    const balance = C.parseCredits(document.querySelector('.credits-value')?.textContent);
    const coins = C.parseCredits(document.querySelector('.coins-value')?.textContent);
    const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' }).format(new Date());
    cards([['Current balance', fmt(balance), 'Read from the game header; not today’s income'], ['Coins', fmt(coins), 'Read from the game header'], ['Activity date', date, 'Europe/London']]);
    addLink($('homeLinks'), '/', 'Game & map'); addLink($('homeLinks'), '/credits', 'Credit transactions');
    addLink($('homeLinks'), '/credits/daily', 'Game daily summary'); addLink($('homeLinks'), '/credits/overview', 'Credit history'); addLink($('homeLinks'), '/schoolings', 'Game schooling');
    const profile = document.querySelector('#navbar-main-collapse a[href^="/profile/"], .navbar a[href^="/profile/"]');
    if (profile && C.safePath(profile.getAttribute('href'))) addLink($('homeLinks'), profile.getAttribute('href'), `Profile · ${profile.getAttribute('href').split('/')[2]}`);
    const currentBuilding = location.pathname.match(/^\/buildings\/(\d+)/)?.[1];
    const currentVehicle = location.pathname.match(/^\/vehicles\/(\d+)/)?.[1];
    if (currentBuilding) addLink($('homeLinks'), `/buildings/${currentBuilding}/personals`, 'This building’s personnel');
    if (currentVehicle) addLink($('homeLinks'), `/vehicles/${currentVehicle}/zuweisung`, 'Assign this vehicle’s personnel');
    status(storageError || 'Select a register above. No register is loading in the background.', !!storageError);
  }
  async function readResponse(path, signal) {
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal, redirect: 'error' });
    if (!response.ok) throw Error(`Game returned HTTP ${response.status}. Try again later.`);
    if (Number(response.headers.get('content-length')) > MAX_BYTES) { await response.body?.cancel(); throw Error('Response exceeds the 12 MiB snapshot limit. Open the game page instead.'); }
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let size = 0, data = '';
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); throw Error('Response exceeds the 12 MiB snapshot limit. Open the game page instead.'); }
        data += decoder.decode(value, { stream: true });
      }
      return data + decoder.decode();
    } finally { reader.releaseLock(); }
  }
  const pause = () => new Promise(resolve => setTimeout(resolve, 0));
  function cancelled(signal, ticket) { if (signal.aborted || ticket !== generation || $('panel').hidden) throw new DOMException('View closed', 'AbortError'); }
  async function loadApi(kind, signal, ticket) {
    const raw = await readResponse(`/api/${kind}`, signal); cancelled(signal, ticket);
    if (/^\s*</.test(raw)) throw Error('The game returned a web page instead of account data. Check that you are signed in.');
    let input; try { input = JSON.parse(raw); } catch { throw Error('The game returned an unreadable register. Retry later.'); }
    if (!Array.isArray(input)) throw Error('Unrecognised game register format. No data has been changed.');
    const output = [], seen = new Set();
    for (let i = 0; i < Math.min(input.length, MAX_ROWS); i++) {
      if (i % 250 === 0) { await pause(); cancelled(signal, ticket); }
      const row = C.project(input[i], kind);
      if (row && !seen.has(row.id)) { output.push(row); seen.add(row.id); }
    }
    return { rows: output, note: `${output.length.toLocaleString()} ${kind} in this snapshot${input.length > MAX_ROWS ? `; LIMITED to ${MAX_ROWS.toLocaleString()} source records` : ''}.` };
  }
  async function loadMissions(signal, ticket) {
    const output = [], seen = new Set(); let visited = 0;
    const scope = document.querySelector('#missions') || document.querySelector('#mission_list') || document.body;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_ELEMENT); let node;
    while (visited < 100000 && output.length < MAX_ROWS && (node = walker.nextNode())) {
      if (++visited % 200 === 0) { await pause(); cancelled(signal, ticket); }
      if (node.tagName !== 'A') continue;
      const path = C.safePath(node.getAttribute('href')); const match = path?.match(/^\/missions\/(\d+)$/);
      if (!match || seen.has(path)) continue;
      const label = C.text(node.textContent); if (!label) continue;
      seen.add(path); output.push({ id: match[1], href: path, label, kind: 'missions' });
    }
    return { rows: output, note: `${output.length} loaded mission links${visited >= 100000 || output.length >= MAX_ROWS ? '; scan limit reached, partial list' : ''}. This is not a completed-mission count.` };
  }
  async function loadHtml(kind, signal, ticket) {
    const route = kind === 'credits' ? '/credits/daily' : '/schoolings';
    const raw = location.pathname.replace(/\/$/, '') === route ? null : await readResponse(route, signal);
    cancelled(signal, ticket);
    const doc = raw === null ? document : new DOMParser().parseFromString(raw, 'text/html');
    const output = []; let invalid = 0;
    if (kind === 'credits') {
      const table = doc.querySelector('#daily_table'); if (!table) throw Error('Daily credit table was not returned. Open Game daily summary to check access.');
      const source = table.querySelectorAll('tbody tr');
      for (let i = 0; i < Math.min(source.length, MAX_ROWS); i++) {
        if (i % 200 === 0) { await pause(); cancelled(signal, ticket); }
        const cells = source[i].cells; if (cells.length < 4) { invalid++; continue; }
        const amount = C.parseCredits(cells[0].textContent), count = C.parseCredits(cells[2].textContent);
        if (amount === null || count === null) { invalid++; continue; }
        output.push({ kind, label: C.text(cells[3].textContent), amount, count, average: C.parseCredits(cells[1].textContent) });
      }
      const heading = C.text(doc.querySelector('h1, h2')?.textContent);
      return { rows: output, note: `${heading ? `${heading}. ` : ''}${output.length} game summary rows${invalid ? `; ${invalid} unreadable rows excluded (partial totals)` : ''}${source.length > MAX_ROWS ? '; row limit reached (partial totals)' : ''}. Coverage is the game page returned, not a guaranteed full London day.` };
    }
    const tables = [doc.querySelector('#schooling_own_table'), doc.querySelector('#schooling_opened_table')];
    if (!tables.some(Boolean)) throw Error('Schooling tables were not returned. Open Game schooling to check access.');
    const seen = new Set();
    for (let type = 0; type < tables.length; type++) {
      const source = tables[type]?.querySelectorAll('tr') || [];
      for (let i = 0; i < source.length && output.length < MAX_ROWS; i++) {
        if (i % 200 === 0) { await pause(); cancelled(signal, ticket); }
        const a = source[i].querySelector('a[href^="/schoolings/"]'); const path = C.safePath(a?.getAttribute('href'));
        if (!path || seen.has(path)) continue;
        seen.add(path); const cells = source[i].cells;
        output.push({ kind, href: path, id: path.split('/')[2], label: C.text(a.textContent), status: type === 0 ? 'own' : 'open',
          detail: Array.from(cells).slice(1, 5).map(cell => C.text(cell.textContent, 100)).filter(Boolean).join(' · ') });
      }
    }
    return { rows: output, note: `${output.length} courses${output.length >= MAX_ROWS ? '; row limit reached (partial list)' : ''}. Course details are copied as text from the game’s page.` };
  }
  function drawGroups() {
    $('groups').replaceChildren(); if (view !== 'vehicles') return;
    const add = (name, key) => { const b = document.createElement('button'); b.textContent = name; b.dataset.group = key; b.setAttribute('aria-pressed', String(group === key)); $('groups').append(b); };
    add('All vehicles', ''); prefs.groups.forEach((g, i) => add(g.name, String(i)));
  }
  function drawSummary() {
    if (view === 'credits') {
      const income = rows.reduce((sum, r) => sum + Math.max(0, r.amount), 0), expense = rows.reduce((sum, r) => sum + Math.min(0, r.amount), 0);
      cards([['Income in returned rows', fmt(income), 'Positive game credits'], ['Spending in returned rows', fmt(-expense), 'Negative game credits'], ['Net in returned rows', fmt(income + expense), metadata.includes('partial') ? 'Partial coverage — see below' : 'Income minus spending']]);
    } else if (view === 'buildings') {
      const known = rows.filter(r => r.personnel !== null);
      cards([['Buildings loaded', fmt(rows.length), 'Current account snapshot'], ['Reported personnel', fmt(known.reduce((sum, r) => sum + r.personnel, 0)), `${rows.length - known.length} buildings did not report staff`], ['Below staff target', fmt(rows.filter(r => r.personnel !== null && r.target !== null && r.personnel < r.target).length), 'Compared with each building’s saved target']]);
    } else if (view === 'vehicles') {
      cards([['Vehicles loaded', fmt(rows.length), 'Current account snapshot'], ['Assigned personnel', fmt(rows.filter(r => r.assigned !== null).reduce((sum, r) => sum + r.assigned, 0)), 'Assigned, not necessarily currently aboard'], ['Unassigned vehicles', fmt(rows.filter(r => r.assigned === 0).length), 'Only explicit zero assignments']]);
    } else if (view === 'schoolings') cards([['Your courses', fmt(rows.filter(r => r.status === 'own').length), 'Running courses listed by the game'], ['Advertised courses', fmt(rows.filter(r => r.status === 'open').length), 'Open courses listed by the game'], ['Total listed', fmt(rows.length), 'Refresh to check changes']]);
  }
  function drawRows() {
    if ($('panel').hidden || view === 'home' || view === 'settings') return;
    visible = C.filter(rows, { query: $('search').value, group, status: $('fms').value, sort: $('sort').value, groups: prefs.groups });
    offset = Math.min(offset, Math.max(0, Math.floor((visible.length - 1) / PAGE_SIZE) * PAGE_SIZE));
    $('rows').replaceChildren();
    for (const row of visible.slice(offset, offset + PAGE_SIZE)) {
      const li = document.createElement('li'); li.className = 'row'; const info = document.createElement('div'); info.className = 'info';
      const title = link(row.href, row.label) || document.createElement('span'); title.textContent = row.label; title.className = 'title'; info.append(title);
      const detail = document.createElement('small'), actions = document.createElement('div'); actions.className = 'actions';
      if (row.kind === 'buildings') {
        detail.textContent = `ID ${row.id} · Type ${fmt(row.type)} · Personnel ${fmt(row.personnel)} / target ${fmt(row.target)} · Level ${fmt(row.level)} · ${fmt(row.extensions)} extensions`;
        addLink(actions, `/buildings/${row.id}/personals`, 'Personnel'); if (row.dispatchCentre) addLink(actions, `/buildings/${row.dispatchCentre}`, `Dispatch centre ${row.dispatchCentre}`);
      } else if (row.kind === 'vehicles') {
        detail.textContent = `ID ${row.id} · ${row.typeLabel || `Type ${fmt(row.type)}`} · Status ${fmt(row.status)} · Assigned ${fmt(row.assigned)}${row.personnelLimit !== null ? ` · Staff limit override ${fmt(row.personnelLimit)}` : ''}`;
        addLink(actions, `/vehicles/${row.id}/zuweisung`, 'Assign personnel'); if (row.building) addLink(actions, `/buildings/${row.building}`, `Building ${row.building}`); if (row.mission) addLink(actions, `/missions/${row.mission}`, `Mission ${row.mission}`);
      } else if (row.kind === 'credits') detail.textContent = `${fmt(row.amount)} credits · ${fmt(row.count)} entries · Average ${fmt(row.average)}`;
      else if (row.kind === 'schoolings') detail.textContent = `${row.status === 'own' ? 'Your course' : 'Advertised course'} · ${row.detail}`;
      else detail.textContent = row.href || '';
      info.append(detail, actions); li.append(info);
      if (C.safePath(row.href)) {
        const button = document.createElement('button'); button.className = 'star'; button.dataset.href = row.href;
        const saved = prefs.favourites.some(f => f.href === row.href); button.textContent = saved ? '★' : '☆';
        button.setAttribute('aria-label', `${saved ? 'Remove favourite' : 'Favourite'}: ${row.label}`); li.append(button);
      }
      $('rows').append(li);
    }
    status(`${metadata} ${visible.length} matches · showing ${visible.length ? offset + 1 : 0}–${Math.min(offset + PAGE_SIZE, visible.length)}.${storageError ? ` ${storageError}` : ''}`);
    $('pager').hidden = visible.length <= PAGE_SIZE; $('prev').disabled = offset === 0; $('next').disabled = offset + PAGE_SIZE >= visible.length;
    $('pageCount').textContent = `Page ${Math.floor(offset / PAGE_SIZE) + 1} of ${Math.max(1, Math.ceil(visible.length / PAGE_SIZE))}`;
  }
  async function load() {
    stopRequest(); rows = []; visible = []; offset = 0; metadata = ''; $('rows').replaceChildren(); $('summary').replaceChildren(); $('pager').hidden = true;
    if (view === 'home') { $('homeLinks').replaceChildren(); home(); return; }
    if (view === 'favourites') { rows = prefs.favourites.map(r => ({ ...r, kind: 'favourite' })); metadata = 'Saved in this browser.'; drawRows(); return; }
    if (view === 'settings') return;
    const selectedView = view, ticket = generation, controller = new AbortController(); request = controller;
    const timeout = setTimeout(() => controller.abort('timeout'), 20000); busy(true); status('Loading snapshot…');
    try {
      const result = ['vehicles', 'buildings'].includes(selectedView) ? await loadApi(selectedView, controller.signal, ticket) :
        selectedView === 'missions' ? await loadMissions(controller.signal, ticket) : await loadHtml(selectedView, controller.signal, ticket);
      cancelled(controller.signal, ticket); rows = result.rows;
      metadata = `${result.note} Read at ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date())} London.`;
      if (view === 'vehicles') {
        $('fms').replaceChildren(new Option('All statuses', ''));
        [...new Set(rows.map(r => r.status).filter(n => n !== null))].sort((a, b) => a - b).forEach(n => $('fms').append(new Option(`Status ${n}`, String(n))));
      }
      drawSummary(); drawRows();
    } catch (err) {
      if (ticket !== generation || $('panel').hidden) return;
      status(controller.signal.aborted ? 'Loading stopped. Retry when ready.' : `Could not load this view: ${C.text(err.message, 250)}`, true);
    } finally { clearTimeout(timeout); if (ticket === generation) { request = null; busy(false); } }
  }
  function select(next) {
    if (!['home','buildings','vehicles','schoolings','settings'].includes(next)) return; release(); view = next; group = ''; $('search').value = ''; $('sort').value = 'name'; $('fms').value = '';
    $('heading').textContent = titles[view]; $('intro').textContent = intro[view]; $('filters').hidden = ['home', 'settings'].includes(view); $('settings').hidden = view !== 'settings';
    $('fms').hidden = view !== 'vehicles'; $('refresh').hidden = view === 'settings'; $('refresh').textContent = view === 'home' ? 'Refresh balance' : 'Refresh snapshot';
    for (const tab of ui.querySelectorAll('[data-view]')) tab.setAttribute('aria-pressed', String(tab.dataset.view === view));
    if (view === 'settings') { renderSettings(); $('groupEditor').value = prefs.groups.map(g => `${g.name}: ${g.types.join(' ')}`).join('\n'); status(''); }
    if (view === 'credits') addLink($('homeLinks'), '/credits/daily', 'Game daily summary');
    if (view === 'schoolings') addLink($('homeLinks'), '/schoolings', 'Game schooling');
    drawGroups(); void load(); $('body').scrollTop = 0;
  }
  async function open(focus) {
    if (!$('panel').hidden) { $('close').focus(); return; }
    await initialSettings; returnFocus = focus || document.activeElement;
    $('panel').hidden = false; $('toggle').setAttribute('aria-expanded', 'true');
    menuEntry?.querySelector('a')?.setAttribute('aria-expanded', 'true');
    document.documentElement.setAttribute('data-nexus-tools-open', '');
    select('home'); startClock(); $('close').focus({preventScroll:true});
  }
  $('toggle').addEventListener('click', () => { if (!$('panel').hidden) close(); else void open($('toggle')); });
  $('close').addEventListener('click', () => { const focus = returnFocus?.isConnected ? returnFocus : $('toggle'); close(); focus.focus(); });
  ui.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); const focus = returnFocus?.isConnected ? returnFocus : $('toggle'); close(); focus.focus(); }
    if (e.key === 'Tab' && !$('panel').hidden) {
      const focusable = [...$('panel').querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select,textarea,summary')].filter(n => n.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (e.shiftKey && ui.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && ui.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  });
  mountHelpMenu();
  document.addEventListener('click', onNavigation, true);
  document.addEventListener('focusin', onNavigation, true);
  $('tabs').addEventListener('click', e => { const next = e.target.closest('[data-view]')?.dataset.view; if (next) select(next); });
  $('refresh').addEventListener('click', load);
  $('cancel').addEventListener('click', () => { stopRequest(); status('Loading cancelled. No register data retained.'); });
  $('search').addEventListener('input', () => { clearTimeout(renderTimer); renderTimer = setTimeout(() => { offset = 0; drawRows(); }, 120); });
  $('sort').addEventListener('change', () => { offset = 0; drawRows(); }); $('fms').addEventListener('change', () => { offset = 0; drawRows(); });
  $('groups').addEventListener('click', e => { const button = e.target.closest('[data-group]'); if (!button) return; group = button.dataset.group; offset = 0; drawGroups(); drawRows(); });
  $('prev').addEventListener('click', () => { offset -= PAGE_SIZE; drawRows(); }); $('next').addEventListener('click', () => { offset += PAGE_SIZE; drawRows(); });
  $('rows').addEventListener('click', async e => {
    const href = e.target.closest('button[data-href]')?.dataset.href; if (!href) return;
    const item = rows.find(r => r.href === href); if (!item) return;
    if (prefs.favourites.some(r => r.href === href)) prefs.favourites = prefs.favourites.filter(r => r.href !== href);
    else if (prefs.favourites.length < 100) prefs.favourites.push(C.favourite(item));
    else { status('You have 100 favourites. Remove one before adding another.'); return; }
    if (view === 'favourites') rows = prefs.favourites.map(r => ({ ...r, kind: 'favourite' }));
    drawRows(); await save();
  });
  $('resetGroups').addEventListener('click', () => { $('groupEditor').value = C.groups.map(g => `${g.name}: ${g.types.join(' ')}`).join('\n'); });
  $('saveSettings').addEventListener('click', async () => {
    if(!settingsDraft)return;
    for(const input of $('settingSections').querySelectorAll('input')){if(!input.checkValidity()){input.reportValidity();return;}settingsDraft[input.dataset.settingKind][input.dataset.settingId]=input.type==='number'?Number(input.value):input.checked;}
    const lines = $('groupEditor').value.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 12 || lines.some(l => !/^.{1,40}:\s*\d+(?:[\s,]+\d+)*$/.test(l))) { status('Use up to 12 lines: a group name, colon, then numeric vehicle type IDs.', true); return; }
    const parsed = lines.map(line => { const [name, types] = line.split(':'); return { name: name.trim(), types: types.trim().split(/[\s,]+/).map(Number) }; });
    if (parsed.some(g => g.types.length > 200 || g.types.some(t => t >= 10000))) { status('Use up to 200 type IDs per group, each below 10000.', true); return; }
    try { S.save(settingsDraft); } catch(err) { settingsNotice(`Could not save all settings: ${err.message}`,true);return; }
    prefs.groups = C.cleanGroups(parsed); prefs.showClock = $('showClock').checked; prefs.mapLinks = $('mapLinks').checked; startClock();
    if (await save()) settingsNotice('Saved. Event Scanner and transport switches are applied. Other changes apply on the next page or mission load.');
    else settingsNotice('Game options saved, but Tools preferences could not be saved. Please retry.',true);
  });
  // Only real popup links respond; no Leaflet marker replacement or marker-array hooks.
  document.addEventListener('click', e => {
    if (!prefs.mapLinks || e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    const a = e.target.closest?.('.leaflet-popup-content a[href]'); if (!a || a.hasAttribute('data-method')) return;
    const path = C.safePath(a.getAttribute('href')); if (!path || !/^\/(?:missions|buildings)\/\d+$/.test(path)) return;
    const opened = window.open(path, '_blank'); if (!opened) return; opened.opener = null;
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  window.addEventListener('pagehide', () => { close(); returnFocus = null; });
  document.addEventListener('visibilitychange', () => {
    startClock(); if (document.hidden && request) { stopRequest(); status('Loading paused because this tab is hidden. Refresh when ready.'); }
  });
})();
