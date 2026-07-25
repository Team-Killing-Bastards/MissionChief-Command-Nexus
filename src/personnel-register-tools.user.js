// ==UserScript==
// @name         MissionChief Personnel Register Controls
// @namespace    https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus
// @version      0.1.0
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
    const EXPORT_VERSION = 1;
    const REGISTRY_SCHEMA_VERSION = 1;
    const MAX_VEHICLES = 5000;
    const MAIN_BUTTONS_SELECTOR = '#mc-personnel-view .mc-namer-buttons';
    const BUILD_BUTTON_SELECTOR = '#mc-personnel-build-register';

    let lifecycleObserver = null;
    let buildMonitorTimer = null;
    let initialiseQueued = false;

    function safeString(value, maximumLength = 1000) {
        return String(value ?? '').slice(0, maximumLength);
    }

    function safeTimestamp(value) {
        const timestamp = Number(value || 0);
        return Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : 0;
    }

    function normaliseCountMap(value) {
        const source = value && typeof value === 'object' && !Array.isArray(value)
            ? value
            : {};
        const result = {};

        Object.entries(source).forEach(([rawKey, rawCount]) => {
            const key = safeString(rawKey, 150);
            if (!key || key === '__proto__' || key === 'constructor' || key === 'prototype') return;

            const count = Number(rawCount || 0);
            if (!Number.isFinite(count) || count < 0) return;
            result[key] = Math.floor(count);
        });

        return result;
    }

    function createEmptyRegistry() {
        return {
            schemaVersion: REGISTRY_SCHEMA_VERSION,
            sourceVersion: '',
            updatedAt: 0,
            lastPrunedAt: 0,
            vehicles: {}
        };
    }

    function normaliseRegistry(candidate) {
        const source = candidate?.registry && typeof candidate.registry === 'object'
            ? candidate.registry
            : candidate;

        if (!source || typeof source !== 'object' || Array.isArray(source)) {
            throw new Error('The selected file does not contain a Personnel Register object.');
        }

        const schemaVersion = Number(source.schemaVersion || REGISTRY_SCHEMA_VERSION);
        if (schemaVersion !== REGISTRY_SCHEMA_VERSION) {
            throw new Error(`Unsupported Personnel Register schema version: ${schemaVersion}.`);
        }

        if (!source.vehicles || typeof source.vehicles !== 'object' || Array.isArray(source.vehicles)) {
            throw new Error('The selected file does not contain a valid vehicles register.');
        }

        const vehicleEntries = Object.entries(source.vehicles);
        if (vehicleEntries.length > MAX_VEHICLES) {
            throw new Error(`The file contains ${vehicleEntries.length} vehicles; the supported maximum is ${MAX_VEHICLES}.`);
        }

        const vehicles = {};

        vehicleEntries.forEach(([rawVehicleId, rawEntry]) => {
            const vehicleId = safeString(rawVehicleId, 80);
            if (!vehicleId || vehicleId === '__proto__' || vehicleId === 'constructor' || vehicleId === 'prototype') {
                throw new Error('The file contains an invalid vehicle identifier.');
            }
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
                updatedAt: safeTimestamp(rawEntry.updatedAt),
                source: safeString(rawEntry.source, 250)
            };
        });

        return {
            schemaVersion: REGISTRY_SCHEMA_VERSION,
            sourceVersion: safeString(source.sourceVersion, 80),
            updatedAt: safeTimestamp(source.updatedAt),
            lastPrunedAt: safeTimestamp(source.lastPrunedAt),
            vehicles
        };
    }

    function readStoredRegistry() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return createEmptyRegistry();

        try {
            return normaliseRegistry(JSON.parse(raw));
        } catch (error) {
            throw new Error(`The saved Personnel Register is invalid: ${error?.message || error}`);
        }
    }

    function getRegistryStats(registry = readStoredRegistry()) {
        const entries = Object.values(registry.vehicles || {});
        const latestVehicleUpdate = entries.reduce(
            (latest, entry) => Math.max(latest, safeTimestamp(entry?.updatedAt)),
            0
        );

        return {
            count: entries.length,
            updatedAt: Math.max(safeTimestamp(registry.updatedAt), latestVehicleUpdate)
        };
    }

    function formatTimestamp(timestamp) {
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

    function appendPersonnelLog(message, tone = 'info') {
        const log = document.querySelector('#mc-personnel-log');
        if (!log) return;

        const line = document.createElement('div');
        line.dataset.mcRegisterControls = 'true';
        line.textContent = message;
        line.style.color = tone === 'error' ? '#fecaca' : tone === 'done' ? '#bbf7d0' : '#bfdbfe';
        log.appendChild(line);
        log.scrollTop = log.scrollHeight;
    }

    function updateRegisterStatus() {
        const status = document.querySelector('#mc-personnel-register-storage-status');
        if (!status) return;

        try {
            const stats = getRegistryStats();
            status.textContent = `${stats.count.toLocaleString('en-GB')} vehicle${stats.count === 1 ? '' : 's'} stored · updated ${formatTimestamp(stats.updatedAt)}`;
            status.dataset.state = stats.count ? 'ready' : 'empty';
        } catch (error) {
            status.textContent = error?.message || String(error);
            status.dataset.state = 'error';
        }

        correctRetainedCountReport();
    }

    function correctRetainedCountReport() {
        const report = document.querySelector('#mc-personnel-report');
        if (!report) return;

        let count = 0;
        try {
            count = getRegistryStats().count;
        } catch (_error) {
            return;
        }

        if (count <= 0 || !/Registry retained:\s*0\b/.test(report.textContent || '')) return;
        report.textContent = (report.textContent || '').replace(
            /Registry retained:\s*0\b/,
            `Registry retained: ${count}`
        );
    }

    function downloadJson(filename, value) {
        const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
            type: 'application/json;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    function exportPersonnelRegister() {
        const buildButton = document.querySelector(BUILD_BUTTON_SELECTOR);
        if (buildButton?.disabled) {
            window.alert('Finish or stop the active register build before exporting, so the file contains the final saved state.');
            return;
        }

        let registry;
        try {
            registry = readStoredRegistry();
        } catch (error) {
            window.alert(error?.message || String(error));
            return;
        }

        const stats = getRegistryStats(registry);
        if (!stats.count) {
            window.alert('The Personnel Register is empty. Build or import a register before exporting.');
            return;
        }

        const exportedAt = new Date().toISOString();
        const dateToken = exportedAt.slice(0, 10);
        downloadJson(`missionchief-personnel-register-${dateToken}.json`, {
            format: EXPORT_FORMAT,
            exportVersion: EXPORT_VERSION,
            exportedAt,
            origin: location.origin,
            vehicleCount: stats.count,
            registry
        });

        appendPersonnelLog(`Personnel Register exported: ${stats.count} vehicle(s).`, 'done');
    }

    async function importPersonnelRegisterFile(file) {
        if (!file) return;

        const buildButton = document.querySelector(BUILD_BUTTON_SELECTOR);
        if (buildButton?.disabled) {
            window.alert('Finish or stop the active register build before importing.');
            return;
        }

        let importedRegistry;
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);

            if (parsed?.format && parsed.format !== EXPORT_FORMAT) {
                throw new Error(`Unsupported export format: ${safeString(parsed.format, 120)}`);
            }

            importedRegistry = normaliseRegistry(parsed);
        } catch (error) {
            window.alert(`Personnel Register import failed: ${error?.message || error}`);
            appendPersonnelLog(`Personnel Register import failed: ${error?.message || error}`, 'error');
            return;
        }

        const importedCount = Object.keys(importedRegistry.vehicles).length;
        if (!importedCount) {
            window.alert('The selected file contains an empty Personnel Register. Nothing was imported.');
            return;
        }

        let existingCount = 0;
        try {
            existingCount = getRegistryStats().count;
        } catch (_error) {}

        const confirmed = window.confirm(
            `Import ${importedCount.toLocaleString('en-GB')} vehicle register entries?\n\n` +
            `This replaces the ${existingCount.toLocaleString('en-GB')} entries currently stored in this browser.`
        );
        if (!confirmed) return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(importedRegistry));
        } catch (error) {
            window.alert(`Personnel Register could not be saved: ${error?.message || error}`);
            appendPersonnelLog(`Personnel Register import could not be saved: ${error?.message || error}`, 'error');
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

        updateRegisterStatus();
        appendPersonnelLog(`Personnel Register imported: ${importedCount} vehicle(s). Existing browser register replaced.`, 'done');
        window.alert(
            `Personnel Register imported successfully: ${importedCount.toLocaleString('en-GB')} vehicle entries.\n\n` +
            'The page will now reload so Command Nexus drops its old in-memory register cache and uses the imported data.'
        );
        location.reload();
    }

    function monitorBuildProgress() {
        if (buildMonitorTimer != null) clearInterval(buildMonitorTimer);

        buildMonitorTimer = setInterval(() => {
            const buildButton = document.querySelector(BUILD_BUTTON_SELECTOR);
            updateRegisterStatus();

            if (!buildButton || !buildButton.disabled) {
                clearInterval(buildMonitorTimer);
                buildMonitorTimer = null;
                updateBuildButtonLabel();
                updateRegisterStatus();
            }
        }, 1000);
    }

    function updateBuildButtonLabel() {
        const button = document.querySelector(BUILD_BUTTON_SELECTOR);
        if (!button) return;

        if (!button.disabled && button.textContent.trim() === 'Build Personnel Register') {
            button.textContent = 'Build All Register';
        }
        button.title = 'Scan every station and rebuild the exact vehicle training register. This ignores the selected service, training profile, mode and start point. No personnel assignments are changed.';
    }

    function ensureStyles() {
        if (document.querySelector('style[data-mc-personnel-register-controls]')) return;

        const style = document.createElement('style');
        style.dataset.mcPersonnelRegisterControls = 'true';
        style.textContent = `
            #mc-personnel-build-register {
                background: #0f766e !important;
                color: #ffffff !important;
                border: 1px solid #5eead4 !important;
                font-weight: 700 !important;
            }

            #mc-personnel-build-register:disabled {
                cursor: wait !important;
                opacity: 0.65 !important;
            }

            #mc-personnel-export-register {
                background: #7c3aed !important;
                color: #ffffff !important;
                border: 1px solid #c4b5fd !important;
            }

            #mc-personnel-import-register {
                background: #2563eb !important;
                color: #ffffff !important;
                border: 1px solid #93c5fd !important;
            }

            #mc-personnel-register-storage {
                border-left: 4px solid #14b8a6;
                background: rgba(15, 118, 110, 0.18);
            }

            #mc-personnel-register-storage-status[data-state="ready"] { color: #bbf7d0; }
            #mc-personnel-register-storage-status[data-state="empty"] { color: #fde68a; }
            #mc-personnel-register-storage-status[data-state="error"] { color: #fecaca; }
        `;
        document.head.appendChild(style);
    }

    function ensureControls() {
        const buttons = document.querySelector(MAIN_BUTTONS_SELECTOR);
        const buildButton = document.querySelector(BUILD_BUTTON_SELECTOR);
        if (!buttons || !buildButton) return false;

        ensureStyles();
        updateBuildButtonLabel();

        if (!buildButton.dataset.mcRegisterControlsBound) {
            buildButton.dataset.mcRegisterControlsBound = 'true';
            buildButton.addEventListener('click', () => {
                setTimeout(monitorBuildProgress, 0);
            });

            const buttonObserver = new MutationObserver(() => updateBuildButtonLabel());
            buttonObserver.observe(buildButton, {
                childList: true,
                characterData: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['disabled']
            });
        }

        let exportButton = document.querySelector('#mc-personnel-export-register');
        if (!exportButton) {
            exportButton = document.createElement('button');
            exportButton.id = 'mc-personnel-export-register';
            exportButton.type = 'button';
            exportButton.textContent = 'Export Register';
            exportButton.title = 'Download the saved Personnel Register as a validated JSON backup.';
            exportButton.addEventListener('click', exportPersonnelRegister);
            buttons.appendChild(exportButton);
        }

        let importInput = document.querySelector('#mc-personnel-import-register-file');
        if (!importInput) {
            importInput = document.createElement('input');
            importInput.id = 'mc-personnel-import-register-file';
            importInput.type = 'file';
            importInput.accept = '.json,application/json';
            importInput.hidden = true;
            importInput.addEventListener('change', async () => {
                const [file] = Array.from(importInput.files || []);
                importInput.value = '';
                await importPersonnelRegisterFile(file);
            });
            buttons.appendChild(importInput);
        }

        let importButton = document.querySelector('#mc-personnel-import-register');
        if (!importButton) {
            importButton = document.createElement('button');
            importButton.id = 'mc-personnel-import-register';
            importButton.type = 'button';
            importButton.textContent = 'Import Register';
            importButton.title = 'Replace the browser Personnel Register with a validated JSON backup.';
            importButton.addEventListener('click', () => importInput.click());
            buttons.appendChild(importButton);
        }

        let storageStatus = document.querySelector('#mc-personnel-register-storage');
        if (!storageStatus) {
            storageStatus = document.createElement('div');
            storageStatus.id = 'mc-personnel-register-storage';
            storageStatus.className = 'mc-namer-section';
            storageStatus.innerHTML = '<b>Personnel Register:</b> <span id="mc-personnel-register-storage-status" data-state="empty">Checking…</span>';
            buttons.insertAdjacentElement('afterend', storageStatus);
        }

        const report = document.querySelector('#mc-personnel-report');
        if (report && !report.dataset.mcRegisterControlsObserved) {
            report.dataset.mcRegisterControlsObserved = 'true';
            const reportObserver = new MutationObserver(correctRetainedCountReport);
            reportObserver.observe(report, { childList: true, characterData: true, subtree: true });
        }

        updateRegisterStatus();
        return true;
    }

    function queueInitialise() {
        if (initialiseQueued) return;
        initialiseQueued = true;
        requestAnimationFrame(() => {
            initialiseQueued = false;
            ensureControls();
        });
    }

    window.addEventListener('mc-personnel-training-registry-updated', updateRegisterStatus);
    window.addEventListener('storage', event => {
        if (event.key === STORAGE_KEY) updateRegisterStatus();
    });

    lifecycleObserver = new MutationObserver(queueInitialise);
    lifecycleObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    queueInitialise();
})();
