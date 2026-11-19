/* On-demand alliance sharing and tax. Only native, freshly offered actions are used. */
(() => {
  'use strict';
  const text = v => String(v ?? '').replace(/\s+/g, ' ').trim();
  const id = v => /^[1-9]\d{0,15}$/.test(String(v ?? '')) ? String(v) : null;
  const path = value => { const key = id(value); if (!key) throw Error('Invalid building ID.'); return '/buildings/' + key; };
  const parse = html => new DOMParser().parseFromString(html, 'text/html');
  const kind = b => [4, 21].includes(b.building_type) ? 'hospital' : [6, 16, 19, 26, 36].includes(b.building_type) ? 'cells' : null;
  const taxLabel = n => n === null ? 'Available after sharing' : n === 0 ? 'Free (0%)' : n * 10 + '%';
  function settings(sharing, tax) {
    if (!['keep', 'on', 'off'].includes(sharing)) throw Error('Choose an alliance sharing option.');
    if (tax !== '' && !/^[0-5]$/.test(String(tax))) throw Error('Choose a tax from Free (0%) to 50%.');
    const value = tax === '' ? null : Number(tax);
    if (sharing === 'keep' && value === null) throw Error('Choose sharing On or Off, or an alliance tax.');
    if (sharing === 'off' && value !== null) throw Error('Leave tax unchanged when turning sharing off.');
    return Object.freeze({ sharing, tax: value });
  }
  function inventory(input) {
    const base = globalThis.NexusBuildingStaffingCore.inventory(input), raw = new Map(input.map(b => [String(b.id), b]));
    return base.map(b => ({ ...b, shared: typeof raw.get(b.id).is_alliance_shared === 'boolean' ? raw.get(b.id).is_alliance_shared : null, tax: null, taxRead: false }));
  }
  function matches(b, centre, type, query) {
    return !!kind(b) && (!centre || (b.leitstelle_building_id || 'none') === centre) &&
      (!type || type === kind(b) || String(b.building_type) === type) &&
      (!text(query) || (b.caption + ' ' + b.id).toLowerCase().includes(text(query).toLowerCase()));
  }
  function nativePage(doc, buildingId, origin, expectedKind) {
    const base = path(buildingId);
    const local = (raw, suffix) => {
      try { const u = new URL(raw || '', origin); return u.origin === origin && !u.username && !u.password && !u.search && !u.hash && u.pathname === base + suffix; } catch { return false; }
    };
    const links = [...doc.querySelectorAll('a[href]')];
    // Ownership comes from the account inventory and the native edit control.
    if (!links.some(a => local(a.getAttribute('href'), '/edit'))) throw Error('This building does not offer your own editing controls.');
    if (/There are currently no cells in this station\./i.test(text(doc.body.textContent))) throw Error('No cells are built at this station. Build cells in the game first.');
    const toggles = links.filter(a => local(a.getAttribute('href'), '/alliance'));
    if (toggles.length !== 1) throw Error('Alliance sharing is not offered for this building.');
    const toggle = toggles[0], label = text(toggle.textContent);
    if (toggle.matches('.disabled,[disabled],[aria-disabled="true"]') || toggle.hasAttribute('data-confirm') || toggle.hasAttribute('data-method')) throw Error('The native sharing control is unavailable.');
    // Native police cells switch from "your alliance" before sharing to
    // "the alliance" afterwards. Both wordings describe the same state.
    const on = /^(?:Do not|Don't) share (?:this hospital|the cells?|this cell) with (?:your|the) alliance$/i.test(label);
    const off = /^Share (?:this hospital|the cells?|this cell) with (?:your|the) alliance$/i.test(label);
    if (!on && !off) throw Error('The current sharing setting could not be read. Game control: "' + label.slice(0,140) + '".');
    if ((expectedKind === 'hospital' && !/hospital/i.test(label)) || (expectedKind === 'cells' && !/cell/i.test(label))) throw Error('The building sharing type did not match the selected facility.');
    const taxes = new Map(); let currentTax = null;
    for (let value = 0; value <= 5; value++) {
      const offered = links.filter(a => local(a.getAttribute('href'), '/alliance_costs/' + value));
      if (!offered.length) continue;
      if (offered.length !== 1) throw Error('The tax choices are ambiguous.');
      const a = offered[0];
      if (a.matches('.disabled,[disabled],[aria-disabled="true"]') || a.hasAttribute('data-confirm') || a.hasAttribute('data-method') ||
          text(a.textContent) !== (value === 0 ? 'Free' : value * 10 + '%') || !a.classList.contains('btn-alliance_costs')) throw Error('The native tax choice could not be verified.');
      taxes.set(value, base + '/alliance_costs/' + value);
      if (a.classList.contains('btn-success')) {
        if (currentTax !== null) throw Error('The current alliance tax is ambiguous.');
        currentTax = value;
      }
    }
    if (on && (taxes.size !== 6 || currentTax === null)) throw Error('The shared facility’s current tax and choices could not be read.');
    if (off && taxes.size) throw Error('The sharing and tax controls disagree.');
    return { shared: on, tax: currentTax, toggle: base + '/alliance', taxes };
  }
  function createClient({ fetcher = (...args) => fetch(...args), origin = location.origin, signal, alive = () => true, report = () => {} } = {}) {
    const check = () => { if (!alive() || signal?.aborted) throw Error('Stopped before the next sharing action.'); };
    async function request(route, finishing = false) {
      const ac = new AbortController(), abort = () => ac.abort();
      if (!finishing) { check(); signal?.addEventListener('abort', abort, { once: true }); }
      const timer = setTimeout(abort, 20000);
      try {
        const r = await fetcher(route, { credentials: 'same-origin', cache: 'no-store', signal: ac.signal });
        if (!r.ok) throw Error('Game returned HTTP ' + r.status + '.');
        const final = new URL(r.url || route, origin);
        if (final.origin !== origin || final.pathname.startsWith('/users/')) throw Error('Sign in to MissionChief and try again.');
        const html = await r.text();
        if (html.length > (route === '/api/buildings' ? 16000000 : 4000000)) throw Error('The game response was too large.');
        return html;
      } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
    }
    const buildings = async () => inventory(JSON.parse(await request('/api/buildings')));
    const read = async (b, finishing = false) => nativePage(parse(await request(path(b.id), finishing)), b.id, origin, kind(b));
    async function inspect(b, config) {
      check(); if (!kind(b)) throw Error('Choose a hospital or a building with police cells.');
      const state = await read(b);
      if (config.tax !== null && !state.shared && config.sharing !== 'on') throw Error('Tax is only available while shared. Choose sharing On to share this facility and set its tax.');
      return { building: b, shared: state.shared, tax: state.tax,
        changeSharing: config.sharing !== 'keep' && state.shared !== (config.sharing === 'on'),
        changeTax: config.tax !== null && state.tax !== config.tax };
    }
    async function mutate(route, b, verify, label) {
      check(); let problem = '';
      // A sharing link toggles state: never replay it on a timeout. Finish the
      // readback even when Stop/Close was pressed during the submitted request.
      try { await request(route, true); } catch (e) { problem = e.message; }
      try {
        const after = await read(b, true);
        if (verify(after)) { report(label + ' verified.'); return after; }
      } catch (e) { problem = problem || e.message; }
      const error = Error(label + ' was not verified. No retry was sent.' + (problem ? ' ' + problem : ' Check this facility in the game.'));
      error.uncertain = true; throw error;
    }
    async function apply(review, config, current) {
      check(); const b = review.building;
      if (!globalThis.NexusBuildingStaffingCore.sameBuilding(b, current)) throw Error('Building identity or dispatch centre changed. Review this facility again.');
      let state = await read(b); const completed = [];
      const desired = config.sharing === 'keep' ? state.shared : config.sharing === 'on';
      if (config.tax !== null && !desired) throw Error('Tax is only available while shared. Review this facility again.');
      // An already achieved choice needs no request. A concurrent different tax
      // is not silently overwritten using an old review.
      if (config.tax !== null && state.shared && state.tax !== config.tax && state.tax !== review.tax) throw Error('Alliance tax changed since review. Review this facility again.');
      try {
        if (state.shared !== desired) {
          state = await mutate(state.toggle, b, after => after.shared === desired, 'Sharing ' + (desired ? 'on' : 'off'));
          completed.push('Sharing ' + (desired ? 'on' : 'off'));
        }
        if (config.tax !== null && state.tax !== config.tax) {
          check();
          // These choices come from the freshly read shared building page.
          const action = state.taxes.get(config.tax);
          if (!state.shared || !action) throw Error('The chosen tax is not offered by the game.');
          state = await mutate(action, b, after => after.shared && after.tax === config.tax, 'Tax ' + taxLabel(config.tax));
          completed.push('Tax ' + taxLabel(config.tax));
        }
      } catch (e) { if (completed.length) e.message = completed.join(' · ') + ' verified; ' + e.message; throw e; }
      return { shared: state.shared, tax: state.tax, message: completed.length ? completed.join(' · ') + ' — verified' : 'Already matches — no changes needed' };
    }
    return { buildings, inspect, apply };
  }
  globalThis.NexusBuildingSharingCore = Object.freeze({ settings, inventory, matches, nativePage, kind, taxLabel, createClient });
})();
