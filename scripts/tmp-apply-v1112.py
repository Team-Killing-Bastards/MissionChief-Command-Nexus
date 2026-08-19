#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "src/missionchief-command-nexus.user.js"
BACKEND_PATH = ROOT / "integrations/google-apps-script/Code.gs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_between(
    text: str,
    start_marker: str,
    end_marker: str,
    replacement: str,
    label: str,
) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f"{label}: start marker not found")
    end = text.find(end_marker, start + len(start_marker))
    if end < 0:
        raise RuntimeError(f"{label}: end marker not found")
    return text[:start] + replacement.rstrip() + "\n\n" + text[end:]


source = SOURCE_PATH.read_text(encoding="utf-8")
backend = BACKEND_PATH.read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# Userscript version and runtime constants
# ---------------------------------------------------------------------------
source = replace_once(
    source,
    "// @version      1.1.11",
    "// @version      1.1.12",
    "userscript metadata version",
)
source = replace_once(
    source,
    "const MF_MISSION_LOGGER_CLIENT_VERSION = '1.1.11';",
    "const MF_MISSION_LOGGER_CLIENT_VERSION = '1.1.12';",
    "logger client version",
)
source = replace_once(
    source,
    """    const MF_MISSION_LOGGER_BUSY_RETRY_DELAYS_MS =
        Object.freeze([2000, 5000, 15000]);
    const MF_MISSION_LOGGER_OBSERVED_RETENTION_MS =""",
    """    const MF_MISSION_LOGGER_BUSY_RETRY_DELAYS_MS =
        Object.freeze([2000, 5000, 15000]);
    const MF_MISSION_LOGGER_OBSERVER_LEASE_MS = 90000;
    const MF_MISSION_LOGGER_OBSERVER_RENEW_MS = 45000;
    const MF_MISSION_LOGGER_OBSERVER_RETRY_MS = 15000;
    const MF_MISSION_LOGGER_ACTIVITY_FLUSH_MS = 4000;
    const MF_MISSION_LOGGER_ACTIVITY_BUFFER_MAX = 80;
    const MF_MISSION_LOGGER_DEVICE_STAGGER_MAX_MS = 15000;
    const MF_MISSION_LOGGER_OBSERVED_RETENTION_MS =""",
    "multi-device and activity-buffer constants",
)
source = replace_once(
    source,
    """    let mfMissionLoggerStartupDrainChecked = false;
    let mfMissionLoggerEagerSyncTimer = null;""",
    """    let mfMissionLoggerStartupDrainChecked = false;
    let mfMissionLoggerObserverLeaseTimer = null;
    let mfMissionLoggerObserverLeaseRequest = null;
    let mfMissionLoggerObserverLeaseSupported = null;
    let mfMissionLoggerObserverLeaseOwner = false;
    let mfMissionLoggerObserverLeaseExpiresAt = 0;
    let mfMissionLoggerActivityFlushTimer = null;
    const mfMissionLoggerActivityBuffer = [];
    let mfMissionLoggerEagerSyncTimer = null;""",
    "multi-device and activity-buffer state",
)

# ---------------------------------------------------------------------------
# Server-backed passive-observer lease. This coordinates separate computers;
# the existing localStorage lock continues to coordinate tabs on one browser.
# ---------------------------------------------------------------------------
observer_helpers = r'''    function getMissionLoggerDeviceStagger(
        maxMs = MF_MISSION_LOGGER_DEVICE_STAGGER_MAX_MS,
        identity = readMissionLoggerIdentity()
    ) {
        const limit = Math.max(
            1,
            Math.trunc(Number(maxMs) || 1)
        );
        const value = String(
            identity?.deviceId || MF_INSTANCE_TOKEN || ''
        );
        let hash = 2166136261;
        for (let index = 0; index < value.length; index += 1) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0) % limit;
    }

    function isMissionLoggerPassiveObserverOwner() {
        if (!mfMissionLoggerEnabled) return false;
        if (mfMissionLoggerObserverLeaseSupported === false) {
            return true;
        }
        return !!(
            mfMissionLoggerObserverLeaseOwner &&
            Date.now() < mfMissionLoggerObserverLeaseExpiresAt
        );
    }

    function clearMissionLoggerObserverLeaseTimer() {
        if (!mfMissionLoggerObserverLeaseTimer) return;
        clearTimeout(mfMissionLoggerObserverLeaseTimer);
        mfMissionLoggerObserverLeaseTimer = null;
    }

    function stopMissionLoggerObserverLease() {
        clearMissionLoggerObserverLeaseTimer();
        mfMissionLoggerObserverLeaseOwner = false;
        mfMissionLoggerObserverLeaseExpiresAt = 0;
        if (mfMissionLoggerGenerationArmTimer) {
            clearTimeout(mfMissionLoggerGenerationArmTimer);
            mfMissionLoggerGenerationArmTimer = null;
        }
        mfMissionLoggerGenerationArmed = false;
    }

    function scheduleMissionLoggerObserverLeaseRefresh(
        delayMs = MF_MISSION_LOGGER_OBSERVER_RETRY_MS
    ) {
        clearMissionLoggerObserverLeaseTimer();
        if (
            !MF_IS_TOP_WINDOW ||
            !mfMissionLoggerEnabled ||
            !mfMissionLoggerEndpoint ||
            !readMissionLoggerIdentity() ||
            mfMissionLoggerObserverLeaseSupported === false
        ) {
            return false;
        }

        mfMissionLoggerObserverLeaseTimer = setTimeout(
            () => {
                mfMissionLoggerObserverLeaseTimer = null;
                void refreshMissionLoggerObserverLease(
                    'scheduled observer lease refresh'
                );
            },
            Math.max(250, Math.trunc(Number(delayMs) || 0))
        );
        return true;
    }

    function activateMissionLoggerPassiveObserver() {
        mfMissionLoggerGenerationArmed = false;
        installMissionLoggerMissionGenerationCapture();
        scanMissionLoggerMissionList(document, true);
        scheduleMissionLoggerGenerationArm();
        recordMissionLoggerObservedEvent();
    }

    async function refreshMissionLoggerObserverLease(
        reason = 'observer lease refresh'
    ) {
        if (
            !MF_IS_TOP_WINDOW ||
            !mfMissionLoggerEnabled ||
            !mfMissionLoggerEndpoint
        ) {
            stopMissionLoggerObserverLease();
            return false;
        }
        if (mfMissionLoggerObserverLeaseSupported === false) {
            return true;
        }
        if (mfMissionLoggerObserverLeaseRequest) {
            return mfMissionLoggerObserverLeaseRequest;
        }

        const identity = readMissionLoggerIdentity();
        if (!identity) return false;

        const request = (async () => {
            try {
                const response = await submitMissionLoggerRequest(
                    'observer-lease',
                    {
                        profileId: identity.playerId,
                        username: identity.playerName,
                        deviceId: identity.deviceId,
                        deviceLabel: identity.deviceLabel,
                        leaseMs:
                            MF_MISSION_LOGGER_OBSERVER_LEASE_MS,
                        reason: String(reason || '').slice(0, 120)
                    }
                );
                updateMissionActivityBackendCapability(response);
                mfMissionLoggerObserverLeaseSupported = true;
                mfMissionLoggerObserverLeaseOwner =
                    response.granted === true;
                const parsedExpiry = Date.parse(
                    String(response.expiresAt || '')
                );
                mfMissionLoggerObserverLeaseExpiresAt =
                    Number.isFinite(parsedExpiry)
                        ? parsedExpiry
                        : Date.now() + Math.max(
                            5000,
                            Number(response.leaseMs || 0) ||
                                MF_MISSION_LOGGER_OBSERVER_LEASE_MS
                        );

                if (mfMissionLoggerObserverLeaseOwner) {
                    activateMissionLoggerPassiveObserver();
                } else {
                    if (mfMissionLoggerGenerationArmTimer) {
                        clearTimeout(
                            mfMissionLoggerGenerationArmTimer
                        );
                        mfMissionLoggerGenerationArmTimer = null;
                    }
                    mfMissionLoggerGenerationArmed = false;
                }

                const remaining = Math.max(
                    1000,
                    mfMissionLoggerObserverLeaseExpiresAt - Date.now()
                );
                const nextDelay =
                    mfMissionLoggerObserverLeaseOwner
                        ? Math.max(
                            5000,
                            Math.min(
                                MF_MISSION_LOGGER_OBSERVER_RENEW_MS,
                                remaining - 10000
                            )
                        )
                        : Math.max(
                            1000,
                            Number(response.retryAfterMs || 0) ||
                                MF_MISSION_LOGGER_OBSERVER_RETRY_MS
                        ) + getMissionLoggerDeviceStagger(5000, identity);
                scheduleMissionLoggerObserverLeaseRefresh(nextDelay);
                return mfMissionLoggerObserverLeaseOwner;
            } catch (error) {
                if (
                    String(error?.code || '') ===
                    'UNKNOWN_ACTION'
                ) {
                    // The v1.1.12 userscript is safe against the previous
                    // private backend. Until Code.gs is deployed, each device
                    // keeps the old passive-observer behaviour rather than
                    // silently losing mission observations.
                    mfMissionLoggerObserverLeaseSupported = false;
                    mfMissionLoggerObserverLeaseOwner = true;
                    mfMissionLoggerObserverLeaseExpiresAt =
                        Number.MAX_SAFE_INTEGER;
                    activateMissionLoggerPassiveObserver();
                    return true;
                }

                if (
                    Date.now() >=
                    mfMissionLoggerObserverLeaseExpiresAt
                ) {
                    mfMissionLoggerObserverLeaseOwner = false;
                }
                scheduleMissionLoggerObserverLeaseRefresh(
                    MF_MISSION_LOGGER_OBSERVER_RETRY_MS +
                        getMissionLoggerDeviceStagger(5000, identity)
                );
                return isMissionLoggerPassiveObserverOwner();
            }
        })();

        mfMissionLoggerObserverLeaseRequest = request;
        try {
            return await request;
        } finally {
            if (mfMissionLoggerObserverLeaseRequest === request) {
                mfMissionLoggerObserverLeaseRequest = null;
            }
        }
    }'''
source = replace_once(
    source,
    "    function getMissionLoggerDeviceLabel() {",
    observer_helpers + "\n\n    function getMissionLoggerDeviceLabel() {",
    "observer lease helpers",
)

# ---------------------------------------------------------------------------
# Buffer low-priority activity in memory. Mission dispatch/completion/credit
# evidence still persists immediately, but routine clicks/network callbacks no
# longer parse and rewrite the entire localStorage outbox on every event.
# ---------------------------------------------------------------------------
activity_buffer_helpers = r'''    function appendMissionActivityBufferToQueue(queue) {
        if (
            !Array.isArray(queue) ||
            mfMissionLoggerActivityBuffer.length === 0
        ) {
            return 0;
        }
        const existingIds = new Set(
            queue.map(event => String(event?.eventId || ''))
        );
        const buffered = mfMissionLoggerActivityBuffer.splice(
            0,
            mfMissionLoggerActivityBuffer.length
        );
        let accepted = 0;
        buffered.forEach(event => {
            const eventId = String(event?.eventId || '');
            if (!eventId || existingIds.has(eventId)) return;
            existingIds.add(eventId);
            queue.push(event);
            accepted += 1;
        });
        return accepted;
    }

    function scheduleMissionActivityBufferFlush(
        delayMs = MF_MISSION_LOGGER_ACTIVITY_FLUSH_MS
    ) {
        if (mfMissionLoggerActivityFlushTimer) return true;
        mfMissionLoggerActivityFlushTimer = setTimeout(
            () => {
                mfMissionLoggerActivityFlushTimer = null;
                const flush = () => {
                    flushMissionActivityBuffer(
                        'scheduled activity flush'
                    );
                };
                if (
                    typeof window.requestIdleCallback ===
                    'function'
                ) {
                    window.requestIdleCallback(flush, {
                        timeout: 750
                    });
                } else {
                    flush();
                }
            },
            Math.max(100, Math.trunc(Number(delayMs) || 0))
        );
        return true;
    }

    function flushMissionActivityBuffer(
        reason = 'activity buffer flush'
    ) {
        if (mfMissionLoggerActivityFlushTimer) {
            clearTimeout(mfMissionLoggerActivityFlushTimer);
            mfMissionLoggerActivityFlushTimer = null;
        }
        if (mfMissionLoggerActivityBuffer.length === 0) {
            return false;
        }

        const queue = readMissionLoggerQueue();
        const accepted = appendMissionActivityBufferToQueue(queue);
        if (accepted === 0) return false;
        writeMissionLoggerQueue(queue);
        scheduleMissionLoggerEagerSync(
            `${reason}: ${accepted} activity events`
        );
        return true;
    }'''
source = replace_once(
    source,
    "    function queueMissionLoggerEvent(event) {",
    activity_buffer_helpers + "\n\n    function queueMissionLoggerEvent(event) {",
    "activity buffer helpers",
)

queue_replacement = r'''    function queueMissionLoggerEvent(event) {
        if (
            !mfMissionLoggerEnabled ||
            !readMissionLoggerIdentity() ||
            !event ||
            typeof event !== 'object'
        ) {
            return false;
        }

        if (String(event.eventType || '') === 'activity') {
            if (
                mfMissionLoggerActivityBuffer.some(existing => {
                    return existing.eventId === event.eventId;
                })
            ) {
                return false;
            }
            mfMissionLoggerActivityBuffer.push(event);
            if (
                mfMissionLoggerActivityBuffer.length >=
                MF_MISSION_LOGGER_ACTIVITY_BUFFER_MAX
            ) {
                flushMissionActivityBuffer(
                    'activity buffer safety limit'
                );
            } else {
                scheduleMissionActivityBufferFlush();
            }
            return true;
        }

        const queue = readMissionLoggerQueue();
        const bufferedActivityCount =
            appendMissionActivityBufferToQueue(queue);

        if (
            queue.some(existing => {
                return existing.eventId === event.eventId;
            })
        ) {
            if (bufferedActivityCount > 0) {
                writeMissionLoggerQueue(queue);
            }
            return false;
        }

        queue.push(event);
        writeMissionLoggerQueue(queue);
        rememberMissionLoggerEvent(event);
        scheduleMissionLoggerEagerSync(
            `queued ${String(event.eventType || 'event')}`
        );
        return true;
    }'''
source = replace_between(
    source,
    "    function queueMissionLoggerEvent(event) {",
    "    function readMissionLoggerPendingBatch() {",
    queue_replacement,
    "queueMissionLoggerEvent replacement",
)

# Routine network telemetry is owned by the passive-observer device. Errors are
# retained on every acting device, and all direct user/Nexus actions remain local
# to the computer that performed them.
source = replace_once(
    source,
    """        ) return false;
        const identity = readMissionLoggerIdentity();
        if (!identity?.playerName || !identity?.deviceId) return false;""",
    """        ) return false;
        const activityCategory = String(
            category || ''
        ).toUpperCase();
        const activityOutcome = String(
            details.outcome || ''
        ).toUpperCase();
        if (
            activityCategory === 'NETWORK' &&
            !isMissionLoggerPassiveObserverOwner() &&
            !/FAILED|ERROR/.test(activityOutcome)
        ) {
            return false;
        }
        const identity = readMissionLoggerIdentity();
        if (!identity?.playerName || !identity?.deviceId) return false;""",
    "network activity observer ownership",
)

patch_window_replacement = r'''    function patchMissionActivityWindow(frameWindow) {
        if (!frameWindow || mfMissionActivityWindows.has(frameWindow)) return;
        let sameOrigin = false;
        try {
            sameOrigin = frameWindow.location.origin === window.location.origin;
        } catch (_error) {}
        if (!sameOrigin) return;
        mfMissionActivityWindows.add(frameWindow);

        try {
            const originalFetch = frameWindow.fetch;
            if (typeof originalFetch === 'function') {
                frameWindow.fetch = function(input, init) {
                    const rawUrl = input?.url || input;
                    const route = sanitiseMissionActivityPath(rawUrl, frameWindow);
                    if (!route) return originalFetch.apply(this, arguments);
                    const method = String(
                        init?.method || input?.method || 'GET'
                    ).toUpperCase().slice(0, 12);
                    const correlationId = createMissionLoggerId('net');
                    const started = Date.now();
                    return originalFetch.apply(this, arguments).then(response => {
                        recordMissionActivity('MISSIONCHIEF', 'NETWORK', 'FETCH', {
                            frameWindow, route, phase: 'END',
                            outcome: response.ok ? 'OK' : 'FAILED',
                            correlationId, durationMs: Date.now() - started,
                            payload: { method, status: Number(response.status || 0) }
                        });
                        return response;
                    }).catch(error => {
                        recordMissionActivity('MISSIONCHIEF', 'NETWORK', 'FETCH', {
                            frameWindow, route, phase: 'END', outcome: 'ERROR',
                            correlationId, durationMs: Date.now() - started,
                            message: error?.message || 'Fetch failed', payload: { method }
                        });
                        throw error;
                    });
                };
            }
        } catch (_error) {}

        try {
            const XHR = frameWindow.XMLHttpRequest;
            if (XHR?.prototype) {
                const originalOpen = XHR.prototype.open;
                const originalSend = XHR.prototype.send;
                XHR.prototype.open = function(method, url) {
                    this.__mfActivityRequest = {
                        method: String(method || 'GET').toUpperCase().slice(0, 12),
                        route: sanitiseMissionActivityPath(url, frameWindow)
                    };
                    return originalOpen.apply(this, arguments);
                };
                XHR.prototype.send = function() {
                    const request = this.__mfActivityRequest;
                    if (!request?.route) return originalSend.apply(this, arguments);
                    const correlationId = createMissionLoggerId('xhr');
                    const started = Date.now();
                    this.addEventListener('loadend', () => {
                        const status = Number(this.status || 0);
                        recordMissionActivity('MISSIONCHIEF', 'NETWORK', 'XHR', {
                            frameWindow, route: request.route, phase: 'END',
                            outcome: status >= 200 && status < 400 ? 'OK' : 'FAILED',
                            correlationId, durationMs: Date.now() - started,
                            payload: { method: request.method, status }
                        });
                    }, { once: true });
                    return originalSend.apply(this, arguments);
                };
            }
        } catch (_error) {}

        try {
            ['pushState', 'replaceState'].forEach(method => {
                const original = frameWindow.history?.[method];
                if (typeof original !== 'function') return;
                frameWindow.history[method] = function() {
                    const result = original.apply(this, arguments);
                    recordMissionActivity('MISSIONCHIEF', 'NAVIGATION', method.toUpperCase(), {
                        frameWindow,
                        route: sanitiseMissionActivityPath(frameWindow.location.href, frameWindow)
                    });
                    return result;
                };
            });
        } catch (_error) {}

        frameWindow.addEventListener?.('popstate', () => {
            recordMissionActivity('USER', 'NAVIGATION', 'POPSTATE', { frameWindow });
        });
        frameWindow.addEventListener?.('hashchange', () => {
            recordMissionActivity('USER', 'NAVIGATION', 'HASHCHANGE', { frameWindow });
        });
        frameWindow.addEventListener?.('error', event => {
            recordMissionActivity('SYSTEM', 'ERROR', 'WINDOW_ERROR', {
                frameWindow,
                outcome: 'ERROR',
                message: event?.message || 'Window error'
            });
        });
        frameWindow.addEventListener?.('unhandledrejection', event => {
            recordMissionActivity('SYSTEM', 'ERROR', 'UNHANDLED_REJECTION', {
                frameWindow,
                outcome: 'ERROR',
                message: event?.reason?.message || String(event?.reason || 'Unhandled rejection')
            });
        });
    }'''
source = replace_between(
    source,
    "    function patchMissionActivityWindow(frameWindow) {",
    "    function attachMissionActivityDocument(frameDocument, frameWindow) {",
    patch_window_replacement,
    "network activity wrapper replacement",
)
source = replace_once(
    source,
    """        frameDocument.addEventListener('visibilitychange', () => {
            recordMissionActivity('SYSTEM', 'LIFECYCLE', 'VISIBILITY_' +
                String(frameDocument.visibilityState || 'unknown').toUpperCase(), {
                frameWindow,
                payload: { state: frameDocument.visibilityState || 'unknown' }
            });
        });""",
    """        frameDocument.addEventListener('visibilitychange', () => {
            recordMissionActivity('SYSTEM', 'LIFECYCLE', 'VISIBILITY_' +
                String(frameDocument.visibilityState || 'unknown').toUpperCase(), {
                frameWindow,
                payload: { state: frameDocument.visibilityState || 'unknown' }
            });
            if (frameDocument.visibilityState === 'hidden') {
                flushMissionActivityBuffer('visibility hidden');
            }
        });""",
    "visibility activity flush",
)
source = replace_once(
    source,
    """        window.addEventListener('pagehide', () => {
            recordMissionActivity('SYSTEM', 'LIFECYCLE', 'PAGEHIDE', {
                outcome: 'OK'
            });
        });""",
    """        window.addEventListener('pagehide', () => {
            recordMissionActivity('SYSTEM', 'LIFECYCLE', 'PAGEHIDE', {
                outcome: 'OK'
            });
            flushMissionActivityBuffer('pagehide');
        });""",
    "pagehide activity flush",
)

# ---------------------------------------------------------------------------
# Exactly one computer per MissionChief player performs passive account-wide
# mission discovery. Dispatch/completion/credit capture remains ungated.
# ---------------------------------------------------------------------------
source = replace_once(
    source,
    """    function recordMissionLoggerGeneratedMission(
        suppliedMission,
        row,
        options = {}
    ) {
        if (!MF_IS_TOP_WINDOW) return false;""",
    """    function recordMissionLoggerGeneratedMission(
        suppliedMission,
        row,
        options = {}
    ) {
        if (
            !MF_IS_TOP_WINDOW ||
            !isMissionLoggerPassiveObserverOwner()
        ) return false;""",
    "generated mission observer lease",
)
source = replace_once(
    source,
    """    function scanMissionLoggerMissionList(
        root,
        baselineOnly
    ) {
        let count = 0;""",
    """    function scanMissionLoggerMissionList(
        root,
        baselineOnly
    ) {
        if (!isMissionLoggerPassiveObserverOwner()) {
            return 0;
        }
        let count = 0;""",
    "mission-list scan observer lease",
)
source = replace_once(
    source,
    """    function scheduleMissionLoggerGenerationArm() {
        if (mfMissionLoggerGenerationArmed) return;""",
    """    function scheduleMissionLoggerGenerationArm() {
        if (!isMissionLoggerPassiveObserverOwner()) return;
        if (mfMissionLoggerGenerationArmed) return;""",
    "generation arm observer lease",
)
source = replace_once(
    source,
    """    function installMissionLoggerMissionGenerationCapture() {
        if (!MF_IS_TOP_WINDOW) return;""",
    """    function installMissionLoggerMissionGenerationCapture() {
        if (
            !MF_IS_TOP_WINDOW ||
            !isMissionLoggerPassiveObserverOwner()
        ) return;""",
    "generation capture observer lease",
)
source = replace_once(
    source,
    """    function observeMissionLoggerMissionListMutations(records) {
        if (!MF_IS_TOP_WINDOW) return;""",
    """    function observeMissionLoggerMissionListMutations(records) {
        if (
            !MF_IS_TOP_WINDOW ||
            !isMissionLoggerPassiveObserverOwner()
        ) return;""",
    "mission mutation observer lease",
)
source = replace_once(
    source,
    """    function recordMissionLoggerObservedEvent() {
        if (
            !mfMissionLoggerEnabled ||
            !readMissionLoggerIdentity() ||
            !isMissionPage()""",
    """    function recordMissionLoggerObservedEvent() {
        if (
            !mfMissionLoggerEnabled ||
            !isMissionLoggerPassiveObserverOwner() ||
            !readMissionLoggerIdentity() ||
            !isMissionPage()""",
    "current-mission observer lease",
)

# ---------------------------------------------------------------------------
# Upload staggering and buffered flushes.
# ---------------------------------------------------------------------------
source = replace_once(
    source,
    """        if (!mfMissionLoggerEnabled) return false;

        const identity = readMissionLoggerIdentity();""",
    """        if (!mfMissionLoggerEnabled) return false;

        flushMissionActivityBuffer('before sync');
        const identity = readMissionLoggerIdentity();""",
    "flush activity before upload",
)
source = replace_once(
    source,
    """                const retryDelay =
                    MF_MISSION_LOGGER_BUSY_RETRY_DELAYS_MS[
                        busyAttempt
                    ];""",
    """                const retryDelay =
                    MF_MISSION_LOGGER_BUSY_RETRY_DELAYS_MS[
                        busyAttempt
                    ] +
                    getMissionLoggerDeviceStagger(1500, identity) +
                    Math.floor(Math.random() * 750);""",
    "busy retry jitter",
)
source = replace_once(
    source,
    """            force
                ? 500
                : MF_MISSION_LOGGER_EAGER_SYNC_DELAY_MS
        );""",
    """            (
                force
                    ? 500
                    : MF_MISSION_LOGGER_EAGER_SYNC_DELAY_MS
            ) + getMissionLoggerDeviceStagger(
                force ? 1000 : 2500
            )
        );""",
    "eager upload staggering",
)
source = replace_once(
    source,
    """    function stopMissionLoggerSyncTimer() {
        if (mfMissionLoggerDeferredDrainTimer) {""",
    """    function stopMissionLoggerSyncTimer() {
        flushMissionActivityBuffer('sync timer stopped');
        stopMissionLoggerObserverLease();
        if (mfMissionLoggerDeferredDrainTimer) {""",
    "stop timer observer/activity cleanup",
)
source = replace_once(
    source,
    """        startMissionLoggerCreditReconciliation();

        if (!mfMissionLoggerStartupDrainChecked) {""",
    """        scheduleMissionLoggerObserverLeaseRefresh(
            250 + getMissionLoggerDeviceStagger(1000)
        );
        startMissionLoggerCreditReconciliation();

        if (!mfMissionLoggerStartupDrainChecked) {""",
    "start observer lease renewal",
)
source = replace_once(
    source,
    """                        manual: true,
                        delayMs: 500
                    }""",
    """                        manual: true,
                        delayMs:
                            500 +
                            getMissionLoggerDeviceStagger(2000)
                    }""",
    "startup backlog staggering",
)
source = replace_once(
    source,
    """        const initialDelay = state.lastAttemptAt
            ? Math.max(
                1000,
                MF_MISSION_LOGGER_SYNC_INTERVAL_MS - elapsed
            )
            : 5000;

        mfMissionLoggerInitialSyncTimer = setTimeout(""",
    """        const initialDelay = state.lastAttemptAt
            ? Math.max(
                1000,
                MF_MISSION_LOGGER_SYNC_INTERVAL_MS - elapsed
            )
            : 5000;
        const staggeredInitialDelay = Math.min(
            MF_MISSION_LOGGER_SYNC_INTERVAL_MS,
            initialDelay + getMissionLoggerDeviceStagger()
        );

        mfMissionLoggerInitialSyncTimer = setTimeout(""",
    "initial upload staggering calculation",
)
source = replace_once(
    source,
    """            Math.min(
                MF_MISSION_LOGGER_SYNC_INTERVAL_MS,
                initialDelay
            )
        );""",
    """            staggeredInitialDelay
        );""",
    "initial upload staggering application",
)

# ---------------------------------------------------------------------------
# Apps Script backend: short per-player observer lease and cross-device
# mission-observed dedupe. The upload batch checksum remains based on the
# original payload so same-ID retries are stable.
# ---------------------------------------------------------------------------
backend = replace_once(
    backend,
    "buildId: '1.1.10-upload-lock-hotfix-1'",
    "buildId: '1.1.12-multi-device-performance-1'",
    "backend build marker",
)
backend = replace_once(
    backend,
    """  uploadLockWaitMs: 2000,
  maxUnitsPerEvent: 500,
  dispatchDuplicateWindowMs: 15000,""",
    """  uploadLockWaitMs: 2000,
  observerLeaseLockWaitMs: 500,
  observerLeaseMs: 90000,
  maxUnitsPerEvent: 500,
  dispatchDuplicateWindowMs: 15000,""",
    "backend observer lease constants",
)
backend = replace_once(
    backend,
    """        'navbar-profile-id',
        'retryable-upload-lock'""",
    """        'navbar-profile-id',
        'retryable-upload-lock',
        'multi-device-observer-lease',
        'cross-device-semantic-dedupe'""",
    "backend capability list",
)
backend = replace_once(
    backend,
    """    if (action === 'upload') {
      response = handleLoggerUpload_(payload);
    } else if (action === 'pair' || action === 'revoke') {""",
    """    if (action === 'upload') {
      response = handleLoggerUpload_(payload);
    } else if (action === 'observer-lease') {
      response = handleLoggerObserverLease_(payload);
    } else if (action === 'pair' || action === 'revoke') {""",
    "backend observer lease route",
)

backend_lease = r'''function handleLoggerObserverLease_(payload) {
  const profileId = cleanMissionChiefProfileId_(
    payload.profileId || payload.playerId
  );
  const deviceId = cleanIdentifier_(payload.deviceId, 160);
  const requestedLeaseMs = Math.max(
    30000,
    Math.min(
      180000,
      Number(payload.leaseMs || 0) || MC_LOGGER.observerLeaseMs
    )
  );
  if (!profileId || !deviceId || deviceId.length < 8) {
    throw loggerError_(
      'INVALID_OBSERVER_LEASE',
      'A MissionChief profile ID and browser device ID are required for observer ownership.'
    );
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(MC_LOGGER.observerLeaseLockWaitMs)) {
    throw loggerError_(
      'LOGGER_BUSY',
      'The logger is busy; retry the observer lease shortly.'
    );
  }

  try {
    const now = Date.now();
    const propertyKey = 'MC_LOGGER_OBSERVER_LEASE_' + profileId;
    const properties = PropertiesService.getScriptProperties();
    let existing = null;
    try {
      existing = JSON.parse(properties.getProperty(propertyKey) || 'null');
    } catch (error) {
      existing = null;
    }

    const existingDeviceId = cleanIdentifier_(
      existing && existing.deviceId,
      160
    );
    const existingExpiresAt = Number(
      existing && existing.expiresAt || 0
    );
    const granted =
      !existingDeviceId ||
      existingExpiresAt <= now ||
      existingDeviceId === deviceId;
    const ownerDeviceId = granted ? deviceId : existingDeviceId;
    const expiresAt = granted
      ? now + requestedLeaseMs
      : existingExpiresAt;

    if (granted) {
      properties.setProperty(
        propertyKey,
        JSON.stringify({
          profileId: profileId,
          deviceId: deviceId,
          expiresAt: expiresAt,
          updatedAt: now
        })
      );
    }

    return {
      ok: true,
      action: 'observer-lease',
      playerId: profileId,
      deviceId: deviceId,
      granted: granted,
      ownerDeviceId: ownerDeviceId,
      expiresAt: new Date(expiresAt).toISOString(),
      leaseMs: requestedLeaseMs,
      retryAfterMs: granted
        ? Math.max(5000, Math.floor(requestedLeaseMs / 2))
        : Math.max(
            1000,
            Math.min(15000, expiresAt - now)
          )
    };
  } finally {
    lock.releaseLock();
  }
}'''
backend = replace_once(
    backend,
    "function handleLoggerPair_(payload) {",
    backend_lease + "\n\nfunction handleLoggerPair_(payload) {",
    "backend observer lease handler",
)

passive_dedupe = r'''function filterCrossDevicePassiveObservationRows_(
  eventSheet,
  prepared,
  batchId,
  playerId,
  deviceId
) {
  const output = Object.assign({}, prepared, {
    eventRows: Array.isArray(prepared && prepared.eventRows)
      ? prepared.eventRows.slice()
      : [],
    unitRows: Array.isArray(prepared && prepared.unitRows)
      ? prepared.unitRows.slice()
      : [],
    suppressedDuplicateEvents: Math.max(
      0,
      Number(prepared && prepared.suppressedDuplicateEvents || 0)
    )
  });
  const candidateMissionIds = {};
  output.eventRows.forEach(function(row) {
    if (String(row[4] || '').toLowerCase() !== 'mission-observed') return;
    const missionId = cleanIdentifier_(row[6], 80);
    if (missionId) candidateMissionIds[missionId] = true;
  });
  if (Object.keys(candidateMissionIds).length === 0) return output;

  const lastRow = eventSheet.getLastRow();
  const recentRows = lastRow >= 2
    ? eventSheet.getRange(
        Math.max(2, lastRow - MC_LOGGER.duplicateScanEventRows + 1),
        1,
        Math.min(MC_LOGGER.duplicateScanEventRows, lastRow - 1),
        MC_LOGGER_SHEETS.events.headers.length
      ).getValues()
    : [];
  const observedElsewhere = {};
  recentRows.forEach(function(row) {
    if (String(row[1] || '') === batchId) return;
    if (String(row[2] || '') !== playerId) return;
    if (String(row[3] || '') === deviceId) return;
    if (String(row[4] || '').toLowerCase() !== 'mission-observed') return;
    const missionId = cleanIdentifier_(row[6], 80);
    if (candidateMissionIds[missionId]) observedElsewhere[missionId] = true;
  });

  const suppressedEventIds = {};
  output.eventRows = output.eventRows.filter(function(row) {
    if (String(row[4] || '').toLowerCase() !== 'mission-observed') {
      return true;
    }
    const missionId = cleanIdentifier_(row[6], 80);
    if (!missionId || !observedElsewhere[missionId]) return true;
    suppressedEventIds[String(row[0] || '')] = true;
    output.suppressedDuplicateEvents += 1;
    return false;
  });
  if (Object.keys(suppressedEventIds).length > 0) {
    output.unitRows = output.unitRows.filter(function(row) {
      return !suppressedEventIds[String(row[0] || '')];
    });
  }
  return output;
}'''
backend = replace_once(
    backend,
    "function filterSemanticDuplicateDispatchRows_(",
    passive_dedupe + "\n\nfunction filterSemanticDuplicateDispatchRows_(",
    "cross-device passive dedupe helper",
)
backend = replace_once(
    backend,
    """    const prepared = filterSemanticDuplicateDispatchRows_(
      eventSheet,
      preparedRaw,
      batchId
    );
    prepared.activityRows = preparedRaw.activityRows || [];""",
    """    const passiveDeduped =
      filterCrossDevicePassiveObservationRows_(
        eventSheet,
        preparedRaw,
        batchId,
        playerId,
        deviceId
      );
    const prepared = filterSemanticDuplicateDispatchRows_(
      eventSheet,
      passiveDeduped,
      batchId
    );
    prepared.activityRows = preparedRaw.activityRows || [];""",
    "apply cross-device passive dedupe",
)

# ---------------------------------------------------------------------------
# Permanent regression coverage.
# ---------------------------------------------------------------------------
regression = r'''#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(
  new URL('../src/missionchief-command-nexus.user.js', import.meta.url),
  'utf8'
);
const backend = fs.readFileSync(
  new URL('../integrations/google-apps-script/Code.gs', import.meta.url),
  'utf8'
);

assert.match(source, /@version\s+1\.1\.12/);
assert.match(source, /MF_MISSION_LOGGER_CLIENT_VERSION = '1\.1\.12'/);
assert.match(source, /MF_MISSION_LOGGER_OBSERVER_LEASE_MS = 90000/);
assert.match(source, /submitMissionLoggerRequest\(\s*'observer-lease'/);
assert.match(source, /function isMissionLoggerPassiveObserverOwner\(/);
assert.match(source, /function flushMissionActivityBuffer\(/);
assert.match(source, /requestIdleCallback/);
assert.match(source, /MF_MISSION_LOGGER_ACTIVITY_BUFFER_MAX = 80/);
assert.match(source, /getMissionLoggerDeviceStagger/);
assert.match(source, /Math\.floor\(Math\.random\(\) \* 750\)/);
assert.match(
  source,
  /function recordMissionLoggerObservedEvent\(\)[\s\S]*?!isMissionLoggerPassiveObserverOwner\(\)/
);
assert.match(
  source,
  /function installMissionLoggerMissionGenerationCapture\(\)[\s\S]*?!isMissionLoggerPassiveObserverOwner\(\)/
);
assert.match(
  source,
  /activityCategory === 'NETWORK'[\s\S]*?!isMissionLoggerPassiveObserverOwner\(\)/
);
assert.doesNotMatch(
  source,
  /phase: 'START', outcome: 'STARTED'/
);

assert.match(backend, /buildId: '1\.1\.12-multi-device-performance-1'/);
assert.match(backend, /action === 'observer-lease'/);
assert.match(backend, /function handleLoggerObserverLease_\(/);
assert.match(backend, /multi-device-observer-lease/);
assert.match(backend, /cross-device-semantic-dedupe/);
assert.match(backend, /function filterCrossDevicePassiveObservationRows_\(/);
assert.match(backend, /filterCrossDevicePassiveObservationRows_\([\s\S]*?preparedRaw/);

// Contract model: the first device owns the passive lease, renews it, and a
// second computer can take over once the owner stops renewing.
function lease(existing, deviceId, now, leaseMs = 90000) {
  const granted =
    !existing || existing.expiresAt <= now || existing.deviceId === deviceId;
  return {
    granted,
    value: granted
      ? { deviceId, expiresAt: now + leaseMs }
      : existing
  };
}
let state = null;
let result = lease(state, 'device-a', 1000);
assert.equal(result.granted, true);
state = result.value;
result = lease(state, 'device-b', 2000);
assert.equal(result.granted, false);
result = lease(state, 'device-a', 3000);
assert.equal(result.granted, true);
state = result.value;
result = lease(state, 'device-b', state.expiresAt + 1);
assert.equal(result.granted, true);
assert.equal(result.value.deviceId, 'device-b');

// Contract model: only passive observations are cross-device deduped. Acting
// device dispatch evidence must always survive.
const existing = new Set(['419896|258500001|mission-observed']);
const events = [
  { player: '419896', mission: '258500001', type: 'mission-observed' },
  { player: '419896', mission: '258500001', type: 'dispatch' },
  { player: '419896', mission: '258500002', type: 'mission-observed' },
  { player: '419938', mission: '258500001', type: 'mission-observed' }
];
const kept = events.filter(event => {
  const key = `${event.player}|${event.mission}|${event.type}`;
  return event.type !== 'mission-observed' || !existing.has(key);
});
assert.equal(kept.length, 3);
assert.equal(kept.some(event => event.type === 'dispatch'), true);

console.log('v1.1.12 multi-device and performance regression passed');
'''
(ROOT / "scripts/check-multi-device-logger-v1112.mjs").write_text(
    regression,
    encoding="utf-8",
)

# ---------------------------------------------------------------------------
# Release documentation baselines.
# ---------------------------------------------------------------------------
changelog_path = ROOT / "CHANGELOG.md"
changelog = changelog_path.read_text(encoding="utf-8")
changelog = replace_once(
    changelog,
    """## [Unreleased]

No changes queued after `1.1.11`.""",
    """## [Unreleased]

No changes queued after `1.1.12`.

## [1.1.12] - 2026-08-19

### Fixed

- Added a short server-backed passive-observer lease per MissionChief player. Multiple computers can stay open, but only one records account-wide mission-list observations; every computer still records the dispatches, units, completions, credits and direct activity it performs.
- Added deterministic per-device upload staggering and retry jitter so two computers no longer repeatedly hit the private Apps Script lock on the same schedule.
- Added backend semantic suppression for duplicate cross-device `mission-observed` rows while preserving all dispatch evidence and stable same-batch retry checksums.

### Performance

- Buffered low-priority activity records in memory and writes them to the bounded local outbox in batches instead of parsing and rewriting the full localStorage queue for every click or network callback.
- Removed duplicate network request START activity rows. Successful routine network telemetry is recorded by the passive observer; failures remain recorded on every acting computer.

### Deployment

- Apps Script backend build `1.1.12-multi-device-performance-1` must be deployed as a **new version of the existing web-app deployment**. The existing `/exec` URL remains unchanged.""",
    "changelog v1.1.12 section",
)
changelog_path.write_text(changelog, encoding="utf-8")

for relative_path, old, new, label in [
    (
        "README.md",
        "**Current version:** `1.1.11`",
        "**Current version:** `1.1.12`",
        "README current version",
    ),
    (
        "docs/DEVELOPER_HANDOFF.md",
        "| Command Nexus version | `1.1.11` |",
        "| Command Nexus version | `1.1.12` |",
        "developer handoff version",
    ),
    (
        "docs/README.md",
        "current production baseline is Command Nexus `1.1.11`",
        "current production baseline is Command Nexus `1.1.12`",
        "docs baseline version",
    ),
    (
        "docs/ARCHITECTURE.md",
        "current MissionChief Command Nexus v1.1.11 production source",
        "current MissionChief Command Nexus v1.1.12 production source",
        "architecture baseline version",
    ),
    (
        "src/README.md",
        "Command Nexus `1.1.11`",
        "Command Nexus `1.1.12`",
        "source README version",
    ),
]:
    path = ROOT / relative_path
    text = path.read_text(encoding="utf-8")
    text = replace_once(text, old, new, label)
    path.write_text(text, encoding="utf-8")

apps_readme_path = ROOT / "integrations/google-apps-script/README.md"
apps_readme = apps_readme_path.read_text(encoding="utf-8")
apps_readme = apps_readme.replace(
    "1.1.10-upload-lock-hotfix-1",
    "1.1.12-multi-device-performance-1",
)
if "multi-device observer lease" not in apps_readme.lower():
    apps_readme += """

## v1.1.12 multi-device deployment

Deploy the merged `Code.gs` as a **new version of the existing web-app deployment**. Do not create a separate deployment: editing the existing deployment preserves the hardcoded `/exec` URL used by Command Nexus.

The v1.1.12 backend grants one short renewable passive-observer lease per MissionChief player and suppresses duplicate cross-device `mission-observed` rows. Each browser keeps its own device identity and continues to upload its own dispatches, selected units, completion and credit evidence.
"""
apps_readme_path.write_text(apps_readme, encoding="utf-8")

SOURCE_PATH.write_text(source, encoding="utf-8")
BACKEND_PATH.write_text(backend, encoding="utf-8")

print("Applied Command Nexus v1.1.12 multi-device and performance patch")
