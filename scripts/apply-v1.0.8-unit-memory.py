from pathlib import Path
import re

SOURCE = Path('src/missionchief-command-nexus.user.js')
README = Path('README.md')
SRC_README = Path('src/README.md')
CHANGELOG = Path('CHANGELOG.md')

source = SOURCE.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    source = source.replace(old, new, 1)


def replace_function(start_marker: str, end_marker: str, replacement: str, label: str) -> None:
    global source
    start = source.find(start_marker)
    if start < 0:
        raise SystemExit(f'{label}: start marker not found')
    end = source.find(end_marker, start)
    if end < 0:
        raise SystemExit(f'{label}: end marker not found')
    if source.find(start_marker, start + 1) >= 0:
        raise SystemExit(f'{label}: duplicate start marker found')
    source = source[:start] + replacement + source[end:]

replace_once('// @version      1.0.7', '// @version      1.0.8', 'userscript version')
replace_once("const UNIT_VERSION = '3.3.3';", "const UNIT_VERSION = '3.3.4';", 'Unit Naming version')

replace_once(
    '        skippedCount: 0,\n        mode: "all",\n        runId: 0\n    };',
    '        skippedCount: 0,\n        mode: "all",\n        runId: 0,\n        activeIframe: null\n    };',
    'Unit Naming state active iframe',
)

replace_once(
    '        STATE.stopped = true;\n        STATE.paused = false;',
    '        STATE.stopped = true;\n        STATE.paused = false;\n\n'
    '        const activeUnitIframe = STATE.activeIframe;\n'
    '        STATE.activeIframe = null;\n'
    '        releaseUnitIframeDocument(activeUnitIframe);\n'
    '        STATE.stations = [];\n'
    '        STATE.filteredStations = [];',
    'Unit Naming lifecycle cleanup',
)

helpers = r'''    function navigateUnitIframe(iframe, href) {
        if (!iframe || !href) return false;

        try {
            iframe.contentWindow.location.replace(href);
            return true;
        } catch (_error) {
            try {
                iframe.setAttribute('src', href);
                return true;
            } catch (_fallbackError) {
                return false;
            }
        }
    }

    function releaseUnitIframeDocument(iframe) {
        if (!iframe) return;

        try {
            iframe.contentWindow.location.replace('about:blank');
        } catch (_error) {
            try {
                iframe.setAttribute('src', 'about:blank');
            } catch (_fallbackError) {}
        }
    }

    function getUnitModalCloseButton(iframe) {
        const modal = iframe?.closest?.(
            '.vm--modal, [role="dialog"], .lightbox, .modal'
        );

        const scoped = modal?.querySelector?.(
            'span.lightbox-close, button.lightbox-close, .vm--modal-close, button.close'
        );

        if (scoped) return scoped;

        const candidates = [
            ...document.querySelectorAll(
                'span.lightbox-close, button.lightbox-close, .vm--modal-close, button.close'
            )
        ];

        return candidates.reverse().find(button => {
            return button.offsetParent !== null;
        }) || candidates[0] || null;
    }

'''
replace_once(
    '    function refreshStations() {',
    helpers + '    function refreshStations() {',
    'Unit iframe memory helpers',
)

replace_once(
    "        if (STATE.running) {\n            log('Already running.', 'debug');\n            return;\n        }",
    "        if (STATE.running) {\n            log('Already running.', 'debug');\n            return;\n        }\n\n"
    "        if (STATE.activeIframe) {\n"
    "            releaseUnitIframeDocument(STATE.activeIframe);\n"
    "            STATE.activeIframe = null;\n"
    "        }",
    'release stale iframe before Unit Naming run',
)

replace_once(
    '                const iframe = await waitForStationIframe(station.href);\n\n'
    '                if (!iframe) {',
    '                const iframe = await waitForStationIframe(station.href);\n\n'
    '                if (iframe) {\n'
    '                    STATE.activeIframe = iframe;\n'
    '                }\n\n'
    '                if (!iframe) {',
    'track active Unit Naming iframe',
)

close_calls = source.count('await closeStationModal();')
if close_calls != 3:
    raise SystemExit(f'Unit modal close calls: expected 3, found {close_calls}')
source = source.replace('await closeStationModal();', 'await closeStationModal(iframe);')

replace_once(
    '        } finally {\n            if (runId !== STATE.runId) return;\n\n'
    '            STATE.running = false;',
    '        } finally {\n            if (STATE.activeIframe) {\n'
    '                await closeStationModal(STATE.activeIframe);\n'
    '            }\n\n'
    '            if (runId !== STATE.runId) return;\n\n'
    '            STATE.running = false;',
    'Unit Naming guaranteed modal cleanup',
)

new_queue_function = r'''    async function processStationVehicleQueue(iframe, station) {
        setStatus('Building vehicle queue');

        // Build a lightweight string-only queue and release the station document
        // before the first navigation. Holding the original document across every
        // awaited edit page kept the full station DOM alive for the whole run.
        const queue = getVehicleQueueFromTable(
            iframe.contentDocument
        );

        debug(`Vehicle queue built for ${station.displayName}: ${queue.length}`);

        if (!queue.length) {
            log(`No vehicles found in ${station.displayName}.`, 'debug');
            return;
        }

        const counts = {};

        for (const item of queue) {
            if (STATE.stopped) return;

            await waitIfPaused();
            if (STATE.stopped) return;

            if (!item.vehicleType) {
                log(`Unknown vehicle_type_id skipped: ${item.vehicleTypeId} | ${item.editHref}`, 'error');
                STATE.skippedCount++;
                updateCounters();
                continue;
            }

            const info = VEHICLE_INFO[item.vehicleType];

            if (!info) {
                log(`No naming rule skipped: "${item.vehicleType}"`, 'error');
                STATE.skippedCount++;
                updateCounters();
                continue;
            }

            counts[item.vehicleType] = (counts[item.vehicleType] || 0) + 1;

            const newName = makeVehicleName(
                station,
                item.vehicleType,
                counts[item.vehicleType]
            );

            setStatus('Opening edit page');
            setVehicle(item.editHref);

            // Replace rather than append to the iframe history. This prevents a
            // long rename run from retaining one browsing-history document for
            // every vehicle edit page.
            if (!navigateUnitIframe(iframe, item.editHref)) {
                log(`Could not navigate to vehicle edit page: ${item.editHref}`, 'error');
                STATE.skippedCount++;
                updateCounters();
                continue;
            }

            const editPageReady = await waitForEditPage(iframe);

            if (!editPageReady) {
                log(`Vehicle edit page did not load: ${item.editHref}`, 'error');
                STATE.skippedCount++;
                updateCounters();
                continue;
            }

            let editDoc = iframe.contentDocument;
            let captionInput = editDoc?.querySelector('#vehicle_caption') || null;
            let saveBtn = editDoc?.querySelector(
                'input[type="submit"][value="Save"], button[type="submit"]'
            ) || null;

            if (!captionInput || !saveBtn) {
                log(`Caption or Save missing: ${item.editHref}`, 'error');
                STATE.skippedCount++;
                updateCounters();
                editDoc = null;
                captionInput = null;
                saveBtn = null;
                continue;
            }

            const before = captionInput.value;

            setStatus('Saving vehicle');
            setVehicle(newName);

            captionInput.value = newName;
            captionInput.dispatchEvent(new Event('input', { bubbles: true }));
            captionInput.dispatchEvent(new Event('change', { bubbles: true }));

            log(`BEFORE: ${before}`, 'before');
            log(`AFTER : ${newName}`, 'after');

            saveBtn.click();

            STATE.renamedCount++;
            updateCounters();

            // Do not retain the completed edit document or its form controls
            // during the post-save wait.
            editDoc = null;
            captionInput = null;
            saveBtn = null;

            await sleep(700);
        }

        navigateUnitIframe(iframe, station.href);
        await waitForVehicleTable(iframe);
        await sleep(300);
    }

'''
replace_function(
    '    async function processStationVehicleQueue(iframe, station) {',
    '    async function closeStationModal(',
    new_queue_function,
    'replace Unit Naming vehicle queue processor',
)

new_close_function = r'''    async function closeStationModal(iframe = STATE.activeIframe) {
        setStatus('Closing station');

        const activeIframe = iframe || STATE.activeIframe;
        if (STATE.activeIframe === activeIframe) {
            STATE.activeIframe = null;
        }

        const closeBtn = getUnitModalCloseButton(activeIframe);

        if (closeBtn) {
            closeBtn.click();

            // Give the framework a short opportunity to detach or hide the
            // correct modal before its iframe document is cleared.
            for (let attempt = 0; attempt < 15; attempt++) {
                const modal = activeIframe?.closest?.(
                    '.vm--modal, [role="dialog"], .lightbox, .modal'
                );

                if (
                    !activeIframe?.isConnected ||
                    (modal && modal.offsetParent === null)
                ) {
                    break;
                }

                await sleep(100);
            }
        } else {
            log('Close button not found.', 'error');
        }

        // MissionChief may hide and reuse the modal instead of removing it.
        // Blank the associated iframe so its station/edit documents and history
        // become collectible before the next station is opened.
        releaseUnitIframeDocument(activeIframe);
        await sleep(150);
    }

'''
replace_function(
    '    async function closeStationModal(',
    '    async function waitIfPaused(',
    new_close_function,
    'replace Unit Naming modal closer',
)

SOURCE.write_text(source, encoding='utf-8', newline='\n')

readme = README.read_text(encoding='utf-8')
if readme.count('**Current version:** `1.0.7`') != 1:
    raise SystemExit('README current version anchor changed')
README.write_text(
    readme.replace('**Current version:** `1.0.7`', '**Current version:** `1.0.8`', 1),
    encoding='utf-8',
    newline='\n',
)

src_readme = SRC_README.read_text(encoding='utf-8')
if src_readme.count('| Command Nexus version | `1.0.7` |') != 1:
    raise SystemExit('Source README version anchor changed')
SRC_README.write_text(
    src_readme.replace('| Command Nexus version | `1.0.7` |', '| Command Nexus version | `1.0.8` |', 1),
    encoding='utf-8',
    newline='\n',
)

changelog = CHANGELOG.read_text(encoding='utf-8')
anchor = '## [1.0.7] - 2026-07-20'
if changelog.count(anchor) != 1:
    raise SystemExit('CHANGELOG 1.0.7 anchor changed')
entry = '''## [1.0.8] - 2026-07-20

### Fixed

- Fixed Unit Naming long runs retaining the full original station document while navigating through every vehicle edit page.
- Replaced Unit Naming iframe navigation history entries instead of continually appending edit-page history.
- Closed the modal associated with the active Unit Naming iframe rather than the first close control in the document.
- Cleared hidden or reused station iframes after each station so old station and vehicle documents can be garbage collected.
- Released edit-document and form-control references before each post-save delay and guaranteed iframe cleanup after stop, error or page exit.

### Changed

- Unit Naming increased from `3.3.3` to `3.3.4`; naming rules, vehicle order, numbering and save behaviour are unchanged.

'''
CHANGELOG.write_text(
    changelog.replace(anchor, entry + anchor, 1),
    encoding='utf-8',
    newline='\n',
)

print('Prepared v1.0.8 Unit Renamer memory-safety release')
