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


def replace_function(name: str, replacement: str) -> None:
    global source
    marker = f'    function {name}('
    start = source.find(marker)
    if start < 0:
        raise SystemExit(f'{name}: function start not found')
    if source.find(marker, start + 1) >= 0:
        raise SystemExit(f'{name}: duplicate function declaration')
    brace = source.find('{', start)
    if brace < 0:
        raise SystemExit(f'{name}: opening brace not found')
    depth = 0
    quote = ''
    escaped = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ''
        if line_comment:
            if ch == '\n':
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == '*' and nxt == '/':
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = ''
            i += 1
            continue
        if ch == '/' and nxt == '/':
            line_comment = True
            i += 2
            continue
        if ch == '/' and nxt == '*':
            block_comment = True
            i += 2
            continue
        if ch in ('"', "'", '`'):
            quote = ch
            i += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                source = source[:start] + replacement.rstrip() + '\n' + source[i + 1:]
                return
        i += 1
    raise SystemExit(f'{name}: closing brace not found')


replace_once('// @version      1.0.14', '// @version      1.0.15', 'userscript version')
replace_once("const UNIT_VERSION = '3.3.5';", "const UNIT_VERSION = '3.3.6';", 'Unit Naming version')
replace_once("const STATION_VERSION = '1.3.1';", "const STATION_VERSION = '1.3.2';", 'Station Naming version')
replace_once("const PERSONNEL_VERSION = '1.2.9';", "const PERSONNEL_VERSION = '1.3.0';", 'Personnel Assignment version')

mobile_helpers = r'''    function isIosSafariWebsite() {
        const userAgent = String(navigator.userAgent || '');
        const platform = String(navigator.platform || '');
        const isIosDevice = /iP(?:ad|hone|od)/i.test(userAgent)
            || (
                platform === 'MacIntel'
                && Number(navigator.maxTouchPoints || 0) > 1
            );
        const isSafariBrowser = /Safari/i.test(userAgent)
            && !/(?:CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(userAgent);

        // Native WKWebView/app wrappers normally omit the Safari token. This
        // deliberately targets the MissionChief website opened in Safari.
        return isIosDevice
            && isSafariBrowser
            && /^https?:$/i.test(String(location.protocol || ''));
    }

    function getToolViewportBounds() {
        const viewport = window.visualViewport;
        const left = Math.max(0, Number(viewport?.offsetLeft || 0));
        const top = Math.max(0, Number(viewport?.offsetTop || 0));
        const width = Math.max(1, Number(viewport?.width || window.innerWidth || 1));
        const height = Math.max(1, Number(viewport?.height || window.innerHeight || 1));

        return {
            left,
            top,
            width,
            height,
            right: left + width,
            bottom: top + height
        };
    }

    function clampToolPanelToViewport(panel) {
        if (!panel?.isConnected) return;

        // Before the first drag, iOS Safari is positioned entirely by the
        // safe-area CSS below. Only clamp an explicitly dragged mobile panel.
        if (
            panel.classList.contains('mc-ios-safari')
            && !panel.style.left
        ) {
            return;
        }

        const bounds = getToolViewportBounds();
        let rect = panel.getBoundingClientRect();
        const maximumWidth = Math.max(260, bounds.width - 16);

        if (rect.width > maximumWidth) {
            panel.style.width = `${maximumWidth}px`;
            rect = panel.getBoundingClientRect();
        }

        const maximumLeft = Math.max(
            bounds.left,
            bounds.right - rect.width
        );
        const maximumTop = Math.max(
            bounds.top,
            bounds.bottom - rect.height
        );
        const nextLeft = Math.min(
            maximumLeft,
            Math.max(bounds.left, rect.left)
        );
        const nextTop = Math.min(
            maximumTop,
            Math.max(bounds.top, rect.top)
        );

        panel.style.left = `${nextLeft}px`;
        panel.style.top = `${nextTop}px`;
        panel.style.right = 'auto';
    }

    function installToolViewportGuard(panel) {
        let pendingFrame = null;

        const requestClamp = () => {
            if (pendingFrame != null) return;
            pendingFrame = requestAnimationFrame(() => {
                pendingFrame = null;
                clampToolPanelToViewport(panel);
            });
        };

        const resetIosPosition = () => {
            if (panel.classList.contains('mc-ios-safari')) {
                panel.style.left = '';
                panel.style.top = '';
                panel.style.right = '';
                panel.style.width = '';
            }
            requestClamp();
        };

        window.addEventListener('resize', requestClamp, { passive: true });
        window.addEventListener('orientationchange', resetIosPosition, { passive: true });
        window.addEventListener('pageshow', requestClamp, { passive: true });
        window.visualViewport?.addEventListener('resize', requestClamp, { passive: true });
        window.visualViewport?.addEventListener('scroll', requestClamp, { passive: true });

        registerToolLifecycleCleanup(() => {
            if (pendingFrame != null) {
                cancelAnimationFrame(pendingFrame);
                pendingFrame = null;
            }
            window.removeEventListener('resize', requestClamp);
            window.removeEventListener('orientationchange', resetIosPosition);
            window.removeEventListener('pageshow', requestClamp);
            window.visualViewport?.removeEventListener('resize', requestClamp);
            window.visualViewport?.removeEventListener('scroll', requestClamp);
        });

        requestClamp();
    }

'''
replace_once(
    '    function initWhenReady() {',
    mobile_helpers + '    function initWhenReady() {',
    'insert iOS Safari helpers',
)

replace_function('initWhenReady', r'''    function initWhenReady() {
        let tries = 0;
        let timer = null;
        let observer = null;
        const maximumTries = isIosSafariWebsite()
            ? 120
            : 40;

        const removeReadinessListeners = () => {
            if (timer != null) {
                clearInterval(timer);
                timer = null;
            }
            observer?.disconnect();
            observer = null;
            window.removeEventListener('pageshow', tryInitialise);
            document.removeEventListener('visibilitychange', tryInitialise);
            TOOL_LIFECYCLE_CLEANUPS.delete(removeReadinessListeners);
        };

        function tryInitialise() {
            if (document.querySelector('#mc-namer-panel')) {
                removeReadinessListeners();
                return true;
            }

            if (!isStationOverviewScreen()) return false;

            removeReadinessListeners();
            init();
            return true;
        }

        if (tryInitialise()) return;

        timer = setInterval(() => {
            tries++;
            if (tryInitialise()) return;
            if (tries >= maximumTries) {
                clearInterval(timer);
                timer = null;
            }
        }, 500);

        // Mobile Safari can restore the page from bfcache or populate the
        // responsive building list after the userscript has already started.
        if (isIosSafariWebsite()) {
            observer = new MutationObserver(() => {
                tryInitialise();
            });
            observer.observe(
                document.documentElement,
                {
                    childList: true,
                    subtree: true
                }
            );
            window.addEventListener('pageshow', tryInitialise, { passive: true });
            document.addEventListener('visibilitychange', tryInitialise, { passive: true });
        }

        registerToolLifecycleCleanup(removeReadinessListeners);
    }''')

replace_function('isStationOverviewScreen', r'''    function isStationOverviewScreen() {
        if (
            document.querySelector(
                'a.lightbox-open.list-group-item.active[href^="/buildings/"]'
            )
        ) {
            return true;
        }

        if (!isIosSafariWebsite()) return false;

        return Boolean(
            document.querySelector(
                [
                    'a.lightbox-open[href*="/buildings/"]',
                    '.building_list a[href*="/buildings/"]',
                    '.building_list_li a[href*="/buildings/"]',
                    '[data-building-id] a[href*="/buildings/"]'
                ].join(',')
            )
        );
    }''')

replace_once(
    "        panel.id = 'mc-namer-panel';",
    "        panel.id = 'mc-namer-panel';\n        panel.classList.toggle('mc-ios-safari', isIosSafariWebsite());",
    'mark iOS Safari menu panel',
)

mobile_css = r'''

            #mc-namer-panel.mc-ios-safari {
                top: calc(8px + env(safe-area-inset-top, 0px));
                right: calc(8px + env(safe-area-inset-right, 0px));
                left: calc(8px + env(safe-area-inset-left, 0px));
                width: auto;
                max-width: none;
                max-height: calc(
                    100vh
                    - 16px
                    - env(safe-area-inset-top, 0px)
                    - env(safe-area-inset-bottom, 0px)
                );
                -webkit-transform: translateZ(0);
            }

            @supports (height: 100dvh) {
                #mc-namer-panel.mc-ios-safari {
                    max-height: calc(
                        100dvh
                        - 16px
                        - env(safe-area-inset-top, 0px)
                        - env(safe-area-inset-bottom, 0px)
                    );
                }
            }

            #mc-namer-panel.mc-ios-safari.mc-namer-collapsed {
                width: auto;
            }

            #mc-namer-panel.mc-ios-safari #mc-namer-header {
                cursor: grab;
                touch-action: none;
                -webkit-user-select: none;
            }

            #mc-namer-panel.mc-ios-safari #mc-namer-header:active {
                cursor: grabbing;
            }

            #mc-namer-panel.mc-ios-safari #mc-namer-body,
            #mc-namer-panel.mc-ios-safari #mc-namer-log,
            #mc-namer-panel.mc-ios-safari #mc-station-log,
            #mc-namer-panel.mc-ios-safari #mc-personnel-log,
            #mc-namer-panel.mc-ios-safari #mc-personnel-report,
            #mc-namer-panel.mc-ios-safari #mc-personnel-after-action {
                -webkit-overflow-scrolling: touch;
            }

            #mc-namer-panel.mc-ios-safari .mc-namer-tab {
                min-height: 42px;
                padding: 7px 4px;
                font-size: 11px;
                line-height: 1.2;
            }

            #mc-namer-panel.mc-ios-safari .mc-namer-buttons button,
            #mc-namer-panel.mc-ios-safari select,
            #mc-namer-panel.mc-ios-safari input {
                min-height: 36px;
                font-size: 16px;
            }
'''
replace_once(
    '            .mc-log-done { color: #22c55e; font-weight: bold; }\n        `;',
    '            .mc-log-done { color: #22c55e; font-weight: bold; }' + mobile_css + '\n        `;',
    'insert iOS Safari responsive CSS',
)

replace_once(
    "        makePanelDraggable(panel, document.querySelector('#mc-namer-header'));",
    "        makePanelDraggable(panel, document.querySelector('#mc-namer-header'));\n        installToolViewportGuard(panel);",
    'install viewport guard',
)

replace_function('makePanelDraggable', r'''    function makePanelDraggable(panel, handle) {
        let dragging = false;
        let activePointerId = null;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        const endDrag = event => {
            if (
                activePointerId != null
                && event?.pointerId != null
                && event.pointerId !== activePointerId
            ) {
                return;
            }

            dragging = false;
            if (
                activePointerId != null
                && handle.hasPointerCapture?.(activePointerId)
            ) {
                try {
                    handle.releasePointerCapture(activePointerId);
                } catch (_error) {}
            }
            activePointerId = null;
            clampToolPanelToViewport(panel);
        };

        const onPointerDown = event => {
            if (event.target.closest('#mc-namer-collapse')) return;
            if (event.button != null && event.button !== 0) return;

            const rect = panel.getBoundingClientRect();
            const bounds = getToolViewportBounds();
            dragging = true;
            activePointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            startLeft = rect.left;
            startTop = rect.top;

            panel.style.width = `${Math.min(rect.width, Math.max(260, bounds.width - 16))}px`;
            panel.style.left = `${startLeft}px`;
            panel.style.top = `${startTop}px`;
            panel.style.right = 'auto';

            try {
                handle.setPointerCapture?.(event.pointerId);
            } catch (_error) {}

            event.preventDefault();
        };

        const onPointerMove = event => {
            if (
                !dragging
                || (
                    activePointerId != null
                    && event.pointerId !== activePointerId
                )
            ) {
                return;
            }

            const bounds = getToolViewportBounds();
            const rect = panel.getBoundingClientRect();
            const maximumLeft = Math.max(
                bounds.left,
                bounds.right - rect.width
            );
            const maximumTop = Math.max(
                bounds.top,
                bounds.bottom - rect.height
            );
            const nextLeft = Math.min(
                maximumLeft,
                Math.max(
                    bounds.left,
                    startLeft + event.clientX - startX
                )
            );
            const nextTop = Math.min(
                maximumTop,
                Math.max(
                    bounds.top,
                    startTop + event.clientY - startY
                )
            );

            panel.style.left = `${nextLeft}px`;
            panel.style.top = `${nextTop}px`;
            event.preventDefault();
        };

        handle.addEventListener('pointerdown', onPointerDown);
        handle.addEventListener('pointermove', onPointerMove);
        handle.addEventListener('pointerup', endDrag);
        handle.addEventListener('pointercancel', endDrag);

        registerToolLifecycleCleanup(() => {
            dragging = false;
            activePointerId = null;
            handle.removeEventListener('pointerdown', onPointerDown);
            handle.removeEventListener('pointermove', onPointerMove);
            handle.removeEventListener('pointerup', endDrag);
            handle.removeEventListener('pointercancel', endDrag);
        });
    }''')

required_markers = [
    '// @version      1.0.15',
    "const UNIT_VERSION = '3.3.6';",
    "const STATION_VERSION = '1.3.2';",
    "const PERSONNEL_VERSION = '1.3.0';",
    'function isIosSafariWebsite()',
    'platform === \'MacIntel\'',
    'function installToolViewportGuard(panel)',
    "panel.classList.toggle('mc-ios-safari'",
    'env(safe-area-inset-top, 0px)',
    '100dvh',
    "handle.addEventListener('pointerdown'",
    "'a.lightbox-open[href*=\"/buildings/\"]'",
]
for marker in required_markers:
    if marker not in source:
        raise SystemExit(f'missing final source marker: {marker}')

SOURCE.write_text(source, encoding='utf-8', newline='\n')

readme = README.read_text(encoding='utf-8')
if readme.count('**Current version:** `1.0.14`') != 1:
    raise SystemExit('README current version anchor changed')
README.write_text(
    readme.replace('**Current version:** `1.0.14`', '**Current version:** `1.0.15`', 1),
    encoding='utf-8',
    newline='\n',
)

src_readme = SRC_README.read_text(encoding='utf-8')
if src_readme.count('| Command Nexus version | `1.0.14` |') != 1:
    raise SystemExit('Source README current version anchor changed')
SRC_README.write_text(
    src_readme.replace('| Command Nexus version | `1.0.14` |', '| Command Nexus version | `1.0.15` |', 1),
    encoding='utf-8',
    newline='\n',
)

changelog = CHANGELOG.read_text(encoding='utf-8')
anchor = '## [1.0.14] - 2026-07-21'
if changelog.count(anchor) != 1:
    raise SystemExit('CHANGELOG 1.0.14 anchor changed')
entry = '''## [1.0.15] - 2026-07-22

### Added

- Added Safari website support on iPhone and iPad for the shared Unit Naming, Station Naming and Personnel Assignment menu.
- Added iPad desktop-site detection through `MacIntel` plus touch capability while excluding Chrome, Firefox, Edge and native iOS webview wrappers.
- Added touch/pointer dragging and visual-viewport clamping for the shared tools panel.

### Fixed

- Fixed the shared tools menu not appearing when MissionChief uses the responsive iOS station-list markup.
- Fixed the 470px desktop panel width placing the menu partly or completely outside an iPhone viewport.
- Fixed panel positioning after Safari address-bar changes, bfcache restoration and device rotation.

### Changed

- Unit Naming increased from `3.3.5` to `3.3.6`.
- Station Naming increased from `1.3.1` to `1.3.2`.
- Personnel Assignment increased from `1.2.9` to `1.3.0`.

### Preserved

- Desktop layout, station and vehicle filtering, naming rules, personnel assignment rules, logs, reports, pause/stop controls and saved active-tab/collapse state remain unchanged.

'''
CHANGELOG.write_text(
    changelog.replace(anchor, entry + anchor, 1),
    encoding='utf-8',
    newline='\n',
)

print('Prepared v1.0.15 iOS Safari menu support release.')
