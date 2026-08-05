#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SOURCE_PATH = 'src/missionchief-command-nexus.user.js';
const VALIDATE_WORKFLOW = '.github/workflows/validate-userscript.yml';

function fail(message) {
  throw new Error(message);
}

function countText(source, token) {
  return source.split(token).length - 1;
}

function replaceExact(source, oldText, newText, label, expected = 1) {
  const count = countText(source, oldText);
  if (count !== expected) {
    fail(`${label}: expected ${expected} occurrence(s), found ${count}`);
  }
  return source.split(oldText).join(newText);
}

function functionRange(source, name) {
  const pattern = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const match = pattern.exec(source);
  if (!match) fail(`Unable to locate function ${name}`);

  let index = source.indexOf('{', match.index);
  if (index < 0) fail(`Unable to locate body for ${name}`);

  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';

    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return { start: match.index, end: index + 1 };
    }
  }

  fail(`Unterminated function ${name}`);
}

function replaceFunction(source, name, replacement) {
  const range = functionRange(source, name);
  return source.slice(0, range.start) + replacement + source.slice(range.end);
}

const closeHelperAndResolver = String.raw`function getAutoPrisonerReleaseCloseControl(modal, visible) {
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
}`;

const visibleContexts = String.raw`function getVisibleAutoPrisonerReleaseDismissContexts(releaseContext = null) {
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
}`;

let source = await readFile(SOURCE_PATH, 'utf8');
if (source.includes('function getAutoPrisonerReleaseCloseControl(')) {
  fail('Prisoner SVG close helper already exists');
}
source = replaceExact(
  source,
  '// @version      1.0.83',
  '// @version      1.0.84',
  'userscript version'
);
source = replaceExact(
  source,
  ' * MODULE 2: MISSION FINDER V10.6.143',
  ' * MODULE 2: MISSION FINDER V10.6.144',
  'Mission Finder header'
);
source = replaceFunction(
  source,
  'resolveAutoPrisonerReleaseDismissContext',
  closeHelperAndResolver
);
source = replaceFunction(
  source,
  'getVisibleAutoPrisonerReleaseDismissContexts',
  visibleContexts
);
source = replaceExact(
  source,
  "        if (!current.closeButton) {\n            await wait(180);\n            continue;\n        }",
  "        if (\n            !current.closeButton ||\n            current.closeButton.isConnected === false\n        ) {\n            await wait(100);\n            continue;\n        }",
  'live close-control gate'
);
source = replaceExact(
  source,
  `        if (attempt === 2) {\n            const view = current.closeButton.ownerDocument?.defaultView || window;\n            for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {\n                try {\n                    const EventClass =\n                        type.startsWith('pointer') && typeof view.PointerEvent === 'function'\n                            ? view.PointerEvent\n                            : view.MouseEvent;\n                    current.closeButton.dispatchEvent(new EventClass(type, {\n                        bubbles: true,\n                        cancelable: true,\n                        composed: true,\n                        view\n                    }));\n                } catch (_error) {}\n            }\n        } else if (attempt === 3 && current.overlay) {\n            realClickForQueueRestart(current.overlay);\n        } else {\n            realClickForQueueRestart(current.closeButton);\n        }`,
  `        if (\n            attempt === 2 &&\n            current.closeMarker &&\n            current.closeMarker !== current.closeButton &&\n            current.closeMarker.isConnected !== false\n        ) {\n            realClickForQueueRestart(current.closeMarker);\n        } else if (attempt === 3) {\n            const view = current.closeButton.ownerDocument?.defaultView || window;\n            for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {\n                try {\n                    const EventClass =\n                        type.startsWith('pointer') && typeof view.PointerEvent === 'function'\n                            ? view.PointerEvent\n                            : view.MouseEvent;\n                    current.closeButton.dispatchEvent(new EventClass(type, {\n                        bubbles: true,\n                        cancelable: true,\n                        composed: true,\n                        view\n                    }));\n                } catch (_error) {}\n            }\n        } else if (attempt === 4 && current.overlay) {\n            realClickForQueueRestart(current.overlay);\n        } else {\n            realClickForQueueRestart(current.closeButton);\n        }`,
  'bounded close retry order'
);
await writeFile(SOURCE_PATH, source);

for (const file of readdirSync('scripts')) {
  if (!/^check-.*\.mjs$/.test(file)) continue;
  const filePath = path.join('scripts', file);
  let text = await readFile(filePath, 'utf8');
  text = text
    .split('// @version      1.0.83')
    .join('// @version      1.0.84')
    .split('MISSION FINDER V10.6.143')
    .join('MISSION FINDER V10.6.144');
  await writeFile(filePath, text);
}

for (const filePath of ['README.md', 'src/README.md']) {
  let text = await readFile(filePath, 'utf8');
  text = replaceExact(text, '1.0.83', '1.0.84', `${filePath} version`);
  text = replaceExact(
    text,
    'V10.6.143',
    'V10.6.144',
    `${filePath} Mission Finder version`
  );
  await writeFile(filePath, text);
}

let changelog = await readFile('CHANGELOG.md', 'utf8');
const changelogAnchor =
  'The project uses Semantic Versioning for the unified userscript release line.\n';
const changelogSection = `
## [1.0.84] - 2026-08-05

### Fixed

- Auto Mode now recognises the Vue/Font Awesome \`svg[data-icon="xmark"]\` prisoner-result close marker in addition to the established \`lightbox-close\` span.
- SVG markers are resolved to their live button, link or role-button wrapper before clicking, with an immediate-parent fallback bounded to the identified prisoner result modal.
- Vue-replaced close controls are reacquired before every retry; the exact marker is tried before the existing synthetic-event and overlay fallbacks.

### Safety

- Close discovery remains scoped to the identified topmost prisoner-release modal and current-mission pending state; unrelated page-wide xmark icons are not eligible.
- Exact result ownership, Unit Finder blocking, duplicate-click protection, maximum result/dismiss waits and fail-closed stopping remain unchanged.

### Changed engine baseline

- Mission Finder increased from \`V10.6.143\` to \`V10.6.144\`.
`;
if (!changelog.includes(changelogAnchor)) fail('Missing changelog anchor');
if (changelog.includes('## [1.0.84]')) fail('Changelog 1.0.84 already exists');
changelog = changelog.replace(
  changelogAnchor,
  changelogAnchor + changelogSection
);
await writeFile('CHANGELOG.md', changelog);

const regression = String.raw`#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };

function requireText(token, label) {
  if (!source.includes(token)) fail(`Missing prisoner SVG close contract: ${label}`);
}

function extractFunction(name) {
  const pattern = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const match = pattern.exec(source);
  if (!match) fail(`Unable to locate function ${name}`);
  const start = match.index;
  const rest = source.slice(start + match[0].length);
  const next = /^\\s*(?:async\\s+)?function\\s+[A-Za-z0-9_$]+\\s*\\(/m.exec(rest);
  if (!next) return source.slice(start);
  return source.slice(start, start + match[0].length + next.index);
}

for (const [token, label] of [
  ['// @version      1.0.84', 'v1.0.84 metadata'],
  ['MISSION FINDER V10.6.144', 'Mission Finder V10.6.144'],
  ['function getAutoPrisonerReleaseCloseControl(', 'bounded close-control resolver'],
  ['svg[data-icon="xmark"]', 'Font Awesome data-icon marker'],
  ['svg.svg-inline--fa.fa-xmark', 'Font Awesome class marker'],
  ['button, a[href], [role="button"]', 'interactive parent resolution'],
  ['marker.parentElement || marker', 'bounded immediate-parent fallback'],
  ['modal.contains(control)', 'modal ownership boundary'],
  ['closeMarker,', 'live marker retained for fallback click'],
  ['current.closeButton.isConnected === false', 'stale Vue control rejection'],
  ['current.closeMarker !== current.closeButton', 'separate marker fallback'],
  ['current.closeMarker.isConnected !== false', 'live marker verification'],
  ['const MF_AUTO_PRISONER_RELEASE_RESULT_WAIT_MS = 10000;', 'result maximum wait retained'],
  ['const MF_AUTO_PRISONER_RELEASE_DISMISS_WAIT_MS = 8000;', 'dismiss maximum wait retained'],
  ['const MF_AUTO_PRISONER_RELEASE_DISMISS_CLOSE_WAIT_MS = 8000;', 'close maximum wait retained'],
]) requireText(token, label);

const resolver = extractFunction('getAutoPrisonerReleaseCloseControl');
for (const token of [
  'span.lightbox-close[title="Close"]',
  'svg[data-icon="xmark"]',
  'marker.closest?.(',
  'modal.contains(control)',
  'visible(control)',
]) {
  if (!resolver.includes(token)) fail(`Close resolver missing ${token}`);
}

const discovery = extractFunction('getVisibleAutoPrisonerReleaseDismissContexts');
for (const token of [
  '.vm--container .vm--modal svg[data-icon="xmark"]',
  '.vm--container .vm--modal svg.svg-inline--fa.fa-xmark',
  'marker.closest(',
  'resolveAutoPrisonerReleaseDismissContext({',
]) {
  if (!discovery.includes(token)) fail(`Scoped modal discovery missing ${token}`);
}
if (/candidateDocument\.querySelectorAll\(\s*['"]svg\[data-icon/.test(discovery)) {
  fail('Page-wide unscoped xmark discovery is forbidden');
}

const close = extractFunction('closeAutoPrisonerReleaseDismissAfterClick');
const markerClick = close.indexOf('realClickForQueueRestart(current.closeMarker);');
const syntheticClick = close.indexOf("for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'])");
const overlayClick = close.indexOf('realClickForQueueRestart(current.overlay);');
if (!(markerClick >= 0 && syntheticClick > markerClick && overlayClick > syntheticClick)) {
  fail('Close retries must use live marker, synthetic control events, then overlay fallback');
}
if (!close.includes("return 'stuck';")) fail('Fail-closed prisoner result stop is missing');

console.log('Prisoner Vue/Font Awesome SVG close ownership and retry contracts passed.');
`;
await writeFile('scripts/check-prisoner-svg-close-v1084.mjs', regression);

let workflow = await readFile(VALIDATE_WORKFLOW, 'utf8');
const pathLine = "      - 'scripts/check-auto-transport-response-v1083.mjs'\n";
if (countText(workflow, pathLine) !== 2) {
  fail('Expected two v1.0.83 transport regression path registrations');
}
workflow = workflow.split(pathLine).join(
  pathLine + "      - 'scripts/check-prisoner-svg-close-v1084.mjs'\n"
);
const step =
  '      - name: Validate faster patient and prisoner transport response\n' +
  '        run: node scripts/check-auto-transport-response-v1083.mjs\n';
workflow = replaceExact(
  workflow,
  step,
  step +
    '\n      - name: Validate prisoner Vue SVG close control\n' +
    '        run: node scripts/check-prisoner-svg-close-v1084.mjs\n',
  'validation workflow step'
);
workflow = workflow.replace(
  'faster patient/prisoner transport response, Missing-on-mission authority',
  'faster patient/prisoner transport response, prisoner Vue SVG close ownership, Missing-on-mission authority'
);
await writeFile(VALIDATE_WORKFLOW, workflow);

console.log('Built Command Nexus 1.0.84 prisoner SVG close candidate.');
