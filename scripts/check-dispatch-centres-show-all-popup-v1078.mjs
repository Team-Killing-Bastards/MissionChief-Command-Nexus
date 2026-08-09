#!/usr/bin/env node
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
  source.includes('// @version      1.0.91'),
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
  'mcnDispatchCentresPopupInstalled',
  "document.addEventListener(",
  "'auxclick'",
  'event.button !== 1',
  'target.closest(SHOW_ALL_SELECTOR)',
  'event.preventDefault()',
  'event.stopPropagation()',
  'stopImmediatePropagation',
  "anchor.getAttribute('href')",
  "'/leitstellenansicht'",
  'window.open(',
  'POPUP_NAME',
  "'popup=yes'",
  "'resizable=yes'",
  "'scrollbars=yes'",
  'popup?.focus()'
]) {
  expect(
    feature.includes(token),
    `Middle-click popup contract missing ${token}`
  );
}

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
  'Dispatch Centres Show all middle-click popup checks passed.'
);
