(() => {
  if (window.top !== window) return;
  const session = crypto.randomUUID();
  let queue = [], timer = null, sending = false, dropped = 0;
  let minute = 0, captured = 0;
  const publish = enabled => window.dispatchEvent(new CustomEvent('nexus-analytics-control-v1', { detail: JSON.stringify({ enabled }) }));
  async function state() {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'NEXUS_ANALYTICS_CAPTURE', events: [] });
      publish(result?.ok === true && result.disabled !== true);
    } catch { publish(false); }
  }
  window.addEventListener('nexus-analytics-ready-v1', () => void state());
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.nexusAnalyticsSettingsV1) publish(changes.nexusAnalyticsSettingsV1.newValue?.enabled === true); });
  void state();
  const stateTimer = setInterval(() => void state(), 30000);
  async function flush() {
    timer = null;
    if (sending || !queue.length) return;
    sending = true;
    const batch = queue.slice(0, 30);
    let accepted = false;
    try {
      const reply = await chrome.runtime.sendMessage({ type: 'NEXUS_ANALYTICS_CAPTURE', events: batch });
      if (reply?.ok) {
        accepted = true;
        queue = queue.filter(e => !batch.some(b => b.id === e.id));
        if (reply.disabled) publish(false);
        if (dropped && !reply.disabled) { queue.push({kind:'status',player:batch[0].player,username:batch[0].username,at:Date.now(),id:crypto.randomUUID(),session,phase:'CAPTURE_BACKPRESSURE',reason:dropped+' events exceeded the page buffer while local storage was unavailable'}); dropped=0; }
      }
    } catch {} finally {
      sending = false;
      if (queue.length) timer = setTimeout(flush, accepted ? 250 : 5000);
    }
  }
  window.addEventListener('nexus-analytics-event-v1', event => {
    if (typeof event.detail !== 'string' || event.detail.length > 501000) return;
    const current = Math.floor(Date.now() / 60000);
    if (current !== minute) { minute = current; captured = 0; }
    try {
      const parsed = JSON.parse(event.detail);
      if (!['mission','session'].includes(parsed.kind) && ++captured > 600) return;
      queue.push({ ...parsed, id: crypto.randomUUID(), session });
      if (queue.length > 120 || JSON.stringify(queue).length > 2000000) {
        const index = queue.findIndex(e => !['mission','session'].includes(e.kind));
        queue.splice(index < 0 ? 0 : index, 1);
        dropped++;
      }
      if (!timer && !sending) timer = setTimeout(flush, 250);
    } catch {}
  });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return; // Edge resumes the existing timers on BFCache return.
    clearInterval(stateTimer); if (timer) clearTimeout(timer); void flush();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) void state(); });
})();
