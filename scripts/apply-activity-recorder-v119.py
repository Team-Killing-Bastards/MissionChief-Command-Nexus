#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'src/missionchief-command-nexus.user.js'
BACKEND = ROOT / 'integrations/google-apps-script/Code.gs'
CHANGELOG = ROOT / 'CHANGELOG.md'
README = ROOT / 'README.md'
PRIVATE_TEST = ROOT / 'scripts/check-private-url-logger-profile.mjs'
LOGGER_TEST = ROOT / 'scripts/check-mission-user-logger.mjs'
NEW_TEST = ROOT / 'scripts/check-activity-recorder-v119.mjs'


def die(message):
    raise SystemExit(f'PATCH ERROR: {message}')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        die(f'{label}: expected 1 exact match, found {count}')
    return text.replace(old, new, 1)


def replace_regex_once(text, pattern, replacement, label, flags=re.S):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        die(f'{label}: expected 1 regex match, found {count}')
    return updated


def function_slice(text, name):
    marker = f'    function {name}('
    start = text.find(marker)
    if start < 0:
        die(f'missing function {name}')
    next_start = text.find('\n    function ', start + len(marker))
    if next_start < 0:
        die(f'unable to bound function {name}')
    return start, next_start, text[start:next_start]


source = SRC.read_text(encoding='utf-8')
backend = BACKEND.read_text(encoding='utf-8')
changelog = CHANGELOG.read_text(encoding='utf-8')
readme = README.read_text(encoding='utf-8')
private_test = PRIVATE_TEST.read_text(encoding='utf-8')
logger_test = LOGGER_TEST.read_text(encoding='utf-8')

# ---------------------------------------------------------------------------
# Userscript version + automatic MissionChief identity.
# ---------------------------------------------------------------------------
source = replace_once(source, '// @version      1.1.8', '// @version      1.1.9', 'userscript metadata version')
source = replace_once(source, 'MODULE 2: MISSION FINDER V10.7.6', 'MODULE 2: MISSION FINDER V10.7.7', 'Mission Finder module version')
source = replace_once(source, "const MF_MISSION_LOGGER_CLIENT_VERSION = '1.1.8';", "const MF_MISSION_LOGGER_CLIENT_VERSION = '1.1.9';", 'logger client version')
source = replace_regex_once(
    source,
    r"(const MF_MISSION_LOGGER_MISSION_FINDER_VERSION\s*=\s*)'10\.7\.6';",
    r"\1'10.7.7';\n    const MF_MISSION_ACTIVITY_BACKEND_V2_KEY =\n        'mf_mission_activity_backend_v2';\n    const MF_MISSION_ACTIVITY_SESSION_KEY =\n        'mf_mission_activity_session_v2';\n    const MF_MISSION_ACTIVITY_SCHEMA_VERSION = 2;",
    'logger Mission Finder version + activity constants',
)

source = replace_regex_once(
    source,
    r"    function normaliseMissionLoggerProfileName\(value\) \{[\s\S]*?\n    \}\n\n    function readLegacyMissionLoggerIdentity",
    r'''    function normaliseMissionLoggerProfileName(value) {
        return String(value || '')
            .replace(/\u00a0/g, ' ')
            .replace(/[\u0000-\u001f\u007f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120);
    }

    function normaliseMissionLoggerProfileId(value) {
        const candidate = String(value || '').trim();
        return /^\d{1,20}$/.test(candidate) ? candidate : '';
    }

    function readLegacyMissionLoggerIdentity''',
    'profile name/id normalisers',
)

source = replace_regex_once(
    source,
    r"    function readMissionLoggerIdentity\(\) \{[\s\S]*?\n    \}\n\n    function writeMissionLoggerIdentity",
    r'''    function readMissionLoggerIdentity() {
        try {
            const parsed = JSON.parse(
                localStorage.getItem(
                    MF_MISSION_LOGGER_PROFILE_KEY
                ) || 'null'
            );
            if (!parsed || typeof parsed !== 'object') {
                return null;
            }

            const deviceId = String(parsed.deviceId || '')
                .replace(/[^A-Za-z0-9_-]/g, '')
                .slice(0, 160);
            if (!deviceId) return null;

            const detected = resolveMissionChiefNavbarIdentity();
            const storedName = normaliseMissionLoggerProfileName(
                parsed.playerName || parsed.legacyPlayerName
            );
            const playerName = normaliseMissionLoggerProfileName(
                detected?.playerName || storedName
            );
            const playerId = normaliseMissionLoggerProfileId(
                detected?.playerId || parsed.playerId || parsed.profileId
            );
            if (!playerName) return null;

            return {
                playerId,
                profileId: playerId,
                playerName,
                legacyPlayerName:
                    normaliseMissionLoggerProfileName(
                        parsed.legacyPlayerName || storedName || playerName
                    ) || playerName,
                deviceId,
                deviceLabel: String(
                    parsed.deviceLabel || 'MissionChief browser'
                ).slice(0, 120),
                configuredAt: String(parsed.configuredAt || '')
            };
        } catch (_error) {
            return null;
        }
    }

    function writeMissionLoggerIdentity''',
    'runtime navbar identity',
)

# Keep the capability marker profile-scoped so changing the private URL cannot
# accidentally stream v2 activity into an older deployment.
source = replace_once(
    source,
    '            MF_MISSION_LOGGER_QUEUE_KEY,\n',
    '            MF_MISSION_LOGGER_QUEUE_KEY,\n            MF_MISSION_ACTIVITY_BACKEND_V2_KEY,\n',
    'profile scoped activity capability reset',
)

start, end, save_fn = function_slice(source, 'saveMissionLoggerSetup')
save_fn = replace_regex_once(
    save_fn,
    r"        const playerName\s*=\s*normaliseMissionLoggerProfileName\(\s*options\.playerName\s*\);",
    '''        const detectedProfile = resolveMissionChiefNavbarIdentity();
        const playerName = normaliseMissionLoggerProfileName(
            detectedProfile?.playerName || options.playerName
        );
        const playerId = normaliseMissionLoggerProfileId(
            detectedProfile?.playerId
        );''',
    'save setup detected profile',
)
save_fn = replace_regex_once(
    save_fn,
    r"if \(!endpoint \|\| !playerName\)",
    'if (!endpoint || !playerName || !playerId)',
    'save setup requires numeric profile id',
)
save_fn = save_fn.replace(
    'A private Google logger URL and valid user are required.',
    'A private Google logger URL and a detected MissionChief profile are required.'
)
save_fn = replace_regex_once(
    save_fn,
    r"            profileId:\s*playerName\.toLowerCase\(\),\s*\n            playerName,",
    '''            playerId,
            profileId: playerId,
            playerName,
            legacyPlayerName:
                existing?.legacyPlayerName ||
                existing?.playerName ||
                playerName,''',
    'save stable MissionChief profile id',
)
source = source[:start] + save_fn + source[end:]

# Replace the manual Marty/Conroy selector with a read-only live navbar identity.
source = replace_regex_once(
    source,
    r'''<label class="mf2026-small" style="display:block;margin-top:8px;">\s*User\s*<select id="mf-mission-logger-player"[\s\S]*?</select>\s*</label>''',
    '''<label class="mf2026-small" style="display:block;margin-top:8px;">
                MissionChief user (detected automatically)
                <input id="mf-mission-logger-player"
                       type="text"
                       readonly
                       aria-readonly="true"
                       style="width:100%;box-sizing:border-box;margin-top:4px;color:black;padding:4px;border-radius:4px;border:none;background:#e9ecef;">
            </label>''',
    'automatic profile settings UI',
)
source = source.replace('Send my mission analytics automatically', 'Record my MissionChief activity automatically')
source = source.replace(
    'Passwords, cookies and personnel names are never collected.',
    'Passwords, cookies, auth tokens, entered text, clipboard contents, request bodies and personnel names are never collected.'
)

# Preserve the previous selected profile name only as a compatibility alias for
# an old backend. New backends use numeric profileId + current navbar username.
source = replace_once(
    source,
    '                        profileName: identity.playerName,\n                        deviceId: identity.deviceId,',
    '''                        profileName:
                            identity.legacyPlayerName ||
                            identity.playerName,
                        profileId: identity.playerId,
                        username: identity.playerName,
                        deviceId: identity.deviceId,''',
    'upload stable profile identity',
)
source = replace_once(
    source,
    '                if (\n                    response.batchId &&',
    '''                updateMissionActivityBackendCapability(response);

                if (
                    response.batchId &&''',
    'activity backend capability handshake',
)

RECORDER_BLOCK = r'''
    let mfMissionActivityRecorderInstalled = false;
    let mfMissionActivityHeartbeatTimer = null;
    const mfMissionActivityDocuments = new WeakSet();
    const mfMissionActivityWindows = new WeakSet();
    const mfMissionActivityFrames = new WeakSet();

    function resolveMissionChiefNavbarIdentity() {
        try {
            const rootDocument = window.top?.document || document;
            const link = rootDocument.querySelector('#navbar_profile_link');
            if (!link) return null;
            const url = new URL(
                link.getAttribute('href') || link.href || '',
                window.location.origin
            );
            if (url.origin !== window.location.origin) return null;
            const match = url.pathname.match(/^\/profile\/(\d+)\/?$/);
            const playerId = normaliseMissionLoggerProfileId(match?.[1]);
            const playerName = normaliseMissionLoggerProfileName(
                link.textContent || ''
            );
            return playerId && playerName
                ? { playerId, playerName }
                : null;
        } catch (_error) {
            return null;
        }
    }

    function isMissionActivityBackendReady() {
        return localStorage.getItem(
            MF_MISSION_ACTIVITY_BACKEND_V2_KEY
        ) === 'true';
    }

    function updateMissionActivityBackendCapability(response) {
        if (!response || typeof response !== 'object') return false;
        const supported =
            Number(response.activitySchemaVersion || 0) >=
                MF_MISSION_ACTIVITY_SCHEMA_VERSION ||
            /activity-recorder/i.test(String(response.backendBuild || ''));
        if (!supported) return false;
        const wasReady = isMissionActivityBackendReady();
        localStorage.setItem(MF_MISSION_ACTIVITY_BACKEND_V2_KEY, 'true');
        if (!wasReady) {
            recordMissionActivity('SYSTEM', 'LIFECYCLE', 'BACKEND_READY', {
                outcome: 'OK',
                payload: {
                    activitySchemaVersion:
                        MF_MISSION_ACTIVITY_SCHEMA_VERSION
                }
            });
            recordMissionActivity('SYSTEM', 'LIFECYCLE', 'SESSION_START', {
                outcome: 'OK',
                payload: getMissionActivitySessionTelemetry()
            });
        }
        return true;
    }

    function getMissionActivitySession() {
        let session = null;
        try {
            session = JSON.parse(
                sessionStorage.getItem(MF_MISSION_ACTIVITY_SESSION_KEY) ||
                    'null'
            );
        } catch (_error) {}
        if (
            session &&
            typeof session === 'object' &&
            /^[A-Za-z0-9_-]{8,180}$/.test(String(session.sessionId || ''))
        ) {
            return session;
        }
        session = {
            sessionId: createMissionLoggerId('session'),
            startedAt: new Date().toISOString()
        };
        try {
            sessionStorage.setItem(
                MF_MISSION_ACTIVITY_SESSION_KEY,
                JSON.stringify(session)
            );
        } catch (_error) {}
        return session;
    }

    function getMissionActivitySessionTelemetry(frameWindow = window) {
        const session = getMissionActivitySession();
        let viewport = '';
        let timezone = '';
        try {
            viewport =
                String(frameWindow.innerWidth || 0) + 'x' +
                String(frameWindow.innerHeight || 0);
            timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        } catch (_error) {}
        return {
            startedAt: session.startedAt,
            userAgent: String(navigator.userAgent || '').slice(0, 300),
            viewport: viewport.slice(0, 40),
            timezone: String(timezone).slice(0, 80)
        };
    }

    function sanitiseMissionActivityPath(value, frameWindow = window) {
        try {
            const url = new URL(String(value || ''), frameWindow.location.href);
            if (url.origin !== frameWindow.location.origin) return '';
            return String(url.pathname || '/').slice(0, 500);
        } catch (_error) {
            return '';
        }
    }

    function sanitiseMissionActivityPayload(payload) {
        if (!payload || typeof payload !== 'object') return {};
        const result = {};
        const forbidden = /password|passwd|token|cookie|authorization|secret|clipboard|requestbody|body|value|enteredtext/i;
        Object.entries(payload).slice(0, 16).forEach(([key, value]) => {
            const safeKey = String(key || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);
            if (!safeKey || forbidden.test(safeKey)) return;
            if (typeof value === 'number' && Number.isFinite(value)) {
                result[safeKey] = value;
            } else if (typeof value === 'boolean') {
                result[safeKey] = value;
            } else if (value !== null && value !== undefined) {
                result[safeKey] = String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 300);
            }
        });
        return result;
    }

    function getMissionActivityTarget(target, frameWindow = window) {
        const element = target?.nodeType === 1
            ? target
            : target?.parentElement || null;
        if (!element) return {};
        const tag = String(element.tagName || '').toLowerCase().slice(0, 30);
        const inputType = String(element.type || '').toLowerCase().slice(0, 40);
        const sensitive =
            tag === 'textarea' ||
            tag === 'select' ||
            element.isContentEditable ||
            tag === 'input';
        let label = '';
        if (!sensitive) {
            label = cleanText(
                element.getAttribute?.('aria-label') ||
                element.textContent ||
                element.getAttribute?.('title') ||
                ''
            ).slice(0, 160);
        }
        const href = sanitiseMissionActivityPath(
            element.closest?.('a[href]')?.getAttribute('href') || '',
            frameWindow
        );
        return {
            tag,
            id: String(element.id || '').slice(0, 120),
            label,
            href,
            inputType,
            inputName: sensitive
                ? String(element.getAttribute?.('name') || '').slice(0, 120)
                : '',
            surface:
                element.closest?.(
                    '#mission-finder-wrapper,#vehicle-load-list-box,#patient-transfer-list-box,[id^="mc-namer-"]'
                )
                    ? 'NEXUS'
                    : 'MISSIONCHIEF'
        };
    }

    function getMissionActivityRouteContext(frameWindow, target) {
        const route = sanitiseMissionActivityPath(
            frameWindow?.location?.href || window.location.href,
            frameWindow || window
        );
        const href = String(target?.href || '');
        const source = href || route;
        const idFor = pattern => String(source.match(pattern)?.[1] || '').slice(0, 80);
        return {
            route,
            missionId: idFor(/\/missions\/(\d+)/),
            vehicleId: idFor(/\/vehicles\/(\d+)/),
            patientId: idFor(/\/patient\/(\d+)/),
            stationId: idFor(/\/buildings\/(\d+)/)
        };
    }

    function recordMissionActivity(source, category, action, details = {}) {
        if (
            !MF_IS_TOP_WINDOW ||
            !mfMissionLoggerEnabled ||
            !mfMissionLoggerEndpoint ||
            !isMissionActivityBackendReady()
        ) return false;
        const identity = readMissionLoggerIdentity();
        if (!identity?.playerName || !identity?.deviceId) return false;
        const frameWindow = details.frameWindow || window;
        const target = details.target || {};
        const context = getMissionActivityRouteContext(frameWindow, target);
        const session = getMissionActivitySession();
        return queueMissionLoggerEvent({
            eventId: createMissionLoggerId('activity'),
            eventType: 'activity',
            capturedAt: new Date().toISOString(),
            missionId: details.missionId || context.missionId || '',
            metadata: {
                activity: {
                    sessionId: session.sessionId,
                    source: String(source || 'SYSTEM').slice(0, 40),
                    category: String(category || 'GENERAL').slice(0, 60),
                    action: String(action || 'UNKNOWN').slice(0, 100),
                    phase: String(details.phase || '').slice(0, 40),
                    outcome: String(details.outcome || 'OBSERVED').slice(0, 40),
                    route: details.route || context.route,
                    missionId: details.missionId || context.missionId || '',
                    vehicleId: details.vehicleId || context.vehicleId || '',
                    patientId: details.patientId || context.patientId || '',
                    stationId: details.stationId || context.stationId || '',
                    dispatchCentreId: String(details.dispatchCentreId || '').slice(0, 80),
                    targetTag: target.tag || '',
                    targetId: target.id || '',
                    targetLabel: target.label || '',
                    targetHref: target.href || '',
                    inputType: target.inputType || '',
                    correlationId: String(details.correlationId || '').slice(0, 180),
                    durationMs:
                        Number.isFinite(Number(details.durationMs))
                            ? Math.max(0, Math.round(Number(details.durationMs)))
                            : '',
                    attempt:
                        Number.isFinite(Number(details.attempt))
                            ? Math.max(0, Math.round(Number(details.attempt)))
                            : '',
                    message: String(details.message || '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 300),
                    payload: sanitiseMissionActivityPayload(details.payload),
                    schemaVersion: MF_MISSION_ACTIVITY_SCHEMA_VERSION,
                    privacyClass: details.privacyClass || 'SAFE_METADATA'
                }
            }
        });
    }

    function missionActivitySourceForEvent(event, target) {
        if (event?.isTrusted) return 'USER';
        return target?.surface === 'NEXUS' ? 'NEXUS' : 'MISSIONCHIEF';
    }

    function recordMissionActivityDomEvent(event, frameWindow) {
        const target = getMissionActivityTarget(event?.target, frameWindow);
        const type = String(event?.type || '').toUpperCase();
        if (!type) return;
        if (type === 'KEYDOWN') {
            const key = String(event.key || '');
            const safeKeys = new Set([
                'Enter','Escape','Tab','Backspace','Delete','ArrowUp','ArrowDown',
                'ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' '
            ]);
            if (!safeKeys.has(key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
                return;
            }
            recordMissionActivity('USER', 'INTERACTION', 'KEYDOWN', {
                frameWindow,
                target,
                payload: {
                    key: safeKeys.has(key) ? key : 'MODIFIER_SHORTCUT',
                    ctrl: !!event.ctrlKey,
                    meta: !!event.metaKey,
                    alt: !!event.altKey,
                    shift: !!event.shiftKey
                }
            });
            return;
        }
        recordMissionActivity(
            missionActivitySourceForEvent(event, target),
            'INTERACTION',
            type,
            { frameWindow, target }
        );
    }

    function patchMissionActivityWindow(frameWindow) {
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
                    recordMissionActivity('MISSIONCHIEF', 'NETWORK', 'FETCH', {
                        frameWindow, route, phase: 'START', outcome: 'STARTED',
                        correlationId, payload: { method }
                    });
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
                    recordMissionActivity('MISSIONCHIEF', 'NETWORK', 'XHR', {
                        frameWindow, route: request.route, phase: 'START',
                        outcome: 'STARTED', correlationId,
                        payload: { method: request.method }
                    });
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
    }

    function attachMissionActivityDocument(frameDocument, frameWindow) {
        if (!frameDocument || mfMissionActivityDocuments.has(frameDocument)) return;
        mfMissionActivityDocuments.add(frameDocument);
        patchMissionActivityWindow(frameWindow);
        ['click','dblclick','contextmenu','change','submit','focusin','focusout','dragstart','drop','keydown']
            .forEach(type => {
                frameDocument.addEventListener(
                    type,
                    event => recordMissionActivityDomEvent(event, frameWindow),
                    true
                );
            });
        frameDocument.addEventListener('visibilitychange', () => {
            recordMissionActivity('SYSTEM', 'LIFECYCLE', 'VISIBILITY_' +
                String(frameDocument.visibilityState || 'unknown').toUpperCase(), {
                frameWindow,
                payload: { state: frameDocument.visibilityState || 'unknown' }
            });
        });
    }

    function installMissionActivityFrame(frame) {
        if (!frame || mfMissionActivityFrames.has(frame)) return;
        mfMissionActivityFrames.add(frame);
        const attach = () => {
            try {
                if (frame.contentWindow?.location?.origin !== window.location.origin) return;
                attachMissionActivityDocument(
                    frame.contentDocument,
                    frame.contentWindow
                );
            } catch (_error) {}
        };
        frame.addEventListener('load', attach, true);
        attach();
    }

    function installMissionActivityRecorder() {
        if (!MF_IS_TOP_WINDOW || mfMissionActivityRecorderInstalled) return;
        mfMissionActivityRecorderInstalled = true;
        attachMissionActivityDocument(document, window);
        document.querySelectorAll('iframe').forEach(installMissionActivityFrame);
        new MutationObserver(records => {
            records.forEach(record => {
                Array.from(record.addedNodes || []).forEach(node => {
                    if (node?.nodeType !== 1) return;
                    if (node.tagName === 'IFRAME') installMissionActivityFrame(node);
                    node.querySelectorAll?.('iframe').forEach(installMissionActivityFrame);
                });
            });
        }).observe(document.documentElement, { childList: true, subtree: true });
        if (isMissionActivityBackendReady()) {
            recordMissionActivity('SYSTEM', 'LIFECYCLE', 'PAGE_LOAD', {
                outcome: 'OK',
                payload: getMissionActivitySessionTelemetry()
            });
        }
        window.addEventListener('pagehide', () => {
            recordMissionActivity('SYSTEM', 'LIFECYCLE', 'PAGEHIDE', {
                outcome: 'OK'
            });
        });
        mfMissionActivityHeartbeatTimer = setInterval(() => {
            recordMissionActivity('SYSTEM', 'LIFECYCLE', 'HEARTBEAT', {
                outcome: 'OK'
            });
        }, 60 * 1000);
    }
'''

source = replace_once(
    source,
    '    function queueMissionLoggerEvent(event) {',
    RECORDER_BLOCK + '\n    function queueMissionLoggerEvent(event) {',
    'activity recorder insertion',
)
source = replace_once(
    source,
    "        installMissionLoggerStorageListener();\n        installMissionLoggerDispatchCapture();\n        recordMissionLoggerObservedEvent();",
    "        installMissionLoggerStorageListener();\n        installMissionLoggerDispatchCapture();\n        installMissionActivityRecorder();\n        recordMissionLoggerObservedEvent();",
    'activity recorder initialisation',
)

# ---------------------------------------------------------------------------
# Apps Script backend: numeric profile IDs, raw activity ledger, sessions and
# weekly archive extension. Keep envelope schema v1 for old clients; activity
# records advertise their own schema v2 capability.
# ---------------------------------------------------------------------------
backend = replace_once(
    backend,
    "  buildId: '1.1.6-private-profile-1',",
    "  buildId: '1.1.9-activity-recorder-2',\n  activitySchemaVersion: 2,",
    'backend build id',
)

NEW_SHEETS = r'''  sessions: Object.freeze({
    name: 'Sessions',
    headers: Object.freeze([
      'session_id','player_id','username','device_id','client_version',
      'started_at','last_seen_at','ended_at','start_route','last_route',
      'user_agent','viewport','timezone','auto_mode_runs','user_actions',
      'nexus_actions','missionchief_actions','system_events','event_count','status'
    ])
  }),
  activity: Object.freeze({
    name: 'Activity Log',
    headers: Object.freeze([
      'activity_id','event_time','received_at','player_id','username','device_id',
      'session_id','source','category','action','phase','outcome','route','mission_id',
      'vehicle_id','patient_id','station_id','dispatch_centre_id','target_tag','target_id',
      'target_label','target_href','input_type','correlation_id','duration_ms','attempt',
      'message','payload_json','client_version','schema_version','privacy_class','batch_id'
    ])
  }),
  actionSummary: Object.freeze({
    name: 'Action Summary',
    headers: Object.freeze([
      'period_date','player_id','username','source','category','action','outcome',
      'event_count','first_event_at','last_event_at','total_duration_ms',
      'avg_duration_ms','failed_count','session_count','last_rebuilt_at'
    ])
  }),
'''
backend = replace_once(backend, '  events: Object.freeze({', NEW_SHEETS + '  events: Object.freeze({', 'backend activity sheet definitions')
backend = replace_once(
    backend,
    "      'cell_count',\n      'notes'",
    "      'cell_count',\n      'notes',\n      'activity_rows',\n      'session_rows',\n      'action_summary_rows'",
    'archive index activity counts',
)
backend = replace_once(
    backend,
    ".addItem('Rebuild mission summary + dashboard', 'rebuildMissionChiefMissionSummary')\n    .addToUi();",
    ".addItem('Rebuild mission summary + dashboard', 'rebuildMissionChiefMissionSummary')\n    .addItem('Rebuild activity summary', 'rebuildMissionChiefActivitySummary')\n    .addToUi();",
    'activity summary admin menu',
)
backend = replace_once(
    backend,
    "        'batch-ledger'\n      ],",
    "        'batch-ledger',\n        'activity-recorder',\n        'navbar-profile-id'\n      ],\n      activitySchemaVersion: MC_LOGGER.activitySchemaVersion,",
    'backend feature advertisement',
)
backend = replace_once(
    backend,
    "  response.backendBuild = MC_LOGGER.buildId;",
    "  response.backendBuild = MC_LOGGER.buildId;\n  response.activitySchemaVersion = MC_LOGGER.activitySchemaVersion;",
    'upload capability response',
)
backend = backend.replace(
    'MissionChief logger is initialised. Deploy this Apps Script project as a new private web app, then save that URL and a user name in Nexus.',
    'MissionChief logger is initialised. Deploy this Apps Script project as a new private web app, then save that URL in Nexus. The logged-in MissionChief profile is detected automatically.'
)

# Profile routing: keep legacy name fallback for old clients, prefer numeric id.
backend = replace_once(
    backend,
    "  const profileName = cleanText_(\n    payload.profileName || payload.playerName,\n    120\n  );",
    "  const legacyProfileName = cleanText_(\n    payload.profileName || payload.playerName,\n    120\n  );\n  const profileName = cleanText_(\n    payload.username || payload.playerName || legacyProfileName,\n    120\n  );\n  const profileId = cleanMissionChiefProfileId_(\n    payload.profileId || payload.playerId\n  );",
    'backend profile id/name payload',
)
backend = replace_once(
    backend,
    '  if (!batchId || !profileName || !deviceId) {',
    '  if (!batchId || !deviceId || (!profileId && !legacyProfileName && !profileName)) {',
    'backend upload identity validation',
)
backend = replace_once(
    backend,
    "      'The private logger URL, user name or batch identifier is invalid.'",
    "      'The private logger URL, MissionChief profile or batch identifier is invalid.'",
    'backend upload identity error',
)
backend = replace_once(
    backend,
    "    const profile = resolveActiveLoggerProfile_(\n      spreadsheet,\n      profileName\n    );\n    const playerId = profile.playerId;\n    const receivedAt = new Date();",
    "    const receivedAt = new Date();\n    const profile = profileId\n      ? resolveOrCreateMissionChiefNavbarProfile_(\n          spreadsheet, profileId, profileName, receivedAt\n        )\n      : resolveActiveLoggerProfile_(\n          spreadsheet, legacyProfileName || profileName\n        );\n    const playerId = profile.playerId;",
    'backend profile resolution',
)
backend = replace_once(
    backend,
    "    const eventSheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.events.name);\n    const unitSheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.units.name);\n    const uploadSheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.uploads.name);\n    const preparedRaw = prepareLoggerBatchRows_(\n      events,",
    "    const eventSheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.events.name);\n    const unitSheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.units.name);\n    const uploadSheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.uploads.name);\n    const activitySheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.activity.name);\n    const activityEvents = events.filter(function(rawEvent) {\n      return String(rawEvent && rawEvent.eventType || '').toLowerCase() === 'activity';\n    });\n    const missionEvents = events.filter(function(rawEvent) {\n      return String(rawEvent && rawEvent.eventType || '').toLowerCase() !== 'activity';\n    });\n    const preparedRaw = prepareLoggerBatchRows_(\n      missionEvents,",
    'split activity from mission events',
)
backend = replace_once(
    backend,
    "      receivedAt\n    );\n    const batchChecksum = createLoggerBatchChecksum_(",
    "      receivedAt\n    );\n    preparedRaw.activityRows = prepareLoggerActivityRows_(\n      activityEvents, batchId, playerId, profile.displayName,\n      deviceId, clientVersion, receivedAt\n    );\n    const batchChecksum = createLoggerBatchChecksum_(",
    'prepare activity rows',
)
backend = replace_once(
    backend,
    "    const duplicateRows = findAllRowsByValue_(eventSheet, 2, batchId);\n    const ledgerRecord = findLoggerBatchLedgerRecord_(",
    "    const duplicateRows = findAllRowsByValue_(eventSheet, 2, batchId);\n    const activityBatchRows = findAllRowsByValue_(activitySheet, 32, batchId);\n    const ledgerRecord = findLoggerBatchLedgerRecord_(",
    'activity batch duplicate tracing',
)
backend = replace_once(
    backend,
    '      if (duplicateRows.length === 0) {',
    '      if (duplicateRows.length === 0 && activityBatchRows.length === 0) {',
    'archived batch detection includes activity',
)
backend = replace_once(
    backend,
    "    const prepared = filterSemanticDuplicateDispatchRows_(\n      eventSheet,\n      preparedRaw,\n      batchId\n    );",
    "    const prepared = filterSemanticDuplicateDispatchRows_(\n      eventSheet,\n      preparedRaw,\n      batchId\n    );\n    prepared.activityRows = preparedRaw.activityRows || [];",
    'retain activity rows after mission dedupe',
)

# Add activity writes in both duplicate-repair and normal accepted paths.
backend = replace_once(
    backend,
    '      appendRows_(unitSheet, missingUnitRows);',
    "      appendRows_(unitSheet, missingUnitRows);\n      const appendedActivityRows = appendLoggerActivityRows_(\n        activitySheet, prepared.activityRows\n      );\n      upsertLoggerSessions_(spreadsheet, appendedActivityRows);\n      maybeRebuildLoggerActionSummary_(spreadsheet, receivedAt);",
    'duplicate branch activity append',
)
backend = replace_once(
    backend,
    '    appendRows_(eventSheet, prepared.eventRows);\n    appendRows_(unitSheet, prepared.unitRows);',
    "    const appendedActivityRows = appendLoggerActivityRows_(\n      activitySheet, prepared.activityRows\n    );\n    upsertLoggerSessions_(spreadsheet, appendedActivityRows);\n    maybeRebuildLoggerActionSummary_(spreadsheet, receivedAt);\n    appendRows_(eventSheet, prepared.eventRows);\n    appendRows_(unitSheet, prepared.unitRows);",
    'normal branch activity append',
)

# Counts in Uploads, ledger and responses represent the complete batch.
handle_match = re.search(r'function handleLoggerUpload_\(payload\) \{[\s\S]*?\n\}\n\nfunction prepareLoggerBatchRows_', backend)
if not handle_match:
    die('unable to bound handleLoggerUpload_ for event count patch')
handle = handle_match.group(0)
handle = handle.replace('preparedRaw.eventRows.length', 'preparedRaw.eventRows.length + (preparedRaw.activityRows || []).length')
handle = handle.replace('prepared.eventRows.length', 'prepared.eventRows.length + (prepared.activityRows || []).length')
backend = backend[:handle_match.start()] + handle + backend[handle_match.end():]

# Activity rows are part of the idempotent batch checksum.
backend = replace_once(
    backend,
    "  const unitIdentities = (prepared.unitRows || [])\n    .map(loggerUnitIdentity_)\n    .sort();\n  return sha256_(JSON.stringify([\n    String(playerId || ''),\n    String(deviceId || ''),\n    eventIdentities,\n    unitIdentities\n  ]));",
    "  const unitIdentities = (prepared.unitRows || [])\n    .map(loggerUnitIdentity_)\n    .sort();\n  const activityIdentities = (prepared.activityRows || []).map(function(row) {\n    return [row[0], row[1] instanceof Date ? row[1].toISOString() : row[1], row[6], row[9], row[11]];\n  }).sort();\n  return sha256_(JSON.stringify([\n    String(playerId || ''),\n    String(deviceId || ''),\n    eventIdentities,\n    unitIdentities,\n    activityIdentities\n  ]));",
    'activity batch checksum',
)

PROFILE_HELPER = r'''
function resolveOrCreateMissionChiefNavbarProfile_(spreadsheet, profileId, username, timestamp) {
  const stableId = cleanMissionChiefProfileId_(profileId);
  const displayName = cleanText_(username, 120);
  if (!stableId || !displayName) {
    throw loggerError_('INVALID_PROFILE', 'A numeric MissionChief profile ID and username are required.');
  }
  const players = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.players.name);
  const rowNumber = findRowByValue_(players, 1, stableId);
  if (rowNumber) {
    const values = players.getRange(rowNumber, 1, 1, MC_LOGGER_SHEETS.players.headers.length).getValues()[0];
    if (String(values[2] || '').toUpperCase() !== 'ACTIVE') {
      throw loggerError_('PLAYER_DISABLED', 'The MissionChief logger player profile is disabled.');
    }
    if (String(values[1] || '') !== displayName) {
      players.getRange(rowNumber, 2).setValue(safeSheetText_(displayName));
    }
    if (timestamp) players.getRange(rowNumber, 5).setValue(timestamp);
    return { row: rowNumber, playerId: stableId, displayName: displayName };
  }

  players.appendRow([
    safeSheetText_(stableId),
    safeSheetText_(displayName),
    'ACTIVE',
    timestamp || new Date(),
    timestamp || new Date(),
    0,
    'Auto-created from #navbar_profile_link'
  ]);
  return {
    row: players.getLastRow(),
    playerId: stableId,
    displayName: displayName
  };
}
'''
backend = replace_once(
    backend,
    'function createPairingForPlayer_(spreadsheet, playerId) {',
    PROFILE_HELPER + '\nfunction createPairingForPlayer_(spreadsheet, playerId) {',
    'numeric navbar profile resolver',
)
backend = replace_once(
    backend,
    'function cleanIdentifier_(value, maxLength) {',
    "function cleanMissionChiefProfileId_(value) {\n  const candidate = String(value || '').trim();\n  return /^\\d{1,20}$/.test(candidate) ? candidate : '';\n}\n\nfunction cleanIdentifier_(value, maxLength) {",
    'numeric MissionChief profile cleaner',
)

ACTIVITY_HELPERS = r'''
function prepareLoggerActivityRows_(events, batchId, playerId, username, deviceId, clientVersion, receivedAt) {
  const rows = [];
  const seen = {};
  (Array.isArray(events) ? events : []).forEach(function(rawEvent) {
    if (!rawEvent || typeof rawEvent !== 'object') {
      throw loggerError_('INVALID_ACTIVITY', 'An activity event is not an object.');
    }
    const activityId = cleanIdentifier_(rawEvent.eventId, 180);
    if (!activityId || seen[activityId]) {
      throw loggerError_('INVALID_ACTIVITY_ID', 'An activity identifier is missing or duplicated in the batch.');
    }
    seen[activityId] = true;
    const eventTime = parseLoggerDate_(rawEvent.capturedAt);
    const metadata = rawEvent.metadata && typeof rawEvent.metadata === 'object' ? rawEvent.metadata : {};
    const activity = metadata.activity && typeof metadata.activity === 'object' ? metadata.activity : {};
    const payload = activity.payload && typeof activity.payload === 'object' ? activity.payload : {};
    rows.push([
      safeSheetText_(activityId), eventTime, receivedAt,
      safeSheetText_(playerId), safeSheetText_(username), safeSheetText_(deviceId),
      safeSheetText_(cleanIdentifier_(activity.sessionId, 180)),
      safeSheetText_(cleanText_(activity.source, 40)),
      safeSheetText_(cleanText_(activity.category, 60)),
      safeSheetText_(cleanText_(activity.action, 100)),
      safeSheetText_(cleanText_(activity.phase, 40)),
      safeSheetText_(cleanText_(activity.outcome, 40)),
      safeSheetText_(cleanText_(activity.route, 500)),
      safeSheetText_(cleanIdentifier_(activity.missionId || rawEvent.missionId, 80)),
      safeSheetText_(cleanIdentifier_(activity.vehicleId, 80)),
      safeSheetText_(cleanIdentifier_(activity.patientId, 80)),
      safeSheetText_(cleanIdentifier_(activity.stationId, 80)),
      safeSheetText_(cleanIdentifier_(activity.dispatchCentreId, 80)),
      safeSheetText_(cleanText_(activity.targetTag, 30)),
      safeSheetText_(cleanText_(activity.targetId, 120)),
      safeSheetText_(cleanText_(activity.targetLabel, 160)),
      safeSheetText_(cleanText_(activity.targetHref, 500)),
      safeSheetText_(cleanText_(activity.inputType, 40)),
      safeSheetText_(cleanIdentifier_(activity.correlationId, 180)),
      cleanNumberOrBlank_(activity.durationMs, 0, 86400000),
      cleanNumberOrBlank_(activity.attempt, 0, 1000),
      safeSheetText_(cleanText_(activity.message, 300)),
      safeSheetText_(safeJson_(payload)),
      safeSheetText_(clientVersion),
      cleanNumberOrBlank_(activity.schemaVersion, 1, 100),
      safeSheetText_(cleanText_(activity.privacyClass, 80) || 'SAFE_METADATA'),
      safeSheetText_(batchId)
    ]);
  });
  return rows;
}

function appendLoggerActivityRows_(sheet, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const existing = {};
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const start = Math.max(2, lastRow - 4999);
    sheet.getRange(start, 1, lastRow - start + 1, 1).getDisplayValues()
      .forEach(function(values) { existing[String(values[0] || '')] = true; });
  }
  const fresh = rows.filter(function(row) {
    const id = String(row[0] || '');
    if (!id || existing[id]) return false;
    existing[id] = true;
    return true;
  });
  appendRows_(sheet, fresh);
  return fresh;
}

function readLoggerActivityPayload_(row) {
  try {
    const parsed = JSON.parse(String(row && row[27] || '{}'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function upsertLoggerSessions_(spreadsheet, activityRows) {
  if (!Array.isArray(activityRows) || activityRows.length === 0) return 0;
  const sheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.sessions.name);
  const width = MC_LOGGER_SHEETS.sessions.headers.length;
  const existingRows = sheet.getLastRow() >= 2
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues()
    : [];
  const rowsById = {};
  existingRows.forEach(function(row, index) {
    rowsById[String(row[0] || '')] = { rowNumber: index + 2, values: row };
  });
  const touched = {};
  activityRows.forEach(function(activity) {
    const sessionId = cleanIdentifier_(activity[6], 180);
    if (!sessionId) return;
    if (!touched[sessionId]) {
      const existing = rowsById[sessionId];
      touched[sessionId] = {
        rowNumber: existing ? existing.rowNumber : 0,
        values: existing ? existing.values.slice() : new Array(width).fill('')
      };
    }
    const row = touched[sessionId].values;
    const eventTime = loggerDateOrNull_(activity[1]) || new Date();
    const payload = readLoggerActivityPayload_(activity);
    row[0] = sessionId;
    row[1] = activity[3];
    row[2] = activity[4];
    row[3] = activity[5];
    row[4] = activity[28];
    row[5] = loggerEarlierDate_(row[5], payload.startedAt || eventTime) || eventTime;
    row[6] = loggerLaterDate_(row[6], eventTime) || eventTime;
    if (!row[8]) row[8] = activity[12];
    row[9] = activity[12];
    row[10] = payload.userAgent || row[10] || '';
    row[11] = payload.viewport || row[11] || '';
    row[12] = payload.timezone || row[12] || '';
    const source = String(activity[7] || '').toUpperCase();
    if (source === 'USER') row[14] = loggerNumber_(row[14], 0) + 1;
    else if (source === 'NEXUS') row[15] = loggerNumber_(row[15], 0) + 1;
    else if (source === 'MISSIONCHIEF') row[16] = loggerNumber_(row[16], 0) + 1;
    else row[17] = loggerNumber_(row[17], 0) + 1;
    if (String(activity[9] || '').toUpperCase() === 'AUTO_MODE_START') {
      row[13] = loggerNumber_(row[13], 0) + 1;
    }
    row[18] = loggerNumber_(row[18], 0) + 1;
    const action = String(activity[9] || '').toUpperCase();
    row[19] = action === 'PAGEHIDE' || action === 'VISIBILITY_HIDDEN'
      ? 'IDLE'
      : 'ACTIVE';
  });
  const newRows = [];
  Object.keys(touched).forEach(function(sessionId) {
    const entry = touched[sessionId];
    if (entry.rowNumber) sheet.getRange(entry.rowNumber, 1, 1, width).setValues([entry.values]);
    else newRows.push(entry.values);
  });
  appendRows_(sheet, newRows);
  return Object.keys(touched).length;
}

function rebuildLoggerActionSummary_(spreadsheet, rebuiltAt) {
  const source = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.activity.name);
  const target = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.actionSummary.name);
  const rows = source.getLastRow() >= 2
    ? source.getRange(2, 1, source.getLastRow() - 1, MC_LOGGER_SHEETS.activity.headers.length).getValues()
    : [];
  const groups = {};
  rows.forEach(function(row) {
    const eventTime = loggerDateOrNull_(row[1]);
    if (!eventTime) return;
    const day = Utilities.formatDate(eventTime, MC_LOGGER.timezone, 'yyyy-MM-dd');
    const key = [day, row[3], row[7], row[8], row[9], row[11]].map(String).join('|');
    if (!groups[key]) {
      groups[key] = {
        day: day, playerId: row[3], username: row[4], source: row[7], category: row[8],
        action: row[9], outcome: row[11], count: 0, first: eventTime, last: eventTime,
        durationTotal: 0, durationCount: 0, failed: 0, sessions: {}
      };
    }
    const group = groups[key];
    group.count += 1;
    if (eventTime.getTime() < group.first.getTime()) group.first = eventTime;
    if (eventTime.getTime() > group.last.getTime()) group.last = eventTime;
    if (row[24] !== '' && Number.isFinite(Number(row[24]))) {
      group.durationTotal += Number(row[24]);
      group.durationCount += 1;
    }
    if (/FAILED|ERROR|REJECTED|TIMEOUT/i.test(String(row[11] || ''))) group.failed += 1;
    if (row[6]) group.sessions[String(row[6])] = true;
  });
  clearLoggerSheetData_(target);
  const output = Object.keys(groups).sort().map(function(key) {
    const group = groups[key];
    return [
      group.day, group.playerId, group.username, group.source, group.category,
      group.action, group.outcome, group.count, group.first, group.last,
      Math.round(group.durationTotal),
      group.durationCount ? Math.round(group.durationTotal / group.durationCount) : '',
      group.failed, Object.keys(group.sessions).length, rebuiltAt || new Date()
    ];
  });
  appendRows_(target, output);
  return output.length;
}

function maybeRebuildLoggerActionSummary_(spreadsheet, now) {
  const timestamp = now || new Date();
  const properties = PropertiesService.getScriptProperties();
  const key = 'MISSIONCHIEF_ACTIVITY_SUMMARY_REBUILT_AT';
  const previous = loggerDateOrNull_(properties.getProperty(key));
  if (previous && timestamp.getTime() - previous.getTime() < 15 * 60 * 1000) return false;
  rebuildLoggerActionSummary_(spreadsheet, timestamp);
  properties.setProperty(key, timestamp.toISOString());
  return true;
}

function rebuildMissionChiefActivitySummary() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = getLoggerSpreadsheet_();
    ensureLoggerWorkbook_(spreadsheet);
    const count = rebuildLoggerActionSummary_(spreadsheet, new Date());
    SpreadsheetApp.flush();
    SpreadsheetApp.getUi().alert('Activity summary rebuilt', count + ' grouped action rows are available.', SpreadsheetApp.getUi().ButtonSet.OK);
  } finally {
    lock.releaseLock();
  }
}
'''
backend = replace_once(
    backend,
    'function prepareLoggerBatchRows_(events, batchId, playerId, deviceId, receivedAt) {',
    ACTIVITY_HELPERS + '\nfunction prepareLoggerBatchRows_(events, batchId, playerId, deviceId, receivedAt) {',
    'backend activity/session helpers',
)

# Configuration contract.
backend = replace_once(
    backend,
    "    ['identity_mode', 'PRIVATE_URL_AND_PLAYER_NAME', 'The private deployment URL plus an active Players display name authorises uploads on any browser.'],",
    "    ['identity_mode', 'NAVBAR_PROFILE_ID_AND_USERNAME', 'The private deployment URL plus the numeric MissionChief #navbar_profile_link profile ID identifies the user; the visible username is retained as the current display name.'],\n    ['activity_schema_version', MC_LOGGER.activitySchemaVersion, 'Safe activity metadata schema emitted by Command Nexus after backend capability acknowledgement.'],\n    ['activity_capture', 'SAFE_ACTIVITY_METADATA_V2', 'Captures user, Nexus, MissionChief network/navigation and system lifecycle/error actions without entered values, credentials, cookies, request bodies or clipboard data.'],",
    'logger v2 identity configuration',
)

# Weekly archive: new activity/session/summary tables are copied, verified and only
# then purged using the same locked lifecycle as mission data.
backend = replace_once(
    backend,
    "    MC_LOGGER_SHEETS.summaries,\n    MC_LOGGER_SHEETS.events,\n    MC_LOGGER_SHEETS.units,\n    MC_LOGGER_SHEETS.uploads,\n    MC_LOGGER_ARCHIVE_MANIFEST",
    "    MC_LOGGER_SHEETS.summaries,\n    MC_LOGGER_SHEETS.events,\n    MC_LOGGER_SHEETS.units,\n    MC_LOGGER_SHEETS.uploads,\n    MC_LOGGER_SHEETS.activity,\n    MC_LOGGER_SHEETS.sessions,\n    MC_LOGGER_SHEETS.actionSummary,\n    MC_LOGGER_ARCHIVE_MANIFEST",
    'weekly archive sheet creation',
)
backend = replace_once(
    backend,
    "  if (definitionKey === 'uploads') {\n    const receivedAt = loggerDateOrNull_(row[3]);",
    "  if (definitionKey === 'activity') return String(row[0] || '');\n  if (definitionKey === 'sessions') return String(row[0] || '');\n  if (definitionKey === 'actionSummary') {\n    return [row[0], row[1], row[3], row[4], row[5], row[6]].map(String).join('|');\n  }\n  if (definitionKey === 'uploads') {\n    const receivedAt = loggerDateOrNull_(row[3]);",
    'weekly archive activity identities',
)
backend = replace_once(
    backend,
    "  if (definitionKey === 'uploads') return loggerDateOrNull_(row[3]);\n  return null;",
    "  if (definitionKey === 'uploads') return loggerDateOrNull_(row[3]);\n  if (definitionKey === 'activity') return loggerDateOrNull_(row[1]);\n  if (definitionKey === 'sessions') return loggerDateOrNull_(row[7]) || loggerDateOrNull_(row[6]) || loggerDateOrNull_(row[5]);\n  if (definitionKey === 'actionSummary') return loggerDateOrNull_(row[0]);\n  return null;",
    'weekly archive activity dates',
)
backend = replace_once(
    backend,
    "    uploads: MC_LOGGER_SHEETS.uploads\n  };",
    "    uploads: MC_LOGGER_SHEETS.uploads,\n    activity: MC_LOGGER_SHEETS.activity,\n    sessions: MC_LOGGER_SHEETS.sessions,\n    actionSummary: MC_LOGGER_SHEETS.actionSummary\n  };",
    'weekly archive activity verification',
)
backend = replace_once(
    backend,
    "    uploads: Math.max(0, archive.getSheetByName(MC_LOGGER_SHEETS.uploads.name).getLastRow() - 1)\n  };",
    "    uploads: Math.max(0, archive.getSheetByName(MC_LOGGER_SHEETS.uploads.name).getLastRow() - 1),\n    activity: Math.max(0, archive.getSheetByName(MC_LOGGER_SHEETS.activity.name).getLastRow() - 1),\n    sessions: Math.max(0, archive.getSheetByName(MC_LOGGER_SHEETS.sessions.name).getLastRow() - 1),\n    actionSummary: Math.max(0, archive.getSheetByName(MC_LOGGER_SHEETS.actionSummary.name).getLastRow() - 1)\n  };",
    'archive index new counts object',
)
backend = replace_once(
    backend,
    "    countLoggerSpreadsheetCells_(archive),\n    safeSheetText_(notes || '')\n  ];",
    "    countLoggerSpreadsheetCells_(archive),\n    safeSheetText_(notes || ''),\n    counts.activity,\n    counts.sessions,\n    counts.actionSummary\n  ];",
    'archive index new count columns',
)
backend = replace_once(
    backend,
    "    rebuildMissionSummaryFromRawIfNeeded_(liveSpreadsheet);\n    const contexts = {};\n    const deletions = {};\n    const definitions = [\n      ['summaries', MC_LOGGER_SHEETS.summaries],\n      ['events', MC_LOGGER_SHEETS.events],\n      ['units', MC_LOGGER_SHEETS.units],\n      ['uploads', MC_LOGGER_SHEETS.uploads]\n    ];",
    "    rebuildMissionSummaryFromRawIfNeeded_(liveSpreadsheet);\n    rebuildLoggerActionSummary_(liveSpreadsheet, new Date());\n    const contexts = {};\n    const deletions = {};\n    const definitions = [\n      ['summaries', MC_LOGGER_SHEETS.summaries],\n      ['events', MC_LOGGER_SHEETS.events],\n      ['units', MC_LOGGER_SHEETS.units],\n      ['uploads', MC_LOGGER_SHEETS.uploads],\n      ['activity', MC_LOGGER_SHEETS.activity],\n      ['sessions', MC_LOGGER_SHEETS.sessions],\n      ['actionSummary', MC_LOGGER_SHEETS.actionSummary]\n    ];",
    'weekly archive activity collection',
)
backend = replace_once(
    backend,
    "      ['units', 'events', 'uploads', 'summaries'].forEach(function(definitionKey) {",
    "      ['actionSummary', 'activity', 'sessions', 'units', 'events', 'uploads', 'summaries'].forEach(function(definitionKey) {",
    'weekly archive activity purge order',
)
backend = replace_once(
    backend,
    "    ['summaries', MC_LOGGER_SHEETS.summaries],\n    ['events', MC_LOGGER_SHEETS.events],\n    ['units', MC_LOGGER_SHEETS.units],\n    ['uploads', MC_LOGGER_SHEETS.uploads]\n  ];",
    "    ['summaries', MC_LOGGER_SHEETS.summaries],\n    ['events', MC_LOGGER_SHEETS.events],\n    ['units', MC_LOGGER_SHEETS.units],\n    ['uploads', MC_LOGGER_SHEETS.uploads],\n    ['activity', MC_LOGGER_SHEETS.activity],\n    ['sessions', MC_LOGGER_SHEETS.sessions],\n    ['actionSummary', MC_LOGGER_SHEETS.actionSummary]\n  ];",
    'weekly preview activity definitions',
)
backend = replace_once(
    backend,
    "    counts.uploads * MC_LOGGER_SHEETS.uploads.headers.length;",
    "    counts.uploads * MC_LOGGER_SHEETS.uploads.headers.length +\n    counts.activity * MC_LOGGER_SHEETS.activity.headers.length +\n    counts.sessions * MC_LOGGER_SHEETS.sessions.headers.length +\n    counts.actionSummary * MC_LOGGER_SHEETS.actionSummary.headers.length;",
    'weekly preview activity cell estimate',
)
backend = replace_once(
    backend,
    "      'Uploads: ' + counts.uploads,",
    "      'Uploads: ' + counts.uploads,\n      'Activity Log: ' + counts.activity,\n      'Sessions: ' + counts.sessions,\n      'Action Summary: ' + counts.actionSummary,",
    'weekly preview activity display',
)

# Raw daily backup now includes the activity ledger and session/summary evidence.
backend = replace_once(
    backend,
    "    uploads: rowsForBackupDay_(\n      spreadsheet.getSheetByName(MC_LOGGER_SHEETS.uploads.name),",
    "    activityLog: rowsForBackupDay_(\n      spreadsheet.getSheetByName(MC_LOGGER_SHEETS.activity.name),\n      'received_at',\n      dayKey,\n      timezone\n    ),\n    sessions: getDataRows_(spreadsheet.getSheetByName(MC_LOGGER_SHEETS.sessions.name)),\n    actionSummary: getDataRows_(spreadsheet.getSheetByName(MC_LOGGER_SHEETS.actionSummary.name)),\n    uploads: rowsForBackupDay_(\n      spreadsheet.getSheetByName(MC_LOGGER_SHEETS.uploads.name),",
    'daily activity backup',
)

# ---------------------------------------------------------------------------
# Changelog / README.
# ---------------------------------------------------------------------------
changelog = replace_once(
    changelog,
    "## [Unreleased]\n\nNo changes have been queued after `1.1.7`.\n",
    "## [Unreleased]\n\nNo changes queued after `1.1.9`.\n\n## [1.1.9] - 2026-08-18\n\n### Added\n\n- Added a comprehensive, privacy-bounded MissionChief activity recorder. Once the upgraded private Apps Script backend acknowledges activity schema v2, Nexus records trusted user interactions, synthetic/Nexus actions, same-origin fetch/XHR lifecycle, navigation, same-origin iframe activity, lifecycle state and runtime errors into a dedicated raw Activity Log. Entered values, passwords, cookies, auth tokens, clipboard data and request bodies are never captured.\n- Added Sessions and Action Summary datasets and extended daily backups plus weekly verified archives to include Activity Log, Sessions and Action Summary before live rows are purged.\n\n### Changed\n\n- Logger identity now comes from `#navbar_profile_link`: the numeric `/profile/{id}` value is the stable player ID and the visible MissionChief username is the current display name. Username changes therefore stay attached to the same player history. Legacy selected names are retained only as an old-backend compatibility alias during rollout.\n- Rebuilt the logger workbook contract around raw action evidence while preserving the locked Monday archive -> verify -> purge lifecycle and the emergency cell-limit archive guard.\n- Increased Command Nexus from `1.1.8` to `1.1.9` and Mission Finder from `V10.7.6` to `V10.7.7`.\n",
    'v1.1.9 changelog',
)
readme = replace_once(
    readme,
    '**Current version:** `1.1.8` · **Mission Finder engine:** `V10.7.6`',
    '**Current version:** `1.1.9` · **Mission Finder engine:** `V10.7.7`',
    'README current versions',
)
readme = readme.replace(
    '- Opt-in paired mission analytics with exact dispatch and credit evidence',
    '- Opt-in private activity recorder with stable MissionChief profile identity, exact dispatch/credit evidence and verified weekly archive rollover'
)

# ---------------------------------------------------------------------------
# Regression coverage.
# ---------------------------------------------------------------------------
private_test = r'''#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const backend = await readFile('integrations/google-apps-script/Code.gs', 'utf8');
function fail(message) { console.error(`ERROR: ${message}`); process.exit(1); }
function expect(condition, message) { if (!condition) fail(message); }

expect(source.includes("querySelector('#navbar_profile_link')"), 'Navbar profile link must be authoritative');
expect(source.includes("/^\\/profile\\/(\\d+)\\/?$/"), 'Profile href must resolve an exact numeric MissionChief ID');
expect(source.includes('MissionChief user (detected automatically)'), 'Logger setup must show automatic user detection');
expect(source.includes('readonly'), 'Detected MissionChief user must not be manually selectable');
expect(source.includes('profileId: identity.playerId'), 'Upload must send stable numeric profile ID');
expect(source.includes('username: identity.playerName'), 'Upload must send current navbar username');
expect(source.includes('identity.legacyPlayerName ||'), 'Old backend compatibility alias must remain during rollout');
expect(source.includes('Forget setup'), 'Local logger reset must remain');
expect(!source.includes('Pair this browser'), 'Legacy pairing UI must remain absent');
expect(!source.includes('One-time pairing code'), 'Legacy pairing input must remain absent');
expect(!source.includes('MF_MISSION_LOGGER_DEFAULT_ENDPOINT'), 'Private deployment URL must never be committed');
expect(!/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/.test(source), 'No live Apps Script URL may be embedded');

expect(backend.includes('resolveOrCreateMissionChiefNavbarProfile_'), 'Backend must resolve/create numeric navbar identities');
expect(backend.includes("/^\\d{1,20}$/"), 'Backend profile IDs must be strictly numeric');
expect(backend.includes("'Auto-created from #navbar_profile_link'"), 'New navbar users must be auditable');
expect(backend.includes("'PAIRING_DISABLED'"), 'Legacy pair/revoke actions must remain disabled');
expect(!backend.includes('payload.token'), 'Private backend must not require upload tokens');
expect(backend.includes("buildId: '1.1.9-activity-recorder-2'"), 'Activity backend build marker must be current');
console.log('Private URL + automatic MissionChief profile regression passed.');
'''

logger_test = logger_test.replace(
    "expect(uploadBatch.includes('profileName: identity.playerName'), 'Upload must identify the selected private logger user');",
    "expect(uploadBatch.includes('profileId: identity.playerId'), 'Upload must send the stable MissionChief profile ID');\nexpect(uploadBatch.includes('username: identity.playerName'), 'Upload must send the current navbar username');\nexpect(uploadBatch.includes('identity.legacyPlayerName ||'), 'Upload must keep the legacy profile alias only for rollout compatibility');"
)

new_test = r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const backend = await readFile('integrations/google-apps-script/Code.gs', 'utf8');
function fail(message) { console.error(`ERROR: ${message}`); process.exit(1); }
function expect(condition, message) { if (!condition) fail(message); }
function must(text, token, label) { expect(text.includes(token), `Missing ${label}: ${token}`); }

for (const [token, label] of [
  ["'mf_mission_activity_backend_v2'", 'backend capability gate'],
  ["'mf_mission_activity_session_v2'", 'session storage'],
  ['MF_MISSION_ACTIVITY_SCHEMA_VERSION = 2', 'activity schema'],
  ["querySelector('#navbar_profile_link')", 'navbar identity'],
  ["/^\\/profile\\/(\\d+)\\/?$/", 'strict numeric profile path'],
  ["eventType: 'activity'", 'dedicated activity event'],
  ["['click','dblclick','contextmenu','change','submit','focusin','focusout','dragstart','drop','keydown']", 'interaction coverage'],
  ["'NETWORK', 'FETCH'", 'fetch coverage'],
  ["'NETWORK', 'XHR'", 'XHR coverage'],
  ["'NAVIGATION', method.toUpperCase()", 'history coverage'],
  ["'UNHANDLED_REJECTION'", 'runtime rejection coverage'],
  ['installMissionActivityFrame', 'same-origin iframe coverage'],
  ['installMissionActivityRecorder();', 'recorder installation'],
]) must(source, token, label);

expect(!source.includes("addEventListener('mousemove'"), 'mousemove noise must not be recorded');
expect(!source.includes("addEventListener('input'"), 'raw text input events must not be recorded');
expect(source.includes('/password|passwd|token|cookie|authorization|secret|clipboard|requestbody|body|value|enteredtext/i'), 'sensitive payload keys must be excluded');
expect(source.includes('if (!isMissionActivityBackendReady())'), 'Activity must stay gated until v2 backend acknowledgement');

for (const [token, label] of [
  ["name: 'Activity Log'", 'Activity Log sheet'],
  ["name: 'Sessions'", 'Sessions sheet'],
  ["name: 'Action Summary'", 'Action Summary sheet'],
  ["'batch_id'", 'activity batch trace'],
  ['prepareLoggerActivityRows_', 'activity row preparation'],
  ['appendLoggerActivityRows_', 'idempotent activity append'],
  ['upsertLoggerSessions_', 'session rollup'],
  ['rebuildLoggerActionSummary_', 'action summary rebuild'],
  ["['activity', MC_LOGGER_SHEETS.activity]", 'weekly activity archive'],
  ["['sessions', MC_LOGGER_SHEETS.sessions]", 'weekly session archive'],
  ["['actionSummary', MC_LOGGER_SHEETS.actionSummary]", 'weekly action summary archive'],
  [".onWeekDay(ScriptApp.WeekDay.MONDAY)", 'Monday rollover'],
  [".atHour(3)", '03:15 rollover hour'],
  [".nearMinute(15)", '03:15 rollover minute'],
  ['activityLog: rowsForBackupDay_', 'daily raw activity backup'],
  ["'NAVBAR_PROFILE_ID_AND_USERNAME'", 'numeric profile identity mode'],
]) must(backend, token, label);

const verifyAt = backend.indexOf('verifyLoggerArchiveContext_(context);');
const deleteAt = backend.indexOf('deleteLoggerRowsByNumber_(sheet, deletions[definitionKey])');
expect(verifyAt >= 0 && deleteAt > verifyAt, 'Archive verification must remain before every live purge');
expect(backend.includes("status = purge ? 'VERIFIED_PENDING_PURGE'"), 'Verified pending-purge state must remain');
expect(backend.includes("'VERIFIED_PURGED'"), 'Verified purged state must remain');
console.log('v1.1.9 comprehensive activity recorder regression passed.');
'''

SRC.write_text(source, encoding='utf-8')
BACKEND.write_text(backend, encoding='utf-8')
CHANGELOG.write_text(changelog, encoding='utf-8')
README.write_text(readme, encoding='utf-8')
PRIVATE_TEST.write_text(private_test, encoding='utf-8')
LOGGER_TEST.write_text(logger_test, encoding='utf-8')
NEW_TEST.write_text(new_test, encoding='utf-8')

# Greasy Fork hard limit safety before CI does the canonical validation.
size = SRC.stat().st_size
if size > 2 * 1024 * 1024:
    die(f'userscript is {size} bytes, over Greasy Fork 2 MB limit')
print(f'Applied v1.1.9 activity recorder patch; userscript is {size} bytes.')
