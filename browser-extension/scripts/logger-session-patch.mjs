export function patchLoggerSession(replace) {
  replace("  const recent = new Map(), tabId = crypto.randomUUID();", `  const recent = new Map(), tabId = crypto.randomUUID();
  let activitySession = crypto.randomUUID(), activityDate = '';
  const londonFormatter = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'});
  const londonDate = () => londonFormatter.format(new Date());
  function refreshActivitySession() {
    const day = londonDate();
    if (activityDate === day) return;
    activityDate = day; activitySession = crypto.randomUUID();
    registry = {}; recent.clear(); lastSession = ''; lastPage = ''; lastHeartbeat = 0;
  }`, 2);
  replace("    if (player === id) return;", "    refreshActivitySession();\n    if (player === id) return;", 2);
  replace("    try { const raw = localStorage.getItem('nexus-full-missions-v1:' + id); if (raw?.length < 2000000) registry = JSON.parse(raw) || {}; } catch {}", `    // Persisted timestamps are historical evidence, not current observation or
    // deduplication authority. The live mission list repopulates this session.
    activitySession = crypto.randomUUID(); lastPage = ''; lastHeartbeat = 0;`, 2);
  replace("    const record = cleanRecord(raw); if (!record) return false;", "    const record = cleanRecord(raw); if (!record) return false;\n    const capturedAt = Date.now();", 2);
  replace("      const now = new Date().toISOString();", "      const now = new Date(capturedAt).toISOString();", 2);
  replace("      const mini = { ...old, ...record, seenAt: Date.now() };", "      const mini = { ...old, ...record, seenAt: capturedAt };", 2);
  replace("    window.dispatchEvent(new CustomEvent('nexus-analytics-event-v1', { detail: JSON.stringify({ kind, ...who, at: Date.now(), missionId: record.missionId, missionName: record.missionName, record }) }));", `    // Observation identity is daily; completion and credit identities describe
    // a single game lifecycle, independent of reloads, devices or queue retries.
    let eventKey = '';
    if (kind === 'mission') {
      const type = record.eventType;
      const detail = type === 'mission-observed' ? activityDate :
        type === 'mission-completed' ? '' :
        type === 'mission-credit' ? record.transactionId || '' :
        type === 'mission-update' ? JSON.stringify([activityDate,record.requirements,record.patientCount,record.prisonerCount,record.advertisedCredits]) :
        JSON.stringify([Math.floor(capturedAt/15000),record.units?.map(u=>u.vehicleId).sort(),record.patientId,record.vehicleId,record.targetHref]);
      eventKey = JSON.stringify([who.player,record.missionId,type,detail]);
    }
    window.dispatchEvent(new CustomEvent('nexus-analytics-event-v1', { detail: JSON.stringify({ kind, ...who, at: capturedAt, activityDate, activitySession, eventKey, missionId: record.missionId, missionName: record.missionName, record }) }));`, 2);
  replace("      if (offset < ids.length) later(chunk,500); else scanning = false;", "      if (offset < ids.length) later(chunk,25); else scanning = false;", 2);
  replace("    if (active()) {\n      const auto=isAuto();", "    if (active()) {\n      refreshActivitySession();\n      const auto=isAuto();", 2);
  replace("snapshot:()=>({installed:true,enabled:active(),captured:{...captured},lastError,role:topFrame?'map-owner':'mission-worker'})", "snapshot:()=>({installed:true,enabled:active(),captured:{...captured},activityDate,activitySession,lastError,role:topFrame?'map-owner':'mission-worker'})", 2);
  replace("    listen(window,'storage',e=>{if(e.key==='nexus-full-missions-v1:'+player && e.newValue?.length<2000000){try{const updates=JSON.parse(e.newValue);for(const [id,r]of Object.entries(updates))if(r.seenAt>(registry[id]?.seenAt||0))registry[id]=r;prune();}catch{}}});", "    // Other tabs' persisted lifecycle timestamps cannot replace this live session.", 2);
}
