/* Native enrolment buttons. One native submission; finding the next course uses GET only. */
(() => {
  'use strict';
  if (!/^\/schoolings(?:\/\d+(?:\/education)?)?\/?$/.test(location.pathname) || globalThis.__NEXUS_SCHOOLING_ACTIONS__) return;
  globalThis.__NEXUS_SCHOOLING_ACTIONS__ = true;
  const key = 'nexusEducateNextV1';
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const clear = () => { try { sessionStorage.removeItem(key); } catch {} };
  if (globalThis.NexusSettings?.enabled('schoolingActions') === false) { clear(); return; }
  function visible() {
    if (document.hidden) return false;
    try {
      let win = window;
      while (true) {
        if (/^mcn-v3-(active-worker|pipeline-preload|retired-worker)-/.test(win.name || '')) return false;
        if (win === win.top) return true;
        const frame = win.frameElement;
        if (!frame || frame.matches('[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload],#mcn-v3-background-mission-worker') || frame.hidden || frame.getAttribute('aria-hidden') === 'true' || !frame.getClientRects().length || win.parent.getComputedStyle(frame).visibility === 'hidden') return false;
        win = win.parent;
      }
    } catch { return false; }
  }
  const el = (tag, text) => { const n = document.createElement(tag); if (text) n.textContent = text; return n; };
  let form, original, again, note, style, observer, armed = false, busy = false, started = false, controller = null, timeout = null, generation = 0;
  function nativeForm() {
    return [...document.querySelectorAll('form')].find(f => {
      try { const u = new URL(f.action); return u.origin === location.origin && /^\/schoolings\/\d+\/education\/?$/.test(u.pathname) && f.method.toLowerCase() === 'post' && (!f.target || f.target === '_self') && f.querySelector('#accordion'); } catch { return false; }
    });
  }
  function feedback(message, href) {
    note?.remove(); note = el('p', message); note.className = 'nx-education-note'; note.setAttribute('role', 'status');
    if (href) { const link = el('a', 'View courses'); link.href = href; link.className = 'nx-education-button'; note.append(' ', link); }
    (document.querySelector('h1,h2') || document.body.firstElementChild || document.body).after(note);
  }
  function restoreFilters(record) {
    // The existing course filter handles centre metadata arriving asynchronously.
    document.dispatchEvent(new CustomEvent('nexus-schooling-restore', {detail: JSON.stringify(record.filters || {})}));
  }
  function chooseNext(doc, record) {
    const currentId = record.url.match(/^\/schoolings\/(\d+)/)?.[1], opened = [], seen = new Set(); let current = null;
    for (const table of doc.querySelectorAll('#schooling_own_table,#schooling_opened_table')) {
      for (const row of table.querySelectorAll('tbody tr')) {
        let link, id;
        for (const a of row.querySelectorAll('a[href]')) { try { const url = new URL(a.getAttribute('href'),location.origin), match = url.pathname.match(/^\/schoolings\/([1-9]\d{0,15})\/?$/); if (url.origin === location.origin && match) { link = a; id = match[1]; break; } } catch {} }
        if (!link) continue;
        const parts = clean(link.textContent).match(/^(.+?)\s+[-–—]\s+(.+)$/); if (!parts) continue;
        const item = {id,url:`/schoolings/${id}`,type:parts[1].toLocaleLowerCase('en-GB'),name:parts[2].toLocaleLowerCase('en-GB')};
        if (id === currentId) current = item;
        if (table.id !== 'schooling_opened_table' || seen.has(id)) continue;
        seen.add(id); const value = clean(row.cells[1]?.textContent); item.places = /^\d{1,4}$/.test(value) ? Number(value) : 0; opened.push(item);
      }
    }
    if (!current) {
      const name = clean(record.courseName).toLocaleLowerCase('en-GB'), candidates = opened.filter(row => row.name === name);
      const types = new Set(candidates.map(row => row.type));
      if (types.size !== 1) return {next:null,reason:types.size ? 'The course type is ambiguous. Choose the next course from the list.' : 'No other matching course is currently listed.'};
      current = {name,type:[...types][0]};
    }
    const index = opened.findIndex(row => row.id === currentId), ordered = index < 0 ? opened : [...opened.slice(index+1),...opened.slice(0,index)];
    const matching = ordered.filter(row => row.id !== currentId && row.name === current.name && row.type === current.type && row.places > 0);
    const next = matching.find(row => row.places === 10) || matching.find(row => row.places > 10) || matching[0] || null;
    return {next,reason:'No other session of this course with free places is currently listed.'};
  }
  async function courseList() {
    if (/^\/schoolings\/?$/.test(location.pathname) && document.querySelector('#schooling_opened_table')) return document;
    controller = new AbortController(); const pending = controller, timer = setTimeout(() => pending.abort(),15000); timeout = timer;
    try {
      const response = await fetch('/schoolings',{credentials:'same-origin',redirect:'error',signal:pending.signal,headers:{Accept:'text/html'}});
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw Error('The course list could not be read.');
      const reader = response.body.getReader(), decoder = new TextDecoder(); let raw = '', bytes = 0;
      try { while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength; if (bytes > 4*1024*1024) { await reader.cancel(); throw Error('The course list is too large to read safely.'); } raw += decoder.decode(part.value,{stream:true}); } raw += decoder.decode(); } finally { reader.releaseLock(); }
      const doc = new DOMParser().parseFromString(raw,'text/html'); if (!doc.querySelector('#schooling_opened_table')) throw Error('The game did not return its open-course list.'); return doc;
    } finally { clearTimeout(timer); if (controller === pending) { controller = null; timeout = null; } }
  }
  async function finishPending(ticket) {
    let record;
    try { record = JSON.parse(sessionStorage.getItem(key)); } catch { clear(); return false; }
    if (!record) return false;
    let url;
    try { url = new URL(record.url, location.origin); } catch { clear(); return false; }
    if (url.origin !== location.origin || !/^\/schoolings\/\d+\/?$/.test(url.pathname) || !Number.isFinite(record.at) || Date.now() - record.at < 0 || Date.now() - record.at > 120000 || !['submitted','arriving'].includes(record.stage)) { clear(); return false; }
    const ref = (() => { try { return new URL(document.referrer); } catch { return null; } })();
    if (!ref || ref.origin !== location.origin || ![url.pathname, url.pathname.replace(/\/$/, '') + '/education','/schoolings','/schoolings/'].includes(ref.pathname)) { clear(); return false; }
    const alerts = [...document.querySelectorAll('.alert,.error_explanation,#error_explanation,.field_with_errors')];
    const success = alerts.some(n => n.matches('.alert-success') && /(?:train|educat|personnel|course|success)/i.test(clean(n.textContent)));
    const failure = alerts.some(n => n.matches('.alert-danger,.alert-error,.error_explanation,#error_explanation,.field_with_errors') || /(?:not enough|cannot|could not|unable to)/i.test(clean(n.textContent)));
    const full = alerts.some(n => /(?:\bno (?:free |available )?(?:seats|places)\b|\b0 (?:seats|places)\b|course is full)/i.test(clean(n.textContent)));
    // A successfully filled source course may now show zero seats. That is the
    // reason to find the next session, not an enrolment failure. A full target
    // course without a success confirmation still remains visible.
    if (failure || (full && !success)) { clear(); return false; }
    if (record.stage === 'arriving' && /^\/schoolings\/[1-9]\d{0,15}$/.test(record.target || '') && record.target !== url.pathname && location.pathname === record.target && form) {
      clear();
      for (const input of form.querySelectorAll('#accordion input[type=checkbox]:checked')) { input.checked = false; input.dispatchEvent(new Event('change', {bubbles:true})); }
      restoreFilters(record); feedback(`Next matching course opened. Select the next batch.${record.places !== 10 ? ` This session had ${record.places} free places when checked; none with exactly 10 was listed.` : ''}`); return false;
    }
    if (success && record.stage === 'submitted') {
      feedback('Finding the next session of this course, preferring 10 free places…');
      try {
        const result = chooseNext(await courseList(),record);
        if (ticket !== generation || !started || !visible()) return true;
        if (!result.next) { clear(); feedback(result.reason,'/schoolings'); return false; }
        sessionStorage.setItem(key, JSON.stringify({...record,stage:'arriving',target:result.next.url,places:result.next.places}));
        location.replace(result.next.url); return true;
      } catch (error) { if (ticket !== generation) return true; clear(); if (started && visible()) feedback(`Enrolment succeeded, but the next course could not be opened: ${clean(error.message)} No enrolment was retried.`,'/schoolings'); return false; }
    }
    clear();
    feedback('Check the game’s enrolment result before selecting another batch.','/schoolings');
    return false;
  }
  function submit(event) {
    if (busy) { event.preventDefault(); return; }
    if (!armed) { clear(); return; }
    busy = true; again.disabled = true;
    // Run after native validation and submit handlers. Cancelled submissions do
    // not arm a return; the game retains its own error and AJAX behaviour.
    queueMicrotask(() => {
      if (event.defaultPrevented) { busy = false; again.disabled = original.disabled; clear(); return; }
      const filters = {centre: document.querySelector('#nx-schooling-filters select')?.value || '', station: document.querySelector('#nx-schooling-filters input')?.value || '', stationType: document.querySelector('#nx-schooling-filters')?.dataset.stationType || ''};
      const courseName = clean(document.querySelector('h1,h2')?.textContent).slice(0,220);
      try { sessionStorage.setItem(key, JSON.stringify({url:location.pathname + location.search,at:Date.now(),stage:'submitted',courseName,filters})); } catch { /* Native submission still proceeds once. */ }
    });
  }
  async function start() {
    if (started || !visible()) return; started = true; const ticket = ++generation; form = nativeForm();
    style = el('style'); style.textContent = `
      .nx-education-button{display:inline-block!important;box-sizing:border-box!important;background:#1d415d!important;color:#eef5ff!important;border:1px solid #7193ac!important;border-radius:4px!important;padding:8px 12px!important;font:13px system-ui,sans-serif!important;text-decoration:none!important;cursor:pointer;margin:6px 8px 6px 0!important;max-width:100%;white-space:normal!important}
      .nx-education-button:disabled{opacity:.55;cursor:wait}.nx-education-button:focus-visible{outline:2px solid #69c8ff;outline-offset:2px}.nx-education-note{background:#102338;color:#eef5ff;border-left:4px solid #579cc5;padding:10px;font:13px system-ui,sans-serif}
      html[data-nexus-touch=true] .nx-education-button{min-height:44px}html[data-nexus-desktop-phone] .nx-education-button{font-size:calc(13px * var(--nx-ui-scale))!important;min-height:calc(44px * var(--nx-ui-scale))}
    `; document.head.append(style);
    if (await finishPending(ticket) || ticket !== generation || !started || !visible()) return;
    if (!form || !/^\/schoolings\/\d+\/?$/.test(location.pathname)) return;
    original = [...form.querySelectorAll('input[type=submit],button[type=submit],button:not([type])')].find(n => /^educate$/i.test(clean(n.value || n.textContent)));
    if (!original) return;
    original.classList.add('nx-education-button');
    // The original button keeps its name, value, validation and game handlers.
    again = el('button', 'Educate + select again'); again.type = 'button'; again.id = 'nx-educate-again'; again.className = 'nx-education-button'; again.disabled = original.disabled;
    again.title = 'Educate this batch, then open the next session of the same course, preferring 10 free places'; original.after(again);
    observer = new MutationObserver(() => { again.disabled = busy || original.disabled; }); observer.observe(original, {attributes:true,attributeFilter:['disabled']});
    again.addEventListener('click', () => {
      if (busy || original.disabled || !visible() || !form.reportValidity()) return;
      armed = true; try { original.click(); } finally { armed = false; }
    });
    form.addEventListener('submit', submit, true);
  }
  function stop() {
    started = false; generation++; if (controller) clear(); controller?.abort(); controller = null; clearTimeout(timeout); timeout = null; observer?.disconnect(); observer = null; form?.removeEventListener('submit', submit, true); original?.classList.remove('nx-education-button'); again?.remove(); note?.remove(); style?.remove(); form = original = again = note = style = null; armed = busy = false;
  }
  // pagehide happens only when the new document commits. Cancel earlier so a
  // delayed course-list response cannot replace the user's navigation in flight.
  window.addEventListener('beforeunload', () => {
    if (!controller) return;
    generation++; clear(); controller.abort(); controller = null; clearTimeout(timeout); timeout = null;
    feedback('Next-course lookup cancelled. Choose the next course from the list.','/schoolings');
  });
  window.addEventListener('pagehide', stop); window.addEventListener('pageshow', start);
  document.addEventListener('visibilitychange', () => { if (!started) start(); }); start();
})();
