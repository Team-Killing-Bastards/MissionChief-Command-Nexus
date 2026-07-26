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
    "// @version      1.0.42",
    "// @version      1.0.43",
    "userscript version",
)

if "V10.6.106" not in source:
    raise SystemExit("Mission Finder V10.6.106 marker was not found")
source = source.replace("V10.6.106", "V10.6.107")

constant_anchor = "const MF_AUTO_PRISONER_RELEASE_MAX_ATTEMPTS = 2;\n"
constant_replacement = constant_anchor + dedent(
    '''\
    const MF_AUTO_PRISONER_RELEASE_RESULT_WAIT_MS = 10000;
    const MF_AUTO_PRISONER_RELEASE_DISMISS_WAIT_MS = 8000;
    const MF_AUTO_PRISONER_RELEASE_DISMISS_CLOSE_WAIT_MS = 8000;
    '''
)
source = replace_once(
    source,
    constant_anchor,
    constant_replacement,
    "release dismiss constants",
)

helper_anchor = "function getExactAutoReleasePrisonersLink(context) {\n"
helper_code = dedent(
    r'''
    function getVisibleAutoPrisonerReleaseDismissContexts() {
        const candidateDocuments =
            typeof mfGetAccessibleDocumentsForTransport === 'function'
                ? mfGetAccessibleDocumentsForTransport()
                : [document];
        const candidates = [];
        let order = 0;

        for (const candidateDocument of candidateDocuments) {
            if (!candidateDocument || !candidateDocument.querySelectorAll) {
                continue;
            }

            const closeButtons = Array.from(
                candidateDocument.querySelectorAll(
                    'span.lightbox-close[title="Close"], .lightbox-close[title="Close"]'
                )
            );

            for (const closeButton of closeButtons) {
                order += 1;

                if (!closeButton || closeButton.id?.includes('mf-')) {
                    continue;
                }

                try {
                    if (!mfIsVisibleInOwnDocument(closeButton)) continue;
                } catch (_error) {
                    continue;
                }

                const modal = closeButton.closest(
                    '.vm--modal, .modal, .lightbox, #lightbox_box, #iframe-inside-container'
                );

                if (!modal) continue;

                try {
                    if (!mfIsVisibleInOwnDocument(modal)) continue;
                } catch (_error) {
                    continue;
                }

                let zIndex = 0;
                try {
                    const rawZIndex =
                        candidateDocument.defaultView
                            ?.getComputedStyle(modal)
                            ?.zIndex ||
                        modal.style?.zIndex ||
                        '0';
                    const parsedZIndex = Number.parseInt(rawZIndex, 10);
                    zIndex = Number.isFinite(parsedZIndex)
                        ? parsedZIndex
                        : 0;
                } catch (_error) {}

                candidates.push({
                    closeButton,
                    modal,
                    zIndex,
                    order
                });
            }
        }

        candidates.sort((left, right) =>
            left.zIndex - right.zIndex ||
            left.order - right.order
        );

        return candidates;
    }

    function getTopmostAutoPrisonerReleaseDismissContext() {
        const candidates =
            getVisibleAutoPrisonerReleaseDismissContexts();

        return candidates.length
            ? candidates[candidates.length - 1]
            : null;
    }

    function isAutoPrisonerReleaseDismissContextVisible(context) {
        if (!context || !context.closeButton || !context.modal) {
            return false;
        }

        if (
            context.closeButton.isConnected === false ||
            context.modal.isConnected === false
        ) {
            return false;
        }

        try {
            return !!(
                mfIsVisibleInOwnDocument(context.closeButton) ||
                mfIsVisibleInOwnDocument(context.modal)
            );
        } catch (_error) {
            return false;
        }
    }

    async function closeAutoPrisonerReleaseDismissAfterClick() {
        updateStatusBox(
            'Auto Mode: Release Prisoners clicked. Waiting for the result screen before restarting the mission cycle...'
        );

        const resultStarted = Date.now();

        while (
            autoModeRunning &&
            !isManualAutoStopActive() &&
            getActivePrisonerCellSelectionContext() &&
            Date.now() - resultStarted <
                MF_AUTO_PRISONER_RELEASE_RESULT_WAIT_MS
        ) {
            await wait(200);
        }

        if (!autoModeRunning || isManualAutoStopActive()) {
            return 'stuck';
        }

        if (getActivePrisonerCellSelectionContext()) {
            if (mfDebugEnabled) {
                debugLog(
                    'AUTO PRISONER RELEASE',
                    'Release Prisoners did not clear the prisoner alert before the result-screen timeout.'
                );
            }
            return 'stuck';
        }

        const dismissStarted = Date.now();
        let dismissContext =
            getTopmostAutoPrisonerReleaseDismissContext();

        while (
            !dismissContext &&
            autoModeRunning &&
            !isManualAutoStopActive() &&
            Date.now() - dismissStarted <
                MF_AUTO_PRISONER_RELEASE_DISMISS_WAIT_MS
        ) {
            await wait(200);
            dismissContext =
                getTopmostAutoPrisonerReleaseDismissContext();
        }

        if (!autoModeRunning || isManualAutoStopActive()) {
            return 'stuck';
        }

        if (!dismissContext) {
            if (mfDebugEnabled) {
                debugLog(
                    'AUTO PRISONER RELEASE',
                    'No visible release-result close span appeared; continuing because the prisoner alert cleared.'
                );
            }
            clearAutoPrisonerReleaseState();
            return 'none';
        }

        updateStatusBox(
            'Auto Mode: closing the Release Prisoners result screen before restarting the mission cycle...'
        );

        if (mfDebugEnabled) {
            const modalClass = String(
                dismissContext.modal.className || ''
            ).replace(/\s+/g, '.');
            debugLog(
                'AUTO PRISONER RELEASE',
                `Closing topmost release-result lightbox | zIndex=${dismissContext.zIndex} | modal=${modalClass}`
            );
        }

        const clicked = realClickForQueueRestart(
            dismissContext.closeButton
        );

        if (!clicked) return 'stuck';

        const closeStarted = Date.now();

        while (
            autoModeRunning &&
            !isManualAutoStopActive() &&
            isAutoPrisonerReleaseDismissContextVisible(
                dismissContext
            ) &&
            Date.now() - closeStarted <
                MF_AUTO_PRISONER_RELEASE_DISMISS_CLOSE_WAIT_MS
        ) {
            await wait(180);
        }

        if (
            isAutoPrisonerReleaseDismissContextVisible(
                dismissContext
            )
        ) {
            if (mfDebugEnabled) {
                debugLog(
                    'AUTO PRISONER RELEASE',
                    'The release-result lightbox remained visible after its close span was clicked.'
                );
            }
            return 'stuck';
        }

        clearAutoPrisonerReleaseState();
        updateStatusBox(
            'Auto Mode: prisoner result screen closed. Restarting the mission cycle...'
        );
        return 'closed';
    }

    '''
)
source = replace_once(
    source,
    helper_anchor,
    helper_code + helper_anchor,
    "release dismiss helper insertion",
)

release_tail = dedent(
    '''\
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
release_tail_replacement = dedent(
    '''\
        const clicked = realClickForQueueRestart(releaseLink);

        if (!clicked) {
            clearAutoPrisonerReleaseState();
            return 'stuck';
        }

        await wait(250);

        const dismissResult =
            await closeAutoPrisonerReleaseDismissAfterClick();

        if (dismissResult === 'stuck') {
            return 'stuck';
        }

        clearAutoPrisonerReleaseState();
        return 'clicked';
    }
    '''
)
source = replace_once(
    source,
    release_tail,
    release_tail_replacement,
    "release handler dismiss sequence",
)

source_path.write_text(source, encoding="utf-8")

for path in Path("scripts").glob("*.mjs"):
    text = path.read_text(encoding="utf-8")
    text = text.replace("// @version      1.0.42", "// @version      1.0.43")
    text = text.replace("v1.0.42 metadata", "v1.0.43 metadata")
    text = text.replace("V10.6.106", "V10.6.107")
    path.write_text(text, encoding="utf-8")

for path in [Path("README.md"), Path("src/README.md")]:
    text = path.read_text(encoding="utf-8")
    text = text.replace("`1.0.42`", "`1.0.43`")
    text = text.replace("`V10.6.106`", "`V10.6.107`")
    path.write_text(text, encoding="utf-8")

changelog_path = Path("CHANGELOG.md")
changelog = changelog_path.read_text(encoding="utf-8")
changelog_entry = dedent(
    '''\
    ## [1.0.43] - 2026-07-26

    ### Fixed

    - After the exact `Release Prisoners` fallback completes, Auto Mode now waits for the resulting lightbox, clicks its visible topmost `<span title="Close" class="lightbox-close">` control and confirms the screen has disappeared.
    - The release-result close path supports MissionChief layouts where the close span is not wrapped by `.control-btn-container`.
    - Once the dismiss screen is closed, release state is cleared and Auto Mode restarts the mission cycle instead of remaining blocked on the result screen.

    ### Safety

    - The dismiss close runs only after the exact current-mission `Release Prisoners` action has cleared the prisoner alert.
    - Existing patient transport and positive-capacity prison-cell handling remain higher priority and unchanged.

    ### Changed engine baseline

    - Mission Finder increased from `V10.6.106` to `V10.6.107`.

    '''
)
changelog = replace_once(
    changelog,
    "## [1.0.42] - 2026-07-26\n",
    changelog_entry + "## [1.0.42] - 2026-07-26\n",
    "changelog insertion",
)
changelog_path.write_text(changelog, encoding="utf-8")

test_path = Path("scripts/check-auto-prisoner-cell-gate.mjs")
test = test_path.read_text(encoding="utf-8")
test = replace_once(
    test,
    "  ['MF_AUTO_PRISONER_RELEASE_STATE_KEY', 'release duplicate-click guard'],\n",
    "  ['MF_AUTO_PRISONER_RELEASE_STATE_KEY', 'release duplicate-click guard'],\n"
    "  ['span.lightbox-close[title=\\\"Close\\\"]', 'release-result close selector'],\n"
    "  ['function getTopmostAutoPrisonerReleaseDismissContext(', 'topmost release-result close chooser'],\n"
    "  ['function closeAutoPrisonerReleaseDismissAfterClick(', 'release-result dismiss handler'],\n"
    "  ['await closeAutoPrisonerReleaseDismissAfterClick();', 'release dismiss invocation'],\n",
    "test token insertion",
)

test_anchor = "if (!source.includes(\"prisonerReleaseResult === 'stuck'\")) {\n  fail('Auto Mode must stop safely when the exact release fallback cannot complete');\n}\n\n"
test_addition = dedent(
    '''\
    const releaseClick = finalBody.indexOf('realClickForQueueRestart(releaseLink);');
    const dismissCall = finalBody.indexOf('await closeAutoPrisonerReleaseDismissAfterClick();');
    const releaseReturn = finalBody.indexOf("return 'clicked';", dismissCall);

    if (!(releaseClick >= 0 && dismissCall > releaseClick && releaseReturn > dismissCall)) {
      fail('Release Prisoners must click first, then close the result screen, then restart the Auto cycle');
    }

    const dismissStart = source.indexOf('async function closeAutoPrisonerReleaseDismissAfterClick(');
    const dismissEnd = source.indexOf('function getExactAutoReleasePrisonersLink(', dismissStart);
    const dismissBody = source.slice(dismissStart, dismissEnd);

    for (const required of [
      'getActivePrisonerCellSelectionContext()',
      'getTopmostAutoPrisonerReleaseDismissContext()',
      'realClickForQueueRestart(',
      'isAutoPrisonerReleaseDismissContextVisible(',
      "return 'closed';",
    ]) {
      if (!dismissBody.includes(required)) {
        fail(`Release-result dismiss handler is missing: ${required}`);
      }
    }

    '''
)
test = replace_once(
    test,
    test_anchor,
    test_anchor + test_addition,
    "dismiss regression insertion",
)
test = test.replace(
    "then clicks only the exact current-mission Release Prisoners fallback before dispatch.",
    "then clicks only the exact current-mission Release Prisoners fallback, closes its result screen and restarts the mission cycle before dispatch.",
)
test_path.write_text(test, encoding="utf-8")

request_path = Path(".diagnostics/auto-prisoner-dismiss-request.txt")
if request_path.exists():
    request_path.unlink()

Path(".diagnostics/apply-auto-prisoner-release-dismiss.py").unlink(missing_ok=True)
