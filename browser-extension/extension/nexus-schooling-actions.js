/* Native enrolment buttons. One native submission; returning is a GET only. */
(() => {
  'use strict';
  if (!/^\/schoolings(?:\/\d+(?:\/education)?)?\/?$/.test(location.pathname) || globalThis.__NEXUS_SCHOOLING_ACTIONS__) return;
  globalThis.__NEXUS_SCHOOLING_ACTIONS__ = true;
  const key = 'nexusEducateReturnV1';
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
  let form, original, again, note, style, observer, armed = false, busy = false, started = false;
  function nativeForm() {
    return [...document.querySelectorAll('form')].find(f => {
      try { const u = new URL(f.action); return u.origin === location.origin && /^\/schoolings\/\d+\/education\/?$/.test(u.pathname) && f.method.toLowerCase() === 'post' && (!f.target || f.target === '_self') && f.querySelector('#accordion'); } catch { return false; }
    });
  }
  function feedback(message, href) {
    note?.remove(); note = el('p', message); note.className = 'nx-education-note'; note.setAttribute('role', 'status');
    if (href) { const link = el('a', 'Return to this course'); link.href = href; link.className = 'nx-education-button'; note.append(' ', link); }
    (document.querySelector('h1,h2') || document.body.firstElementChild || document.body).after(note);
  }
  function restoreFilters(record) {
    // The existing course filter handles centre metadata arriving asynchronously.
    document.dispatchEvent(new CustomEvent('nexus-schooling-restore', {detail: JSON.stringify(record.filters || {})}));
  }
  function finishPending() {
    let record;
    try { record = JSON.parse(sessionStorage.getItem(key)); } catch { clear(); return false; }
    if (!record) return false;
    let url;
    try { url = new URL(record.url, location.origin); } catch { clear(); return false; }
    if (url.origin !== location.origin || !/^\/schoolings\/\d+\/?$/.test(url.pathname) || !Number.isFinite(record.at) || Date.now() - record.at < 0 || Date.now() - record.at > 120000 || !['submitted','returning'].includes(record.stage)) { clear(); return false; }
    const ref = (() => { try { return new URL(document.referrer); } catch { return null; } })();
    if (!ref || ref.origin !== location.origin || ![url.pathname, url.pathname.replace(/\/$/, '') + '/education','/schoolings','/schoolings/'].includes(ref.pathname)) { clear(); return false; }
    const alerts = [...document.querySelectorAll('.alert,.error_explanation,#error_explanation,.field_with_errors')];
    const failure = alerts.some(n => n.matches('.alert-danger,.alert-error,.error_explanation,#error_explanation,.field_with_errors') || /(?:\bno (?:free |available )?(?:seats|places)\b|\b0 (?:seats|places)\b|course is full|not enough|cannot|could not|unable to)/i.test(clean(n.textContent)));
    if (failure) { clear(); return false; }
    const success = alerts.some(n => n.matches('.alert-success') && /(?:train|educat|personnel|course|success)/i.test(clean(n.textContent)));
    if (location.pathname === url.pathname && form && (record.stage === 'returning' || success)) {
      clear();
      for (const input of form.querySelectorAll('#accordion input[type=checkbox]:checked')) { input.checked = false; input.dispatchEvent(new Event('change', {bubbles:true})); }
      restoreFilters(record); feedback('Select the next batch for this course.'); return false;
    }
    if (success && record.stage === 'submitted') {
      try { sessionStorage.setItem(key, JSON.stringify({...record, stage:'returning'})); } catch { clear(); return false; }
      location.replace(url.href); return true;
    }
    clear();
    feedback('Check the game’s enrolment result before selecting another batch.', url.href);
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
      const filters = {centre: document.querySelector('#nx-schooling-filters select')?.value || '', station: document.querySelector('#nx-schooling-filters input')?.value || ''};
      try { sessionStorage.setItem(key, JSON.stringify({url:location.pathname + location.search,at:Date.now(),stage:'submitted',filters})); } catch { /* Native submission still proceeds once. */ }
    });
  }
  function start() {
    if (started || !visible()) return; started = true; form = nativeForm();
    style = el('style'); style.textContent = `
      .nx-education-button{display:inline-block!important;box-sizing:border-box!important;background:#1d415d!important;color:#eef5ff!important;border:1px solid #7193ac!important;border-radius:4px!important;padding:8px 12px!important;font:13px system-ui,sans-serif!important;text-decoration:none!important;cursor:pointer;margin:6px 8px 6px 0!important;max-width:100%;white-space:normal!important}
      .nx-education-button:disabled{opacity:.55;cursor:wait}.nx-education-button:focus-visible{outline:2px solid #69c8ff;outline-offset:2px}.nx-education-note{background:#102338;color:#eef5ff;border-left:4px solid #579cc5;padding:10px;font:13px system-ui,sans-serif}
      html[data-nexus-touch=true] .nx-education-button{min-height:44px}html[data-nexus-desktop-phone] .nx-education-button{font-size:calc(13px * var(--nx-ui-scale))!important;min-height:calc(44px * var(--nx-ui-scale))}
    `; document.head.append(style);
    if (finishPending()) return;
    if (!form || !/^\/schoolings\/\d+\/?$/.test(location.pathname)) return;
    original = [...form.querySelectorAll('input[type=submit],button[type=submit],button:not([type])')].find(n => /^educate$/i.test(clean(n.value || n.textContent)));
    if (!original) return;
    original.classList.add('nx-education-button');
    // The original button keeps its name, value, validation and game handlers.
    again = el('button', 'Educate + select again'); again.type = 'button'; again.id = 'nx-educate-again'; again.className = 'nx-education-button'; again.disabled = original.disabled;
    again.title = 'Educate this batch, then return to this advertised course after the game confirms success'; original.after(again);
    observer = new MutationObserver(() => { again.disabled = busy || original.disabled; }); observer.observe(original, {attributes:true,attributeFilter:['disabled']});
    again.addEventListener('click', () => {
      if (busy || original.disabled || !visible() || !form.reportValidity()) return;
      armed = true; try { original.click(); } finally { armed = false; }
    });
    form.addEventListener('submit', submit, true);
  }
  function stop() {
    started = false; observer?.disconnect(); observer = null; form?.removeEventListener('submit', submit, true); original?.classList.remove('nx-education-button'); again?.remove(); note?.remove(); style?.remove(); form = original = again = note = style = null; armed = busy = false;
  }
  window.addEventListener('pagehide', stop); window.addEventListener('pageshow', start);
  document.addEventListener('visibilitychange', () => { if (!started) start(); }); start();
})();
