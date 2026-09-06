// Per-page probe: only a completed worker recycle starts the observation window.
let nexusMemoryRecycleProbe = null;
function nexusPersistentHeapRecoveryDue(now = Date.now()) {
    const heap = controllerUsedHeapBytes();
    if (!Number.isFinite(heap) || heap < 768 * 1048576) {
        nexusMemoryRecycleProbe = null;
        return false;
    }
    const lastRefresh = Number(sessionGet('nexus_memory_refresh_at_v1')) || 0;
    return Boolean(nexusMemoryRecycleProbe && heap >= 1024 * 1048576 &&
        now - nexusMemoryRecycleProbe.at >= 60000 &&
        now - lastRefresh >= 600000);
}
function nexusMemoryRefreshAllowed(now = Date.now()) {
    const last = Number(sessionGet('nexus_memory_refresh_at_v1')) || 0;
    return !last || (now >= last && now - last >= 600000);
}
function nexusSaveVerifiedResume(url) {
    persistResumeMission(url);
    saveRunContinuity();
    try {
        const saved = JSON.parse(sessionGet(SESSION_CONTINUITY));
        return sessionGet(SESSION_RESUME_MISSION) === url &&
            saved.runStartedAt === state.runStartedAt &&
            saved.nativeMissionAdvances === state.nativeMissionAdvances &&
            saved.runtimeRecycles === state.runtimeRecycles;
    } catch { return false; }
}
