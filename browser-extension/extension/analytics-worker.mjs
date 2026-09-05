import { RULES_KEY, validateRules, DOG_RULE_MIGRATION_KEY, repairLegacySearchDogRule } from './rules-core.mjs';
import { cleanEvent, boundState, storedBytes, prepareBatch, acceptAck, retryDelay, validEndpoint } from './analytics-core.mjs';
import { GOOGLE_ENDPOINT } from './deployment-config.mjs';
const KEY = 'nexusAnalyticsV1', SETTINGS = 'nexusAnalyticsSettingsV1';
let serial = Promise.resolve(), uploading = false, abortUpload = null, sharingRevision = 0;
const locked = task => { const work = serial.then(task); serial = work.catch(() => {}); return work; };
async function ensureSearchDogRuleRepair() {
  return locked(() => navigator.locks.request('nexus-requirement-rules', async () => {
    const saved = await chrome.storage.local.get([RULES_KEY, DOG_RULE_MIGRATION_KEY]);
    if (saved[DOG_RULE_MIGRATION_KEY]) return;
    const data = repairLegacySearchDogRule(saved[RULES_KEY] || {schema: 1, rules: []});
    await chrome.storage.local.set({[RULES_KEY]: data, [DOG_RULE_MIGRATION_KEY]: true});
  }));
}
const origins = ['https://script.google.com/*', 'https://script.googleusercontent.com/*'];
const readState = async () => {
  const saved = (await chrome.storage.local.get(KEY))[KEY];
  const previous = saved && { count: saved.events?.length, dropped: saved.dropped, pending: JSON.stringify(saved.pending) };
  const state = boundState(saved);
  // Expired records must leave storage, including when sharing is paused;
  // merely hiding them in the status response is not retention enforcement.
  if (previous && (previous.count !== state.events.length || previous.dropped !== state.dropped || previous.pending !== JSON.stringify(state.pending))) await writeState(state);
  return state;
};
const writeState = state => chrome.storage.local.set({ [KEY]: state });
async function settings() {
  const saved = (await chrome.storage.local.get(SETTINGS))[SETTINGS];
  // The destination belongs to the build. Legacy passwords/endpoints are ignored.
  return { enabled: saved?.enabled === true, endpoint: GOOGLE_ENDPOINT };
}
async function ensureAlarm() { await chrome.alarms.create('nexus-analytics', { periodInMinutes: 1 }); }
async function uploadOne() {
  if (uploading) return;
  uploading = true;
  const startedSharingRevision = sharingRevision;
  let batch, config, timedOut = false;
  try {
    config = await settings();
    if (!config.enabled || !validEndpoint(config.endpoint)) return;
    if (!await chrome.permissions.contains({ origins })) throw Error('Google connection permission is missing');
    batch = await locked(async () => {
      const state = await readState();
      if (Date.now() < state.nextAttempt) return null;
      const next = prepareBatch(state, () => crypto.randomUUID());
      await writeState(state); return next;
    });
    if (!batch) return;
    // A pause can arrive while storage/permission checks are awaiting. Recheck
    // immediately before sending, even if the user has since re-enabled sharing.
    if (!(await settings()).enabled || startedSharingRevision !== sharingRevision) return;
    abortUpload = new AbortController();
    const timer = setTimeout(() => { timedOut = true; abortUpload?.abort(); }, 20000);
    let reply;
    try {
      const response = await fetch(config.endpoint, { method: 'POST', redirect: 'follow', credentials: 'omit',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(batch), signal: abortUpload.signal });
      if (!response.ok) throw Error(`Google returned HTTP ${response.status}`);
      const text = await response.text();
      if (text.length > 40000) throw Error('Unexpected Google response');
      reply = JSON.parse(text);
    } finally { clearTimeout(timer); abortUpload = null; }
    await locked(async () => {
      const state = await readState();
      if (!acceptAck(state, batch, reply)) throw Error(['BUSY', 'CONFLICT', 'BACKEND', 'SHEET', 'VERIFY', 'SCHEMA', 'SIZE'].includes(reply?.error) ? `Google: ${reply.error}` : 'Google acknowledgement did not match the pending batch');
      await writeState(state);
    });
    return true;
  } catch (error) {
    await locked(async () => {
      const state = await readState();
      state.failures = (Number(state.failures) || 0) + 1;
      state.nextAttempt = Date.now() + (timedOut ? 60000 : retryDelay(state.failures));
      // Do not persist request URLs, tokens or provider HTML.
      state.error = String(timedOut ? 'Google response timed out after 20 seconds; batch retained for retry' : (error?.message || 'Upload failed')).replace(/https?:\/\/\S+/g, '[url]').slice(0, 160);
      await writeState(state);
    }).catch(() => {});
    return false;
  } finally { uploading = false; }
}
let draining = false;
async function upload() {
  if (draining) return;
  draining = true;
  const started = Date.now();
  try { for (let n = 0; n < 8 && Date.now() - started < 60000; n++) if (!await uploadOne()) break; }
  finally { draining = false; }
}
function gameSender(sender) {
  try { return sender.frameId === 0 && sender.tab && ['https://www.missionchief.co.uk', 'https://police.missionchief.co.uk'].includes(new URL(sender.url).origin); } catch { return false; }
}
function settingsSender(sender) { return sender.url === chrome.runtime.getURL('analytics.html'); }
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type === 'NEXUS_REQUIREMENT_RULES_GET') {
    let allowed = false;
    try { allowed = !!sender.tab && ['https://www.missionchief.co.uk', 'https://police.missionchief.co.uk'].includes(new URL(sender.url).origin); } catch {}
    if (!allowed) return false;
    ensureSearchDogRuleRepair().then(() => chrome.storage.local.get(RULES_KEY)).then(saved => ({ ok: true, data: validateRules(saved[RULES_KEY] || { schema: 1, rules: [] }) }))
      .then(reply, () => reply({ ok: false }));
    return true;
  }

  if (message?.type === 'NEXUS_ANALYTICS_CAPTURE' && gameSender(sender)) {
    locked(async () => {
      const state = await readState();
      const config = await settings();
      // Sharing requires an explicit saved choice; dispatch is independent.
      if (!config.enabled) return { ok: true, disabled: true };
      const meta = (await chrome.storage.local.get('nexusDevice')).nexusDevice || crypto.randomUUID();
      await chrome.storage.local.set({ nexusDevice: meta });
      for (const raw of (Array.isArray(message.events) ? message.events : []).slice(0, 30)) {
        const event = cleanEvent(raw);
        if (event && /^[a-f0-9-]{36}$/i.test(String(raw.id)) && /^[a-f0-9-]{36}$/i.test(String(raw.session))) state.events.push({ ...event, id: raw.id, session: raw.session, device: meta });
      }
      await writeState(boundState(state)); return { ok: true };
    }).then(result => { reply(result); if (!result.disabled) void upload(); }, () => reply({ ok: false, error: 'Local queue could not be saved' }));
    return true;
  }
  if (!settingsSender(sender)) return false;
  if (message?.type === 'NEXUS_ANALYTICS_RETRY') {
    locked(async () => {
      const config = await settings();
      if (!config.enabled) return { ok: false, error: 'Enable sharing before retrying' };
      const state = await readState();
      state.nextAttempt = 0; state.failures = 0;
      await writeState(state); return { ok: true };
    }).then(result => { reply(result); if (result.ok) void upload(); }, () => reply({ ok: false, error: 'Could not schedule retry' }));
    return true;
  }
  if (message?.type === 'NEXUS_ANALYTICS_STATUS') {
    locked(async () => {
      const state = await readState(), config = await settings();
      return { ok: true, enabled: config.enabled, configured: validEndpoint(config.endpoint),
        queued: state.events.length, bytes: storedBytes(state.events), dropped: state.dropped,
        oldestQueuedAt: state.events[0]?.at || 0, lastSync: state.lastSync, nextAttempt: state.nextAttempt, error: state.error };
    }).then(reply, () => reply({ ok: false, error: 'Local settings unavailable' })); return true;
  }
  if (message?.type === 'NEXUS_ANALYTICS_SETTINGS') {
    if (typeof message.enabled !== 'boolean') { reply({ ok: false, error: 'Choose whether to enable sharing' }); return false; }
    sharingRevision++;
    if (!message.enabled) abortUpload?.abort();
    locked(async () => {
      await chrome.storage.local.set({ [SETTINGS]: { enabled: message.enabled === true } });
      return { ok: true };
    }).then(result => { reply(result); void upload(); }, error => reply({ ok: false, error: error.message })); return true;
  }
  return false;
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'nexus-analytics') void locked(async () => { await readState(); }).then(upload).catch(() => {});
});
chrome.runtime.onInstalled.addListener(details => {
  void ensureAlarm().catch(() => {});
  void ensureSearchDogRuleRepair().catch(() => {});
  if (details.reason === 'install') void chrome.tabs.create({ url: chrome.runtime.getURL('analytics.html') }).catch(() => {});
});
chrome.runtime.onStartup.addListener(() => { void ensureAlarm().catch(() => {}); });
// Keep the durable queue and device identity restricted to extension contexts.
void chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch(() => {});
void ensureAlarm().catch(() => {});
