#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function sliceBetween(startToken, endToken, label) {
  const start = source.indexOf(startToken);
  if (start < 0) fail(`Missing ${label} start`);
  const end = source.indexOf(endToken, start);
  if (end < 0) fail(`Missing ${label} end`);
  return source.slice(start, end);
}

expect(source.includes('// @version      1.0.110'), 'Expected Command Nexus 1.0.62');
expect(source.includes(' * MODULE 2: MISSION FINDER V10.6.153'), 'Expected Mission Finder V10.6.125');

for (const token of [
  'MF_TRAINED_PERSONNEL_COLLAPSED_KEY',
  "'mf_trained_personnel_collapsed_v2'",
  'let mfTrainedPersonnelCollapsed =',
  'savedTrainedPersonnelCollapsed == null\n            ? true',
  "trainedPanel.id = 'trained-personnel-box'",
  "id=\"mf-trained-title\"",
  "id=\"mf-trained-minimize\"",
  "id=\"trained-personnel-summary\"",
  "id=\"trained-personnel-content\"",
  "wrapper.appendChild(loadPanel);\n        wrapper.appendChild(trainedPanel);",
  'function syncTrainedPersonnelCollapseState()',
  'function toggleTrainedPersonnelCollapsed()',
  "'mf2026-trained-collapsed'",
]) {
  expect(source.includes(token), `Trained-personnel panel contract missing ${token}`);
}

const model = sliceBetween(
  '    function getSelectedTrainedPersonnelPanelModel() {',
  '\n\n    function renderSelectedTrainedPersonnelPanel() {',
  'selected trained-personnel model'
);
for (const token of [
  'readPersonnelTrainingRegistry()',
  'getVehicleCheckboxSnapshot(true)',
  '.filter(input => input?.checked)',
  'getRegistryEntryForMissionCheckbox(',
  'const entry = registryMatch?.entry || null',
  'entry.assignedTrainingProfiles',
  'entry.trainingCounts',
  'entry.trainingProfilesComplete === true',
  'getMissionVehicleId(input)',
  'getVehicleDebugName(input)',
]) {
  expect(model.includes(token), `Selected trained-personnel model missing ${token}`);
}
expect(!model.includes('querySelectorAll('), 'Panel model must reuse the bounded vehicle snapshot rather than add another DOM-wide scan');
expect(!model.includes('fetch('), 'Panel model must not add network requests');
expect(!model.includes('setInterval('), 'Panel model must not add a repeating timer');
expect(!model.includes('MutationObserver'), 'Panel model must not add another observer');

const renderer = sliceBetween(
  '    function renderSelectedTrainedPersonnelPanel() {',
  '\n\n    function renderVehicleLoadListNow() {',
  'trained-personnel renderer'
);
for (const token of [
  "document.getElementById('trained-personnel-summary')",
  "document.getElementById('trained-personnel-content')",
  'getSelectedTrainedPersonnelPanelModel()',
  'vehicle.profilesComplete',
  'Person ${index + 1}',
  'vehicle.trainingCounts.map',
  'escapeHtml(vehicleName)',
  'escapeHtml(item.label)',
]) {
  expect(renderer.includes(token), `Trained-personnel renderer missing ${token}`);
}
expect(!renderer.includes('personnelName'), 'Panel must not invent or expose unavailable personnel names');
expect(!renderer.includes('scheduleMissionRequiredPersonnelPreload('), 'Panel rendering must never schedule requirement preload work');
expect(renderer.includes('panel cache read failed'), 'Preload-cache failures must not suppress selected trained staff');

const loadRenderer = sliceBetween(
  '    function renderVehicleLoadListNow() {',
  '\n\n    function renderVehicleLoadList() {',
  'vehicle-load renderer'
);
expect(
  loadRenderer.includes('renderSelectedTrainedPersonnelPanel();'),
  'Vehicle Load rendering must refresh the selected trained-personnel panel'
);

const registryHandler = sliceBetween(
  '    function installPersonnelRegistryUpdateHandler() {',
  '\n\n    try {\n        installPersonnelRegistryUpdateHandler();',
  'Personnel Register update handler'
);
expect(
  registryHandler.includes('renderSelectedTrainedPersonnelPanel();'),
  'Personnel Register refresh must update the trained-personnel panel'
);

const styleBlock = sliceBetween(
  "        style.id = 'mission-finder-2026-styles';",
  '\n        document.head.appendChild(style);',
  'Mission Finder style block'
);
for (const token of [
  '#trained-personnel-box {',
  '#trained-personnel-content {',
  '#trained-personnel-box.mf2026-trained-collapsed {',
  '#trained-personnel-box.mf2026-trained-collapsed .mf-trained-body {',
  '#mission-finder-wrapper.mf2026-ios-safari #trained-personnel-box',
  '#mission-finder-wrapper.mf2026-iphone-safari\n            #trained-personnel-box',
  'display: none !important;',
]) {
  expect(styleBlock.includes(token), `Trained-personnel responsive styling missing ${token}`);
}

// The display feature must leave established trained-personnel selection intact.
for (const token of [
  'function selectVehiclesForTrainedPersonnelRequirements(',
  'function getRegistryEntryForMissionCheckbox(',
  "matchMode: 'exact-vehicle-id'",
  'function handleMissionUpdateUnits(showAlerts, suppliedRows = null, options = {})',
  'isTrainedPersonnelRequirement',
  'personnelTrainingRequirements',
  'function shouldRunPostSelectionMissionUpdate(selectionRunState)',
]) {
  expect(source.includes(token), `Existing trained-personnel/dispatch contract missing ${token}`);
}

console.log('Selected trained-personnel panel regression passed: exact selected-vehicle register evidence is displayed in a separate minimisable panel without changing dispatch or adding background work.');
