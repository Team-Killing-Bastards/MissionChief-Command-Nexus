/* On-demand sharing batches. No timers or scans while this tool is closed. */
(() => {
  'use strict';
  if (window !== window.top) return;
  const C = globalThis.NexusBuildingSharingCore;
  let active = null;
  const sharedLabel = value => value === null ? 'Unknown' : value ? 'Shared' : 'Not shared';
  const option = (value, label) => { const o = document.createElement('option'); o.value = value; o.textContent = label; return o; };
  function dispose() { active?.dispose(); active = null; }
  function mount(root) {
    dispose(); if (!C) return;
    const box = document.createElement('section'); box.id = 'buildingSharing'; box.className = 'settings-group';
    box.innerHTML = `<style>
      #buildingSharing table{width:100%;min-width:650px;border-collapse:collapse;font-size:12px}
      #buildingSharing th,#buildingSharing td{padding:8px;text-align:left;border-bottom:1px solid #29405a;vertical-align:top}
      #buildingSharing th{position:sticky;top:0;background:#13283c;z-index:1}
      #buildingSharing .sharing-scroll{max-height:320px;overflow:auto;margin:10px 0}
      #buildingSharing .sharing-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:12px 0}
      #buildingSharing label{display:flex;flex-direction:column;gap:5px}
      #buildingSharing input,#buildingSharing select{min-width:0;width:100%;box-sizing:border-box}
      #buildingSharing input[type=checkbox]{width:auto;margin:2px 8px 0 0}
      #buildingSharing [data-status]{white-space:pre-line;color:#bde9d2}
      #buildingSharing progress{width:100%;height:8px;accent-color:#35c9b0}
      #buildingSharing small{display:block}#buildingSharing a{color:#91d4ef}
      #buildingSharing [data-result]{max-width:280px;overflow-wrap:anywhere}
    </style><h3>Hospitals &amp; police cells</h3>
    <p>Share hospitals and police cells with your alliance and set their alliance tax.</p>
    <button data-load>Load hospitals &amp; cells</button>
    <div data-controls hidden>
      <div class="sharing-fields">
        <label>Dispatch centre<select data-centre aria-label="Sharing dispatch centre"></select></label>
        <label>Facility type<select data-type aria-label="Sharing facility type"></select></label>
        <label>Facility name or ID<input data-search type="search" maxlength="120" placeholder="Search sharing facilities"></label>
        <label>Show<select data-filter><option value="">All matching facilities</option><option value="on">Shared with alliance</option><option value="off">Not shared with alliance</option></select></label>
      </div>
      <div class="sharing-fields">
        <label>Alliance sharing<select data-sharing aria-label="Alliance sharing"><option value="keep">Leave unchanged</option><option value="on">On — share with alliance</option><option value="off">Off — stop sharing</option></select></label>
        <label>Alliance tax<select data-tax aria-label="Alliance tax"><option value="">Leave unchanged</option><option value="0">Free (0%)</option><option value="1">10%</option><option value="2">20%</option><option value="3">30%</option><option value="4">40%</option><option value="5">50%</option></select></label>
      </div>
      <small>Tax can be set only while a facility is shared. Choose sharing On to share and set tax together. Tax-only changes leave unshared facilities out. Facilities with no cells or without native sharing controls are excluded during review. This does not build cells or hospital extensions.</small>
      <div class="toolbar"><button data-all>Select all matching</button><button data-clear>Clear selection</button><span data-count></span></div>
      <div class="sharing-scroll"><table><thead><tr><th>Select / facility</th><th>Facility type</th><th>Alliance sharing</th><th>Alliance tax</th><th>Review / result</th></tr></thead><tbody data-rows></tbody></table></div>
      <div class="toolbar"><button data-prev>Previous facilities</button><small data-page></small><button data-next>Next facilities</button></div>
      <div class="toolbar"><button data-review>Review sharing changes</button><button data-run hidden>Apply reviewed sharing</button><button data-stop hidden>Stop after current action</button></div>
      <p data-review-summary></p><progress data-progress value="0" max="1" hidden></progress>
    </div><p data-status role="status" aria-live="polite">Load the list when you need it. No background sharing scans.</p>`;
    root.getElementById('summary').after(box);
    const q = s => box.querySelector(s);
    let rows = [], selected = new Set(), outcomes = new Map(), reviewed = [], config = null, busy = false, stopped = false, closed = false, page = 0;
    let controller = null;
    const visible = () => !closed && box.isConnected && !root.getElementById('panel')?.hidden;
    const alive = () => visible() && !stopped;
    const say = message => { if (!closed) q('[data-status]').textContent = message; };
    const invalidate = () => { reviewed = []; config = null; q('[data-run]').hidden = true; q('[data-review-summary]').textContent = ''; };
    const matching = () => rows.filter(b => C.matches(b, q('[data-centre]').value, q('[data-type]').value, q('[data-search]').value) &&
      (!q('[data-filter]').value || q('[data-filter]').value === 'on' && b.shared === true ||
       q('[data-filter]').value === 'off' && b.shared === false));
    function draw() {
      if (closed) return;
      const list = matching(); page = Math.min(page, Math.max(0, Math.ceil(list.length / 100) - 1));
      const frag = document.createDocumentFragment();
      for (const b of list.slice(page * 100, page * 100 + 100)) {
        const row = document.createElement('tr'), first = document.createElement('td'), check = document.createElement('input'), a = document.createElement('a');
        check.type = 'checkbox'; check.checked = selected.has(b.id); check.disabled = busy; check.setAttribute('aria-label', 'Select ' + b.caption + ' · ' + b.id);
        check.onchange = () => { check.checked ? selected.add(b.id) : selected.delete(b.id); invalidate(); count(); };
        a.href = '/buildings/' + b.id; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = b.caption; first.append(check, a); row.append(first);
        for (const value of [globalThis.NexusStationProfilesData?.buildings?.[b.building_type] || (C.kind(b) === 'hospital' ? 'Hospital' : 'Police cells'), sharedLabel(b.shared), b.taxRead ? C.taxLabel(b.tax) : 'Read during review', outcomes.get(b.id) || 'Not reviewed']) {
          const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
        }
        row.lastChild.dataset.result = ''; frag.append(row);
      }
      q('[data-rows]').replaceChildren(frag); count();
      q('[data-page]').textContent = list.length + ' matching · page ' + (page + 1) + ' of ' + Math.max(1, Math.ceil(list.length / 100));
      q('[data-prev]').disabled = busy || page === 0; q('[data-next]').disabled = busy || (page + 1) * 100 >= list.length;
    }
    function count() { q('[data-count]').textContent = selected.size + ' facilities selected'; }
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
      const types = [...new Set(rows.filter(b => C.kind(b)).map(b => b.building_type))].sort((a,b) => a-b);
      q('[data-type]').replaceChildren(option('', 'All hospitals & police cells'), option('hospital', 'Hospitals & urgent treatment'), option('cells', 'All police cells'), ...types.map(type => option(String(type), globalThis.NexusStationProfilesData?.buildings?.[type] || 'Building type ' + type)));

    }
    async function work(fn) {
      if (busy || closed) return;
      stopped = false; controller = new AbortController(); setBusy(true);
      const client = C.createClient({ signal: controller.signal, alive, report: say });
      try { await fn(client); } catch (e) { say(e.message); } finally { controller = null; if (!closed) setBusy(false); }
    }
    q('[data-load]').onclick = () => work(async client => {
      invalidate(); say('Loading your current buildings…'); const next = await client.buildings();
      if (!alive()) return; rows = next; selected.clear(); outcomes.clear(); filters(); page = 0;
      q('[data-controls]').hidden = false; say('Choose sharing or tax, then select facilities and review.');
    });
    for (const key of ['centre', 'type', 'filter', 'search']) q('[data-' + key + ']').addEventListener(key === 'search' ? 'input' : 'change', () => {
      selected.clear(); outcomes.clear(); invalidate(); page = 0; draw();
    });
    for (const key of ['sharing', 'tax']) q('[data-' + key + ']').addEventListener('input', () => { invalidate(); outcomes.clear(); draw(); });
    q('[data-all]').onclick = () => { matching().forEach(b => selected.add(b.id)); invalidate(); draw(); };
    q('[data-clear]').onclick = () => { selected.clear(); invalidate(); draw(); };
    q('[data-prev]').onclick = () => { page--; draw(); }; q('[data-next]').onclick = () => { page++; draw(); };
    q('[data-stop]').onclick = () => { stopped = true; controller?.abort(); say('Stopping after the current action is verified.'); };
    q('[data-review]').onclick = () => work(async client => {
      invalidate(); outcomes.clear();
      const chosen = C.settings(q('[data-sharing]').value, q('[data-tax]').value);
      const ids = [...selected]; if (!ids.length) throw Error('Select at least one facility.');
      say('Refreshing the selected facilities before review…');
      const fresh = await client.buildings(), byId = new Map(fresh.map(b => [b.id, b]));
      const result = []; let unavailable = 0, unchanged = 0;
      q('[data-progress]').max = ids.length; q('[data-progress]').value = 0;
      for (const [index, key] of ids.entries()) {
        if (!alive()) break; const b = byId.get(key), original = rows.find(x => x.id === key);
        say('Reviewing ' + (index + 1) + '/' + ids.length + ': ' + (b?.caption || key));
        try {
          if (!globalThis.NexusBuildingStaffingCore.sameBuilding(original, b)) throw Error('Facility identity or dispatch centre changed. Reload the sharing list.');
          const review = await client.inspect(b, chosen);
          if (!alive()) break;
          Object.assign(original, {shared:review.shared, tax:review.tax, taxRead:true});
          if (review.changeSharing || review.changeTax) {
            result.push(review); outcomes.set(key, [review.changeSharing ? 'Sharing ' + (review.shared ? 'on' : 'off') + ' → ' + chosen.sharing : '', review.changeTax ? 'Tax ' + C.taxLabel(review.tax) + ' → ' + C.taxLabel(chosen.tax) : ''].filter(Boolean).join(' · '));
          } else { unchanged++; outcomes.set(key, 'Already matches — no changes needed'); }
        } catch (e) { if (!alive()) break; unavailable++; outcomes.set(key, 'Unavailable: ' + e.message); }
        q('[data-progress]').value = index + 1; if (index % 5 === 0) draw();
      }
      if (!alive()) { invalidate(); say('Review stopped. Review again before applying.'); return; }
      config = chosen; reviewed = result; q('[data-run]').hidden = !result.length;
      q('[data-run]').textContent = 'Apply to ' + result.length + ' reviewed facilities';
      q('[data-review-summary]').textContent = result.length + ' facilities to change · ' + unchanged + ' already match · ' + unavailable + ' unavailable (excluded).';
      say('Review complete. No settings have been changed.');
    });
    q('[data-run]').onclick = () => work(async client => {
      if (!reviewed.length || !config) throw Error('Review sharing changes first.');
      const plan = reviewed.slice(), chosen = config; invalidate();
      if (!navigator.locks?.request) throw Error('This browser cannot lock the sharing run. Update the browser and try again.');
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
            if (row) { row.shared = value.shared; row.tax = value.tax; row.taxRead = true; }
          } catch (e) {
            failed++; outcomes.set(key, 'Stopped: ' + e.message);
            say('Stopped at ' + entry.building.caption + ': ' + e.message + '\n' + done + ' facilities completed. Review again to check the current state.');
            return;
          } finally { if (!closed) { q('[data-progress]').value = index + 1; draw(); } }
        }
        say((alive() ? 'Finished. ' : 'Stopped. ') + done + ' facilities verified · ' + (plan.length - done - failed) + ' not processed. All completed changes were read back from the game.');
      });
    });
    active = { dispose() { closed = true; stopped = true; controller?.abort(); box.remove(); rows = []; selected.clear(); reviewed = []; outcomes.clear(); } };
  }
  globalThis.NexusBuildingSharing = Object.freeze({ mount, dispose });
})();
