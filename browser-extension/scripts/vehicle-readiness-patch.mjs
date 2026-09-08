export function patchVehicleReadiness(replace) {
  replace('    async function ensureVehicleListLoaded(options = {}) {', `    async function waitForVehicleNextPageReady(previousSignature, missionKey) {
        const started = Date.now();
        let signature = previousSignature, stableSince = started;
        // Keep the old maximum pause, but stop waiting when the next control
        // is available and the completed page has remained quiet.
        while (Date.now() - started < MF_VEHICLE_NEXT_PAGE_SETTLE_MS) {
            if (getLocalMissionInstanceKey() !== missionKey) return;
            invalidateVehicleListStructureCache();
            const current = getVehicleCheckboxListSignature().signature;
            if (current !== signature) { signature = current; stableSince = Date.now(); }
            if (Date.now() - stableSince >= 400 &&
                getVisibleVehicleListLoadControl() &&
                !isVehicleListLoadingIndicatorVisible()) return;
            await wait(100);
        }
    }
    async function ensureVehicleListLoaded(options = {}) {`);
  replace('            await wait(MF_VEHICLE_NEXT_PAGE_SETTLE_MS);', `            await waitForVehicleNextPageReady(
                completedSnapshot.signature, missionKeyAtStart);`);
}
