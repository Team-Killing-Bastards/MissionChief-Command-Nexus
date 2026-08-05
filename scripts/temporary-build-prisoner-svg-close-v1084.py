#!/usr/bin/env python3
from pathlib import Path
import re

SOURCE_PATH = Path('src/missionchief-command-nexus.user.js')
WORKFLOW_PATH = Path('.github/workflows/validate-userscript.yml')


def fail(message):
    raise RuntimeError(message)


def replace_exact(source, old, new, label, expected=1):
    count = source.count(old)
    if count != expected:
        fail(f'{label}: expected {expected} occurrence(s), found {count}')
    return source.replace(old, new)


def function_range(source, name):
    match = re.search(rf'(?:async\s+)?function\s+{re.escape(name)}\s*\(', source)
    if not match:
        fail(f'Unable to locate function {name}')
    index = source.find('{', match.start())
    if index < 0:
        fail(f'Unable to locate body for {name}')
    depth = 0
    quote = ''
    escaped = False
    line_comment = False
    block_comment = False
    while index < len(source):
        char = source[index]
        nxt = source[index + 1] if index + 1 < len(source) else ''
        if line_comment:
            if char == '\n':
                line_comment = False
            index += 1
            continue
        if block_comment:
            if char == '*' and nxt == '/':
                block_comment = False
                index += 2
            else:
                index += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == quote:
                quote = ''
            index += 1
            continue
        if char == '/' and nxt == '/':
            line_comment = True
            index += 2
            continue
        if char == '/' and nxt == '*':
            block_comment = True
            index += 2
            continue
        if char in ('"', "'", '`'):
            quote = char
            index += 1
            continue
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return match.start(), index + 1
        index += 1
    fail(f'Unterminated function {name}')


def replace_function(source, name, replacement):
    start, end = function_range(source, name)
    return source[:start] + replacement + source[end:]


close_helper_and_resolver = r'''function getAutoPrisonerReleaseCloseControl(modal, visible) {
    if (!modal?.querySelectorAll) return null;

    const markers = Array.from(modal.querySelectorAll(
        '.control-btn-container span.lightbox-close[title="Close"], ' +
        '.control-btn-container .lightbox-close[title="Close"], ' +
        'span.lightbox-close[title="Close"], ' +
        '.lightbox-close[title="Close"], ' +
        'button[aria-label*="close" i], ' +
        'a[aria-label*="close" i], ' +
        '[role="button"][aria-label*="close" i], ' +
        'button[title*="close" i], ' +
        'a[title*="close" i], ' +
        '[role="button"][title*="close" i], ' +
        'svg[data-icon="xmark"], ' +
        'svg.svg-inline--fa.fa-xmark'
    ));

    for (const marker of markers) {
        if (!marker || marker.id?.includes('mf-')) continue;

        const isSvgMarker = !!marker.matches?.(
            'svg[data-icon="xmark"], svg.svg-inline--fa.fa-xmark'
        );
        const control = isSvgMarker
            ? (
                marker.closest?.(
                    'button, a[href], [role="button"], .lightbox-close, ' +
                    '[data-dismiss], [data-action="close"], ' +
                    '[aria-label*="close" i], [title*="close" i]'
                ) || marker.parentElement || marker
            )
            : marker;

        if (
            !control ||
            !modal.contains(control) ||
            !visible(control)
        ) {
            continue;
        }

        return {
            closeButton: control,
            closeMarker: marker
        };
    }

    return null;
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

    const closeControl = modal
        ? getAutoPrisonerReleaseCloseControl(modal, visible)
        : null;
    const closeButton = closeControl?.closeButton || null;
    const closeMarker = closeControl?.closeMarker || null;

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
        closeMarker,
        zIndex
    };
}'''

visible_contexts = r'''function getVisibleAutoPrisonerReleaseDismissContexts(releaseContext = null) {
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
        const markers = Array.from(candidateDocument.querySelectorAll(
            '#modals-container .vm--container .vm--modal ' +
            '.control-btn-container span.lightbox-close[title="Close"], ' +
            '.vm--container .vm--modal span.lightbox-close[title="Close"], ' +
            '.vm--container .vm--modal button[aria-label*="close" i], ' +
            '.vm--container .vm--modal a[aria-label*="close" i], ' +
            '.vm--container .vm--modal [role="button"][aria-label*="close" i], ' +
            '.vm--container .vm--modal button[title*="close" i], ' +
            '.vm--container .vm--modal a[title*="close" i], ' +
            '.vm--container .vm--modal [role="button"][title*="close" i], ' +
            '.vm--container .vm--modal svg[data-icon="xmark"], ' +
            '.vm--container .vm--modal svg.svg-inline--fa.fa-xmark'
        ));

        for (const marker of markers) {
            order += 1;
            if (!marker || marker.id?.includes('mf-')) continue;
            const modal = marker.closest(
                '.vm--modal, .modal, .lightbox, #lightbox_box'
            );
            const container =
                marker.closest('.vm--container') || modal?.parentElement;
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
}'''

source = SOURCE_PATH.read_text(encoding='utf-8')
if 'function getAutoPrisonerReleaseCloseControl(' in source:
    fail('Prisoner SVG close helper already exists')
source = replace_exact(
    source,
    '// @version      1.0.83',
    '// @version      1.0.84',
    'userscript version',
)
source = replace_exact(
    source,
    ' * MODULE 2: MISSION FINDER V10.6.143',
    ' * MODULE 2: MISSION FINDER V10.6.144',
    'Mission Finder header',
)
source = replace_function(
    source,
    'resolveAutoPrisonerReleaseDismissContext',
    close_helper_and_resolver,
)
source = replace_function(
    source,
    'getVisibleAutoPrisonerReleaseDismissContexts',
    visible_contexts,
)
source = replace_exact(
    source,
    """        if (!current.closeButton) {
            await wait(180);
            continue;
        }""",
    """        if (
            !current.closeButton ||
            current.closeButton.isConnected === false
        ) {
            await wait(100);
            continue;
        }""",
    'live close-control gate',
)
source = replace_exact(
    source,
    """        if (attempt === 2) {
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
        }""",
    """        if (
            attempt === 2 &&
            current.closeMarker &&
            current.closeMarker !== current.closeButton &&
            current.closeMarker.isConnected !== false
        ) {
            realClickForQueueRestart(current.closeMarker);
        } else if (attempt === 3) {
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
        } else if (attempt === 4 && current.overlay) {
            realClickForQueueRestart(current.overlay);
        } else {
            realClickForQueueRestart(current.closeButton);
        }""",
    'bounded close retry order',
)
SOURCE_PATH.write_text(source, encoding='utf-8')

for check_path in Path('scripts').glob('check-*.mjs'):
    text = check_path.read_text(encoding='utf-8')
    text = text.replace('// @version      1.0.83', '// @version      1.0.84')
    text = text.replace('MISSION FINDER V10.6.143', 'MISSION FINDER V10.6.144')
    check_path.write_text(text, encoding='utf-8')

for readme_path in (Path('README.md'), Path('src/README.md')):
    text = readme_path.read_text(encoding='utf-8')
    text = replace_exact(text, '1.0.83', '1.0.84', f'{readme_path} version')
    text = replace_exact(
        text,
        'V10.6.143',
        'V10.6.144',
        f'{readme_path} Mission Finder version',
    )
    readme_path.write_text(text, encoding='utf-8')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
anchor = 'The project uses Semantic Versioning for the unified userscript release line.\n'
section = r'''
## [1.0.84] - 2026-08-05

### Fixed

- Auto Mode now recognises the Vue/Font Awesome `svg[data-icon="xmark"]` prisoner-result close marker in addition to the established `lightbox-close` span.
- SVG markers are resolved to their live button, link or role-button wrapper before clicking, with an immediate-parent fallback bounded to the identified prisoner result modal.
- Vue-replaced close controls are reacquired before every retry; the exact marker is tried before the existing synthetic-event and overlay fallbacks.

### Safety

- Close discovery remains scoped to the identified topmost prisoner-release modal and current-mission pending state; unrelated page-wide xmark icons are not eligible.
- Exact result ownership, Unit Finder blocking, duplicate-click protection, maximum result/dismiss waits and fail-closed stopping remain unchanged.

### Changed engine baseline

- Mission Finder increased from `V10.6.143` to `V10.6.144`.
'''
if anchor not in changelog:
    fail('Missing changelog anchor')
if '## [1.0.84]' in changelog:
    fail('Changelog 1.0.84 already exists')
changelog_path.write_text(changelog.replace(anchor, anchor + section), encoding='utf-8')

workflow = WORKFLOW_PATH.read_text(encoding='utf-8')
path_line = "      - 'scripts/check-auto-transport-response-v1083.mjs'\n"
if workflow.count(path_line) != 2:
    fail('Expected two v1.0.83 transport regression path registrations')
workflow = workflow.replace(
    path_line,
    path_line + "      - 'scripts/check-prisoner-svg-close-v1084.mjs'\n",
)
step = (
    '      - name: Validate faster patient and prisoner transport response\n'
    '        run: node scripts/check-auto-transport-response-v1083.mjs\n'
)
workflow = replace_exact(
    workflow,
    step,
    step + (
        '\n      - name: Validate prisoner Vue SVG close control\n'
        '        run: node scripts/check-prisoner-svg-close-v1084.mjs\n'
    ),
    'validation workflow step',
)
workflow = workflow.replace(
    'faster patient/prisoner transport response, Missing-on-mission authority',
    'faster patient/prisoner transport response, prisoner Vue SVG close ownership, Missing-on-mission authority',
)
WORKFLOW_PATH.write_text(workflow, encoding='utf-8')

print('Built Command Nexus 1.0.84 prisoner SVG close candidate.')
