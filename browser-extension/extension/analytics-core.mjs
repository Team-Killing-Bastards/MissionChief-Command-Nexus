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
  if (!state.pending || !uuidPattern.test(state.pending.id) || !Array.isArray(state.pending.ids) || !state.pending.ids.length || state.pending.ids.length > LIMITS.batch ||
      new Set(state.pending.ids).size !== state.pending.ids.length || !Number.isFinite(state.pending.createdAt) || Math.abs(now - state.pending.createdAt) > LIMITS.age || state.pending.ids.some(id => !seen.has(id))) state.pending = null;
  const pinned = new Set(state.pending?.ids || []);
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
  if (!state.pending && state.events.length) {
    let size = 200; const ids = [];
    for (const e of state.events.slice(0, LIMITS.batch)) {
      const bytes = JSON.stringify(e).length + 1;
      if (ids.length && size + bytes > LIMITS.batchBytes) break;
      ids.push(e.id); size += bytes;
    }
    state.pending = { id: uuid(), createdAt: now, ids };
  }
  if (!state.pending) return null;
  const byId = new Map(state.events.map(e => [e.id, e]));
  return { schema: 1, id: state.pending.id, createdAt: state.pending.createdAt, events: state.pending.ids.map(id => byId.get(id)) };
}
export function acceptAck(state, batch, reply, now = Date.now()) {
  if (reply?.ok !== true || reply.id !== batch.id || JSON.stringify(reply.eventIds) !== JSON.stringify(batch.events.map(e => e.id))) return false;
  const ids = new Set(batch.events.map(e => e.id));
  state.events = state.events.filter(e => !ids.has(e.id)); state.pending = null;
  state.lastSync = now; state.failures = 0; state.nextAttempt = 0; state.error = ''; return true;
}
export function retryDelay(failures, random = Math.random) {
  return failures >= 5 ? 900000 : Math.min(300000, 30000 * 2 ** Math.max(0, failures - 1)) + Math.floor(random() * 10000);
}
export function validEndpoint(value) {
  try { const u = new URL(value); return u.origin === 'https://script.google.com' && !u.username && !u.password && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname) && !u.search && !u.hash; } catch { return false; }
}
