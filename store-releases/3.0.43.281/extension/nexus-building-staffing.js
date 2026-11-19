/* On-demand staffing batches. No timers or scans while this tool is closed. */
(() => {
  'use strict';
  if (window !== window.top) return;
  const C = globalThis.NexusBuildingStaffingCore, T = globalThis.NexusTrainingCore;
  let active = null;
  const fmt = n => n === null || n === undefined ? 'Unknown' : Number(n).toLocaleString('en-GB');
  const option = (value, label) => { const o = document.createElement('option'); o.value = value; o.textContent = label; return o; };
  function dispose() { active?.dispose(); active = null; }
  function mount(root) {
    dispose(); if (!C || !T) return;
    const box = document.createElement('section'); box.id = 'buildingStaffing'; box.className = 'settings-group';
    box.innerHTML = `<style>
      #buildingStaffing table{width:100%;min-width:650px;border-collapse:collapse;font-size:12px}
      #buildingStaffing th,#buildingStaffing td{padding:8px;text-align:left;border-bottom:1px solid #29405a;vertical-align:top}
      #buildingStaffing th{position:sticky;top:0;background:#13283c;z-index:1}
      #buildingStaffing .staffing-scroll{max-height:320px;overflow:auto;margin:10px 0}
      #buildingStaffing .staffing-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:12px 0}
      #buildingStaffing label{display:flex;flex-direction:column;gap:5px}
      #buildingStaffing input,#buildingStaffing select{min-width:0;width:100%;box-sizing:border-box}
      #buildingStaffing input[type=checkbox]{width:auto;margin:2px 8px 0 0}
      #buildingStaffing [data-status]{white-space:pre-line;color:#bde9d2}
      #buildingStaffing progress{width:100%;height:8px;accent-color:#35c9b0}
      #buildingStaffing small{display:block}#buildingStaffing a{color:#91d4ef}
      #buildingStaffing [data-result]{max-width:280px;overflow-wrap:anywhere}
    </style><h3>Staffing targets &amp; automatic hiring</h3>
    <p>Set the desired personnel target and automatic hiring for selected stations.</p>
    <button data-load>Load staffing list</button>
    <div data-controls hidden>
      <div class="staffing-fields">
        <label>Dispatch centre<select data-centre aria-label="Staffing dispatch centre"></select></label>
        <label>Station type<select data-type aria-label="Staffing station type"></select></label>
        <label>Station name or ID<input data-search type="search" maxlength="120" placeholder="Search staffing stations"></label>
        <label>Show<select data-filter><option value="">All matching stations</option><option value="zero">Personnel target is 0</option><option value="below">Below personnel target</option><option value="off">Automatic hiring is off</option></select></label>
      </div>
      <div class="staffing-fields">
        <label>Desired personnel target<input data-target type="number" min="0" max="10000" step="1" placeholder="Leave unchanged"></label>
        <label>Automatic hiring<select data-hiring aria-label="Automatic hiring"><option value="keep">Leave unchanged</option><option value="on">On — recruit to target</option><option value="off">Off</option></select></label>
      </div>
      <small>This is the station’s recruitment target, not a vehicle’s crew limit. Lowering it does not remove existing staff. Automatic hiring uses the game’s Premium feature and normal recruitment schedule. No coins are spent. Turning it off leaves an existing timed recruitment phase alone.</small>
      <div class="toolbar"><button data-all>Select all matching</button><button data-clear>Clear selection</button><span data-count></span></div>
      <div class="staffing-scroll"><table><thead><tr><th>Select / station</th><th>Personnel</th><th>Target</th><th>Automatic hiring</th><th>Review / result</th></tr></thead><tbody data-rows></tbody></table></div>
      <div class="toolbar"><button data-prev>Previous stations</button><small data-page></small><button data-next>Next stations</button></div>
      <div class="toolbar"><button data-review>Review staffing changes</button><button data-run hidden>Apply reviewed staffing</button><button data-stop hidden>Stop after current action</button></div>
      <p data-review-summary></p><progress data-progress value="0" max="1" hidden></progress>
    </div><p data-status role="status" aria-live="polite">Load the list when you need it. No background staffing scans.</p>`;
    root.getElementById('summary').after(box);
    const q = s => box.querySelector(s);
    let rows = [], selected = new Set(), outcomes = new Map(), reviewed = [], config = null, busy = false, stopped = false, closed = false, page = 0;
    let controller = null;
    const visible = () => !closed && box.isConnected && !root.getElementById('panel')?.hidden;
    const alive = () => visible() && !stopped;
    const say = message => { if (!closed) q('[data-status]').textContent = message; };
    const invalidate = () => { reviewed = []; config = null; q('[data-run]').hidden = true; q('[data-review-summary]').textContent = ''; };
    const matching = () => rows.filter(b => C.matches(b, q('[data-centre]').value, q('[data-type]').value, q('[data-search]').value) &&
      (!q('[data-filter]').value || q('[data-filter]').value === 'zero' && b.personal_count_target === 0 ||
       q('[data-filter]').value === 'below' && b.personal_count !== null && b.personal_count_target !== null && b.personal_count < b.personal_count_target ||
       q('[data-filter]').value === 'off' && b.hiring_automatic === false));
    function draw() {
      if (closed) return;
      const list = matching(); page = Math.min(page, Math.max(0, Math.ceil(list.length / 100) - 1));
      const frag = document.createDocumentFragment();
      for (const b of list.slice(page * 100, page * 100 + 100)) {
        const row = document.createElement('tr'), first = document.createElement('td'), check = document.createElement('input'), a = document.createElement('a');
        check.type = 'checkbox'; check.checked = selected.has(b.id); check.disabled = busy; check.setAttribute('aria-label', 'Select ' + b.caption + ' · ' + b.id);
        check.onchange = () => { check.checked ? selected.add(b.id) : selected.delete(b.id); invalidate(); count(); };
        a.href = '/buildings/' + b.id; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = b.caption; first.append(check, a); row.append(first);
        const h = b.hiring_automatic === null ? 'Unknown' : b.hiring_automatic ? 'On' : b.hiring_phase > 0 ? 'Off · timed phase active' : 'Off';
        for (const value of [fmt(b.personal_count), fmt(b.personal_count_target), h, outcomes.get(b.id) || 'Not reviewed']) {
          const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
        }
        row.lastChild.dataset.result = ''; frag.append(row);
      }
      q('[data-rows]').replaceChildren(frag); count();
      q('[data-page]').textContent = list.length + ' matching · page ' + (page + 1) + ' of ' + Math.max(1, Math.ceil(list.length / 100));
      q('[data-prev]').disabled = busy || page === 0; q('[data-next]').disabled = busy || (page + 1) * 100 >= list.length;
    }
    function count() { q('[data-count]').textContent = selected.size + ' stations selected'; }
    function setBusy(value) {
      busy = value;
      for (const el of box.querySelectorAll('button,input,select')) el.disabled = value;
      q('[data-stop]').hidden = !value; q('[data-stop]').disabled = false;
      q('[data-progress]').hidden = !value;
      draw();
    }
    function filters() {
      const byId = new Map(rows.map(b => [b.id, b.caption]));
      q('[data-centre]').replaceChildren(option('', 'All dispatch centres'), ...[...new Set(rows.map(b => b.leitstelle_building_id || 'none'))]
        .map(key => [key, key === 'none' ? 'No dispatch centre' : byId.get(key) || 'Dispatch centre ' + key])
        .sort((a, b) => a[1].localeCompare(b[1])).map(([key, label]) => option(key, label)));
      const types = T.stationTypeOptions(rows, globalThis.NexusStationProfilesData?.buildings || {});
      q('[data-type]').replaceChildren(option('', 'All station types'), ...[...types.services, ...types.individual].map(v => option(v.value, v.label)));
    }
    async function work(fn) {
      if (busy || closed) return;
      stopped = false; controller = new AbortController(); setBusy(true);
      const client = C.createClient({ signal: controller.signal, alive, report: say });
      try { await fn(client); } catch (e) { say(e.message); } finally { client.clear(); controller = null; if (!closed) setBusy(false); }
    }
    q('[data-load]').onclick = () => work(async client => {
      invalidate(); say('Loading your current buildings…'); const next = await client.buildings();
      if (!alive()) return; rows = next; selected.clear(); outcomes.clear(); filters(); page = 0;
      q('[data-controls]').hidden = false; say('Choose a target or hiring option, then select stations and review.');
    });
    for (const key of ['centre', 'type', 'filter', 'search']) q('[data-' + key + ']').addEventListener(key === 'search' ? 'input' : 'change', () => {
      selected.clear(); outcomes.clear(); invalidate(); page = 0; draw();
    });
    for (const key of ['target', 'hiring']) q('[data-' + key + ']').addEventListener('input', () => { invalidate(); outcomes.clear(); draw(); });
    q('[data-all]').onclick = () => { matching().forEach(b => selected.add(b.id)); invalidate(); draw(); };
    q('[data-clear]').onclick = () => { selected.clear(); invalidate(); draw(); };
    q('[data-prev]').onclick = () => { page--; draw(); }; q('[data-next]').onclick = () => { page++; draw(); };
    q('[data-stop]').onclick = () => { stopped = true; controller?.abort(); say('Stopping after the current action is verified.'); };
    q('[data-review]').onclick = () => work(async client => {
      invalidate(); outcomes.clear();
      const chosen = C.settings(q('[data-target]').value, q('[data-hiring]').value);
      const ids = [...selected]; if (!ids.length) throw Error('Select at least one station.');
      say('Refreshing the selected stations before review…');
      const fresh = await client.buildings(), byId = new Map(fresh.map(b => [b.id, b]));
      const result = []; let unavailable = 0, unchanged = 0;
      q('[data-progress]').max = ids.length; q('[data-progress]').value = 0;
      for (const [index, key] of ids.entries()) {
        if (!alive()) break; const b = byId.get(key), original = rows.find(x => x.id === key);
        say('Reviewing ' + (index + 1) + '/' + ids.length + ': ' + (b?.caption || key));
        try {
          if (!C.sameBuilding(original, b)) throw Error('Station identity or dispatch centre changed. Reload the staffing list.');
          const review = await client.inspect(b, chosen);
          if (!alive()) break;
          if (review.changeTarget || review.changeHiring) {
            result.push(review); outcomes.set(key, [review.changeTarget ? 'Target ' + review.target + ' → ' + chosen.target : '', review.changeHiring ? 'Hiring ' + review.hiring + ' → ' + chosen.hiring : ''].filter(Boolean).join(' · '));
          } else { unchanged++; outcomes.set(key, 'Already matches — no changes needed'); }
        } catch (e) { if (!alive()) break; unavailable++; outcomes.set(key, 'Unavailable: ' + e.message); }
        q('[data-progress]').value = index + 1; if (index % 5 === 0) draw();
      }
      if (!alive()) { invalidate(); say('Review stopped. Review again before applying.'); return; }
      config = chosen; reviewed = result; q('[data-run]').hidden = !result.length;
      q('[data-run]').textContent = 'Apply to ' + result.length + ' reviewed stations';
      q('[data-review-summary]').textContent = result.length + ' stations to change · ' + unchanged + ' already match · ' + unavailable + ' unavailable (excluded).';
      say('Review complete. No settings have been changed.');
    });
    q('[data-run]').onclick = () => work(async client => {
      if (!reviewed.length || !config) throw Error('Review staffing changes first.');
      const plan = reviewed.slice(), chosen = config; invalidate();
      if (!navigator.locks?.request) throw Error('This browser cannot lock the staffing run. Update the browser and try again.');
      await navigator.locks.request('nexus-building-mutations', { ifAvailable: true }, async lock => {
        if (!lock) throw Error('Another building change is running. Wait for it to finish.');
        const current = new Map((await client.buildings()).map(b => [b.id, b]));
        let done = 0, failed = 0;
        q('[data-progress]').max = plan.length; q('[data-progress]').value = 0;
        for (const [index, entry] of plan.entries()) {
          if (!alive()) break;
          const key = entry.building.id; say('Applying ' + (index + 1) + '/' + plan.length + ': ' + entry.building.caption);
          try {
            const value = await client.apply(entry, chosen, current.get(key));
            outcomes.set(key, value.message); done++;
            const row = rows.find(b => b.id === key);
            if (row) { row.personal_count_target = value.target; if (value.hiring) row.hiring_automatic = value.hiring === 'on'; }
          } catch (e) {
            failed++; outcomes.set(key, 'Stopped: ' + e.message);
            say('Stopped at ' + entry.building.caption + ': ' + e.message + '\n' + done + ' stations completed. Review again to check the current state.');
            return;
          } finally { if (!closed) { q('[data-progress]').value = index + 1; draw(); } }
        }
        say((alive() ? 'Finished. ' : 'Stopped. ') + done + ' stations verified · ' + (plan.length - done - failed) + ' not processed. Refresh the building snapshot to update its totals.');
      });
    });
    active = { dispose() { closed = true; stopped = true; controller?.abort(); box.remove(); rows = []; selected.clear(); reviewed = []; outcomes.clear(); } };
  }
  globalThis.NexusBuildingStaffing = Object.freeze({ mount, dispose });
})();
