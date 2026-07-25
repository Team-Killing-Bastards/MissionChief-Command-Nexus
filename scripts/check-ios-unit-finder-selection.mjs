#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const SOURCE_PATH = 'src/missionchief-command-nexus.user.js';
const source = await readFile(SOURCE_PATH, 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(text, label) {
  if (!source.includes(text)) {
    fail(`Missing iOS Unit Finder contract: ${label}`);
  }
}

function requirePattern(pattern, label) {
  if (!pattern.test(source)) {
    fail(`Missing iOS Unit Finder contract: ${label}`);
  }
}

function extractFunction(name) {
  const startPattern = new RegExp(
    `(?:^|\\n)[ \\t]*(?:async[ \\t]+)?function[ \\t]+${name}[ \\t]*\\([^)]*\\)[ \\t]*\\{`,
    'm'
  );
  const match = startPattern.exec(source);
  if (!match) fail(`Unable to find function ${name}`);

  const start = match.index + (match[0].startsWith('\n') ? 1 : 0);
  const opening = source.indexOf('{', start);
  let depth = 0;
  let state = 'code';
  let quote = '';
  let escaped = false;

  for (let index = opening; index < source.length; index += 1) {
    const character = source[index];
    const following = source[index + 1] || '';

    if (state === 'line-comment') {
      if (character === '\n') state = 'code';
      continue;
    }
    if (state === 'block-comment') {
      if (character === '*' && following === '/') {
        state = 'code';
        index += 1;
      }
      continue;
    }
    if (state === 'string' || state === 'template') {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) {
        state = 'code';
        quote = '';
      }
      continue;
    }
    if (character === '/' && following === '/') {
      state = 'line-comment';
      index += 1;
      continue;
    }
    if (character === '/' && following === '*') {
      state = 'block-comment';
      index += 1;
      continue;
    }
    if (character === "'" || character === '"') {
      state = 'string';
      quote = character;
      continue;
    }
    if (character === '`') {
      state = 'template';
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  fail(`Unable to find end of function ${name}`);
}

requireText(
  'function getVehicleSelectionDocument(',
  'active mission vehicle document resolver'
);
requirePattern(
  /function getVehicleSelectionDocument\([\s\S]{0,5000}getPrimaryMissionRequirementDocument\(\)/,
  'vehicle document derives from current mission ownership'
);
requireText(
  'document: selectionDocument',
  'vehicle checkbox cache records its owning document'
);
requireText(
  "selectionDocument.querySelectorAll(\n                    'input.vehicle_checkbox'",
  'vehicle checkbox snapshot queries the active mission document'
);
requireText(
  "queryVehicleSelectionElements('a[search_attribute]')",
  'fallback buttons use the active mission document'
);
requireText(
  'const selectionDocument =\n                getVehicleSelectionDocument(\n                    true',
  'Unit Finder readiness gate resolves the active vehicle document'
);
requireText(
  "queryVehicleSelectionElements(\n            'a.btn-warning.missing_vehicles_load, a.missing_vehicles_load'",
  'complete-list loader uses the active mission document'
);
requireText(
  'function forceVehicleCheckboxSelection(',
  'Safari checked-property fallback'
);
requireText(
  "dispatchVehicleCheckboxStateEvent(\n            checkbox,\n            'input'",
  'Safari fallback dispatches input'
);
requireText(
  "dispatchVehicleCheckboxStateEvent(\n            checkbox,\n            'change'",
  'Safari fallback dispatches change'
);
requirePattern(
  /function clickVehicleElement\(element\)[\s\S]{0,6500}checkbox\.click\(\)[\s\S]{0,6500}getAssociatedVehicleCheckboxLabel\([\s\S]{0,6500}forceVehicleCheckboxSelection\(/,
  'native click, label and property/event fallbacks are ordered'
);
requirePattern(
  /function clickVehicleElement\(element\)[\s\S]{0,6500}return forced &&\s*checkbox\.checked === true/,
  'selection success requires confirmed checked state'
);

const snapshotFunction = extractFunction('getVehicleCheckboxSnapshot');
if (/\bdocument\.querySelectorAll\(/.test(snapshotFunction)) {
  fail('getVehicleCheckboxSnapshot must not use the global document');
}

const finderFunction = extractFunction('findUnitButton');
if (/\bdocument\.querySelectorAll\(/.test(finderFunction)) {
  fail('findUnitButton must not use global vehicle fallback selectors');
}

for (const name of [
  'getVehicleCheckboxListSignature',
  'getVisibleVehicleListLoadControl',
  'isVehicleListLoadingIndicatorVisible',
  'findLegacyVehicleRequirementList'
]) {
  const body = extractFunction(name);
  if (/\bdocument\.(?:querySelector|querySelectorAll)\(/.test(body)) {
    fail(`${name} must use the active vehicle selection document`);
  }
}

const helperNames = [
  'getVehicleCheckboxForElement',
  'getAssociatedVehicleCheckboxLabel',
  'dispatchVehicleCheckboxStateEvent',
  'forceVehicleCheckboxSelection',
  'isVehicleElementAlreadySelected',
  'clickVehicleElement'
];
const helperSource = helperNames.map(extractFunction).join('\n');

class MockEvent {
  constructor(type) {
    this.type = type;
  }
}

class MockInput {
  constructor({
    nativeWorks = false,
    labelWorks = false,
    setterWorks = true,
    checked = false,
    disabled = false
  } = {}) {
    this._checked = checked;
    this.nativeWorks = nativeWorks;
    this.setterWorks = setterWorks;
    this.disabled = disabled;
    this.isConnected = true;
    this.events = [];
    this.id = 'vehicle_1';
    this.labels = labelWorks
      ? [{ click: () => { this._checked = true; } }]
      : [];
    this.ownerDocument = {
      defaultView: {
        Event: MockEvent,
        HTMLInputElement: MockInput
      },
      querySelectorAll: () => []
    };
  }

  get checked() {
    return this._checked;
  }

  set checked(value) {
    if (this.setterWorks) this._checked = Boolean(value);
  }

  click() {
    if (this.nativeWorks) this._checked = true;
  }

  matches(selector) {
    return selector === 'input.vehicle_checkbox';
  }

  closest() {
    return null;
  }

  dispatchEvent(event) {
    this.events.push(event.type);
    return true;
  }
}

const runtime = Function(
  'window',
  'document',
  'Event',
  'realClickForQueueRestart',
  'mfVehicleCheckboxCache',
  `"use strict";\n${helperSource}\nreturn { clickVehicleElement };`
)(
  { Event: MockEvent, HTMLInputElement: MockInput },
  { querySelectorAll: () => [] },
  MockEvent,
  () => false,
  { expiresAt: 500 }
);

const nativeCheckbox = new MockInput({ nativeWorks: true });
if (!runtime.clickVehicleElement(nativeCheckbox) || !nativeCheckbox.checked) {
  fail('Native checkbox activation must be confirmed');
}

const labelCheckbox = new MockInput({ labelWorks: true });
if (!runtime.clickVehicleElement(labelCheckbox) || !labelCheckbox.checked) {
  fail('Associated label fallback must be confirmed');
}

const forcedCheckbox = new MockInput({ setterWorks: true });
if (!runtime.clickVehicleElement(forcedCheckbox) || !forcedCheckbox.checked) {
  fail('Checked-property fallback must be confirmed');
}
if (!forcedCheckbox.events.includes('input') || !forcedCheckbox.events.includes('change')) {
  fail('Checked-property fallback must dispatch input and change');
}

const failedCheckbox = new MockInput({ setterWorks: false });
if (runtime.clickVehicleElement(failedCheckbox) !== false) {
  fail('A checkbox that remains unchecked must report selection failure');
}

const disabledCheckbox = new MockInput({ nativeWorks: true, disabled: true });
if (runtime.clickVehicleElement(disabledCheckbox) !== false) {
  fail('Disabled vehicle checkbox must remain blocked');
}

const alreadyChecked = new MockInput({ checked: true });
if (runtime.clickVehicleElement(alreadyChecked) !== true) {
  fail('An already selected exact vehicle must be recognised');
}

console.log('iOS Safari Unit Finder selection checks passed.');
