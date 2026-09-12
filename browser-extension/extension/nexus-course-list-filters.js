/* Filters existing course rows in place. No requests, navigation or enrolment. */
(() => {
  'use strict';
  if (!/^\/schoolings\/?$/.test(location.pathname) || globalThis.NexusSettings?.enabled('courseListFilters') === false || globalThis.__NEXUS_COURSE_LIST_FILTERS__) return;
  const tables = [['schooling_own_table', 'With participants'], ['schooling_opened_table', 'Open courses']];
  const hiddenClass = 'nx-course-list-filtered';
  const filtered = new WeakSet();
  const text = value => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);
  const normal = value => text(value).toLocaleLowerCase('en-GB');
  let active = false, root, typeSelect, nameSelect, status, hint, rows = [], observers = [], timer = null, reindex = false, passes = 0, shortcut = [], initialShortcut = false;
  globalThis.__NEXUS_COURSE_LIST_FILTERS__ = {snapshot: () => ({active, rows: rows.length, passes})};
  function visible() {
    if (document.hidden) return false;
    try {
      let win = window;
      while (true) {
        if (/^mcn-v3-(active-worker|pipeline-preload)-/.test(win.name || '')) return false;
        if (win === win.top) return true;
        const frame = win.frameElement;
        if (!frame || frame.matches('[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload],#mcn-v3-background-mission-worker') || frame.getAttribute('aria-hidden') === 'true') return false;
        const css = win.parent.getComputedStyle(frame);
        if (css.display === 'none' || css.visibility === 'hidden' || !frame.getClientRects().length) return false;
        win = win.parent;
      }
    } catch { return false; }
  }
  function courseLink(row) {
    for (const anchor of row.querySelectorAll('a[href]')) {
      try { const url = new URL(anchor.getAttribute('href'), location.origin); if (url.origin === location.origin && /^\/schoolings\/\d+\/?$/.test(url.pathname)) return anchor; } catch {}
    }
    return null;
  }
  function readShortcut() {
    shortcut = []; initialShortcut = false;
    try {
      if (location.hash.length > 16384) return;
      const raw = new URLSearchParams(location.hash.slice(1)).get('nexus-training'); if (!raw) return;
      const groups = JSON.parse(raw);
      if (!Array.isArray(groups) || !groups.length || groups.length > 40) return;
      for (const group of groups) {
        if (!group || typeof group.name !== 'string' || !text(group.name) || group.name.length > 200 || !Array.isArray(group.aliases) || group.aliases.length > 8 || group.aliases.some(a => typeof a !== 'string' || a.length > 200)) return;
      }
      shortcut = groups.map(g => ({name: text(g.name), aliases: new Set([normal(g.name), ...g.aliases.map(normal)])})); initialShortcut = true;
    } catch { /* An unrelated or malformed fragment leaves normal filtering usable. */ }
  }
  const stationMatch = row => shortcut.some(group => group.aliases.has(row.name));
  function readNames() {
    const selected = nameSelect.value, oldLabel = nameSelect.selectedOptions[0]?.textContent;
    const choices = new Map(rows.filter(row => !typeSelect.value || row.key === typeSelect.value).map(row => [`name:${row.name}`, row.caption]));
    nameSelect.replaceChildren(new Option('All active courses', ''));
    if (shortcut.length) nameSelect.append(new Option('All station training', '@station'));
    for (const [key, label] of [...choices].sort((a, b) => a[1].localeCompare(b[1], 'en-GB'))) nameSelect.append(new Option(label, key));
    // A course ending must not silently broaden a selected filter to other courses.
    if (selected.startsWith('name:') && !choices.has(selected)) {
      const option = new Option(`${oldLabel?.replace(/ \(no active courses\)$/, '') || selected.slice(5)} (no active courses)`, selected); option.disabled = true; nameSelect.append(option);
    }
    nameSelect.value = selected;
  }
  function readRows() {
    const previous = new Set(rows.map(row => row.node)); rows = [];
    for (const [id, label] of tables) {
      for (const node of document.querySelectorAll(`#${id} tbody tr`)) {
        const link = courseLink(node); if (!link) continue;
        const caption = text(link.textContent), parts = caption.match(/^(.+?)\s+[-–—]\s+(.+)$/);
        const type = parts ? text(parts[1]) : 'Uncategorised', name = parts ? text(parts[2]) : caption;
        rows.push({node, link, table: id, label, type, key: parts ? `type:${normal(type)}` : 'unclassified', caption: name, name: normal(name)});
        previous.delete(node);
      }
    }
    for (const node of previous) node.classList.remove(hiddenClass);
    const selected = typeSelect.value, oldLabel = typeSelect.selectedOptions[0]?.textContent, types = new Map(rows.map(row => [row.key, row.type]));
    // Retain an active filter if its final matching row disappears while a course
    // ends. Do not silently reveal unrelated courses in its place.
    if (selected && !types.has(selected)) types.set(selected, oldLabel);
    typeSelect.replaceChildren(new Option('All course types', ''));
    for (const [key, label] of [...types].sort((a, b) => a[1].localeCompare(b[1], 'en-GB'))) typeSelect.append(new Option(label, key));
    typeSelect.value = selected;
    if (initialShortcut) {
      const matchingTypes = new Set(rows.filter(stationMatch).map(row => row.key));
      typeSelect.value = matchingTypes.size === 1 ? [...matchingTypes][0] : '';
      nameSelect.replaceChildren(new Option('All station training', '@station')); nameSelect.value = '@station'; initialShortcut = false;
    }
    readNames();
  }
  function apply() {
    if (!active || !root?.isConnected || !visible()) return;
    const type = typeSelect.value, course = nameSelect.value;
    // Batch writes before checking visibility so the native search can remain
    // active too, without alternating layout reads and writes for each row.
    for (const row of rows) {
      const hide = !!((type && row.key !== type) || (course === '@station' ? !stationMatch(row) : course && `name:${row.name}` !== course));
      if (hide) filtered.add(row.node); else filtered.delete(row.node);
      row.node.classList.toggle(hiddenClass, hide);
    }
    const counts = tables.filter(([id]) => document.getElementById(id)).map(([id, label]) => {
      const items = rows.filter(row => row.table === id);
      const shown = items.filter(({node}) => !node.hidden && node.getClientRects().length > 0 && getComputedStyle(node).visibility === 'visible').length;
      return `${label}: ${shown} of ${items.length} shown`;
    });
    const message = counts.join(' · '); if (status.textContent !== message) status.textContent = message;
    const detail = course === '@station' ? `Station training: ${shortcut.map(g => g.name).join('; ')}. The game’s search still applies.` : 'Filters both course lists. The game’s search and sorting still apply.';
    if (hint.textContent !== detail) hint.textContent = detail;
    passes++;
  }
  function schedule(index = false) {
    reindex ||= index;
    if (!active || timer !== null || !visible()) return;
    timer = setTimeout(() => { timer = null; if (!active) return; if (reindex) { reindex = false; readRows(); } apply(); }, 100);
  }
  const nativeClasses = value => String(value || '').split(/\s+/).filter(part => part && part !== hiddenClass).sort().join(' ');
  function changed(records) {
    let index = false, visibility = false;
    for (const record of records) {
      if (record.type === 'attributes' && record.target.tagName === 'TR') {
        if (record.attributeName !== 'class' || nativeClasses(record.oldValue) !== nativeClasses(record.target.className) || filtered.has(record.target) !== record.target.classList.contains(hiddenClass)) visibility = true;
      } else if (record.type === 'characterData') {
        if (record.target.parentElement?.closest('a[href]')) index = true;
      } else if (record.type === 'childList') {
        // Countdown text, price, seats and owner updates do not re-filter lists.
        if (record.target.closest?.('a[href]') || [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && (node.matches('tr,tbody,a[href]') || node.querySelector('tr,a[href]')))) index = true;
      }
    }
    if (index || visibility) schedule(index);
  }
  const el = (tag, content) => { const node = document.createElement(tag); if (content !== undefined) node.textContent = content; return node; };
  function start() {
    if (active || !visible()) return;
    const targets = tables.map(([id]) => document.getElementById(id)).filter(Boolean); if (!targets.length) return;
    active = true;
    root = el('section'); root.id = 'nx-course-list-filters'; root.setAttribute('aria-label', 'Nexus course list filters');
    const style = el('style'); style.textContent = `
      #nx-course-list-filters{box-sizing:border-box;background:#102338;color:#eef5ff;border:1px solid #7891aa;border-left:4px solid #579cc5;border-radius:5px;padding:10px 12px;margin:10px 0;font:13px system-ui,sans-serif}
      #nx-course-list-filters strong{display:block;color:#b9e1fc;margin-bottom:8px}#nx-course-list-filters .nx-course-list-controls{display:flex;align-items:end;flex-wrap:wrap;gap:10px}#nx-course-list-filters label{display:flex;flex-direction:column;gap:4px;font-weight:600;min-width:0}
      #nx-course-list-filters :is(input,select){box-sizing:border-box;width:250px;max-width:100%;background:white;color:#132536;border:1px solid #7891aa;border-radius:4px;padding:7px;font:inherit}#nx-course-list-filters button{background:#1d415d;color:white;border:1px solid #7193ac;border-radius:4px;padding:7px 10px;font:inherit;cursor:pointer}#nx-course-list-filters :focus-visible{outline:2px solid #69c8ff;outline-offset:2px}#nx-course-list-filters p{margin:7px 0 0}#nx-course-list-filters small{display:block;margin-top:6px;color:#c4d6e5;font-size:.85em}
      #schooling_own_table tr.nx-course-list-filtered,#schooling_opened_table tr.nx-course-list-filtered{display:none!important}
      @media(max-width:600px){#nx-course-list-filters label,#nx-course-list-filters :is(input,select){width:100%}}
      html[data-nexus-layout=phone] #nx-course-list-filters label,html[data-nexus-layout=phone] #nx-course-list-filters :is(input,select){width:100%}html[data-nexus-touch=true] #nx-course-list-filters :is(input,select,button){min-height:44px}
      html[data-nexus-desktop-phone] #nx-course-list-filters{font-size:calc(13px * var(--nx-ui-scale))}html[data-nexus-desktop-phone] #nx-course-list-filters :is(input,select,button){min-height:calc(44px * var(--nx-ui-scale))}
    `;
    root.append(style, el('strong', 'Nexus · Course filters'));
    const controls = el('div'); controls.className = 'nx-course-list-controls';
    const typeLabel = el('label', 'Course type'); typeSelect = el('select'); typeSelect.setAttribute('aria-label', 'Course type'); typeLabel.append(typeSelect);
    const nameLabel = el('label', 'Course name'); nameSelect = el('select'); nameSelect.setAttribute('aria-label', 'Course name'); nameLabel.append(nameSelect);
    const clear = el('button', 'Clear filters'); clear.type = 'button'; controls.append(typeLabel, nameLabel, clear); root.append(controls);
    status = el('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); hint = el('small'); root.append(status, hint);
    // Keep the native section headings, table headers, links and sorting intact.
    const before = targets[0].previousElementSibling; (before?.matches('h2,h3,h4') ? before : targets[0]).before(root);
    typeSelect.addEventListener('change', () => { nameSelect.value = ''; readNames(); apply(); }); nameSelect.addEventListener('change', apply);
    controls.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.tagName === 'SELECT') { event.preventDefault(); apply(); } });
    clear.addEventListener('click', () => {
      typeSelect.value = ''; nameSelect.value = ''; shortcut = [];
      const hash = new URLSearchParams(location.hash.slice(1));
      if (hash.has('nexus-training')) { hash.delete('nexus-training'); history.replaceState(history.state, '', location.pathname + location.search + (hash.size ? '#' + hash : '')); }
      readNames(); apply();
    });
    readShortcut(); readRows(); apply();
    observers = targets.map(table => { const observer = new MutationObserver(changed); observer.observe(table, {subtree:true,childList:true,characterData:true,attributes:true,attributeOldValue:true,attributeFilter:['class','style','hidden']}); return observer; });
  }
  function stop() {
    active = false; clearTimeout(timer); timer = null; reindex = false;
    for (const observer of observers) observer.disconnect(); observers = [];
    for (const row of rows) row.node.classList.remove(hiddenClass); rows = [];
    root?.remove(); root = typeSelect = nameSelect = status = hint = null; shortcut = [];
  }
  window.addEventListener('pagehide', stop); window.addEventListener('pageshow', start);
  document.addEventListener('visibilitychange', () => { if (!active) start(); else schedule(); });
  window.addEventListener('hashchange', () => { if (!active) return; typeSelect.value = ''; nameSelect.value = ''; readShortcut(); readRows(); apply(); });
  start();
})();
