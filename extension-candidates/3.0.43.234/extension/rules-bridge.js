(() => {
  // Analytics storage is TRUSTED_CONTEXTS. Ask the worker for only validated rules.
  let disposed = false, inFlight = false, retry = null, failures = 0;
  async function deliver() {
    if (disposed || inFlight) return;
    inFlight = true;
    try {
      const result = await chrome.runtime.sendMessage({ type: 'NEXUS_REQUIREMENT_RULES_GET' });
      if (!result?.ok) throw Error('Rules unavailable');
      if (!disposed) document.dispatchEvent(new CustomEvent('nexus-rules-delivery-v1', { detail: JSON.stringify(result.data) }));
      failures = 0;
    } catch {
      if (!disposed && ++failures <= 3) retry = setTimeout(deliver, 1000 * failures);
    } finally { inFlight = false; }
  }
  document.addEventListener('nexus-rules-request-v1', deliver);
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true; clearTimeout(retry);
    document.removeEventListener('nexus-rules-request-v1', deliver);
  });
  deliver();
})();
