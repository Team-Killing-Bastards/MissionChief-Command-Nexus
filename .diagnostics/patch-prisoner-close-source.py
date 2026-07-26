#!/usr/bin/env python3
from pathlib import Path
import re

path = Path('src/missionchief-command-nexus.user.js')
source = path.read_text(encoding='utf-8')


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


def replace_function(text, name, replacement):
    start_re = re.compile(rf'^[ \t]*(?:async\s+)?function\s+{re.escape(name)}\s*\(', re.M)
    match = start_re.search(text)
    if not match:
        raise SystemExit(f'Function not found: {name}')
    next_match = re.search(r'^[ \t]*(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(', text[match.end():], re.M)
    if not next_match:
        raise SystemExit(f'Function boundary not found: {name}')
    end = match.end() + next_match.start()
    return text[:match.start()] + replacement.rstrip() + '\n\n' + text[end:]


source = once(source, '// @version      1.0.46', '// @version      1.0.47', 'version')
source = once(source, ' * MODULE 2: MISSION FINDER V10.6.110', ' * MODULE 2: MISSION FINDER V10.6.111', 'engine')

source = replace_function(source, 'getVisibleAutoPrisonerReleaseDismissContexts', r'''function getAutoPrisonerReleaseOwnerContainer(releaseContext) {
    const releaseDocument =
        releaseContext?.document ||
        releaseContext?.alert?.ownerDocument ||
        releaseContext?.root?.ownerDocument ||
        null;

    try {
        const frame = releaseDocument?.defaultView?.frameElement;
        const container = frame?.closest?.('.vm--container');
        if (container) return container;
    } catch (_error) {}

    const anchor = releaseContext?.alert || releaseContext?.root || null;
    try {
        return anchor?.closest?.('.vm--container') || null;
    } catch (_error) {
        return null;
    }
}

function getAutoPrisonerReleaseContainerKey(container) {
    if (!container?.querySelector) return '';
    try {
        return String(
            container.querySelector('.vm--overlay[data-modal]')
                ?.getAttribute('data-modal') || ''
        ).trim();
    } catch (_error) {
        return '';
    }
}

function findAutoPrisonerReleaseContainerByKey(candidateDocument, key) {
    if (!candidateDocument?.querySelectorAll || !key) return null;
    return Array.from(candidateDocument.querySelectorAll(
        '#modals-container .vm--container, .vm--container'
    )).find(container => {
        return getAutoPrisonerReleaseContainerKey(container) === key;
    }) || null;
}

function resolveAutoPrisonerReleaseDismissContext(context) {
    if (!context) return null;

    const documents = Array.from(new Set([
        context.document,
        document,
        ...(
            typeof mfGetAccessibleDocumentsForTransport === 'function'
                ? mfGetAccessibleDocumentsForTransport()
                : []
        )
    ].filter(Boolean)));

    let container = context.container || null;
    const key = String(
        context.containerKey ||
        getAutoPrisonerReleaseContainerKey(container) || ''
    ).trim();

    if (!container || container.isConnected === false) {
        container = null;
        for (const candidateDocument of documents) {
            container = findAutoPrisonerReleaseContainerByKey(
                candidateDocument,
                key
            );
            if (container) break;
        }
    }

    if (!container?.querySelectorAll) return null;

    const visible = element => {
        try {
            return !!element && mfIsVisibleInOwnDocument(element);
        } catch (_error) {
            return false;
        }
    };

    const modals = Array.from(container.querySelectorAll(
        '.vm--modal[role="dialog"], .vm--modal, .modal, .lightbox, #lightbox_box'
    )).filter(visible);
    const overlays = Array.from(container.querySelectorAll(
        '.vm--overlay[aria-expanded="true"], .vm--overlay'
    )).filter(visible);
    const modal = modals[modals.length - 1] || null;
    const overlay = overlays[overlays.length - 1] || null;

    if (!modal && !overlay) return null;

    let closeButton = modal?.querySelector?.(
        '.control-btn-container span.lightbox-close[title="Close"], ' +
        '.control-btn-container .lightbox-close[title="Close"], ' +
        'span.lightbox-close[title="Close"], ' +
        '.lightbox-close[title="Close"]'
    ) || null;
    if (!visible(closeButton)) closeButton = null;

    let zIndex = 0;
    try {
        const raw = container.ownerDocument?.defaultView
            ?.getComputedStyle(modal || overlay || container)?.zIndex || '0';
        const parsed = Number.parseInt(raw, 10);
        zIndex = Number.isFinite(parsed) ? parsed : 0;
    } catch (_error) {}

    return {
        ...context,
        document: container.ownerDocument || context.document || document,
        container,
        containerKey: key || getAutoPrisonerReleaseContainerKey(container),
        modal,
        overlay,
        closeButton,
        zIndex
    };
}

function getVisibleAutoPrisonerReleaseDismissContexts(releaseContext = null) {
    const ownerContainer = getAutoPrisonerReleaseOwnerContainer(releaseContext);
    if (ownerContainer) {
        const ownerContext = resolveAutoPrisonerReleaseDismissContext({
            document: ownerContainer.ownerDocument || document,
            container: ownerContainer,
            containerKey: getAutoPrisonerReleaseContainerKey(ownerContainer),
            order: Number.MAX_SAFE_INTEGER
        });
        if (ownerContext?.closeButton) return [ownerContext];
    }

    const documents = Array.from(new Set([
        document,
        ...(
            typeof mfGetAccessibleDocumentsForTransport === 'function'
                ? mfGetAccessibleDocumentsForTransport()
                : []
        )
    ].filter(Boolean)));
    const candidates = [];
    const seen = new Set();
    let order = 0;

    for (const candidateDocument of documents) {
        if (!candidateDocument?.querySelectorAll) continue;
        const buttons = Array.from(candidateDocument.querySelectorAll(
            '#modals-container .vm--container .vm--modal ' +
            '.control-btn-container span.lightbox-close[title="Close"], ' +
            '.vm--container .vm--modal span.lightbox-close[title="Close"], ' +
            'span.lightbox-close[title="Close"]'
        ));

        for (const button of buttons) {
            order += 1;
            if (!button || button.id?.includes('mf-')) continue;
            const modal = button.closest('.vm--modal, .modal, .lightbox, #lightbox_box');
            const container = button.closest('.vm--container') || modal?.parentElement;
            if (!modal || !container || seen.has(container)) continue;
            seen.add(container);
            const resolved = resolveAutoPrisonerReleaseDismissContext({
                document: candidateDocument,
                container,
                containerKey: getAutoPrisonerReleaseContainerKey(container),
                order
            });
            if (resolved?.closeButton) candidates.push(resolved);
        }
    }

    candidates.sort((left, right) =>
        left.zIndex - right.zIndex || left.order - right.order
    );
    return candidates;
}''')

source = replace_function(source, 'getTopmostAutoPrisonerReleaseDismissContext', r'''function getTopmostAutoPrisonerReleaseDismissContext(releaseContext = null) {
    const candidates = getVisibleAutoPrisonerReleaseDismissContexts(
        releaseContext
    );
    return candidates.length ? candidates[candidates.length - 1] : null;
}''')

source = replace_function(source, 'isAutoPrisonerReleaseDismissContextVisible', r'''function isAutoPrisonerReleaseDismissContextVisible(context) {
    return !!resolveAutoPrisonerReleaseDismissContext(context);
}''')

source = replace_function(source, 'closeAutoPrisonerReleaseDismissAfterClick', r'''async function closeAutoPrisonerReleaseDismissAfterClick(releaseContext = null) {
    updateStatusBox(
        'Auto Mode: Release Prisoners clicked. Waiting for the result screen before restarting the mission cycle...'
    );

    const resultStarted = Date.now();
    while (
        autoModeRunning &&
        !isManualAutoStopActive() &&
        getActivePrisonerCellSelectionContext() &&
        Date.now() - resultStarted < MF_AUTO_PRISONER_RELEASE_RESULT_WAIT_MS
    ) {
        await wait(200);
    }

    if (!autoModeRunning || isManualAutoStopActive()) return 'stuck';
    if (getActivePrisonerCellSelectionContext()) return 'stuck';

    const dismissStarted = Date.now();
    let dismissContext = getTopmostAutoPrisonerReleaseDismissContext(
        releaseContext
    );
    while (
        !dismissContext &&
        autoModeRunning &&
        !isManualAutoStopActive() &&
        Date.now() - dismissStarted < MF_AUTO_PRISONER_RELEASE_DISMISS_WAIT_MS
    ) {
        await wait(200);
        dismissContext = getTopmostAutoPrisonerReleaseDismissContext(
            releaseContext
        );
    }

    if (!autoModeRunning || isManualAutoStopActive()) return 'stuck';
    if (!dismissContext) {
        clearAutoPrisonerReleaseState();
        return 'none';
    }

    updateStatusBox(
        'Auto Mode: closing the Release Prisoners result screen before restarting the mission cycle...'
    );

    const closeStarted = Date.now();
    let attempt = 0;

    while (
        autoModeRunning &&
        !isManualAutoStopActive() &&
        Date.now() - closeStarted < MF_AUTO_PRISONER_RELEASE_DISMISS_CLOSE_WAIT_MS
    ) {
        const current =
            resolveAutoPrisonerReleaseDismissContext(dismissContext) ||
            getTopmostAutoPrisonerReleaseDismissContext(releaseContext);

        if (!current) {
            clearAutoPrisonerReleaseState();
            updateStatusBox(
                'Auto Mode: prisoner result screen closed. Restarting the mission cycle...'
            );
            return 'closed';
        }

        dismissContext = current;
        if (!current.closeButton) {
            await wait(180);
            continue;
        }

        attempt += 1;
        if (mfDebugEnabled) {
            debugLog(
                'AUTO PRISONER RELEASE',
                `Closing exact prisoner lightbox | attempt=${attempt} | key=${current.containerKey || 'none'}`
            );
        }

        if (attempt === 2) {
            const view = current.closeButton.ownerDocument?.defaultView || window;
            for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
                try {
                    const EventClass =
                        type.startsWith('pointer') && typeof view.PointerEvent === 'function'
                            ? view.PointerEvent
                            : view.MouseEvent;
                    current.closeButton.dispatchEvent(new EventClass(type, {
                        bubbles: true,
                        cancelable: true,
                        composed: true,
                        view
                    }));
                } catch (_error) {}
            }
        } else if (attempt === 3 && current.overlay) {
            realClickForQueueRestart(current.overlay);
        } else {
            realClickForQueueRestart(current.closeButton);
        }

        await wait(480);
        if (!isAutoPrisonerReleaseDismissContextVisible(dismissContext)) {
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
            'The exact prisoner lightbox remained visible after live-node close retries.'
        );
    }
    return 'stuck';
}''')

source = once(
    source,
    'await closeAutoPrisonerReleaseDismissAfterClick();',
    'await closeAutoPrisonerReleaseDismissAfterClick(context);',
    'dismiss context call'
)

path.write_text(source, encoding='utf-8')
