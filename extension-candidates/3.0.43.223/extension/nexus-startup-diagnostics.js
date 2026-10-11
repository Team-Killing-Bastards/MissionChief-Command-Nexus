/* Optional local startup evidence. Never participates in dispatch decisions. */
(() => {
  'use strict';
  if (globalThis.__NEXUS_STARTUP_DIAGNOSTICS__) return;
  const KEY = 'nexusDiagnosticCaptureV1', LIMIT = 200;
  const records = [];
  let enabled = false, dropped = 0, deduplicated = 0, failures = 0;
  let lastSignature = '', revealState = null, visibilityListening = false;
  const text = (value, max = 120) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const number = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  function refresh() {
    let next = false;
    try { next = localStorage.getItem(KEY) === 'true'; } catch {}
    if (next === enabled) return;
    enabled = next;
    if (enabled) {
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pagehide', onPageHide);
      window.addEventListener('pageshow', onPageShow);
      visibilityListening = true;
      capture('capture-enabled', document);
      // An existing Worker A can be captured immediately when enabled mid-run.
      try { globalThis.__NEXUS_CAPTURE_ACTIVE_STARTUP__?.('capture-enabled-worker'); } catch {}
    } else {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      visibilityListening = false;
      revealState = null;
    }
  }
  function onVisibility() { if (enabled) capture('document-visibility', document); }
  function onPageHide() {
    if (enabled) capture('document-pagehide', document);
    document.removeEventListener('visibilitychange', onVisibility);
    visibilityListening = false;
  }
  function onPageShow() {
    refresh();
    if (enabled && !visibilityListening) { document.addEventListener('visibilitychange', onVisibility); visibilityListening = true; }
  }
  function styleOf(view, node) {
    const style = view?.getComputedStyle?.(node);
    return {display: text(style?.display, 24), visibility: text(style?.visibility, 24), opacity: text(style?.opacity, 12)};
  }
  function hiddenAncestors(node, view) {
    const result = [];
    let inspected = 0;
    for (let parent = node?.parentElement; parent && inspected < 12; parent = parent.parentElement) {
      inspected++;
      const style = styleOf(view, parent);
      if (parent.hidden || parent.getAttribute('aria-hidden') === 'true' ||
          style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility) || style.opacity === '0') {
        if (result.length < 6) result.push({tag: text(parent.tagName, 16), id: text(parent.id, 80),
          hidden: !!parent.hidden, ariaHidden: text(parent.getAttribute('aria-hidden'), 8), ...style});
      }
    }
    return {items: result, ancestryTruncated: !!node && inspected === 12};
  }
  function capture(reason, doc = document, context = null) {
    // This gate precedes DOM/style access, array creation and signature work.
    if (!enabled) return false;
    try {
      context ||= {};
      if (!doc?.querySelector || !doc.defaultView) return false;
      const view = doc.defaultView;
      const path = String(view.location.pathname || '');
      const missionId = /^\/missions\/(\d+)(?:\/|$)/.exec(path)?.[1] || '';
      const wrapper = doc.getElementById('mission-finder-wrapper');
      const panel = doc.getElementById('control-panel');
      const button = doc.getElementById('auto-mode-box');
      const controls = [];
      if (button) controls.push(button);
      // Bound traversal; only Nexus panel controls are considered, never whole-page text.
      if (!button && (panel || wrapper)) {
        const walker = doc.createTreeWalker(panel || wrapper, 1);
        for (let node = walker.nextNode(), inspected = 0; node && inspected < 64 && controls.length < 4; node = walker.nextNode(), inspected++) {
          if (!node.matches('button, a.btn, input[type="button"], input[type="submit"], [role="button"]')) continue;
          const label = text(node.getAttribute('aria-label') || node.getAttribute('title') || node.value || node.textContent);
          if (/^(?:(?:start|stop) auto mode|auto mode(?:\s*[:\-–—]?\s*(?:start|stop|on|off|running|stopped|active|inactive))?)$/i.test(label)) controls.push(node);
        }
      }
      const bridge = view.__MCN_V3_FRAME_OWNERSHIP_BRIDGE__;
      const rawReveal = view.__NEXUS_STARTUP_DIAGNOSTICS__?.revealState() || null;
      // Copy fields into this realm. A foreign plain-object prototype can keep
      // a retired worker realm alive even when its properties are only scalars.
      const state = rawReveal ? {scheduledAt: number(rawReveal.scheduledAt),
        firstCallbackAt: number(rawReveal.firstCallbackAt), completedAt: number(rawReveal.completedAt),
        mode: text(rawReveal.mode, 16)} : null;
      const expectedId = /^\d+$/.test(String(context.expectedMissionId || '')) ? String(context.expectedMissionId) : '';
      const event = {
        at: Date.now(), reason: text(reason, 80), missionId,
        documentMatchesExpectedMission: !expectedId || expectedId === missionId,
        workerGeneration: number(context.workerGeneration), documentSerial: number(context.documentSerial),
        workerRole: text(context.workerRole, 32), frameName: text(context.frameName || view.name, 100),
        ownership: text(bridge?.role?.(), 24), ownershipSource: text(bridge?.source?.(), 60),
        readyState: text(doc.readyState, 16), documentVisibility: text(doc.visibilityState, 16),
        topDocument: view === view.top, wrapperPresent: !!wrapper, panelPresent: !!panel,
        wrapperStyle: wrapper ? styleOf(view, wrapper) : null,
        buttonPresent: controls.length > 0,
        controls: controls.map(control => ({id: text(control.id, 80),
          text: text(control.value || control.textContent), title: text(control.getAttribute('title')),
          ariaLabel: text(control.getAttribute('aria-label')), disabled: !!control.disabled,
          connected: !!control.isConnected, sameDocument: control.ownerDocument === doc,
          ...styleOf(view, control), hiddenAncestors: hiddenAncestors(control, view)})),
        panelReveal: state
      };
      const signature = JSON.stringify({...event, at: 0});
      if (signature === lastSignature) { deduplicated++; return false; }
      lastSignature = signature;
      records.push(event);
      if (records.length > LIMIT) { records.shift(); dropped++; }
      return true;
    } catch { failures++; return false; }
  }
  function reveal(stage) {
    if (!enabled) return;
    const now = Date.now();
    if (stage === 'scheduled') revealState = {scheduledAt: now, firstCallbackAt: 0, completedAt: 0, mode: 'animation'};
    else if (stage === 'first-callback') {
      revealState ||= {scheduledAt: 0, firstCallbackAt: 0, completedAt: 0, mode: 'animation'};
      revealState.firstCallbackAt = now;
    } else if (stage === 'completed' || stage === 'immediate') {
      revealState ||= {scheduledAt: 0, firstCallbackAt: 0, completedAt: 0, mode: stage === 'immediate' ? 'immediate' : 'animation'};
      revealState.completedAt = now;
    } else return;
    // The parent owns the export history; it receives a fresh scalar snapshot.
    try {
      const parentApi = window.top !== window ? window.top.__NEXUS_STARTUP_DIAGNOSTICS__ : null;
      if (parentApi?.isEnabled()) parentApi.capture('panel-reveal-' + stage, document);
      else capture('panel-reveal-' + stage, document);
    } catch { capture('panel-reveal-' + stage, document); }
  }
  const api = Object.freeze({isEnabled: () => enabled, capture, reveal,
    revealState: () => revealState ? {...revealState} : null,
    snapshot: () => ({schema: 1, build: '3.0.43.223', enabled, limit: LIMIT,
      retained: records.length, dropped, deduplicated, failures,
      visibilityListening, scope: 'Local bounded startup snapshots; no credentials, page dumps or network bodies. Disabled capture retains earlier evidence until this game page is refreshed.',
      records: JSON.parse(JSON.stringify(records))})});
  globalThis.__NEXUS_STARTUP_DIAGNOSTICS__ = api;
  // Configuration listeners remain cheap when off. No capture polling or timers.
  window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) refresh(); });
  window.addEventListener('nexus:settings-saved', refresh);
  refresh();
})();
