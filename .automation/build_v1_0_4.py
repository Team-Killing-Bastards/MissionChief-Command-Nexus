from pathlib import Path
import re

SOURCE_PATH = Path("src/missionchief-command-nexus.user.js")
source = SOURCE_PATH.read_text(encoding="utf-8")

visibility_replacement = r'''    function getVisibleVehicleListLoadControl() {
        return Array.from(
            document.querySelectorAll(
                'a.btn-warning.missing_vehicles_load, a.missing_vehicles_load'
            )
        ).find(loadControl => {
            if (!loadControl || !loadControl.isConnected) {
                return false;
            }

            const disabled =
                loadControl.hasAttribute('disabled') ||
                loadControl.getAttribute('aria-disabled') === 'true' ||
                loadControl.classList.contains('disabled');

            if (disabled) return false;

            try {
                return isElementVisible(loadControl);
            } catch (_error) {
                try {
                    return getComputedStyle(loadControl).display !== 'none' &&
                        loadControl.getClientRects().length > 0;
                } catch (_innerError) {
                    return true;
                }
            }
        }) || null;
    }

    function getVehicleListLoadControlToken(loadControl) {
        if (!loadControl) return '';

        const href = String(
            loadControl.getAttribute('href') ||
            loadControl.href ||
            ''
        ).trim();

        const text = String(
            loadControl.textContent ||
            loadControl.innerText ||
            ''
        ).replace(/\s+/g, ' ').trim();

        return `${href}|${text}`;
    }

    function isVehicleListLoadControlVisible() {
        return !!getVisibleVehicleListLoadControl();
    }

    function isVehicleListLoadingIndicatorVisible() {'''

source, visibility_count = re.subn(
    r"    function isVehicleListLoadControlVisible\(\) \{.*?\n    \}\n\n    function isVehicleListLoadingIndicatorVisible\(\) \{",
    visibility_replacement,
    source,
    count=1,
    flags=re.S,
)

if visibility_count != 1:
    raise SystemExit(
        f"Expected one load-control helper, replaced {visibility_count}."
    )

loader_replacement = r'''    async function ensureVehicleListLoaded(options = {}) {
        const stableTimeoutMs = Number.isFinite(options.stableTimeoutMs)
            ? Math.max(1500, options.stableTimeoutMs)
            : 10000;

        const stableForMs = Number.isFinite(options.stableForMs)
            ? Math.max(400, options.stableForMs)
            : 1200;

        const loadTimeoutMs = Number.isFinite(options.loadTimeoutMs)
            ? Math.max(5000, options.loadTimeoutMs)
            : 60000;

        const pageProgressTimeoutMs = Number.isFinite(
            options.pageProgressTimeoutMs
        )
            ? Math.max(3000, options.pageProgressTimeoutMs)
            : 15000;

        const minimumSettleMs = Number.isFinite(options.minimumSettleMs)
            ? Math.max(0, options.minimumSettleMs)
            : 800;

        const requireNonZero = options.requireNonZero !== false;
        const missionKeyAtStart = getLocalMissionInstanceKey();
        const loadingStartedAt = Date.now();

        let loadClicked = false;
        let clickedPages = 0;
        let lastCompletedControlToken = '';
        let lastCompletedVehicleSignature = '';
        let loadFailureReason = '';

        while (Date.now() - loadingStartedAt < loadTimeoutMs) {
            const currentMissionKey = getLocalMissionInstanceKey();

            if (
                missionKeyAtStart &&
                currentMissionKey &&
                currentMissionKey !== missionKeyAtStart
            ) {
                loadFailureReason =
                    'mission changed while loading vehicles';
                break;
            }

            const vehicleDisplayBar =
                getVisibleVehicleListLoadControl();

            if (!vehicleDisplayBar) break;

            const beforeSnapshot =
                getVehicleCheckboxListSignature();

            const controlToken =
                getVehicleListLoadControlToken(vehicleDisplayBar);

            // Never fire the same AJAX page twice while MissionChief is still
            // replacing the control. A new href/text token or changed vehicle
            // signature must appear before another click is permitted.
            if (
                controlToken === lastCompletedControlToken &&
                beforeSnapshot.signature ===
                    lastCompletedVehicleSignature
            ) {
                await wait(150);
                continue;
            }

            updateStatusBox(
                `Vehicle display limited. Loading additional vehicle page ${clickedPages + 1}...`
            );

            if (mfDebugEnabled) {
                debugLog(
                    'VEHICLE PAGE LOAD',
                    `Click ${clickedPages + 1} | control=${controlToken || 'unknown'} | before=${beforeSnapshot.signature}`
                );
            }

            invalidateVehicleCheckboxCache();

            let clickIssued = false;

            try {
                vehicleDisplayBar.click();
                clickIssued = true;
            } catch (_error) {}

            if (!clickIssued) {
                clickIssued = realClickForQueueRestart(vehicleDisplayBar);
            }

            if (!clickIssued) {
                loadFailureReason =
                    'limited vehicle control could not be clicked';
                break;
            }

            loadClicked = true;
            clickedPages += 1;

            const pageStartedAt = Date.now();
            let rowProgressSeen = false;
            let controlTransitionSeen = false;
            let lastPageSignature = beforeSnapshot.signature;
            let signatureStableSince = Date.now();
            let pageCompleted = false;

            while (
                Date.now() - pageStartedAt <
                pageProgressTimeoutMs
            ) {
                const pageMissionKey =
                    getLocalMissionInstanceKey();

                if (
                    missionKeyAtStart &&
                    pageMissionKey &&
                    pageMissionKey !== missionKeyAtStart
                ) {
                    loadFailureReason =
                        'mission changed while an additional vehicle page was loading';
                    break;
                }

                invalidateVehicleCheckboxCache();

                const currentSnapshot =
                    getVehicleCheckboxListSignature();

                const currentControl =
                    getVisibleVehicleListLoadControl();

                const currentControlToken =
                    getVehicleListLoadControlToken(currentControl);

                if (
                    currentSnapshot.signature !==
                    lastPageSignature
                ) {
                    lastPageSignature = currentSnapshot.signature;
                    signatureStableSince = Date.now();
                }

                rowProgressSeen =
                    rowProgressSeen ||
                    currentSnapshot.signature !==
                        beforeSnapshot.signature;

                controlTransitionSeen =
                    controlTransitionSeen ||
                    !vehicleDisplayBar.isConnected ||
                    !currentControl ||
                    currentControl !== vehicleDisplayBar ||
                    currentControlToken !== controlToken;

                const pageElapsed = Date.now() - pageStartedAt;
                const signatureStableFor =
                    Date.now() - signatureStableSince;

                const loadingIndicatorVisible =
                    isVehicleListLoadingIndicatorVisible();

                if (
                    rowProgressSeen &&
                    signatureStableFor >= 700 &&
                    !loadingIndicatorVisible
                ) {
                    pageCompleted = true;
                    break;
                }

                if (
                    controlTransitionSeen &&
                    pageElapsed >= 800 &&
                    !loadingIndicatorVisible
                ) {
                    pageCompleted = true;
                    break;
                }

                await wait(150);
            }

            if (loadFailureReason) break;

            if (!pageCompleted) {
                loadFailureReason =
                    `additional vehicle page ${clickedPages} made no confirmed progress`;
                break;
            }

            invalidateVehicleCheckboxCache();

            const completedSnapshot =
                getVehicleCheckboxListSignature();

            lastCompletedControlToken = controlToken;
            lastCompletedVehicleSignature =
                completedSnapshot.signature;

            if (mfDebugEnabled) {
                debugLog(
                    'VEHICLE PAGE LOAD',
                    `Completed page ${clickedPages} | after=${completedSnapshot.signature} | next=${getVehicleListLoadControlToken(getVisibleVehicleListLoadControl()) || 'none'}`
                );
            }

            // Allow MissionChief to install the next offset_page link or remove
            // the final limited-display control before the next loop pass.
            await wait(300);
        }

        const remainingLoadControl =
            getVisibleVehicleListLoadControl();

        if (!loadFailureReason && remainingLoadControl) {
            loadFailureReason =
                'additional vehicle page loading timed out';
        }

        if (loadFailureReason) {
            const failedSnapshot =
                getVehicleCheckboxListSignature();

            updateStatusBox(
                `Vehicle list did not finish loading safely: ${loadFailureReason}.`
            );

            if (mfDebugEnabled) {
                debugLog(
                    'VEHICLE PAGE LOAD',
                    `FAILED | ${loadFailureReason} | pages=${clickedPages} | ${failedSnapshot.signature}`
                );
            }

            return {
                ready: false,
                count: failedSnapshot.boxes.length,
                signature: failedSnapshot.signature,
                elapsed: Date.now() - loadingStartedAt,
                timedOut: true,
                loadClicked,
                clickedPages,
                reason: loadFailureReason
            };
        }

        // The final Load More control can disappear before the last row batch
        // is inserted. Require the full ID signature and table row count to
        // remain unchanged after every offset_page control has gone.
        const stability =
            await waitForVehicleCheckboxListStable(
                stableTimeoutMs,
                stableForMs,
                {
                    minimumWaitMs:
                        loadClicked
                            ? minimumSettleMs
                            : Math.min(minimumSettleMs, 350),
                    requireNonZero
                }
            );

        invalidateVehicleCheckboxCache();

        if (!stability.ready) {
            updateStatusBox(
                `Vehicle list did not finish loading safely (${stability.count} vehicle rows).`
            );

            return {
                ...stability,
                loadClicked,
                clickedPages
            };
        }

        updateStatusBox(
            clickedPages > 0
                ? `All additional vehicle pages loaded and stable (${stability.count} vehicles across ${clickedPages} load${clickedPages === 1 ? '' : 's'}).`
                : `Vehicle list loaded and stable (${stability.count} vehicles).`
        );

        if (mfDebugEnabled) {
            debugLog(
                'VEHICLE PAGE LOAD',
                `READY | pages=${clickedPages} | vehicles=${stability.count} | elapsed=${Date.now() - loadingStartedAt}ms`
            );
        }

        return {
            ...stability,
            loadClicked,
            clickedPages
        };
    }

    async function clickVehicleDisplayBarImmediately() {'''

source, loader_count = re.subn(
    r"    async function ensureVehicleListLoaded\(options = \{\}\) \{.*?\n    \}\n\n    async function clickVehicleDisplayBarImmediately\(\) \{",
    loader_replacement,
    source,
    count=1,
    flags=re.S,
)

if loader_count != 1:
    raise SystemExit(
        f"Expected one ensureVehicleListLoaded function, replaced {loader_count}."
    )

internal_version_count = source.count("V10.6.70")
source = source.replace("V10.6.70", "V10.6.71")

SOURCE_PATH.write_text(source, encoding="utf-8", newline="\n")
print(
    f"Patched visibility={visibility_count}, loader={loader_count}, internal_versions={internal_version_count}"
)
