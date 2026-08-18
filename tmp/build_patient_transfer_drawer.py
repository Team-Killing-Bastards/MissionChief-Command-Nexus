from pathlib import Path

SOURCE_PATH = Path('src/missionchief-command-nexus.user.js')
source = SOURCE_PATH.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


source = replace_once(
    source,
    '// @version      1.1.6',
    '// @version      1.1.7',
    'userscript version',
)
source = replace_once(
    source,
    'MODULE 2: MISSION FINDER V10.7.4',
    'MODULE 2: MISSION FINDER V10.7.5',
    'Mission Finder version',
)

source = replace_once(
    source,
    """    const MF_BACKGROUND_PATIENT_TRANSPORT_RECENT_KEY =
        'mf_background_patient_transport_recent_v1';
""",
    """    const MF_BACKGROUND_PATIENT_TRANSPORT_RECENT_KEY =
        'mf_background_patient_transport_recent_v1';
    const MF_BACKGROUND_PATIENT_TRANSPORT_FAILURE_LOG_KEY =
        'mf_background_patient_transport_failure_log_v1';
    const MF_PATIENT_TRANSFER_COLLAPSED_KEY =
        'mf_patient_transfer_collapsed_v1';
""",
    'patient transport storage keys',
)

source = replace_once(
    source,
    """    const MF_BACKGROUND_PATIENT_TRANSPORT_MAX_QUEUE = 40;
    const MF_BACKGROUND_PATIENT_TRANSPORT_MAX_ATTEMPTS = 3;
""",
    """    const MF_BACKGROUND_PATIENT_TRANSPORT_MAX_QUEUE = 40;
    const MF_BACKGROUND_PATIENT_TRANSPORT_MAX_ATTEMPTS = 3;
    const MF_BACKGROUND_PATIENT_TRANSPORT_FAILURE_LOG_LIMIT = 10;
""",
    'patient transport bounds',
)

source = replace_once(
    source,
    """    let mfBackgroundPatientTransportEnabled =
        localStorage.getItem(
            MF_BACKGROUND_PATIENT_TRANSPORT_ENABLED_KEY
        ) === 'true';
    let mfBackgroundPatientTransportWorkerTimer = null;
""",
    """    let mfBackgroundPatientTransportEnabled =
        localStorage.getItem(
            MF_BACKGROUND_PATIENT_TRANSPORT_ENABLED_KEY
        ) === 'true';
    let mfPatientTransferCollapsed =
        localStorage.getItem(
            MF_PATIENT_TRANSFER_COLLAPSED_KEY
        ) !== 'false';
    let mfBackgroundPatientTransportWorkerTimer = null;
""",
    'patient drawer collapse state',
)

source = replace_once(
    source,
    """            lastAttemptAt: 0,
            lastSuccessAt: 0,
            totalSent: 0
        };
""",
    """            lastAttemptAt: 0,
            lastSuccessAt: 0,
            totalSent: 0,
            totalFailed: 0,
            runStartedAt: 0,
            runCompleted: 0,
            runFailed: 0
        };
""",
    'patient transport state counters',
)

helpers = r'''    function readBackgroundPatientTransportFailureLog() {
        try {
            const parsed = JSON.parse(
                localStorage.getItem(
                    MF_BACKGROUND_PATIENT_TRANSPORT_FAILURE_LOG_KEY
                ) || '[]'
            );
            return Array.isArray(parsed)
                ? parsed.filter(entry => {
                    return !!(
                        entry &&
                        typeof entry === 'object' &&
                        Number(entry.timestamp || 0) > 0
                    );
                }).slice(
                    0,
                    MF_BACKGROUND_PATIENT_TRANSPORT_FAILURE_LOG_LIMIT
                )
                : [];
        } catch (_error) {
            return [];
        }
    }

    function writeBackgroundPatientTransportFailureLog(entries) {
        const bounded = (
            Array.isArray(entries) ? entries : []
        ).filter(entry => {
            return !!(
                entry &&
                typeof entry === 'object' &&
                Number(entry.timestamp || 0) > 0
            );
        }).slice(
            0,
            MF_BACKGROUND_PATIENT_TRANSPORT_FAILURE_LOG_LIMIT
        );

        localStorage.setItem(
            MF_BACKGROUND_PATIENT_TRANSPORT_FAILURE_LOG_KEY,
            JSON.stringify(bounded)
        );
        renderBackgroundPatientTransferDrawer();
        return bounded;
    }

    function clearBackgroundPatientTransportFailureLog() {
        localStorage.removeItem(
            MF_BACKGROUND_PATIENT_TRANSPORT_FAILURE_LOG_KEY
        );
        renderBackgroundPatientTransferDrawer();
    }

    function appendBackgroundPatientTransportAttemptHistory(
        entry,
        attempt,
        reason
    ) {
        const history = Array.isArray(entry?.attemptHistory)
            ? entry.attemptHistory.slice(-2)
            : [];
        history.push({
            timestamp: Date.now(),
            attempt: Math.max(1, Number(attempt) || 1),
            reason: String(
                reason ||
                'Background patient transport attempt failed.'
            ).slice(0, 300)
        });
        return history.slice(-3);
    }

    function recordBackgroundPatientTransportTerminalFailure(
        entry,
        attempts,
        reason,
        attemptHistory
    ) {
        const failures =
            readBackgroundPatientTransportFailureLog();
        failures.unshift({
            timestamp: Date.now(),
            vehicleId: String(entry?.vehicleId || ''),
            patientId: String(entry?.patientId || ''),
            routeKey: String(entry?.routeKey || ''),
            attempts: Math.max(1, Number(attempts) || 1),
            reason: String(
                reason ||
                'Patient transport failed after three attempts.'
            ).slice(0, 300),
            attemptHistory: Array.isArray(attemptHistory)
                ? attemptHistory.slice(-3)
                : []
        });
        writeBackgroundPatientTransportFailureLog(failures);

        const state = readBackgroundPatientTransportState();
        writeBackgroundPatientTransportState({
            totalFailed:
                Math.max(
                    0,
                    Number(state.totalFailed || 0)
                ) + 1,
            runFailed:
                Math.max(
                    0,
                    Number(state.runFailed || 0)
                ) + 1
        });
    }

    function resetBackgroundPatientTransportRunStats(
        reason = ''
    ) {
        writeBackgroundPatientTransportState({
            runStartedAt: Date.now(),
            runCompleted: 0,
            runFailed: 0,
            lastMessage: String(reason || '').slice(0, 200),
            lastError: ''
        });
    }

    function formatBackgroundPatientTransportClock(timestamp) {
        const value = Number(timestamp || 0);
        if (!(value > 0)) return '—';
        try {
            return new Date(value).toLocaleTimeString(
                'en-GB',
                {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }
            );
        } catch (_error) {
            return '—';
        }
    }

    function renderBackgroundPatientTransferDrawer() {
        const panel = document.getElementById(
            'patient-transfer-list-box'
        );
        if (!panel) return;

        const queue = readBackgroundPatientTransportQueue();
        const state = readBackgroundPatientTransportState();
        const failures =
            readBackgroundPatientTransportFailureLog();
        const queueCount = queue.length;
        const runCompleted = Math.max(
            0,
            Number(state.runCompleted || 0)
        );
        const runFailed = Math.max(
            0,
            Number(state.runFailed || 0)
        );
        const label = !mfBackgroundPatientTransportEnabled
            ? 'Off'
            : mfBackgroundPatientTransportWorkerActive
                ? 'Sending'
                : state.status === 'failed'
                    ? 'Failed'
                    : state.status === 'retrying'
                        ? 'Retrying'
                        : queueCount > 0
                            ? 'Queued'
                            : state.status === 'sent'
                                ? 'Sent'
                                : 'Watching';

        const setText = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = String(value ?? '');
            }
        };

        setText('mf-patient-pending-count', queueCount);
        setText('mf-patient-completed-count', runCompleted);
        setText('mf-patient-failed-count', runFailed);
        setText(
            'mf-patient-last-success',
            formatBackgroundPatientTransportClock(
                state.lastSuccessAt
            )
        );

        const title = document.getElementById(
            'mf-patient-title'
        );
        if (title) {
            if (
                panel.classList.contains(
                    'mf2026-patient-collapsed'
                )
            ) {
                title.textContent =
                    !mfBackgroundPatientTransportEnabled
                        ? 'Patients Off'
                        : runFailed > 0
                            ? `Patients ⚠${runFailed}`
                            : `Patients ${queueCount}`;
            } else {
                title.textContent = 'Patient Transfers';
            }
        }

        const statusElement = document.getElementById(
            'mf-patient-worker-status'
        );
        if (statusElement) {
            const detail = state.lastError ||
                state.lastMessage ||
                (
                    mfBackgroundPatientTransportEnabled
                        ? 'Waiting for a Transport Patient request.'
                        : 'Background patient transports are disabled.'
                );
            statusElement.textContent = `${label} · ${detail}`;
            statusElement.classList.toggle(
                'mf2026-good',
                label === 'Sent' || label === 'Watching'
            );
            statusElement.classList.toggle(
                'mf2026-warn',
                label === 'Failed' || label === 'Retrying'
            );
        }

        const queueContent = document.getElementById(
            'mf-patient-queue-content'
        );
        if (queueContent) {
            queueContent.replaceChildren();
            if (!queue.length) {
                const empty = document.createElement('div');
                empty.textContent = 'No patient transfers waiting.';
                queueContent.appendChild(empty);
            } else {
                const now = Date.now();
                queue.slice(0, 10).forEach((entry, index) => {
                    const item = document.createElement('div');
                    item.className = 'mf-patient-queue-item';
                    const attempts = Math.max(
                        0,
                        Number(entry.attempts || 0)
                    );
                    const dueIn = Math.max(
                        0,
                        Math.ceil(
                            (
                                Number(entry.nextAttemptAt || 0) -
                                now
                            ) / 1000
                        )
                    );
                    const phase =
                        index === 0 &&
                        mfBackgroundPatientTransportWorkerActive
                            ? 'Sending'
                            : attempts > 0
                                ? `Retry ${Math.min(
                                    attempts + 1,
                                    MF_BACKGROUND_PATIENT_TRANSPORT_MAX_ATTEMPTS
                                )}/${MF_BACKGROUND_PATIENT_TRANSPORT_MAX_ATTEMPTS}`
                                : 'Waiting';
                    const waitText =
                        attempts > 0 && dueIn > 0
                            ? ` · next in ${dueIn}s`
                            : '';
                    item.textContent =
                        `Patient ${entry.patientId || '?'} · ` +
                        `Vehicle ${entry.vehicleId || '?'} · ` +
                        `${phase}${waitText}`;
                    queueContent.appendChild(item);
                });
            }
        }

        const failureContent = document.getElementById(
            'mf-patient-failure-content'
        );
        if (failureContent) {
            failureContent.replaceChildren();
            if (!failures.length) {
                const empty = document.createElement('div');
                empty.textContent = 'No terminal failures recorded.';
                failureContent.appendChild(empty);
            } else {
                failures.forEach(failure => {
                    const item = document.createElement('div');
                    item.className = 'mf-patient-failure-item';

                    const heading = document.createElement('div');
                    heading.className =
                        'mf-patient-failure-heading';
                    heading.textContent =
                        `${formatBackgroundPatientTransportClock(
                            failure.timestamp
                        )} · Patient ${failure.patientId || '?'} · ` +
                        `Vehicle ${failure.vehicleId || '?'}`;
                    item.appendChild(heading);

                    const reason = document.createElement('div');
                    reason.textContent =
                        `Failed after ${Math.max(
                            1,
                            Number(failure.attempts || 1)
                        )}/${MF_BACKGROUND_PATIENT_TRANSPORT_MAX_ATTEMPTS} attempts · ` +
                        `${failure.reason || 'Unknown failure.'}`;
                    item.appendChild(reason);

                    const attemptHistory = Array.isArray(
                        failure.attemptHistory
                    )
                        ? failure.attemptHistory
                        : [];
                    attemptHistory.forEach(attempt => {
                        const attemptLine =
                            document.createElement('div');
                        attemptLine.className =
                            'mf-patient-failure-attempt';
                        attemptLine.textContent =
                            `Attempt ${Math.max(
                                1,
                                Number(attempt.attempt || 1)
                            )}/${MF_BACKGROUND_PATIENT_TRANSPORT_MAX_ATTEMPTS} · ` +
                            `${attempt.reason || 'Unknown failure.'}`;
                        item.appendChild(attemptLine);
                    });
                    failureContent.appendChild(item);
                });
            }
        }

        const clearButton = document.getElementById(
            'mf-patient-clear-failures'
        );
        if (clearButton) {
            clearButton.disabled = failures.length === 0;
        }
    }

'''

source = replace_once(
    source,
    """    function normaliseBackgroundPatientTransportRequest(
""",
    helpers + """    function normaliseBackgroundPatientTransportRequest(
""",
    'patient transfer drawer helpers',
)

source = replace_once(
    source,
    """        if (!statusElement) return;
""",
    """        if (!statusElement) {
            renderBackgroundPatientTransferDrawer();
            return;
        }
""",
    'settings status drawer fallback',
)

source = replace_once(
    source,
    """        statusElement.classList.toggle(
            'mf2026-warn',
            label === 'Failed' || label === 'Retrying'
        );
    }
""",
    """        statusElement.classList.toggle(
            'mf2026-warn',
            label === 'Failed' || label === 'Retrying'
        );
        renderBackgroundPatientTransferDrawer();
    }
""",
    'settings status drawer refresh',
)

source = replace_once(
    source,
    """                totalSent:
                    Math.max(
                        0,
                        Number(state.totalSent || 0)
                    ) + 1,
                lastMessage:
""",
    """                totalSent:
                    Math.max(
                        0,
                        Number(state.totalSent || 0)
                    ) + 1,
                runCompleted:
                    Math.max(
                        0,
                        Number(state.runCompleted || 0)
                    ) + 1,
                lastMessage:
""",
    'successful run counter',
)

source = replace_once(
    source,
    """        const attempts =
            Math.max(
                0,
                Number(entry.attempts || 0)
            ) + 1;
        if (
            attempts >=
            MF_BACKGROUND_PATIENT_TRANSPORT_MAX_ATTEMPTS
        ) {
""",
    """        const attempts =
            Math.max(
                0,
                Number(entry.attempts || 0)
            ) + 1;
        const attemptHistory =
            appendBackgroundPatientTransportAttemptHistory(
                entry,
                attempts,
                result?.reason ||
                    'Background patient transport attempt failed.'
            );
        if (
            attempts >=
            MF_BACKGROUND_PATIENT_TRANSPORT_MAX_ATTEMPTS
        ) {
""",
    'attempt history capture',
)

source = replace_once(
    source,
    """            writeBackgroundPatientTransportState({
                status: 'failed',
                lastError:
                    result?.reason ||
                    'Patient transport failed after three attempts.'
            });
            scheduleBackgroundPatientTransportWorker(
""",
    """            recordBackgroundPatientTransportTerminalFailure(
                entry,
                attempts,
                result?.reason ||
                    'Patient transport failed after three attempts.',
                attemptHistory
            );
            writeBackgroundPatientTransportState({
                status: 'failed',
                lastError:
                    result?.reason ||
                    'Patient transport failed after three attempts.'
            });
            scheduleBackgroundPatientTransportWorker(
""",
    'terminal failure log',
)

source = replace_once(
    source,
    """        latestQueue[index] = {
            ...entry,
            attempts,
            nextAttemptAt: Date.now() + retryDelay
        };
""",
    """        latestQueue[index] = {
            ...entry,
            attempts,
            attemptHistory,
            nextAttemptAt: Date.now() + retryDelay
        };
""",
    'retry attempt history',
)

source = replace_once(
    source,
    """        clearAutoSelectionMissionGuard(
            'Auto Mode manually started'
        );

        resetVehicleLoadState();
""",
    """        clearAutoSelectionMissionGuard(
            'Auto Mode manually started'
        );

        resetBackgroundPatientTransportRunStats(
            'Auto Mode manually started'
        );
        resetVehicleLoadState();
""",
    'manual Auto Mode patient stats reset',
)

patient_panel = r'''        const patientPanel = document.createElement('div');
        patientPanel.id = 'patient-transfer-list-box';
        patientPanel.className =
            `mf2026-panel ${mfPatientTransferCollapsed
                ? 'mf2026-patient-collapsed'
                : ''}`;
        patientPanel.innerHTML = `
            <div class="mf2026-patient-header-row">
                <div id="mf-patient-title" class="mf2026-header">Patient Transfers</div>
                <button id="mf-patient-minimize"
                        type="button"
                        class="mf2026-button"
                        title="Minimize / expand patient transfers">${mfPatientTransferCollapsed ? '+' : '−'}</button>
            </div>

            <div id="mf-patient-body" class="mf-patient-body">
                <div class="mf-patient-stat-grid">
                    <div class="mf2026-box mf-patient-stat">
                        <div class="mf2026-section-title">Pending</div>
                        <div id="mf-patient-pending-count" class="mf-patient-stat-value">0</div>
                    </div>
                    <div class="mf2026-box mf-patient-stat">
                        <div class="mf2026-section-title">Completed</div>
                        <div id="mf-patient-completed-count" class="mf-patient-stat-value">0</div>
                    </div>
                    <div class="mf2026-box mf-patient-stat">
                        <div class="mf2026-section-title">Failed</div>
                        <div id="mf-patient-failed-count" class="mf-patient-stat-value">0</div>
                    </div>
                </div>

                <div class="mf2026-box">
                    <div class="mf2026-section-title">Background Worker</div>
                    <div id="mf-patient-worker-status" class="mf2026-small">Waiting for status.</div>
                    <div class="mf2026-small" style="margin-top:4px;">
                        Last completed: <span id="mf-patient-last-success">—</span>
                    </div>
                </div>

                <div class="mf2026-box">
                    <div class="mf2026-section-title">Pending Transfers</div>
                    <div id="mf-patient-queue-content" class="mf2026-small">
                        No patient transfers waiting.
                    </div>
                </div>

                <div class="mf2026-box">
                    <div class="mf-patient-failure-header">
                        <div class="mf2026-section-title">Recent Failures</div>
                        <button id="mf-patient-clear-failures"
                                type="button"
                                class="mf2026-button"
                                title="Clear patient transfer failure history">Clear</button>
                    </div>
                    <div id="mf-patient-failure-content" class="mf2026-small">
                        No terminal failures recorded.
                    </div>
                </div>
            </div>
        `;

'''

source = replace_once(
    source,
    """        const trainedPanel = document.createElement('div');
""",
    patient_panel + """        const trainedPanel = document.createElement('div');
""",
    'patient drawer panel',
)

source = replace_once(
    source,
    """        wrapper.appendChild(panel);
        wrapper.appendChild(loadPanel);
        wrapper.appendChild(trainedPanel);
""",
    """        wrapper.appendChild(panel);
        wrapper.appendChild(loadPanel);
        wrapper.appendChild(patientPanel);
        wrapper.appendChild(trainedPanel);
""",
    'patient drawer mount',
)

collapse_functions = r'''        function syncPatientTransferCollapseState() {
            const expanded = !mfPatientTransferCollapsed;
            patientPanel.classList.toggle(
                'mf2026-patient-collapsed',
                mfPatientTransferCollapsed
            );

            const minimizeButton =
                patientPanel.querySelector('#mf-patient-minimize');
            const title =
                patientPanel.querySelector('#mf-patient-title');

            if (minimizeButton) {
                minimizeButton.textContent = expanded ? '−' : '+';
                minimizeButton.title = expanded
                    ? 'Collapse Patient Transfers'
                    : 'Expand Patient Transfers';
                minimizeButton.setAttribute(
                    'aria-label',
                    minimizeButton.title
                );
                minimizeButton.setAttribute(
                    'aria-controls',
                    'mf-patient-body'
                );
                minimizeButton.setAttribute(
                    'aria-expanded',
                    String(expanded)
                );
            }

            if (title) {
                title.setAttribute(
                    'aria-controls',
                    'mf-patient-body'
                );
                title.setAttribute(
                    'aria-expanded',
                    String(expanded)
                );
            }

            patientPanel.dataset.collapsed =
                String(mfPatientTransferCollapsed);
            wrapper.classList.toggle(
                'mf-patient-drawer-open',
                expanded
            );
            renderBackgroundPatientTransferDrawer();
        }

        function togglePatientTransferCollapsed() {
            const opening = mfPatientTransferCollapsed;

            if (opening && !mfVehicleLoadCollapsed) {
                mfVehicleLoadCollapsed = true;
                localStorage.setItem(
                    MF_VEHICLE_LOAD_COLLAPSED_KEY,
                    'true'
                );
                syncVehicleLoadCollapseState();
            }

            mfPatientTransferCollapsed =
                !mfPatientTransferCollapsed;
            localStorage.setItem(
                MF_PATIENT_TRANSFER_COLLAPSED_KEY,
                String(mfPatientTransferCollapsed)
            );
            syncPatientTransferCollapseState();
        }

'''

source = replace_once(
    source,
    """        function toggleVehicleLoadCollapsed() {
            if (missionFinderIphoneSafari) {
                toggleIphoneLauncherPanel('vehicle');
                return;
            }

            mfVehicleLoadCollapsed = !mfVehicleLoadCollapsed;
""",
    collapse_functions + """        function toggleVehicleLoadCollapsed() {
            if (missionFinderIphoneSafari) {
                toggleIphoneLauncherPanel('vehicle');
                return;
            }

            const opening = mfVehicleLoadCollapsed;
            if (opening && !mfPatientTransferCollapsed) {
                mfPatientTransferCollapsed = true;
                localStorage.setItem(
                    MF_PATIENT_TRANSFER_COLLAPSED_KEY,
                    'true'
                );
                syncPatientTransferCollapseState();
            }

            mfVehicleLoadCollapsed = !mfVehicleLoadCollapsed;
""",
    'drawer mutual exclusion',
)

source = replace_once(
    source,
    """        syncVehicleLoadCollapseState();

        function syncTrainedPersonnelCollapseState() {
""",
    """        syncVehicleLoadCollapseState();
        syncPatientTransferCollapseState();

        function syncTrainedPersonnelCollapseState() {
""",
    'patient collapse initial sync',
)

patient_handlers = r'''        const patientMinimizeButton =
            patientPanel.querySelector('#mf-patient-minimize');
        const patientTitle =
            patientPanel.querySelector('#mf-patient-title');
        const clearPatientFailuresButton =
            patientPanel.querySelector('#mf-patient-clear-failures');

        if (patientMinimizeButton) {
            patientMinimizeButton.addEventListener(
                'click',
                function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    togglePatientTransferCollapsed();
                }
            );
        }

        if (patientTitle) {
            patientTitle.setAttribute('role', 'button');
            patientTitle.tabIndex = 0;
            patientTitle.addEventListener(
                'click',
                function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    togglePatientTransferCollapsed();
                }
            );
            patientTitle.addEventListener(
                'keydown',
                function(event) {
                    if (
                        event.key !== 'Enter' &&
                        event.key !== ' '
                    ) {
                        return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    togglePatientTransferCollapsed();
                }
            );
        }

        if (clearPatientFailuresButton) {
            clearPatientFailuresButton.addEventListener(
                'click',
                function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    clearBackgroundPatientTransportFailureLog();
                }
            );
        }

'''

source = replace_once(
    source,
    """        keepPanelPositionCheckbox.addEventListener(
""",
    patient_handlers + """        keepPanelPositionCheckbox.addEventListener(
""",
    'patient drawer handlers',
)

source = replace_once(
    source,
    """        renderVehicleLoadList();
        renderSessionPanel();
        startSessionRuntimeTicker();
""",
    """        renderVehicleLoadList();
        renderSessionPanel();
        renderBackgroundPatientTransferDrawer();
        startSessionRuntimeTicker();
""",
    'patient drawer initial render',
)

css = r'''

            /* Patient Transfers drawer V1.1.7. */
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #patient-transfer-list-box {
                position: absolute;
                top: 102px;
                left: calc(100% - 1px);
                right: auto;
                z-index: 8;
                width: min(304px, calc(100vw - 430px));
                min-width: 246px;
                max-width: 304px;
                max-height: calc(100vh - 122px);
                margin: 0;
                overflow: hidden;
                border-left: 0;
                border-radius: 0 7px 7px 0;
                box-shadow: 10px 10px 26px rgba(0, 0, 0, 0.34);
                transform-origin: left top;
                transition:
                    width 190ms cubic-bezier(0.22, 1, 0.36, 1),
                    min-width 190ms cubic-bezier(0.22, 1, 0.36, 1),
                    max-width 190ms cubic-bezier(0.22, 1, 0.36, 1),
                    max-height 190ms cubic-bezier(0.22, 1, 0.36, 1),
                    transform 190ms cubic-bezier(0.22, 1, 0.36, 1),
                    opacity 140ms ease-out,
                    box-shadow 190ms ease-out;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #patient-transfer-list-box.mf2026-patient-collapsed {
                display: block !important;
                width: 29px;
                min-width: 29px;
                max-width: 29px;
                height: 116px;
                min-height: 116px;
                max-height: 116px;
                padding: 0;
                overflow: hidden;
                transform: translateX(-6px) scaleX(0.96);
                opacity: 0.98;
                border-left: 0;
                border-radius: 0 7px 7px 0;
                box-shadow: 7px 7px 18px rgba(0, 0, 0, 0.26);
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #patient-transfer-list-box.mf2026-patient-collapsed
            .mf-patient-body {
                display: none;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #patient-transfer-list-box.mf2026-patient-collapsed
            .mf2026-patient-header-row {
                display: flex !important;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                width: 29px;
                height: 116px;
                min-height: 116px;
                padding: 5px 2px 3px;
                border-bottom: 0;
                border-radius: 0 7px 7px 0;
                cursor: pointer;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #patient-transfer-list-box.mf2026-patient-collapsed
            #mf-patient-title {
                display: flex;
                align-items: center;
                justify-content: center;
                flex: 1 1 auto;
                min-width: 0;
                padding: 0;
                writing-mode: vertical-rl;
                text-orientation: mixed;
                transform: rotate(180deg);
                font-size: 8.5px;
                letter-spacing: 0.04em;
                white-space: nowrap;
                cursor: pointer;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #patient-transfer-list-box.mf2026-patient-collapsed
            #mf-patient-minimize {
                width: 23px;
                min-width: 23px;
                height: 23px;
                min-height: 23px;
                flex: 0 0 23px;
                padding: 0;
                border-radius: 5px;
                font-size: 12px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #patient-transfer-list-box:not(.mf2026-patient-collapsed) {
                transform: translateX(0) scaleX(1);
                opacity: 1;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #patient-transfer-list-box:not(.mf2026-patient-collapsed)
            .mf2026-patient-header-row {
                display: flex;
                gap: 6px;
                align-items: center;
                min-height: 32px;
                padding: 3px 5px;
                border-radius: 0 7px 0 0;
                cursor: pointer;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #patient-transfer-list-box .mf2026-patient-header-row
            .mf2026-header {
                flex: 1;
                font-size: 9.5px;
                letter-spacing: 0.04em;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-patient-minimize {
                width: 26px;
                min-width: 26px;
                min-height: 28px;
                padding: 0;
                border-radius: 5px;
                font-size: 9px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #patient-transfer-list-box .mf-patient-body {
                display: flex;
                flex-direction: column;
                gap: 4px;
                max-height: calc(100vh - 164px);
                padding: 5px;
                overflow-y: auto;
                overscroll-behavior: contain;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-patient-stat-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 4px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-patient-stat {
                min-width: 0;
                text-align: center;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-patient-stat-value {
                font-size: 18px;
                font-weight: 800;
                line-height: 1.1;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-patient-queue-item,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-patient-failure-item {
                padding: 5px 0;
                border-top: 1px solid var(--nx-border);
                overflow-wrap: anywhere;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-patient-queue-item:first-child,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-patient-failure-item:first-child {
                border-top: 0;
                padding-top: 0;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-patient-failure-heading {
                font-weight: 750;
                margin-bottom: 2px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-patient-failure-attempt {
                margin-top: 2px;
                padding-left: 6px;
                color: var(--nx-muted);
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            .mf-patient-failure-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 6px;
                margin-bottom: 3px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
            #mf-patient-clear-failures {
                min-height: 24px;
                padding: 3px 6px;
                font-size: 8.5px;
            }

            #mission-finder-wrapper.mf-dashboard-utility-open:not(.mf2026-ios-safari)
            #patient-transfer-list-box,
            #mission-finder-wrapper.mf-compact-shell-collapsed:not(.mf2026-ios-safari)
            #patient-transfer-list-box,
            #mission-finder-wrapper.mf2026-ios-safari
            #patient-transfer-list-box {
                display: none !important;
            }

            @media (max-width: 760px) {
                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
                #patient-transfer-list-box:not(.mf2026-patient-collapsed) {
                    left: auto;
                    right: 0;
                    top: 102px;
                    width: min(304px, calc(100vw - 28px));
                    min-width: 0;
                    max-width: calc(100vw - 28px);
                    border-left: 1px solid var(--nx-border);
                    border-radius: 7px;
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.46);
                }
            }

            @media (prefers-reduced-motion: reduce) {
                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
                #patient-transfer-list-box {
                    transition-duration: 1ms !important;
                }
            }
'''

source = replace_once(
    source,
    """            @media (prefers-reduced-motion: reduce) {
                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
                #vehicle-load-list-box {
                    transition-duration: 1ms !important;
                }
            }
        `;
""",
    """            @media (prefers-reduced-motion: reduce) {
                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)
                #vehicle-load-list-box {
                    transition-duration: 1ms !important;
                }
            }
""" + css + """        `;
""",
    'patient drawer styling',
)

SOURCE_PATH.write_text(source, encoding='utf-8')

regression = r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);
const fail = message => {
  console.error(`ERROR: ${message}`);
  process.exit(1);
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};

for (const token of [
  "'mf_background_patient_transport_failure_log_v1'",
  "'mf_patient_transfer_collapsed_v1'",
  'MF_BACKGROUND_PATIENT_TRANSPORT_FAILURE_LOG_LIMIT = 10',
  "patientPanel.id = 'patient-transfer-list-box'",
  "'mf-patient-pending-count'",
  "'mf-patient-completed-count'",
  "'mf-patient-failed-count'",
  "'mf-patient-failure-content'",
  "'mf-patient-clear-failures'",
  'renderBackgroundPatientTransferDrawer()',
  'resetBackgroundPatientTransportRunStats(',
  'recordBackgroundPatientTransportTerminalFailure(',
  'appendBackgroundPatientTransportAttemptHistory(',
  'attemptHistory',
  'runCompleted',
  'runFailed',
  'totalFailed'
]) {
  expect(
    source.includes(token),
    `Missing Patient Transfers drawer contract: ${token}`
  );
}

expect(
  source.includes('Patients ⚠${runFailed}'),
  'Collapsed Patient Transfers tab must expose run failures'
);
expect(
  source.includes('Patients ${queueCount}'),
  'Collapsed Patient Transfers tab must expose pending count'
);
expect(
  source.includes('clearBackgroundPatientTransportFailureLog();'),
  'Failure log must have an explicit clear control'
);
expect(
  source.includes('#patient-transfer-list-box.mf2026-patient-collapsed'),
  'Patient Transfers drawer must retain a collapsed attached-tab state'
);
expect(
  source.includes('opening && !mfVehicleLoadCollapsed'),
  'Opening Patient Transfers must collapse Vehicle Load'
);
expect(
  source.includes('opening && !mfPatientTransferCollapsed'),
  'Opening Vehicle Load must collapse Patient Transfers'
);
expect(
  source.includes('#mission-finder-wrapper.mf2026-ios-safari\n            #patient-transfer-list-box'),
  'Existing iOS mission surfaces must remain isolated from the new desktop drawer'
);

console.log(
  'Patient Transfers drawer regression passed: live pending/completed/failed counters, bounded terminal failure history, per-attempt reasons and Vehicle Load mutual exclusion are locked.'
);
'''
Path('scripts/check-patient-transfer-drawer-v117.mjs').write_text(
    regression,
    encoding='utf-8',
)

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
changelog = replace_once(
    changelog,
    """## [Unreleased]

No changes have been queued after `1.1.6`.

## [1.1.6] - 2026-08-18
""",
    """## [Unreleased]

No changes have been queued after `1.1.7`.

## [1.1.7] - 2026-08-18

### Added

- Added an attached **Patient Transfers** drawer beside Mission Control for the default-off background patient transport worker. The collapsed tab exposes the live pending count and a warning when the current Auto Mode run has terminal failures; expanding it shows Pending, Completed this run and Failed this run counters, the current worker state, last completion time and the queued patient/vehicle requests.
- Added a bounded ten-entry terminal failure history with exact worker reasons and the retained reason from each of the worker's maximum three attempts. The log persists after Auto Mode stops so live failures can be diagnosed, and includes an explicit Clear control.
- Manual Auto Mode start resets only the run counters. The real queue remains authoritative for Pending, the existing lifetime sent counter remains intact, and terminal failures are counted only after the existing three-attempt safety limit is exhausted.

### Compatibility

- The patient transport engine itself is unchanged: exact same-origin patient routes, available-hospital selection, hidden worker rendering, prisoner/cell exclusion, 40-request queue limit, three-attempt retry bound, stop handling and Auto Mode continuation remain authoritative.
- The new drawer reuses the attached Vehicle Load interaction pattern on desktop and keeps the established iPhone/iPad Safari mission surfaces isolated. Opening Patient Transfers collapses Vehicle Load and opening Vehicle Load collapses Patient Transfers.
- Added `scripts/check-patient-transfer-drawer-v117.mjs`. Increased Command Nexus from `1.1.6` to `1.1.7` and Mission Finder from `V10.7.4` to `V10.7.5`; all other component versions remain unchanged.

## [1.1.6] - 2026-08-18
""",
    'changelog release section',
)
changelog_path.write_text(changelog, encoding='utf-8')

readme_path = Path('README.md')
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(
    readme,
    '**Current version:** `1.1.6` · **Mission Finder engine:** `V10.7.4`',
    '**Current version:** `1.1.7` · **Mission Finder engine:** `V10.7.5`',
    'README current version',
)
readme = replace_once(
    readme,
    '| **Desktop browser** | Primary | Complete Resource Administration and Mission Operations experience, compact shell and attached Vehicle Load drawer |',
    '| **Desktop browser** | Primary | Complete Resource Administration and Mission Operations experience, compact shell, attached Vehicle Load drawer and live Patient Transfers worker drawer |',
    'README desktop surface',
)
readme_path.write_text(readme, encoding='utf-8')

architecture_path = Path('docs/ARCHITECTURE.md')
architecture = architecture_path.read_text(encoding='utf-8')
architecture = replace_once(
    architecture,
    'current MissionChief Command Nexus v1.1.6 production source',
    'current MissionChief Command Nexus v1.1.7 production source',
    'architecture release version',
)
architecture = replace_once(
    architecture,
    'Mission Finder `V10.7.4`',
    'Mission Finder `V10.7.5`',
    'architecture Mission Finder version',
)
architecture_path.write_text(architecture, encoding='utf-8')

print('Patient Transfers v1.1.7 candidate built.')
