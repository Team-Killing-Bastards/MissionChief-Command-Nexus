/* Read-only connection badges. No network probes or register scans. */
(() => {
 'use strict';
 if (window !== window.top || location.pathname !== '/') return;
 let busy = false, stopped = false;
 const root = () => document.getElementById('mcn-v3-map-controller');
 function badge(node, text, state, hint) {
  if (!node) return;
  if (node.textContent !== text) node.textContent = text;
  if (node.dataset.state !== state) node.dataset.state = state;
  node.title = hint; node.setAttribute('aria-label', text + '. ' + hint);
 }
 async function refresh() {
  const panel = root();
  if (stopped || busy || document.hidden || !panel || panel.dataset.collapsed === 'true') return;
  busy = true;
  try {
   const [feed, account] = await Promise.allSettled([
    chrome.runtime.sendMessage({type:'NEXUS_COLLECTOR_HEALTH'}),
    chrome.runtime.sendMessage({type:'NEXUS_ACCOUNT_STATUS'})
   ]);
   if (stopped || panel !== root()) return;
   const f = feed.status === 'fulfilled' && feed.value?.ok ? feed.value : null;
   const a = account.status === 'fulfilled' && account.value?.ok ? account.value : null;
   const api = panel.querySelector('[data-nexus-feed]'), discord = panel.querySelector('[data-nexus-discord]');
   if (!navigator.onLine) badge(api, 'API offline', 'error', 'Browser is offline. Saved observations will upload when the connection returns.');
   else if (!f) badge(api, 'API unknown', 'unknown', 'Connection status unavailable. Reload MissionChief after updating Nexus.');
   else if (f.enabled === false) badge(api, 'API paused', 'unknown', 'Gameplay reporting is switched off.');
   else if (f.uploadError ?? f.lastError) badge(api, 'API attention', 'error', String(f.uploadError ?? f.lastError).slice(0,250));
   else if (f.captureState?.paused || f.captureState?.saveError) badge(api, 'Recording delayed', 'error', 'Local recording is currently ' + (f.captureState.paused ? 'paused while its queue drains.' : 'waiting for a successful local save.') + ' Queued: ' + f.captureState.queued);
   else if (!f.paired) badge(api, 'API waiting', 'waiting', 'Waiting for this player’s automatic collector registration.');
   else if (f.lastSuccess > Date.now() - 20 * 60000) badge(api, f.uploading ? 'API sending' : 'API feed', 'ok', 'Last confirmed upload: ' + new Date(f.lastSuccess).toLocaleTimeString() + '. Pending observations: ' + (Number(f.pending)||0));
   else badge(api, f.uploading ? 'API sending' : 'API waiting', 'waiting', f.lastSuccess ? 'No confirmed upload in the last 20 minutes. This can be normal when idle.' : 'Waiting for the first confirmed upload.');
   if (f?.captureWarning && api) api.title += ' Previous recording warning: ' + String(f.captureWarning).slice(0,250);
   if (!a) badge(discord, 'Discord unknown', 'unknown', 'Open Nexus Tools to check your account.');
   else if (a.signedIn) badge(discord, 'Discord signed in', 'ok', 'Signed in as ' + a.username + (a.enabled ? '. Sync enabled.' : '. Sync paused.') + ' Open Nexus Tools.');
   else badge(discord, 'Discord sign in', 'waiting', 'Open Nexus Tools → Overview to sign in.');
  } catch {
   badge(panel.querySelector('[data-nexus-feed]'), 'API unknown', 'unknown', 'Reload MissionChief after updating Nexus.');
   badge(panel.querySelector('[data-nexus-discord]'), 'Discord unknown', 'unknown', 'Reload MissionChief after updating Nexus.');
  } finally { busy = false; }
 }
 window.addEventListener('nexus:connection-status-request', refresh);
 window.addEventListener('focus', refresh);
 window.addEventListener('online', refresh);
 window.addEventListener('offline', refresh);
 document.addEventListener('visibilitychange', refresh);
 chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.nexusDiscordAccountV1) void refresh(); });
 const timer = setInterval(refresh, 30000), initial = setTimeout(refresh, 2000);
 window.addEventListener('pagehide', () => { stopped = true; clearInterval(timer); clearTimeout(initial); }, {once:true});
})();
