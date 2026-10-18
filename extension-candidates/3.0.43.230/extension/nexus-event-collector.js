/* Native event items: independent of the heavy mission runtime and dispatch. */
(() => {
  'use strict';
  const VERSION = '3.0.43.230';
  const SETTING = 'mf_event_scanner_enabled_v1';
  const LINK_ID = 'easter-egg-link'; // Fast path for the game's shared event control.
  const LIMIT = 250, QUEUE_LIMIT = 24, RECENT_MS = 30 * 60 * 1000;
  const DEADLINE_MS = 5000;
  let host;
  try {
    host = window.top;
    if (host.location.origin !== location.origin) return;
    const parentBuild = host.__NEXUS_EXTENSION__?.build;
    if (parentBuild && parentBuild !== VERSION) return;
  } catch { return; }
  if (window.__NEXUS_EVENT_DOCUMENT__) return;
  window.__NEXUS_EVENT_DOCUMENT__ = true;

  const settingEnabled = () => { try { return localStorage.getItem(SETTING) !== 'false'; } catch { return false; } };
  const parseClaim = value => {
    try {
      if (typeof value !== 'string' || value.length > 500) return null;
      const url = new URL(value, location.origin);
      const match = url.pathname.match(/^\/missions\/(\d+)\/claim_found_object_sync$/);
      if (url.origin !== location.origin || url.username || url.password || !match) return null;
      return {id:match[1], href:url.pathname + url.search};
    } catch { return null; }
  };
  // Temporary document references exist only during this bounded visit. No frame,
  // DOM node, callback or child-realm promise enters the coordinator's queue/cache.
  const visitDocuments = callback => {
    const docs = [document];
    for (let i = 0; i < docs.length && i < QUEUE_LIMIT; i++) {
      const doc = docs[i];
      try {
        callback(doc);
        const frames = doc.querySelectorAll('iframe');
        for (let n = 0; n < frames.length && docs.length < QUEUE_LIMIT; n++) {
          const child = frames[n].contentDocument;
          if (child?.documentElement && !docs.includes(child)) docs.push(child);
        }
      } catch {}
    }
  };
  const findLink = doc => doc.getElementById(LINK_ID) || doc.querySelector('a[href*="/claim_found_object_sync"]');
  const linkClaim = doc => {
    const link = findLink(doc);
    if (link?.tagName !== 'A') return null;
    const claim = parseClaim(link.getAttribute('href'));
    if (!claim) return null;
    const ownMission = doc.location.pathname.match(/^\/missions\/(\d+)(?:\/|$)/)?.[1];
    return ownMission && ownMission !== claim.id ? null : claim;
  };

  if (window === host && !host.NexusEventCollector) {
    const recent = new Map(), queue = [];
    const counts = {detected:0, requests:0, acceptedResponses:0, failures:0, timeouts:0, duplicates:0, overflow:0};
    let active = null, suspended = false, lastAt = 0, lastStatus = 0;
    const prune = () => {
      const now = Date.now();
      for (const [id, item] of recent) if (item.status !== 'queued' && item.status !== 'active' && now - item.at > RECENT_MS) recent.delete(id);
      for (const [id, item] of recent) {
        if (recent.size < LIMIT) break;
        if (item.status !== 'queued' && item.status !== 'active') recent.delete(id);
      }
    };
    const removeAcceptedLinks = id => visitDocuments(doc => {
      const claim = linkClaim(doc);
      if (claim?.id === id) findLink(doc)?.remove();
    });
    const pump = async () => {
      if (active || suspended || !settingEnabled() || !queue.length) return;
      const job = queue.shift(), controller = new AbortController();
      const item = recent.get(job.id);
      if (!item) { queueMicrotask(pump); return; }
      item.status = 'active';
      active = {id:job.id, controller};
      let timedOut = false;
      const deadline = setTimeout(() => { timedOut = true; controller.abort(); }, DEADLINE_MS);
      counts.requests++;
      try {
        const response = await fetch(job.href, {
          method:'GET', credentials:'same-origin', cache:'no-store', redirect:'error', signal:controller.signal
        });
        lastStatus = response.status;
        try { void response.body?.cancel().catch(() => {}); } catch {}
        if (!response.ok || controller.signal.aborted) throw Error('Claim not acknowledged');
        item.status = 'accepted';
        counts.acceptedResponses++;
        removeAcceptedLinks(job.id);
        // HTTP acknowledgement is exported separately from any in-game score.
        window.dispatchEvent(new CustomEvent('mc-mission-event-collectible-claimed', {detail:{missionId:job.id, href:job.href}}));
      } catch {
        item.status = timedOut ? 'timeout' : 'failed';
        counts.failures++;
        if (timedOut) counts.timeouts++;
        // An uncertain claim is not retried automatically. Freshly observed items
        // become eligible after the bounded recent-history window expires.
      } finally {
        clearTimeout(deadline);
        item.at = lastAt = Date.now();
        active = null;
        queueMicrotask(pump);
      }
    };
    const offer = value => {
      if (suspended || !settingEnabled()) return false;
      const claim = parseClaim(value);
      if (!claim) return false;
      prune();
      counts.detected++;
      const existing = recent.get(claim.id);
      if (existing) {
        counts.duplicates++;
        if (existing.status === 'accepted') removeAcceptedLinks(claim.id);
        return false;
      }
      if (queue.length >= QUEUE_LIMIT || recent.size >= LIMIT) { counts.overflow++; return false; }
      recent.set(claim.id,{at:Date.now(),status:'queued'});
      queue.push({id:claim.id,href:claim.href});
      queueMicrotask(pump);
      return true;
    };
    const cancelPending = () => {
      for (const job of queue.splice(0)) recent.delete(job.id);
      active?.controller.abort();
    };
    const scanOpenDocuments = () => {
      if (!suspended && settingEnabled()) visitDocuments(doc => { const claim=linkClaim(doc); if(claim)offer(claim.href); });
    };
    const settingsChanged = () => { if (!settingEnabled()) cancelPending(); else scanOpenDocuments(); };
    host.NexusEventCollector = Object.freeze({
      version:VERSION, offer,
      snapshot:() => ({version:VERSION, enabled:settingEnabled(), suspended, ...counts,
        pending:queue.length, inFlight:!!active, recentCount:recent.size, maxRecent:LIMIT, lastAt, lastStatus,
        recurringTimer:false, requestDeadlineMs:DEADLINE_MS})
    });
    window.addEventListener('nexus:settings-saved',settingsChanged);
    window.addEventListener('storage',event => { if(event.key===SETTING || event.key===null)settingsChanged(); });
    window.addEventListener('pagehide',() => { suspended=true;cancelPending(); });
    window.addEventListener('pageshow',event => { if(event.persisted){suspended=false;scanOpenDocuments();} });
  }

  let lateCheck = null;
  const scanOwnDocument = () => {
    const api = host.NexusEventCollector;
    if (!settingEnabled() || api?.version !== VERSION) return;
    const claim = linkClaim(document);
    if (claim) api.offer(claim.href);
  };
  const ready = () => {
    scanOwnDocument();
    // One bounded follow-up handles controls inserted just after DOM ready.
    // There is no polling and no observation of vehicle-table mutations.
    if (/^\/missions\/\d+(?:\/|$)/.test(location.pathname) && settingEnabled()) {
      clearTimeout(lateCheck);
      lateCheck = setTimeout(() => { lateCheck=null;scanOwnDocument(); },2000);
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
  window.addEventListener('pagehide',() => { clearTimeout(lateCheck);lateCheck=null; });
  window.addEventListener('pageshow',event => { if(event.persisted)ready(); });
})();
