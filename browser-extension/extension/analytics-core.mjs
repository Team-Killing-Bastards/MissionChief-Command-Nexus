import { cleanRecord } from './analytics-record.mjs';
export const LIMITS = Object.freeze({ events: 10000, bytes: 8 * 1024 * 1024, age: 7 * 86400000, batch: 500, batchBytes: 550000 });
const kinds = new Set(['mission','activity','session','lifecycle', 'recovery-attempt', 'recovery-result', 'committed-coverage', 'performance', 'status']);
export function cleanEvent(input, at = Date.now()) {
  if (!input || !kinds.has(input.kind) || !/^\d+$/.test(String(input.player || '')) || !Number.isFinite(input.at) || Math.abs(at - input.at) > LIMITS.age) return null;
  const event = { kind: input.kind, player: String(input.player), at: input.at };
  for (const key of ['username', 'missionId', 'missionName', 'category', 'phase', 'stage', 'reason', 'outcome']) {
    if (input[key] != null) event[key] = String(input[key]).replace(/https?:\/\/\S+/g, '[url]').slice(0, key === 'reason' ? 600 : 120);
  }
  for (const key of ['elapsedMs', 'usedHeapBytes', 'selected', 'remaining']) if (Number.isFinite(input[key]) && input[key] >= 0) event[key] = input[key];
  if (['mission','activity','session'].includes(input.kind)) {
    event.record = cleanRecord(input.record);
    if (!event.record || JSON.stringify(event.record).length > 500000) return null;
    if (input.kind === 'mission' && (!/^\d+$/.test(event.record.missionId || '') || !['mission-observed','mission-update','dispatch','mission-completed','mission-credit','transport'].includes(event.record.eventType))) return null;
  }
  return event;
}
export function initialState() { return { schema: 1, events: [], pending: null, dropped: 0, failures: 0, nextAttempt: 0, lastSync: 0, error: '' }; }
const londonFormatter = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'});
export function activityDate(now = Date.now()) { return londonFormatter.format(new Date(now)); }
export function isFresh(event, now = Date.now()) {
  return Number.isFinite(event.queuedAt) && now - event.at <= 120000 &&
    activityDate(event.at) === activityDate(now);
}
export function loggerHealth(state, now = Date.now()) {
  let newestEventAt = 0, oldestQueuedEventAt = 0, freshEventCount = 0;
  for (const event of state.events) {
    newestEventAt = Math.max(newestEventAt,event.at);
    oldestQueuedEventAt = oldestQueuedEventAt ? Math.min(oldestQueuedEventAt,event.at) : event.at;
    if (isFresh(event,now)) freshEventCount++;
  }
  return {newestEventAt,oldestQueuedEventAt,freshEventCount,backlogEventCount:state.events.length-freshEventCount,
    queueDepth:state.events.length,activityDate:activityDate(now)};
}
export function describeDelivery(batch, state, now = Date.now()) {
  const stored=new Map(state.events.map(e=>[e.id,e]));
  return {...batch,telemetry:Object.fromEntries(batch.events.map(e=>{
    const original=stored.get(e.id)||e;
    return [e.id,{isReplay:!isFresh(original,now),queuedAt:original.queuedAt||e.at,uploadedAt:now,activityDate:activityDate(e.at)}];
  })),loggerHealth:loggerHealth(state,now)};
}
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const encoder = new TextEncoder();
export function storedBytes(value) {
  const json = JSON.stringify(value);
  // Conservative for both UTF-16 memory and UTF-8 serialized storage.
  return Math.max(json.length * 2, encoder.encode(json).byteLength);
}
export function boundState(input, now = Date.now()) {
  const state = input?.schema === 1 && Array.isArray(input.events) ? input : initialState();
  state.dropped = Math.max(0, Number(state.dropped) || 0);
  const seen = new Set();
  state.events = state.events.filter(event => {
    const valid = uuidPattern.test(event?.id) && !seen.has(event.id) && cleanEvent(event, now) && uuidPattern.test(event.device) && uuidPattern.test(event.session);
    if (valid) seen.add(event.id); else state.dropped++;
    return valid;
  });
  for (const key of ['pending','priorityPending']) {
    const pending = state[key];
    if (!pending || !uuidPattern.test(pending.id) || !Array.isArray(pending.ids) || !pending.ids.length || pending.ids.length > LIMITS.batch ||
        new Set(pending.ids).size !== pending.ids.length || !Number.isFinite(pending.createdAt) || Math.abs(now - pending.createdAt) > LIMITS.age || pending.ids.some(id => !seen.has(id))) state[key] = null;
  }
  state.deferredPending = (state.deferredPending || []).filter(p=>uuidPattern.test(p?.id) && Array.isArray(p.ids) && p.ids.length &&
    p.ids.length<=LIMITS.batch && new Set(p.ids).size===p.ids.length && p.ids.every(id=>seen.has(id)) && Number.isFinite(p.createdAt) && Math.abs(now-p.createdAt)<=LIMITS.age).slice(-8);
  const pinned = new Set([...(state.pending?.ids || []),...(state.priorityPending?.ids || []),...state.deferredPending.flatMap(p=>p.ids)]);
  const high = e => ['mission','session'].includes(e.kind) || /shortage|stop|fail|error|recover/i.test(`${e.kind} ${e.phase}`);
  const sizes = state.events.map(event => storedBytes(event) + 2);
  let bytes = 4 + sizes.reduce((sum, size) => sum + size, 0), count = state.events.length;
  const removed = new Set();
  // Two linear passes preserve pending batches and oldest-first priority without
  // repeated scans/splices of the entire queue during an extended outage.
  for (const priority of [false, true]) {
    for (let i = 0; i < state.events.length && (count > LIMITS.events || bytes > LIMITS.bytes); i++) {
      const event = state.events[i];
      if (pinned.has(event.id) || high(event) !== priority) continue;
      removed.add(i); bytes -= sizes[i]; count--; state.dropped++;
    }
  }
  if (removed.size) state.events = state.events.filter((_, index) => !removed.has(index));
  return state;
}
export function prepareBatch(state, uuid, now = Date.now()) {
  state.deferredPending ||= [];
  const pinned = new Set([...(state.pending?.ids || []),...(state.priorityPending?.ids || []),...state.deferredPending.flatMap(p=>p.ids)]);
  const fresh = state.events.filter(e => !pinned.has(e.id) && isFresh(e,now));
  if (fresh.length && state.priorityPending && !state.events.some(e=>state.priorityPending.ids.includes(e.id) && isFresh(e,now))) {
    state.deferredPending.push(state.priorityPending);state.priorityPending=null;
    // Bound request descriptors. Evicted requests retain their original events
    // and event IDs in the queue; server event dedup makes re-batching safe.
    if(state.deferredPending.length>8)state.deferredPending.shift();
  }
  if(!state.priorityPending && !fresh.length && (!state.pending || now < (state.pending.nextAttempt || 0))) {
    const index=state.deferredPending.findIndex(p=>now >= (p.nextAttempt || 0));
    if(index>=0){const next=state.deferredPending.splice(index,1)[0];if(state.pending)state.deferredPending.push(state.pending);state.pending=next;}
  }
  // A frozen, unacknowledged backlog request is retained under its original ID.
  // New live traffic has a separate lane, so a failed backlog cannot monopolise it.
  const key = state.priorityPending || fresh.length ? 'priorityPending' : 'pending';
  if (!state[key] && state.events.length) {
    const candidates = key === 'priorityPending' ? fresh.sort((a,b)=>Number(['mission','session'].includes(b.kind))-Number(['mission','session'].includes(a.kind))) : state.events.filter(e=>!pinned.has(e.id));
    let size = 2000; const ids = [], telemetry = {};
    for (const e of candidates.slice(0, LIMITS.batch)) {
      const meta = {isReplay:!isFresh(e,now),queuedAt:e.queuedAt || e.at,uploadedAt:now,activityDate:activityDate(e.at)};
      const bytes = JSON.stringify(e).length + JSON.stringify(meta).length + 100;
      if (ids.length && size + bytes > LIMITS.batchBytes) break;
      ids.push(e.id); telemetry[e.id] = meta; size += bytes;
    }
    if (ids.length) state[key] = { id: uuid(), createdAt: now, ids, telemetry, loggerHealth:loggerHealth(state,now) };
  }
  const pending = state[key];
  if (!pending || now < (pending.nextAttempt || 0)) return null;
  const byId = new Map(state.events.map(e => [e.id, e]));
  if (!pending.telemetry) {
    pending.telemetry = Object.fromEntries(pending.ids.map(id=>{const e=byId.get(id);return [id,
      {isReplay:true,queuedAt:e.queuedAt || e.at,uploadedAt:now,activityDate:activityDate(e.at)}];}));
    pending.loggerHealth = loggerHealth(state,now);
  }
  const batch = { schema: 1, id: pending.id, createdAt: pending.createdAt, events: pending.ids.map(id => {
    const {queuedAt,...event} = byId.get(id); return event;
  }) };
  // Additive envelope metadata keeps each event compatible with strict v1 servers.
  // Legacy pending requests retain the exact v1 identity, creation time and events.
  if (pending.telemetry) { batch.telemetry = pending.telemetry; batch.loggerHealth = pending.loggerHealth; }
  return batch;
}
export function acceptAck(state, batch, reply, now = Date.now()) {
  if (reply?.ok !== true || reply.id !== batch.id || JSON.stringify(reply.eventIds) !== JSON.stringify(batch.events.map(e => e.id))) return false;
  const ids = new Set(batch.events.map(e => e.id));
  state.events = state.events.filter(e => !ids.has(e.id));
  for (const key of ['pending','priorityPending']) if (state[key]?.id === batch.id) state[key] = null;
  state.deferredPending = (state.deferredPending || []).filter(p=>p.id!==batch.id);
  state.lastSync = now; state.failures = 0; state.nextAttempt = 0; state.error = ''; return true;
}
export function retryDelay(failures, random = Math.random) {
  return failures >= 5 ? 900000 : Math.min(300000, 30000 * 2 ** Math.max(0, failures - 1)) + Math.floor(random() * 10000);
}
export function validEndpoint(value) {
  try { const u = new URL(value); return u.origin === 'https://script.google.com' && !u.username && !u.password && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname) && !u.search && !u.hash; } catch { return false; }
}
