#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "src" / "missionchief-command-nexus.user.js"
OLD_VERSION = "1.0.78"
NEW_VERSION = "1.0.79"
OLD_MARKER = "/* Dispatch Centres Show all middle-click popup V1.0.78. */"

NEW_FEATURE = r'''/* Dispatch Centres Show all popup-window enforcement V1.0.79. */
(function() {
    'use strict';

    const SHOW_ALL_SELECTOR =
        'a.lightbox-open[href="/leitstellenansicht"]';
    const POPUP_NAME =
        'missionchief-dispatch-centres-popup-v1079';
    const POPUP_WIDTH = 1280;
    const POPUP_HEIGHT = 900;

    function installDispatchCentresShowAllMiddleClick() {
        const root = document.documentElement;
        if (
            !root ||
            root.dataset.mcnDispatchCentresPopupInstalled === 'true'
        ) {
            return;
        }

        root.dataset.mcnDispatchCentresPopupInstalled = 'true';
        let openedFromMouseDownAt = 0;

        function findShowAllAnchor(event) {
            const target =
                event.target &&
                typeof event.target.closest === 'function'
                    ? event.target
                    : event.target?.parentElement;

            return target &&
                typeof target.closest === 'function'
                ? target.closest(SHOW_ALL_SELECTOR)
                : null;
        }

        function stopNativeMiddleClick(event) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
        }

        function getPopupGeometry() {
            const availableWidth = Number(
                window.screen?.availWidth || POPUP_WIDTH
            );
            const availableHeight = Number(
                window.screen?.availHeight || POPUP_HEIGHT
            );
            const width = Math.min(POPUP_WIDTH, availableWidth);
            const height = Math.min(POPUP_HEIGHT, availableHeight);
            const left = Math.max(
                0,
                Math.round(
                    Number(window.screenX || 0) +
                        (Number(window.outerWidth || width) - width) / 2
                )
            );
            const top = Math.max(
                0,
                Math.round(
                    Number(window.screenY || 0) +
                        (Number(window.outerHeight || height) - height) / 2
                )
            );

            return { width, height, left, top };
        }

        function openDispatchCentresPopup(anchor) {
            const url = new URL(
                anchor.getAttribute('href') ||
                    '/leitstellenansicht',
                window.location.origin
            ).href;
            const { width, height, left, top } =
                getPopupGeometry();
            const popup = window.open(
                'about:blank',
                POPUP_NAME,
                [
                    'popup=yes',
                    `width=${width}`,
                    `height=${height}`,
                    `left=${left}`,
                    `top=${top}`,
                    'resizable=yes',
                    'scrollbars=yes',
                    'toolbar=no',
                    'location=no',
                    'menubar=no',
                    'status=no'
                ].join(',')
            );

            if (!popup) {
                return;
            }

            try {
                popup.resizeTo(width, height);
                popup.moveTo(left, top);
            } catch (_error) {
                // Browser window-management policy may ignore sizing.
            }

            try {
                popup.location.replace(url);
            } catch (_error) {
                popup.location.href = url;
            }

            popup?.focus();
        }

        function handleMiddleMouseDown(event) {
            if (event.button !== 1) {
                return;
            }

            const anchor = findShowAllAnchor(event);
            if (!anchor) {
                return;
            }

            stopNativeMiddleClick(event);
            openedFromMouseDownAt = Date.now();
            openDispatchCentresPopup(anchor);
        }

        function handleMiddleMouseRelease(event) {
            if (event.button !== 1) {
                return;
            }

            const anchor = findShowAllAnchor(event);
            if (!anchor) {
                return;
            }

            stopNativeMiddleClick(event);

            if (
                event.type === 'auxclick' &&
                Date.now() - openedFromMouseDownAt > 1000
            ) {
                openDispatchCentresPopup(anchor);
            }
        }

        document.addEventListener(
            'mousedown',
            handleMiddleMouseDown,
            true
        );
        document.addEventListener(
            'mouseup',
            handleMiddleMouseRelease,
            true
        );
        document.addEventListener(
            'auxclick',
            handleMiddleMouseRelease,
            true
        );
    }

    installDispatchCentresShowAllMiddleClick();
})();'''

source = SOURCE.read_text(encoding="utf-8")
marker_index = source.find(OLD_MARKER)
if marker_index < 0:
    raise SystemExit(f"Missing expected feature marker: {OLD_MARKER}")

prefix = source[:marker_index].rstrip()
if prefix.count(OLD_VERSION) < 3:
    raise SystemExit("Unexpected current-version token count in userscript prefix")
prefix = prefix.replace(OLD_VERSION, NEW_VERSION)
SOURCE.write_text(
    prefix + "\n\n" + NEW_FEATURE + "\n",
    encoding="utf-8",
)

for path in sorted((ROOT / "scripts").glob("check-*.mjs")):
    text = path.read_text(encoding="utf-8")
    if OLD_VERSION in text:
        path.write_text(
            text.replace(OLD_VERSION, NEW_VERSION),
            encoding="utf-8",
        )

regression = ROOT / "scripts" / "check-dispatch-centres-popup-window-v1079.mjs"
regression.write_text(
    r'''#!/usr/bin/env node
import fs from 'node:fs';

const source = fs.readFileSync(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

expect(
  source.includes('// @version      1.0.79'),
  'Expected Command Nexus 1.0.79'
);
expect(
  source.includes(
    `'a.lightbox-open[href="/leitstellenansicht"]'`
  ),
  'Exact Dispatch Centres Show all selector is missing'
);

const start = source.indexOf(
  'function installDispatchCentresShowAllMiddleClick('
);
const end = source.indexOf(
  'installDispatchCentresShowAllMiddleClick();',
  start
);
expect(start >= 0 && end > start, 'Popup installer is missing');

const feature = source.slice(start, end);
for (const token of [
  "'missionchief-dispatch-centres-popup-v1079'",
  "'mousedown'",
  "'mouseup'",
  "'auxclick'",
  'handleMiddleMouseDown',
  'handleMiddleMouseRelease',
  'event.button !== 1',
  'stopNativeMiddleClick(event)',
  'window.open(',
  "'about:blank'",
  'POPUP_NAME',
  "'popup=yes'",
  "'toolbar=no'",
  "'location=no'",
  'popup.resizeTo(width, height)',
  'popup.moveTo(left, top)',
  'popup.location.replace(url)',
  'popup?.focus()',
  'Date.now() - openedFromMouseDownAt > 1000'
]) {
  expect(
    feature.includes(token),
    `Popup-window enforcement contract missing ${token}`
  );
}

const downHandler = feature.indexOf(
  'function handleMiddleMouseDown('
);
const downOpen = feature.indexOf(
  'openDispatchCentresPopup(anchor);',
  downHandler
);
const auxListener = feature.indexOf("'auxclick'");
expect(
  downHandler >= 0 &&
    downOpen > downHandler &&
    auxListener > downOpen,
  'Popup must open during mousedown before auxclick suppression'
);
expect(
  !feature.includes("'_blank'"),
  'The feature must use its dedicated named popup'
);
expect(
  !feature.includes("addEventListener('click'"),
  'Normal left-click lightbox behaviour must remain untouched'
);
expect(
  (source.match(
    /installDispatchCentresShowAllMiddleClick\(\);/g
  ) || []).length === 1,
  'Popup installer must run exactly once'
);

console.log(
  'Dispatch Centres popup-window enforcement checks passed.'
);
''',
    encoding="utf-8",
)

readme = ROOT / "README.md"
text = readme.read_text(encoding="utf-8")
current = "**Current version:** `1.0.78`"
if text.count(current) != 1:
    raise SystemExit("README current-version line was not unique")
readme.write_text(
    text.replace(current, "**Current version:** `1.0.79`"),
    encoding="utf-8",
)

source_readme = ROOT / "src" / "README.md"
text = source_readme.read_text(encoding="utf-8")
current = "| Command Nexus version | `1.0.78` |"
if text.count(current) != 1:
    raise SystemExit("src/README current-version row was not unique")
source_readme.write_text(
    text.replace(
        current,
        "| Command Nexus version | `1.0.79` |",
    ),
    encoding="utf-8",
)

changelog = ROOT / "CHANGELOG.md"
text = changelog.read_text(encoding="utf-8")
anchor = (
    "The project uses Semantic Versioning for the unified "
    "userscript release line.\n"
)
if text.count(anchor) != 1:
    raise SystemExit("CHANGELOG insertion anchor was not unique")
entry = r'''
## [1.0.79] - 2026-08-01

### Fixed

- The Dispatch Centres **Show all** middle-click now creates the dedicated popup window during the captured middle-button `mousedown` user gesture instead of waiting until `auxclick`.
- The popup opens as a named blank window with explicit dimensions and browser-chrome hints, is moved and resized when browser policy permits, and then navigates to `/leitstellenansicht`.
- A new popup name prevents a previously opened 1.0.78 browser tab from being reused.

### Safety and compatibility

- Captured `mouseup` and `auxclick` handlers suppress the browser's native middle-click new-tab action without opening a second window.
- `auxclick` retains a guarded fallback for browsers that do not deliver the expected `mousedown`.
- Normal left-click remains MissionChief's existing lightbox behaviour.
- Browser popup-blocking and window-management policies remain authoritative.
- The 1.0.77 Stations ownership correction, Mission Finder V10.6.139, Unit Finder, Vehicle Load, Auto Mode and iOS/iPadOS paths remain unchanged.
'''
changelog.write_text(
    text.replace(anchor, anchor + entry + "\n", 1),
    encoding="utf-8",
)

workflow = ROOT / ".github" / "workflows" / "validate-userscript.yml"
text = workflow.read_text(encoding="utf-8")
text = text.replace(
    "Dispatch Centres Show all middle-click popup,",
    "Dispatch Centres Show all enforced popup window,",
    1,
)
old_path = (
    "      - 'scripts/check-dispatch-centres-show-all-popup-v1078.mjs'\n"
)
new_path = old_path + (
    "      - 'scripts/check-dispatch-centres-popup-window-v1079.mjs'\n"
)
if text.count(old_path) != 2:
    raise SystemExit("Expected two workflow path anchors")
text = text.replace(old_path, new_path)
old_step = (
    "      - name: Validate Dispatch Centres Show all middle-click popup\n"
    "        run: node scripts/check-dispatch-centres-show-all-popup-v1078.mjs\n"
)
new_step = old_step + (
    "\n"
    "      - name: Validate Dispatch Centres popup-window enforcement\n"
    "        run: node scripts/check-dispatch-centres-popup-window-v1079.mjs\n"
)
if text.count(old_step) != 1:
    raise SystemExit("Workflow validation-step anchor was not unique")
workflow.write_text(
    text.replace(old_step, new_step),
    encoding="utf-8",
)

print("Applied Command Nexus 1.0.79 popup-window correction.")
