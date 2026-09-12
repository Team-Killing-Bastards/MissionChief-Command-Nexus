/* Nexus manual transport navigation. Native controls choose destinations and finish transports.
 * Selectors/route behaviour adapted from LSSM-V.4 enhancedTransportRequests at
 * 677fd601c0421bfbf5c226ff1f560b36e587c4d0, CC BY-NC-SA 4.0; see included licence. */
(() => {
  'use strict';
  const mission = /^\/missions\/\d+\/?$/.test(location.pathname);
  const vehicle = /^\/vehicles\/\d+(?:\/(?:patient|gefangener)\/\d+)?\/?$/.test(location.pathname);
  if ((!mission && !vehicle) || window.__NEXUS_TRANSPORT_SHORTCUTS__) return;
  const workerName = /^mcn-v3-(?:active-worker|pipeline-preload|retired-worker)-/;
  const workerSelector = '[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload],#mcn-v3-background-mission-worker';
  function worker() {
    try {
      let win = window;
      while (true) {
        if (workerName.test(win.name || '')) return true;
        if (win === win.top) return false;
        if (win.frameElement?.matches(workerSelector)) return true;
        win = win.parent;
      }
    } catch { return true; }
  }
  if (worker()) return;
  const key = 'nexusManualTransportShortcutsV1', historyKey = 'nexusManualTransportNavigationV1';
  const defaults = window.__NEXUS_COMFORT_DATA__?.flags?.enhancedTransportRequests || {};
  let prefs, panel, status, timer = null, done = false, suspended = false, storageFailed = false;
  let frameObserver = null;
  const state = window.__NEXUS_TRANSPORT_SHORTCUTS__ = { checks: 0, actions: 0, lastAction: '', blocked: '' };
  function read() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { storageFailed = true; }
    prefs = Object.fromEntries(['autoOpenTransportRequest', 'autoClickSuccessBtns'].map(name => [name,
      typeof saved[name] === 'boolean' ? saved[name] : defaults[name] !== false]));
  }
  function visible(node) {
    if (suspended || document.hidden || worker()) return false;
    try {
      let win = window;
      while (win !== win.top) {
        const frame = win.frameElement;
        if (!frame || frame.hidden || frame.getAttribute('aria-hidden') === 'true') return false;
        const css = win.parent.getComputedStyle(frame);
        if (css.display === 'none' || css.visibility === 'hidden' || css.opacity === '0' || !frame.getClientRects().length) return false;
        win = win.parent;
      }
      if (!node) return true;
      const css = getComputedStyle(node);
      return node.isConnected && !node.closest('[hidden],[aria-hidden="true"]') && css.display !== 'none' && css.visibility !== 'hidden' && !!node.getClientRects().length;
    } catch { return false; }
  }
  function safeLink(node, pattern) {
    if (!node || !visible(node) || node.matches('.disabled,[disabled],[aria-disabled="true"],[download]')) return false;
    if (node.dataset.method && node.dataset.method.toLowerCase() !== 'get') return false;
    if (node.target && node.target !== '_self') return false;
    try { const url = new URL(node.getAttribute('href'), location.href); return url.origin === location.origin && pattern.test(url.pathname) && url.pathname !== location.pathname; } catch { return false; }
  }
  function say(value) { if (status) status.textContent = value; }
  function mount() {} // All transport preferences now live in Nexus Tools > Settings.
  function destinationPending() {
    // Never advance while a hospital/prison choice is still visible, even if a next button also exists.
    return [...document.querySelectorAll('a[href*="/patient/"],a[href*="/gefangener/"]')].some(node => visible(node) && /\/vehicles\/\d+\/(?:patient|gefangener)\/\d+/.test(node.getAttribute('href') || ''));
  }
  function candidate() {
    if (mission) {
      if (!prefs.autoOpenTransportRequest) return null;
      return [...document.querySelectorAll('.alert.alert-danger:not(.alert-missing-vehicles) a.btn.btn-success[href]')]
        .find(node => safeLink(node, /^\/vehicles\/\d+\/?$/)) || null;
    }
    if (!prefs.autoClickSuccessBtns || destinationPending()) return null;
    if ([...document.querySelectorAll('.alert.alert-danger')].some(node => visible(node))) return null;
    const next = document.getElementById('next-vehicle-fms-5');
    if (safeLink(next, /^\/vehicles\/\d+\/?$/)) return next;
    // A vehicle overview's green Mission link is not a completed transport receipt.
    if (!/^\/vehicles\/\d+\/(?:patient|gefangener)\/\d+\/?$/.test(location.pathname)) return null;
    return [...document.querySelectorAll('a.btn.btn-success[href]')].find(node => safeLink(node, /^\/missions\/\d+\/?$/)) || null;
  }
  function allowNavigation(node) {
    const now = Date.now(), to = new URL(node.href).pathname, from = location.pathname;
    let entries = [];
    try { const value = JSON.parse(sessionStorage.getItem(historyKey) || '[]'); if (Array.isArray(value)) entries = value.filter(e => e && typeof e.from === 'string' && typeof e.to === 'string' && Number.isFinite(e.at) && now - e.at >= 0 && now - e.at < 30000).slice(-24); } catch { /* Per-document guard still applies. */ }
    if (entries.filter(e => e.from === from && e.to === to).length >= 3 || entries.filter(e => now - e.at < 10000).length >= 12) {
      state.blocked = 'repeat-navigation'; say('Automatic navigation paused because the same request keeps returning. Use the game controls to continue.'); return false;
    }
    try { sessionStorage.setItem(historyKey, JSON.stringify([...entries, { from, to, at: now }].slice(-24))); } catch { /* No settings or transport state is changed. */ }
    return true;
  }
  function check() {
    timer = null;
    if (!visible() || done) return;
    mount(); state.checks++;
    const target = candidate(); if (!target) return;
    if (!allowNavigation(target)) { done = true; return; }
    done = true; state.actions++; state.lastAction = mission ? 'open-first' : target.id === 'next-vehicle-fms-5' ? 'next-request' : 'back-to-mission';
    target.click();
  }
  function schedule() {
    clearTimeout(timer); timer = null;
    if (visible() && !done) timer = setTimeout(check, 200);
  }
  function resume() { suspended = false; watchFrames(); mount(); schedule(); }
  function suspend() { suspended = true; clearTimeout(timer); timer = null; frameObserver?.disconnect(); frameObserver = null; }
  read();
  document.addEventListener('visibilitychange', () => document.hidden ? suspend() : resume());
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', resume);
  window.addEventListener('focus', schedule);
  window.addEventListener('nexus:settings-saved', () => { read(); schedule(); });
  window.addEventListener('storage', event => {
    if (event.key !== key) return; read();
    for (const input of panel?.querySelectorAll('input[data-nx-transport-setting]') || []) input.checked = prefs[input.dataset.nxTransportSetting];
    schedule();
  });
  // Attribute-only visibility watching on containing frames/wrappers; no mission/vehicle subtree observer.
  function watchFrames() { if (frameObserver || worker()) return; try {
    let win = window;
    if (win !== win.top) frameObserver = new MutationObserver(schedule);
    while (win !== win.top) {
      let parent = win.frameElement;
      for (let i = 0; parent && i < 12; i++, parent = parent.parentElement) frameObserver.observe(parent, { attributes: true, attributeFilter: ['style', 'class', 'hidden', 'aria-hidden', 'data-mcn-v3-worker', 'data-mcn-v3-pipeline-preload', 'name'] });
      win = win.parent;
    }
  } catch { frameObserver?.disconnect(); frameObserver = null; } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', resume, { once: true }); else resume();
})();
