#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function extract(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

function assertInOrder(block, markers, label) {
  let cursor = -1;
  for (const marker of markers) {
    const next = block.indexOf(marker, cursor + 1);
    assert.notEqual(next, -1, `${label}: missing ${marker}`);
    assert.ok(next > cursor, `${label}: ${marker} is out of order`);
    cursor = next;
  }
}

assert.ok(source.includes('// @version      1.0.120'));
assert.ok(source.includes("const UNIT_VERSION = '3.3.26';"));
assert.ok(source.includes("const STATION_VERSION = '1.3.21';"));
assert.ok(source.includes("const PERSONNEL_VERSION = '1.3.10';"));

const nativeForm = extract(
  'function prepareBackgroundNativeForm(',
  'async function submitBackgroundNativeForm('
);
for (const contract of [
  "input.getAttribute('name')",
  "form.getAttribute('action')",
  'getSameOriginResourceUrl(',
  "method !== 'POST'",
  "form.querySelector('input[name=\"_method\"]')",
  'new FormData(form)',
  'body.set(inputName',
  "meta[name=\"csrf-token\"]"
]) {
  assert.ok(nativeForm.includes(contract), `Native form contract missing: ${contract}`);
}

const stationRename = extract(
  'async function processOneStationName(',
  'async function resolveStationAddress('
);
for (const contract of [
  'stationFetchDocument(station.href',
  'stationFetchDocument(editHref',
  'prepareBackgroundNativeForm(editPage.doc',
  'submitBackgroundNativeForm(',
  'verifyStationNameSaved(station.href, proposedName)'
]) {
  assert.ok(stationRename.includes(contract), `Station Naming background contract missing: ${contract}`);
}
assertInOrder(stationRename, [
  'submitBackgroundNativeForm(',
  'verifyStationNameSaved(station.href, proposedName)',
  "return 'renamed'"
], 'Station Naming verified save');

const unitRun = extract(
  'async function processStations(',
  'function getVehicleQueueFromTable('
);
assert.ok(unitRun.includes('unitFetchDocument(station.href'));
assert.ok(unitRun.includes('processStationVehicleQueue(stationPage.doc, station)'));

const unitRename = extract(
  'async function processStationVehicleQueue(',
  'async function waitIfPaused('
);
for (const contract of [
  'unitFetchDocument(item.editHref',
  'getVehicleIdFromHref(editPage.href)',
  'prepareBackgroundNativeForm(editPage.doc',
  "requiredMethodOverride: 'patch'",
  'submitBackgroundNativeForm(',
  'verifyUnitNameSaved(',
  'STATE.renamedCount++'
]) {
  assert.ok(unitRename.includes(contract), `Unit Naming background contract missing: ${contract}`);
}
assertInOrder(unitRename, [
  'submitBackgroundNativeForm(',
  'verifyUnitNameSaved(',
  'STATE.renamedCount++'
], 'Unit Naming verified save');

for (const block of [stationRename, unitRun, unitRename]) {
  for (const forbidden of [
    'openStationWorkflowIframe',
    'contentDocument',
    'navigateUnitIframe',
    '.click(',
    'window.open('
  ]) {
    assert.equal(
      block.includes(forbidden),
      false,
      `Resource Administration renamer must not open pages: ${forbidden}`
    );
  }
}

for (const removedPageDriver of [
  'function createManagedStationIframe(',
  'async function openStationWorkflowIframe(',
  'function navigateUnitIframe(',
  'async function closeStationNamingModal(',
  'async function closeStationModal('
]) {
  assert.equal(
    source.includes(removedPageDriver),
    false,
    `Obsolete page-driving helper remains: ${removedPageDriver}`
  );
}

const personnelBackground = extract(
  'async function processOnePoliceStation(',
  'function getPersonnelReportResult('
);
for (const contract of [
  'personnelFetchDocument(station.href',
  'submitPersonnelAssignment(candidate)',
  'const verificationPage = await personnelFetchDocument(',
  'Assigned and verified:'
]) {
  assert.ok(
    personnelBackground.includes(contract),
    `Personnel Assignment background contract missing: ${contract}`
  );
}
for (const forbidden of [
  'openStationWorkflowIframe',
  'contentDocument',
  '.click(',
  'window.open('
]) {
  assert.equal(
    personnelBackground.includes(forbidden),
    false,
    `Personnel Assignment must remain background-only: ${forbidden}`
  );
}

const unitStop = extract('function stopRun(', 'function toggleDebug(');
assert.ok(unitStop.includes('STATE.activeControllers'));
assert.ok(unitStop.includes('controller.abort()'));

const stationStop = extract(
  'function stopStationNamingRun(',
  'async function processStationNamingQueue('
);
assert.ok(stationStop.includes('STATION_STATE.activeControllers'));
assert.ok(stationStop.includes('controller.abort()'));

console.log(
  'Background Station Naming, Unit Naming and Personnel Assignment contracts passed.'
);
