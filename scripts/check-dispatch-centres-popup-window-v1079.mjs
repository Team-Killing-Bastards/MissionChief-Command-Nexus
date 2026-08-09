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
  source.includes('// @version      1.0.95'),
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
    (token === "'missionchief-dispatch-centres-popup-v1079'" ? source : feature).includes(token),
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
