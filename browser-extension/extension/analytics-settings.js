const el = id => document.getElementById(id);
async function status(populate = false) {
  const result = await chrome.runtime.sendMessage({ type: 'NEXUS_ANALYTICS_STATUS' });
  if (!result?.ok) { el('sync-status').textContent = result?.error || 'Could not load settings'; return; }
  if (populate) el('enabled').checked = result.enabled;
  el('sync-status').textContent = !result.enabled ? 'Automatic sharing paused' : !result.configured
    ? 'Waiting for the owner to connect this build to Google. Events are queued locally.'
    : result.error || 'Automatic Google Sheet sharing enabled';
  el('retry').disabled = !result.enabled || !result.configured || !result.queued;
  el('retry-status').textContent = result.nextAttempt > Date.now() ? 'Next automatic retry: ' + new Date(result.nextAttempt).toLocaleTimeString() : '';
  el('queue').textContent = `${result.queued} queued · ${Math.round(result.bytes / 1024)} KiB · ${result.dropped} expired/dropped · Oldest queued: ${result.oldestQueuedAt ? Math.max(0,Math.round((Date.now()-result.oldestQueuedAt)/1000))+'s' : 'None'} · Last upload: ${result.lastSync ? new Date(result.lastSync).toLocaleString() : 'None'}`;
}
el('settings').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const result = await chrome.runtime.sendMessage({ type: 'NEXUS_ANALYTICS_SETTINGS', enabled: el('enabled').checked });
    if (!result?.ok) throw Error(result?.error || 'Could not save');
    await status();
  } catch (error) { el('sync-status').textContent = error.message; }
});
void status(true);
setInterval(() => { void status(); }, 5000);

el('retry').addEventListener('click', async () => {
  el('retry').disabled = true;
  try {
    const result = await chrome.runtime.sendMessage({ type: 'NEXUS_ANALYTICS_RETRY' });
    if (!result?.ok) throw Error(result?.error || 'Retry could not start');
    el('sync-status').textContent = 'Retry requested. The pending batch stays queued until Google acknowledges it.';
    el('retry-status').textContent = '';
  } catch (error) { el('sync-status').textContent = error.message; }
});
