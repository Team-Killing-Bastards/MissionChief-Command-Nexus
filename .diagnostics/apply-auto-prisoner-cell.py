from pathlib import Path
from textwrap import dedent


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


source_path = Path("src/missionchief-command-nexus.user.js")
source = source_path.read_text(encoding="utf-8")

source = replace_once(
    source,
    "// @version      1.0.40",
    "// @version      1.0.41",
    "userscript version",
)

if "V10.6.104" not in source:
    raise SystemExit("Mission Finder V10.6.104 marker was not found")
source = source.replace("V10.6.104", "V10.6.105")

helper_anchor = "    function mfIsPoliceOrPrisonerTransportActive() {\n"
helper_code = dedent(
    r'''
    const MF_AUTO_PRISONER_CELL_HANDOFF_KEY =
        'mf_auto_prisoner_cell_handoff_v1';
    const MF_AUTO_PRISONER_CELL_DESTINATION_WAIT_MS = 8000;
    const MF_AUTO_PRISONER_CELL_CLICK_RETRY_MS = 6500;
    const MF_AUTO_PRISONER_CELL_MAX_ATTEMPTS = 2;

    function getActivePrisonerCellSelectionContext() {
        const candidateDocuments =
            typeof mfGetAccessibleDocumentsForTransport === 'function'
                ? mfGetAccessibleDocumentsForTransport()
                : [document];

        for (const candidateDocument of candidateDocuments) {
            if (!candidateDocument || !candidateDocument.querySelectorAll) {
                continue;
            }

            const alerts = Array.from(
                candidateDocument.querySelectorAll('.alert.alert-info')
            );

            for (const alert of alerts) {
                try {
                    if (!mfIsVisibleInOwnDocument(alert)) continue;
                } catch (_error) {
                    continue;
                }

                const alertText = String(
                    alert.innerText || alert.textContent || ''
                )
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();

                if (
                    !alertText.includes(
                        'the prisoners should be placed in a cell'
                    )
                ) {
                    continue;
                }

                const root =
                    alert.closest('#col_left') ||
                    alert.closest(
                        '.vm--modal, .modal, .lightbox, #lightbox_box'
                    ) ||
                    candidateDocument.body ||
                    candidateDocument;

                return {
                    document: candidateDocument,
                    alert,
                    root
                };
            }
        }

        return null;
    }

    function getFirstAvailablePrisonCellDestination(context) {
        if (!context || !context.root || !context.root.querySelectorAll) {
            return null;
        }

        const links = Array.from(
            context.root.querySelectorAll(
                'a.btn.btn-success[data-prison-id][href*="/gefangener/"]'
            )
        );

        for (const link of links) {
            try {
                if (!mfIsVisibleInOwnDocument(link)) continue;
            } catch (_error) {
                continue;
            }

            if (
                link.hidden ||
                link.classList.contains('disabled') ||
                link.classList.contains('hidden') ||
                link.classList.contains('d-none') ||
                link.getAttribute('aria-disabled') === 'true'
            ) {
                continue;
            }

            const href = String(
                link.getAttribute('href') || link.href || ''
            ).trim();
            const prisonId = String(
                link.getAttribute('data-prison-id') || ''
            ).trim();

            if (!/^\d+$/.test(prisonId)) continue;

            let destinationUrl;
            try {
                destinationUrl = new URL(
                    href,
                    context.document.location?.origin ||
                        window.location.origin
                );
            } catch (_error) {
                continue;
            }

            const pathMatch = destinationUrl.pathname.match(
                /^\/vehicles\/(\d+)\/gefangener\/(\d+)\/?$/
            );

            if (!pathMatch || pathMatch[2] !== prisonId) continue;

            const label = String(
                link.innerText || link.textContent || ''
            )
                .replace(/\s+/g, ' ')
                .trim();
            const capacityMatch = label.match(
                /(?:free|available)\s+cells?\s*:\s*(\d+)/i
            );

            if (
                capacityMatch &&
                Number(capacityMatch[1]) <= 0
            ) {
                continue;
            }

            return link;
        }

        return null;
    }

    function readAutoPrisonerCellHandoffState() {
        try {
            const parsed = JSON.parse(
                sessionStorage.getItem(
                    MF_AUTO_PRISONER_CELL_HANDOFF_KEY
                ) ||
                    'null'
            );

            if (!parsed || typeof parsed !== 'object') return null;

            return {
                ownerKey: String(parsed.ownerKey || ''),
                href: String(parsed.href || ''),
                clickedAt: Number(parsed.clickedAt || 0),
                attempts: Math.max(
                    0,
                    Math.trunc(Number(parsed.attempts || 0))
                )
            };
        } catch (_error) {
            return null;
        }
    }

    function writeAutoPrisonerCellHandoffState(state) {
        try {
            sessionStorage.setItem(
                MF_AUTO_PRISONER_CELL_HANDOFF_KEY,
                JSON.stringify(state)
            );
        } catch (_error) {}
    }

    function clearAutoPrisonerCellHandoffState() {
        try {
            sessionStorage.removeItem(
                MF_AUTO_PRISONER_CELL_HANDOFF_KEY
            );
        } catch (_error) {}
    }

    async function handleAutoPrisonerCellBeforeUnitFinder() {
        let context = getActivePrisonerCellSelectionContext();

        if (!context) {
            clearAutoPrisonerCellHandoffState();
            return 'none';
        }

        updateStatusBox(
            'Auto Mode: prisoner cell handoff detected. Selecting the first available cell before Unit Finder...'
        );

        const destinationWaitStarted = Date.now();
        let destination =
            getFirstAvailablePrisonCellDestination(context);

        while (
            !destination &&
            autoModeRunning &&
            !isManualAutoStopActive() &&
            Date.now() - destinationWaitStarted <
                MF_AUTO_PRISONER_CELL_DESTINATION_WAIT_MS
        ) {
            await wait(250);

            context = getActivePrisonerCellSelectionContext();

            if (!context) {
                clearAutoPrisonerCellHandoffState();
                return 'handled';
            }

            destination =
                getFirstAvailablePrisonCellDestination(context);
        }

        if (!autoModeRunning || isManualAutoStopActive()) {
            return 'stuck';
        }

        if (!destination) {
            if (mfDebugEnabled) {
                debugLog(
                    'AUTO PRISONER CELL',
                    'Prisoner alert remained visible, but no active green destination with available cells was found.'
                );
            }

            return 'stuck';
        }

        const href = String(
            destination.getAttribute('href') ||
                destination.href ||
                ''
        ).trim();
        const ownerKey =
            getCurrentMissionIdForQueueRestart() ||
            String(window.location.href || '');
        const previous = readAutoPrisonerCellHandoffState();
        const sameDestination = !!(
            previous &&
            previous.ownerKey === ownerKey &&
            previous.href === href
        );
        const previousAge = sameDestination
            ? Date.now() - previous.clickedAt
            : Number.POSITIVE_INFINITY;

        if (
            sameDestination &&
            previousAge >= 0 &&
            previousAge < MF_AUTO_PRISONER_CELL_CLICK_RETRY_MS
        ) {
            updateStatusBox(
                'Auto Mode: waiting for the prisoner cell handoff to complete before Unit Finder...'
            );
            return 'waiting';
        }

        const attempts = sameDestination
            ? previous.attempts + 1
            : 1;

        if (attempts > MF_AUTO_PRISONER_CELL_MAX_ATTEMPTS) {
            if (mfDebugEnabled) {
                debugLog(
                    'AUTO PRISONER CELL',
                    `Destination did not complete after ${previous.attempts} click attempt(s): ${href}`
                );
            }

            return 'stuck';
        }

        writeAutoPrisonerCellHandoffState({
            ownerKey,
            href,
            clickedAt: Date.now(),
            attempts
        });

        const destinationLabel = String(
            destination.innerText ||
                destination.textContent ||
                'available cell'
        )
            .replace(/\s+/g, ' ')
            .trim();

        updateStatusBox(
            `Auto Mode: assigning prisoner to ${destinationLabel.slice(0, 120)}...`
        );

        if (mfDebugEnabled) {
            debugLog(
                'AUTO PRISONER CELL',
                `Clicking first active destination in DOM order | attempt=${attempts} | href=${href} | label="${destinationLabel}"`
            );
        }

        const clicked = realClickForQueueRestart(destination);

        if (!clicked) {
            clearAutoPrisonerCellHandoffState();
            return 'stuck';
        }

        await wait(450);
        return 'clicked';
    }

'''
)

source = replace_once(
    source,
    helper_anchor,
    helper_code + helper_anchor,
    "prisoner helper insertion",
)

source = replace_once(
    source,
    helper_anchor,
    helper_anchor +
    "        if (getActivePrisonerCellSelectionContext()) return true;\n\n",
    "prisoner transport active gate",
)

auto_anchor = dedent(
    '''            const autoCycleMissionId =
                getCurrentMissionIdForQueueRestart();

            clearAutoSelectionMissionGuard(
'''
)
auto_replacement = dedent(
    '''            const autoCycleMissionId =
                getCurrentMissionIdForQueueRestart();

            const prisonerCellGate =
                await handleAutoPrisonerCellBeforeUnitFinder();

            if (prisonerCellGate !== 'none') {
                clearAutoSelectionMissionGuard(
                    'prisoner cell handoff before Unit Finder'
                );
                resetVehicleLoadState();
                changeDispatchBoxColor(false);

                if (prisonerCellGate === 'stuck') {
                    stopAutoMode(
                        'Auto stopped: prisoners require a cell, but no active available destination could be completed. Unit Finder was not started.'
                    );
                    break;
                }

                await wait(
                    prisonerCellGate === 'waiting'
                        ? 500
                        : 850
                );
                continue;
            }

            clearAutoSelectionMissionGuard(
'''
)
source = replace_once(
    source,
    auto_anchor,
    auto_replacement,
    "Auto Mode pre-Unit-Finder gate",
)

source_path.write_text(source, encoding="utf-8")

for path in Path("scripts").glob("*.mjs"):
    text = path.read_text(encoding="utf-8")
    text = text.replace("// @version      1.0.40", "// @version      1.0.41")
    text = text.replace("v1.0.40 metadata", "v1.0.41 metadata")
    text = text.replace("V10.6.104", "V10.6.105")
    path.write_text(text, encoding="utf-8")

Path("scripts/check-auto-prisoner-cell-gate.mjs").write_text(
    dedent(
        r'''#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

for (const [token, label] of [
  ['// @version      1.0.41', 'v1.0.41 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.105', 'Mission Finder V10.6.105 header'],
  ['The prisoners should be placed in a cell', 'exact prisoner alert contract'],
  ['a.btn.btn-success[data-prison-id][href*="/gefangener/"]', 'green prison destination selector'],
  ['function getActivePrisonerCellSelectionContext(', 'prisoner alert context detector'],
  ['function getFirstAvailablePrisonCellDestination(', 'first active destination selector'],
  ['function handleAutoPrisonerCellBeforeUnitFinder(', 'Auto Mode prisoner gate'],
  ['await handleAutoPrisonerCellBeforeUnitFinder();', 'Auto Mode gate invocation'],
  ['realClickForQueueRestart(destination);', 'single native destination click'],
  ['MF_AUTO_PRISONER_CELL_HANDOFF_KEY', 'duplicate-click session guard'],
  ["if (getActivePrisonerCellSelectionContext()) return true;", 'queue/transport ownership block'],
]) {
  if (!source.includes(token)) fail(`Missing Auto prisoner-cell contract: ${label}`);
}

const runStart = source.indexOf('async function runAutoModeLoop()');
const gateCall = source.indexOf('await handleAutoPrisonerCellBeforeUnitFinder();', runStart);
const updateWait = source.indexOf('await waitForMissionUpdateBeforeUnitFinder(', runStart);
const vehicleLoad = source.indexOf('await ensureVehicleListLoaded({', runStart);
const unitFinder = source.indexOf('handleCombinedLogic({', runStart);

if (runStart < 0 || gateCall < 0 || updateWait < 0 || vehicleLoad < 0 || unitFinder < 0) {
  fail('Unable to locate the complete Auto Mode ordering contract');
}

if (!(gateCall < updateWait && gateCall < vehicleLoad && gateCall < unitFinder)) {
  fail('Prisoner cell gate must run before Mission Update wait, vehicle loading and Unit Finder');
}

const selectorStart = source.indexOf('function getFirstAvailablePrisonCellDestination(');
const selectorEnd = source.indexOf('function readAutoPrisonerCellHandoffState(', selectorStart);
const selectorBody = source.slice(selectorStart, selectorEnd);

for (const forbidden of [
  'entlassen',
  'btn-danger',
  'release prisoners',
]) {
  if (selectorBody.toLowerCase().includes(forbidden)) {
    fail(`Prison destination selector contains forbidden release path: ${forbidden}`);
  }
}

for (const required of [
  'btn-success',
  'data-prison-id',
  '/gefangener/',
  'free|available',
  'return link;',
]) {
  if (!selectorBody.toLowerCase().includes(required.toLowerCase())) {
    fail(`Prison destination selector is missing: ${required}`);
  }
}

const gateStart = source.indexOf('async function handleAutoPrisonerCellBeforeUnitFinder(');
const gateEnd = source.indexOf('function mfIsPoliceOrPrisonerTransportActive(', gateStart);
const gateBody = source.slice(gateStart, gateEnd);

if (!gateBody.includes("return 'clicked';") || !gateBody.includes("return 'waiting';") || !gateBody.includes("return 'stuck';")) {
  fail('Prisoner gate must expose clicked, waiting and stuck outcomes');
}

if (!source.includes("prisonerCellGate === 'stuck'")) {
  fail('Auto Mode must stop safely when the prisoner handoff cannot complete');
}

console.log('Auto Mode handles the first active prisoner-cell destination before Unit Finder and never releases prisoners.');
'''
    ),
    encoding="utf-8",
)

readme = Path("README.md")
text = readme.read_text(encoding="utf-8")
text = replace_once(
    text,
    "**Current version:** `1.0.40`",
    "**Current version:** `1.0.41`",
    "README version",
)
text = replace_once(
    text,
    "**Mission Finder engine:** `V10.6.104`",
    "**Mission Finder engine:** `V10.6.105`",
    "README engine",
)
readme.write_text(text, encoding="utf-8")

source_readme = Path("src/README.md")
text = source_readme.read_text(encoding="utf-8")
text = replace_once(
    text,
    "| Command Nexus version | `1.0.40` |",
    "| Command Nexus version | `1.0.41` |",
    "source README version",
)
text = replace_once(
    text,
    "| Mission Finder baseline | `V10.6.104` |",
    "| Mission Finder baseline | `V10.6.105` |",
    "source README engine",
)
source_readme.write_text(text, encoding="utf-8")

changelog = Path("CHANGELOG.md")
text = changelog.read_text(encoding="utf-8")
marker = "## [1.0.40] - 2026-07-26"
if marker not in text:
    raise SystemExit("Unable to find v1.0.40 changelog marker")
entry = dedent(
    '''## [1.0.41] - 2026-07-26

### Added

- Auto Mode now detects the visible prisoner-cell handoff before Mission Update, vehicle loading or Unit Finder.
- It selects the first visible green MissionChief destination link in DOM order when the link has a valid `data-prison-id`, a `/gefangener/` route and positive free-cell capacity.
- A session guard prevents duplicate clicks while MissionChief processes the handoff.

### Safety

- The red `Release Prisoners` action is never considered or clicked.
- Auto Mode stops without running Unit Finder when the prisoner alert remains but no active destination can be completed.

### Changed engine baseline

- Mission Finder increased from `V10.6.104` to `V10.6.105`.

'''
)
changelog.write_text(text.replace(marker, entry + marker, 1), encoding="utf-8")
