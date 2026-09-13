/* Local-only passive transition diagnostics. No request bodies, queries or response bodies. */
(() => {
  'use strict';
  const KEY = '__NEXUS_LOCAL_DISPATCH_TRACE__';
  let host;
  try { host = window.top; void host.location.href; } catch { host = window; }
  if (!host[KEY]) {
    const limit = 2000, storageKey = 'nexusLocalDispatchTrace60';
    let events = [], dropped = 0, dirty = false, storageFailed = false;
    try {
      const saved = JSON.parse(host.sessionStorage.getItem(storageKey) || 'null');
      if (saved?.schema === 1 && Array.isArray(saved.events)) {
        events = saved.events.slice(-limit); dropped = Number(saved.dropped) || 0;
      }
    } catch { storageFailed = true; }
    const snapshot = () => ({schema: 1, build: '3.0.43.72-local-trace', limit,
      retained: events.length, dropped, storageFailed,
      scope: 'Recent events in this tab, including same-origin frames. Timings are observations, not server acceptance. No request or response bodies captured.',
      events: events.map(event => ({...event}))});
    const record = (type, data = {}) => {
      // Accept scalar diagnostics only; never retain DOM nodes, responses or documents.
      const event = {at: Date.now(), type: String(type).slice(0, 80)};
      for (const [key, value] of Object.entries(data).slice(0, 24)) {
        if (typeof value === 'string') event[key] = value.slice(0, 180);
        else if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) event[key] = value;
      }
      events.push(event);
      if (events.length > limit) { dropped += events.length - limit; events.splice(0, events.length - limit); }
      dirty = true;
    };
    const flush = () => {
      if (!dirty) return;
      try { host.sessionStorage.setItem(storageKey, JSON.stringify({schema: 1, dropped, events})); dirty = false; }
      catch { storageFailed = true; }
    };
    host[KEY] = {record, snapshot};
    // Persistence is deferred, outside dispatch click handlers and mission selection.
    host.setInterval(flush, 15000);
    host.addEventListener('pagehide', flush);
  }
  const trace = host[KEY];
  if (window.__NEXUS_TRACE_DOCUMENT_60__) return;
  window.__NEXUS_TRACE_DOCUMENT_60__ = true;
  const documentId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = value => { try { return new URL(value, location.href).pathname; } catch { return ''; } };
  const record = (type, data = {}) => trace.record(type, {documentId, path: path(location.href), topFrame: window === host, ...data});
  const seenResources = new Set();
  const observeResources = entries => {
    for (const entry of entries) {
      const targetPath = path(entry.name);
      if (!/^\/(missions|vehicles)\/\d+(?:\/|$)/.test(targetPath)) continue;
      const identity = `${entry.name}:${entry.startTime}`;
      if (seenResources.has(identity)) continue;
      seenResources.add(identity);
      if (seenResources.size > 1000) seenResources.delete(seenResources.values().next().value);
      record('request-timing', {targetPath, initiator: entry.initiatorType || 'navigation',
        requestStartedAt: Math.round(performance.timeOrigin + entry.startTime),
        responseStartedAt: entry.responseStart ? Math.round(performance.timeOrigin + entry.responseStart) : 0,
        responseEndedAt: entry.responseEnd ? Math.round(performance.timeOrigin + entry.responseEnd) : 0,
        durationMs: Math.round(entry.duration), status: entry.responseStatus || 0});
    }
  };
  record('document-start');
  let observer;
  try {
    observer = new PerformanceObserver(list => observeResources(list.getEntries()));
    observer.observe({type: 'resource', buffered: true});
  } catch { record('resource-observer-unavailable'); }
  document.addEventListener('click', event => {
    const control = event.target?.closest?.('button,input[type=submit],a');
    if (!control) return;
    const id = String(control.id || '');
    const label = String(control.textContent || control.value || '').trim();
    if (/dispatch|alarm/i.test(id + ' ' + label)) record('dispatch-control-click', {controlId: id, label, trusted: event.isTrusted});
    if (control.tagName === 'A') {
      const targetPath = path(control.href);
      if (/^\/missions\/\d+(?:\/|$)/.test(targetPath)) record('mission-link-click', {targetPath});
    }
  }, true);
  document.addEventListener('submit', event => {
    const targetPath = path(event.target?.action);
    if (/^\/missions\/\d+(?:\/|$)/.test(targetPath)) record('mission-form-submit', {targetPath});
  }, true);
  window.addEventListener('load', () => { record('document-load'); observeResources(performance.getEntriesByType('navigation')); });
  window.addEventListener('pagehide', () => { observeResources(observer?.takeRecords() || []); observeResources(performance.getEntriesByType('resource')); record('document-pagehide'); observer?.disconnect(); });
  window.addEventListener('pageshow', event => { if (event.persisted) { record('document-restored'); observer?.observe({type:'resource'}); } });
})();
