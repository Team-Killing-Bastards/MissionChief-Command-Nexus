import fs from 'node:fs';
export function patchPersonnelScanner(replace) {
  replace("    const PERSONNEL_VERSION = '1.3.12';", "    const PERSONNEL_VERSION = '1.3.13';");
  replace('    const PERSONNEL_REGISTER_LAUNCH_GAP_MS = 350;', '    const PERSONNEL_REGISTER_LAUNCH_GAP_MS = 250;');
  replace('    async function runPersonnelRegisterVehicleVerificationPool({',fs.readFileSync('scripts/runtime/personnel-register-reader.js','utf8')+'\n    async function runPersonnelRegisterVehicleVerificationPool({');
  replace(`        let nextLaunchAt = 0;
        let launchChain = Promise.resolve();
        const waitForLaunchSlot = () => {
            const scheduled = launchChain.then(async () => {
                const delay = Math.max(0, nextLaunchAt - Date.now());
                if (delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                nextLaunchAt = Date.now() +
                    PERSONNEL_REGISTER_LAUNCH_GAP_MS;
            });
            launchChain = scheduled.catch(() => {});
            return scheduled;
        };
`, '');
  replace('                        await waitForLaunchSlot();','                        if (PERSONNEL_STATE.stopped) return;');
  replace('    async function personnelFetchDocument(url, timeoutMs = 12000) {',`    async function personnelFetchDocument(url, timeoutMs = 12000) {
        if (PERSONNEL_STATE.registerBuilding && PERSONNEL_STATE.registerReader) {
            return PERSONNEL_STATE.registerReader.read(url, timeoutMs);
        }`);
  replace('        PERSONNEL_STATE.registerBuilding = true;',`        PERSONNEL_STATE.registerBuilding = true;
        const scanStartedAt = Date.now();
        const registerReader = createPersonnelRegisterReader();
        PERSONNEL_STATE.registerReader = registerReader;
        let nextStationPage = null;`);
  replace(`                    const stationPage = await personnelFetchDocument(
                        station.href,
                        14000
                    );`, `                    let result = nextStationPage
                        ? await nextStationPage
                        : await personnelFetchDocument(station.href, 14000).then(page => ({ page }), error => ({ error }));
                    nextStationPage = null;
                    // Long audits and pauses must not reuse an old prefetched
                    // snapshot when deciding whether exact records can be reused.
                    if (result.fetchedAt && Date.now() - result.fetchedAt > 10000) {
                        result = await personnelFetchDocument(station.href, 14000).then(page => ({ page }), error => ({ error }));
                    }
                    // Only one station is prefetched; every GET shares the same
                    // global concurrency and launch limits as exact vehicle reads.
                    if (!PERSONNEL_STATE.stopped && stationIndex + 1 < stations.length) {
                        nextStationPage = personnelFetchDocument(stations[stationIndex + 1].href, 14000)
                            .then(page => ({ page, fetchedAt: Date.now() }), error => ({ error }));
                    }
                    if (result.error) throw result.error;
                    const stationPage = result.page;`);
  replace('                `All station types considered: ${stations.length}`,',`                \`Elapsed: \${((Date.now() - scanStartedAt) / 1000).toFixed(1)} seconds\`,
                \`Read requests: \${registerReader.stats.requests}; server backoffs: \${registerReader.stats.throttled}\`,
                \`All station types considered: \${stations.length}\`,`);
  replace('            PERSONNEL_STATE.running = false;\n            PERSONNEL_STATE.registerBuilding = false;',`            registerReader.cancel();
            if (nextStationPage) await nextStationPage;
            PERSONNEL_STATE.registerReader = null;
            PERSONNEL_STATE.running = false;
            PERSONNEL_STATE.registerBuilding = false;`);
  replace('        if (PERSONNEL_STATE.activeController) {',`        PERSONNEL_STATE.registerReader?.cancel();
        if (PERSONNEL_STATE.activeController) {`,2);
}
