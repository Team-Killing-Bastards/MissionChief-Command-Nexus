/* Nexus filters for native course enrolment. No enrolment or personnel requests. */
(() => {
  'use strict';
  if (globalThis.NexusSettings?.enabled('schoolingFilters') === false ||
      !/^\/(?:schoolings|buildings)\/\d+\/?$/.test(location.pathname) ||
      globalThis.__NEXUS_SCHOOLING_FILTERS__) return;
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
  const id = value => /^\d{1,16}$/.test(String(value ?? '')) && Number(value) > 0 ? String(value) : null;
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 220);
  const normal = value => clean(value).toLocaleLowerCase('en-GB');
  let form, accordion, root, search, centres, status, refresh, observer, rows = [], buildings = null;
  let controller = null, timeout = null, debounce = null, generation = 0, active = false, requestCount = 0, restoredCentre = null;
  const state = globalThis.__NEXUS_SCHOOLING_FILTERS__ = { snapshot: () => ({active, rows: rows.length, buildings: buildings?.size || 0, requestCount}) };
  const el = (tag, text) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; };
  function indexRows() {
    rows = [...accordion.querySelectorAll('.panel-heading[building_id]')].map(heading => {
      const panel = heading.closest('.panel'); if (!panel || !accordion.contains(panel)) return null;
      const copy = heading.cloneNode(true); for (const badge of copy.querySelectorAll('.badge,.label,input,button')) badge.remove();
      return {panel, id: id(heading.getAttribute('building_id')), name: clean(copy.textContent)};
    }).filter(Boolean);
    updateCentres(); apply();
  }
  function membership(row) {
    if (!buildings?.has(row.id)) return '?';
    return buildings.get(row.id).centre;
  }
  function updateCentres() {
    if (!centres) return;
    const previous = restoredCentre ?? centres.value, options = new Map();
    if (buildings) for (const row of rows) {
      const centre = membership(row);
      options.set(centre, centre === '-' ? 'Unassigned' : centre === '?' ? 'Assignment unavailable' : buildings.get(centre)?.name || `Dispatch centre #${centre}`);
    }
    const labels = [...options.values()];
    centres.replaceChildren(new Option('All dispatch centres', ''));
    for (const [key, name] of [...options].sort((a, b) => a[1].localeCompare(b[1], 'en-GB', {numeric:true}))) {
      centres.append(new Option(labels.filter(label => label === name).length > 1 ? `${name} (#${key})` : name, key));
    }
    if ([...centres.options].some(option => option.value === previous)) centres.value = previous;
    if (buildings) restoredCentre = null;
    centres.disabled = !buildings;
  }
  function apply() {
    if (!active || !root?.isConnected) return;
    const query = normal(search.value), centre = centres.value; let matches = 0, kept = 0;
    for (const row of rows) {
      const match = (!query || normal(buildings?.get(row.id)?.name || row.name).includes(query) || normal(row.name).includes(query)) && (!centre || membership(row) === centre);
      // Never conceal personnel already chosen for this course. Native inputs,
      // expanded panels, submission fields and selection counters stay intact.
      const selected = !!row.panel.querySelector('input[type=checkbox]:checked');
      row.panel.classList.toggle('nx-course-filtered', !match && !selected);
      row.panel.classList.toggle('nx-course-kept', !match && selected);
      if (match) matches++; else if (selected) kept++;
    }
    status.textContent = `${matches} of ${rows.length} stations match${kept ? ` · ${kept} kept visible with selected staff` : ''}.`;
    try { window.schooling_check_educated_counter_visible_check?.(); } catch {}
  }
  function schedule() { clearTimeout(debounce); debounce = setTimeout(() => { debounce = null; apply(); }, 100); }
  async function load() {
    if (!active || controller || !visible()) return;
    const ticket = generation; controller = new AbortController(); const pending = controller, signal = pending.signal;
    timeout = setTimeout(() => pending.abort(), 15000); refresh.disabled = true;
    root.querySelector('[data-load-status]').textContent = 'Loading dispatch centres…';
    try {
      requestCount++;
      const response = await fetch('/api/buildings', {credentials:'same-origin', signal, headers:{Accept:'application/json'}});
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw Error('Building assignments could not be read.');
      const data = await response.json();
      if (!Array.isArray(data) || data.length > 100000) throw Error('Building assignments were not returned in the expected format.');
      const projected = new Map();
      for (const building of data) {
        const key = id(building?.id); if (!key) continue;
        const raw = building.leitstelle_building_id;
        projected.set(key, {name: clean(building.caption) || `Building #${key}`, centre: raw === null || raw === 0 || raw === '0' ? '-' : id(raw) || '?'});
      }
      if (!active || ticket !== generation) return;
      buildings = projected; updateCentres(); apply();
      root.querySelector('[data-load-status]').textContent = 'Stations with selected staff stay visible. Filters do not enrol anyone.';
    } catch (error) {
      if (!active || ticket !== generation) return;
      root.querySelector('[data-load-status]').textContent = `${signal.aborted ? 'Loading timed out.' : error.message} Station search still works; use Refresh centres to retry.`;
    } finally {
      if (ticket === generation) { clearTimeout(timeout); timeout = null; controller = null; if (refresh) refresh.disabled = false; }
    }
  }
  function start() {
    if (active || !visible()) return;
    form = document.querySelector('form[action$="/education"]'); accordion = form?.querySelector('#accordion');
    if (!accordion) return;
    active = true; generation++;
    root = el('section'); root.id = 'nx-schooling-filters'; root.setAttribute('aria-label', 'Nexus course personnel filters');
    const style = el('style'); style.textContent = `
      #nx-schooling-filters{box-sizing:border-box;background:#102338;color:#eef5ff;border:1px solid #7891aa;border-left:4px solid #579cc5;border-radius:5px;padding:10px 12px;margin:10px 0;font:13px system-ui,sans-serif}
      #nx-schooling-filters strong{display:block;color:#b9e1fc;margin-bottom:8px}#nx-schooling-filters .nx-course-controls{display:flex;align-items:end;flex-wrap:wrap;gap:10px}
      #nx-schooling-filters label{display:flex;flex-direction:column;gap:4px;font-weight:600;min-width:0}#nx-schooling-filters select,#nx-schooling-filters input{box-sizing:border-box;width:240px;max-width:100%;background:#fff;color:#132536;border:1px solid #7891aa;border-radius:4px;padding:7px;font:inherit}
      #nx-schooling-filters button{background:#1d415d;color:white;border:1px solid #7193ac;border-radius:4px;padding:7px 10px;font:inherit;cursor:pointer}#nx-schooling-filters button:disabled{opacity:.6;cursor:wait}#nx-schooling-filters :focus-visible{outline:2px solid #69c8ff;outline-offset:2px}
      #nx-schooling-filters p{margin:7px 0 0}#nx-schooling-filters [data-load-status]{font-size:11px;color:#c4d6e5}.nx-course-filtered{display:none!important}.nx-course-kept>.panel-heading{outline:2px solid #69c8ff;outline-offset:-2px}
      @media(max-width:600px){#nx-schooling-filters label{width:100%}#nx-schooling-filters select,#nx-schooling-filters input{width:100%}}
      html[data-nexus-layout=phone] #nx-schooling-filters label{width:100%}html[data-nexus-layout=phone] #nx-schooling-filters :is(select,input){width:100%}
      html[data-nexus-touch=true] #nx-schooling-filters :is(input,select,button){min-height:44px}html[data-nexus-desktop-phone] #nx-schooling-filters{font-size:calc(13px * var(--nx-ui-scale))}html[data-nexus-desktop-phone] #nx-schooling-filters :is(input,select,button){min-height:calc(44px * var(--nx-ui-scale));max-width:100%}
      html[data-nexus-desktop-phone] #nx-schooling-filters [data-load-status]{font-size:calc(11px * var(--nx-ui-scale))}
    `;
    root.append(style, el('strong', 'Nexus · Course personnel filters'));
    const controls = el('div'); controls.className = 'nx-course-controls';
    const dcLabel = el('label', 'Dispatch centre'); centres = el('select'); centres.setAttribute('aria-label','Dispatch centre'); centres.disabled = true; dcLabel.append(centres);
    const searchLabel = el('label', 'Station name'); search = el('input'); search.type = 'search'; search.placeholder = 'Find a station…'; search.setAttribute('aria-label','Station name'); searchLabel.append(search);
    const reset = el('button', 'Clear filters'); reset.type = 'button'; refresh = el('button', 'Refresh centres'); refresh.type = 'button';
    controls.append(dcLabel, searchLabel, reset, refresh); root.append(controls);
    status = el('p'); status.setAttribute('role','status'); status.setAttribute('aria-live','polite'); const hint = el('p'); hint.dataset.loadStatus = '1'; root.append(status, hint); accordion.before(root);
    centres.addEventListener('change', () => { restoredCentre = null; apply(); }); search.addEventListener('input', schedule);
    search.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); clearTimeout(debounce); apply(); } });
    reset.addEventListener('click', () => { search.value = ''; centres.value = ''; apply(); }); refresh.addEventListener('click', load);
    accordion.addEventListener('change', schedule);
    observer = new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes,...record.removedNodes].some(node => node.nodeType === 1 && (node.matches('.panel,.panel-heading[building_id]') || node.querySelector('.panel-heading[building_id]'))))) indexRows();
    });
    observer.observe(accordion, {childList:true,subtree:true}); indexRows(); void load();
  }
  function stop() {
    active = false; generation++; controller?.abort(); controller = null; clearTimeout(timeout); clearTimeout(debounce); observer?.disconnect(); observer = null;
    accordion?.removeEventListener('change', schedule);
    for (const {panel} of rows) panel.classList.remove('nx-course-filtered','nx-course-kept');
    root?.remove(); rows = []; buildings = null; root = form = accordion = search = centres = status = refresh = null;
  }
  window.addEventListener('pagehide', stop); window.addEventListener('pageshow', start);
  document.addEventListener('visibilitychange', () => { if (!active) start(); });
  // Native course pages render the enrolment form server-side; the event also
  // admits a list inserted later by the existing training-page convenience.
  document.addEventListener('ausbildungs-mausschoner:buildings-appended', () => { if (active) indexRows(); else start(); });
  document.addEventListener('nexus-schooling-restore', event => {
    if (!active || typeof event.detail !== 'string' || event.detail.length > 1000) return;
    try { const saved = JSON.parse(event.detail); if (typeof saved.centre !== 'string' || typeof saved.station !== 'string') return; restoredCentre = clean(saved.centre); search.value = clean(saved.station); updateCentres(); apply(); } catch {}
  });
  start();
})();
