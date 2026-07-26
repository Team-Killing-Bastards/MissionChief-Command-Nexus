#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path('.')
SOURCE_PATH = ROOT / 'src/missionchief-command-nexus.user.js'
source = SOURCE_PATH.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def replace_function(text, name, replacement):
    pattern = re.compile(rf'^(?P<indent>\s*)(?:async\s+)?function\s+{re.escape(name)}\s*\(', re.M)
    match = pattern.search(text)
    if not match:
        raise SystemExit(f'Function not found: {name}')
    next_match = re.search(r'^\s*(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(', text[match.end():], re.M)
    if not next_match:
        raise SystemExit(f'Unable to find function boundary after {name}')
    end = match.end() + next_match.start()
    return text[:match.start()] + replacement.rstrip() + '\n\n' + text[end:]

source = replace_once(source, '// @version      1.0.46', '// @version      1.0.47', 'userscript version')
source = replace_once(source, ' * MODULE 2: MISSION FINDER V10.6.110', ' * MODULE 2: MISSION FINDER V10.6.111', 'Mission Finder version')

visible_contexts = r'''function getAutoPrisonerReleaseDismissContainerFromReleaseContext(
    releaseContext
) {
    const releaseDocument =
        releaseContext?.document ||
        releaseContext?.alert?.ownerDocument ||
        releaseContext?.root?.ownerDocument ||
        null;

    try {
        const frameElement =
            releaseDocument?.defaultView?.frameElement;
        const frameContainer =
            frameElement?.closest?.('.vm--container');

        if (frameContainer) return frameContainer;
    } catch (_error) {}

    const directElement =
        releaseContext?.alert ||
        releaseContext?.root ||
        null;

    try {
        return directElement?.closest?.('.vm--container') || null;
    } catch (_error) {
        return null;
    }
}

function getAutoPrisonerReleaseDismissContainerKey(container) {
    if (!container?.querySelector) return '';

    try {
        return String(
            container
                .querySelector('.vm--overlay[data-modal]')
                ?.getAttribute('data-modal') ||
            ''
        ).trim();
    } catch (_error) {
        return '';
    }
}

function findAutoPrisonerReleaseDismissContainerByKey(
    candidateDocument,
    containerKey
) {
    if (
        !candidateDocument?.querySelectorAll ||
        !containerKey
    ) {
        return null;
    }

    const containers = Array.from(
        candidateDocument.querySelectorAll(
            '#modals-container .vm--container, .vm--container'
        )
    );

    return containers.find(container => {
        return (
            getAutoPrisonerReleaseDismissContainerKey(container) ===
            containerKey
        );
    }) || null;
}

function resolveAutoPrisonerReleaseDismissContext(context) {
    if (!context) return null;

    const candidateDocuments = Array.from(
        new Set([
            context.document,
            document,
            ...(
                typeof mfGetAccessibleDocumentsForTransport === 'function'
                    ? mfGetAccessibleDocumentsForTransport()
                    : []
            )
        ].filter(Boolean))
    );

    let container = context.container || null;
    const containerKey = String(
        context.containerKey ||
        getAutoPrisonerReleaseDismissContainerKey(container) ||
        ''
    ).trim();

    if (!container || container.isConnected === false) {
        container = null;

        for (const candidateDocument of candidateDocuments) {
            container =
                findAutoPrisonerReleaseDismissContainerByKey(
                    candidateDocument,
                    containerKey
                );
            if (container) break;
        }
    }

    if (!container?.querySelectorAll) return null;

    const modals = Array.from(
        container.querySelectorAll(
            '.vm--modal[role="dialog"], .vm--modal, .modal, .lightbox, #lightbox_box'
        )
    ).filter(modal => {
        try {
            return mfIsVisibleInOwnDocument(modal);
        } catch (_error) {
            return false;
        }
    });

    const modal = modals.length
        ? modals[modals.length - 1]
        : null;

    const overlays = Array.from(
        container.querySelectorAll(
            '.vm--overlay[aria-expanded="true"], .vm--overlay'
        )
    ).filter(overlay => {
        try {
            return mfIsVisibleInOwnDocument(overlay);
        } catch (_error) {
            return false;
        }
    });

    const overlay = overlays.length
        ? overlays[overlays.length - 1]
        : null;

    if (!modal && !overlay) return null;

    let closeButton = null;
    if (modal?.querySelector) {
        closeButton = modal.querySelector(
            '.control-btn-container span.lightbox-close[title="Close"], ' +
            '.control-btn-container .lightbox-close[title="Close"], ' +
            'span.lightbox-close[title="Close"], ' +
            '.lightbox-close[title="Close"]'
        );
    }

    if (closeButton) {
        try {
            if (!mfIsVisibleInOwnDocument(closeButton)) {
                closeButton = null;
            }
        } catch (_error) {
            closeButton = null;
        }
    }

    let zIndex = 0;
    try {
        const rawZIndex =
            container.ownerDocument?.defaultView
                ?.getComputedStyle(modal || overlay || container)
                ?.zIndex ||
            modal?.style?.zIndex ||
            '0';
        const parsedZIndex = Number.parseInt(rawZIndex, 10);
        zIndex = Number.isFinite(parsedZIndex)
            ? parsedZIndex
            : 0;
    } catch (_error) {}

    return {
        ...context,
        document: container.ownerDocument || context.document || document,
        container,
        containerKey:
            containerKey ||
            getAutoPrisonerReleaseDismissContainerKey(container),
        modal,
        overlay,
        closeButton,
        zIndex
    };
}

function getVisibleAutoPrisonerReleaseDismissContexts(
    releaseContext = null
) {
    const preferredContainer =
        getAutoPrisonerReleaseDismissContainerFromReleaseContext(
            releaseContext
        );

    if (preferredContainer) {
        const preferred =
            resolveAutoPrisonerReleaseDismissContext({
                document: preferredContainer.ownerDocument || document,
                container: preferredContainer,
                containerKey:
                    getAutoPrisonerReleaseDismissContainerKey(
                        preferredContainer
                    ),
                order: Number.MAX_SAFE_INTEGER
            });

        if (preferred?.closeButton) {
            return [preferred];
        }
    }

    const candidateDocuments = Array.from(
        new Set([
            document,
            ...(
                typeof mfGetAccessibleDocumentsForTransport === 'function'
                    ? mfGetAccessibleDocumentsForTransport()
                    : []
            )
        ].filter(Boolean))
    );
    const candidates = [];
    const seenContainers = new Set();
    let order = 0;

    for (const candidateDocument of candidateDocuments) {
        if (!candidateDocument?.querySelectorAll) continue;

        const closeButtons = Array.from(
            candidateDocument.querySelectorAll(
                '#modals-container .vm--container .vm--modal ' +
                '.control-btn-container span.lightbox-close[title="Close"], ' +
                '.vm--container .vm--modal ' +
                '.control-btn-container span.lightbox-close[title="Close"], ' +
                'span.lightbox-close[title="Close"], ' +
                '.lightbox-close[title="Close"]'
            )
        );

        for (const closeButton of closeButtons) {
            order += 1;
            if (!closeButton || closeButton.id?.includes('mf-')) continue;

            const modal = closeButton.closest(
                '.vm--modal, .modal, .lightbox, #lightbox_box'
            );
            const container =
                closeButton.closest('.vm--container') ||
                modal?.parentElement ||
                null;

            if (!modal || !container || seenContainers.has(container)) {
                continue;
            }

            seenContainers.add(container);

            const resolved =
                resolveAutoPrisonerReleaseDismissContext({
                    document: candidateDocument,
                    container,
                    containerKey:
                        getAutoPrisonerReleaseDismissContainerKey(
                            container
                        ),
                    order
                });

            if (resolved?.closeButton) {
                candidates.push(resolved);
            }
        }
    }

    candidates.sort((left, right) =>
        left.zIndex - right.zIndex ||
        left.order - right.order
    );

    return candidates;
}'''

source = replace_function(
    source,
    'getVisibleAutoPrisonerReleaseDismissContexts',
    visible_contexts
)

source = replace_function(
    source,
    'getTopmostAutoPrisonerReleaseDismissContext',
    r'''function getTopmostAutoPrisonerReleaseDismissContext(
    releaseContext = null
) {
    const candidates =
        getVisibleAutoPrisonerReleaseDismissContexts(
            releaseContext
        );

    return candidates.length
        ? candidates[candidates.length - 1]
        : null;
}'''
)

source = replace_function(
    source,
    'isAutoPrisonerReleaseDismissContextVisible',
    r'''function isAutoPrisonerReleaseDismissContextVisible(context) {
    return !!resolveAutoPrisonerReleaseDismissContext(context);
}'''
)

source = replace_function(
    source,
    'closeAutoPrisonerReleaseDismissAfterClick',
    r'''async function closeAutoPrisonerReleaseDismissAfterClick(
    releaseContext = null
) {
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
        getTopmostAutoPrisonerReleaseDismissContext(
            releaseContext
        );

    while (
        !dismissContext &&
        autoModeRunning &&
        !isManualAutoStopActive() &&
        Date.now() - dismissStarted <
            MF_AUTO_PRISONER_RELEASE_DISMISS_WAIT_MS
    ) {
        await wait(200);
        dismissContext =
            getTopmostAutoPrisonerReleaseDismissContext(
                releaseContext
            );
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

    const closeStarted = Date.now();
    let closeAttempt = 0;

    while (
        autoModeRunning &&
        !isManualAutoStopActive() &&
        Date.now() - closeStarted <
            MF_AUTO_PRISONER_RELEASE_DISMISS_CLOSE_WAIT_MS
    ) {
        const currentContext =
            resolveAutoPrisonerReleaseDismissContext(
                dismissContext
            ) ||
            getTopmostAutoPrisonerReleaseDismissContext(
                releaseContext
            );

        if (!currentContext) {
            clearAutoPrisonerReleaseState();
            updateStatusBox(
                'Auto Mode: prisoner result screen closed. Restarting the mission cycle...'
            );
            return 'closed';
        }

        dismissContext = currentContext;

        if (!currentContext.closeButton) {
            await wait(180);
            continue;
        }

        closeAttempt += 1;

        if (mfDebugEnabled) {
            debugLog(
                'AUTO PRISONER RELEASE',
                `Closing exact prisoner lightbox | attempt=${closeAttempt} | key=${currentContext.containerKey || 'none'} | zIndex=${currentContext.zIndex}`
            );
        }

        if (closeAttempt === 1 || closeAttempt >= 4) {
            realClickForQueueRestart(
                currentContext.closeButton
            );
        } else if (closeAttempt === 2) {
            const closeButton = currentContext.closeButton;
            const view =
                closeButton.ownerDocument?.defaultView ||
                window;

            for (const type of [
                'pointerdown',
                'mousedown',
                'pointerup',
                'mouseup',
                'click'
            ]) {
                try {
                    const EventClass =
                        type.startsWith('pointer') &&
                        typeof view.PointerEvent === 'function'
                            ? view.PointerEvent
                            : view.MouseEvent;
                    closeButton.dispatchEvent(
                        new EventClass(type, {
                            bubbles: true,
                            cancelable: true,
                            composed: true,
                            view
                        })
                    );
                } catch (_error) {}
            }
        } else if (closeAttempt === 3) {
            const exactOverlay =
                currentContext.overlay;

            if (exactOverlay) {
                realClickForQueueRestart(exactOverlay);
            } else {
                realClickForQueueRestart(
                    currentContext.closeButton
                );
            }
        }

        await wait(480);

        if (
            !isAutoPrisonerReleaseDismissContextVisible(
                dismissContext
            )
        ) {
            clearAutoPrisonerReleaseState();
            updateStatusBox(
                'Auto Mode: prisoner result screen closed. Restarting the mission cycle...'
            );
            return 'closed';
        }
    }

    if (mfDebugEnabled) {
        debugLog(
            'AUTO PRISONER RELEASE',
            'The exact prisoner release lightbox remained visible after live-node reacquisition and scoped close retries.'
        );
    }

    return 'stuck';
}'''
)

source = replace_once(
    source,
    'await closeAutoPrisonerReleaseDismissAfterClick();',
    'await closeAutoPrisonerReleaseDismissAfterClick(context);',
    'pass prisoner release context to close handler'
)

SOURCE_PATH.write_text(source, encoding='utf-8')

# Keep version contracts aligned across permanent regression scripts.
for path in sorted((ROOT / 'scripts').glob('*.mjs')):
    text = path.read_text(encoding='utf-8')
    updated = text.replace('1.0.46', '1.0.47').replace('V10.6.110', 'V10.6.111')
    if updated != text:
        path.write_text(updated, encoding='utf-8')

check_path = ROOT / 'scripts/check-auto-prisoner-cell-gate.mjs'
check = check_path.read_text(encoding='utf-8')
insert_anchor = "  ['await closeAutoPrisonerReleaseDismissAfterClick();', 'release dismiss invocation'],\n"
if insert_anchor in check:
    check = check.replace(
        insert_anchor,
        "  ['await closeAutoPrisonerReleaseDismissAfterClick(context);', 'release dismiss invocation with owner context'],\n"
    )
required_anchor = "  ['function closeAutoPrisonerReleaseDismissAfterClick(', 'release-result dismiss handler'],\n"
check = replace_once(
    check,
    required_anchor,
    required_anchor +
    "  ['function getAutoPrisonerReleaseDismissContainerFromReleaseContext(', 'release iframe to parent modal owner'],\n" +
    "  ['function resolveAutoPrisonerReleaseDismissContext(', 'live Vue modal reacquisition'],\n" +
    "  ['getAttribute('data-modal')', 'stable Vue modal identity'],\n",
    'prisoner regression required tokens'
)
check = check.replace(
    "const dismissCall = finalBody.indexOf('await closeAutoPrisonerReleaseDismissAfterClick();');",
    "const dismissCall = finalBody.indexOf('await closeAutoPrisonerReleaseDismissAfterClick(context);');"
)
old_required = "  'dismissContext.closeButton',\n  'isAutoPrisonerReleaseDismissContextVisible(',\n  \"return 'closed';\",\n"
new_required = "  'resolveAutoPrisonerReleaseDismissContext(',\n  'dismissContext',\n  'currentContext.closeButton',\n  'currentContext.overlay',\n  'isAutoPrisonerReleaseDismissContextVisible(',\n  \"return 'closed';\",\n"
check = replace_once(check, old_required, new_required, 'prisoner close regression body tokens')
check = check.replace(
    "const resultCloseClick = dismissBody.indexOf('dismissContext.closeButton');",
    "const resultCloseClick = dismissBody.indexOf('currentContext.closeButton');"
)
check += '''\n\nconst visibleContextsStart = source.indexOf('function getVisibleAutoPrisonerReleaseDismissContexts(');\nconst visibleContextsEnd = source.indexOf('function getTopmostAutoPrisonerReleaseDismissContext(', visibleContextsStart);\nconst visibleContextsBody = source.slice(visibleContextsStart, visibleContextsEnd);\nfor (const token of [\n  '#modals-container .vm--container',\n  'getAutoPrisonerReleaseDismissContainerFromReleaseContext(',\n  'getAutoPrisonerReleaseDismissContainerKey(',\n  'resolveAutoPrisonerReleaseDismissContext(',\n]) {\n  if (!visibleContextsBody.includes(token)) fail(`Prisoner close owner scoping is missing: ${token}`);\n}\n\nconst visibilityStart = source.indexOf('function isAutoPrisonerReleaseDismissContextVisible(');\nconst visibilityEnd = source.indexOf('function closeAutoPrisonerReleaseDismissAfterClick(', visibilityStart);\nconst visibilityBody = source.slice(visibilityStart, visibilityEnd);\nif (!visibilityBody.includes('resolveAutoPrisonerReleaseDismissContext(context)')) {\n  fail('Prisoner close verification must reacquire the current Vue modal instead of trusting the old disconnected node');\n}\nif (visibilityBody.includes('context.modal.isConnected === false')) {\n  fail('A disconnected old modal node must not be treated as proof that the replacement prisoner lightbox closed');\n}\n'''
check_path.write_text(check, encoding='utf-8')

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(
    readme,
    '**Current version:** `1.0.46` · **Mission Finder engine:** `V10.6.110`',
    '**Current version:** `1.0.47` · **Mission Finder engine:** `V10.6.111`',
    'README current version'
)
readme_path.write_text(readme, encoding='utf-8')

src_readme_path = ROOT / 'src/README.md'
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = replace_once(src_readme, '| Command Nexus version | `1.0.46` |', '| Command Nexus version | `1.0.47` |', 'source README version')
src_readme = replace_once(src_readme, '| Mission Finder baseline | `V10.6.110` |', '| Mission Finder baseline | `V10.6.111` |', 'source README Mission Finder version')
src_readme_path.write_text(src_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = '''## [1.0.47] - 2026-07-26\n\n### Fixed\n\n- Auto Mode now closes the exact Vue prisoner-release result lightbox after releasing prisoners.\n- The close handler follows the owning `.vm--container` and its `data-modal` identity, reacquires the live close span after Vue replaces modal nodes, and verifies that the current replacement modal is gone before restarting.\n- Scoped pointer and overlay fallbacks run only inside the same prisoner lightbox when the native close click does not dismiss it.\n\n### Changed engine baseline\n\n- Mission Finder increased from `V10.6.110` to `V10.6.111`.\n\n'''
changelog = replace_once(changelog, '## [1.0.46] - 2026-07-26\n', entry + '## [1.0.46] - 2026-07-26\n', 'changelog insertion')
changelog_path.write_text(changelog, encoding='utf-8')
