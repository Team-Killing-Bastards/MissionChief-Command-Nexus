// ==UserScript==
// @name         MissionChief Personnel Register Controls
// @namespace    https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus
// @version      0.1.1
// @description  Makes the Personnel Register controls readable and adds safe JSON export/import with visible register status.
// @author       Team Killing Bastards
// @license      MIT
// @match        https://www.missionchief.co.uk/*
// @match        https://police.missionchief.co.uk/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    if (window.__MC_PERSONNEL_REGISTER_CONTROLS_V1__) return;
    window.__MC_PERSONNEL_REGISTER_CONTROLS_V1__ = true;

    const STORAGE_KEY = 'mcPersonnelVehicleTrainingRegistry_v1';
    const EXPORT_FORMAT = 'missionchief-personnel-training-register';
    const SCHEMA_VERSION = 1;
    const MAX_VEHICLES = 5000;
    const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
    const BUILD_SELECTOR = '#mc-personnel-build-register';
    const BUTTONS_SELECTOR = '#mc-personnel-view .mc-namer-buttons';

    let lifecycleObserver;
    let buildObserver;
    let reportObserver;
    let buildTimer;
    let initialiseQueued = false;
    let boundBuild;
    let boundExport;
    let boundImport;
    let cachedRaw = null;
    let cachedRegistry = null;
    let cachedStats = null;

    const q = selector => document.querySelector(selector);
    const safeString = (value, limit = 1000) => String(value ?? '').slice(0, limit);
    const safeTime = value => {
        const number = Number(value || 0);
        return Number.isFinite(number) && number >= 0 ? number : 0;
    };
    const unsafeKey = key => !key || key === '__proto__' || key === 'constructor' || key === 'prototype';

    function normaliseCountMap(value) {
        const result = Object.create(null);
        const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        for (const [rawKey, rawCount] of Object.entries(source)) {
            const key = safeString(rawKey, 150);
            const count = Number(rawCount || 0);
            if (unsafeKey(key) || !Number.isFinite(count) || count < 0) continue;
            result[key] = Math.floor(count);
        }
        return result;
    }

    function emptyRegistry() {
        return {
            schemaVersion: SCHEMA_VERSION,
            sourceVersion: '',
            updatedAt: 0,
            lastPrunedAt: 0,
            vehicles: Object.create(null)
        };
    }

    function normaliseRegistry(candidate) {
        const source = candidate?.registry && typeof candidate.registry === 'object'
            ? candidate.registry
            : candidate;
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
            throw new Error('The selected file does not contain a Personnel Register object.');
        }

        const schemaVersion = source.schemaVersion == null ? SCHEMA_VERSION : Number(source.schemaVersion);
        if (schemaVersion !== SCHEMA_VERSION) {
            throw new Error(`Unsupported Personnel Register schema version: ${schemaVersion}.`);
        }
        if (!source.vehicles || typeof source.vehicles !== 'object' || Array.isArray(source.vehicles)) {
            throw new Error('The selected file does not contain a valid vehicles register.');
        }

        const entries = Object.entries(source.vehicles);
        if (entries.length > MAX_VEHICLES) {
            throw new Error(`The file contains ${entries.length} vehicles; the supported maximum is ${MAX_VEHICLES}.`);
        }

        const vehicles = Object.create(null);
        for (const [rawVehicleId, rawEntry] of entries) {
            const vehicleId = safeString(rawVehicleId, 80);
            if (unsafeKey(vehicleId)) throw new Error('The file contains an invalid vehicle identifier.');
            if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
                throw new Error(`Vehicle ${vehicleId} does not contain a valid register entry.`);
            }
            vehicles[vehicleId] = {
                vehicleId,
                vehicleName: safeString(rawEntry.vehicleName, 500),
                vehicleTypeId: safeString(rawEntry.vehicleTypeId, 80),
                stationName: safeString(rawEntry.stationName, 500),
                stationHref: safeString(rawEntry.stationHref, 1000),
                assignedPersonnelCount: Math.max(0, Math.floor(Number(rawEntry.assignedPersonnelCount || 0) || 0)),
                assignmentScanComplete: rawEntry.assignmentScanComplete === true,
                personnelRowsSeen: Math.max(0, Math.floor(Number(rawEntry.personnelRowsSeen || 0) || 0)),
                trainingCounts: normaliseCountMap(rawEntry.trainingCounts),
                trainingCombinationCounts: normaliseCountMap(rawEntry.trainingCombinationCounts),
                updatedAt: safeTime(rawEntry.updatedAt),
                source: safeString(rawEntry.source, 250)
            };
        }

        return {
            schemaVersion: SCHEMA_VERSION,
            sourceVersion: safeString(source.sourceVersion, 80),
            updatedAt: safeTime(source.updatedAt),
            lastPrunedAt: safeTime(source.lastPrunedAt),
            vehicles
        };
    }

    function invalidateCache() {
        cachedRaw = null;
        cachedRegistry = null;
        cachedStats = null;
    }

    function readRegistry() {
        const raw = localStorage.getItem(STORAGE_KEY) || '';
        if (raw === cachedRaw && cachedRegistry) return cachedRegistry;
        if (!raw) {
            cachedRaw = '';
            cachedRegistry = emptyRegistry();
            cachedStats = { count: 0, updatedAt: 0 };
            return cachedRegistry;
        }
        try {
            cachedRaw = raw;
            cachedRegistry = normaliseRegistry(JSON.parse(raw));
            cachedStats = null;
            return cachedRegistry;
        } catch (error) {
            invalidateCache();
            throw new Error(`The saved Personnel Register is invalid: ${error?.message || error}`);
        }
    }

    function calculateStats(registry) {
        const entries = Object.values(registry.vehicles || {});
        const updatedAt = entries.reduce(
            (latest, entry) => Math.max(latest, safeTime(entry?.updatedAt)),
            safeTime(registry.updatedAt)
        );
        return { count: entries.length, updatedAt };
    }

    function getStats(registry) {
        if (registry) return calculateStats(registry);
        const stored = readRegistry();
        if (!cachedStats) cachedStats = calculateStats(stored);
        return cachedStats;
    }

    function formatTime(timestamp) {
        if (!timestamp) return 'never';
        try {
            return new Intl.DateTimeFormat('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short'
            }).format(new Date(timestamp));
        } catch (_error) {
            return new Date(timestamp).toLocaleString();
        }
    }

    function log(message, tone = 'info') {
        const target = q('#mc-personnel-log');
        if (!target) return;
        const line = document.createElement('div');
        line.textContent = message;
        line.style.color = tone === 'error' ? '#fecaca' : tone === 'done' ? '#bbf7d0' : '#bfdbfe';
        target.appendChild(line);
        target.scrollTop = target.scrollHeight;
    }

    function correctRetainedCount(knownCount) {
        const report = q('#mc-personnel-report');
        if (!report) return;
        let count = Number(knownCount);
        if (!Number.isFinite(count)) {
            try {
                count = getStats().count;
            } catch (_error) {
                return;
            }
        }
        if (count <= 0 || !/Registry retained:\s*0\b/.test(report.textContent || '')) return;
        report.textContent = (report.textContent || '').replace(
            /Registry retained:\s*0\b/,
            `Registry retained: ${count}`
        );
    }

    function updateStatus() {
        const target = q('#mc-personnel-register-storage-status');
        if (!target) return;
        try {
            const stats = getStats();
            target.textContent = `${stats.count.toLocaleString('en-GB')} vehicle${stats.count === 1 ? '' : 's'} stored · updated ${formatTime(stats.updatedAt)}`;
            target.dataset.state = stats.count ? 'ready' : 'empty';
            correctRetainedCount(stats.count);
        } catch (error) {
            target.textContent = error?.message || String(error);
            target.dataset.state = 'error';
        }
    }

    const buildActive = () => Boolean(q(BUILD_SELECTOR)?.disabled);

    function syncButtons() {
        const disabled = buildActive();
        if (boundExport) boundExport.disabled = disabled;
        if (boundImport) boundImport.disabled = disabled;
    }

    function downloadJson(filename, value) {
        const url = URL.createObjectURL(new Blob([
            `${JSON.stringify(value, null, 2)}\n`
        ], { type: 'application/json;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.hidden = true;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function exportRegister() {
        if (buildActive()) {
            window.alert('Finish or stop the active register build before exporting.');
            return;
        }
        let registry;
        try {
            registry = readRegistry();
        } catch (error) {
            window.alert(error?.message || String(error));
            return;
        }
        const stats = getStats(registry);
        if (!stats.count) {
            window.alert('The Personnel Register is empty. Build or import a register before exporting.');
            return;
        }
        const exportedAt = new Date().toISOString();
        downloadJson(`missionchief-personnel-register-${exportedAt.slice(0, 10)}.json`, {
            format: EXPORT_FORMAT,
            exportVersion: 1,
            exportedAt,
            origin: location.origin,
            vehicleCount: stats.count,
            registry
        });
        log(`Personnel Register exported: ${stats.count} vehicle(s).`, 'done');
    }

    async function importRegister(file) {
        if (!file) return;
        if (Number(file.size || 0) > MAX_IMPORT_BYTES) {
            window.alert('Personnel Register import failed: the selected file is larger than 10 MB.');
            return;
        }
        if (buildActive()) {
            window.alert('Finish or stop the active register build before importing.');
            return;
        }

        let registry;
        try {
            const parsed = JSON.parse(await file.text());
            if (parsed?.format && parsed.format !== EXPORT_FORMAT) {
                throw new Error(`Unsupported export format: ${safeString(parsed.format, 120)}`);
            }
            registry = normaliseRegistry(parsed);
        } catch (error) {
            log(`Personnel Register import failed: ${error?.message || error}`, 'error');
            window.alert(`Personnel Register import failed: ${error?.message || error}`);
            return;
        }

        const importedCount = Object.keys(registry.vehicles).length;
        if (!importedCount) {
            window.alert('The selected file contains an empty Personnel Register. Nothing was imported.');
            return;
        }
        let existingCount = 0;
        try {
            existingCount = getStats().count;
        } catch (_error) {}
        const confirmed = window.confirm(
            `Import ${importedCount.toLocaleString('en-GB')} vehicle register entries?\n\n` +
            `This replaces the ${existingCount.toLocaleString('en-GB')} entries currently stored in this browser.`
        );
        if (!confirmed) return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
            invalidateCache();
        } catch (error) {
            log(`Personnel Register import could not be saved: ${error?.message || error}`, 'error');
            window.alert(`Personnel Register could not be saved: ${error?.message || error}`);
            return;
        }

        try {
            window.dispatchEvent(new CustomEvent('mc-personnel-training-registry-updated', {
                detail: {
                    imported: true,
                    vehicleCount: importedCount,
                    updatedAt: Date.now()
                }
            }));
        } catch (_error) {}
        updateStatus();
        log(`Personnel Register imported: ${importedCount} vehicle(s). Existing browser register replaced.`, 'done');
        window.alert(
            `Personnel Register imported successfully: ${importedCount.toLocaleString('en-GB')} vehicle entries.\n\n` +
            'The page will now reload so Command Nexus uses the imported data.'
        );
        location.reload();
    }

    function labelBuildButton() {
        const button = q(BUILD_SELECTOR);
        if (!button) return;
        if (!button.disabled && button.textContent.trim() === 'Build Personnel Register') {
            button.textContent = 'Build All Register';
        }
        button.title = 'Scan every station and rebuild the exact vehicle training register. This ignores the selected service, training profile, mode and start point. No personnel assignments are changed.';
    }

    function monitorBuild() {
        if (buildTimer != null) clearInterval(buildTimer);
        buildTimer = setInterval(() => {
            syncButtons();
            updateStatus();
            if (q(BUILD_SELECTOR)?.disabled) return;
            clearInterval(buildTimer);
            buildTimer = null;
            labelBuildButton();
            syncButtons();
            updateStatus();
        }, 1000);
    }

    function ensureStyles() {
        if (q('style[data-mc-personnel-register-controls]')) return;
        const style = document.createElement('style');
        style.dataset.mcPersonnelRegisterControls = 'true';
        style.textContent = `
#mc-personnel-build-register{background:#0f766e!important;color:#fff!important;border:1px solid #5eead4!important;font-weight:700!important}
#mc-personnel-build-register:disabled{cursor:wait!important;opacity:.65!important}
#mc-personnel-export-register{background:#7c3aed!important;color:#fff!important;border:1px solid #c4b5fd!important}
#mc-personnel-import-register{background:#2563eb!important;color:#fff!important;border:1px solid #93c5fd!important}
#mc-personnel-export-register:disabled,#mc-personnel-import-register:disabled{cursor:not-allowed!important;opacity:.55!important}
#mc-personnel-register-storage{border-left:4px solid #14b8a6;background:rgba(15,118,110,.18)}
#mc-personnel-register-storage-status[data-state="ready"]{color:#bbf7d0}
#mc-personnel-register-storage-status[data-state="empty"]{color:#fde68a}
#mc-personnel-register-storage-status[data-state="error"]{color:#fecaca}`;
        document.head.appendChild(style);
    }

    function makeButton(id, text, title, handler) {
        let button = q(`#${id}`);
        if (button) return button;
        button = document.createElement('button');
        button.id = id;
        button.type = 'button';
        button.textContent = text;
        button.title = title;
        button.addEventListener('click', handler);
        return button;
    }

    function installControls() {
        const buttons = q(BUTTONS_SELECTOR);
        const build = q(BUILD_SELECTOR);
        if (!buttons || !build) return false;
        ensureStyles();
        labelBuildButton();

        if (boundBuild !== build) {
            buildObserver?.disconnect();
            reportObserver?.disconnect();
            boundBuild = build;
            build.addEventListener('click', () => setTimeout(monitorBuild, 0));
            buildObserver = new MutationObserver(() => {
                labelBuildButton();
                syncButtons();
            });
            buildObserver.observe(build, {
                childList: true,
                characterData: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['disabled']
            });
        }

        boundExport = makeButton(
            'mc-personnel-export-register',
            'Export Register',
            'Download the saved Personnel Register as a validated JSON backup.',
            exportRegister
        );
        if (!boundExport.isConnected) buttons.appendChild(boundExport);

        let input = q('#mc-personnel-import-register-file');
        if (!input) {
            input = document.createElement('input');
            input.id = 'mc-personnel-import-register-file';
            input.type = 'file';
            input.accept = '.json,application/json';
            input.hidden = true;
            input.addEventListener('change', async () => {
                const file = input.files?.[0];
                input.value = '';
                await importRegister(file);
            });
            buttons.appendChild(input);
        }

        boundImport = makeButton(
            'mc-personnel-import-register',
            'Import Register',
            'Replace the browser Personnel Register with a validated JSON backup.',
            () => input.click()
        );
        if (!boundImport.isConnected) buttons.appendChild(boundImport);

        if (!q('#mc-personnel-register-storage')) {
            const status = document.createElement('div');
            status.id = 'mc-personnel-register-storage';
            status.className = 'mc-namer-section';
            status.innerHTML = '<b>Personnel Register:</b> <span id="mc-personnel-register-storage-status" data-state="empty">Checking…</span>';
            buttons.insertAdjacentElement('afterend', status);
        }

        const report = q('#mc-personnel-report');
        if (report && !report.dataset.mcRegisterControlsObserved) {
            report.dataset.mcRegisterControlsObserved = 'true';
            reportObserver = new MutationObserver(() => correctRetainedCount());
            reportObserver.observe(report, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }

        syncButtons();
        updateStatus();
        return true;
    }

    function queueInstall() {
        if (boundBuild?.isConnected && boundExport?.isConnected && boundImport?.isConnected) return;
        if (initialiseQueued) return;
        initialiseQueued = true;
        requestAnimationFrame(() => {
            initialiseQueued = false;
            installControls();
        });
    }

    window.addEventListener('mc-personnel-training-registry-updated', () => {
        invalidateCache();
        updateStatus();
    });
    window.addEventListener('storage', event => {
        if (event.key !== STORAGE_KEY) return;
        invalidateCache();
        updateStatus();
    });
    window.addEventListener('pageshow', queueInstall);
    window.addEventListener('pagehide', event => {
        if (event.persisted) return;
        lifecycleObserver?.disconnect();
        buildObserver?.disconnect();
        reportObserver?.disconnect();
        if (buildTimer != null) clearInterval(buildTimer);
    });

    lifecycleObserver = new MutationObserver(queueInstall);
    lifecycleObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
    queueInstall();
})();
