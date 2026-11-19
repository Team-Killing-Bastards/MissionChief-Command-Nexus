/* Buildings staffing: native target-only forms and explicit recruitment actions. */
(() => {
  'use strict';
  const text = v => String(v ?? '').replace(/\s+/g, ' ').trim();
  const id = v => /^[1-9]\d{0,15}$/.test(String(v ?? '')) ? String(v) : null;
  const number = v => v !== null && v !== undefined && v !== '' && Number.isSafeInteger(Number(v)) && Number(v) >= 0 ? Number(v) : null;
  const path = value => { const key = id(value); if (!key) throw Error('Invalid building ID.'); return '/buildings/' + key; };
  const parse = html => new DOMParser().parseFromString(html, 'text/html');
  function settings(target, hiring) {
    const raw = text(target), value = raw === '' ? null : number(raw);
    if (raw !== '' && (!/^\d+$/.test(raw) || value === null || value > 10000)) throw Error('Enter a whole personnel target from 0 to 10,000, or leave it blank.');
    if (!['keep', 'on', 'off'].includes(hiring)) throw Error('Choose an automatic hiring option.');
    if (value === null && hiring === 'keep') throw Error('Enter a personnel target or choose automatic hiring On or Off.');
    if (value === 0 && hiring === 'on') throw Error('Use a personnel target above zero when enabling automatic hiring.');
    return Object.freeze({ target: value, hiring });
  }
  function inventory(input) {
    if (!Array.isArray(input)) throw Error('The game did not return your building list. Check your sign-in.');
    const seen = new Set();
    return input.map(b => {
      const key = id(b.id); if (!key || seen.has(key)) throw Error('Building identities are missing or duplicated.'); seen.add(key);
      return { id: key, caption: text(b.caption) || 'Building ' + key, building_type: number(b.building_type),
        leitstelle_building_id: id(b.leitstelle_building_id), personal_count: number(b.personal_count),
        personal_count_target: number(b.personal_count_target), hiring_automatic: typeof b.hiring_automatic === 'boolean' ? b.hiring_automatic : null,
        hiring_phase: number(b.hiring_phase) };
    }).sort((a, b) => a.caption.localeCompare(b.caption, 'en-GB', { numeric: true }));
  }
  function matches(b, centre, type, query) {
    return (!centre || (b.leitstelle_building_id || 'none') === centre) &&
      (!type || globalThis.NexusTrainingCore.stationTypeMatches(b.building_type, type)) &&
      (!text(query) || (b.caption + ' ' + b.id).toLowerCase().includes(text(query).toLowerCase()));
  }
  function nativeURL(value, expected, origin) {
    const u = new URL(value || '', origin);
    if (u.origin !== origin || u.hash || u.username || u.password || !expected(u)) throw Error('Unexpected game staffing action.');
    return u.pathname + u.search;
  }
  function targetForm(doc, buildingId, origin) {
    const base = path(buildingId), inputs = [...doc.querySelectorAll('input[name="building[personal_count_target]"]')];
    if (inputs.length !== 1) throw Error('Personnel target is not offered for this building.');
    const input = inputs[0], form = input.form;
    if (!form || input.matches(':disabled') || input.readOnly || form.getAttribute('method')?.toLowerCase() !== 'post') throw Error('Personnel target form is unavailable.');
    const action = nativeURL(form.getAttribute('action'), u => u.pathname === base && u.search === '?personal_count_target_only=1', origin);
    const data = new URLSearchParams();
    for (const name of ['utf8', '_method', 'authenticity_token']) {
      const el = form.querySelector('input[name="' + name + '"]'); if (el && !el.disabled) data.set(name, el.value);
    }
    if (!['patch', 'put'].includes(data.get('_method')) || !data.get('authenticity_token')) throw Error('Personnel target form is incomplete.');
    const value = number(input.value);
    if (value === null) throw Error('The current personnel target could not be read.');
    return { action, data, value, min: input.min === '' ? 0 : number(input.min), max: input.max === '' ? 10000 : number(input.max) };
  }
  function hiringPage(doc, buildingId, origin) {
    const base = path(buildingId), links = [...doc.querySelectorAll('a[href]')];
    const native = suffix => links.find(a => {
      try { return !a.matches('.disabled,[disabled],[aria-disabled="true"]') && !a.hasAttribute('data-confirm') &&
        nativeURL(a.getAttribute('href'), u => u.pathname === base + '/hire_do/' + suffix && !u.search, origin); } catch { return false; }
    });
    const cancel = native('0'), automatic = native('automatic'), days = [1, 2, 3].some(n => native(n));
    // An active timed campaign also has Cancel: the explicit game notice is
    // required before calling it automatic. Absence of a notice is not Off.
    const autoNotice = [...doc.querySelectorAll('.alert')].some(n => /New staff will be hired automatically until your desired staffing level is reached\./i.test(text(n.textContent)));
    if (autoNotice && cancel) return { state: 'on', cancel: base + '/hire_do/0', automatic: null };
    if (days && !cancel && !autoNotice) return { state: 'off', cancel: null, automatic: automatic ? base + '/hire_do/automatic' : null };
    if (cancel && !autoNotice && !days) return { state: 'timed', cancel: null, automatic: automatic ? base + '/hire_do/automatic' : null };
    throw Error('The recruitment state could not be read. Open Hire new people to check it.');
  }
  function centrePage(doc, centreId, origin) {
    const offered = new Set(), pages = new Set(), base = path(centreId) + '/leitstelle-buildings';
    for (const a of doc.querySelectorAll('a[href]')) {
      const raw = a.getAttribute('href');
      try {
        const u = new URL(raw, origin), match = u.pathname.match(/^\/buildings\/([1-9]\d*)\/hire_do\/automatic$/);
        if (u.origin === origin && !u.search && !u.hash && match && text(a.textContent) === 'Automatically' &&
            !a.matches('.disabled,[disabled],[aria-disabled="true"]') && !a.hasAttribute('data-confirm') &&
            a.closest('tr')?.querySelector('a[href="/buildings/' + match[1] + '"]')) offered.add(match[1]);
        if (a.closest('.pagination') && u.origin === origin && u.pathname === base && !u.hash &&
            [...u.searchParams.keys()].every(k => ['page', 'q', 'search'].includes(k)) && /^[1-9]\d*$/.test(u.searchParams.get('page') || '')) pages.add(u.pathname + u.search);
      } catch {}
    }
    return { offered, pages };
  }
  function sameBuilding(a, b) {
    return a && b && a.id === b.id && a.caption === b.caption && a.building_type === b.building_type && a.leitstelle_building_id === b.leitstelle_building_id;
  }
  function createClient({ fetcher = (...args) => fetch(...args), origin = location.origin, signal, alive = () => true, report = () => {} } = {}) {
    const centres = new Map();
    function check() { if (!alive() || signal?.aborted) throw Error('Stopped before the next staffing action.'); }
    async function request(route, options = {}, finishing = false) {
      const ac = new AbortController(), abort = () => ac.abort();
      if (!finishing) { check(); signal?.addEventListener('abort', abort, { once: true }); }
      const timer = setTimeout(abort, 20000);
      try {
        const r = await fetcher(route, { credentials: 'same-origin', cache: 'no-store', ...options, signal: ac.signal });
        if (!r.ok) throw Error('Game returned HTTP ' + r.status + '.');
        const final = new URL(r.url || route, origin);
        if (final.origin !== origin || final.pathname.startsWith('/users/')) throw Error('Sign in to MissionChief and try again.');
        const html = await r.text(); if (html.length > (route === '/api/buildings' ? 16000000 : 4000000)) throw Error('The game response was too large.');
        return html;
      } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
    }
    const buildings = async () => inventory(JSON.parse(await request('/api/buildings')));
    const readTarget = async (b, finishing = false) => targetForm(parse(await request(path(b.id) + '/personalCountTarget', {}, finishing)), b.id, origin);
    const readHiring = async (b, finishing = false) => hiringPage(parse(await request(path(b.id) + '/hire', {}, finishing)), b.id, origin);
    async function automaticAvailable(b, hiring) {
      if (hiring.automatic) return true;
      const centre = b.leitstelle_building_id; if (!centre) return false;
      if (!centres.has(centre)) {
        const offered = new Set(), todo = [path(centre) + '/leitstelle-buildings'], seen = new Set();
        while (todo.length) {
          check(); const route = todo.shift(); if (seen.has(route)) continue;
          if (seen.size >= 100) throw Error('Dispatch-centre hiring list exceeded 100 pages. Narrow the selection.');
          seen.add(route); report('Reading dispatch-centre hiring choices · page ' + seen.size);
          const result = centrePage(parse(await request(route)), centre, origin);
          for (const key of result.offered) offered.add(key);
          for (const next of result.pages) if (!seen.has(next)) todo.push(next);
        }
        centres.set(centre, offered);
      }
      return centres.get(centre).has(b.id);
    }
    async function inspect(b, config, retainForm = false) {
      check(); const target = config.target === null && config.hiring !== 'on' ? null : await readTarget(b);
      if (config.target !== null && (target.min === null || target.max === null || config.target < target.min || config.target > target.max)) throw Error('Personnel target is outside this building’s allowed range.');
      const hiring = config.hiring === 'keep' ? null : await readHiring(b);
      if (config.hiring === 'on' && (config.target ?? target.value) <= 0) throw Error('Set a personnel target above zero before enabling automatic hiring.');
      if (config.hiring === 'on' && hiring.state !== 'on' && !await automaticAvailable(b, hiring)) throw Error(b.leitstelle_building_id ? 'Automatic hiring is not offered in this dispatch centre. Check Premium access or an existing timed recruitment phase.' : 'Automatic hiring is not offered here. Assign a dispatch centre and check the game’s hiring controls.');
      return { building: b, target: target?.value ?? null, hiring: hiring?.state ?? null,
        ...(retainForm ? { form: target } : {}),
        changeTarget: config.target !== null && target.value !== config.target,
        changeHiring: config.hiring === 'on' ? hiring.state !== 'on' : config.hiring === 'off' && hiring.state === 'on' };
    }
    async function mutate(route, options, verify, label) {
      check(); let problem = '';
      // Once a request is sent, closing the panel may stop later actions but
      // must not abort this submission or its verification and trigger replay.
      try { await request(route, options, true); } catch (e) { problem = e.message; }
      try { if (await verify()) { report(label + ' verified.'); return; } } catch (e) { problem = problem || e.message; }
      const error = Error(label + ' was not verified. No retry was sent.' + (problem ? ' ' + problem : ' Check this station in the game.'));
      error.uncertain = true; throw error;
    }
    async function apply(review, config, current) {
      check(); const b = review.building;
      if (!sameBuilding(b, current)) throw Error('Station identity or dispatch centre changed. Review this station again.');
      // Re-read both requested settings before changing either one.
      const fresh = await inspect(b, config, true);
      if (fresh.changeTarget && fresh.target !== review.target) throw Error('Personnel target changed since review. Review this station again.');
      if (fresh.changeHiring && fresh.hiring !== review.hiring) throw Error('Recruitment changed since review. Review this station again.');
      const completed = [];
      try {
        if (fresh.changeTarget) {
          const form = fresh.form;
          if (form.value !== config.target) {
            form.data.set('building[personal_count_target]', String(config.target));
            await mutate(form.action, { method: 'POST', body: form.data, headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' } },
              async () => (await readTarget(b, true)).value === config.target, 'Personnel target ' + config.target);
          }
          completed.push('Target ' + config.target);
        }
        if (fresh.changeHiring) {
          check(); const now = await readHiring(b);
          if (now.state !== config.hiring) {
            if (now.state !== fresh.hiring) throw Error('Recruitment changed before saving. Review this station again.');
            const action = config.hiring === 'on' ? path(b.id) + '/hire_do/automatic' : now.cancel;
            if (!action) throw Error('The native hiring action is unavailable.');
            await mutate(action, { headers: { 'X-Requested-With': 'XMLHttpRequest' } },
              async () => (await readHiring(b, true)).state === config.hiring, 'Automatic hiring ' + config.hiring);
          }
          completed.push('Automatic hiring ' + config.hiring);
        }
      } catch (e) { if (completed.length) e.message = completed.join(' · ') + ' verified; ' + e.message; throw e; }
      return { target: config.target ?? fresh.target ?? current.personal_count_target, hiring: config.hiring === 'keep' ? fresh.hiring : config.hiring === 'off' && fresh.hiring === 'timed' ? 'timed' : config.hiring,
        message: completed.length ? completed.join(' · ') + ' — verified' : 'Already matches — no changes needed' };
    }
    return { buildings, inspect, apply, clear: () => centres.clear() };
  }
  globalThis.NexusBuildingStaffingCore = Object.freeze({ settings, inventory, matches, targetForm, hiringPage, centrePage, sameBuilding, createClient });
})();
