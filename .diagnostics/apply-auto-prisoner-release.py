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
    "// @version      1.0.41",
    "// @version      1.0.42",
    "userscript version",
)

if "V10.6.105" not in source:
    raise SystemExit("Mission Finder V10.6.105 marker was not found")
source = source.replace("V10.6.105", "V10.6.106")

source = replace_once(
    source,
    "const MF_AUTO_PRISONER_CELL_MAX_ATTEMPTS = 2;\n",
    "const MF_AUTO_PRISONER_CELL_MAX_ATTEMPTS = 2;\n"
    "const MF_AUTO_PRISONER_RELEASE_STATE_KEY =\n"
    "    'mf_auto_prisoner_release_v1';\n"
    "const MF_AUTO_PRISONER_RELEASE_CLICK_RETRY_MS = 6500;\n"
    "const MF_AUTO_PRISONER_RELEASE_MAX_ATTEMPTS = 2;\n",
    "prisoner release constants",
)

release_helpers = dedent(
    r'''
    function getExactAutoReleasePrisonersLink(context) {
        if (!context || !context.root || !context.root.querySelectorAll) {
            return null;
        }

        const missionId = String(
            getCurrentMissionIdForQueueRestart() || ''
        ).trim();

        if (!/^\d+$/.test(missionId)) return null;

        const links = Array.from(
            context.root.querySelectorAll(
                'a.btn.btn-danger[data-method="post"][href*="/gefangene/entlassen"]'
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

            const text = String(
                link.innerText || link.textContent || ''
            )
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();

            if (text !== 'release prisoners') continue;

            let releaseUrl;
            try {
                releaseUrl = new URL(
                    link.getAttribute('href') || link.href || '',
                    context.document.location?.origin ||
                        window.location.origin
                );
            } catch (_error) {
                continue;
            }

            if (
                releaseUrl.origin !== window.location.origin ||
                releaseUrl.pathname !==
                    `/missions/${missionId}/gefangene/entlassen`
            ) {
                continue;
            }

            return link;
        }

        return null;
    }

    function readAutoPrisonerReleaseState() {
        try {
            const parsed = JSON.parse(
                sessionStorage.getItem(
                    MF_AUTO_PRISONER_RELEASE_STATE_KEY
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

    function writeAutoPrisonerReleaseState(state) {
        try {
            sessionStorage.setItem(
                MF_AUTO_PRISONER_RELEASE_STATE_KEY,
                JSON.stringify(state)
            );
        } catch (_error) {}
    }

    function clearAutoPrisonerReleaseState() {
        try {
            sessionStorage.removeItem(
                MF_AUTO_PRISONER_RELEASE_STATE_KEY
            );
        } catch (_error) {}
    }

    async function handleAutoPrisonerReleaseAfterActions() {
        const context = getActivePrisonerCellSelectionContext();

        if (!context) {
            clearAutoPrisonerReleaseState();
            return 'none';
        }

        const availableDestination =
            getFirstAvailablePrisonCellDestination(context);

        if (availableDestination) {
            clearAutoPrisonerReleaseState();
            updateStatusBox(
                'Auto Mode: an available cell is still listed. Restarting the cell handoff before release fallback...'
            );
            return 'cell-available';
        }

        const releaseLink =
            getExactAutoReleasePrisonersLink(context);

        if (!releaseLink) {
            if (mfDebugEnabled) {
                debugLog(
                    'AUTO PRISONER RELEASE',
                    'The prisoner alert remained after all actions, but the exact current-mission Release Prisoners link was not available.'
                );
            }
            return 'stuck';
        }

        const href = String(
            releaseLink.getAttribute('href') ||
                releaseLink.href ||
                ''
        ).trim();
        const ownerKey = String(
            getCurrentMissionIdForQueueRestart() ||
                window.location.href ||
                ''
        );
        const previous = readAutoPrisonerReleaseState();
        const sameRelease = !!(
            previous &&
            previous.ownerKey === ownerKey &&
            previous.href === href
        );
        const previousAge = sameRelease
            ? Date.now() - previous.clickedAt
            : Number.POSITIVE_INFINITY;

        if (
            sameRelease &&
            previousAge >= 0 &&
            previousAge < MF_AUTO_PRISONER_RELEASE_CLICK_RETRY_MS
        ) {
            updateStatusBox(
                'Auto Mode: waiting for Release Prisoners to complete before dispatch...'
            );
            return 'waiting';
        }

        const attempts = sameRelease
            ? previous.attempts + 1
            : 1;

        if (attempts > MF_AUTO_PRISONER_RELEASE_MAX_ATTEMPTS) {
            if (mfDebugEnabled) {
                debugLog(
                    'AUTO PRISONER RELEASE',
                    `Release Prisoners did not complete after ${previous.attempts} click attempt(s): ${href}`
                );
            }
            return 'stuck';
        }

        writeAutoPrisonerReleaseState({
            ownerKey,
            href,
            clickedAt: Date.now(),
            attempts
        });

        updateStatusBox(
            'Auto Mode: all other actions are complete. Releasing the remaining prisoners before dispatch...'
        );

        if (mfDebugEnabled) {
            debugLog(
                'AUTO PRISONER RELEASE',
                `Clicking exact current-mission Release Prisoners fallback | attempt=${attempts} | href=${href}`
            );
        }

        const clicked = realClickForQueueRestart(releaseLink);

        if (!clicked) {
            clearAutoPrisonerReleaseState();
            return 'stuck';
        }

        await wait(450);
        return 'clicked';
    }

    '''
)

source = replace_once(
    source,
    "    function mfIsPoliceOrPrisonerTransportActive() {\n",
    release_helpers + "    function mfIsPoliceOrPrisonerTransportActive() {\n",
    "release helper insertion",
)

source = replace_once(
    source,
    "    if (!context) {\n"
    "        clearAutoPrisonerCellHandoffState();\n"
    "        return 'none';\n"
    "    }\n",
    "    if (!context) {\n"
    "        clearAutoPrisonerCellHandoffState();\n"
    "        clearAutoPrisonerReleaseState();\n"
    "        return 'none';\n"
    "    }\n",
    "clear stale release state",
)

source = replace_once(
    source,
    "    if (!destination) {\n"
    "        if (mfDebugEnabled) {\n"
    "            debugLog(\n"
    "                'AUTO PRISONER CELL',\n"
    "                'Prisoner alert remained visible, but no active green destination with available cells was found.'\n"
    "            );\n"
    "        }\n"
    "\n"
    "        return 'stuck';\n"
    "    }\n",
    "    if (!destination) {\n"
    "        clearAutoPrisonerCellHandoffState();\n"
    "\n"
    "        if (mfDebugEnabled) {\n"
    "            debugLog(\n"
    "                'AUTO PRISONER CELL',\n"
    "                'No active cell destination is available. Deferring the exact Release Prisoners fallback until normal Auto Mode actions are complete.'\n"
    "            );\n"
    "        }\n"
    "\n"
    "        return 'defer-release';\n"
    "    }\n",
    "defer release when no cell is available",
)

early_gate_old = """            if (prisonerCellGate !== 'none') {
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

"""
early_gate_new = """            if (prisonerCellGate === 'defer-release') {
                updateStatusBox(
                    'Auto Mode: no available cell destination. Finishing normal mission actions before the Release Prisoners fallback...'
                );

                if (mfDebugEnabled) {
                    debugLog(
                        'AUTO PRISONER CELL',
                        'Cell handoff deferred; Unit Finder and Mission Update may proceed before the final release fallback.'
                    );
                }
            } else if (prisonerCellGate !== 'none') {
                clearAutoSelectionMissionGuard(
                    'prisoner cell handoff before Unit Finder'
                );
                resetVehicleLoadState();
                changeDispatchBoxColor(false);

                if (prisonerCellGate === 'stuck') {
                    stopAutoMode(
                        'Auto stopped: the prisoner cell handoff could not be completed. Unit Finder was not started.'
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

"""
source = replace_once(
    source,
    early_gate_old,
    early_gate_new,
    "early prisoner gate caller",
)

final_gate = """            const prisonerReleaseResult =
                await handleAutoPrisonerReleaseAfterActions();

            if (prisonerReleaseResult !== 'none') {
                clearAutoSelectionMissionGuard(
                    'final prisoner release fallback'
                );
                resetVehicleLoadState();
                changeDispatchBoxColor(false);

                if (prisonerReleaseResult === 'stuck') {
                    stopAutoMode(
                        'Auto stopped: all other actions completed, but the remaining prisoners could not be placed or released. Dispatch was not clicked.'
                    );
                    break;
                }

                await wait(
                    prisonerReleaseResult === 'waiting'
                        ? 500
                        : 850
                );
                continue;
            }

"""
source = replace_once(
    source,
    "            const visibleProblemAlert = getVisibleInlineProblemAlertText();\n",
    final_gate +
    "            const visibleProblemAlert = getVisibleInlineProblemAlertText();\n",
    "final release gate before dispatch validation",
)

source_path.write_text(source, encoding="utf-8")

for path in Path("scripts").glob("check-*.mjs"):
    text = path.read_text(encoding="utf-8")
    text = text.replace("// @version      1.0.41", "// @version      1.0.42")
    text = text.replace("v1.0.41 metadata", "v1.0.42 metadata")
    text = text.replace("V10.6.105", "V10.6.106")
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
  ['// @version      1.0.42', 'v1.0.42 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.106', 'Mission Finder V10.6.106 header'],
  ['the prisoners should be placed in a cell', 'normalised prisoner alert contract'],
  ['a.btn.btn-success[data-prison-id][href*="/gefangener/"]', 'green prison destination selector'],
  ['a.btn.btn-danger[data-method="post"][href*="/gefangene/entlassen"]', 'exact release fallback selector'],
  ['function handleAutoPrisonerCellBeforeUnitFinder(', 'early prisoner cell gate'],
  ['function handleAutoPrisonerReleaseAfterActions(', 'final prisoner release gate'],
  ['await handleAutoPrisonerCellBeforeUnitFinder();', 'early gate invocation'],
  ['await handleAutoPrisonerReleaseAfterActions();', 'final gate invocation'],
  ["return 'defer-release';", 'deferred final fallback outcome'],
  ['realClickForQueueRestart(releaseLink);', 'single native release click'],
  ['MF_AUTO_PRISONER_RELEASE_STATE_KEY', 'release duplicate-click guard'],
]) {
  if (!source.includes(token)) fail(`Missing Auto prisoner contract: ${label}`);
}

const runStart = source.indexOf('async function runAutoModeLoop()');
const earlyGateCall = source.indexOf('await handleAutoPrisonerCellBeforeUnitFinder();', runStart);
const updateWait = source.indexOf('await waitForMissionUpdateBeforeUnitFinder(', runStart);
const vehicleLoad = source.indexOf('await ensureVehicleListLoaded({', runStart);
const unitFinder = source.indexOf('handleCombinedLogic({', runStart);
const missionUpdate = source.indexOf('handleMissionUpdateUnits(', unitFinder);
const finalGateCall = source.indexOf('await handleAutoPrisonerReleaseAfterActions();', missionUpdate);
const problemAlert = source.indexOf('const visibleProblemAlert = getVisibleInlineProblemAlertText();', finalGateCall);

if ([runStart, earlyGateCall, updateWait, vehicleLoad, unitFinder, missionUpdate, finalGateCall, problemAlert].some(value => value < 0)) {
  fail('Unable to locate the complete Auto Mode prisoner ordering contract');
}

if (!(earlyGateCall < updateWait && earlyGateCall < vehicleLoad && earlyGateCall < unitFinder)) {
  fail('Cell destination handling must remain before Mission Update wait, vehicle loading and Unit Finder');
}

if (!(finalGateCall > unitFinder && finalGateCall > missionUpdate && finalGateCall < problemAlert)) {
  fail('Release Prisoners fallback must run after Unit Finder and Mission Update but before dispatch validation');
}

const selectorStart = source.indexOf('function getFirstAvailablePrisonCellDestination(');
const selectorEnd = source.indexOf('function readAutoPrisonerCellHandoffState(', selectorStart);
const selectorBody = source.slice(selectorStart, selectorEnd);

for (const forbidden of ['entlassen', 'btn-danger', 'release prisoners']) {
  if (selectorBody.toLowerCase().includes(forbidden)) {
    fail(`Early prison destination selector contains forbidden release path: ${forbidden}`);
  }
}

const releaseStart = source.indexOf('function getExactAutoReleasePrisonersLink(');
const releaseEnd = source.indexOf('function readAutoPrisonerReleaseState(', releaseStart);
const releaseSelector = source.slice(releaseStart, releaseEnd);

for (const required of [
  'btn-danger',
  'data-method="post"',
  '/gefangene/entlassen',
  "text !== 'release prisoners'",
  '`/missions/${missionId}/gefangene/entlassen`',
  'releaseUrl.origin !== window.location.origin',
]) {
  if (!releaseSelector.includes(required)) {
    fail(`Exact release selector is missing: ${required}`);
  }
}

const finalStart = source.indexOf('async function handleAutoPrisonerReleaseAfterActions(');
const finalEnd = source.indexOf('function mfIsPoliceOrPrisonerTransportActive(', finalStart);
const finalBody = source.slice(finalStart, finalEnd);
const availableCheck = finalBody.indexOf('getFirstAvailablePrisonCellDestination(context)');
const releaseLookup = finalBody.indexOf('getExactAutoReleasePrisonersLink(context)');

if (!(availableCheck >= 0 && releaseLookup > availableCheck)) {
  fail('Final fallback must re-check available cell destinations before locating Release Prisoners');
}

for (const outcome of ["return 'cell-available';", "return 'clicked';", "return 'waiting';", "return 'stuck';"]) {
  if (!finalBody.includes(outcome)) fail(`Final release gate is missing outcome: ${outcome}`);
}

if (!source.includes("prisonerReleaseResult === 'stuck'")) {
  fail('Auto Mode must stop safely when the exact release fallback cannot complete');
}

console.log('Auto Mode prefers active cells, finishes normal actions when none are available, then clicks only the exact current-mission Release Prisoners fallback before dispatch.');
'''
    ),
    encoding="utf-8",
)

for readme_path in [Path("README.md"), Path("src/README.md")]:
    text = readme_path.read_text(encoding="utf-8")
    text = text.replace("1.0.41", "1.0.42")
    text = text.replace("V10.6.105", "V10.6.106")
    readme_path.write_text(text, encoding="utf-8")

changelog_path = Path("CHANGELOG.md")
changelog = changelog_path.read_text(encoding="utf-8")
release_entry = dedent(
    '''
    ## [1.0.42] - 2026-07-26

    ### Changed

    - Auto Mode continues to prefer the first visible active prison destination with free cells.
    - When the prisoner alert remains but no available cell destination exists, Unit Finder, Mission Update and normal vehicle-selection actions are allowed to finish before the fallback is considered.

    ### Added

    - After all normal Auto Mode actions complete, the exact current-mission `Release Prisoners` link is clicked if the prisoner alert still remains.
    - The release fallback restarts the Auto cycle and must clear before dispatch or queue advance can continue.

    ### Safety

    - Release is allowed only for a visible `btn-danger` link with `data-method="post"`, exact text `Release Prisoners` and the exact current mission `/gefangene/entlassen` route.
    - The fallback is never used while any active destination with positive free-cell capacity remains.
    - A separate session guard prevents duplicate release clicks while MissionChief processes the request.

    ### Changed engine baseline

    - Mission Finder increased from `V10.6.105` to `V10.6.106`.

    '''
)
changelog = replace_once(
    changelog,
    "## [1.0.41] - 2026-07-26\n",
    release_entry + "## [1.0.41] - 2026-07-26\n",
    "changelog release insertion",
)
changelog_path.write_text(changelog, encoding="utf-8")
